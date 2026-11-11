// Router berbasis hash (#/dashboard, #/new/quotation, #/edit/invoice/3, #/print/quotation/3, #/settings)
import { isLoggedIn, currentUser, signOut } from './supabase.js';
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

function drawNav(route) {
  if (!isLoggedIn()) { nav.hidden = true; return; }
  nav.hidden = false;
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
        <button class="btn sm ghost" id="logout">Keluar</button></div>
    </div>`;
  nav.querySelector('#logout').addEventListener('click', async () => { await signOut(); });
}

let token = 0;
async function route() {
  const my = ++token;
  const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
  const [name, a, b] = parts;
  document.title = APP_TITLE;

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

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
