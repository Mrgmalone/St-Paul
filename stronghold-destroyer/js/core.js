'use strict';
// Stronghold Destroyer — constants and helpers, sprites, heraldry, map grid, roads, world objects, terrain, unit definitions, the land, pathfinding, combat helpers, particles.
// Loaded in order by index.html; all files share one global scope.

// ---------- constants & helpers ----------
const TILE = 32, COLS = 96, ROWS = 56, MW = COLS * TILE, MH = ROWS * TILE;
const AF = (COLS * ROWS) / (64 * 42);   // how much bigger than the first map, for scattering things evenly
const EX = 29, EXP = EX * TILE;          // the enemy camp sits 29 tiles farther east than it first did
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const srand = mulberry32(20261101);
const SR = (a, b) => a + (b - a) * srand();
const RR = (a, b) => a + (b - a) * Math.random();

const hexCache = {};
function hexToRgb(h) { if (hexCache[h]) return hexCache[h]; const s = h.replace('#', ''); return hexCache[h] = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; }
function mixHex(h1, h2, t) { const a = hexToRgb(h1), b = hexToRgb(h2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ---------- heraldry ----------
function drawLion(g, cx, cy, s, col) {   // a heraldic lion rampant: rearing, forepaws raised, mane, tail curling up with a tuft
  const X = x => cx + (x / 100 - 0.5) * s, Y = y => cy + (y / 100 - 0.5) * s;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  const body = () => { g.beginPath(); g.moveTo(X(18), Y(21)); g.lineTo(X(23), Y(14)); g.quadraticCurveTo(X(29), Y(5), X(39), Y(8));
    for (const [a, b] of [[44, 3], [47, 10], [53, 6], [53, 13], [60, 12], [56, 19], [62, 22], [57, 26]]) g.lineTo(X(a), Y(b));   // the mane's points
    g.quadraticCurveTo(X(62), Y(36), X(63), Y(46)); g.quadraticCurveTo(X(67), Y(57), X(65), Y(64));
    g.quadraticCurveTo(X(73), Y(68), X(75), Y(80)); g.lineTo(X(80), Y(90)); g.lineTo(X(87), Y(95)); g.lineTo(X(88), Y(89)); g.lineTo(X(84), Y(88)); g.lineTo(X(76), Y(75));
    g.quadraticCurveTo(X(68), Y(71), X(61), Y(76)); g.lineTo(X(54), Y(89)); g.lineTo(X(46), Y(95)); g.lineTo(X(45), Y(89)); g.lineTo(X(50), Y(87)); g.lineTo(X(54), Y(73));
    g.quadraticCurveTo(X(50), Y(65), X(46), Y(58)); g.quadraticCurveTo(X(41), Y(52), X(39), Y(45));
    g.lineTo(X(27), Y(51)); g.lineTo(X(20), Y(55)); g.lineTo(X(15), Y(52)); g.lineTo(X(19), Y(49)); g.lineTo(X(17), Y(46)); g.lineTo(X(24), Y(46)); g.lineTo(X(35), Y(39));   // lower foreleg and claws
    g.lineTo(X(29), Y(35)); g.lineTo(X(20), Y(37)); g.lineTo(X(13), Y(33)); g.lineTo(X(17), Y(30)); g.lineTo(X(15), Y(26)); g.lineTo(X(23), Y(28)); g.lineTo(X(32), Y(29));   // raised foreleg and claws
    g.quadraticCurveTo(X(27), Y(27), X(22), Y(27)); g.lineTo(X(17), Y(25)); g.closePath(); };
  const tail = () => { g.beginPath(); g.moveTo(X(64), Y(62)); g.bezierCurveTo(X(84), Y(56), X(70), Y(34), X(83), Y(22)); };
  g.strokeStyle = 'rgba(70,40,5,0.85)'; g.lineWidth = s * 0.075; tail(); g.stroke(); body(); g.lineWidth = s * 0.035; g.stroke();
  g.fillStyle = col; body(); g.fill(); g.strokeStyle = col; g.lineWidth = s * 0.045; tail(); g.stroke();
  g.beginPath(); g.moveTo(X(83), Y(22)); for (const [a, b] of [[80, 11], [86, 16], [89, 8], [91, 18], [97, 16], [88, 26]]) g.lineTo(X(a), Y(b)); g.closePath(); g.fill();   // tail tuft
  g.fillStyle = 'rgba(255,240,190,0.35)'; g.beginPath(); g.ellipse(X(52), Y(44), s * 0.05, s * 0.12, -0.5, 0, Math.PI * 2); g.fill();   // a highlight
  g.fillStyle = 'rgba(60,30,5,0.9)'; g.beginPath(); g.arc(X(27), Y(17), s * 0.018, 0, Math.PI * 2); g.fill();   // eye
  g.restore();
}
function drawTowerEmblem(g, cx, cy, s, col) {
  g.save(); g.fillStyle = col; const w = 0.36 * s, h = 0.5 * s, x = cx - w / 2, y = cy - h / 2 + 0.06 * s;
  g.fillRect(x, y, w, h); for (let k = 0; k < 3; k++) g.fillRect(x - 0.03 * s + k * (w / 2.4 + 0.012 * s), y - 0.1 * s, w / 4, 0.11 * s);
  g.fillStyle = 'rgba(0,0,0,0.7)'; g.beginPath(); g.moveTo(cx - 0.06 * s, y + h); g.lineTo(cx - 0.06 * s, y + h - 0.14 * s); g.arc(cx, y + h - 0.14 * s, 0.06 * s, Math.PI, 0); g.lineTo(cx + 0.06 * s, y + h); g.fill();
  g.restore();
}
// ---------- map grid ----------
const blocked = new Uint8Array(COLS * ROWS);
const gate = new Uint8Array(COLS * ROWS);
let curTeam = 'player';
const tileBlocked = (c, r) => c < 0 || r < 0 || c >= COLS || r >= ROWS || blocked[r * COLS + c] === 1 || (gate[r * COLS + c] === 1 && curTeam !== 'player');
const blockedAt = (x, y) => tileBlocked(Math.floor(x / TILE), Math.floor(y / TILE));
const setBlock = (c, r, v) => { if (c >= 0 && r >= 0 && c < COLS && r < ROWS) blocked[r * COLS + c] = v; };
function circleBlocked(x, y, r) {
  return blockedAt(x - r, y - r) || blockedAt(x + r, y - r) || blockedAt(x - r, y + r) || blockedAt(x + r, y + r) || blockedAt(x, y);
}

// ---------- road ----------
function bezier(p0, p1, p2, p3, n, out) {
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x, y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y });
  }
}
const road = [], roadN = [], roadS = [];
// main road: from the west edge, past the south of your castle, winding east to the enemy gate
bezier({ x: -30, y: 1090 }, { x: 420, y: 1150 }, { x: 800, y: 1080 }, { x: 1150, y: 880 }, 60, road);
bezier({ x: 1150, y: 880 }, { x: 1600, y: 690 }, { x: 1950, y: 760 }, { x: 2250, y: 600 }, 60, road);
bezier({ x: 2250, y: 600 }, { x: 2380, y: 530 }, { x: 2440, y: 480 }, { x: 2520, y: 470 }, 30, road);
// north road: up from your castle, east through the northern woods to the enemy's back door
bezier({ x: 560, y: 820 }, { x: 600, y: 560 }, { x: 700, y: 330 }, { x: 1100, y: 260 }, 50, roadN);
bezier({ x: 1100, y: 260 }, { x: 1600, y: 170 }, { x: 2100, y: 150 }, { x: 2420, y: 230 }, 60, roadN);
bezier({ x: 2420, y: 230 }, { x: 2480, y: 250 }, { x: 2520, y: 270 }, { x: 2560, y: 230 }, 12, roadN);
// south road: from the main road south and east through the southern woods, then up to the camp
bezier({ x: 860, y: 1050 }, { x: 980, y: 1300 }, { x: 1400, y: 1560 }, { x: 1900, y: 1520 }, 60, roadS);
bezier({ x: 1900, y: 1520 }, { x: 2400, y: 1480 }, { x: 2760, y: 1200 }, { x: 2800, y: 700 }, 60, roadS);
const ROADS = [road, roadN, roadS];
function roadDist(x, y) { let m = 1e9; for (const rd of ROADS) for (const p of rd) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < m) m = d; } return Math.sqrt(m); }

const HOME = { dx: 352, dy: -96 };   // your castle sits well inside the map, with room all round it
const PLAYER_START = { x: 270 + HOME.dx, y: 1070 + HOME.dy };
const CAMP = { x: 1640 + EXP, y: 440 };

// ---------- world objects ----------
const trees = [], rocks = [], units = [], structures = [], fires = [], particles = [], markers = [];
let selection = new Set();

function placeObstacles() {
  const ok = (c, r) => {
    const x = c * TILE + 16, y = r * TILE + 16;
    if (tileBlocked(c, r)) return false;
    if (Math.hypot(x - PLAYER_START.x, y - PLAYER_START.y) < 230) return false;
    if (Math.hypot(x - CAMP.x, y - CAMP.y) < 240) return false;
    if (roadDist(x, y) < 50) return false;
    return true;
  };
  const addTree = (c, r) => {
    if (!ok(c, r)) return;
    setBlock(c, r, 1);
    trees.push({ kind: 'tree', x: c * TILE + 16 + SR(-4, 4), y: c * 0 + r * TILE + 22 + SR(-3, 3), s: SR(0.85, 1.3), pine: srand() < 0.32, seed: srand() * 10, tone: srand() });
  };
  // forest frame along the map edges
  for (let c = 0; c < COLS; c++) for (const r of [0, 1, ROWS - 2, ROWS - 1]) if (srand() < (r === 0 || r === ROWS - 1 ? 0.85 : 0.45)) addTree(c, r);
  for (let r = 0; r < ROWS; r++) for (const c of [0, 1, COLS - 2, COLS - 1]) if (srand() < (c === 0 || c === COLS - 1 ? 0.85 : 0.45)) addTree(c, r);
  // groves
  // forest belts the north and south roads cut through, and woods behind the enemy camp
  const belt = (c0, c1, r0, r1, dens) => { for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) if (srand() < dens) addTree(c, r); };
  belt(24, 70, 3, 8, 0.62); belt(36, 76, 41, 50, 0.6); belt(88, 93, 3, 24, 0.6); belt(3, 9, 3, 14, 0.5); belt(60, 74, 24, 34, 0.45); belt(10, 22, 40, 52, 0.55); belt(28, 38, 14, 22, 0.5);
  for (let k = 0; k < Math.round(17 * AF); k++) {
    const cc = Math.floor(SR(5, COLS - 5)), cr = Math.floor(SR(4, ROWS - 4));
    const n = Math.floor(SR(4, 10));
    for (let i = 0; i < n; i++) addTree(cc + Math.round(SR(-2.4, 2.4)), cr + Math.round(SR(-2, 2)));
  }
  // rocks
  for (let k = 0; k < Math.round(40 * AF); k++) {
    const c = Math.floor(SR(3, COLS - 3)), r = Math.floor(SR(3, ROWS - 3));
    if (!ok(c, r)) continue;
    setBlock(c, r, 1);
    rocks.push({ kind: 'rock', x: c * TILE + 16 + SR(-3, 3), y: r * TILE + 22, s: SR(0.8, 1.25), seed: srand() * 10, amount: 60 });
  }
  // stone outcrops: clusters of grey rock near your castle and out in the field, for gathering stone
  for (const [ox, oy] of [[PLAYER_START.x + 330, PLAYER_START.y - 230], [PLAYER_START.x - 250, PLAYER_START.y + 260], [1250, 560], [1500, 1320], [2050, 900]]) {
    let n = 0;
    for (let t2 = 0; t2 < 40 && n < 6; t2++) { const c = Math.floor((ox + SR(-70, 70)) / TILE), r = Math.floor((oy + SR(-55, 55)) / TILE); if (!ok(c, r)) continue; setBlock(c, r, 1); rocks.push({ kind: 'rock', x: c * TILE + 16 + SR(-3, 3), y: r * TILE + 22, s: SR(0.95, 1.4), seed: srand() * 10, amount: 60 }); n++; }
  }
}

// ---------- terrain (pre-rendered once) ----------
const terrain = document.createElement('canvas');
terrain.width = MW; terrain.height = MH;
// smooth value noise for natural-looking ground
function makeNoise(seed) {
  const Rn = mulberry32(seed), perm = new Uint8Array(512), val = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; val[i] = Rn(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(Rn() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const v = (x, y) => val[perm[(x & 255) + perm[y & 255]]];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
}
function paintTerrain() {
  const g = terrain.getContext('2d');
  // 1. living ground: layered noise for hollows, rises and sun-dried patches
  const W = MW >> 1, H = MH >> 1, low = document.createElement('canvas'); low.width = W; low.height = H;
  const lg = low.getContext('2d'), img = lg.createImageData(W, H), d = img.data;
  const n1 = makeNoise(11), n2 = makeNoise(23), n3 = makeNoise(37);
  const dark = [42, 76, 29], light = [98, 138, 56], dry = [138, 140, 74];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const big = n1(x / 150, y / 150) * 0.65 + n1(x / 60 + 50, y / 60) * 0.35;
    const mid = n2(x / 26, y / 26) * 0.6 + n2(x / 10, y / 10) * 0.4;
    const t = clamp((mid - 0.5) * 1.7 + 0.5, 0, 1), dt = clamp((big - 0.6) * 3.0, 0, 0.5);
    const k = (n3(x / 3, y / 3) - 0.5) * 20 + (Math.random() - 0.5) * 9;
    const i = (y * W + x) * 4;
    d[i] = lerp(lerp(dark[0], light[0], t), dry[0], dt) + k;
    d[i + 1] = lerp(lerp(dark[1], light[1], t), dry[1], dt) + k;
    d[i + 2] = lerp(lerp(dark[2], light[2], t), dry[2], dt) + k * 0.6;
    d[i + 3] = 255;
  }
  lg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(low, 0, 0, MW, MH);
  // fine grain
  for (let i = 0; i < 45000 * AF; i++) { g.fillStyle = srand() < 0.5 ? 'rgba(20,40,10,0.18)' : 'rgba(170,200,110,0.14)'; g.fillRect(SR(0, MW), SR(0, MH), 1.4, 1.4); }
  // bare earth patches
  for (let i = 0; i < 50; i++) {
    const x = SR(0, MW), y = SR(0, MH), r = SR(10, 30), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(120,98,64,0.45)'); gr.addColorStop(1, 'rgba(120,98,64,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 1.4, r, SR(0, 3), 0, Math.PI * 2); g.fill();
  }
  // pond with a muddy shore
  if (pond) {
    g.save(); g.translate(pond.x, pond.y);
    for (const [k, col] of [[1.28, 'rgba(96,84,54,0.35)'], [1.14, 'rgba(84,72,46,0.6)'], [1.04, 'rgba(70,64,44,0.85)']]) { g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, pond.rx * k, pond.ry * k, 0, 0, Math.PI * 2); g.fill(); }
    const wg = g.createRadialGradient(-pond.rx * 0.2, -pond.ry * 0.2, 4, 0, 0, pond.rx);
    wg.addColorStop(0, '#3f7787'); wg.addColorStop(0.7, '#2f5f6f'); wg.addColorStop(1, '#3d6a62');
    g.fillStyle = wg; g.beginPath(); g.ellipse(0, 0, pond.rx, pond.ry, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(220,240,240,0.35)'; g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) { const a = SR(0, 6.28), rr = SR(0.2, 0.75); g.beginPath(); g.ellipse(Math.cos(a) * pond.rx * rr, Math.sin(a) * pond.ry * rr, SR(6, 14), SR(1.5, 3), 0, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 40; i++) { const a = SR(0, 6.28), k = SR(1.0, 1.12); g.strokeStyle = 'rgba(70,110,40,0.8)'; g.lineWidth = 1.2; const x = Math.cos(a) * pond.rx * k, y = Math.sin(a) * pond.ry * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x + SR(-1, 1), y - SR(6, 12)); g.stroke(); }
    g.restore();
  }
  // 2. camp clearing of trampled earth
  let grd = g.createRadialGradient(CAMP.x - 30, CAMP.y + 20, 20, CAMP.x - 30, CAMP.y + 20, 200);
  grd.addColorStop(0, 'rgba(126,98,62,0.85)'); grd.addColorStop(0.6, 'rgba(120,96,60,0.45)'); grd.addColorStop(1, 'rgba(120,96,60,0)');
  g.fillStyle = grd; g.beginPath(); g.ellipse(CAMP.x - 30, CAMP.y + 20, 220, 160, 0, 0, Math.PI * 2); g.fill();
  // 3. dirt road with soft edges and wheel ruts
  for (const road of ROADS) {
  const roadPath = (off = 0) => { g.beginPath(); road.forEach((p, i) => { const q = road[Math.min(i + 1, road.length - 1)], pp = road[Math.max(i - 1, 0)], dx = q.x - pp.x, dy = q.y - pp.y, L = Math.hypot(dx, dy) || 1, x = p.x - dy / L * off, y = p.y + dx / L * off; i ? g.lineTo(x, y) : g.moveTo(x, y); }); };
  const strokeRoad = (w, col, off) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; roadPath(off); g.stroke(); };
  strokeRoad(72, 'rgba(60,48,28,0.10)'); strokeRoad(62, 'rgba(80,64,40,0.20)'); strokeRoad(52, 'rgba(118,94,60,0.6)');
  strokeRoad(44, '#8a6c45'); strokeRoad(36, '#967751');
  for (const off of [-8, 8]) { strokeRoad(4, 'rgba(78,58,34,0.5)', off); strokeRoad(1.5, 'rgba(60,44,26,0.5)', off); }
  strokeRoad(6, 'rgba(96,118,54,0.35)');
  for (let i = 0; i < road.length * 14; i++) {
    const p = road[Math.floor(srand() * road.length)], x = p.x + SR(-20, 20), y = p.y + SR(-20, 20);
    g.fillStyle = srand() < 0.5 ? 'rgba(60,45,28,0.45)' : 'rgba(196,170,126,0.45)';
    g.beginPath(); g.ellipse(x, y, SR(0.6, 2.2), SR(0.5, 1.5), 0, 0, Math.PI * 2); g.fill();
  }
  }
  // iron ground: rusty red and black earth around every iron deposit, so you can spot it
  for (const r of rocks.filter(q => q.iron)) {
    const gr = g.createRadialGradient(r.x, r.y - 6, 4, r.x, r.y - 6, 70); gr.addColorStop(0, 'rgba(70,24,14,0.85)'); gr.addColorStop(0.5, 'rgba(120,48,24,0.5)'); gr.addColorStop(1, 'rgba(120,48,24,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(r.x, r.y - 6, 70, 52, 0, 0, Math.PI * 2); g.fill();
    for (let n = 0; n < 90; n++) { const a = srand() * 6.28, d = Math.sqrt(srand()) * 60; g.fillStyle = srand() < 0.5 ? 'rgba(28,14,10,0.6)' : 'rgba(176,82,40,0.55)'; g.fillRect(r.x + Math.cos(a) * d, r.y - 6 + Math.sin(a) * d * 0.75, SR(1, 3), SR(1, 2.4)); }
  }
  // 4. stones
  for (let i = 0; i < 320; i++) {
    const x = SR(0, MW), y = SR(0, MH), r = SR(1.2, 3);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 0.8, y + 0.8, r, r * 0.7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8f8b82'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b6b2a8'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.25, r * 0.45, r * 0.3, 0, 0, Math.PI * 2); g.fill();
  }
  // 5. grass tufts: dark base blades with sunlit tips, spilling over the road edge
  const bases = ['#2f5520', '#365e24', '#3d6828'], tips = ['#7fae4c', '#8fbd56', '#a2c464', '#6f9d42'];
  for (let i = 0; i < 15000; i++) {
    const x = SR(0, MW), y = SR(0, MH);
    if (roadDist(x, y) < 17) continue;
    const n = 3 + Math.floor(srand() * 4), base = bases[Math.floor(srand() * 3)], tip = tips[Math.floor(srand() * 4)];
    for (let k = 0; k < n; k++) {
      const ox = SR(-3, 3), len = SR(4, 9), lean = SR(-2.5, 2.5), tx = x + ox + lean, ty = y - len;
      g.strokeStyle = base; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x + ox, y); g.quadraticCurveTo(x + ox, y - len * 0.6, tx, ty); g.stroke();
      g.strokeStyle = tip; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x + ox + lean * 0.5, y - len * 0.55); g.lineTo(tx, ty); g.stroke();
    }
  }
  // 6. wildflowers on short stems
  const fl = ['#f4f1e6', '#f2d24b', '#b78bd8', '#e8865a', '#f6f3ff'];
  for (let i = 0; i < 520; i++) {
    const x = SR(0, MW), y = SR(0, MH);
    if (roadDist(x, y) < 30 || Math.hypot(x - CAMP.x, y - CAMP.y) < 200) continue;
    g.strokeStyle = '#3d6828'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y + 3); g.lineTo(x, y); g.stroke();
    g.fillStyle = fl[Math.floor(srand() * fl.length)]; g.beginPath(); g.arc(x, y, SR(1, 1.8), 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(240,200,60,0.9)'; g.fillRect(x - 0.4, y - 0.4, 0.8, 0.8);
  }
  { // hill shading (light from the north-west), then bare rock and snow where the mountains rise
    const sc = document.createElement('canvas'); sc.width = EW; sc.height = EH; const sg = sc.getContext('2d'), si = sg.createImageData(EW, EH), sd = si.data;
    const rc = document.createElement('canvas'); rc.width = EW; rc.height = EH; const rg = rc.getContext('2d'), ri = rg.createImageData(EW, EH), rd = ri.data;
    const RN = makeNoise(5);
    for (let j = 0; j < EH; j++) for (let i = 0; i < EW; i++) {
      const x = (i - 1) * EG, y = (j - 1) * EG, e = (a, b) => elevAt(a, b);
      const sh = clamp(((e(x - EG, y - EG) - e(x + EG, y + EG)) * 0.05), -0.75, 0.75), o = (j * EW + i) * 4;
      if (sh > 0) { sd[o] = 255; sd[o + 1] = 240; sd[o + 2] = 200; sd[o + 3] = sh * 95; } else { sd[o] = 12; sd[o + 1] = 16; sd[o + 2] = 10; sd[o + 3] = -sh * 230; }
      const m = mountAt(x, y), rk = clamp((m - 16) / 30, 0, 1), sn = clamp((m - 128) / 18, 0, 1), nv = RN(x / 40, y / 40), nv2 = RN(x / 13 + 9, y / 13);
      const base = [74 + nv * 30 + nv2 * 14, 66 + nv * 24 + nv2 * 12, 54 + nv * 18 + nv2 * 8];
      rd[o] = lerp(base[0], 236, sn); rd[o + 1] = lerp(base[1], 240, sn); rd[o + 2] = lerp(base[2], 246, sn); rd[o + 3] = rk * 235;
    }
    rg.putImageData(ri, 0, 0); sg.putImageData(si, 0, 0);
    g.drawImage(rc, -EG * 1.5, -EG * 1.5, EW * EG, EH * EG);
    // cracks, scree and boulders on the rock faces
    for (let n = 0; n < 9000; n++) { const x = SR(0, MW), y = SR(0, MH), m = mountAt(x, y); if (m < 30) continue; g.fillStyle = srand() < 0.55 ? 'rgba(40,34,28,0.35)' : 'rgba(230,222,205,0.25)'; g.fillRect(x, y, SR(1, 4), SR(0.8, 2.2)); }
    g.drawImage(sc, -EG * 1.5, -EG * 1.5, EW * EG, EH * EG);
  }
}

// ---------- unit definitions ----------
const MACHINE = { ram: 1, catapult: 1, ballista: 1, oxcart: 1, trebuchet: 1 };
const SWORDISH = { sword: 1, knight: 1, maceman: 1, king: 1 };
const swordish = u => !!SWORDISH[u.type];
// knights (and kings) shrug off most blows: only knights, kings, ballistas and trebuchets hurt them fully
const HEAVY_HITTERS = { knight: 1, king: 1, ballista: 1, trebuchet: 1 };
function armorMul(t, a) { if (!t || !(t.type === 'knight' || t.type === 'king' || t.lord)) return 1; if (!a) return 0.25; if (HEAVY_HITTERS[a.type] || a.lord || a.engine === 'ballista' || a.engine === 'trebuchet') return 1; return 0.25; }
const isMachine = u => !!(u && MACHINE[u.type]);
const KINDS = {
  sword: { name: 'Swordsman', hp: 110, dmg: 13, range: 5, cd: 1.0, speed: 74, anim: 0.5, hitAt: 0.62 },
  spear: { name: 'Spearman', hp: 95, dmg: 15, range: 17, cd: 1.25, speed: 70, anim: 0.55, hitAt: 0.55 },
  ram: { name: 'Battering Ram', hp: 420, dmg: 70, range: 4, cd: 2.4, speed: 34, anim: 0.8, hitAt: 0.55 },
  catapult: { name: 'Catapult', hp: 260, dmg: 95, range: 430, cd: 6.5, speed: 26, anim: 1.3, hitAt: 0.5 },
  oxcart: { name: 'Ox Cart', hp: 180, dmg: 0, range: 0, cd: 1, speed: 46, anim: 0.6, hitAt: 2 },
  ballista: { name: 'Ballista', hp: 210, dmg: 46, range: 340, cd: 3.4, speed: 30, anim: 0.9, hitAt: 0.45 },
  knight: { name: 'Knight', hp: 260, dmg: 22, range: 5, cd: 1.1, speed: 62, anim: 0.5, hitAt: 0.62 },
  maceman: { name: 'Maceman', hp: 125, dmg: 18, range: 5, cd: 1.15, speed: 72, anim: 0.5, hitAt: 0.6 },
  king: { name: 'Your King', hp: 600, dmg: 34, range: 6, cd: 1.0, speed: 60, anim: 0.5, hitAt: 0.62 },
  trebuchet: { name: 'Trebuchet', hp: 320, dmg: 150, range: 640, cd: 9.5, speed: 18, anim: 1.6, hitAt: 0.5 },
  archer: { name: 'Archer', hp: 70, dmg: 9, range: 170, cd: 1.6, speed: 72, anim: 0.6, hitAt: 0.55 },
  civ: { name: 'Civilian', hp: 50, dmg: 0, range: 0, cd: 1, speed: 66, anim: 0.6, hitAt: 2 }
};
// Gerald's design sheets: his army wears polished steel, crimson and gold with a gold lion.
// The enemy is the Black Stone faction: blackened steel and charcoal with ember-orange trim.
const ARMY = { crimson: '#9b1c22', crimsonDark: '#5e1014', gold: '#d9a93a' };
const ENEMY_COL = '#34353c', ENEMY_DARK = '#18191d', ENEMY_TRIM = '#d8742a', ENEMY_PLUME = '#e0822e';
const PAL = {
  civ: { tunic: '#8a7550', tunicDark: '#5f5038', trim: '#2f63b0', pants: '#5a4630', pantsDark: '#45351f', boot: '#3a2a1a', bootDark: '#2a1e12' },
  player: { tunic: ARMY.crimson, tunicDark: ARMY.crimsonDark, trim: ARMY.gold, helmet: '#d5dbe1', helmetDark: '#7d858d', plume: null, shield: ARMY.crimson, shieldRim: ARMY.gold, pants: '#5a4630', pantsDark: '#45351f', boot: '#3a2a1a', bootDark: '#2a1e12' },
  enemy: { tunic: ENEMY_COL, tunicDark: ENEMY_DARK, trim: ENEMY_TRIM, helmet: '#5d6168', helmetDark: '#2c2e33', plume: ENEMY_PLUME, shield: ENEMY_COL, shieldRim: ENEMY_TRIM, pants: '#3e3428', pantsDark: '#2e261c', boot: '#22190f', bootDark: '#170f08' }
};
PAL.lord = Object.assign({}, PAL.enemy, { tunic: '#1e1e23', tunicDark: '#0d0d10', helmet: '#d9b04a', helmetDark: '#8a6a1a', plume: ENEMY_PLUME, shield: '#1e1e23', shieldRim: '#d9b04a' });
PAL.ecv = Object.assign({}, PAL.civ, { tunic: '#7a5a48', tunicDark: '#5a3e30', trim: ENEMY_COL });
const CIVS = {
  legion:  { name: 'Iron Legion',   color: '#2f63b0', dark: '#1d3f76', sHp: 1.2,  sDmg: 1.2,  sSpeed: 1,    train: 0.7, gather: 0.75, carry: 10, eatEvery: 12, popCap: 15, regrow: 5, heal: 1.5, keepHeal: 0, food: 100, wood: 80,  keepHp: 1500, keepRate: 2.2, keepDmg: 7,  keepRange: 240, bldHp: 1 },
  harvest: { name: 'Harvest Folk',  color: '#3f8a3a', dark: '#25561f', sHp: 0.85, sDmg: 0.85, sSpeed: 1,    train: 1,   gather: 1.4,  carry: 15, eatEvery: 20, popCap: 20, regrow: 3, heal: 1.5, keepHeal: 0, food: 200, wood: 80,  keepHp: 1500, keepRate: 2.2, keepDmg: 7,  keepRange: 240, bldHp: 1 },
  wardens: { name: 'Stone Wardens', color: '#6a4aa8', dark: '#432c73', sHp: 1,    sDmg: 1,    sSpeed: 0.85, train: 1,   gather: 1,    carry: 10, eatEvery: 15, popCap: 15, regrow: 5, heal: 1.5, keepHeal: 4, food: 100, wood: 150, keepHp: 2600, keepRate: 1.1, keepDmg: 10, keepRange: 300, bldHp: 1.5 }
};
let CIV = CIVS.legion, started = false;
const HAIRS = ['#2a1a10', '#4a2e18', '#6b4423', '#1a1410', '#8a6a3a'];
const SKINS = ['#efc59c', '#d9a57a', '#b97c52', '#8d5a3b', '#6a4329', '#f3d1ae'];
let nextId = 1;

function makeUnit(team, kind, x, y) {
  const k = KINDS[kind];
  const u = {
    id: nextId++, kind: 'unit', type: kind, team, name: k.name, x, y, radius: 11,
    hp: k.hp, maxHp: k.hp, dmg: k.dmg, range: k.range, cd: k.cd, speed: k.speed, animDur: k.anim, hitAt: k.hitAt,
    pal: PAL[team], skin: SKINS[Math.floor(Math.random() * SKINS.length)], seed: Math.random() * 10,
    facing: team === 'player' ? 1 : -1, walkPhase: Math.random() * 6, moving: false,
    path: [], order: 'idle', target: null, repath: 0, atkTimer: 0, attackAnim: 0, combatT: 0,
    flash: 0, dead: false, deathT: 0, stuckT: 0, lastX: x, lastY: y,
    post: { x, y }, raider: false, think: Math.random() * 0.3, lastHurt: -99,
    carry: 0, carryType: null, task: null, sub: null, workT: 0, bad: new Set(), hair: HAIRS[Math.floor(Math.random() * HAIRS.length)]
  };
  if (kind === 'ram') u.radius = 16;
  if (!MACHINE[kind] && !u.look) {
    const fem = kind === 'civ' ? Math.random() < 0.45 : kind === 'archer' ? Math.random() < 0.25 : false;
    u.look = { female: fem, beard: !fem && Math.random() < 0.45, longHair: fem || Math.random() < 0.2, w: 0.93 + Math.random() * 0.12, h: (fem ? 0.94 : 0.97) + Math.random() * 0.07, hairStyle: Math.floor(Math.random() * 3) };
  }
  u.fat = kind === 'civ' ? (Math.random() < 0.3 ? 0.2 + Math.random() * 0.5 : Math.random() * 0.15) : Math.random() * 0.12;
  u.sick = 0;
  if (kind === 'catapult' || kind === 'ballista' || kind === 'oxcart') u.radius = 17;
  if (kind === 'trebuchet') u.radius = 21;
  if (kind === 'knight') { u.pal = Object.assign({}, PAL[team], { helmet: '#d6dce2', plume: team === 'player' ? '#f0e6d0' : ENEMY_PLUME }); u.look = { beard: Math.random() < 0.5, longHair: false, w: 1.06, h: 1.03 }; }
  if (kind === 'king') { u.pal = Object.assign({}, PAL[team], { helmet: '#e0b84e', plume: '#f0e6d0', shieldRim: '#e0b84e' }); u.look = { beard: true, longHair: true, w: 1.08, h: 1.0, s: 1.22 }; }
  if (kind === 'civ') u.pal = team === 'enemy' ? PAL.ecv : PAL.civ;
  else if (team === 'player') { u.maxHp = u.hp = Math.round(u.hp * CIV.sHp); u.dmg *= CIV.sDmg; u.speed *= CIV.sSpeed; }
  units.push(u);
  return u;
}

function makeKeep(c, r) {
  const s = {
    id: nextId++, kind: 'keep', team: 'player', name: 'Your Keep', c, r, w: 3, h: 3,
    x0: c * TILE, y0: r * TILE, x1: (c + 3) * TILE, y1: (r + 3) * TILE,
    x: (c + 1.5) * TILE, y: (r + 3) * TILE, hp: 1500, maxHp: 1500, flash: 0, dead: false, deathT: 0, radius: 48, wobble: 0, topH: 125,
    range: 240, fireRate: 2.2, arrowDmg: 7, archerY: 128
  };
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) setBlock(c + i, r + j, 1);
  structures.push(s);
  return s;
}
const bushes = [], stumps = [];
function placeBushes() {
  const spots = [[300, 860], [330, 875], [285, 895], [318, 905], [470, 960], [500, 975], [455, 990], [140, 1150], [175, 1160]].map(([x, y]) => [x + HOME.dx, y + HOME.dy]).concat([ [160, 760], [190, 780], [150, 800], [820, 940], [850, 955], [830, 985], [865, 920], [800, 970], [1500, 1200], [1530, 1215], [1480, 1240], [2380, 760], [2410, 780], [2440, 755], [2700, 620], [2730, 640], [1100, 1500], [1130, 1520]]);
  for (const [bx, by] of spots) {
    let x = bx, y = by, tries = 0;
    while ((circleBlocked(x, y, 12) || roadDist(x, y) < 36) && tries++ < 40) { x = bx + RR(-60, 60); y = by + RR(-60, 60); }
    if (tries >= 40) continue;
    bushes.push({ kind: 'bush', x, y, amount: 150, max: 150, seed: Math.random() * 100 });
  }
}
let keep = null;
let playerFire = null;
let pond = null;
function placeIron() {
  // three rusty outcrops: one near your town, two out in the field
  const want = [[560 + HOME.dx, 860 + HOME.dy], [1500, 420], [1700, 1180], [2300, 1000]];
  for (const [wx, wy] of want) {
    let best = null;
    for (let rad = 0; rad < 10 && !best; rad++) for (let dc = -rad; dc <= rad && !best; dc++) for (let dr = -rad; dr <= rad && !best; dr++) {
      const c = Math.floor(wx / TILE) + dc, r = Math.floor(wy / TILE) + dr, x = c * TILE + 16, y = r * TILE + 16;
      if (tileBlocked(c, r) || roadDist(x, y) < 60 || Math.hypot(x - CAMP.x, y - CAMP.y) < 260) continue;
      let room = true; for (let i = -2; i <= 2 && room; i++) for (let j = -2; j <= 2 && room; j++) if (tileBlocked(c + i, r + j)) room = false;
      if (room) best = { c, r, x, y };
    }
    if (!best) continue;
    setBlock(best.c, best.r, 1);
    rocks.push({ kind: 'rock', iron: true, x: best.x, y: best.y + 6, s: 1.35, seed: best.c * 0.37 });
    for (const [dc, dr] of [[2, 1], [-1, 2], [1, -2]]) { const c = best.c + dc, r = best.r + dr; if (tileBlocked(c, r)) continue; setBlock(c, r, 1); rocks.push({ kind: 'rock', iron: true, x: c * TILE + 16, y: r * TILE + 22, s: 1.0 + (dc + dr) * 0.05, seed: c * 0.41 }); }
  }
}
function placePond() {
  const Rp = mulberry32(2718), rx = 3.6, ry = 2.4;
  const cands = [];
  for (let c = 8; c <= COLS - 9; c++) for (let r = 5; r <= ROWS - 6; r++) cands.push([c, r]);
  for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(Rp() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
  for (const [c, r] of cands) {
    const x = c * TILE + 16, y = r * TILE + 16;
    if (Math.hypot(x - PLAYER_START.x, y - PLAYER_START.y) < 380 || Math.hypot(x - CAMP.x, y - CAMP.y) < 420) continue;
    const tiles = [];
    let ok = true;
    for (let dc = -5; dc <= 5 && ok; dc++) for (let dr = -4; dr <= 4 && ok; dr++) {
      if ((dc / rx) ** 2 + (dr / ry) ** 2 > 1) continue;
      const tc = c + dc, tr = r + dr, tx = tc * TILE + 16, ty = tr * TILE + 16;
      if (tileBlocked(tc, tr) || roadDist(tx, ty) < 70) ok = false; else tiles.push([tc, tr]);
    }
    if (!ok) continue;
    for (const [tc, tr] of tiles) setBlock(tc, tr, 1);
    pond = { x, y, rx: rx * TILE + 6, ry: ry * TILE + 6, tiles };
    return;
  }
}
const playerKeep = () => (keep && !keep.dead ? keep : null);
function makeTower(c, r) {
  const s = {
    id: nextId++, kind: 'tower', team: 'enemy', name: 'Enemy Watchtower', c, r,
    x0: c * TILE, y0: r * TILE, x1: (c + 2) * TILE, y1: (r + 2) * TILE,
    x: (c + 1) * TILE, y: (r + 2) * TILE, hp: 520, maxHp: 520, flash: 0, dead: false, deathT: 0, radius: 32, wobble: 0,
    w: 2, h: 2, topH: 210, range: 270, fireRate: 1.8, arrowDmg: 7, archerY: 134
  };
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) setBlock(c + i, r + j, 1);
  structures.push(s);
  return s;
}

// ---------- the land: rolling hills, mountain ridges that armies must go around, flat ground for building ----------
const MOUNTAINS = [
  { x: 1560, y: 420, len: 330, w: 95, ang: 0.12, h: 150 },    // between the north road and the main road
  { x: 1880, y: 1160, len: 320, w: 110, ang: -0.22, h: 140 }, // between the main road and the south road
  { x: 2330, y: 1700, len: 260, w: 70, ang: 0.05, h: 110 },   // the far south
  { x: 150, y: 210, len: 230, w: 120, ang: 0.6, h: 150 }      // behind your castle, to the north-west
];
const EG = 16, EW = Math.ceil(MW / EG) + 2, EH = Math.ceil(MH / EG) + 2;
let ELEV = null, MOUNT = null;
function buildElevation() {
  const TN = makeNoise(77), k = keep, kx = k ? k.x : PLAYER_START.x, ky = k ? (k.y0 + k.y1) / 2 : PLAYER_START.y;
  ELEV = new Float32Array(EW * EH); MOUNT = new Float32Array(EW * EH);
  for (let j = 0; j < EH; j++) for (let i = 0; i < EW; i++) {
    const x = (i - 1) * EG, y = (j - 1) * EG;
    let h = (TN(x / 240, y / 240) - 0.5) * 12 + (TN(x / 90 + 40, y / 90) - 0.5) * 3 + (TN(x / 560 + 7, y / 560 + 3) - 0.5) * 64;
    let m = 0;
    for (const M of MOUNTAINS) { const dx = x - M.x, dy = y - M.y, c = Math.cos(M.ang), s2 = Math.sin(M.ang), u = dx * c + dy * s2, v = -dx * s2 + dy * c, d = (u / M.len) ** 2 + (v / M.w) ** 2; if (d < 5) m = Math.max(m, M.h * Math.exp(-d * 1.5) * (0.72 + 0.55 * TN(x / 55 + M.x, y / 55))); }
    // keep the ground flat where people build and walk the roads
    const fk = clamp((Math.hypot(x - kx, y - ky) - 520) / 260, 0, 1), fc = clamp((Math.hypot(x - CAMP.x, y - CAMP.y) - 420) / 240, 0, 1), fr = clamp((roadDist(x, y) - 50) / 120, 0, 1);
    const f = fk * fc * fr;
    ELEV[j * EW + i] = h * f + m * f; MOUNT[j * EW + i] = m * f;
  }
  // mountain slopes too steep to cross block the way
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (mountAt(c * TILE + 16, r * TILE + 16) > 40) setBlock(c, r, 1);
}
function sampleGrid(G, x, y) {
  if (!G) return 0;
  const gx = clamp(x / EG + 1, 0, EW - 1.001), gy = clamp(y / EG + 1, 0, EH - 1.001), i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j;
  const a = G[j * EW + i], b = G[j * EW + i + 1], c = G[(j + 1) * EW + i], d = G[(j + 1) * EW + i + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
const elevAt = (x, y) => sampleGrid(ELEV, x, y), mountAt = (x, y) => sampleGrid(MOUNT, x, y);
function setupWorld() {
  // tower + campfire are placed before obstacles so their tiles are reserved
  makeTower(51 + EX, 12);
  keep = makeKeep(3 + HOME.dx / TILE, 29 + HOME.dy / TILE);
  fires.push({ kind: 'fire', x: 1584 + EXP, y: 442 });
  playerFire = { kind: 'fire', x: 236 + HOME.dx, y: 1104 + HOME.dy, player: true }; fires.push(playerFire); setBlock(Math.floor(playerFire.x / TILE), Math.floor(playerFire.y / TILE), 1);
  setBlock(49 + EX, 13, 1);
  buildElevation();
  placeObstacles();
  placePond();
  placeIron();
  for (const t of trees) { t.c = Math.floor(t.x / TILE); t.r = Math.floor((t.y - 6) / TILE); t.amount = 80; }
  placeBushes();
  paintTerrain();
  // player army: 3 swordsmen, 2 spearmen
}
function spawnPlayerPeople() {
  [['sword', 300, 1000], ['sword', 334, 1022], ['sword', 368, 1044], ['spear', 300, 1054], ['spear', 336, 1076]]
    .forEach(([k, x, y]) => makeUnit('player', k, x + HOME.dx, y + HOME.dy));
  [[110, 1060], [146, 1070], [182, 1062], [218, 1072], [254, 1058]].forEach(([x, y]) => makeUnit('player', 'civ', x + HOME.dx, y + HOME.dy));
  // enemy guards at their posts
  [['sword', 1528, 392], ['spear', 1538, 486], ['sword', 1618, 522], ['spear', 1734, 492], ['sword', 1728, 352]]
    .forEach(([k, x, y]) => { const g = makeUnit('enemy', k, x + EXP, y); g.maxHp = g.hp = Math.round(g.hp * 0.85); });
}

// ---------- pathfinding (A* on the tile grid, then smoothed) ----------
function lineClear(ax, ay, bx, by, r = 7) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 6));
  for (let i = 1; i <= n; i++) { const t = i / n; if (circleBlocked(ax + (bx - ax) * t, ay + (by - ay) * t, r)) return false; }
  return true;
}
function nearestFree(c, r) {
  if (!tileBlocked(c, r)) return { c, r };
  for (let rad = 1; rad < 14; rad++) {
    let best = null, bd = 1e9;
    for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
      const cc = c + dc, rr2 = r + dr;
      if (!tileBlocked(cc, rr2)) { const d = dc * dc + dr * dr; if (d < bd) { bd = d; best = { c: cc, r: rr2 }; } }
    }
    if (best) return best;
  }
  return null;
}
// the search maps are made once and reused: a stamp per search says which entries belong to this search
const FP_N = COLS * ROWS, fpG = new Float32Array(FP_N), fpCame = new Int32Array(FP_N), fpSeen = new Uint32Array(FP_N), fpClosed = new Uint32Array(FP_N); let fpGen = 0;
function findPath(sx, sy, gx, gy) {
  let gc = Math.floor(gx / TILE), gr = Math.floor(gy / TILE);
  if (circleBlocked(gx, gy, 7)) { const f = nearestFree(gc, gr); if (!f) return []; gc = f.c; gr = f.r; gx = gc * TILE + 16; gy = gr * TILE + 16; }
  if (lineClear(sx, sy, gx, gy)) return [{ x: gx, y: gy }];
  let sc = Math.floor(sx / TILE), sr = Math.floor(sy / TILE);
  if (tileBlocked(sc, sr)) { const f = nearestFree(sc, sr); if (!f) return []; sc = f.c; sr = f.r; }
  const gen = ++fpGen, G = i => fpSeen[i] === gen ? fpG[i] : Infinity;
  const start = sr * COLS + sc, goal = gr * COLS + gc;
  const h = i => { const dc = Math.abs(i % COLS - gc), dr = Math.abs(((i / COLS) | 0) - gr); return (dc + dr) + (1.4142 - 2) * Math.min(dc, dr); };
  const heap = []; // [f, idx]
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  fpSeen[start] = gen; fpG[start] = 0; fpCame[start] = -1; push(h(start), start);
  let best = start, bestH = h(start);
  while (heap.length) {
    const [, cur] = pop();
    if (fpClosed[cur] === gen) continue; fpClosed[cur] = gen;
    if (cur === goal) { best = cur; bestH = 0; break; }
    const hc = h(cur); if (hc < bestH) { bestH = hc; best = cur; }
    const cc = cur % COLS, cr = (cur / COLS) | 0;
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
      if (!dc && !dr) continue;
      const nc = cc + dc, nr = cr + dr;
      if (tileBlocked(nc, nr)) continue;
      if (dc && dr && (tileBlocked(cc + dc, cr) || tileBlocked(cc, cr + dr))) continue;
      const ni = nr * COLS + nc; if (fpClosed[ni] === gen) continue;
      const ng = fpG[cur] + (dc && dr ? 1.4142 : 1);
      if (ng < G(ni)) { fpSeen[ni] = gen; fpG[ni] = ng; fpCame[ni] = cur; push(ng + h(ni), ni); }
    }
  }
  const pts = [];
  for (let i = best; i !== -1 && i !== start; i = fpCame[i]) pts.push({ x: (i % COLS) * TILE + 16, y: ((i / COLS) | 0) * TILE + 16 });
  pts.reverse();
  if (best === goal) { if (pts.length) pts[pts.length - 1] = { x: gx, y: gy }; else pts.push({ x: gx, y: gy }); }
  // string-pull smoothing
  const out = []; let cx = sx, cy = sy, i = 0;
  while (i < pts.length) { let j = pts.length - 1; while (j > i && !lineClear(cx, cy, pts[j].x, pts[j].y)) j--; out.push(pts[j]); cx = pts[j].x; cy = pts[j].y; i = j + 1; }
  return out;
}

// ---------- combat helpers ----------
const alive = t => t && !t.dead && !t.inside;
function setBox(el, html) { if (el._html === html && el.firstChild && el.querySelector(':scope > .xbtn')) return; el._html = html; el.innerHTML = html; }
function edgeDist(u, t) {
  if (t.x0 !== undefined) {
    const dx = Math.max(t.x0 - u.x, 0, u.x - t.x1), dy = Math.max(t.y0 - u.y, 0, u.y - t.y1);
    return Math.hypot(dx, dy) - u.radius;
  }
  return Math.hypot(t.x - u.x, t.y - u.y) - u.radius - t.radius;
}
function approachPoint(u, t) {
  if (t.x0 !== undefined) {
    const p = { x: clamp(u.x, t.x0 - 13, t.x1 + 13), y: clamp(u.y, t.y0 - 13, t.y1 + 13) };
    if (!circleBlocked(p.x, p.y, 7)) return p;
    // that side is walled in by a neighbour: take the nearest open spot all the way round
    let best = p, bd = 1e9;
    for (let x = t.x0 - 13; x <= t.x1 + 13; x += 8) for (const y of [t.y0 - 13, t.y1 + 13]) if (!circleBlocked(x, y, 7)) { const d = Math.hypot(x - u.x, y - u.y); if (d < bd) { bd = d; best = { x, y }; } }
    for (let y = t.y0 - 13; y <= t.y1 + 13; y += 8) for (const x of [t.x0 - 13, t.x1 + 13]) if (!circleBlocked(x, y, 7)) { const d = Math.hypot(x - u.x, y - u.y); if (d < bd) { bd = d; best = { x, y }; } }
    return best;
  }
  const a = Math.atan2(u.y - t.y, u.x - t.x), d = t.radius + u.radius + u.range * 0.5;
  return { x: t.x + Math.cos(a) * d, y: t.y + Math.sin(a) * d };
}
function enemiesOf(team) {
  const list = units.filter(o => o.team !== team && !o.dead && !o.inside);
  for (const s of structures) if (s.team !== team && !s.dead && s.kind !== 'pit' && s.kind !== 'moat') list.push(s);
  return list;
}
function nearestEnemy(u, maxD) {   // the closest enemy person (from the nearby grid) or enemy building
  let best = null, bd = maxD;
  for (const e of nearUnits(u.x, u.y, maxD + 40)) { if (e.team === u.team || e.dead || e.inside) continue; const d = edgeDist(u, e); if (d < bd) { bd = d; best = e; } }
  for (const s of structures) { if (s.team === u.team || s.dead || s.kind === 'pit' || s.kind === 'moat') continue; const d = edgeDist(u, s); if (d < bd) { bd = d; best = s; } }
  return best;
}
function hitCenter(t) { return t.x0 !== undefined ? { x: t.x + RR(-22, 22), y: t.y - RR(20, 90) } : { x: t.x, y: t.y - 21 }; }

const WALL_RESIST = 0.35;
const isWall = t => t.kind === 'wall' || t.kind === 'gate' || t.kind === 'highwall' || t.kind === 'stairs' || t.kind === 'moat';
const isHiddenWork = t => t.kind === 'pit';   // spike pits are not seen or targeted by the enemy
function doHit(u) {
  const t = u.target;
  if (u.holdFire) return;
  if (!alive(t) || edgeDist(u, t) > rangeOf(u) + 8) return;
  if (u.type === 'archer') { // loose an arrow; it lands a moment later
    const c = hitCenter(t), x0 = u.x + u.facing * 8, y0 = u.y - 26;
    fire({ x0, y0, x1: c.x, y1: c.y, t: 0, dur: Math.hypot(c.x - x0, c.y - y0) / 460 + 0.08, h: 18, target: t, from: u, dmg: Math.round(u.dmg * RR(0.85, 1.15)) });
    AudioSys.play('bow', u.x, u.y); AudioSys.combat(u.x, u.y);
    return;
  }
  if (u.type === 'catapult' || u.type === 'ballista' || u.type === 'trebuchet') {
    const c = hitCenter(t), st = u.type === 'catapult' || u.type === 'trebuchet';
    const ax = c.x + (st && t.x0 === undefined ? RR(-24, 24) : 0), ay = c.y + (st && t.x0 === undefined ? RR(-14, 14) : 0);
    const x0 = u.x + u.facing * (st ? -6 : 14), y0 = u.y - (st ? 44 : 30), dist = Math.hypot(ax - x0, ay - y0);
    fire({ kind: st ? 'stone' : 'bolt', x0, y0, x1: ax, y1: ay, t: 0, dur: dist / (st ? 300 : 620) + (st ? 0.5 : 0.08), h: st ? Math.min(220, 60 + dist * 0.35) : 12, target: t, from: u, dmg: Math.round(u.dmg * RR(0.9, 1.1)) });
    AudioSys.play(st ? 'boom' : 'bow', u.x, u.y); AudioSys.combat(u.x, u.y);
    for (let i = 0; i < 4; i++) spawn('dust', u.x + RR(-14, 14), u.y - 4, u.y);
    return;
  }
  if (u.type === 'ram' && t.x0 === undefined) return;
  let dmg = Math.round(u.dmg * RR(0.85, 1.15) * (u.team === 'enemy' && lordNear(u) ? 1.2 : 1) * armorMul(t, u));
  if (isWall(t) && u.type !== 'ram' && t.kind !== 'moat') dmg = Math.max(1, Math.round(dmg * WALL_RESIST));
  if (t.kind === 'moat' && u.type === 'ram') return;
  t.hp -= dmg; t.flash = 1;
  AudioSys.play(u.type === 'ram' ? 'boom' : t.x0 !== undefined ? (t.kind === 'tower' || t.kind === 'house' || t.kind === 'gate' ? 'woodHit' : 'stoneHit') : swordish(u) ? 'clash' : 'stab', t.x, t.y - 16); AudioSys.combat(t.x, t.y);
  const c = hitCenter(t);
  if (t.x0 !== undefined) {
    t.wobble = 1;
    for (let i = 0; i < 6; i++) spawn('chip', c.x, c.y, t.y);
  } else {
    for (let i = 0; i < 5; i++) spawn('spark', c.x, c.y, t.y);
    for (let i = 0; i < 3; i++) spawn('blood', c.x, c.y + 4, t.y);
    t.facing = u.x > t.x ? 1 : -1;
    t.lastHurt = time;
  }
  if (t.hp <= 0) { kill(t); return; }
  reactToHit(t, u);
}
// the struck side answers: soldiers fight back, guards call for help
function reactToHit(t, attacker) {
  if (!alive(attacker)) return;
  if (t.x0 !== undefined) { if (t.team === 'enemy') alertAllies(t, attacker, 320); else protect(t, attacker); return; }
  if (t.team === 'player') {
    if (t.type === 'civ') { flee(t); protect(t, attacker); }
    else if (t.order === 'idle') { t.order = 'attack'; t.target = attacker; t.repath = 0; }
    underAttackAlert(t);
  } else if (t.order !== 'attack') {
    t.order = 'attack'; t.target = attacker; t.repath = 0;
    alertAllies(t, attacker, 230);
  }
}
// idle soldiers near a civilian or the keep come to its defence
function protect(src, foe) {
  if (foe.kind !== 'unit') return;
  for (const o of units) if (!o.dead && o.team === 'player' && o.type !== 'civ' && o.order === 'idle' && Math.hypot(o.x - src.x, o.y - src.y) < 260) { o.order = 'attack'; o.target = foe; o.repath = 0; }
}
function flee(u) {
  const k = playerKeep(); if (!k || u.order === 'flee' || u.inside) return;
  u.order = 'flee'; const ap = approachPoint(u, k); u.path = findPath(u.x, u.y, ap.x, ap.y);
}
function alertAllies(src, foe, radius) {
  for (const o of units) {
    if (o.dead || o.team !== src.team || o === src || o.team === 'player') continue;
    if ((o.order === 'idle' || o.order === 'return') && Math.hypot(o.x - src.x, o.y - src.y) < radius) { o.order = 'attack'; o.target = foe; o.repath = 0; }
  }
}
function underAttackAlert(u) {
  if (alertCooldown > 0) return;
  const onScreen = u.x > cam.x && u.x < cam.x + vw / cam.z && u.y > cam.y && u.y < cam.y + vh / cam.z;
  if (!onScreen) { showBanner('Your soldiers are under attack!', 3); alertCooldown = 12; AudioSys.ui('warn'); }
}
function kill(t) {
  t.hp = 0; t.dead = true; t.deathT = 0;
  AudioSys.play(t.x0 !== undefined ? 'collapse' : isMachine(t) ? 'collapse' : 'fall', t.x, t.y);
  if (t.team === 'player' && t.kind === 'unit' && !isMachine(t) && started) mood = Math.max(0, mood - 3);
  if (t.type === 'king' && t.team === 'player') { mood = Math.max(0, mood - 25); showBanner('<b>Your King has fallen!</b> Your people are shaken (mood -25). Guard your keep.', 6); AudioSys.ui('warn'); }
  selection.delete(t);
  if (t.kind === 'moat') { for (let i = 0; i < 10; i++) spawn('dust', t.x + RR(-14, 14), t.y - 8, t.y); floatText(t.x, t.y - 30, 'Moat filled in', '#ffb38a'); }
  if (t.x0 !== undefined) {
    for (const o of units) if (!o.dead && o.onWall === t) { dismount(o); o.hp -= 15; o.flash = 1; if (o.hp <= 0) kill(o); }
    for (let i = 0; i < t.w; i++) for (let j = 0; j < t.h; j++) { setBlock(t.c + i, t.r + j, 0); if (t.kind === 'gate') gate[(t.r + j) * COLS + t.c + i] = 0; }
    for (let i = 0; i < 40; i++) spawn('smoke', t.x + RR(-30, 30), t.y - RR(0, 70), t.y);
    for (let i = 0; i < 30; i++) spawn('chip', t.x + RR(-25, 25), t.y - RR(10, 90), t.y);
  }
}

// ---------- particles ----------
function spawn(type, x, y, gy) {
  const p = { type, x, y, gy: gy === undefined ? y : gy, vx: 0, vy: 0, life: 0, max: 1, size: 2, g: 0 };
  if (type === 'spark') { p.vx = RR(-90, 90); p.vy = RR(-120, -30); p.g = 300; p.max = RR(0.2, 0.4); p.size = RR(1, 2); }
  else if (type === 'blood') { p.vx = RR(-40, 40); p.vy = RR(-60, -10); p.g = 260; p.max = RR(0.3, 0.5); p.size = RR(1.2, 2.2); }
  else if (type === 'chip') { p.vx = RR(-110, 110); p.vy = RR(-160, -40); p.g = 380; p.max = RR(0.5, 0.9); p.size = RR(1.5, 3.2); p.rot = RR(0, 6); }
  else if (type === 'dust') { p.vx = RR(-12, 12); p.vy = RR(-14, -4); p.max = RR(0.5, 0.8); p.size = RR(2, 4); }
  else if (type === 'smoke') { p.vx = RR(-14, 14); p.vy = RR(-40, -18); p.max = RR(1.4, 2.6); p.size = RR(6, 12); }
  else if (type === 'fire') { p.vx = RR(-10, 10); p.vy = RR(-60, -30); p.max = RR(0.35, 0.7); p.size = RR(3, 6); }
  particles.push(p);
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life += dt;
    if (p.life >= p.max) { particles.splice(i, 1); continue; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.rot !== undefined) p.rot += dt * 10;
  }
}
function drawParticles(g) {
  for (const p of particles) {
    const t = p.life / p.max, a = 1 - t;
    if (p.type === 'spark') { g.fillStyle = `rgba(255,${200 + 55 * a | 0},120,${a})`; g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    else if (p.type === 'blood') { g.fillStyle = `rgba(120,16,14,${a * 0.9})`; g.beginPath(); g.arc(p.x, p.y, p.size, 0, 7); g.fill(); }
    else if (p.type === 'chip') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = `rgba(122,86,48,${a})`; g.fillRect(-p.size, -p.size / 3, p.size * 2, p.size * 0.7); g.restore(); }
    else if (p.type === 'dust') { g.fillStyle = `rgba(150,130,95,${a * 0.35})`; g.beginPath(); g.arc(p.x, p.y, p.size * (1 + t), 0, 7); g.fill(); }
    else if (p.type === 'smoke') { g.fillStyle = `rgba(70,66,62,${a * 0.45})`; g.beginPath(); g.arc(p.x, p.y, p.size * (1 + t * 1.6), 0, 7); g.fill(); }
    else if (p.type === 'fire') { g.fillStyle = `rgba(255,${120 + 100 * a | 0},40,${a * 0.9})`; g.beginPath(); g.arc(p.x, p.y, p.size * (1 - t * 0.6), 0, 7); g.fill(); }
  }
}


// ---------- who is near whom: a grid of 64-pixel squares, refilled once a frame ----------
// Lets "who is close to me?" look at a handful of squares instead of every unit on the map, so the game
// stays smooth with many people. nearUnits returns a shared list: use it straight away, don't keep it or nest calls.
const UG = 64, UGW = Math.ceil(MW / UG) + 2, UGH = Math.ceil(MH / UG) + 2, unitGrid = Array.from({ length: UGW * UGH }, () => []), nearBuf = [];
function buildUnitGrid() {
  for (const c of unitGrid) c.length = 0;
  for (const u of units) { if (u.dead) continue; const cx = Math.max(0, Math.min(UGW - 1, Math.floor(u.x / UG) + 1)), cy = Math.max(0, Math.min(UGH - 1, Math.floor(u.y / UG) + 1)); unitGrid[cy * UGW + cx].push(u); }
}
function nearUnits(x, y, r) {
  nearBuf.length = 0;
  const x0 = Math.max(0, Math.floor((x - r) / UG) + 1), x1 = Math.min(UGW - 1, Math.floor((x + r) / UG) + 1), y0 = Math.max(0, Math.floor((y - r) / UG) + 1), y1 = Math.min(UGH - 1, Math.floor((y + r) / UG) + 1);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const c = unitGrid[cy * UGW + cx]; for (let i = 0; i < c.length; i++) nearBuf.push(c[i]); }
  return nearBuf;
}
