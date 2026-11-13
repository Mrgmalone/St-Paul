'use strict';
// Stronghold Destroyer — Phase 4C, steps C3 and C4: walls along the exact route drawn, moats and who may fill them, spikes.
// The list of moat-fillers is ONE setting, MOAT_FILLERS in settings.js.

// ---------- walls, fences and gates follow the route you draw ----------
// the squares under the stroke, joined so there are no gaps (a straight line between two clicks when there is no stroke)
function routeTiles(pts) {
  const out = []; for (let i = 0; i < pts.length; i++) { const seg = i === 0 ? [pts[0]] : wallLine(pts[i - 1].c, pts[i - 1].r, pts[i].c, pts[i].r);
    for (const t of seg) { const l = out[out.length - 1]; if (!l || l.c !== t.c || l.r !== t.r) out.push(t); } }
  return out;
}
// trees, loose rocks and berry bushes in the way are cleared (buildings, fields, water and iron are left as gaps; gates stay open)
function clearForWall(c, r) {
  const k = playerKeep(); if (!k || Math.hypot((c + 0.5) * TILE - k.x, (r + 0.5) * TILE - (k.y0 + k.y1) / 2) > TERRITORY) return;
  for (const t of trees.slice()) if (!t.gone && t.c === c && t.r === r) fellTree(t);
  for (const rk of rocks) if (!rk.gone && !rk.iron && Math.floor(rk.x / TILE) === c && Math.floor((rk.y - 6) / TILE) === r) breakRock(rk);
  for (const b of bushes) if (!b.cleared && b.x > c * TILE - 8 && b.x < c * TILE + TILE + 8 && b.y > r * TILE - 8 && b.y < r * TILE + TILE + 8) { b.cleared = true; b.amount = 0; b.max = 0; }
}
// the stroke being drawn (mouse held down, or a finger moving) adds the square under it
function recordRoute(sx, sy) {
  if (!IND() || !placing || !isLine(placing.kind) || !placing.start) return;
  const w = toWorld(sx, sy); if (!w) return; const t = tileFor(placing.kind, w.x, w.y); placing.route = placing.route || [placing.start];
  const l = placing.route[placing.route.length - 1]; if (l.c !== t.c || l.r !== t.r) placing.route.push(t);
}

// ---------- moats: who fills them, and how ----------
// citizens are sent to a moat to fill it; soldiers who may fill it go at it with their weapons; filled, it is ordinary ground for good
function commandFill(list, m) {
  for (const u of list) { if (!canFillMoat(u)) continue; if (u.type === 'civ') { u.order = 'fill'; u.fillT = m; u.path = []; u.task = null; u.job = null; u.crafting = null; u.manualT = time; } else commandAttack([u], m); }
}
function fillBrain(u, dt) {
  let m = u.fillT;
  if (!m || m.dead) {   // that square is filled: the next square of the same moat, if there is one close by
    const nx = m ? structures.find(o => o.kind === 'moat' && !o.dead && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 48) : null;
    if (nx) { u.fillT = m = nx; u.path = []; } else { u.order = 'idle'; u.fillT = null; return; }
  }
  if (edgeDist(u, m) > 12 && !(stalled(u) && edgeDist(u, m) < 36)) { if (!u.path.length || u.repath <= 0) { const ap = approachPoint(u, m); u.path = findPath(u.x, u.y, ap.x, ap.y); u.repath = 2; } followPath(u, dt); return; }
  u.path = []; u.moving = false; u.facing = m.x >= u.x ? 1 : -1;
  if (u.attackAnim === 0) { u.attackAnim = 0.001; AudioSys.play('chop', u.x, u.y); }
  m.hp -= MOAT.fillPerSecond * dt; if (Math.random() < dt * 4) spawn('dust', m.x + RR(-12, 12), m.y - 4, m.y);
  if (m.hp <= 0) { kill(m); m.filled = true; floatText(m.x, m.y - 30, 'Filled: ordinary ground now', '#e9dcbc'); }
}
