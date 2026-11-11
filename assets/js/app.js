// Router berbasis hash (#/dashboard, #/new/quotation, #/edit/invoice/3, #/print/quotation/3, #/settings)
import { isLoggedIn, currentUser, signOut, saveCfg } from './supabase.js';
import { canInstall, promptInstall, onInstallChange, requestPersist } from './pwa.js';
import { isType } from './api.js';
import { esc, toast } from './util.js';

const view = document.getElementById('view');
const nav = document.getElementById('nav');
const APP_TITLE = 'Penawaran & Invoice';

const loaders = {
  login: () => import('./views/login.js'),
  dashboard: () => import('./views/dashboard.js'),
  form: () => import('./views/form.js'),
  settings: () => import('./views/settings.js'),
  print: () => import('./views/print.js'),
};

let lastKey = 'dashboard';
function drawNav(route) {
  lastKey = route;
  if (!isLoggedIn()) { nav.hidden = true; return; }
  nav.hidden = false;
  const ic = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    dashboard: ic('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    'new-quotation': ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9 14h6"/>'),
    'new-invoice': ic('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8h5M9.5 12h5"/><path d="M9.5 16h2"/>'),
    settings: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  };
  const tab = (href, label, key) => `<a href="${href}" class="${route === key ? 'on' : ''}" aria-label="${label}" title="${label}">${ICONS[key]}</a>`;
  const link = (href, label, key) => `<a href="${href}" class="${route === key ? 'on' : ''}">${label}</a>`;
  nav.innerHTML = `
    <div class="nav-in">
      <a class="brand" href="#/dashboard">Penawaran &amp; Invoice</a>
      <nav>
        ${link('#/dashboard', 'Dashboard', 'dashboard')}
        ${link('#/new/quotation', '+ Penawaran', 'new-quotation')}
        ${link('#/new/invoice', '+ Invoice', 'new-invoice')}
        ${link('#/settings', 'Pengaturan', 'settings')}
      </nav>
      <div class="who"><span class="muted small">${esc(currentUser())}</span>
        ${canInstall() ? '<button class="btn sm ghost" id="install">Pasang aplikasi</button>' : ''}
        <button class="btn sm ghost" id="logout">Keluar</button></div>
    </div>
    <nav class="tabbar" aria-label="Menu utama">
      ${tab('#/dashboard', 'Dashboard', 'dashboard')}
      ${tab('#/new/quotation', 'Penawaran baru', 'new-quotation')}
      ${tab('#/new/invoice', 'Invoice baru', 'new-invoice')}
      ${tab('#/settings', 'Pengaturan', 'settings')}
    </nav>`;
  nav.querySelector('#logout').addEventListener('click', async () => { await signOut(); });
  nav.querySelector('#install')?.addEventListener('click', () => promptInstall());
}
onInstallChange(() => { if (isLoggedIn()) drawNav(lastKey); });

let token = 0;
async function route() {
  const my = ++token;
  const raw = location.hash.replace(/^#\/?/, '');
  const [pathPart, qs = ''] = raw.split('?');
  const [name, a, b] = (pathPart || 'dashboard').split('/');
  document.title = APP_TITLE;

  // Tautan setup: #/setup?u=<url>&k=<anon key>  -> simpan koneksi di perangkat ini
  // #/setup (tanpa parameter)                     -> layar ubah koneksi
  if (name === 'setup') {
    const q = new URLSearchParams(qs);
    const u = (q.get('u') || '').trim();
    const k = (q.get('k') || '').trim();
    if (u || k) {
      if (/^https:\/\/[^\s/]+/.test(u) && k) { saveCfg(u, k); toast('Koneksi tersimpan di perangkat ini.'); }
      else toast('Tautan setup tidak valid.', 'err');
      location.replace(location.pathname + location.search + '#/dashboard');
      return;
    }
    drawNav('setup');
    const m = await loaders.login();
    if (my !== token) return;
    m.render(view, { forceCfg: true, onDone: () => { location.hash = '#/dashboard'; route(); } });
    return;
  }

  if (!isLoggedIn()) {
    drawNav('login');
    const m = await loaders.login();
    if (my !== token) return;
    m.render(view, { onDone: () => { location.hash = '#/dashboard'; route(); } });
    return;
  }

  let key = name;
  let mod;
  let args = {};
  try {
    if (name === 'dashboard') mod = await loaders.dashboard();
    else if (name === 'settings') mod = await loaders.settings();
    else if (name === 'new' && isType(a)) { key = 'new-' + a; mod = await loaders.form(); args = { type: a, id: null }; }
    else if (name === 'edit' && isType(a) && b) { key = 'edit'; mod = await loaders.form(); args = { type: a, id: b }; }
    else if (name === 'print' && isType(a) && b) { key = 'print'; mod = await loaders.print(); args = { type: a, id: b }; }
    else { location.replace('#/dashboard'); return; }

    drawNav(key);
    requestPersist();
    if (my !== token) return;
    await mod.render(view, args);
  } catch (err) {
    if (my !== token) return;
    if (err.status === 401) return;           // auth-lost akan menangani
    view.innerHTML = `<div class="card pad center"><h2>Terjadi kesalahan</h2>
      <p class="muted">${esc(err.message)}</p>
      <p class="small muted">Pastikan skema SQL sudah dijalankan di Supabase dan koneksi benar.</p>
      <button class="btn primary" onclick="location.reload()">Muat ulang</button></div>`;
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
window.addEventListener('auth-lost', () => { location.hash = '#/login'; route(); });
route().catch((e) => { view.textContent = e.message; toast(e.message, 'err'); });

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
