/* js/config.js
   Pengaturan dan data konten. Ubah file ini untuk menyesuaikan web dengan kelasmu. */

// Alamat Web App Google Apps Script untuk login (lihat README.md, bagian "Memasang login Google Sheet").
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxYmDLwBrw1Vp_WqyBntX3v5ViAFiAmS0ZlVzkCzSO03Xx9LBTp4Ice6EB3bgA4qGBJ8A/exec";

const NAMA_KELAS = "XII AK 1";
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
