/* js/auth.js
   Alur masuk: login dan daftar memakai Google Sheet lewat Google Apps Script (lihat apps-script/Code.gs). */

/* ---- ALUR UTAMA ---- */
function route(){
  if(!session){ show("vLogin"); return }
  const p = profiles[session.sub];
  if(!p || !p.fullName){ // login pertama kali: wajib isi nama lengkap
    openNameModal(false); show("vHome","vName"); renderHome(); return;
  }
  renderHome(); show("vHome");
}

function onLogin(user){
  session = user; store.set("kelas_session", session);
  route();
  if(typeof segarkanTeman === "function") segarkanTeman();   // periksa teman dan pesan baru
}

/* ---- LOGIN DAN DAFTAR ---- */
// Akun disimpan di Google Sheet (kolom: Nama, Email, PasswordHash, WaktuDaftar) lewat Google Apps Script.
// Kata sandi tidak pernah dikirim: peramban mengubahnya jadi hash PBKDF2 (garam diturunkan dari email),
// lalu hash itu yang dikirim ke SCRIPT_URL dan dicocokkan di server. Nama lengkap diambil dari Sheet saat login.
const SCRIPT_AKTIF = typeof SCRIPT_URL === "string" && /^https:\/\/script\.google\.com\//.test(SCRIPT_URL);
const reEmail = /^[a-z0-9][^\s@]*@[^\s@]+\.[^\s@]{2,}$/;
const gagalMasuk = {};                     // penghitung percobaan salah per email (tambahan di peramban)
const normEmail = s => s.trim().toLowerCase();
class GalatJaringan extends Error {}

const toHex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");

// Hash PBKDF2-SHA256 (150.000 putaran). Garamnya diturunkan dari email sehingga tiap akun berbeda.
async function hashSandi(sandi, email){
  const enc = new TextEncoder();
  const salt = (await crypto.subtle.digest("SHA-256", enc.encode("kelas-ceria:" + email))).slice(0, 16);
  const kunci = await crypto.subtle.importKey("raw", enc.encode(sandi), "PBKDF2", false, ["deriveBits"]);
  return toHex(await crypto.subtle.deriveBits({ name:"PBKDF2", salt, iterations: 150000, hash:"SHA-256" }, kunci, 256));
}

// Mengirim permintaan ke Apps Script. Tipe text/plain dipakai agar peramban tidak perlu "preflight" CORS.
// Kalau POST gagal (sebagian peramban HP memblokirnya), dicoba lagi lewat GET (?d=...).
async function panggil(isi){
  const badan = JSON.stringify(isi);
  let r;
  try{ r = await fetch(SCRIPT_URL, { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: badan }) }
  catch(err){
    try{ r = await fetch(SCRIPT_URL + "?d=" + encodeURIComponent(badan), { cache:"no-store" }) }
    catch(err2){ throw new GalatJaringan() }
  }
  try{ return await r.json() }catch(err){ throw new GalatJaringan() }
}

function pesan(id, teks){ const e = $(id); e.textContent = teks || ""; e.classList.toggle("show", !!teks) }
function tandai(id, buruk){
  const w = $(id).closest(".inp"); w.classList.remove("bad");
  if(buruk){ void w.offsetWidth; w.classList.add("bad") }
}
function sibuk(btn, on){ btn.classList.toggle("busy", on); btn.disabled = on }
const tunggu = ms => new Promise(r => setTimeout(r, ms));

function setTab(t){
  const masuk = t === "masuk";
  $("authBox").dataset.tab = t;
  $("tabMasuk").setAttribute("aria-selected", String(masuk));
  $("tabDaftar").setAttribute("aria-selected", String(!masuk));
  $("formMasuk").classList.toggle("hidden", !masuk);
  $("formDaftar").classList.toggle("hidden", masuk);
  $("authTitle").textContent = masuk ? "Selamat Datang" : "Buat Akun Baru";
  $("authSub").textContent = masuk ? "Masuk dengan akun kelasmu untuk melanjutkan." : "Isi data berikut, akunmu langsung aktif.";
  pesan("msgMasuk"); pesan("msgDaftar");
  if(matchMedia("(hover:hover)").matches) setTimeout(() => $(masuk ? "lEmail" : "dNama").focus(), 60);
}
$("tabMasuk").onclick = () => setTab("masuk");
$("tabDaftar").onclick = () => setTab("daftar");

// Tombol mata: tampilkan atau sembunyikan kata sandi
document.querySelectorAll(".eye").forEach(b => b.onclick = () => {
  const i = $(b.dataset.for), tampil = i.type === "password";
  i.type = tampil ? "text" : "password";
  b.classList.toggle("on", tampil);
  b.setAttribute("aria-label", tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
});

// Indikator kekuatan kata sandi
function kekuatan(p){
  if(!p) return 0;
  if(p.length < 6) return 1;
  let s = 1 + (p.length >= 10) + (/[a-z]/.test(p) && /[A-Z]/.test(p)) + /\d/.test(p) + /[^A-Za-z0-9]/.test(p);
  return Math.min(4, Math.max(1, s - 1));
}
$("dPass").addEventListener("input", () => {
  const s = kekuatan($("dPass").value);
  $("meter").dataset.s = s;
  $("meterTxt").textContent = s ? "Kekuatan: " + ["", "Lemah", "Cukup", "Kuat", "Sangat kuat"][s] : "Minimal 6 karakter.";
});
["lEmail","lPass","dNama","dEmail","dPass","dPass2","dKode"].forEach(id => $(id).addEventListener("input", () => tandai(id, false)));

// Pembatasan percobaan di peramban: 5 kali salah, kunci 30 detik (server juga membatasi)
const sisaKunci = u => { const g = gagalMasuk[u]; return g && g.sampai > Date.now() ? Math.ceil((g.sampai - Date.now()) / 1000) : 0 };
function catatGagal(u){
  const g = gagalMasuk[u] || (gagalMasuk[u] = { n:0, sampai:0 });
  if(++g.n >= 5){ g.n = 0; g.sampai = Date.now() + 30000 }
}

// Animasi berhasil lalu masuk ke beranda. Nama lengkap berasal dari Sheet.
async function berhasil(email, nama, token, btn){
  btn.classList.remove("busy"); btn.classList.add("done");
  await tunggu(750);
  $("authShell").classList.add("out");
  await tunggu(450);
  profiles[email] = { fullName: nama };
  store.set("kelas_profiles", profiles);
  onLogin({ sub: email, email, picture: "", gname: nama, token });
  // kembalikan formulir ke keadaan awal untuk login berikutnya
  $("authShell").classList.remove("out"); btn.classList.remove("done"); btn.disabled = false;
  ["lEmail","lPass","dNama","dEmail","dPass","dPass2","dKode"].forEach(id => $(id).value = "");
  $("dPass").dispatchEvent(new Event("input"));
  setTab("masuk");
}
const gagalFitur = "Peramban ini tidak mendukung fitur keamanan yang dibutuhkan. Buka lewat alamat https dengan Chrome atau Firefox terbaru.";
const gagalMuat = "Server akun belum bisa dihubungi. Periksa koneksi internetmu lalu coba lagi.";
const gagalServer = "Terjadi kesalahan di server akun. Coba lagi sebentar lagi.";
const belumDiatur = "Server akun belum diatur. Hubungi admin kelas.";

$("formMasuk").addEventListener("submit", async e => {
  e.preventDefault();
  const email = normEmail($("lEmail").value), p = $("lPass").value, btn = $("btnMasuk");
  pesan("msgMasuk");
  if(!SCRIPT_AKTIF) return pesan("msgMasuk", belumDiatur);
  if(!email || !p){ tandai(email ? "lPass" : "lEmail", true); return pesan("msgMasuk", "Isi email dan kata sandi terlebih dahulu.") }
  if(!reEmail.test(email)){ tandai("lEmail", true); return pesan("msgMasuk", "Format email belum benar.") }
  const sisa = sisaKunci(email);
  if(sisa) return pesan("msgMasuk", `Terlalu banyak percobaan. Coba lagi dalam ${sisa} detik.`);
  sibuk(btn, true);
  try{
    const r = await panggil({ aksi:"masuk", email, hash: await hashSandi(p, email) });
    if(r.ok){ delete gagalMasuk[email]; return await berhasil(email, r.nama, r.token, btn) }
    if(r.galat === "terkunci"){ pesan("msgMasuk", "Terlalu banyak percobaan. Coba lagi beberapa menit lagi."); sibuk(btn, false); return }
    if(r.galat === "salah"){
      catatGagal(email); tandai("lEmail", true); tandai("lPass", true);
      pesan("msgMasuk", "Email atau kata sandi salah."); sibuk(btn, false); return;
    }
    pesan("msgMasuk", gagalServer); sibuk(btn, false);
  }catch(err){ pesan("msgMasuk", err instanceof GalatJaringan ? gagalMuat : gagalFitur); sibuk(btn, false) }
});

$("formDaftar").addEventListener("submit", async e => {
  e.preventDefault();
  const nama = cleanName($("dNama").value), email = normEmail($("dEmail").value);
  const p = $("dPass").value, p2 = $("dPass2").value, kode = $("dKode").value.trim(), btn = $("btnDaftar");
  pesan("msgDaftar");
  const salah = (id, teks) => { tandai(id, true); pesan("msgDaftar", teks); $(id).focus() };
  if(!SCRIPT_AKTIF) return pesan("msgDaftar", belumDiatur);
  const en = validName(nama);
  if(en) return salah("dNama", en);
  if(!reEmail.test(email) || email.length > 80) return salah("dEmail", "Format email belum benar.");
  if(p.length < 6) return salah("dPass", "Kata sandi minimal 6 karakter.");
  if(p !== p2) return salah("dPass2", "Kata sandi dan pengulangannya belum sama.");
  sibuk(btn, true);
  try{
    const r = await panggil({ aksi:"daftar", nama, email, hash: await hashSandi(p, email), kode });
    if(r.ok){ toast("Akun berhasil dibuat"); return await berhasil(email, r.nama || nama, r.token, btn) }
    sibuk(btn, false);
    if(r.galat === "perlu_kode"){ $("fldKode").classList.remove("hidden"); return salah("dKode", "Masukkan kode pendaftaran dari admin kelas.") }
    if(r.galat === "kode_salah") return salah("dKode", "Kode pendaftaran salah.");
    if(r.galat === "email_dipakai") return salah("dEmail", "Email ini sudah terdaftar. Coba masuk, atau pakai email lain.");
    if(r.galat === "data_salah") return pesan("msgDaftar", "Data belum valid. Periksa nama dan email, lalu coba lagi.");
    pesan("msgDaftar", gagalServer);
  }catch(err){ pesan("msgDaftar", err instanceof GalatJaringan ? gagalMuat : gagalFitur); sibuk(btn, false) }
});

/* ---- NAMA LENGKAP ---- */
function openNameModal(isEdit){
  editing = isEdit;
  $("nameTitle").textContent = isEdit ? "Ubah Nama" : "Lengkapi Data Diri";
  $("nameDesc").textContent = isEdit ? "Perbarui nama lengkapmu di bawah ini." : "Sebelum masuk kelas, isi nama lengkapmu terlebih dahulu. Nama ini akan tampil di akunmu.";
  $("cancelName").classList.toggle("hidden", !isEdit);
  $("fullName").value = isEdit ? (profiles[session.sub]?.fullName || "") : "";
  $("nameErr").textContent = "";
  $("vName").classList.remove("hidden");
  setTimeout(() => $("fullName").focus(), 50);
}
function cleanName(s){ return s.trim().replace(/\s+/g, " ") }
function validName(s){
  if(s.length < 3) return "Nama minimal 3 huruf.";
  if(!/^[\p{L}][\p{L}\s.'’-]*$/u.test(s)) return "Gunakan huruf saja, tanpa angka atau simbol.";
  return "";
}
function saveName(){
  const v = cleanName($("fullName").value), e = validName(v);
  if(e){ $("nameErr").textContent = e; return }
  profiles[session.sub] = { fullName: v };
  store.set("kelas_profiles", profiles);
  $("vName").classList.add("hidden");
  renderHome(); show("vHome");
  toast(editing ? "Nama diperbarui" : "Selamat datang, " + v.split(" ")[0] + "!");
}
$("saveName").onclick = saveName;
$("fullName").addEventListener("keydown", e => { if(e.key === "Enter") saveName() });
$("cancelName").onclick = () => $("vName").classList.add("hidden");
$("editName").onclick = () => openNameModal(true);
$("logout").onclick = () => {
  if(typeof resetTeman === "function") resetTeman();
  session = null; store.set("kelas_session", null); route();
};
