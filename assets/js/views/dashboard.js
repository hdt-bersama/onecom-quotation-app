import * as api from '../api.js';
import { esc, rupiah, tglIndo, toast } from '../util.js';

const BADGE = { pending: 'warn', approved: 'ok', rejected: 'bad', draft: 'gray', sent: 'info', paid: 'ok' };

export async function render(root) {
  root.innerHTML = '<p class="muted">Memuat...</p>';
  const [qs, ins] = await Promise.all([api.listDocs('quotation'), api.listDocs('invoice')]);
  const all = [...qs, ...ins];
  const state = { q: '', type: 'all', status: '' };

  const sum = (arr, f) => arr.filter(f).reduce((s, r) => s + Number(r.total), 0);
  const unpaid = ins.filter((r) => r.status !== 'paid');

  root.innerHTML = `
  <div class="page-head">
    <h1>Dokumen</h1>
    <div class="row">
      <a class="btn primary" href="#/new/quotation">+ Penawaran Baru</a>
      <a class="btn outline" href="#/new/invoice">+ Invoice Baru</a>
    </div>
  </div>

  <div class="stats">
    <div class="stat"><div class="lbl">Total Penawaran</div><div class="val">${qs.length}</div><div class="sub">${qs.filter((r) => r.status === 'pending').length} menunggu</div></div>
    <div class="stat"><div class="lbl">Penawaran Disetujui</div><div class="val">Rp ${rupiah(sum(qs, (r) => r.status === 'approved'))}</div></div>
    <div class="stat"><div class="lbl">Invoice Belum Lunas</div><div class="val">Rp ${rupiah(sum(unpaid, () => true))}</div><div class="sub">${unpaid.length} invoice</div></div>
    <div class="stat"><div class="lbl">Invoice Lunas</div><div class="val">Rp ${rupiah(sum(ins, (r) => r.status === 'paid'))}</div></div>
  </div>

  <div class="filters">
    <input id="fq" type="search" placeholder="Cari nomor / pelanggan / perihal...">
    <select id="ftype"><option value="all">Semua jenis</option><option value="quotation">Penawaran</option><option value="invoice">Invoice</option></select>
    <select id="fstatus"><option value="">Semua status</option>
      ${Object.entries(api.TYPES).map(([, t]) => Object.entries(t.statuses).map(([k, l]) => `<option value="${k}">${t.label} · ${l}</option>`).join('')).join('')}
    </select>
  </div>

  <div class="card table-wrap"><table class="tbl">
    <thead><tr><th>Jenis</th><th>Nomor</th><th>Tanggal</th><th>Pelanggan</th><th class="r">Total (Rp)</th><th>Status</th><th class="r">Aksi</th></tr></thead>
    <tbody id="rows"></tbody>
  </table></div>`;

  const tbody = root.querySelector('#rows');

  function draw() {
    const q = state.q.trim().toLowerCase();
    const rows = all
      .filter((r) => state.type === 'all' || r.type === state.type)
      .filter((r) => !state.status || r.status === state.status)
      .filter((r) => !q || [r.number, r.customer_name, r.subject].some((v) => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => (a.issue_date < b.issue_date ? 1 : a.issue_date > b.issue_date ? -1 : b.id - a.id));

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">${all.length ? 'Tidak ada dokumen yang cocok.' : 'Belum ada dokumen. Buat penawaran atau invoice pertama Anda.'}</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((r) => {
      const c = api.TYPES[r.type];
      return `<tr data-type="${r.type}" data-id="${r.id}">
        <td><span class="badge ${r.type === 'invoice' ? 'dark' : 'accent'}">${c.label}</span></td>
        <td class="nowrap strong">${esc(r.number)}</td>
        <td class="nowrap">${tglIndo(r.issue_date)}</td>
        <td>${esc(r.customer_name)}${r.subject ? `<div class="muted small">${esc(r.subject)}</div>` : ''}</td>
        <td class="r nowrap">${rupiah(r.total)}</td>
        <td><select class="status ${BADGE[r.status] || 'gray'}" data-act="status">
          ${Object.entries(c.statuses).map(([k, l]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${l}</option>`).join('')}
        </select></td>
        <td class="r nowrap actions">
          <a class="btn sm outline" href="#/print/${r.type}/${r.id}" title="Cetak / PDF">Cetak</a>
          <a class="btn sm outline" href="#/edit/${r.type}/${r.id}" title="Edit ulang">Edit</a>
          ${r.type === 'quotation' ? '<button class="btn sm outline ok" data-act="convert" title="Jadikan Invoice">→ Invoice</button>' : ''}
          <button class="btn sm outline bad" data-act="delete" title="Hapus">Hapus</button>
        </td></tr>`;
    }).join('');
  }
  draw();

  root.querySelector('#fq').addEventListener('input', (e) => { state.q = e.target.value; draw(); });
  root.querySelector('#ftype').addEventListener('change', (e) => { state.type = e.target.value; draw(); });
  root.querySelector('#fstatus').addEventListener('change', (e) => { state.status = e.target.value; draw(); });

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const tr = btn.closest('tr');
    const { type, id } = tr.dataset;
    const row = all.find((r) => r.type === type && String(r.id) === id);
    try {
      if (btn.dataset.act === 'delete') {
        if (!confirm(`Hapus ${api.TYPES[type].label} ${row.number}? Tindakan ini tidak dapat dibatalkan.`)) return;
        await api.deleteDoc(type, id);
        toast('Dokumen dihapus.');
        render(root);
      } else if (btn.dataset.act === 'convert') {
        if (!confirm(`Buat invoice dari penawaran ${row.number}?`)) return;
        btn.disabled = true;
        const newId = await api.quotationToInvoice(id, await api.getSettings());
        toast('Invoice (Draft) dibuat dari penawaran.');
        location.hash = `#/edit/invoice/${newId}`;
      }
    } catch (err) {
      toast(err.message, 'err');
      btn.disabled = false;
    }
  });

  tbody.addEventListener('change', async (e) => {
    const sel = e.target.closest('select[data-act="status"]');
    if (!sel) return;
    const tr = sel.closest('tr');
    const { type, id } = tr.dataset;
    const row = all.find((r) => r.type === type && String(r.id) === id);
    try {
      await api.setStatus(type, id, sel.value);
      row.status = sel.value;
      sel.className = 'status ' + (BADGE[sel.value] || 'gray');
      toast('Status diperbarui.');
    } catch (err) {
      sel.value = row.status;
      toast(err.message, 'err');
    }
  });
}
