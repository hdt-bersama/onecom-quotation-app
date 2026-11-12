// Lapisan data: semua akses ke tabel Supabase lewat sini.
import { rest, rpc, publicRpc } from './supabase.js';
import { addDays, today } from './util.js';

export const TYPES = {
  quotation: {
    table: 'quotations', items: 'quotation_items', fk: 'quotation_id', date2: 'valid_until',
    date2Label: 'Berlaku s/d', label: 'Penawaran', title: 'PENAWARAN HARGA', prefixKey: 'quotation_prefix',
    statuses: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }, default: 'pending',
  },
  invoice: {
    table: 'invoices', items: 'invoice_items', fk: 'invoice_id', date2: 'due_date',
    date2Label: 'Jatuh Tempo', label: 'Invoice', title: 'INVOICE', prefixKey: 'invoice_prefix',
    statuses: { draft: 'Draft', sent: 'Sent', paid: 'Paid' }, default: 'draft',
  },
};
export const isType = (t) => Object.prototype.hasOwnProperty.call(TYPES, t);

/* ---------- Pengaturan ---------- */
const DEFAULT_SETTINGS = {
  company_name: 'Nama Perusahaan Anda', address: '', phone: '', email: '', city: 'Jakarta', logo_data: null,
  bank_name: '', bank_account_no: '', bank_account_holder: '', signer_name: '', terms: '',
  quotation_prefix: 'QT', invoice_prefix: 'INV', default_tax_percent: 0, default_valid_days: 14,
};

export async function getSettings() {
  const rows = await rest('GET', 'settings?id=eq.1&select=*');
  return { ...DEFAULT_SETTINGS, ...(rows && rows[0] ? rows[0] : {}) };
}

export async function saveSettings(s) {
  const row = { ...s, id: 1, updated_at: new Date().toISOString() };
  await rest('POST', 'settings?on_conflict=id', { body: row, prefer: 'resolution=merge-duplicates,return=minimal' });
}

/* ---------- Pelanggan ---------- */
export const listCustomers = () => rest('GET', 'customers?select=id,name,address,phone&order=name.asc&limit=1000');

/** Simpan/perbarui pelanggan dari form dokumen; kembalikan id-nya. */
export async function syncCustomer({ id, name, address, phone }, known) {
  const body = { name, address: address || null, phone: phone || null };
  let target = id ? known.find((c) => c.id === id) : null;
  if (!target) target = known.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (target) {
    await rest('PATCH', `customers?id=eq.${target.id}`, { body, prefer: 'return=minimal' });
    return target.id;
  }
  const rows = await rest('POST', 'customers?select=id', { body, prefer: 'return=representation' });
  return rows[0].id;
}

/* ---------- Dokumen ---------- */
export async function listDocs(type) {
  const c = TYPES[type];
  const rows = await rest('GET',
    `${c.table}?select=id,number,customer_name,subject,issue_date,date2:${c.date2},status,total&order=issue_date.desc,id.desc&limit=1000`);
  return rows.map((r) => ({ ...r, type }));
}

export async function getDoc(type, id) {
  const c = TYPES[type];
  const rows = await rest('GET', `${c.table}?id=eq.${encodeURIComponent(id)}&select=*,date2:${c.date2}`);
  if (!rows || !rows[0]) return null;
  const items = await rest('GET',
    `${c.items}?${c.fk}=eq.${encodeURIComponent(id)}&select=description,details,qty,unit,unit_price,discount_percent,line_total&order=position.asc,id.asc`);
  return { ...rows[0], type, items };
}

export const nextNumber = (type, date) => rpc('next_doc_number', { p_type: type, p_date: date || today() });

/** Simpan (insert jika id null). Server menghitung ulang total & menyimpan header+item dalam 1 transaksi. */
export const saveDoc = (type, id, doc, items) =>
  rpc('save_document', { p_type: type, p_id: id ? Number(id) : null, p_doc: doc, p_items: items });

export const deleteDoc = (type, id) =>
  rest('DELETE', `${TYPES[type].table}?id=eq.${encodeURIComponent(id)}`, { prefer: 'return=minimal' });

export function setStatus(type, id, status) {
  const body = { status, updated_at: new Date().toISOString() };
  if (type === 'invoice') body.paid_at = status === 'paid' ? new Date().toISOString() : null;
  return rest('PATCH', `${TYPES[type].table}?id=eq.${encodeURIComponent(id)}`, { body, prefer: 'return=minimal' });
}

/** Buat invoice (Draft) dari penawaran. */
export async function quotationToInvoice(qid, settings) {
  const q = await getDoc('quotation', qid);
  if (!q) throw new Error('Penawaran tidak ditemukan');
  const date = today();
  const number = await nextNumber('invoice', date);
  return saveDoc('invoice', null, {
    number, quotation_id: q.id, customer_id: q.customer_id, customer_name: q.customer_name,
    customer_address: q.customer_address, customer_phone: q.customer_phone, subject: q.subject,
    issue_date: date, date2: addDays(date, Number(settings.default_valid_days) || 14), status: 'draft',
    tax_percent: q.tax_percent, notes: q.notes, terms: q.terms,
  }, q.items);
}

/** Ambil satu dokumen untuk halaman verifikasi QR (tanpa login). null bila kode tidak dikenal. */
export async function getPublicDoc(type, token, override) {
  const r = await publicRpc('get_public_document', { p_type: type, p_token: token }, override);
  if (!r) return null;
  return {
    doc: { ...r.doc, type, items: r.items || [] },
    settings: { ...DEFAULT_SETTINGS, ...(r.settings || {}) },
  };
}
