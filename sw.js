// Service worker sederhana: menyimpan file aplikasi (shell) agar terbuka cepat.
// Data (Supabase) TIDAK pernah di-cache. Naikkan VERSION setiap kali ada perubahan kode.
const VERSION = 'v7';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'assets/css/app.css', 'assets/img/icon.svg',
  'assets/img/icon-192.png', 'assets/img/icon-512.png', 'assets/img/icon-maskable-512.png',
  'assets/js/app.js', 'assets/js/pwa.js', 'assets/js/config.js', 'assets/js/util.js', 'assets/js/supabase.js', 'assets/js/api.js',
  'assets/js/views/login.js', 'assets/js/views/dashboard.js', 'assets/js/views/form.js',
  'assets/js/views/settings.js', 'assets/js/views/print.js', 'assets/js/views/verify.js', 'assets/js/sheet.js', 'assets/js/qr.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;   // lewati Supabase
  // network-first: selalu ambil versi terbaru, cache hanya sebagai cadangan offline
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
