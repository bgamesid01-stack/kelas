/* js/auth.js
   Alur masuk: login dari daftar akun (data/daftar-akun.txt), pembuatan kode akun, dan nama lengkap. */

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
}

/* ---- LOGIN DAN DAFTAR ---- */
// Daftar akun dibaca dari file data/daftar-akun.txt di repo, jadi akun yang sama bisa dipakai dari perangkat mana pun.
// Isi file hanya username + garam + hash (PBKDF2), bukan kata sandi dan bukan nama lengkap.
// Siswa membuat "kode akun" di tab Daftar, mengirimnya ke admin, lalu admin menempelkannya ke file itu.
const FILE_AKUN = "data/daftar-akun.txt";
const reUser = /^[a-z0-9][a-z0-9._]{2,19}$/;
const reBaris = /^([a-z0-9][a-z0-9._]{2,19}):([0-9a-f]{32}):([0-9a-f]{64})$/;
let akunDaftar = null, akunWaktu = 0;
const gagalMasuk = {};                     // penghitung percobaan salah per username
const punya = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const normUser = s => s.trim().toLowerCase();

const toHex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const fromHex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const acakHex = n => toHex(crypto.getRandomValues(new Uint8Array(n)));

// Kata sandi tidak pernah disimpan apa adanya: hanya hasil PBKDF2 (150.000 putaran) + garam acak.
async function hashSandi(sandi, saltHex){
  const kunci = await crypto.subtle.importKey("raw", new TextEncoder().encode(sandi), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", salt: fromHex(saltHex), iterations: 150000, hash:"SHA-256" }, kunci, 256);
  return toHex(bits);
}

// Membaca daftar akun. Parameter ?t= memaksa peramban mengambil versi terbaru dari server.
async function muatAkun(paksa){
  if(!paksa && akunDaftar && Date.now() - akunWaktu < 20000) return akunDaftar;
  const r = await fetch(FILE_AKUN + "?t=" + Date.now(), { cache: "no-store" });
  if(!r.ok) throw new Error("HTTP " + r.status);
  const peta = {};
  (await r.text()).split(/\r?\n/).forEach(baris => {
    const m = reBaris.exec(baris.trim());
    if(m) peta[m[1]] = { salt: m[2], hash: m[3] };
  });
  akunDaftar = peta; akunWaktu = Date.now();
  return peta;
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
  $("hasilDaftar").classList.add("hidden");
  $("authTitle").textContent = masuk ? "Selamat Datang" : "Buat Kode Akun";
  $("authSub").textContent = masuk ? "Masuk dengan akun kelasmu untuk melanjutkan." : "Pilih username dan kata sandi. Kodenya dikirim ke admin kelas untuk diaktifkan.";
  pesan("msgMasuk"); pesan("msgDaftar");
  if(matchMedia("(hover:hover)").matches) setTimeout(() => $(masuk ? "lUser" : "dUser").focus(), 60);
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
["lUser","lPass","dUser","dPass","dPass2"].forEach(id => $(id).addEventListener("input", () => tandai(id, false)));

// Pembatasan percobaan: 5 kali salah, kunci 30 detik
const sisaKunci = u => { const g = gagalMasuk[u]; return g && g.sampai > Date.now() ? Math.ceil((g.sampai - Date.now()) / 1000) : 0 };
function catatGagal(u){
  const g = gagalMasuk[u] || (gagalMasuk[u] = { n:0, sampai:0 });
  if(++g.n >= 5){ g.n = 0; g.sampai = Date.now() + 30000 }
}

// Animasi berhasil lalu masuk ke beranda
async function berhasil(u, btn){
  btn.classList.remove("busy"); btn.classList.add("done");
  await tunggu(750);
  $("authShell").classList.add("out");
  await tunggu(450);
  const nama = (punya(profiles, u) && profiles[u].fullName) || "";
  onLogin({ sub: u, email: "@" + u, picture: "", gname: nama });   // nama kosong -> kotak isi nama lengkap muncul
  // kembalikan formulir ke keadaan awal untuk login berikutnya
  $("authShell").classList.remove("out"); btn.classList.remove("done"); btn.disabled = false;
  ["lUser","lPass","dUser","dPass","dPass2"].forEach(id => $(id).value = "");
  $("dPass").dispatchEvent(new Event("input"));
  setTab("masuk");
}
const gagalFitur = "Peramban ini tidak mendukung fitur keamanan yang dibutuhkan. Buka lewat alamat https dengan Chrome atau Firefox terbaru.";
const gagalMuat = "Daftar akun belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.";

$("formMasuk").addEventListener("submit", async e => {
  e.preventDefault();
  const u = normUser($("lUser").value), p = $("lPass").value, btn = $("btnMasuk");
  pesan("msgMasuk");
  if(!u || !p){ tandai(u ? "lPass" : "lUser", true); return pesan("msgMasuk", "Isi username dan kata sandi terlebih dahulu.") }
  const sisa = sisaKunci(u);
  if(sisa) return pesan("msgMasuk", `Terlalu banyak percobaan. Coba lagi dalam ${sisa} detik.`);
  sibuk(btn, true);
  try{
    let akun;
    try{
      let daftar = await muatAkun();
      akun = punya(daftar, u) ? daftar[u] : null;
      if(!akun){ daftar = await muatAkun(true); akun = punya(daftar, u) ? daftar[u] : null }   // mungkin admin baru menambahkan
    }catch(err){ pesan("msgMasuk", gagalMuat); sibuk(btn, false); return }
    const h = await hashSandi(p, akun ? akun.salt : "00".repeat(16));   // waktu proses disamakan
    if(!akun || h !== akun.hash){
      catatGagal(u); tandai("lUser", true); tandai("lPass", true);
      pesan("msgMasuk", "Username atau kata sandi salah."); sibuk(btn, false); return;
    }
    delete gagalMasuk[u];
    await berhasil(u, btn);
  }catch(err){ pesan("msgMasuk", gagalFitur); sibuk(btn, false) }
});

// Tab Daftar: membuat kode akun (username:garam:hash) untuk dikirim ke admin
$("formDaftar").addEventListener("submit", async e => {
  e.preventDefault();
  const u = normUser($("dUser").value), p = $("dPass").value, p2 = $("dPass2").value, btn = $("btnDaftar");
  pesan("msgDaftar");
  const salah = (id, teks) => { tandai(id, true); pesan("msgDaftar", teks); $(id).focus() };
  if(!reUser.test(u)) return salah("dUser", "Username 3 sampai 20 karakter: huruf kecil, angka, titik, atau garis bawah, dan diawali huruf atau angka.");
  if(p.length < 6) return salah("dPass", "Kata sandi minimal 6 karakter.");
  if(p !== p2) return salah("dPass2", "Kata sandi dan pengulangannya belum sama.");
  sibuk(btn, true);
  try{
    try{ if(punya(await muatAkun(true), u)){ sibuk(btn, false); return salah("dUser", "Username ini sudah terdaftar. Coba username lain.") } }
    catch(err){ /* daftar tidak terbaca: lanjutkan, admin yang akan memeriksa */ }
    const salt = acakHex(16);
    tampilKode(`${u}:${salt}:${await hashSandi(p, salt)}`, u);
  }catch(err){ pesan("msgDaftar", gagalFitur) }
  sibuk(btn, false);
});

function tampilKode(baris, u){
  $("kodeBox").value = baris;
  const wa = typeof NOMOR_ADMIN === "string" ? NOMOR_ADMIN.replace(/\D/g, "") : "";
  $("kodeWa").classList.toggle("hidden", !wa);
  if(wa) $("kodeWa").href = "https://wa.me/" + wa + "?text=" + encodeURIComponent(`Halo, ini kode akun kelas saya (username: ${u}):\n${baris}`);
  $("formDaftar").classList.add("hidden"); $("hasilDaftar").classList.remove("hidden");
  $("authTitle").textContent = "Kode Akun Siap";
  $("authSub").textContent = "Kirim kode ini ke admin kelas agar akunmu diaktifkan.";
}
$("kodeSalin").onclick = async () => {
  try{ await navigator.clipboard.writeText($("kodeBox").value) }
  catch(err){ $("kodeBox").select(); document.execCommand("copy") }
  toast("Kode disalin");
};
$("kodeLagi").onclick = () => {
  ["dUser","dPass","dPass2"].forEach(id => $(id).value = "");
  $("dPass").dispatchEvent(new Event("input"));
  setTab("daftar");
};

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
  session = null; store.set("kelas_session", null); route();
};
