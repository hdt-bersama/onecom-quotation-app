// Pemasangan aplikasi (PWA) dan permintaan penyimpanan permanen.
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => { try { fn(); } catch { /* abaikan */ } });

// Chrome/Edge (Android & desktop) mengirim event ini saat aplikasi memenuhi syarat dipasang.
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
window.addEventListener('appinstalled', () => { deferred = null; notify(); });

export const onInstallChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches
    || matchMedia('(display-mode: window-controls-overlay)').matches
    || navigator.standalone === true;
}
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const canInstall = () => Boolean(deferred) && !isStandalone();

export async function promptInstall() {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  notify();
  ev.prompt();
  const { outcome } = await ev.userChoice;
  return outcome === 'accepted';
}

/** Minta browser agar tidak menghapus data aplikasi (koneksi & sesi login) saat penyimpanan penuh. */
export async function requestPersist() {
  try {
    if (!navigator.storage?.persist) return false;
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch { return false; }
}
export async function isPersisted() {
  try { return Boolean(await navigator.storage?.persisted?.()); } catch { return false; }
}
