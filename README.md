# Penawaran Harga & Invoice

Aplikasi web statis (PWA) untuk membuat, mengedit ulang, dan mencetak **Penawaran Harga** dan **Invoice**.
Berjalan di **GitHub Pages** (tanpa server), database di **Supabase**, mengikuti pola HDT POS.

- Dashboard riwayat dokumen: cari, filter, ubah status, Cetak/PDF, Edit ulang, Hapus, "Jadikan Invoice"
- Form dinamis: tambah/hapus baris item (deskripsi + spesifikasi, qty, satuan, harga, diskon %), subtotal/PPN/total otomatis
- Pengaturan: kop surat (nama, logo, alamat, telepon), rekening bank, syarat & ketentuan standar, penomoran
- Cetak A4 siap kirim: kop, klien, nomor, tabel item, terbilang, rekening, S&K, area tanda tangan
- Login (Supabase Auth) + Row Level Security: data hanya bisa diakses user yang login
- Bisa dipasang sebagai aplikasi di Android, komputer, dan iPhone; koneksi & login tersimpan; tautan setup untuk perangkat lain

**Panduan lengkap: [PANDUAN-SETUP.md](PANDUAN-SETUP.md)**

## QR verifikasi
Setiap dokumen cetak memuat QR yang membuka halaman hanya-baca (tanpa login) untuk memastikan dokumen itu asli.
Lihat langkah 9 di [PANDUAN-SETUP.md](PANDUAN-SETUP.md). Pembuat QR ada di `assets/js/qr.js` (tanpa library).

## Struktur
```
index.html, manifest.webmanifest, sw.js   PWA
assets/css/app.css                        tampilan (warna tema: variabel --brand)
assets/js/                                app.js (router), supabase.js (klien Auth+REST), api.js, util.js, views/
database/schema.sql                       tabel, fungsi, dan keamanan (jalankan di Supabase SQL Editor)
.github/workflows/deploy.yml              deploy otomatis ke GitHub Pages
tools/mock-supabase.mjs                   server tiruan untuk uji lokal tanpa Supabase
php-version/                              versi PHP lama (arsip, tidak dipakai)
```

## Uji lokal tanpa Supabase
```
node tools/mock-supabase.mjs        # buka http://localhost:8099 , login admin@test.com / secret
```
Hanya alat uji; data hilang saat server dimatikan.
