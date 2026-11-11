import * as api from '../api.js';
import { esc, num, toast } from '../util.js';

/** Perkecil gambar logo (maks 480px) lalu kembalikan sebagai data URL. */
function shrinkImage(file, max = 480) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error('Logo harus berupa gambar PNG, JPG, atau WebP.'));
    if (file.size > 5 * 1024 * 1024) return reject(new Error('Ukuran file logo maksimal 5 MB.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(file.type === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('File gambar tidak dapat dibaca.')); };
    img.src = url;
  });
}

export async function render(root) {
  root.innerHTML = '<p class="muted">Memuat...</p>';
  const s = await api.getSettings();
  let logo = s.logo_data || null;

  root.innerHTML = `
  <div class="page-head"><h1>Pengaturan Perusahaan</h1></div>
  <form id="f" class="grid2 settings">
    <div class="col">
      <div class="card pad">
        <h2 class="sec">Kop Surat</h2>
        <div class="fields">
          <label class="w100">Nama perusahaan / toko<input name="company_name" value="${esc(s.company_name)}" required></label>
          <label class="w100">Alamat<textarea name="address" rows="2">${esc(s.address)}</textarea></label>
          <label class="w50">Nomor telepon<input name="phone" value="${esc(s.phone)}"></label>
          <label class="w50">Email<input type="email" name="email" value="${esc(s.email)}"></label>
          <label class="w50">Kota (untuk "Jakarta, 06 November 2026")<input name="city" value="${esc(s.city)}"></label>
          <label class="w50">Nama penandatangan<input name="signer_name" value="${esc(s.signer_name)}"></label>
        </div>
        <hr>
        <label>Logo (PNG / JPG / WebP)
          <input type="file" id="logoFile" accept="image/png,image/jpeg,image/webp"></label>
        <div id="logoBox" class="logo-box"></div>
      </div>
      <div class="card pad">
        <h2 class="sec">Syarat &amp; Ketentuan Standar</h2>
        <textarea name="terms" rows="5">${esc(s.terms)}</textarea>
        <p class="muted small">Satu poin per baris. Menjadi isi awal pada dokumen baru dan masih bisa diubah per dokumen.</p>
      </div>
    </div>
    <div class="col side">
      <div class="card pad">
        <h2 class="sec">Rekening Bank Transfer</h2>
        <div class="fields">
          <label class="w100">Nama bank<input name="bank_name" value="${esc(s.bank_name)}"></label>
          <label class="w100">Nomor rekening<input name="bank_account_no" value="${esc(s.bank_account_no)}"></label>
          <label class="w100">Atas nama<input name="bank_account_holder" value="${esc(s.bank_account_holder)}"></label>
        </div>
      </div>
      <div class="card pad">
        <h2 class="sec">Penomoran &amp; Default</h2>
        <div class="fields">
          <label class="w50">Prefix penawaran<input name="quotation_prefix" value="${esc(s.quotation_prefix)}"></label>
          <label class="w50">Prefix invoice<input name="invoice_prefix" value="${esc(s.invoice_prefix)}"></label>
          <label class="w50">PPN default (%)<input type="number" step="any" min="0" max="100" name="default_tax_percent" value="${num(s.default_tax_percent)}"></label>
          <label class="w50">Masa berlaku / jatuh tempo (hari)<input type="number" min="0" name="default_valid_days" value="${num(s.default_valid_days)}"></label>
        </div>
      </div>
      <button class="btn primary lg block" id="save">Simpan Pengaturan</button>
    </div>
  </form>`;

  const form = root.querySelector('#f');
  const box = root.querySelector('#logoBox');
  const drawLogo = () => {
    box.innerHTML = logo
      ? `<img src="${logo}" alt="Logo"><button type="button" class="btn sm outline bad" id="rmLogo">Hapus logo</button>`
      : '<span class="muted small">Belum ada logo.</span>';
    box.querySelector('#rmLogo')?.addEventListener('click', () => { logo = null; drawLogo(); });
  };
  drawLogo();

  root.querySelector('#logoFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { logo = await shrinkImage(f); drawLogo(); } catch (err) { toast(err.message, 'err'); e.target.value = ''; }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (n) => form[n].value.trim();
    const clean = (n, def) => v(n).replace(/[^A-Za-z0-9-]/g, '') || def;
    const btn = root.querySelector('#save');
    btn.disabled = true;
    try {
      await api.saveSettings({
        company_name: v('company_name') || 'Nama Perusahaan Anda', address: v('address'), phone: v('phone'),
        email: v('email'), city: v('city') || 'Jakarta', logo_data: logo, bank_name: v('bank_name'),
        bank_account_no: v('bank_account_no'), bank_account_holder: v('bank_account_holder'),
        signer_name: v('signer_name'), terms: v('terms'),
        quotation_prefix: clean('quotation_prefix', 'QT'), invoice_prefix: clean('invoice_prefix', 'INV'),
        default_tax_percent: Math.min(100, Math.max(0, num(form.default_tax_percent.value))),
        default_valid_days: Math.max(0, Math.round(num(form.default_valid_days.value))),
      });
      toast('Pengaturan disimpan.');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      btn.disabled = false;
    }
  });
}
