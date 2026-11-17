/**
 * apps-script/Code.gs
 * Server akun Kelas Ceria: Google Apps Script + Google Sheet.
 *
 * Kolom di Sheet:  A = Nama   B = Email   C = PasswordHash   D = WaktuDaftar
 *
 * Cara memasang (panduan lengkap ada di README.md):
 * 1. Buka Google Sheet, lalu menu Ekstensi > Apps Script.
 * 2. Hapus isi bawaan, tempel seluruh isi file ini, lalu simpan.
 * 3. Deploy > Deployment baru > jenis "Aplikasi web", Jalankan sebagai "Saya",
 *    Yang memiliki akses "Siapa saja", lalu Deploy dan salin URL-nya ke SCRIPT_URL di js/config.js.
 *
 * Kode pendaftaran (opsional): di Apps Script buka Setelan Project > Properti skrip,
 * tambahkan properti bernama KODE_DAFTAR berisi kode pilihanmu. Kalau properti ini tidak ada,
 * siapa pun yang tahu alamat web bisa mendaftar.
 *
 * Catatan keamanan: kata sandi TIDAK pernah dikirim ke sini. Peramban mengubahnya menjadi hash
 * (PBKDF2) lebih dulu, dan hanya hash itu yang dikirim dan disimpan di kolom PasswordHash.
 * Sheet ini sebaiknya tidak dibagikan ke siapa pun, karena berisi nama dan email siswa.
 */

const reEmail = /^[a-z0-9][^\s@]*@[^\s@]+\.[^\s@]{2,}$/;
const reNama = /^[\p{L}][\p{L}\s.'’-]{2,59}$/u;
const reHash = /^[0-9a-f]{64}$/;
const BATAS_GAGAL = 5;     // salah sebanyak ini mengunci email itu sementara
const MENIT_KUNCI = 5;

function doGet(e) {
  // Cadangan: peramban yang gagal memakai POST mengirim datanya lewat ?d=...
  if (e && e.parameter && e.parameter.d) return proses(e.parameter.d);
  return jawab({ ok: true, pesan: "Server akun Kelas Ceria aktif." });
}

function doPost(e) {
  return proses(e && e.postData ? e.postData.contents : "");
}

function proses(teks) {
  let d;
  try { d = JSON.parse(teks); }
  catch (err) { return jawab({ ok: false, galat: "permintaan_salah" }); }
  try {
    if (d.aksi === "masuk") return jawab(masuk(d));
    if (d.aksi === "daftar") return jawab(daftar(d));
    return jawab({ ok: false, galat: "aksi_salah" });
  } catch (err) {
    return jawab({ ok: false, galat: "server" });
  }
}

function jawab(isi) {
  return ContentService.createTextOutput(JSON.stringify(isi)).setMimeType(ContentService.MimeType.JSON);
}

// Perbandingan teks yang waktunya tidak bergantung pada letak perbedaan.
function sama(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function lembar() {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (s.getLastRow() === 0) s.getRange(1, 1, 1, 4).setValues([["Nama", "Email", "PasswordHash", "WaktuDaftar"]]);
  return s;
}

function cariAkun(s, email) {
  const n = s.getLastRow() - 1;
  if (n < 1) return null;
  const data = s.getRange(2, 1, n, 4).getValues();
  for (let i = 0; i < n; i++) {
    if (String(data[i][1]).trim().toLowerCase() === email) {
      return { nama: String(data[i][0]), hash: String(data[i][2]).replace(/^pbkdf2\$/, "") };
    }
  }
  return null;
}

function masuk(d) {
  const email = String(d.email || "").trim().toLowerCase(), hash = String(d.hash || "");
  if (!reEmail.test(email) || !reHash.test(hash)) return { ok: false, galat: "salah" };
  const cache = CacheService.getScriptCache(), kunci = "gagal:" + email;
  const gagal = parseInt(cache.get(kunci) || "0", 10);
  if (gagal >= BATAS_GAGAL) return { ok: false, galat: "terkunci" };
  const akun = cariAkun(lembar(), email);
  if (akun && sama(akun.hash, hash)) {
    cache.remove(kunci);
    return { ok: true, nama: akun.nama };
  }
  cache.put(kunci, String(gagal + 1), MENIT_KUNCI * 60);
  return { ok: false, galat: "salah" };
}

function daftar(d) {
  const nama = String(d.nama || "").trim().replace(/\s+/g, " ");
  const email = String(d.email || "").trim().toLowerCase();
  const hash = String(d.hash || ""), kode = String(d.kode || "");
  if (!reNama.test(nama) || !reEmail.test(email) || email.length > 80 || !reHash.test(hash)) {
    return { ok: false, galat: "data_salah" };
  }
  const kodeAsli = PropertiesService.getScriptProperties().getProperty("KODE_DAFTAR");
  if (kodeAsli) {
    if (!kode) return { ok: false, galat: "perlu_kode" };
    if (!sama(kode, kodeAsli)) { Utilities.sleep(800); return { ok: false, galat: "kode_salah" }; }
  }
  const kunci = LockService.getScriptLock();
  kunci.waitLock(10000);
  try {
    const s = lembar();
    if (cariAkun(s, email)) return { ok: false, galat: "email_dipakai" };
    s.appendRow([nama, email, "pbkdf2$" + hash, Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss")]);
  } finally {
    kunci.releaseLock();
  }
  return { ok: true, nama: nama };
}
