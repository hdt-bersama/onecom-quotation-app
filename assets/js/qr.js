// Pembuat QR Code (mode byte, koreksi kesalahan level M, versi 1-10) tanpa library.
// Dipakai: qrSvg('https://...') -> string <svg>. Cukup untuk URL hingga ~210 karakter.

// [ecc per blok, daftar panjang data tiap blok] untuk level M
const BLOCKS = {
  1: [10, [16]], 2: [16, [28]], 3: [26, [44]], 4: [18, [32, 32]], 5: [24, [43, 43]],
  6: [16, [27, 27, 27, 27]], 7: [18, [31, 31, 31, 31]], 8: [22, [38, 38, 39, 39]],
  9: [22, [36, 36, 36, 37, 37]], 10: [26, [43, 43, 43, 43, 44]],
};
const ALIGN = { 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

// ---- Reed-Solomon di GF(256), polinomial 0x11D ----
const EXP = new Array(512); const LOG = new Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function rsEncode(data, n) {
  let gen = [1];
  for (let i = 0; i < n; i++) { const next = new Array(gen.length + 1).fill(0); gen.forEach((c, j) => { next[j] ^= c; next[j + 1] ^= mul(c, EXP[i]); }); gen = next; }
  const res = new Array(n).fill(0);
  for (const b of data) {
    const f = b ^ res.shift(); res.push(0);
    if (f) for (let i = 0; i < n; i++) res[i] ^= mul(gen[i + 1], f);
  }
  return res;
}

const bit = (v, i) => ((v >>> i) & 1) !== 0;

export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let ver = 0;
  for (let v = 1; v <= 10; v++) {
    const cap = BLOCKS[v][1].reduce((a, b) => a + b, 0) * 8;
    if (cap >= 4 + (v < 10 ? 8 : 16) + bytes.length * 8) { ver = v; break; }
  }
  if (!ver) throw new Error('Teks terlalu panjang untuk QR');
  const [eccLen, lens] = BLOCKS[ver];
  const dataCw = lens.reduce((a, b) => a + b, 0);

  // ---- bit data ----
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, dataCw * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  for (let pad = 0xec; bits.length < dataCw * 8; pad ^= 0xec ^ 0x11) put(pad, 8);
  const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));

  // ---- blok + ECC + interleave ----
  const blocks = []; let pos = 0;
  for (const l of lens) { const d = cw.slice(pos, pos + l); pos += l; blocks.push({ d, e: rsEncode(d, eccLen) }); }
  const all = [];
  for (let i = 0; i < Math.max(...lens); i++) blocks.forEach((b) => { if (i < b.d.length) all.push(b.d[i]); });
  for (let i = 0; i < eccLen; i++) blocks.forEach((b) => all.push(b.e[i]));
  const dbits = []; all.forEach((b) => { for (let i = 7; i >= 0; i--) dbits.push((b >>> i) & 1); });

  // ---- pola fungsi ----
  const size = ver * 4 + 17;
  const grid = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x, y, dark) => { grid[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx; const y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, Math.max(Math.abs(dx), Math.abs(dy)) !== 2 && Math.max(Math.abs(dx), Math.abs(dy)) !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const ap = ALIGN[ver] || [];
  ap.forEach((ay, i) => ap.forEach((ax, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (mask) => {
    const data = (0 << 3) | mask; // level M = 00
    let rem = data; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(b, i));
    setFn(8, 7, bit(b, 6)); setFn(8, 8, bit(b, 7)); setFn(7, 8, bit(b, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(b, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(b, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(b, i));
    setFn(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3); const c = Math.floor(i / 3); setFn(a, c, bit(b, i)); setFn(c, a, bit(b, i)); }
  }

  // ---- tempatkan data (zig-zag) ----
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j; const up = ((right + 1) & 2) === 0; const y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && k < dbits.length) grid[y][x] = dbits[k++] === 1;
    }
  }

  // ---- pilih mask terbaik ----
  const MASK = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASK[m](x, y)) grid[y][x] = !grid[y][x]; };
  const penalty = () => {
    let p = 0;
    const lines = [];
    for (let y = 0; y < size; y++) lines.push(grid[y]);
    for (let x = 0; x < size; x++) lines.push(grid.map((r) => r[x]));
    for (const l of lines) {
      let run = 1;
      for (let i = 1; i <= size; i++) {
        if (i < size && l[i] === l[i - 1]) run++; else { if (run >= 5) p += run - 2; run = 1; }
      }
      const s = l.map((v) => (v ? '1' : '0')).join('');
      for (const pat of ['00001011101', '10111010000']) { let at = s.indexOf(pat); while (at !== -1) { p += 40; at = s.indexOf(pat, at + 1); } }
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = grid[y][x]; if (c === grid[y][x + 1] && c === grid[y + 1][x] && c === grid[y + 1][x + 1]) p += 3; }
    let dark = 0; grid.forEach((r) => r.forEach((v) => { if (v) dark++; }));
    p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    return p;
  };
  let best = 0; let bestP = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m); drawFormat(m);
    const p = penalty(); if (p < bestP) { bestP = p; best = m; }
    applyMask(m); // buka kembali (XOR)
  }
  applyMask(best); drawFormat(best);
  return grid;
}

/** SVG hitam-putih, zona tenang 'margin' modul. Ukuran diatur lewat CSS (width/height). */
export function qrSvg(text, margin = 2) {
  const g = qrMatrix(text); const n = g.length + margin * 2;
  let d = '';
  g.forEach((row, y) => row.forEach((v, x) => { if (v) d += `M${x + margin} ${y + margin}h1v1h-1z`; }));
  return `<svg class="qr-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="QR verifikasi"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
