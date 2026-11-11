import * as api from '../api.js';
import { esc, nl2br, rupiah, qtyFmt, tglIndo, terbilang, num } from '../util.js';

export async function render(root, { type, id }) {
  root.innerHTML = '<p class="muted">Memuat...</p>';
  const [doc, s] = await Promise.all([api.getDoc(type, id), api.getSettings()]);
  if (!doc) {
    root.innerHTML = '<div class="card pad center"><h2>Dokumen tidak ditemukan</h2><a class="btn primary" href="#/dashboard">Kembali</a></div>';
    return;
  }

  const c = api.TYPES[type];
  const isInv = type === 'invoice';
  const showDisc = doc.items.some((i) => num(i.discount_percent) > 0);
  const terms = String(doc.terms || '').split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
  const hasBank = s.bank_name || s.bank_account_no || s.bank_account_holder;
  const signer = s.signer_name || s.company_name;
  const total = num(doc.total);
  const contact = [s.phone ? 'Telp. ' + s.phone : '', s.email].filter(Boolean).join('  |  ');

  document.title = `${c.label} ${String(doc.number).replace(/\//g, '-')}`;

  root.innerHTML = `
  <div class="toolbar no-print">
    <a href="#/dashboard">&larr; Dashboard</a>
    <a href="#/edit/${type}/${id}">Edit</a>
    <button class="btn primary sm" id="prn">Cetak / Simpan PDF</button>
    <span class="hint">Di dialog cetak pilih A4 dan matikan "Headers and footers".</span>
  </div>

  <div class="sheet">
    <header class="kop">
      ${s.logo_data ? `<img class="logo" src="${s.logo_data}" alt="">` : ''}
      <div class="kop-text">
        <div class="company">${esc(s.company_name)}</div>
        ${s.address ? `<div>${nl2br(s.address)}</div>` : ''}
        ${contact ? `<div>${esc(contact)}</div>` : ''}
      </div>
    </header>

    <h1 class="doc-title">${c.title}</h1>

    <section class="info">
      <div class="to">
        <div class="lbl">Kepada Yth.</div>
        <div class="to-name">${esc(doc.customer_name)}</div>
        ${doc.customer_address ? `<div>${nl2br(doc.customer_address)}</div>` : ''}
        ${doc.customer_phone ? `<div>Telp. ${esc(doc.customer_phone)}</div>` : ''}
      </div>
      <table class="meta">
        <tr><td>Nomor</td><td>:</td><td><b>${esc(doc.number)}</b></td></tr>
        <tr><td>Tanggal</td><td>:</td><td>${tglIndo(doc.issue_date)}</td></tr>
        ${doc.date2 ? `<tr><td>${c.date2Label}</td><td>:</td><td>${tglIndo(doc.date2)}</td></tr>` : ''}
        ${isInv && doc.status === 'paid' ? '<tr><td>Status</td><td>:</td><td><b>LUNAS</b></td></tr>' : ''}
      </table>
    </section>

    ${doc.subject ? `<p class="subject"><b>Perihal :</b> ${esc(doc.subject)}</p>` : ''}
    <p class="intro">Dengan hormat,<br>${isInv ? 'Berikut kami sampaikan rincian tagihan atas pesanan Anda:' : 'Berikut kami sampaikan penawaran harga dengan rincian sebagai berikut:'}</p>

    <table class="items">
      <thead><tr>
        <th class="c" style="width:7%">No</th><th>Deskripsi</th><th class="c" style="width:11%">Qty</th>
        <th class="r" style="width:16%">Harga (Rp)</th>${showDisc ? '<th class="c" style="width:9%">Disc</th>' : ''}
        <th class="r" style="width:17%">Total (Rp)</th></tr></thead>
      <tbody>
      ${doc.items.map((it, n) => `<tr>
        <td class="c">${n + 1}</td>
        <td><div class="it-name">${esc(it.description)}</div>${it.details ? `<div class="it-spec">${nl2br(it.details)}</div>` : ''}</td>
        <td class="c">${qtyFmt(it.qty)}${it.unit ? ' ' + esc(it.unit) : ''}</td>
        <td class="r">${rupiah(it.unit_price)}</td>
        ${showDisc ? `<td class="c">${num(it.discount_percent) > 0 ? qtyFmt(it.discount_percent) + '%' : '-'}</td>` : ''}
        <td class="r">${rupiah(it.line_total)}</td></tr>`).join('')}
      </tbody>
    </table>

    <div class="summary">
      <div class="terbilang"><div class="lbl">Terbilang</div><em>${esc((t => t.charAt(0).toUpperCase() + t.slice(1))(terbilang(total)))} rupiah</em></div>
      <table class="totals">
        ${num(doc.discount_total) > 0 || num(doc.tax_amount) > 0 ? `<tr><td>Subtotal</td><td class="r">${rupiah(doc.subtotal)}</td></tr>` : ''}
        ${num(doc.discount_total) > 0 ? `<tr><td>Diskon</td><td class="r">- ${rupiah(doc.discount_total)}</td></tr>` : ''}
        ${num(doc.tax_amount) > 0 ? `<tr><td>PPN ${qtyFmt(doc.tax_percent)}%</td><td class="r">${rupiah(doc.tax_amount)}</td></tr>` : ''}
        <tr class="grand"><td>TOTAL</td><td class="r">Rp ${rupiah(total)}</td></tr>
      </table>
    </div>

    <div class="closing">
      ${doc.notes ? `<div class="block"><div class="lbl">Catatan</div><div>${nl2br(doc.notes)}</div></div>` : ''}
      <div class="two">
        ${hasBank ? `<div class="block"><div class="lbl">Pembayaran via transfer</div>
          <div>${esc(s.bank_name)}</div><div class="rek">${esc(s.bank_account_no)}</div>
          <div>${s.bank_account_holder ? 'a.n. ' + esc(s.bank_account_holder) : ''}</div></div>` : ''}
        ${terms.length ? `<div class="block"><div class="lbl">Syarat &amp; Ketentuan</div>
          <ol class="terms">${terms.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></div>` : ''}
      </div>
      <p class="thanks">Demikian ${isInv ? 'invoice' : 'surat penawaran'} ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>
      <div class="sign">
        <div class="sign-box"><div>${isInv ? 'Diterima oleh,' : 'Disetujui oleh,'}</div><div class="sign-space"></div>
          <div class="sign-name">( ${esc(doc.customer_name)} )</div></div>
        <div class="sign-box"><div>${esc(s.city)}, ${tglIndo(doc.issue_date)}<br>Hormat kami,</div><div class="sign-space"></div>
          <div class="sign-name">( ${esc(signer)} )</div></div>
      </div>
    </div>
  </div>`;

  root.querySelector('#prn').addEventListener('click', () => window.print());
}
