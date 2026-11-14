// Phase 4E: formations. Ten soldiers sent across open ground in each formation take that shape where they stop, stand
// facing the way they marched, and arrive together (a mixed group walks at the pace of the slowest). In line and wedge
// the bowmen stand behind the spearmen. Any number works (3 and 30 are tried too).
const { start } = require('./lib4b');
(async () => {
  const { p, need, done } = await start('cyyoung', { start: 0 });
  const r = await p.evaluate(() => {
    const angDiff = (b, a) => ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    // open ground: a square of 22 x 22 tiles with no building or water, away from the keep; its trees and rocks are
    // cleared first (as woodcutters would)
    const k = playerKeep(); let spot = null;
    const inSq = (x, y, c0, r0) => x >= c0 * TILE && x < (c0 + 22) * TILE && y >= r0 * TILE && y < (r0 + 22) * TILE;
    for (let rad = 14; rad < 90 && !spot; rad += 3) for (let a = 0; a < 16 && !spot; a++) {
      const c0 = Math.round(k.c + Math.cos(a / 16 * 6.283) * rad) - 11, r0 = Math.round(k.r + Math.sin(a / 16 * 6.283) * rad) - 11;
      if (c0 < 2 || r0 < 2 || c0 + 24 > COLS || r0 + 24 > ROWS) continue;
      if (structures.concat(farms).some(b => !b.dead && b.x1 > c0 * TILE && b.x0 < (c0 + 22) * TILE && b.y1 > r0 * TILE && b.y0 < (r0 + 22) * TILE)) continue;
      let wet = false; for (let c = c0; c < c0 + 22 && !wet; c++) for (let rr = r0; rr < r0 + 22 && !wet; rr++) if (riverTile[rr * COLS + c]) wet = true; if (wet) continue;
      for (const t of trees.slice()) if (!t.gone && inSq(t.x, t.y, c0, r0)) fellTree(t);
      for (const q of rocks) if (!q.gone && inSq(q.x, q.y, c0, r0)) { q.gone = true; setBlock(Math.floor(q.x / TILE), Math.floor(q.y / TILE), 0); }
      let ok = true; for (let c = c0; c < c0 + 22 && ok; c++) for (let rr = r0; rr < r0 + 22 && ok; rr++) if (tileBlocked(c, rr)) ok = false;
      if (ok) spot = { x0: c0 * TILE, y0: r0 * TILE, w: 22 * TILE };
    }
    if (!spot) return { noSpot: true };
    const sx = spot.x0 + 3 * TILE, sy = spot.y0 + spot.w / 2, tx = spot.x0 + spot.w - 6 * TILE, ty = sy;   // west to east
    const out = {}; const process4e = k2 => k2 === 'column' || k2 === 'wedge';
    const run = (kind, mk) => {
      for (const u of units) if (u.team === 'player' && u.tag4e) { u.dead = true; u.hp = 0; } window.__step(2);
      const l = mk().map((t, i) => { const u = makeUnit('player', t, sx + (i % 4) * 22, sy - 40 + Math.floor(i / 4) * 22); u.tag4e = true; return u; });
      window.__step(2);
      const m = commandMarch(l, tx, ty, kind); const arrived = new Map(), slot0 = new Map(l.map(u => [u, { x: u.dest.x, y: u.dest.y, path: u.path.length }]));
      for (let s = 0; s < 20 * 40 && arrived.size < l.length; s++) { window.__step(1); for (const u of l) if (!arrived.has(u) && u.order === 'idle' && !u.march) arrived.set(u, { t: time, face: u.faceAng }); }
      const fx = m.fx, fy = m.fy, rx = -fy, ry = fx, cx = l.reduce((a, u) => a + u.x, 0) / l.length, cy = l.reduce((a, u) => a + u.y, 0) / l.length;
      const pts = l.map(u => ({ t: u.type, l: (u.x - cx) * rx + (u.y - cy) * ry, f: (u.x - cx) * fx + (u.y - cy) * fy, d: Math.hypot(u.x - cx, u.y - cy) }));
      const rng = k2 => Math.max(...pts.map(q => q[k2])) - Math.min(...pts.map(q => q[k2]));
      const ds = pts.map(q => q.d), mean = ds.reduce((a, b) => a + b, 0) / ds.length, sd = Math.sqrt(ds.reduce((a, b) => a + (b - mean) ** 2, 0) / ds.length);
      const nn = l.map(u => Math.min(...l.filter(o => o !== u).map(o => Math.hypot(o.x - u.x, o.y - u.y)))), nnMean = nn.reduce((a, b) => a + b, 0) / nn.length;
      const times = [...arrived.values()].map(a => a.t), faced = [...arrived.values()].every(a => a.face !== null && a.face !== undefined && Math.abs(angDiff(a.face, m.heading)) < 0.05);
      const byF = pts.slice().sort((a, b) => b.f - a.f), third = Math.max(1, Math.floor(pts.length / 3));
      const spread = arr => Math.max(...arr.map(q => q.l)) - Math.min(...arr.map(q => q.l));
      const mel = pts.filter(q => q.t !== 'archer'), arc = pts.filter(q => q.t === 'archer');
      return { n: l.length, all: arrived.size === l.length, latR: Math.round(rng('l')), fwdR: Math.round(rng('f')), ringSd: +(sd / mean).toFixed(2), minD: Math.round(Math.min(...ds)), nn: Math.round(nnMean),
        frontSpread: Math.round(spread(byF.slice(0, third))), backSpread: Math.round(spread(byF.slice(-third))), gap: +(Math.max(...times) - Math.min(...times)).toFixed(1), faced,
        archersBehind: arc.length && mel.length ? +(mel.reduce((a, q) => a + q.f, 0) / mel.length - arc.reduce((a, q) => a + q.f, 0) / arc.length).toFixed(0) : null,
        ended: Math.round(Math.hypot(cx - tx, cy - ty)),
        detail: process4e(kind) ? l.map(u => { const s = slot0.get(u); return [Math.round((s.x - tx) * rx + (s.y - ty) * ry), Math.round((s.x - tx) * fx + (s.y - ty) * fy), Math.round((u.x - tx) * rx + (u.y - ty) * ry), Math.round((u.x - tx) * fx + (u.y - ty) * fy), s.path, u.order]; }) : undefined };
    };
    const ten = () => Array(10).fill('spear');
    for (const k2 of ['free', 'line', 'column', 'wedge', 'square', 'circle', 'loose']) out[k2] = run(k2, ten);
    out.mixedLine = run('line', () => ['archer', 'archer', 'archer', 'archer', 'spear', 'spear', 'spear', 'spear', 'knight', 'knight']);
    out.mixedFree = run('free', () => ['knight', 'knight', 'knight', 'spear', 'spear', 'archer', 'archer', 'archer', 'maceman', 'maceman']);
    out.three = run('wedge', () => ['spear', 'spear', 'spear']); out.thirty = run('line', () => Array(30).fill('spear'));
    return out;
  });
  if (r.noSpot) { need(false, 'found open ground for the formations'); await done(); return; }
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(10), JSON.stringify(v));
  const G = 30;
  for (const [k, v] of Object.entries(r)) { need(v.all, `${k}: all ${v.n} arrived`); need(v.faced, `${k}: all stand facing the way they marched`); need(v.ended < 60, `${k}: the group stopped where it was sent (${v.ended} points off)`); }
  need(r.line.latR >= 7 * G && r.line.fwdR <= G * 0.5, `line: side by side (${r.line.latR} across, ${r.line.fwdR} deep)`);
  need(r.column.latR <= G * 1.5 && r.column.fwdR >= 3.5 * G, `column: two abreast, one behind the other (${r.column.latR} across, ${r.column.fwdR} deep)`);
  need(r.wedge.frontSpread < r.wedge.backSpread, `wedge: narrow at the point, wide at the back (${r.wedge.frontSpread} / ${r.wedge.backSpread})`);
  need(r.square.minD >= G * 0.8 && Math.abs(r.square.latR - r.square.fwdR) <= G, `square: hollow, as wide as deep (middle empty to ${r.square.minD}; ${r.square.latR} x ${r.square.fwdR})`);
  need(r.circle.ringSd <= 0.15, `circle: all the same distance from the middle (spread ${r.circle.ringSd})`);
  need(r.loose.nn >= 1.5 * G && r.loose.nn > r.free.nn * 1.4, `loose: spread wide (neighbour ${r.loose.nn} against ${r.free.nn} in a block)`);
  need(r.mixedLine.archersBehind > 10, `line: the bowmen stand behind the spearmen and knights (${r.mixedLine.archersBehind} points)`);
  need(r.mixedFree.gap <= 3, `a mixed group (knights, spearmen, bowmen, macemen) arrives together (within ${r.mixedFree.gap} s)`);
  need(r.three.n === 3 && r.thirty.n === 30 && r.thirty.latR >= 10 * G, `any number: 3 in a wedge, 30 in a line (${r.thirty.latR} across)`);
  await done();
})();
