# Panduan Setup (dari nol sampai bisa dipakai)

Urutan: **Supabase → GitHub Pages → buka aplikasi**. Tidak perlu PHP, XAMPP, atau server.

## 1. Buat project Supabase
1. Masuk ke https://supabase.com → **New project** (region Singapore). Simpan password database.
2. Tunggu sampai project siap.

## 2. Buat tabel (sekali saja)
1. Menu **SQL Editor → New query**.
2. Salin seluruh isi `database/schema.sql` dari repo ini, tempel, klik **Run**.
3. Di **Table Editor** harus ada 6 tabel: `settings`, `customers`, `quotations`, `quotation_items`, `invoices`, `invoice_items`.

## 3. Buat user login & matikan pendaftaran publik (PENTING)
Kunci "anon/publishable" Supabase terlihat di browser (memang begitu desainnya). Yang melindungi data adalah login + RLS.
1. **Authentication → Users → Add user → Create new user**: isi email dan password Anda, centang *Auto Confirm User*.
2. **Authentication → Sign In / Providers** (atau *Settings*) → matikan **Allow new users to sign up**.
   Tanpa ini, orang asing bisa mendaftar sendiri lalu membaca data Anda.

## 4. Ambil URL & kunci project
**Project Settings → API Keys / Data API**:
- **Project URL**: `https://xxxxxxxx.supabase.co`
- Kunci **anon public** (atau **publishable**): `eyJ...` / `sb_publishable_...`

Jangan pernah memakai kunci **service_role** di aplikasi ini.

## 5. Aktifkan GitHub Pages
1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push ke branch `main` (atau tab **Actions → Deploy ke GitHub Pages → Run workflow**).
3. Setelah hijau, alamat aplikasi: `https://<akun>.github.io/<nama-repo>/`.

> GitHub Pages untuk repo **private** hanya tersedia di paket berbayar (Pro/Team). Di paket gratis, jadikan repo **Public** (seperti hdt-pos). Aman, karena repo ini tidak berisi password atau data; hanya kode.

**Opsional** — tanam alamat Supabase supaya tidak perlu mengisinya di tiap perangkat:
Settings → Secrets and variables → Actions → tambah `SUPABASE_URL` dan `SUPABASE_ANON_KEY`, lalu jalankan ulang workflow.

## 6. Buka aplikasi
1. Buka alamat Pages. Pertama kali muncul layar **Hubungkan ke Supabase**: isi Project URL dan anon key → **Simpan koneksi**. (Dilewati jika memakai secret di langkah 5.)
2. Login dengan email & password dari langkah 3.
3. Menu **Pengaturan**: isi nama perusahaan, alamat, telepon, logo, rekening bank, syarat & ketentuan, penandatangan → **Simpan**.
4. **+ Penawaran** / **+ Invoice** → isi → **Simpan** atau **Simpan & Cetak**.
5. Di halaman cetak klik **Cetak / Simpan PDF**, pilih **A4** dan matikan *Headers and footers*.

## 7. Pasang di HP (opsional)
Chrome Android: menu ⋮ → **Instal aplikasi** / **Tambahkan ke layar utama**. Di komputer: ikon Instal di address bar.
Aplikasi butuh internet untuk membaca/menyimpan data (data ada di Supabase).

## Mengubah warna tema
Di `assets/css/app.css`, ubah `--brand` (dan `--brand-soft`). Ikon aplikasi ada di `assets/img/`.

## Masalah umum
| Gejala | Solusi |
|---|---|
| "Email atau password salah" | Cek user di Authentication → Users; pastikan *Auto Confirm*. |
| Layar putih / "Terjadi kesalahan" setelah login | Skema SQL belum dijalankan (langkah 2). |
| `permission denied` / `new row violates row-level security` | Bagian keamanan di `schema.sql` belum terjalankan; jalankan ulang file itu. |
| "Tidak dapat terhubung ke Supabase" | URL salah (harus `https://…supabase.co`), project *paused* (buka dashboard), atau tidak ada internet. |
| Perubahan kode belum terlihat | Tutup & buka ulang aplikasi; naikkan `VERSION` di `sw.js` setiap mengubah kode. |
| "Nomor dokumen sudah dipakai" | Nomor harus unik; ubah nomornya. |
