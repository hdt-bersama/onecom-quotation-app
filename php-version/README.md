# Penawaran Harga & Invoice (PHP + Supabase)

Aplikasi PHP native (PDO) untuk membuat, mengedit ulang, mencetak Penawaran & Invoice. Database: Supabase (PostgreSQL). UI: Bootstrap 5 + Alpine.js. Cetak: HTML + CSS `@media print` (A4) -> "Simpan sebagai PDF".

## Struktur
```
config/config.php      konfigurasi (dibaca dari .env)
database/schema.sql    skrip tabel Supabase
src/                   Database, Repositories (Settings/Customers/Documents), controllers, helpers
views/                 layout, dashboard, form, settings, print, login
public/                DOCROOT: index.php, assets/, uploads/
tools/render_demo.php  render halaman dengan data contoh (tanpa DB)
```

## Hubungkan ke Supabase
1. Buat project di supabase.com.
2. SQL Editor -> New query -> tempel isi `database/schema.sql` -> Run.
3. Klik **Connect** di dashboard -> salin parameter **Session pooler** (host `...pooler.supabase.com`, port 5432, user `postgres.<ref>`). Gunakan pooler, bukan host `db.<ref>.supabase.co` (hanya IPv6).
4. `cp .env.example .env`, isi `DB_*` dan `APP_PASSWORD`.
5. Pastikan PHP >= 8.1 dengan ekstensi `pdo_pgsql`, `fileinfo`.
6. Jalankan: `php -S localhost:8000 -t public` lalu buka http://localhost:8000
7. Buka **Pengaturan**, isi identitas perusahaan, logo, rekening, S&K.

## Hosting
GitHub hanya menyimpan kode. Untuk menjalankan PHP, deploy ke hosting PHP / VPS / Render / Railway (docroot = `public/`). Isi variabel `DB_*` dan `APP_*` sebagai environment variable di hosting. Logo disimpan di `public/uploads/`; di hosting dengan disk sementara, upload ulang logo setelah deploy atau gunakan volume persisten.

## Keamanan
CSRF token, prepared statements, login sesi (`APP_PASSWORD`), RLS aktif di semua tabel, upload dibatasi PNG/JPG/WebP. Jangan commit `.env`.
