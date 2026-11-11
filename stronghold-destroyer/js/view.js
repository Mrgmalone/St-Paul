'use strict';
// Stronghold Destroyer — drawing the battlefield in the fixed isometric view (see js/iso.js for the projection),
// and turning a tap on the screen back into a spot on the map.

// ---------- camera: cam.x / cam.y are the top-left of the view on the tilted map, cam.z the zoom ----------
const MIN_Z = 0.42, MAX_Z = 2.4;
function minZoom() { return MIN_Z; }
function clampCam() {
  const c = toWorld(vw / 2, vh / 2), x = clamp(c.x, 0, MW), y = clamp(c.y, 0, MH);
  if (x !== c.x || y !== c.y) { cam.x = isoX(x, y) - vw / cam.z / 2; cam.y = isoY(x, y) - vh / cam.z / 2; }
}
function toWorld(sx, sy) { const X = sx / cam.z + cam.x, Y = sy / cam.z + cam.y, a = X / ISO, b = 2 * Y / ISO; return { x: (a + b) / 2, y: (b - a) / 2 }; }
function screenOf(x, y, h = 0) { return { x: (isoX(x, y) - cam.x) * cam.z, y: (isoY(x, y) - h - cam.y) * cam.z, ok: true }; }
function centerOn(x, y) { cam.x = isoX(x, y) - vw / cam.z / 2; cam.y = isoY(x, y) - vh / cam.z / 2; clampCam(); }
const viewCenter = () => toWorld(vw / 2, vh / 2);
// is a map spot on screen (with a margin in screen pixels)?
function onView(x, y, m = 40) { const s = screenOf(x, y); return s.x > -m && s.x < vw + m && s.y > -m && s.y < vh + m * 2; }
// zoom around a screen point, keeping the spot under it still
function zoomAt(sx, sy, nz) { const X = sx / cam.z + cam.x, Y = sy / cam.z + cam.y; cam.z = clamp(nz, MIN_Z, MAX_Z); cam.x = X - sx / cam.z; cam.y = Y - sy / cam.z; clampCam(); }
function panScreen(dx, dy) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); }

// ---------- picking ----------
const unitScreenBox = u => { const e = elev2D(u), s = screenOf(u.x, u.y, e), art = artOf(u), H = (art ? (ART_H[art] || 52) : isMachine(u) ? 52 : 48) * (u.type === 'king' || u.lord ? 1.15 : 1) * cam.z, W = (isMachine(u) ? 46 : u.type === 'knight' ? 40 : 24) * cam.z; return { x0: s.x - W / 2, x1: s.x + W / 2, y0: s.y - H, y1: s.y + 6 * cam.z, d: u.x + u.y + (u.onWall ? 400 : 0) }; };
function pickScreen(sx, sy) {
  let best = null, bd = -1e9;
  for (const u of units) { if (u.dead || u.inside) continue; const b = unitScreenBox(u); if (sx > b.x0 - 4 && sx < b.x1 + 4 && sy > b.y0 - 4 && sy < b.y1 + 4 && b.d > bd) { bd = b.d; best = u; } }
  if (best) return best;
  return structureAtScreen(sx, sy);
}
// a building is hit if some height up its walls lies under the finger
function structureAtScreen(sx, sy) {
  let best = null, bd = -1e9;
  for (const s of structures) {
    if (s.dead) continue; const top = s.topH || 30;
    for (let h = 0; h <= top; h += 8) { const w = toWorld(sx, sy + h * cam.z); if (w.x > s.x0 - 2 && w.x < s.x1 + 2 && w.y > s.y0 - 2 && w.y < s.y1 + 2) { const d = depthOf(s); if (d > bd) { bd = d; best = s; } break; } }
  }
  return best;
}
function pickAt(wx, wy) { const s = screenOf(wx, wy); return pickScreen(s.x, s.y); }
function pickResourceScreen(sx, sy) {
  const z = cam.z, near = (x, y, h, r) => { const s = screenOf(x, y, h); return Math.hypot(sx - s.x, sy - s.y) < r * z; };
  for (const b of bushes) if (near(b.x, b.y, 7, 17)) return b;
  for (const t of trees) { const s = screenOf(t.x, t.y); if (Math.abs(sx - s.x) < 16 * t.s * z && sy < s.y + 6 * z && sy > s.y - 56 * t.s * z) return t; }
  for (const r of rocks) if (!r.iron && !r.gone && near(r.x, r.y, 8, 18 * r.s)) return r;
  const w = toWorld(sx, sy); for (const fm of farms) if (w.x > fm.x0 && w.x < fm.x1 && w.y > fm.y0 && w.y < fm.y1) return fm;
  return null;
}
function pickResource(wx, wy) { const s = screenOf(wx, wy); return pickResourceScreen(s.x, s.y); }
const unitsInScreenBox = (bx0, by0, bx1, by1) => units.filter(u => { if (u.team !== 'player' || u.dead || u.inside) return false; const q = screenOf(u.x, u.y, 20 + elev2D(u)); return q.x > bx0 && q.x < bx1 && q.y > by0 && q.y < by1; });

// ---------- people ----------
// which view to show: front when walking toward you, left or right when walking across; walking away has no
// back view on the sheet yet, so the side view stands in for it. Idle people face front and hold still.
function viewFor(u, X, Y) {
  const lx = u._px === undefined ? X : u._px, ly = u._py === undefined ? Y : u._py; u._px = X; u._py = Y;
  if (u.moving && !u.dead) { const dx = X - lx, dy = Y - ly; if (Math.abs(dx) + Math.abs(dy) > 0.05) { u._dx = (u._dx || 0) * 0.7 + dx * 0.3; u._dy = (u._dy || 0) * 0.7 + dy * 0.3; } }
  const fighting = u.attackAnim > 0 || (u.order === 'attack' && u.target && !u.moving);
  if (fighting && u.target) { const t = u.target, s = screenOf(t.x, t.y); const me = screenOf(u.x, u.y); return Math.abs(s.x - me.x) > Math.abs(s.y - me.y) * 0.5 ? (s.x < me.x ? ['left', false] : ['left', true]) : (s.y >= me.y ? ['front', false] : (s.x < me.x ? ['left', false] : ['left', true])); }
  if (!u.moving) return ['front', false];
  const dx = u._dx || 0, dy = u._dy || 0;
  if (dy > Math.abs(dx) * 0.7) return ['front', false];
  u.awayView = dy < -Math.abs(dx) * 0.7;
  return dx < 0 ? ['left', false] : ['left', true];   // right is the left view mirrored, as the sheet asks
}
function drawUnitArt(g, u, name, X, Y) {
  const team = TEAM_KEY(u), img = teamAtlas(team), [view, flip] = viewFor(u, X, Y), f = ATLAS.frames[name + '/' + view] || ATLAS.frames[name + '/front'];
  const ref = ATLAS.frames[name + '/front'], big = u.type === 'king' ? 1.12 : u.lord ? 1.2 : 1, s = (ART_H[name] || 52) / ref.h * big * ((u.look && u.look.h) || 1);
  const moving = u.moving && !u.dead, bob = moving && !isMachine(u) ? Math.abs(Math.sin(u.walkPhase || 0)) * 1.8 : 0;
  const lean = moving && !isMachine(u) ? 0.05 * (flip ? 1 : view === 'left' ? -1 : 0) : u.attackAnim > 0 ? Math.sin(u.attackAnim * Math.PI) * 0.14 * (flip ? 1 : -1) : 0;
  g.save();
  if (!u.dead) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(X, Y, f.w * s * 0.32, f.w * s * 0.14, 0, 0, Math.PI * 2); g.fill(); }
  g.translate(X, Y - bob);
  if (u.dead) { const k = Math.min(1, u.deathT / 0.45); g.rotate(k * Math.PI / 2 * (flip ? 1 : -1)); g.globalAlpha = u.deathT > 7 ? Math.max(0, 1 - (u.deathT - 7) / 3) : 1; }
  g.rotate(lean); if (flip) g.scale(-1, 1);
  const dx = -f.ax * s, dy = -f.ay * s, w = f.w * s, h = f.h * s;
  g.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, w, h);
  if (u.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(0.55, u.flash * 0.6); g.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, w, h); g.globalCompositeOperation = 'source-over'; }
  g.restore();
  if (u.type === 'king' || u.lord) drawCrown(g, X, Y - bob - h * 0.97, u.lord ? '#c87a2a' : '#f2c84a');
  return h;
}
function drawCrown(g, x, y, col) {
  g.save(); g.fillStyle = col; g.strokeStyle = 'rgba(40,20,0,0.85)'; g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(x - 6, y + 4); g.lineTo(x - 6, y - 2); g.lineTo(x - 3, y + 1); g.lineTo(x, y - 4); g.lineTo(x + 3, y + 1); g.lineTo(x + 6, y - 2); g.lineTo(x + 6, y + 4); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#c0283a'; g.beginPath(); g.arc(x, y + 1.6, 1.2, 0, 7); g.fill(); g.restore();
}
function drawUnitIso(g, u) {
  const e = elev2D(u), [X, Y] = P(u.x, u.y, e), name = artOf(u);
  if (name && ATLAS.frames[name + '/front']) { drawUnitArt(g, u, name, X, Y); return; }
  // no art yet (civilians, ram, ballista, ox cart): the old figure stands in, upright on its spot
  const [gx, gy] = P(u.x, u.y, 0); g.save(); g.translate(gx - u.x, gy - u.y); (isMachine(u) ? drawMachine : drawPerson)(g, u, time); g.restore();
}
// an upright thing drawn by the older code at its own map spot: shift it to its spot in the tilted view
function atSpot(g, o, fn) { const [X, Y] = P(o.x, o.y, 0); g.save(); g.translate(X - o.x, Y - o.y); fn(); g.restore(); }

// ---------- the scene ----------
function render() {
  const g = ctx, Z = cam.z * dpr;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#16120d'; g.fillRect(0, 0, canvas.width, canvas.height);
  OX = -cam.x; OY = -cam.y;
  // 1. the ground, tilted in one step
  g.setTransform(Z * ISO, Z * ISO / 2, -Z * ISO, Z * ISO / 2, -cam.x * Z, -cam.y * Z);
  g.imageSmoothingEnabled = true;
  g.drawImage(terrain, 0, 0);
  if (WEATHER.cover > 0.01) { g.fillStyle = `rgba(236,240,246,${0.42 * WEATHER.cover})`; g.fillRect(0, 0, MW, MH); }
  const v0 = toWorld(0, 0), v1 = toWorld(vw, 0), v2 = toWorld(0, vh + 260 * cam.z), v3 = toWorld(vw, vh + 260 * cam.z);
  const vx0 = Math.min(v0.x, v1.x, v2.x, v3.x) - 80, vx1 = Math.max(v0.x, v1.x, v2.x, v3.x) + 80, vy0 = Math.min(v0.y, v1.y, v2.y, v3.y) - 80, vy1 = Math.max(v0.y, v1.y, v2.y, v3.y) + 80;
  const visible = o => o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1 && onView(o.x, o.y, 140);
  for (const fm of farms) if (visible(fm)) drawBuildingGround(g, fm, time);
  for (const b of structures) if ((b.kind === 'moat' || b.kind === 'pit') && visible(b)) drawBuildingGround(g, b, time);
  for (const m of markers) {
    const k = m.t / 0.7, x = m.target ? m.target.x : m.x, y = m.target ? m.target.y : m.y;
    g.strokeStyle = `rgba(${m.col},${1 - k})`; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 18 * (1 - k * 0.6), 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.stroke();
  }
  const targeted = new Set(); for (const u of selection) if (u.order === 'attack' && alive(u.target)) targeted.add(u.target);
  for (const t of targeted) { g.strokeStyle = 'rgba(255,80,60,0.85)'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.arc(t.x, t.y - (t.x0 !== undefined ? (t.y1 - t.y0) / 2 : 0), t.x0 !== undefined ? (t.x1 - t.x0) * 0.75 : 15, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
  for (const u of selection) { if (u.dead || u.onWall) continue; g.fillStyle = 'rgba(120,255,140,0.18)'; g.strokeStyle = 'rgba(130,255,150,0.95)'; g.lineWidth = 2; g.beginPath(); g.arc(u.x, u.y, isMachine(u) || u.type === 'knight' ? 22 : 14, 0, Math.PI * 2); g.fill(); g.stroke(); }
  if (hover && !hover.dead && hover.kind === 'unit' && !selection.has(hover) && !hover.onWall) { g.strokeStyle = hover.team === 'enemy' ? 'rgba(255,90,70,0.9)' : 'rgba(220,255,220,0.7)'; g.lineWidth = 1.6; g.beginPath(); g.arc(hover.x, hover.y, 14, 0, Math.PI * 2); g.stroke(); }
  for (const f of prints) { if (!visible(f)) continue; g.save(); g.translate(f.x, f.y); g.rotate(f.a); g.globalAlpha = Math.max(0, 0.32 * (1 - f.t / 28)) + WEATHER.cover * 0.2; g.fillStyle = WEATHER.cover > 0.3 ? '#8a8f98' : '#2e3a1c'; g.beginPath(); g.ellipse(0, 0, 2.6, 1.3, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  for (const st of stuckStones) { g.globalAlpha = Math.min(1, (20 - st.t) / 3); g.fillStyle = '#7d776c'; g.beginPath(); g.arc(st.x, st.y, 5, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  for (const which of ['army', 'town']) { const r = rally[which]; if (!r) continue; g.strokeStyle = which === 'army' ? 'rgba(255,207,90,0.8)' : 'rgba(159,232,168,0.8)'; g.lineWidth = 2.5; g.beginPath(); g.arc(r.x, r.y, 18 + Math.sin(time * 3), 0, Math.PI * 2); g.stroke(); }
  if (placing && mouse.inside) drawPlacementGround(g);
  if (tearing && mouse.inside) { g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0); drawTearHover(g, (x, y) => screenOf(x, y)); g.restore(); g.setTransform(Z * ISO, Z * ISO / 2, -Z * ISO, Z * ISO / 2, -cam.x * Z, -cam.y * Z); }

  // 2. everything that stands up, farthest first
  g.setTransform(Z, 0, 0, Z, 0, 0);
  for (const st of stumps) if (visible(st)) atSpot(g, st, () => drawStump(g, st));
  for (const u of units) if (u.dead && visible(u)) drawUnitIso(g, u);
  const list = [];
  for (const t of trees) if (visible(t)) list.push(t);
  for (const r of rocks) if (visible(r)) list.push(r);
  for (const b of bushes) if (visible(b)) list.push(b);
  for (const s of structures) if (s.kind !== 'moat' && s.kind !== 'pit' && (visible({ x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2 }))) list.push(s);
  for (const f of fires) if (visible(f)) list.push(f);
  for (const u of units) if (!u.dead && !u.inside && visible(u)) list.push(u);
  const key = o => (o.kind === 'unit' && o.onWall ? depthOf(o.onWall) + 1 + (o.x + o.y) * 0.001 : depthOf(o));
  for (const o of list) o._d = key(o);
  list.sort((a, b) => a._d - b._d);
  const mine = units.filter(u => u.team === 'player' && !u.dead);
  for (const o of list) {
    if (o.kind === 'unit') drawUnitIso(g, o);
    else if (o.kind === 'tree') { const behind = mine.some(u => Math.abs(isoX(u.x, u.y) - isoX(o.x, o.y)) < 22 * o.s && isoY(u.x, u.y) < isoY(o.x, o.y) - 2 && isoY(u.x, u.y) > isoY(o.x, o.y) - 55 * o.s); atSpot(g, o, () => drawTree(g, o, behind ? 0.5 : 1)); }
    else if (o.kind === 'rock') atSpot(g, o, () => drawRock(g, o));
    else if (o.kind === 'bush') atSpot(g, o, () => drawBush(g, o));
    else if (o.kind === 'fire') atSpot(g, o, () => drawFire(g, o, time));
    else drawStructureIso(g, o);
  }
  if (outlinesOn) drawHiddenOutlinesIso(g, list);
  for (const which of ['army', 'town']) { const r = rally[which]; if (!r) continue; const [X, Y] = P(r.x, r.y, 0), col = which === 'army' ? ENEMY_PLUME : PAL.player.tunic;
    g.save(); g.strokeStyle = '#3a2a18'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Y - 46); g.stroke(); g.fillStyle = col; g.beginPath(); g.moveTo(X, Y - 46); g.quadraticCurveTo(X + 12, Y - 44 + Math.sin(time * 5) * 2, X + 24, Y - 40); g.lineTo(X, Y - 33); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 9px Georgia, serif'; g.textAlign = 'center'; g.fillText(which === 'army' ? 'A' : 'T', X + 9, Y - 37); g.restore(); }
  if (placing && mouse.inside) drawPlacementGhost(g);
  // sparks, smoke and chips: each rises from its own spot on the ground
  for (const p of particles) { const [X, Y] = P(p.x, p.gy, p.gy - p.y); g.save(); g.translate(X - p.x, Y - p.y); drawOneParticle(g, p); g.restore(); }
  for (const a of arrows) drawShotIso(g, a);
  for (const a of stuckArrows) { const [X, Y] = P(a.x, a.y, 0); drawArrow(g, X, Y - 4, a.ang, Math.min(1, (6 - a.t) / 1.5)); }
  OX = -cam.x; OY = -cam.y;

  // 3. labels above heads
  for (const u of units) {
    if (u.dead || u.inside || !visible(u)) continue; const e = elev2D(u), hh = (u.lord || u.type === 'king' ? 72 : isMachine(u) ? 60 : 58) + e, [X, Y] = P(u.x, u.y, hh);
    if (selection.has(u) || u.hp < u.maxHp || hover === u || u.lord) drawHealthBar(g, X, Y, u.lord ? 44 : 28, u.hp / u.maxHp);
    if (u.lord) { g.save(); g.font = 'bold 13px "Source Sans 3", Georgia, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(u.name, X, Y - 6); g.fillStyle = '#ffd98a'; g.fillText(u.name, X, Y - 6); g.restore(); }
  }
  for (const s of structures.concat(farms)) if (s.asleep && !s.dead && visible(s)) { const [X, Y] = P(s.x, s.y - (s.y1 - s.y0) / 2, (s.topH || 20) + 30); g.save(); g.font = 'bold 15px "Source Sans 3", Georgia, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText('Zz asleep', X, Y); g.fillStyle = '#cfe3ff'; g.fillText('Zz asleep', X, Y); g.restore(); }
  for (const s of structures) if (!s.dead && (s.hp < s.maxHp || hover === s) && visible({ x: s.x, y: s.y })) { const [X, Y] = P((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, s.topH + 18); drawHealthBar(g, X, Y, Math.max(30, Math.min(84, s.x1 - s.x0 + 16)), s.hp / s.maxHp); }
  g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)';
  for (const sp of speeches) if (!sp.u.inside) { const [X, Y] = P(sp.u.x, sp.u.y, (sp.u.lord || sp.u.type === 'king' ? 92 : 66) + elev2D(sp.u)); drawSpeech(g, X, Y, sp.text); }
  for (const fl of floats) { const [X, Y] = P(fl.x, fl.y + 50, 50); const a = 1 - fl.t / 1.6; g.globalAlpha = a; g.strokeText(fl.text, X, Y - fl.t * 22); g.fillStyle = fl.col; g.fillText(fl.text, X, Y - fl.t * 22); }
  g.globalAlpha = 1;
  drawAtmosphereIso(g);
  drawWeatherFx(g);
  if (drag && drag.box) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x = Math.min(drag.sx, drag.x), y = Math.min(drag.sy, drag.y), w = Math.abs(drag.x - drag.sx), h = Math.abs(drag.y - drag.sy);
    g.fillStyle = 'rgba(120,255,140,0.12)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(140,255,160,0.95)'; g.lineWidth = 1.5; g.strokeRect(x + 0.5, y + 0.5, w, h);
  }
}
function drawStructureIso(g, s) {
  const unfinished = s.done === false && !s.dead;
  if (unfinished) {
    const [, by] = P(s.x1, s.y1, 0), [, ty] = P(s.x0, s.y0, (s.topH || 40) + 14), cut = by - (by - ty) * Math.max(0.08, s.progress);
    g.save(); g.beginPath(); g.rect(-1e5, cut, 2e5, 1e5); g.clip(); drawBuildingIso(g, s, time); g.restore();
    // scaffolding poles at the front corners and a progress bar
    const h = Math.max(10, (s.topH || 40) * 0.85); g.strokeStyle = '#7a5a34'; g.lineWidth = 2;
    for (const [x, y] of [[s.x0 + 2, s.y1 - 2], [s.x1 - 2, s.y1 - 2], [s.x1 - 2, s.y0 + 2]]) { const a = P(x, y, 0), b = P(x, y, h); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    const [X, Y] = P((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, h + 14); g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(X - 20, Y, 40, 6); g.fillStyle = '#ffd27a'; g.fillRect(X - 19, Y + 1, 38 * s.progress, 4);
    return;
  }
  drawBuildingIso(g, s, time);
}
function drawOneParticle(g, p) {
  const t = p.life / p.max, a = 1 - t;
  if (p.type === 'spark') { g.fillStyle = `rgba(255,${200 + 55 * a | 0},120,${a})`; g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  else if (p.type === 'blood') { g.fillStyle = `rgba(120,16,14,${a * 0.9})`; g.beginPath(); g.arc(p.x, p.y, p.size, 0, 7); g.fill(); }
  else if (p.type === 'chip') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = `rgba(122,86,48,${a})`; g.fillRect(-p.size, -p.size / 3, p.size * 2, p.size * 0.7); g.restore(); }
  else if (p.type === 'dust') { g.fillStyle = `rgba(150,130,95,${a * 0.35})`; g.beginPath(); g.arc(p.x, p.y, p.size * (1 + t), 0, 7); g.fill(); }
  else if (p.type === 'smoke') { g.fillStyle = `rgba(70,66,62,${a * 0.45})`; g.beginPath(); g.arc(p.x, p.y, p.size * (1 + t * 1.6), 0, 7); g.fill(); }
  else if (p.type === 'fire') { g.fillStyle = `rgba(255,${120 + 100 * a | 0},40,${a * 0.9})`; g.beginPath(); g.arc(p.x, p.y, p.size * (1 - t * 0.6), 0, 7); g.fill(); }
}
// an arrow, bolt or stone in flight: from the shooter's hands to the target, along a gentle arc
function drawShotIso(g, a) {
  if (a.t < 0) return;
  const k = clamp(a.t / a.dur, 0, 1), from = a.from, tg = a.target;
  const gy0 = from ? from.y : a.y0, h0 = from ? Math.max(0, from.y - a.y0) + (from.kind === 'unit' ? elev2D(from) : 0) : 0;
  const gy1 = tg ? (tg.x0 !== undefined ? tg.y : a.y1 + 21) : a.y1, h1 = Math.max(0, gy1 - a.y1);
  const pos = q => { const x = lerp(a.x0, a.x1, q), y = lerp(gy0, gy1, q), h = lerp(h0, h1, q) + a.h * 4 * q * (1 - q); return P(x, y, h); };
  const [X, Y] = pos(k), [X2, Y2] = pos(Math.min(1, k + 0.02)), ang = Math.atan2(Y2 - Y, X2 - X);
  if (a.kind === 'stone') { const [sx, sy] = P(lerp(a.x0, a.x1, k), lerp(gy0, gy1, k), 0); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(sx, sy, 5, 2.5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8f897e'; g.beginPath(); g.arc(X, Y, 5.5, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(X - 1.5, Y - 1.5, 2, 0, Math.PI * 2); g.fill(); return; }
  if (a.kind === 'bolt') { g.save(); g.translate(X, Y); g.rotate(ang); g.strokeStyle = '#3a2614'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-16, 0); g.lineTo(10, 0); g.stroke(); g.fillStyle = '#9aa1a8'; g.beginPath(); g.moveTo(15, 0); g.lineTo(9, -3); g.lineTo(9, 3); g.closePath(); g.fill(); g.restore(); return; }
  drawArrow(g, X, Y, ang, 1);
}
// light from the upper left, a soft warm wash and a vignette, as on the sheet
function drawAtmosphereIso(g) {
  g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,214,150,0.28)'; g.fillRect(0, 0, vw, vh); g.globalCompositeOperation = 'source-over';
  const vg = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.42, vw / 2, vh / 2, Math.hypot(vw, vh) * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = vg; g.fillRect(0, 0, vw, vh); g.restore();
}
// people hidden behind a wall or building show as a team-coloured shape on top of it
function drawHiddenOutlinesIso(g, list) {
  if (!ATLAS.ready) return; let n = 0;
  for (const u of list) {
    if (u.kind !== 'unit' || u.onWall || n > 40) continue; const name = artOf(u); if (!name) continue;
    const ud = u._d;
    for (const s of list) {
      if (s.x0 === undefined || s._d <= ud || s.dead || isField(s.kind) || s.kind === 'garden' || s.kind === 'stocks') continue;
      const top = s.topH || 40, hull = [P(s.x0, s.y0, top), P(s.x1, s.y0, top), P(s.x1, s.y0, 0), P(s.x1, s.y1, 0), P(s.x0, s.y1, 0), P(s.x0, s.y1, top)];
      const [X, Y] = P(u.x, u.y, 0); let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9; for (const [hx, hy] of hull) { minX = Math.min(minX, hx); maxX = Math.max(maxX, hx); minY = Math.min(minY, hy); maxY = Math.max(maxY, hy); }
      if (X < minX - 8 || X > maxX + 8 || Y - 30 < minY || Y - 20 > maxY) continue;
      n++; g.save(); g.beginPath(); hull.forEach(([hx, hy], i) => i ? g.lineTo(hx, hy) : g.moveTo(hx, hy)); g.closePath(); g.clip();
      const f = ATLAS.frames[name + '/front'], s2 = (ART_H[name] || 52) / f.h; g.globalAlpha = 0.6;
      g.drawImage(silAtlas(TEAM_KEY(u)), f.x, f.y, f.w, f.h, X - f.ax * s2, Y - f.ay * s2, f.w * s2, f.h * s2); g.restore(); break;
    }
  }
}

// ---------- placing a new building ----------
function drawPlacementGround(g) {
  const k = playerKeep(); if (!k) return;
  g.save(); g.setLineDash([10, 8]); g.strokeStyle = 'rgba(255,230,140,0.55)'; g.lineWidth = 2; g.beginPath(); g.arc(k.x, (k.y0 + k.y1) / 2, TERRITORY, 0, Math.PI * 2); g.stroke(); g.restore();
  for (const sp of placementSpots()) {
    g.fillStyle = sp.ok ? 'rgba(120,255,140,0.32)' : 'rgba(255,80,60,0.4)'; g.fillRect(sp.ghost.x0, sp.ghost.y0, sp.ghost.x1 - sp.ghost.x0, sp.ghost.y1 - sp.ghost.y0);
    if (!isLine(placing.kind)) facingArrow(g, (sp.ghost.x0 + sp.ghost.x1) / 2, (sp.ghost.y0 + sp.ghost.y1) / 2, sp.dir, Math.max(sp.ghost.x1 - sp.ghost.x0, sp.ghost.y1 - sp.ghost.y0) / 2 + 26, p => p);
  }
}
function placementSpots() {
  const dir = isLine(placing.kind) ? 0 : placing.dir || 0, w = toWorld(mouse.x, mouse.y), kind = placing.kind, cur = tileFor(kind, w.x, w.y, dir);
  const spots = isLine(kind) && placing.start ? wallLine(placing.start.c, placing.start.r, cur.c, cur.r) : [cur];
  return spots.map(t => { const ghost = makeBuildingObj(kind, t.c, t.r, dir); ghost.done = true; ghost.progress = 1; return { ok: canPlace(kind, t.c, t.r, dir), ghost, dir }; });
}
function drawPlacementGhost(g) {
  const spots = placementSpots(), d = BUILD[placing.kind]; let cost = 0;
  spots.sort((a, b) => depthOf(a.ghost) - depthOf(b.ghost));
  for (const sp of spots) { if (sp.ok) cost += d.stone || d.wood; if (isField(placing.kind) || placing.kind === 'moat' || placing.kind === 'pit') continue; g.save(); g.globalAlpha = 0.6; drawBuildingIso(g, sp.ghost, time); g.restore(); }
  if (isLine(placing.kind)) { const w = toWorld(mouse.x, mouse.y), [X, Y] = P(w.x, w.y, 40); g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; const label = placing.start ? `${cost} ${d.stone ? 'stone' : 'wood'}` : 'wall start'; g.strokeText(label, X, Y); g.fillStyle = '#ffe9a8'; g.fillText(label, X, Y); }
}

// ---------- a building drawn small, for the buttons ----------
function drawBuildingIcon(g, kind, W, H) {
  const b = makeBuildingObj(kind, 0, 0, 0); b.done = true; b.progress = 1; b.amount = 30; b.max = 40;
  const top = (BUILD[kind] && BUILD[kind].topH) || 40, wpx = (b.x1 - b.x0 + b.y1 - b.y0) * ISO, hpx = (b.x1 - b.x0 + b.y1 - b.y0) * ISO / 2 + Math.min(top, 140) + 8;
  const s = Math.min(W / (wpx + 10), H / (hpx + 6));
  g.save(); g.translate(W / 2, H - 3); g.scale(s, s);
  const sOX = OX, sOY = OY; ICON_MODE = true;
  OX = -isoX((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); OY = -isoY(b.x1, b.y1);
  if (isField(kind) || kind === 'moat' || kind === 'pit') { g.save(); g.transform(ISO, ISO / 2, -ISO, ISO / 2, OX, OY); drawBuildingGround(g, b, 0); g.restore(); }
  else drawBuildingIso(g, b, 0);
  OX = sOX; OY = sOY; ICON_MODE = false; g.restore();
}

// ---------- the ground, repainted with the sheet's grass, meadow, dirt road and river water ----------
// Runs once the materials have loaded. It uses its own dice, so the world itself (trees, rocks, start) never changes.
function paintTerrainArt() {
  if (!MATS.ready) return;
  const g = terrain.getContext('2d'), R = mulberry32(4242), RS = (a, b) => a + (b - a) * R();
  const pat = (k, s) => { const p = g.createPattern(MATS.img[k], 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix().scale(s)); return p; };
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  // 1. grass everywhere, with gentle light and dark drifts so it never looks tiled
  g.fillStyle = pat('grass', 0.55); g.fillRect(0, 0, MW, MH);
  const N = makeNoise(91), low = document.createElement('canvas'), LW = MW >> 4, LH = MH >> 4; low.width = LW; low.height = LH;
  const lg = low.getContext('2d'), im = lg.createImageData(LW, LH);
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const v = N(x / 14, y / 14) * 0.7 + N(x / 5 + 30, y / 5) * 0.3, o = (y * LW + x) * 4; if (v > 0.5) { im.data[o] = 255; im.data[o + 1] = 236; im.data[o + 2] = 170; im.data[o + 3] = (v - 0.5) * 120; } else { im.data[o] = 10; im.data[o + 1] = 24; im.data[o + 2] = 8; im.data[o + 3] = (0.5 - v) * 170; } }
  lg.putImageData(im, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(low, 0, 0, MW, MH);
  // 2. meadow flowers in patches, away from roads and camps
  const M = makeNoise(17);
  g.save(); g.beginPath();
  for (let i = 0; i < 160 * AF; i++) { const x = RS(0, MW), y = RS(0, MH); if (roadDist(x, y) < 60 || Math.hypot(x - CAMP.x, y - CAMP.y) < 260 || M(x / 300, y / 300) < 0.5) continue; g.moveTo(x + 60, y); g.ellipse(x, y, RS(30, 70), RS(22, 50), RS(0, 3), 0, Math.PI * 2); }
  g.clip(); g.globalAlpha = 0.85; g.fillStyle = pat('meadow', 0.5); g.fillRect(0, 0, MW, MH); g.restore();
  // 3. the camp clearing and the dirt roads
  g.save(); g.beginPath(); g.ellipse(CAMP.x - 30, CAMP.y + 20, 210, 150, 0, 0, Math.PI * 2); g.clip(); g.globalAlpha = 0.8; g.fillStyle = pat('dirt', 0.7); g.fillRect(0, 0, MW, MH); g.restore();
  for (const road of ROADS) {
    const path = () => { g.beginPath(); road.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    path(); g.strokeStyle = 'rgba(52,40,22,0.35)'; g.lineWidth = 58; g.stroke();
    path(); g.strokeStyle = pat('dirt', 0.6); g.lineWidth = 46; g.stroke();
    for (const off of [-9, 9]) { g.save(); g.translate(off * 0.35, off * 0.35); path(); g.strokeStyle = 'rgba(70,50,28,0.35)'; g.lineWidth = 3; g.stroke(); g.restore(); }
  }
  // 4. the pond: river water with a muddy, reedy shore
  if (pond) {
    g.save(); g.translate(pond.x, pond.y);
    g.fillStyle = 'rgba(84,70,44,0.75)'; g.beginPath(); g.ellipse(0, 0, pond.rx * 1.12, pond.ry * 1.12, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(0, 0, pond.rx, pond.ry, 0, 0, Math.PI * 2); g.fillStyle = pat('water', 0.6); g.fill();
    const wg = g.createRadialGradient(0, 0, 4, 0, 0, pond.rx); wg.addColorStop(0, 'rgba(10,40,70,0.25)'); wg.addColorStop(1, 'rgba(30,60,40,0.2)'); g.fillStyle = wg; g.fill();
    g.restore();
  }
  // 5. iron ground: rusty red and black earth round every iron deposit
  for (const r of rocks.filter(q => q.iron)) { const gr = g.createRadialGradient(r.x, r.y - 6, 4, r.x, r.y - 6, 70); gr.addColorStop(0, 'rgba(70,24,14,0.85)'); gr.addColorStop(0.5, 'rgba(120,48,24,0.5)'); gr.addColorStop(1, 'rgba(120,48,24,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(r.x, r.y - 6, 70, 52, 0, 0, Math.PI * 2); g.fill(); }
  // 6. rock and snow where the mountains rise, and hill shading (light from the north-west)
  const sc = document.createElement('canvas'); sc.width = EW; sc.height = EH; const sg = sc.getContext('2d'), si = sg.createImageData(EW, EH), sd = si.data;
  const rc = document.createElement('canvas'); rc.width = EW; rc.height = EH; const rg = rc.getContext('2d'), ri = rg.createImageData(EW, EH), rd = ri.data, RN = makeNoise(5);
  for (let j = 0; j < EH; j++) for (let i = 0; i < EW; i++) {
    const x = (i - 1) * EG, y = (j - 1) * EG, sh = clamp(((elevAt(x - EG, y - EG) - elevAt(x + EG, y + EG)) * 0.05), -0.75, 0.75), o = (j * EW + i) * 4;
    if (sh > 0) { sd[o] = 255; sd[o + 1] = 240; sd[o + 2] = 200; sd[o + 3] = sh * 95; } else { sd[o] = 12; sd[o + 1] = 16; sd[o + 2] = 10; sd[o + 3] = -sh * 230; }
    const m = mountAt(x, y), rk = clamp((m - 16) / 30, 0, 1), sn = clamp((m - 128) / 18, 0, 1), nv = RN(x / 40, y / 40), nv2 = RN(x / 13 + 9, y / 13);
    const base = [96 + nv * 30 + nv2 * 14, 92 + nv * 24 + nv2 * 12, 86 + nv * 18 + nv2 * 8];
    rd[o] = lerp(base[0], 236, sn); rd[o + 1] = lerp(base[1], 240, sn); rd[o + 2] = lerp(base[2], 246, sn); rd[o + 3] = rk * 235;
  }
  rg.putImageData(ri, 0, 0); sg.putImageData(si, 0, 0);
  g.drawImage(rc, -EG * 1.5, -EG * 1.5, EW * EG, EH * EG);
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.5; g.fillStyle = pat('brick_gray', 0.9);
  g.beginPath(); for (let n = 0; n < 2500; n++) { const x = RS(0, MW), y = RS(0, MH); if (mountAt(x, y) > 34) { g.moveTo(x + 20, y); g.ellipse(x, y, 20, 14, 0, 0, Math.PI * 2); } } g.fill(); g.restore();
  g.drawImage(sc, -EG * 1.5, -EG * 1.5, EW * EG, EH * EG);
  g.restore();
}
