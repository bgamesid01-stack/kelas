/* js/chat.js
   Teman dan chat. Datanya tersimpan di Google Sheet (tab Teman dan Chat) lewat Apps Script. */

const TM = { teman: [], masuk: [], keluar: [], aktif: null, lastId: 0, memuat: false, terbuka: false, tp: null, td: null };

const adaToken = () => !!(SCRIPT_AKTIF && session && session.token);
const inisial = n => (String(n || "?").trim()[0] || "?").toUpperCase();
const jamDari = w => String(w).slice(11, 16);
const kunciBaca = () => "kelas_baca_" + session.sub;
const dibaca = () => store.get(kunciBaca(), {});

// Memanggil server dengan token login. Kalau sesi sudah tidak sah, pengguna diminta masuk lagi.
async function api(aksi, data){
  const r = await panggil({ aksi, token: session.token, ...data });
  if(r.galat === "sesi"){ sesiHabis(); throw new Error("sesi") }
  return r;
}
function sesiHabis(){
  toast("Sesi habis. Silakan masuk lagi.");
  resetTeman(); session = null; store.set("kelas_session", null); go("beranda"); route();
}
function galatTeks(r){
  const peta = {
    terlalu_cepat: "Terlalu cepat. Tunggu sebentar lalu coba lagi.",
    bukan_teman: "Kalian belum berteman.",
    isi_salah: "Pesan kosong atau terlalu panjang (maksimal 500 huruf).",
    tidak_ada: "Data tidak ditemukan. Muat ulang halaman Teman.",
    data_salah: "Data belum valid."
  };
  return peta[r.galat] || "Terjadi kesalahan di server. Coba lagi.";
}
const kabarJaringan = err => { if(err && err.message !== "sesi") toast("Server akun belum bisa dihubungi. Coba lagi.") };

/* ---- Daftar teman ---- */
function updateBadge(){
  const n = TM.masuk.length + TM.teman.reduce((a, t) => a + (t.belum || 0), 0);
  document.querySelectorAll(".dot-teman").forEach(e => { e.textContent = n > 9 ? "9+" : String(n); e.classList.toggle("hidden", !n) });
}

function renderDaftar(){
  $("tmMasuk").innerHTML = TM.masuk.length ? '<h3 class="tm-sub">Permintaan Pertemanan</h3>' + TM.masuk.map(x =>
    `<div class="tm-req"><span class="tm-av">${esc(inisial(x.nama))}</span><b>${esc(x.nama)}</b><small>${esc(x.email)}</small>` +
    `<div class="tm-act"><button type="button" class="btn mint" data-terima="${esc(x.email)}">Terima</button><button type="button" class="btn white" data-tolak="${esc(x.email)}">Tolak</button></div></div>`).join("") : "";

  $("tmTeman").innerHTML = TM.teman.map(t =>
    `<li><button type="button" class="tm-item ${t.email === TM.aktif ? "on" : ""}" data-chat="${esc(t.email)}">` +
    `<span class="tm-av">${esc(inisial(t.nama))}</span><span class="tm-teks"><b>${esc(t.nama)}</b>` +
    `<small>${t.terakhir ? esc((t.terakhir.saya ? "Kamu: " : "") + t.terakhir.isi) : "Belum ada pesan"}</small></span>` +
    (t.belum ? `<i class="tm-bdg">${t.belum > 9 ? "9+" : t.belum}</i>` : "") + `</button></li>`).join("");

  $("tmKeluar").innerHTML = TM.keluar.length ? '<h3 class="tm-sub">Menunggu Balasan</h3>' + TM.keluar.map(x =>
    `<div class="tm-req"><span class="tm-av">${esc(inisial(x.nama))}</span><b>${esc(x.nama)}</b><small>${esc(x.email)}</small>` +
    `<div class="tm-act"><button type="button" class="btn white" data-batal="${esc(x.email)}">Batal</button></div></div>`).join("") : "";

  $("tmInfo").textContent = TM.teman.length || TM.masuk.length || TM.keluar.length ? "" : "Belum ada teman. Cari temanmu lewat email yang ia pakai untuk mendaftar.";
  updateBadge();
}

async function muatRingkasan(){
  if(!adaToken()) return;
  const r = await api("ringkasan", { lihat: dibaca() });
  if(!r.ok) return;
  TM.teman = r.teman; TM.masuk = r.masuk; TM.keluar = r.keluar;
  renderDaftar();
}
const muatAman = () => muatRingkasan().catch(kabarJaringan);

/* ---- Cari dan ajak teman ---- */
$("formCari").addEventListener("submit", async e => {
  e.preventDefault();
  if(!adaToken()) return;
  const em = $("cariEmail").value.trim().toLowerCase(), box = $("hasilCari");
  if(!reEmail.test(em)){ box.innerHTML = '<p class="tm-info">Format email belum benar.</p>'; return }
  box.innerHTML = '<p class="tm-info">Mencari...</p>';
  try{
    const r = await api("cari", { email: em });
    if(!r.ok){ box.innerHTML = `<p class="tm-info">${esc(galatTeks(r))}</p>`; return }
    if(r.diri){ box.innerHTML = '<p class="tm-info">Itu emailmu sendiri.</p>'; return }
    if(!r.ada){ box.innerHTML = '<p class="tm-info">Email itu belum terdaftar di web kelas.</p>'; return }
    const tombol = { "": `<button type="button" class="btn mint" data-ajak="${esc(em)}">Tambah Teman</button>`,
      diminta: `<button type="button" class="btn mint" data-terima="${esc(em)}">Terima</button>`,
      teman: "<small>Sudah berteman</small>", terkirim: "<small>Permintaan terkirim</small>" }[r.status];
    box.innerHTML = `<div class="tm-kartu"><span class="tm-av">${esc(inisial(r.nama))}</span><b>${esc(r.nama)}</b><small>${esc(em)}</small><div class="tm-act">${tombol}</div></div>`;
  }catch(err){ box.innerHTML = ""; kabarJaringan(err) }
});

async function aksiTeman(aksi, data, pesanOk){
  try{
    const r = await api(aksi, data);
    if(!r.ok){ toast(galatTeks(r)); return false }
    if(pesanOk) toast(pesanOk);
    $("hasilCari").innerHTML = ""; $("cariEmail").value = "";
    await muatRingkasan();
    return true;
  }catch(err){ kabarJaringan(err); return false }
}

/* ---- Chat ---- */
function gelembung(m){
  const d = document.createElement("div");
  d.className = "tm-b " + (m.dari === session.sub ? "saya" : "dia");
  if(m.id) d.dataset.id = m.id;
  const p = document.createElement("p"); p.textContent = m.isi;       // textContent: aman dari HTML
  const k = document.createElement("small"); k.textContent = m.waktu ? jamDari(m.waktu) : "mengirim...";
  d.appendChild(p); d.appendChild(k);
  return d;
}

function tandaiBaca(){
  if(!TM.aktif) return;
  const b = dibaca(); b[TM.aktif] = TM.lastId; store.set(kunciBaca(), b);
  const t = TM.teman.find(x => x.email === TM.aktif);
  if(t && t.belum){ t.belum = 0; renderDaftar() }
}

function tambahPesan(daftar, awal){
  const box = $("tmPesan"), dekat = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
  daftar.forEach(m => {
    if(box.querySelector(`[data-id="${m.id}"]`)) return;
    box.appendChild(gelembung(m));
    TM.lastId = Math.max(TM.lastId, m.id);
  });
  tandaiBaca();
  if(awal || dekat) box.scrollTop = box.scrollHeight;
}

async function ambil(awal){
  if(!TM.aktif || TM.memuat || !adaToken()) return;
  const dengan = TM.aktif;
  TM.memuat = true;
  try{
    const r = await api("pesanAmbil", { dengan, sejak: TM.lastId });
    if(dengan !== TM.aktif) return;
    if(!r.ok){ if(r.galat === "bukan_teman"){ toast("Kalian belum berteman."); tutupChat(); muatAman() } return }
    tambahPesan(r.pesan, awal);
  }catch(err){ /* diabaikan, dicoba lagi pada putaran berikutnya */ }
  finally{ TM.memuat = false }
}

function bukaChat(email){
  const t = TM.teman.find(x => x.email === email);
  if(!t) return;
  TM.aktif = email; TM.lastId = 0;
  $("tmNama").textContent = t.nama; $("tmPesan").innerHTML = "";
  $("tm").classList.add("open");
  renderDaftar(); ambil(true); mulaiPoll();
  if(matchMedia("(hover:hover)").matches) $("tmIsi").focus();
}
function tutupChat(){
  TM.aktif = null; $("tm").classList.remove("open"); renderDaftar();
}

$("formKirim").addEventListener("submit", async e => {
  e.preventDefault();
  const isi = $("tmIsi").value.trim(), ke = TM.aktif;
  if(!isi || !ke || !adaToken()) return;
  $("tmIsi").value = "";
  const sementara = gelembung({ dari: session.sub, isi: "" + isi, waktu: "" });
  sementara.classList.add("kirim");
  $("tmPesan").appendChild(sementara); $("tmPesan").scrollTop = $("tmPesan").scrollHeight;
  try{
    const r = await api("pesanKirim", { ke, isi });
    if(!r.ok){ sementara.classList.remove("kirim"); sementara.classList.add("gagal"); sementara.lastChild.textContent = galatTeks(r); return }
    TM.lastId = Math.max(TM.lastId, r.id);
    if($("tmPesan").querySelector(`[data-id="${r.id}"]`)) sementara.remove();   // sudah terambil oleh pembaruan otomatis
    else { sementara.dataset.id = r.id; sementara.classList.remove("kirim"); sementara.lastChild.textContent = jamDari(new Date(Date.now() + 7 * 3600000).toISOString().replace("T", " ")) }
  }catch(err){
    sementara.classList.remove("kirim"); sementara.classList.add("gagal"); sementara.lastChild.textContent = "Gagal terkirim";
  }
});
$("tmIsi").addEventListener("keydown", e => {
  if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); $("formKirim").requestSubmit ? $("formKirim").requestSubmit() : $("formKirim").dispatchEvent(new Event("submit", { cancelable:true })) }
});

/* ---- Klik di halaman Teman ---- */
$("teman").addEventListener("click", async e => {
  const b = e.target.closest("button");
  if(!b) return;
  if(b.dataset.chat) return bukaChat(b.dataset.chat);
  if(b.dataset.ajak) return void aksiTeman("ajak", { ke: b.dataset.ajak }, "Permintaan pertemanan terkirim");
  if(b.dataset.terima) return void aksiTeman("balas", { dari: b.dataset.terima, terima: true }, "Sekarang kalian berteman");
  if(b.dataset.tolak) return void aksiTeman("balas", { dari: b.dataset.tolak, terima: false });
  if(b.dataset.batal) return void aksiTeman("hapus", { dengan: b.dataset.batal });
  if(b.id === "tmBack") return tutupChat();
  if(b.id === "tmHapus"){
    if(!TM.aktif || !confirm("Hapus pertemanan ini? Riwayat chat tetap tersimpan di Sheet kelas.")) return;
    const em = TM.aktif;
    if(await aksiTeman("hapus", { dengan: em }, "Pertemanan dihapus")) tutupChat();
  }
});

/* ---- Pembaruan otomatis ---- */
function mulaiPoll(){
  hentiPoll();
  TM.tp = setInterval(() => { if(!document.hidden && TM.aktif) ambil(false) }, 4000);
  TM.td = setInterval(() => { if(!document.hidden) muatAman() }, 15000);
}
function hentiPoll(){ clearInterval(TM.tp); clearInterval(TM.td); TM.tp = TM.td = null }

function bukaTeman(){
  TM.terbuka = true;
  if(!adaToken()){
    $("tmInfo").textContent = "Keluar lalu masuk lagi untuk memakai fitur Teman dan chat.";
    return;
  }
  muatAman(); mulaiPoll();
  if(TM.aktif) ambil(false);
}
function tutupTeman(){ TM.terbuka = false; hentiPoll() }

function resetTeman(){
  TM.teman = []; TM.masuk = []; TM.keluar = []; TM.aktif = null; TM.lastId = 0; TM.terbuka = false;
  hentiPoll(); $("tm").classList.remove("open");
  $("tmTeman").innerHTML = $("tmMasuk").innerHTML = $("tmKeluar").innerHTML = $("hasilCari").innerHTML = "";
  updateBadge();
}

// Dipanggil setelah login; juga memeriksa permintaan dan pesan baru secara berkala saat halaman Teman tertutup.
function segarkanTeman(){ if(adaToken()) setTimeout(muatAman, 800) }
setInterval(() => { if(adaToken() && !document.hidden && !TM.terbuka) muatAman() }, 45000);
segarkanTeman();
