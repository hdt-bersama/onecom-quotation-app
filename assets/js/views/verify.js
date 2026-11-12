// Halaman verifikasi QR: bisa dibuka siapa saja tanpa login, hanya-baca.
import * as api from '../api.js';
import { sheetHtml } from '../sheet.js';
import { getCfg } from '../supabase.js';
import { esc } from '../util.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Koneksi dari parameter QR (dipakai hanya jika perangkat ini belum punya koneksi sendiri). */
function cfgFromQuery(qs) {
  const q = new URLSearchParams(qs);
  let u = (q.get('u') || '').trim();
  const key = (q.get('k') || '').trim();
  if (/^[a-z0-9]{10,40}$/i.test(u)) u = `https://${u.toLowerCase()}.supabase.co`;
  const ok = /^https:\/\/[^\s/]+$/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(u);
  return ok && key ? { url: u, key } : null;
}

const shell = (inner) => `<div class="verify">${inner}</div>`;

export async function render(root, { type, token, qs }) {
  root.innerHTML = shell('<p class="muted center">Memeriksa dokumen...</p>');
  if (!api.isType(type) || !UUID.test(token || '')) {
    root.innerHTML = shell(`<div class="card pad center"><h2>QR tidak valid</h2>
      <p class="muted">Kode verifikasi pada tautan ini tidak dikenali.</p></div>`);
    return;
  }

  const own = getCfg();
  const fromQr = !(own.url && own.key);
  let res;
  try {
    res = await api.getPublicDoc(type, token.toLowerCase(), cfgFromQuery(qs));
  } catch (e) {
    root.innerHTML = shell(`<div class="card pad center"><h2>Tidak dapat memeriksa dokumen</h2>
      <p class="muted">${esc(e.message)}</p><button class="btn primary" onclick="location.reload()">Coba lagi</button></div>`);
    return;
  }
  if (!res) {
    root.innerHTML = shell(`<div class="verify-banner bad"><b>Dokumen tidak ditemukan</b>
      <span>QR ini tidak terdaftar atau dokumennya sudah dihapus. Hubungi penerbit dokumen.</span></div>`);
    return;
  }

  const { doc, settings } = res;
  const c = api.TYPES[type];
  document.title = `Verifikasi ${c.label} ${String(doc.number).replace(/\//g, '-')}`;
  if (settings.logo_data && !/^data:image\//.test(settings.logo_data)) settings.logo_data = null;
  const status = c.statuses[doc.status] || doc.status;
  let host = '';
  if (fromQr) { try { host = new URL(cfgFromQuery(qs)?.url || '').host; } catch { /* abaikan */ } }

  root.innerHTML = shell(`
    <div class="verify-banner ok">
      <b>&#10003; Dokumen asli &middot; terdaftar di sistem</b>
      <span>${esc(c.label)} <b>${esc(doc.number)}</b> diterbitkan oleh ${esc(settings.company_name)}.
        Status: <span class="badge accent">${esc(status)}</span></span>
      ${host ? `<small class="muted">Server: ${esc(host)}</small>` : ''}
    </div>
    ${sheetHtml({ doc, s: settings, type, qrUrl: '' })}`);
}
