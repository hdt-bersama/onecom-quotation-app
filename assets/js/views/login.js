import { signIn, getCfg, hasCfg, saveCfg } from '../supabase.js';
import { esc } from '../util.js';

export function render(root, { onDone }) {
  const showCfg = !hasCfg();
  const cfg = getCfg();
  root.innerHTML = `
  <div class="login-wrap">
    <div class="card login-card">
      <h1>Penawaran &amp; Invoice</h1>
      <p class="muted small">${showCfg ? 'Hubungkan ke project Supabase Anda (sekali saja).' : 'Masuk untuk melanjutkan'}</p>
      <div id="msg" class="alert err" hidden></div>

      <form id="cfgForm" ${showCfg ? '' : 'hidden'}>
        <label>Project URL<input name="url" placeholder="https://xxxx.supabase.co" value="${esc(cfg.url)}" required></label>
        <label>Anon / Publishable key<input name="key" placeholder="eyJ... atau sb_publishable_..." value="${esc(cfg.key)}" required></label>
        <button class="btn primary block">Simpan koneksi</button>
        <p class="muted small">Jangan pernah memasukkan <b>service_role</b> key.</p>
      </form>

      <form id="loginForm" ${showCfg ? 'hidden' : ''}>
        <label>Email<input type="email" name="email" autocomplete="username" required></label>
        <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
        <button class="btn primary block" id="loginBtn">Masuk</button>
        <p class="center"><a href="#" id="chgCfg" class="small">Ubah koneksi Supabase</a></p>
      </form>
    </div>
  </div>`;

  const msg = root.querySelector('#msg');
  const show = (t) => { msg.textContent = t; msg.hidden = !t; };
  const cfgForm = root.querySelector('#cfgForm');
  const loginForm = root.querySelector('#loginForm');

  cfgForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(cfgForm);
    const url = String(f.get('url')).trim();
    if (!/^https:\/\/.+/.test(url)) return show('URL harus diawali https://');
    saveCfg(url, String(f.get('key')));
    show('');
    cfgForm.hidden = true;
    loginForm.hidden = false;
  });

  root.querySelector('#chgCfg').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.hidden = true;
    cfgForm.hidden = false;
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(loginForm);
    const btn = root.querySelector('#loginBtn');
    btn.disabled = true;
    btn.textContent = 'Memproses...';
    show('');
    try {
      await signIn(String(f.get('email')).trim(), String(f.get('password')));
      onDone();
    } catch (err) {
      show(err.message);
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  });
}
