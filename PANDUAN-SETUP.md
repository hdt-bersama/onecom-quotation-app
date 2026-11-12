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

## 7. Pasang sebagai aplikasi (Android, komputer, iPhone)
Aplikasi ini PWA: bisa dipasang, punya ikon sendiri, dan terbuka tanpa address bar.
- **Android (Chrome):** tombol **Pasang aplikasi** muncul di menu atas aplikasi (atau menu ⋮ → **Instal aplikasi**). Hasilnya ikon di layar utama.
- **Komputer (Chrome/Edge):** klik tombol **Pasang aplikasi** atau ikon instal di kanan address bar. Muncul di menu Start/Launchpad dan bisa dipin ke taskbar.
- **iPhone/iPad (Safari):** Bagikan → **Tambahkan ke Layar Utama**. Catatan: di iOS, aplikasi layar utama punya penyimpanan terpisah dari Safari, jadi koneksi perlu diisi sekali lagi (lihat tautan setup di bawah).
- Tekan lama ikon aplikasi di Android untuk jalan pintas **Penawaran Baru** / **Invoice Baru**.

## 8. Koneksi tersimpan, tidak perlu diisi ulang
- URL & key Supabase diisi **sekali** per perangkat, lalu tersimpan. Login juga tersimpan sampai Anda menekan **Keluar**.
- Aplikasi meminta browser menyimpan data secara **permanen** (status terlihat di Pengaturan → *Aplikasi & Koneksi*).
- **Perangkat lain:** buka **Pengaturan → Aplikasi & Koneksi → Salin tautan setup perangkat lain**, kirim ke perangkat itu (WhatsApp ke diri sendiri, dll.), lalu buka. Koneksi otomatis tersimpan dan tinggal login. Tautan berisi kunci *publishable* (bukan rahasia), tetap bagikan hanya ke perangkat Anda.
- **Ganti project Supabase:** Pengaturan → **Ubah koneksi...**
- **Tanpa setup sama sekali di semua perangkat:** isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di `assets/js/config.js` (edit langsung di GitHub), atau simpan sebagai *Actions secrets* dengan nama yang sama (lihat bagian atas `deploy.yml`). Setelah deploy, perangkat baru langsung ke layar login.

## 9. QR verifikasi pada penawaran & invoice

Setiap penawaran/invoice yang dicetak memuat QR di atas nama penandatangan. Siapa pun yang memindainya
(tanpa login) melihat halaman hanya-baca berisi dokumen aslinya dan keterangan bahwa dokumen itu terdaftar
di sistem. Dokumen yang dihapus atau QR palsu menampilkan "Dokumen tidak ditemukan".

**Yang perlu dilakukan sekali:** jalankan ulang `database/schema.sql` di Supabase (SQL Editor -> New query ->
tempel -> Run). Aman diulang; dokumen lama otomatis mendapat kode QR.

Supaya QR bisa dibuka di HP siapa pun, alamat server harus ikut diketahui halaman verifikasi:

- **Disarankan:** tanamkan alamat Supabase lewat GitHub Secrets (Settings -> Secrets and variables -> Actions):
  `SUPABASE_URL` dan `SUPABASE_ANON_KEY`, lalu di tab Actions jalankan ulang "Deploy ke GitHub Pages". Dengan cara ini
  halaman verifikasi hanya pernah bicara ke Supabase Anda sendiri.
- Tanpa itu, QR membawa alamat project + kunci publik di dalam tautannya (hanya muat jika memakai kunci
  **publishable** yang pendek, bukan kunci anon lama yang panjang). Halaman verifikasi lalu menampilkan baris
  "Server: ..." agar terlihat ke mana ia terhubung.

Catatan: QR memuat alamat situs saat dicetak. Jika alamat GitHub Pages berubah (mis. repo dipindah ke akun lain),
QR pada dokumen yang sudah tercetak ikut mengarah ke alamat lama. Pindahkan dulu sebelum mencetak dokumen sungguhan.

## 10. Memindahkan repo ke akun GitHub lain

Pilih salah satu. Untuk akun baru, perlu **nama pengguna** GitHub-nya (email tidak cukup).

**A. Import (paling mudah, repo lama tetap ada)** — login ke akun tujuan, buka https://github.com/new/import ,
isi URL repo lama (`https://github.com/<akun-lama>/quotation-app`), pilih nama dan **Public**, klik *Begin import*.

**B. Transfer (repo pindah, riwayat & pengaturan ikut)** — di repo lama: Settings -> General -> paling bawah *Danger Zone*
-> *Transfer ownership* -> isi nama pengguna akun tujuan. Akun tujuan menerima email dan harus menerimanya.

Setelah repo ada di akun baru (berlaku untuk A maupun B):

1. Settings -> Pages -> Source: **GitHub Actions**. (Akun gratis: repo harus **Public**.)
2. Jika memakai Secrets (langkah 9), buat ulang `SUPABASE_URL` dan `SUPABASE_ANON_KEY` — secrets tidak ikut terbawa.
3. Tab Actions -> *Deploy ke GitHub Pages* -> *Run workflow*.
4. Alamat baru: `https://<akun-baru>.github.io/quotation-app/`. Buka sekali, lalu isi koneksi Supabase (atau pakai tautan
   setup di langkah 8). Data tetap di Supabase, tidak ikut pindah dan tidak hilang.
5. Pasang ulang aplikasi di HP/komputer dari alamat baru (aplikasi lama terikat ke alamat lama).

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
| Tombol Pasang tidak muncul | Harus lewat **https** (alamat github.io), belum terpasang, dan memakai Chrome/Edge. Di Safari/iOS pakai menu Bagikan. Bisa juga lewat menu ⋮ browser. |
| Setelah dipasang, minta isi koneksi lagi | Normal di iOS (penyimpanan terpisah). Pakai tautan setup, atau isi `config.js`. |
| "Nomor dokumen sudah dipakai" | Nomor harus unik; ubah nomornya. |
