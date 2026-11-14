# Kasir RF Media (POS System) - Versi Demo

Aplikasi Point of Sales (POS) ringan dan cepat berbasis Node.js dan SQLite untuk operasional toko retail, ATK, maupun jasa percetakan.

> **Catatan:** Repositori ini adalah **versi demo publik** dengan data simulasi (*dummy*). Data transaksi pada demo online akan otomatis di-reset secara berkala.

---

## Fitur Utama
* **Express Kasir:** Input transaksi cepat dengan navigasi keyboard dan tampilan responsif (PC maupun tablet).
* **Manajemen Stok & HPP:** Pelacakan stok otomatis, perhitungan Harga Pokok Penjualan (HPP), serta laporan penjualan.
* **Multi-User:** Pembatasan hak akses antara *Owner* dan *Kasir/Karyawan* untuk keamanan data.
* **Struk Custom:** Mendukung cetak struk kasir dengan logo toko.

---

## Informasi Login & Uji Coba (Demo)

Gunakan kredensial berikut untuk mencoba aplikasi ini:
* **Username / PIN Default:
  ** `ahmad` / `111` (owner)
  ** `udin` / `222` (karyawan)
* **Masa Trial:** 14 Hari (per instalasi lokal)
* **Kode Master Uji Coba (Demo):** `RF-DEMO-MASTER`

---

## Cara Menjalankan di Komputer Lokal (Self-Hosted)

1. Pastikan **Node.js** sudah terinstal di komputer Anda.
2. Unduh (*clone*) repositori ini, lalu buka terminal/CMD di dalam folder proyek.
3. Instal pustaka yang dibutuhkan:
   ```bash
   npm install
Jalankan server aplikasi:

Bash
node server.js
Buka browser dan akses alamat http://localhost:3000 (atau sesuai port yang tampil di terminal).

Lisensi & Pemesanan Versi Penuh
Untuk mendapatkan Installer 1-Klik (.exe) versi penuh (tanpa batas trial) untuk operasional toko Anda, silakan hubungi pengembang via WhatsApp: 085 117 833 404.