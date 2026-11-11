/* js/config.js
   Pengaturan dan data konten. Ubah file ini untuk menyesuaikan web dengan kelasmu. */

// Isi dengan OAuth Client ID dari Google Cloud Console (tipe: Web application).
// Kalau masih kosong, tombol Google asli tidak muncul dan tersedia mode demo.
const GOOGLE_CLIENT_ID = "";

const NAMA_KELAS = "Kelas XII AK 1";
const JADWAL = {
  Senin:  ["-", "-", "-", "-", "-"],
  Selasa: ["-", "-", "-", "-", "-"],
  Rabu:   ["-", "-", "-", "-", "-"],
  Kamis:  ["-", "-", "-", "-", "-"],
  Jumat:  ["-", "-", "-", "-", "-"]
};
const PENGUMUMAN = [
];
const TUGAS = [
];

// Dokumentasi kegiatan kelas (galeri foto).
// Cara menambah: taruh foto di folder assets/dokumentasi/, lalu tambahkan satu baris di bawah.
// - foto       : lokasi file (gunakan nama tanpa spasi, mis. kerja-bakti.jpg)
// - judul      : judul singkat kegiatan
// - tanggal    : format TAHUN-BULAN-TANGGAL, mis. "2026-11-07"
// - keterangan : cerita singkat (boleh dikosongkan)
// Foto pertama tampil paling besar di layar desktop. Isi di bawah hanyalah contoh, ganti dengan fotomu.
const DOKUMENTASI = [
];
