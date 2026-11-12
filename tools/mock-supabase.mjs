// Server tiruan Supabase (Auth + PostgREST sebagian + RPC) untuk uji lokal TANPA database sungguhan.
// Juga menyajikan file aplikasi dari folder root repo.
//   node tools/mock-supabase.mjs [port]      lalu buka http://localhost:8099
// Login uji: admin@test.com / secret.  Catatan: ini hanya alat uji, bukan bagian aplikasi.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8099);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

let seq = 0;
const db = {
  settings: [{ id: 1, company_name: 'Nama Perusahaan Anda', city: 'Jakarta', quotation_prefix: 'QT', invoice_prefix: 'INV', default_tax_percent: 0, default_valid_days: 14, terms: 'Harga dapat berubah sewaktu-waktu.' }],
  customers: [], quotations: [], quotation_items: [], invoices: [], invoice_items: [],
};
const T = {
  quotation: { table: 'quotations', items: 'quotation_items', fk: 'quotation_id', d2: 'valid_until' },
  invoice: { table: 'invoices', items: 'invoice_items', fk: 'invoice_id', d2: 'due_date' },
};
const STATUS = { quotation: ['pending', 'approved', 'rejected'], invoice: ['draft', 'sent', 'paid'] };
const clamp = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
const r2 = (n) => Math.round(n * 100) / 100;
class PgErr extends Error { constructor(msg, code, status = 400) { super(msg); this.code = code; this.status = status; } }

function applySelect(rows, select) {
  if (!select || select === '*') return rows;
  const cols = select.split(',');
  return rows.map((row) => {
    const o = {};
    for (const c of cols) {
      if (c === '*') Object.assign(o, row);
      else if (c.includes(':')) { const [alias, src] = c.split(':'); o[alias] = row[src] ?? null; }
      else o[c] = row[c] ?? null;
    }
    return o;
  });
}
function applyFilters(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue;
    const m = /^eq\.(.*)$/.exec(v);
    if (m) out = out.filter((r) => String(r[k]) === m[1]);
  }
  return out;
}
function applyOrder(rows, order) {
  if (!order) return rows;
  const keys = order.split(',').map((s) => { const [c, d] = s.split('.'); return [c, d === 'desc' ? -1 : 1]; });
  return [...rows].sort((a, b) => {
    for (const [c, d] of keys) { if (a[c] < b[c]) return -d; if (a[c] > b[c]) return d; }
    return 0;
  });
}

function nextNumber(type, date) {
  const t = T[type];
  const stem = `${db.settings[0][type + '_prefix']}/${String(date).slice(0, 4)}/`;
  let max = 0;
  for (const r of db[t.table]) if (r.number.startsWith(stem) && /^\d+$/.test(r.number.slice(stem.length))) max = Math.max(max, Number(r.number.slice(stem.length)));
  return stem + String(max + 1).padStart(4, '0');
}

// Meniru public.get_public_document(): satu dokumen berdasarkan kode, tanpa login.
function publicDocument({ p_type, p_token }) {
  const t = T[p_type];
  if (!t) return null;
  const rec = db[t.table].find((r) => r.verify_token === p_token);
  if (!rec) return null;
  const { verify_token, ...doc } = rec;
  const st = db.settings[0];
  const pick = ['company_name', 'address', 'phone', 'email', 'city', 'logo_data', 'bank_name', 'bank_account_no', 'bank_account_holder', 'signer_name'];
  return {
    doc: { ...doc, date2: rec[t.d2] ?? null },
    items: db[t.items].filter((i) => i[t.fk] === rec.id).sort((a, b) => a.position - b.position),
    settings: Object.fromEntries(pick.map((k) => [k, st[k] ?? null])),
  };
}

function saveDocument({ p_type, p_id, p_doc: d, p_items }) {
  const t = T[p_type];
  if (!t) throw new PgErr(`Tipe dokumen tidak valid: ${p_type}`, 'P0001');
  const items = (p_items || []).filter((i) => String(i.description || '').trim() !== '');
  if (!items.length) throw new PgErr('Minimal harus ada satu baris item dengan deskripsi', 'P0001');
  if (!STATUS[p_type].includes(d.status)) throw new PgErr('violates check constraint', '23514');
  const taxp = clamp(d.tax_percent, 0, 100);
  let sub = 0; let disc = 0;
  const lines = items.map((i) => {
    const gross = Math.max(0, Number(i.qty) || 0) * Math.max(0, Number(i.unit_price) || 0);
    const dp = clamp(i.discount_percent, 0, 100);
    const dd = r2(gross * dp / 100);
    sub += gross; disc += dd;
    return { ...i, qty: Number(i.qty) || 0, unit_price: Number(i.unit_price) || 0, discount_percent: dp, line_total: r2(gross - dd) };
  });
  const tax = r2((sub - disc) * taxp / 100);
  const row = {
    number: d.number, customer_id: d.customer_id || null, customer_name: d.customer_name, customer_address: d.customer_address || null,
    customer_phone: d.customer_phone || null, subject: d.subject || null, issue_date: d.issue_date, [t.d2]: d.date2 || null, status: d.status,
    tax_percent: taxp, subtotal: r2(sub), discount_total: r2(disc), tax_amount: tax, total: r2(sub - disc + tax), notes: d.notes || null, terms: d.terms || null,
  };
  if (db[t.table].some((r) => r.number === row.number && r.id !== p_id)) throw new PgErr(`duplicate key value violates unique constraint "${t.table}_number_key"`, '23505', 409);
  let id = p_id;
  if (id == null) {
    id = ++seq;
    const rec = { id, ...row, verify_token: randomUUID(), created_at: new Date().toISOString() };
    if (p_type === 'invoice') { rec.quotation_id = d.quotation_id || null; rec.paid_at = d.status === 'paid' ? new Date().toISOString() : null; }
    db[t.table].push(rec);
  } else {
    const rec = db[t.table].find((r) => r.id === id);
    if (!rec) throw new PgErr('Dokumen tidak ditemukan', 'P0001');
    Object.assign(rec, row);
    if (p_type === 'invoice') rec.paid_at = d.status === 'paid' ? (rec.paid_at || new Date().toISOString()) : null;
  }
  db[t.items] = db[t.items].filter((r) => r[t.fk] !== id);
  lines.forEach((l, i) => db[t.items].push({ id: ++seq, [t.fk]: id, position: i + 1, description: l.description.trim(), details: String(l.details || '').trim() || null, qty: l.qty, unit: String(l.unit || '').trim() || null, unit_price: l.unit_price, discount_percent: l.discount_percent, line_total: l.line_total }));
  return id;
}

async function body(req) {
  const chunks = []; for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString();
  return s ? JSON.parse(s) : undefined;
}
const send = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(data === undefined ? '' : JSON.stringify(data)); };
const tokens = new Set();
const mint = () => { const t = 'tok_' + Math.random().toString(36).slice(2); tokens.add(t); return { access_token: t, refresh_token: 'ref_' + t, expires_in: 3600, user: { email: 'admin@test.com' } }; };

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname.startsWith('/auth/v1/')) {
      const op = u.pathname.slice(9);
      if (op === 'logout') return send(res, 204);
      const b = await body(req);
      if (u.searchParams.get('grant_type') === 'password') {
        if (b.email === 'admin@test.com' && b.password === 'secret') return send(res, 200, mint());
        return send(res, 400, { error_description: 'Invalid login credentials', error_code: 'invalid_credentials' });
      }
      return send(res, 200, mint());
    }
    if (u.pathname.startsWith('/rest/v1/')) {
      if (u.pathname === '/rest/v1/rpc/get_public_document') {   // publik: cukup apikey, tanpa login
        if (!req.headers.apikey) return send(res, 401, { message: 'No API key', code: 'PGRST301' });
        return send(res, 200, publicDocument(await body(req)));
      }
      const tok = (req.headers.authorization || '').replace('Bearer ', '');
      if (!req.headers.apikey || !tokens.has(tok)) return send(res, 401, { message: 'JWT invalid', code: 'PGRST301' });
      const target = u.pathname.slice(9);
      const b = await body(req);
      if (target.startsWith('rpc/')) {
        const fn = target.slice(4);
        if (fn === 'next_doc_number') return send(res, 200, nextNumber(b.p_type, b.p_date));
        if (fn === 'save_document') return send(res, 200, saveDocument(b));
        return send(res, 404, { message: 'no function' });
      }
      const rows = db[target];
      if (!rows) return send(res, 404, { message: `relation "${target}" does not exist`, code: '42P01' });
      const prefer = req.headers.prefer || '';
      if (req.method === 'GET') {
        let out = applyOrder(applyFilters(rows, u.searchParams), u.searchParams.get('order'));
        if (u.searchParams.get('limit')) out = out.slice(0, Number(u.searchParams.get('limit')));
        return send(res, 200, applySelect(out, u.searchParams.get('select')).map((r) => ({ ...r })));
      }
      if (req.method === 'POST') {
        if (target === 'settings') { Object.assign(rows[0], b); return send(res, 201); }
        const rec = { id: ++seq, ...b }; rows.push(rec);
        return prefer.includes('return=representation') ? send(res, 201, applySelect([rec], u.searchParams.get('select'))) : send(res, 201);
      }
      if (req.method === 'PATCH') { applyFilters(rows, u.searchParams).forEach((r) => Object.assign(r, b)); return send(res, 204); }
      if (req.method === 'DELETE') {
        const del = new Set(applyFilters(rows, u.searchParams));
        db[target] = rows.filter((r) => !del.has(r));
        for (const t of Object.values(T)) if (t.table === target) del.forEach((r) => { db[t.items] = db[t.items].filter((i) => i[t.fk] !== r.id); });
        return send(res, 204);
      }
    }
    // file statis
    let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    if (e instanceof PgErr) return send(res, e.status, { message: e.message, code: e.code });
    console.error(e); send(res, 500, { message: String(e) });
  }
}).listen(PORT, () => console.log(`Mock Supabase + app di http://localhost:${PORT}  (login: admin@test.com / secret)`));
