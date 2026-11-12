// Halaman verifikasi QR: bisa dibuka siapa saja tanpa login, hanya-baca.
import * as api from '../api.js';
import { getCfg } from '../supabase.js';
import { esc, rupiah, qtyFmt, tglIndo, num } from '../util.js';

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

  const row = (k, v) => (v ? `<div class="vrow"><span>${esc(k)}</span><b>${v}</b></div>` : '');
  const lines = doc.items.map((i) => `
    <div class="vitem">
      <div class="vname">${esc(i.description)}</div>
      <div class="vsub">${qtyFmt(i.qty)}${i.unit ? ' ' + esc(i.unit) : ''} &times; ${rupiah(i.unit_price)}${num(i.discount_percent) > 0 ? ` &minus; ${qtyFmt(i.discount_percent)}%` : ''}</div>
      <div class="vamt">${rupiah(i.line_total)}</div>
    </div>`).join('');

  root.innerHTML = shell(`
    <div class="verify-banner ok">
      <b>&#10003; Dokumen asli &middot; terdaftar di sistem</b>
      ${host ? `<small class="muted">Server: ${esc(host)}</small>` : ''}
    </div>
    <div class="card pad vcard">
      <div class="vbrand">
        ${settings.logo_data ? `<img src="${settings.logo_data}" alt="">` : ''}
        <div><b>${esc(settings.company_name)}</b>${settings.city ? `<small>${esc(settings.city)}</small>` : ''}</div>
      </div>
      <div class="vhead"><span class="vtype">${esc(c.label)}</span><span class="badge accent">${esc(status)}</span></div>
      <div class="vnum">${esc(doc.number)}</div>
      ${row('Kepada', esc(doc.customer_name))}
      ${row('Perihal', doc.subject ? esc(doc.subject) : '')}
      ${row('Tanggal', tglIndo(doc.issue_date))}
      ${row(c.date2Label, doc.date2 ? tglIndo(doc.date2) : '')}
    </div>
    <div class="card pad vcard">
      <h2 class="sec">Rincian</h2>
      ${lines}
      <div class="vtot">
        ${row('Subtotal', rupiah(doc.subtotal))}
        ${num(doc.discount_total) > 0 ? row('Diskon', '- ' + rupiah(doc.discount_total)) : ''}
        ${num(doc.tax_amount) > 0 ? row(`PPN ${qtyFmt(doc.tax_percent)}%`, rupiah(doc.tax_amount)) : ''}
        <div class="vrow grand"><span>Total</span><b>Rp ${rupiah(doc.total)}</b></div>
      </div>
    </div>`);
}
