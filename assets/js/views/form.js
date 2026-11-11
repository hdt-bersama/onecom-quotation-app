import * as api from '../api.js';
import { TYPES } from '../api.js';
import { esc, num, rupiah, calc, today, addDays, toast } from '../util.js';

const rowHtml = (it = {}) => `
  <tr class="item">
    <td>
      <input data-f="description" placeholder="Nama barang / jasa" value="${esc(it.description)}">
      <textarea data-f="details" rows="2" placeholder="Spesifikasi (satu baris per spek, opsional)">${esc(it.details)}</textarea>
    </td>
    <td><input data-f="qty" type="number" min="0" step="any" inputmode="decimal" value="${it.qty ?? 1}"></td>
    <td><input data-f="unit" placeholder="unit" value="${esc(it.unit)}"></td>
    <td><input data-f="unit_price" type="number" min="0" step="any" inputmode="decimal" value="${it.unit_price ?? 0}"></td>
    <td><input data-f="discount_percent" type="number" min="0" max="100" step="any" inputmode="decimal" value="${it.discount_percent ?? 0}"></td>
    <td class="r strong line-total">0</td>
    <td><button type="button" class="btn sm outline bad" data-act="rm" title="Hapus baris">✕</button></td>
  </tr>`;

export async function render(root, { type, id }) {
  root.innerHTML = '<p class="muted">Memuat...</p>';
  const [settings, customers] = await Promise.all([api.getSettings(), api.listCustomers()]);
  const isNew = !id;
  const numbers = {};
  let doc;

  if (isNew) {
    const date = today();
    [numbers.quotation, numbers.invoice] = await Promise.all([api.nextNumber('quotation', date), api.nextNumber('invoice', date)]);
    doc = {
      number: numbers[type], customer_id: null, customer_name: '', customer_address: '', customer_phone: '',
      subject: '', issue_date: date, date2: addDays(date, Number(settings.default_valid_days) || 14),
      status: TYPES[type].default, tax_percent: settings.default_tax_percent, notes: '', terms: settings.terms || '', items: [],
    };
  } else {
    doc = await api.getDoc(type, id);
    if (!doc) {
      root.innerHTML = '<div class="card pad center"><h2>Dokumen tidak ditemukan</h2><a class="btn primary" href="#/dashboard">Kembali</a></div>';
      return;
    }
  }

  let customerId = doc.customer_id || null;
  const items0 = doc.items.length ? doc.items : [{}];

  root.innerHTML = `
  <form id="f" autocomplete="off">
    <div class="page-head">
      <h1 id="ttl"></h1>
      ${isNew ? `<div class="seg">
        <button type="button" data-type="quotation">Penawaran</button>
        <button type="button" data-type="invoice">Invoice</button></div>` : ''}
    </div>
    <div id="err" class="alert err" hidden></div>

    <div class="grid2">
      <div class="col">
        <div class="card pad">
          <h2 class="sec">Pelanggan</h2>
          <div class="fields">
            <label class="w60">Nama pelanggan / perusahaan *
              <input name="customer_name" list="custs" value="${esc(doc.customer_name)}" required></label>
            <label class="w40">Telepon<input name="customer_phone" value="${esc(doc.customer_phone)}"></label>
            <label class="w100">Alamat<textarea name="customer_address" rows="2">${esc(doc.customer_address)}</textarea></label>
            <label class="w100">Perihal<input name="subject" value="${esc(doc.subject)}" placeholder="mis. Penawaran Harga Laptop"></label>
          </div>
          <datalist id="custs">${customers.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
        </div>

        <div class="card pad">
          <div class="sec-row"><h2 class="sec">Item Produk / Jasa</h2>
            <button type="button" class="btn sm outline" id="add">+ Tambah baris</button></div>
          <div class="table-wrap"><table class="tbl items-tbl">
            <thead><tr><th style="min-width:230px">Deskripsi &amp; spesifikasi</th><th style="width:78px">Qty</th><th style="width:78px">Satuan</th>
              <th style="width:130px">Harga satuan</th><th style="width:84px">Diskon %</th><th class="r" style="width:120px">Total</th><th style="width:44px"></th></tr></thead>
            <tbody id="items">${items0.map(rowHtml).join('')}</tbody>
          </table></div>
        </div>

        <div class="card pad">
          <div class="fields">
            <label class="w100">Catatan<textarea name="notes" rows="2" placeholder="mis. Barang ready, harga dapat berubah sewaktu-waktu">${esc(doc.notes)}</textarea></label>
            <label class="w100">Syarat &amp; Ketentuan <span class="muted small">(satu poin per baris)</span>
              <textarea name="terms" rows="4">${esc(doc.terms)}</textarea></label>
          </div>
        </div>
      </div>

      <div class="col side">
        <div class="card pad">
          <div class="fields">
            <label class="w100">Nomor dokumen<input name="number" value="${esc(doc.number)}" required></label>
            <label class="w100">Tanggal<input type="date" name="issue_date" value="${esc(doc.issue_date)}" required></label>
            <label class="w100"><span id="d2lbl"></span><input type="date" name="date2" value="${esc(doc.date2 || '')}"></label>
            <label class="w100">Status<select name="status" id="status"></select></label>
          </div>
        </div>

        <div class="card pad totals">
          <div class="trow"><span>Subtotal</span><span id="t-sub">0</span></div>
          <div class="trow bad-txt"><span>Diskon</span><span id="t-disc">- 0</span></div>
          <div class="trow"><span>PPN (%)</span><input type="number" name="tax_percent" min="0" max="100" step="any" value="${num(doc.tax_percent)}" class="tax-in"></div>
          <div class="trow"><span>Nilai PPN</span><span id="t-tax">0</span></div>
          <div class="trow grand"><span>Total</span><span>Rp <span id="t-total">0</span></span></div>
        </div>

        <div class="stack">
          <button class="btn primary lg" id="save" name="after" value="list"></button>
          <button class="btn outline" name="after" value="print">Simpan &amp; Cetak</button>
          <a class="btn link" href="#/dashboard">Batal</a>
        </div>
      </div>
    </div>
  </form>`;

  const $ = (s) => root.querySelector(s);
  const form = $('#f');
  const tbody = $('#items');
  let curType = type;

  /* ---- label, status & tombol sesuai jenis dokumen ---- */
  function applyType() {
    const c = TYPES[curType];
    $('#ttl').textContent = isNew ? 'Dokumen Baru' : `Edit Ulang ${c.label}`;
    $('#d2lbl').textContent = c.date2Label;
    const sel = $('#status');
    const keep = sel.value && c.statuses[sel.value] ? sel.value : (isNew ? c.default : doc.status);
    sel.innerHTML = Object.entries(c.statuses).map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
    sel.value = c.statuses[keep] ? keep : c.default;
    $('#save').textContent = isNew ? `Simpan sebagai ${c.label}` : 'Simpan Perubahan';
    root.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.type === curType));
  }

  const readItems = () => [...tbody.querySelectorAll('tr.item')].map((tr) => {
    const o = {};
    tr.querySelectorAll('[data-f]').forEach((i) => { o[i.dataset.f] = i.value; });
    return o;
  });

  function recalc() {
    const items = readItems();
    const r = calc(items, form.tax_percent.value);
    tbody.querySelectorAll('tr.item').forEach((tr, i) => { tr.querySelector('.line-total').textContent = rupiah(r.lines[i]); });
    $('#t-sub').textContent = rupiah(r.subtotal);
    $('#t-disc').textContent = '- ' + rupiah(r.discount);
    $('#t-tax').textContent = rupiah(r.tax);
    $('#t-total').textContent = rupiah(r.total);
  }

  applyType();
  form.status.value = doc.status in TYPES[curType].statuses ? doc.status : TYPES[curType].default;
  recalc();

  /* ---- interaksi ---- */
  form.addEventListener('input', (e) => {
    if (e.target.matches('[data-f], [name="tax_percent"]')) recalc();
    if (e.target.name === 'customer_name') {
      const c = customers.find((x) => x.name.trim().toLowerCase() === e.target.value.trim().toLowerCase());
      if (c) {
        customerId = c.id;
        form.customer_address.value = c.address || '';
        form.customer_phone.value = c.phone || '';
      } else {
        customerId = null;
      }
    }
  });

  $('#add').addEventListener('click', () => {
    tbody.insertAdjacentHTML('beforeend', rowHtml());
    recalc();
    tbody.lastElementChild.querySelector('[data-f="description"]').focus();
  });

  tbody.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act="rm"]');
    if (!b) return;
    if (tbody.children.length > 1) b.closest('tr').remove();
    else tbody.innerHTML = rowHtml();
    recalc();
  });

  root.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.type === curType) return;
    if (form.number.value === numbers[curType]) form.number.value = numbers[b.dataset.type];
    curType = b.dataset.type;
    applyType();
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#err');
    const fail = (m) => { err.textContent = m; err.hidden = false; err.scrollIntoView({ block: 'center' }); };
    err.hidden = true;

    const after = e.submitter?.value || 'list';
    const items = readItems().filter((i) => i.description.trim() !== '');
    if (!form.customer_name.value.trim()) return fail('Nama pelanggan wajib diisi.');
    if (!items.length) return fail('Minimal harus ada satu baris item dengan deskripsi.');
    if (!form.number.value.trim()) return fail('Nomor dokumen wajib diisi.');

    const buttons = form.querySelectorAll('button');
    buttons.forEach((b) => { b.disabled = true; });
    try {
      const cid = await api.syncCustomer({
        id: customerId, name: form.customer_name.value.trim(),
        address: form.customer_address.value.trim(), phone: form.customer_phone.value.trim(),
      }, customers);

      const payload = {
        number: form.number.value.trim(), customer_id: cid, customer_name: form.customer_name.value.trim(),
        customer_address: form.customer_address.value.trim(), customer_phone: form.customer_phone.value.trim(),
        subject: form.subject.value.trim(), issue_date: form.issue_date.value, date2: form.date2.value || null,
        status: form.status.value, tax_percent: num(form.tax_percent.value),
        notes: form.notes.value.trim(), terms: form.terms.value.trim(),
      };
      const newId = await api.saveDoc(curType, isNew ? null : id, payload, items);
      toast(`${TYPES[curType].label} ${payload.number} berhasil disimpan.`);
      location.hash = after === 'print' ? `#/print/${curType}/${newId}` : '#/dashboard';
    } catch (ex) {
      fail(ex.code === '23505' ? `Nomor dokumen "${form.number.value}" sudah dipakai. Gunakan nomor lain.` : ex.message);
      buttons.forEach((b) => { b.disabled = false; });
    }
  });
}
