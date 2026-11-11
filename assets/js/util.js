// Fungsi bantu: escape HTML, format rupiah/tanggal, terbilang, hitung total.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const nl2br = (s) => esc(s).replace(/\r?\n/g, '<br>');

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(num(n)));

export const qtyFmt = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num(n));

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function tglIndo(d) {
  if (!d) return '-';
  const [y, m, dd] = String(d).slice(0, 10).split('-');
  if (!y || !m || !dd) return '-';
  return `${dd} ${BULAN[Number(m) - 1]} ${y}`;
}

export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + Number(days || 0)));
  return dt.toISOString().slice(0, 10);
}

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

function tb(n) {
  if (n < 12) return SATUAN[n];
  if (n < 20) return SATUAN[n - 10] + ' belas';
  if (n < 100) return SATUAN[Math.floor(n / 10)] + ' puluh ' + tb(n % 10);
  if (n < 200) return 'seratus ' + tb(n - 100);
  if (n < 1000) return SATUAN[Math.floor(n / 100)] + ' ratus ' + tb(n % 100);
  if (n < 2000) return 'seribu ' + tb(n - 1000);
  for (const [base, name] of [[1e12, 'triliun'], [1e9, 'miliar'], [1e6, 'juta'], [1e3, 'ribu']]) {
    if (n >= base) return tb(Math.floor(n / base)) + ' ' + name + ' ' + tb(n % base);
  }
  return '';
}

export function terbilang(n) {
  n = Math.abs(Math.round(num(n)));
  if (n === 0) return 'nol';
  return tb(n).replace(/\s+/g, ' ').trim();
}

/** Hitung total (sama dengan perhitungan di fungsi SQL save_document). */
export function calc(items, taxPercent) {
  let subtotal = 0;
  let discount = 0;
  const lines = items.map((it) => {
    const gross = Math.max(0, num(it.qty)) * Math.max(0, num(it.unit_price));
    const dp = Math.min(100, Math.max(0, num(it.discount_percent)));
    const d = Math.round(gross * dp) / 100;
    subtotal += gross;
    discount += d;
    return gross - d;
  });
  const tp = Math.min(100, Math.max(0, num(taxPercent)));
  const net = subtotal - discount;
  const tax = Math.round(net * tp) / 100;
  return { lines, subtotal, discount, tax, total: net + tax };
}

export function toast(msg, type = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.className = 'no-print';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), type === 'err' ? 6000 : 3000);
}

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
