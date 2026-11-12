// Klien Supabase ringan (tanpa library): Auth (email+password) dan REST (PostgREST) lewat fetch.
import { CONFIG } from './config.js';

const LS_SESSION = 'qa_session';
const LS_CFG = 'qa_cfg';

export class ApiError extends Error {
  constructor(message, status = 0, code = '') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const read = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; }
};
const write = (k, v) => {
  try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage diblokir */ }
};

/* ---------- Konfigurasi ---------- */
export function getCfg() {
  const saved = read(LS_CFG) || {};
  const url = (CONFIG.SUPABASE_URL || saved.url || '').trim().replace(/\/+$/, '');
  const key = (CONFIG.SUPABASE_ANON_KEY || saved.key || '').trim();
  return { url, key };
}
export const hasCfg = () => { const c = getCfg(); return Boolean(c.url && c.key); };
export function saveCfg(url, key) {
  const before = getCfg().url;
  write(LS_CFG, { url: url.trim(), key: key.trim() });
  // Pindah ke project lain -> sesi login lama tidak berlaku lagi
  if (before && before !== getCfg().url) { session = null; write(LS_SESSION, null); }
}

/* ---------- Sesi ---------- */
let session = read(LS_SESSION);
export const isLoggedIn = () => Boolean(session && session.access_token);
export const currentUser = () => session?.user_email || '';

function setSession(data) {
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user_email: data.user?.email || session?.user_email || '',
  };
  write(LS_SESSION, session);
}

async function authCall(path, body) {
  const { url, key } = getCfg();
  let res;
  try {
    res = await fetch(`${url}/auth/v1/${path}`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke Supabase. Periksa internet dan URL project.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_description || data.msg || data.message || 'Login gagal';
    throw new ApiError(/invalid login/i.test(msg) ? 'Email atau password salah.' : msg, res.status, data.error_code || '');
  }
  return data;
}

export async function signIn(email, password) {
  setSession(await authCall('token?grant_type=password', { email, password }));
}

async function refresh() {
  if (!session?.refresh_token) throw new ApiError('Sesi berakhir', 401);
  try {
    setSession(await authCall('token?grant_type=refresh_token', { refresh_token: session.refresh_token }));
  } catch (e) {
    signOutLocal();
    throw new ApiError('Sesi berakhir, silakan login lagi.', 401);
  }
}

export function signOutLocal() {
  session = null;
  write(LS_SESSION, null);
  window.dispatchEvent(new Event('auth-lost'));
}

export async function signOut() {
  const { url, key } = getCfg();
  if (session?.access_token) {
    fetch(`${url}/auth/v1/logout`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${session.access_token}` } }).catch(() => {});
  }
  signOutLocal();
}

/* ---------- REST ---------- */
export async function rest(method, path, { body, prefer, retry = true } = {}) {
  if (!isLoggedIn()) throw new ApiError('Belum login', 401);
  if (session.expires_at - 60 < Date.now() / 1000) await refresh();

  const { url, key } = getCfg();
  const headers = { apikey: key, Authorization: `Bearer ${session.access_token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  let res;
  try {
    res = await fetch(`${url}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke Supabase. Periksa koneksi internet.');
  }

  if (res.status === 401 && retry) {
    await refresh();
    return rest(method, path, { body, prefer, retry: false });
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Permintaan gagal (${res.status})`;
    throw new ApiError(msg, res.status, (data && data.code) || '');
  }
  return data;
}

export const rpc = (fn, args) => rest('POST', `rpc/${fn}`, { body: args });

/** Panggil fungsi RPC tanpa login (hanya kunci publik). `override` = {url,key} bila perangkat belum punya koneksi. */
export async function publicRpc(fn, args, override) {
  let { url, key } = getCfg();
  if (!(url && key) && override) ({ url, key } = override);
  if (!url || !key) throw new ApiError('Alamat server belum diketahui. Minta tautan/QR yang baru.');
  let res;
  try {
    res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet.');
  }
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) throw new ApiError((data && (data.message || data.error)) || `Permintaan gagal (${res.status})`, res.status);
  return data;
}
