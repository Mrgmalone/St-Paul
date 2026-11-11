'use strict';
// Stronghold Destroyer — the one fixed isometric view.
// The world keeps its flat map coordinates (x east, y south, in pixels). The view tips that map 45 degrees and
// squashes it by half, the classic 2:1 isometric look, and stands everything upright on it:
//   screen x = (x - y) * ISO      screen y = (x + y) * ISO / 2 - height
// The ground (one picture of the whole map) is drawn through that tilt in a single step; people, trees and
// buildings are then drawn upright at their spot, farthest first. Everything is plain 2D canvas: no 3D engine.

const ISO = 0.8;
const isoX = (x, y) => (x - y) * ISO, isoY = (x, y) => (x + y) * ISO / 2;
let OX = 0, OY = 0, ICON_MODE = false;   // where the map's corner sits in the drawing (moves with the camera; icons set their own)
const P = (x, y, h = 0) => [(x - y) * ISO + OX, (x + y) * ISO / 2 - h + OY];
const depthOf = o => o.x0 !== undefined ? (o.x0 + o.x1 + o.y0 + o.y1) / 2 : o.x + o.y;

// ---------- faces of brick and wood ----------
let FLASH = 0;   // a building that was just hit glows for a moment
function facePath(g, ax, ay, bx, by, h0, h1) {
  const a0 = P(ax, ay, h0), a1 = P(ax, ay, h1), b1 = P(bx, by, h1), b0 = P(bx, by, h0);
  g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.lineTo(b1[0], b1[1]); g.lineTo(b0[0], b0[1]); g.closePath();
}
// draw on a wall face in its own flat coordinates: u along the wall from A, v downward from height h1
function onFace(g, ax, ay, bx, by, h1, fn) {
  const L = Math.hypot(bx - ax, by - ay) || 1, a = P(ax, ay, h1), b = P(bx, by, h1);
  g.save(); g.transform((b[0] - a[0]) / L, (b[1] - a[1]) / L, 0, 1, a[0], a[1]); fn(g, L); g.restore();
}
function fillFace(g, ax, ay, bx, by, h0, h1, mat, dark, scale = 0.5) {
  if (h1 - h0 <= 0.01) return;
  onFace(g, ax, ay, bx, by, h1, (g, L) => {
    const pat = typeof mat === 'string' && mat[0] !== '#' ? matPattern(g, mat, scale) : null;
    g.fillStyle = pat || (typeof mat === 'string' && mat[0] === '#' ? mat : '#8a7a66'); g.fillRect(0, 0, L, h1 - h0);
    if (dark > 0) { g.fillStyle = `rgba(14,10,8,${dark})`; g.fillRect(0, 0, L, h1 - h0); }
    const sh = g.createLinearGradient(0, h1 - h0 - 10, 0, h1 - h0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.28)'); g.fillStyle = sh; g.fillRect(0, Math.max(0, h1 - h0 - 10), L, Math.min(10, h1 - h0));
    if (FLASH > 0) { g.fillStyle = `rgba(255,240,220,${FLASH * 0.5})`; g.fillRect(0, 0, L, h1 - h0); }
  });
  facePath(g, ax, ay, bx, by, h0, h1); g.strokeStyle = 'rgba(16,10,6,0.55)'; g.lineWidth = 0.8; g.stroke();
}
function fillTop(g, x0, y0, x1, y1, h, mat, light = 0.12) {
  g.save(); g.transform(ISO, ISO / 2, -ISO, ISO / 2, OX, OY - h);
  const pat = typeof mat === 'string' && mat[0] !== '#' ? matPattern(g, mat, 0.45) : null;
  g.fillStyle = pat || mat; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (light > 0) { g.fillStyle = `rgba(255,246,226,${light})`; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
  if (FLASH > 0) { g.fillStyle = `rgba(255,240,220,${FLASH * 0.5})`; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
  g.strokeStyle = 'rgba(16,10,6,0.5)'; g.lineWidth = 0.9; g.strokeRect(x0, y0, x1 - x0, y1 - y0); g.restore();
}
// a solid block: the two faces toward you (south and east) and the top
function box(g, x0, y0, x1, y1, h0, h1, mat, top = mat) {
  fillFace(g, x0, y1, x1, y1, h0, h1, mat, 0.08);
  fillFace(g, x1, y1, x1, y0, h0, h1, mat, 0.3);
  if (top) fillTop(g, x0, y0, x1, y1, h1, top);
}
// crenellations along the top edge of a block, back ones first
function battlements(g, x0, y0, x1, y1, h, mat, m = 6) {
  const list = [], step = m * 2;
  const along = (ax, ay, bx, by) => { const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / step)); for (let i = 0; i < n; i++) { const t = (i + 0.25) / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t; list.push([x, y]); } };
  along(x0, y0, x1, y0); along(x1, y0, x1, y1); along(x1, y1, x0, y1); along(x0, y1, x0, y0);
  list.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  for (const [x, y] of list) { const cx = clamp(x, x0, x1 - m), cy = clamp(y, y0, y1 - m); box(g, cx, cy, cx + m, cy + m, h, h + m, mat); }
}
// a pitched roof; the ridge runs east-west (alongX) or north-south
function gableRoof(g, x0, y0, x1, y1, he, hr, col, wallMat, alongX) {
  const o = 3, R = (c, k) => shade(c, k);
  const poly = (pts, fill) => { g.beginPath(); pts.forEach(([x, y, h], i) => { const p = P(x, y, h); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = 'rgba(20,12,6,0.6)'; g.lineWidth = 0.9; g.stroke(); };
  const rows = (pts, n) => { g.save(); g.strokeStyle = 'rgba(30,16,8,0.35)'; g.lineWidth = 0.7; for (let i = 1; i < n; i++) { const t = i / n, a = pts[0].map((v, k) => v + (pts[1][k] - v) * t), b = pts[3].map((v, k) => v + (pts[2][k] - v) * t), pa = P(...a), pb = P(...b); g.beginPath(); g.moveTo(pa[0], pa[1]); g.lineTo(pb[0], pb[1]); g.stroke(); } g.restore(); };
  if (alongX) {
    const ym = (y0 + y1) / 2;
    const north = [[x0 - o, y0 - o, he], [x0 - o, ym, hr], [x1 + o, ym, hr], [x1 + o, y0 - o, he]];
    const south = [[x0 - o, ym, hr], [x0 - o, y1 + o, he], [x1 + o, y1 + o, he], [x1 + o, ym, hr]];
    poly(north, R(col, -0.25));
    g.beginPath(); [[x1, y0, he], [x1, ym, hr], [x1, y1, he]].forEach(([x, y, h], i) => { const p = P(x, y, h); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath();
    g.save(); g.clip(); fillFace(g, x1, y1, x1, y0, he, hr, wallMat, 0.3); g.restore();
    poly(south, R(col, 0)); rows(south, Math.max(3, Math.round((hr - he) / 6)));
  } else {
    const xm = (x0 + x1) / 2;
    const west = [[x0 - o, y0 - o, he], [xm, y0 - o, hr], [xm, y1 + o, hr], [x0 - o, y1 + o, he]];
    const east = [[xm, y0 - o, hr], [x1 + o, y0 - o, he], [x1 + o, y1 + o, he], [xm, y1 + o, hr]];
    poly(west, R(col, -0.05));
    g.beginPath(); [[x0, y1, he], [xm, y1, hr], [x1, y1, he]].forEach(([x, y, h], i) => { const p = P(x, y, h); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath();
    g.save(); g.clip(); fillFace(g, x0, y1, x1, y1, he, hr, wallMat, 0.08); g.restore();
    poly(east, R(col, -0.3)); rows(east, Math.max(3, Math.round((hr - he) / 6)));
  }
}
function pyramidRoof(g, x0, y0, x1, y1, he, hr, col) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, o = 3, A = P(cx, cy, hr);
  const tri = (a, b, k) => { const pa = P(a[0], a[1], he), pb = P(b[0], b[1], he); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(pa[0], pa[1]); g.lineTo(pb[0], pb[1]); g.closePath(); g.fillStyle = shade(col, k); g.fill(); g.strokeStyle = 'rgba(20,12,6,0.6)'; g.lineWidth = 0.9; g.stroke(); };
  const nw = [x0 - o, y0 - o], ne = [x1 + o, y0 - o], se = [x1 + o, y1 + o], sw = [x0 - o, y1 + o];
  tri(nw, ne, -0.2); tri(sw, nw, -0.1); tri(sw, se, 0.02); tri(se, ne, -0.3);
}
// a round tower: the near half of a cylinder, a lit stripe and a shadowed side
function cylinder(g, cx, cy, r, h0, h1, mat) {
  const rx = r * ISO * Math.SQRT2, ry = rx / 2, c0 = P(cx, cy, h0), c1 = P(cx, cy, h1);
  g.save(); g.beginPath(); g.moveTo(c1[0] - rx, c1[1]); g.lineTo(c0[0] - rx, c0[1]); g.ellipse(c0[0], c0[1], rx, ry, 0, Math.PI, 0, true); g.lineTo(c1[0] + rx, c1[1]); g.ellipse(c1[0], c1[1], rx, ry, 0, 0, Math.PI, false); g.closePath();
  g.clip(); const pat = matPattern(g, mat, 0.5); g.fillStyle = pat || '#8a8a86'; g.fillRect(c0[0] - rx, c1[1] - ry, rx * 2, c0[1] - c1[1] + ry * 2);
  const sh = g.createLinearGradient(c0[0] - rx, 0, c0[0] + rx, 0); sh.addColorStop(0, 'rgba(10,8,6,0.28)'); sh.addColorStop(0.3, 'rgba(255,240,220,0.08)'); sh.addColorStop(0.55, 'rgba(0,0,0,0.05)'); sh.addColorStop(1, 'rgba(10,8,6,0.5)');
  g.fillStyle = sh; g.fillRect(c0[0] - rx, c1[1] - ry, rx * 2, c0[1] - c1[1] + ry * 2);
  if (FLASH > 0) { g.fillStyle = `rgba(255,240,220,${FLASH * 0.5})`; g.fillRect(c0[0] - rx, c1[1] - ry, rx * 2, c0[1] - c1[1] + ry * 2); }
  g.restore();
  g.save(); g.beginPath(); g.ellipse(c1[0], c1[1], rx, ry, 0, 0, Math.PI * 2); g.clip(); g.translate(0, 0);
  g.transform(ISO, ISO / 2, -ISO, ISO / 2, OX, OY - h1); const tp = matPattern(g, mat, 0.45); g.fillStyle = tp || '#8a8a86'; g.fillRect(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3); g.restore();
  g.save(); g.fillStyle = 'rgba(255,246,226,0.12)'; g.beginPath(); g.ellipse(c1[0], c1[1], rx, ry, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(16,10,6,0.6)'; g.lineWidth = 0.9; g.stroke(); g.restore();
}
function ringMerlons(g, cx, cy, r, h, mat, n = 12) {
  const list = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; list.push([cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3)]); }
  list.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  for (const [x, y] of list) box(g, x - 3, y - 3, x + 3, y + 3, h, h + 6, mat);
}
// a door with a round arch, on a south or east face
function door(g, ax, ay, bx, by, h0, w, hgt, at = 0.5) {
  onFace(g, ax, ay, bx, by, h0 + hgt, (g, L) => {
    const c = L * at; g.beginPath(); g.moveTo(c - w / 2, hgt); g.lineTo(c - w / 2, w / 2); g.arc(c, w / 2, w / 2, Math.PI, 0); g.lineTo(c + w / 2, hgt); g.closePath();
    g.fillStyle = '#4a3220'; g.fill(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(c - w / 2, w / 2, w / 2, hgt - w / 2);
    g.strokeStyle = '#2a1a0e'; g.lineWidth = 0.8; for (let x = c - w / 2 + 3; x < c + w / 2; x += 3.5) { g.beginPath(); g.moveTo(x, w * 0.3); g.lineTo(x, hgt); g.stroke(); }
    g.strokeStyle = 'rgba(230,210,170,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(c - w / 2 - 1.5, hgt); g.lineTo(c - w / 2 - 1.5, w / 2); g.arc(c, w / 2, w / 2 + 1.5, Math.PI, 0); g.lineTo(c + w / 2 + 1.5, hgt); g.stroke();
  });
}
function windows(g, ax, ay, bx, by, h, n, wh = 7) {
  onFace(g, ax, ay, bx, by, h, (g, L) => { for (let i = 0; i < n; i++) { const x = L * (i + 0.5) / n; g.fillStyle = '#1e1610'; g.fillRect(x - 2, 0, 4, wh); g.fillStyle = 'rgba(255,200,120,0.25)'; g.fillRect(x - 2, 0, 4, 2); } });
}
function banner(g, x, y, h, len, col, t, lion) {
  const p = P(x, y, h), wav = Math.sin(t * 3 + x * 0.01) * 1.5;
  g.save(); g.strokeStyle = '#3a2a18'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0], p[1] - len - 6); g.stroke();
  g.fillStyle = col; g.beginPath(); g.moveTo(p[0], p[1] - len - 6); g.quadraticCurveTo(p[0] + 9, p[1] - len - 4 + wav, p[0] + 18, p[1] - len - 2 + wav); g.lineTo(p[0] + 16, p[1] - len + 8 + wav); g.quadraticCurveTo(p[0] + 8, p[1] - len + 6, p[0], p[1] - len + 8); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.7; g.stroke();
  if (lion) drawLion(g, p[0] + 8.5, p[1] - len + 1 + wav * 0.5, 11, '#e8b64a');
  g.restore();
}
const teamCloth = b => (b.team === 'enemy' ? '#2e2a28' : PAL.player.tunic);
// which brick each building is built from (the sheet's four sets)
function brickOf(b) {
  if (b.team === 'enemy') return 'brick_blackgreen';
  if (b.kind === 'chapel' || b.kind === 'garden') return 'brick_green';
  if (['keep', 'highwall', 'stairs', 'stower', 'greattower', 'lookout', 'roundtower', 'quarry', 'ironmine'].includes(b.kind)) return 'brick_gray';
  return 'brick_brown';
}
const ROOF = { tile: '#a2502e', thatch: '#9c8048', slate: '#4e5560', wood: '#6e4c2c' };

// ---------- walls that join their neighbours ----------
let wallMap = null, wallMapN = -1;
function wallAt(c, r) {
  if (wallMapN !== structures.length) { wallMap = new Map(); for (const s of structures) if (!s.dead && s.c !== undefined) for (let i = 0; i < (s.w || 1); i++) for (let j = 0; j < (s.h || 1); j++) wallMap.set((s.c + i) + ',' + (s.r + j), s); wallMapN = structures.length; }
  const s = wallMap.get(c + ',' + r); return s && !s.dead ? s : null;
}
const JOINS = { wall: 1, gate: 1, highwall: 1, gtower: 1, stower: 1, greattower: 1, lookout: 1, roundtower: 1, keep: 1, stairs: 1, tower: 1 };
function drawWallPiece(g, b, high) {
  const mat = brickOf(b), H = high ? 88 : 30, t = high ? 11 : 8, cx = b.x0 + 16, cy = b.y0 + 16;
  const join = (dc, dr) => { const o = wallAt(b.c + dc, b.r + dr); return o && JOINS[o.kind] && o !== b; };
  const W = join(-1, 0), E = join(1, 0), N = join(0, -1), S = join(0, 1);
    // pieces back to front: the north and west arms, the post, the south and east arms
  const parts = [];
  if (N) parts.push([cx - t, b.y0, cx + t, cy - t]); if (W) parts.push([b.x0, cy - t, cx - t, cy + t]);
  parts.push([cx - t, cy - t, cx + t, cy + t]);
  if (E) parts.push([cx + t, cy - t, b.x1, cy + t]); if (S) parts.push([cx - t, cy + t, cx + t, b.y1]);
  for (const [x0, y0, x1, y1] of parts) box(g, x0, y0, x1, y1, 0, H, mat);
  const m = high ? 6 : 5;
  for (const [x0, y0, x1, y1] of parts) {
    if (x1 - x0 > y1 - y0) { for (let x = x0; x < x1 - 1; x += m * 2) { box(g, x, y0, Math.min(x + m, x1), y0 + 3, H, H + m, mat); } for (let x = x0; x < x1 - 1; x += m * 2) box(g, x, y1 - 3, Math.min(x + m, x1), y1, H, H + m, mat); }
    else { for (let y = y0; y < y1 - 1; y += m * 2) box(g, x0, y, x0 + 3, Math.min(y + m, y1), H, H + m, mat); for (let y = y0; y < y1 - 1; y += m * 2) box(g, x1 - 3, y, x1, Math.min(y + m, y1), H, H + m, mat); }
  }
}
function drawGateIso(g, b) {
  const mat = brickOf(b), ns = b.dir % 2 === 1, x0 = b.x0, y0 = b.y0, x1 = b.x1, y1 = b.y1, H = 40;
  if (!ns) { box(g, x0, y0 + 4, x0 + 9, y1 - 4, 0, H, mat); box(g, x1 - 9, y0 + 4, x1, y1 - 4, 0, H, mat); box(g, x0, y0 + 4, x1, y1 - 4, H - 10, H, mat); door(g, x0 + 9, y1 - 4, x1 - 9, y1 - 4, 0, 13, H - 12, 0.5); }
  else { box(g, x0 + 4, y0, x1 - 4, y0 + 9, 0, H, mat); box(g, x0 + 4, y1 - 9, x1 - 4, y1, 0, H, mat); box(g, x0 + 4, y0, x1 - 4, y1, H - 10, H, mat); door(g, x1 - 4, y1 - 9, x1 - 4, y0 + 9, 0, 13, H - 12, 0.5); }
  battlements(g, x0 + (ns ? 4 : 0), y0 + (ns ? 0 : 4), x1 - (ns ? 4 : 0), y1 - (ns ? 0 : 4), H, mat, 5);
  banner(g, x0 + 16, y0 + 16, H + 5, 12, teamCloth(b), time, b.team !== 'enemy');
}

// ---------- every building, built from the sheet's bricks ----------
function drawBuildingIso(g, b, t) {
  if (b.dead) { drawRubble(g, b); return; }
  FLASH = b.flash > 0 ? Math.min(1, b.flash) : 0; b_done_now = b.done !== false && !ICON_MODE;
  const k = b.kind, mat = brickOf(b), i = 3, x0 = b.x0 + i, y0 = b.y0 + i, x1 = b.x1 - i, y1 = b.y1 - i;
  const ridgeX = (b.dir || 0) % 2 === 0, doorS = (b.dir || 0) === 0, doorE = (b.dir || 0) === 3;
  const frontDoor = (h, w = 12, dh = 18) => { if (doorE) door(g, x1, y1, x1, y0, 0, w, dh); else if (doorS || b.dir === undefined || (b.dir !== 1 && b.dir !== 2)) door(g, x0, y1, x1, y1, 0, w, dh); };
  const house = (hw, hr, roofCol, opts = {}) => { box(g, x0, y0, x1, y1, 0, hw, mat, null); frontDoor(hw, opts.dw || 12, opts.dh || Math.min(20, hw - 6)); if (opts.win) { windows(g, x0, y1, x1, y1, hw - 12, opts.win); windows(g, x1, y1, x1, y0, hw - 12, opts.win); } gableRoof(g, x0, y0, x1, y1, hw, hr, roofCol, mat, ridgeX); };
  switch (k) {
    case 'keep': {
      const H = 96; box(g, x0 + 6, y0 + 6, x1 - 6, y1 - 6, 0, H, mat); door(g, x0 + 6, y1 - 6, x1 - 6, y1 - 6, 0, 18, 26); windows(g, x0 + 6, y1 - 6, x1 - 6, y1 - 6, 64, 3, 10); windows(g, x1 - 6, y1 - 6, x1 - 6, y0 + 6, 64, 3, 10);
      battlements(g, x0 + 6, y0 + 6, x1 - 6, y1 - 6, H, mat, 7);
      for (const [cx, cy] of [[x0 + 10, y0 + 10], [x0 + 10, y1 - 10], [x1 - 10, y0 + 10], [x1 - 10, y1 - 10]].sort((a, c) => a[0] + a[1] - c[0] - c[1])) { cylinder(g, cx, cy, 11, 0, 118, mat); ringMerlons(g, cx, cy, 11, 118, mat, 8); }
      banner(g, (x0 + x1) / 2, (y0 + y1) / 2, H + 6, 26, teamCloth(b), t, b.team !== 'enemy'); break; }
    case 'tower': { const H = 168; box(g, x0 + 6, y0 + 6, x1 - 6, y1 - 6, 0, H, mat); door(g, x0 + 6, y1 - 6, x1 - 6, y1 - 6, 0, 12, 20); windows(g, x0 + 6, y1 - 6, x1 - 6, y1 - 6, 120, 2, 12); battlements(g, x0 + 6, y0 + 6, x1 - 6, y1 - 6, H, mat, 6); banner(g, b.x, (y0 + y1) / 2, H + 6, 22, teamCloth(b), t, false); break; }
    case 'wall': drawWallPiece(g, b, false); break;
    case 'highwall': drawWallPiece(g, b, true); break;
    case 'gate': drawGateIso(g, b); break;
    case 'stairs': { for (let s = 0; s < 6; s++) { const f = s / 6; box(g, x0, y0, x1, y1 - (y1 - y0) * f, 0, 16 * (s + 1), mat); } break; }
    case 'gtower': { const H = 92; box(g, x0 + 4, y0 + 4, x1 - 4, y1 - 4, 0, H, mat); door(g, x0 + 4, y1 - 4, x1 - 4, y1 - 4, 0, 11, 18); battlements(g, x0 + 4, y0 + 4, x1 - 4, y1 - 4, H, mat, 6); banner(g, b.x, (y0 + y1) / 2, H + 6, 18, teamCloth(b), t, b.team !== 'enemy'); break; }
    case 'stower': { const H = 128; box(g, x0 + 2, y0 + 2, x1 - 2, y1 - 2, 0, H, mat); door(g, x0 + 2, y1 - 2, x1 - 2, y1 - 2, 0, 12, 20); windows(g, x1 - 2, y1 - 2, x1 - 2, y0 + 2, 90, 1, 12); battlements(g, x0 + 2, y0 + 2, x1 - 2, y1 - 2, H, mat, 7); banner(g, b.x, (y0 + y1) / 2, H + 6, 20, teamCloth(b), t, b.team !== 'enemy'); break; }
    case 'greattower': { const H = 150; box(g, x0, y0, x1, y1, 0, H, mat); door(g, x0, y1, x1, y1, 0, 16, 24); windows(g, x0, y1, x1, y1, 100, 2, 14); windows(g, x1, y1, x1, y0, 100, 2, 14); battlements(g, x0, y0, x1, y1, H, mat, 8); banner(g, b.x, (y0 + y1) / 2, H + 7, 24, teamCloth(b), t, b.team !== 'enemy'); break; }
    case 'lookout': { const H = 239; box(g, x0 + 10, y0 + 10, x1 - 10, y1 - 10, 0, H - 14, mat); box(g, x0 + 2, y0 + 2, x1 - 2, y1 - 2, H - 14, H, mat); door(g, x0 + 10, y1 - 10, x1 - 10, y1 - 10, 0, 10, 18); battlements(g, x0 + 2, y0 + 2, x1 - 2, y1 - 2, H, mat, 5); banner(g, b.x, (y0 + y1) / 2, H + 6, 18, teamCloth(b), t, b.team !== 'enemy'); break; }
    case 'roundtower': { const r = (x1 - x0) / 2 - 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, H = 136; cylinder(g, cx, cy, r, 0, H, mat); door(g, cx - r * 0.7, cy + r * 0.7, cx + r * 0.7, cy + r * 0.7, 0, 13, 22); ringMerlons(g, cx, cy, r, H, mat, 16); if (b.engine) drawTowerEngine(g, b, cx, cy, H, t); else banner(g, cx, cy, H + 6, 22, teamCloth(b), t, b.team !== 'enemy'); break; }
    case 'house': house(32, 62, ROOF.tile, { win: 1 }); break;
    case 'woodhut': house(24, 46, ROOF.thatch); logPile(g, x0 - 2, (y0 + y1) / 2, 0); break;
    case 'granary': house(36, 66, ROOF.thatch, { win: 1 }); break;
    case 'bakery': house(30, 56, ROOF.tile, { win: 1 }); chimney(g, x1 - 10, y0 + 10, 66, t); break;
    case 'brewery': house(32, 58, ROOF.wood, { win: 1 }); barrels(g, x1 + 1, y1 - 6); break;
    case 'tavern': house(34, 66, ROOF.tile, { win: 2 }); break;
    case 'smithy': house(30, 54, ROOF.slate); chimney(g, x0 + 10, y0 + 10, 64, t, true); break;
    case 'armory': house(34, 60, ROOF.slate, { win: 1 }); break;
    case 'bowyer': case 'poleturner': house(28, 52, ROOF.wood, { win: 1 }); break;
    case 'mill': { house(46, 78, ROOF.thatch, { win: 1 }); millSails(g, b, x0, y1, x1, y1, t); break; }
    case 'chapel': { house(44, 84, ROOF.slate, { win: 2, dw: 14, dh: 24 }); const cx = x1 - 9, cy = y1 - 9; box(g, cx - 7, cy - 7, cx + 7, cy + 7, 0, 92, mat); pyramidRoof(g, cx - 7, cy - 7, cx + 7, cy + 7, 92, 112, ROOF.slate); break; }
    case 'market': { const n = 3; for (let s = 0; s < n; s++) { const sx0 = x0 + (x1 - x0) * s / n + 2, sx1 = x0 + (x1 - x0) * (s + 1) / n - 2; box(g, sx0, y0 + 8, sx1, y1 - 4, 0, 10, 'brick_brown'); awning(g, sx0 - 2, y0 + 4, sx1 + 2, y1, 26, s % 2 ? '#e8d8b0' : teamCloth(b)); } break; }
    case 'stockpile': { box(g, x0, y0, x1, y1, 0, 4, ROOF.wood); logPile(g, x0 + 6, y0 + 10, 4); stoneStack(g, x1 - 18, y1 - 18, 4); break; }
    case 'quarry': { box(g, x0, y0, x1, y1, 0, 6, mat); stoneStack(g, x0 + 4, y0 + 4, 6); stoneStack(g, x1 - 20, y1 - 18, 6); crane(g, x0 + 12, y1 - 6, t); break; }
    case 'ironmine': { box(g, x0 + 4, y0 + 4, x1 - 4, y1 - 4, 0, 34, mat); door(g, x0 + 4, y1 - 4, x1 - 4, y1 - 4, 0, 16, 22); gableRoof(g, x0 + 4, y0 + 4, x1 - 4, y1 - 4, 34, 50, ROOF.wood, mat, ridgeX); break; }
    case 'stocks': { box(g, x0 + 6, y0 + 12, x0 + 9, y1 - 12, 0, 24, ROOF.wood); box(g, x1 - 9, y0 + 12, x1 - 6, y1 - 12, 0, 24, ROOF.wood); box(g, x0 + 4, y0 + 13, x1 - 4, y1 - 13, 16, 22, ROOF.wood); break; }
    case 'garden': { for (const [gx, gy] of [[x0 + 8, y0 + 8], [x1 - 8, y0 + 8], [x0 + 8, y1 - 8], [x1 - 8, y1 - 8], [(x0 + x1) / 2, (y0 + y1) / 2]]) { const p = P(gx, gy, 0); g.fillStyle = '#2f5a24'; g.beginPath(); g.ellipse(p[0], p[1] - 6, 8, 7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e88aa8'; g.beginPath(); g.arc(p[0] - 2, p[1] - 9, 1.6, 0, 7); g.arc(p[0] + 3, p[1] - 7, 1.4, 0, 7); g.fill(); } break; }
    case 'hopfarm': { for (let gx = x0 + 8; gx < x1; gx += 14) for (let gy = y0 + 8; gy < y1; gy += 14) { const p = P(gx, gy, 0); g.strokeStyle = '#6e4c2c'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0], p[1] - 24); g.stroke(); g.fillStyle = `rgba(90,140,60,${0.4 + 0.6 * clamp((b.amount || 0) / (b.max || 40), 0, 1)})`; g.beginPath(); g.ellipse(p[0], p[1] - 14, 3.5, 9, 0, 0, Math.PI * 2); g.fill(); } break; }
    default: if (!isField(k) && k !== 'moat' && k !== 'pit') house(30, 54, ROOF.wood);
  }
  FLASH = 0;
}
function drawRubble(g, b) {
  const mat = brickOf(b), n = Math.min(14, 3 * (b.w || 1) * (b.h || 1));
  const R = mulberry32(b.id * 977 + 3), pts = [];
  for (let i = 0; i < n; i++) pts.push([b.x0 + 4 + R() * (b.x1 - b.x0 - 12), b.y0 + 4 + R() * (b.y1 - b.y0 - 12), 3 + R() * 5]);
  pts.sort((a, c) => a[0] + a[1] - c[0] - c[1]);
  for (const [x, y, s] of pts) box(g, x, y, x + s, y + s * 0.8, 0, s * 0.7, mat);
}
function logPile(g, x, y, h0) { for (let i = 0; i < 3; i++) for (let j = 0; j <= i; j++) { const p = P(x + j * 3, y + 2, h0 + (2 - i) * 4.5 + 3); g.fillStyle = '#7a5530'; g.beginPath(); g.ellipse(p[0] + j * 6 - i * 3, p[1], 3, 2.6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c7a06a'; g.beginPath(); g.ellipse(p[0] + j * 6 - i * 3, p[1], 1.8, 1.5, 0, 0, Math.PI * 2); g.fill(); } }
function stoneStack(g, x, y, h0) { box(g, x, y, x + 14, y + 12, h0, h0 + 7, 'brick_gray'); box(g, x + 3, y + 2, x + 11, y + 10, h0 + 7, h0 + 13, 'brick_gray'); }
function barrels(g, x, y) { for (let i = 0; i < 2; i++) { const p = P(x + 3, y - i * 9, 0); g.fillStyle = '#6a4424'; g.fillRect(p[0] - 4, p[1] - 10, 8, 10); g.fillStyle = '#3a2614'; g.fillRect(p[0] - 4, p[1] - 8, 8, 1.4); g.fillRect(p[0] - 4, p[1] - 3, 8, 1.4); g.fillStyle = '#8a5a30'; g.beginPath(); g.ellipse(p[0], p[1] - 10, 4, 2, 0, 0, 7); g.fill(); } }
let b_done_now = true;
function chimney(g, x, y, h, t, forge) { box(g, x - 3, y - 3, x + 3, y + 3, h - 22, h, 'brick_gray'); if (b_done_now && Math.random() < (forge ? 0.08 : 0.04)) spawn('smoke', x, y - h - 4, y); }
function awning(g, x0, y0, x1, y1, h, col) { const a = P(x0, y1, h - 8), b = P(x1, y1, h - 8), c = P(x1, y0, h), d = P(x0, y0, h); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(20,12,6,0.6)'; g.lineWidth = 0.8; g.stroke(); for (const x of [x0 + 1, x1 - 1]) { const p = P(x, y1, 0), q = P(x, y1, h - 8); g.strokeStyle = '#5a3c20'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); } }
function crane(g, x, y, t) { const p = P(x, y, 0); g.strokeStyle = '#6e4c2c'; g.lineWidth = 2; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0], p[1] - 34); g.lineTo(p[0] + 18, p[1] - 30); g.stroke(); g.lineWidth = 0.8; g.beginPath(); g.moveTo(p[0] + 16, p[1] - 30); g.lineTo(p[0] + 16, p[1] - 16 + Math.sin(t) * 2); g.stroke(); }
function millSails(g, b, ax, ay, bx, by, t) {
  const c = P((ax + bx) / 2, ay + 2, 40), a0 = (b.done ? t * 1.2 : 0);
  g.save(); g.translate(c[0], c[1]); g.strokeStyle = '#4a3220'; g.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2; g.save(); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -30); g.stroke(); g.fillStyle = 'rgba(232,220,190,0.9)'; g.fillRect(1, -30, 7, 22); g.strokeStyle = 'rgba(60,40,20,0.6)'; g.lineWidth = 0.6; g.strokeRect(1, -30, 7, 22); g.restore(); }
  g.fillStyle = '#3a2614'; g.beginPath(); g.arc(0, 0, 2.6, 0, 7); g.fill(); g.restore();
}
function drawTowerEngine(g, b, cx, cy, H, t) {
  const p = P(cx, cy, H); g.save(); g.translate(p[0], p[1]);
  g.fillStyle = '#6e4c2c'; g.fillRect(-12, -6, 24, 6); g.strokeStyle = '#4a3220'; g.lineWidth = 2.4;
  if (b.engine === 'trebuchet') { g.beginPath(); g.moveTo(-8, 0); g.lineTo(0, -26); g.lineTo(8, 0); g.stroke(); g.beginPath(); g.moveTo(-14, -14 + Math.sin(t) * 2); g.lineTo(18, -32); g.stroke(); }
  else { g.beginPath(); g.moveTo(-14, -10); g.lineTo(14, -12); g.stroke(); g.strokeStyle = '#2a1a0e'; g.lineWidth = 1; g.beginPath(); g.moveTo(-14, -10); g.lineTo(0, -16); g.lineTo(14, -12); g.stroke(); }
  g.restore();
}
// the flat part of a building that lies on the ground: fields, moats and pits, the outline of a building site
function drawBuildingGround(g, b, t) {
  if (b.kind === 'moat' || b.kind === 'pit') { drawBuilding(g, b, t); return; }
  if (isField(b.kind) && !b.dead) {
    const f = clamp((b.amount || 0) / (b.max || 40), 0, 1), x0 = b.x0 + 2, y0 = b.y0 + 2, w = b.x1 - b.x0 - 4, h = b.y1 - b.y0 - 4;
    const pat = matPattern(g, 'dirt', 0.6); g.fillStyle = pat || '#7a5c3a'; g.fillRect(x0, y0, w, h); g.fillStyle = 'rgba(60,40,20,0.25)'; g.fillRect(x0, y0, w, h);
    const crop = b.kind === 'wheatfarm' ? [196, 170, 80] : [92, 140, 58];
    for (let r = y0 + 4; r < y0 + h; r += 7) { g.fillStyle = `rgba(${crop[0]},${crop[1]},${crop[2]},${0.35 + 0.65 * f})`; g.fillRect(x0 + 3, r, w - 6, 3 + 1.5 * f); }
    g.strokeStyle = '#5a3c20'; g.lineWidth = 2; g.strokeRect(x0, y0, w, h);
  }
}
