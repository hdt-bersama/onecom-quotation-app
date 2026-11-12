import * as api from '../api.js';
import { sheetHtml, verifyUrl } from '../sheet.js';
import { CONFIG } from '../config.js';

export async function render(root, { type, id }) {
  root.innerHTML = '<p class="muted">Memuat...</p>';
  const [doc, s] = await Promise.all([api.getDoc(type, id), api.getSettings()]);
  if (!doc) {
    root.innerHTML = '<div class="card pad center"><h2>Dokumen tidak ditemukan</h2><a class="btn primary" href="#/dashboard">Kembali</a></div>';
    return;
  }
  document.title = `${api.TYPES[type].label} ${String(doc.number).replace(/\//g, '-')}`;
  const qrUrl = doc.verify_token ? verifyUrl(type, doc.verify_token) : '';

  // QR tanpa alamat server hanya bisa dibuka di perangkat yang sudah terhubung, kecuali alamat tertanam di config.js
  const qrWarn = qrUrl && !qrUrl.includes('?u=') && !(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

  root.innerHTML = `
  <div class="toolbar no-print">
    <a href="#/dashboard">&larr; Dashboard</a>
    <a href="#/edit/${type}/${id}">Edit</a>
    <button class="btn primary sm" id="prn">Cetak / Simpan PDF</button>
    <span class="hint">Di dialog cetak pilih A4 dan matikan "Headers and footers".</span>
  </div>
  ${qrWarn ? `<div class="alert err no-print">Kunci Supabase Anda terlalu panjang untuk dimuat di QR, jadi QR ini baru bisa dibuka di perangkat yang sudah terhubung. Pakai kunci <b>publishable</b> (lebih pendek) atau tanamkan alamat Supabase lewat GitHub Secrets (lihat PANDUAN-SETUP).</div>` : ''}
  ${sheetHtml({ doc, s, type, qrUrl })}`;

  root.querySelector('#prn').addEventListener('click', () => window.print());
}
