// Konfigurasi koneksi Supabase.
// Boleh diisi di sini, ATAU dikosongkan lalu diisi lewat layar pertama saat aplikasi dibuka
// (tersimpan di browser). Kunci "anon/publishable" memang bersifat publik; keamanan data
// dijaga oleh login + Row Level Security (lihat database/schema.sql).
export const CONFIG = {
  SUPABASE_URL: '',        // contoh: https://abcdefghijklmnop.supabase.co
  SUPABASE_ANON_KEY: '',   // "anon public" key atau "publishable" key. JANGAN isi service_role key!
};
