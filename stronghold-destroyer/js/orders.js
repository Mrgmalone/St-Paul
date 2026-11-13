'use strict';
// Stronghold Destroyer — Phase 4C, step C5: patrols, a Guard command, three rally flags, and the army moving as one.
//  - Patrol: choose soldiers, press Patrol, then draw the route with your finger or the mouse. They walk it over and over
//    (round and round when the ends meet, otherwise there and back), stop to fight anything that comes near, then carry on.
//  - Guard: choose soldiers, press Guard, then tap or click a place. They hold that area: they meet anyone who comes into it
//    and go back to their spots when it is clear (they never chase far outside it).
//  - Three rally flags: army (a flag beside a shield), citizens (a flag beside a person), siege (a flag beside a siege engine).
//  - When you send your main army somewhere, soldiers and siege engines you have not given orders of their own follow it there.
//  - Idle citizens go back to the campfire (town.js already does this once they have been left alone for a short while).
// Any new order you give a soldier ends his patrol or guard duty.
const ORDERS = { guardRadius: 200, guardLeash: 150, patrolSight: 190, patrolLeash: 320, routeStep: 26, marchMin: 3 };
let orderMode = null, orderRec = null, armyMarch = null;
const orderable = () => selectedList().filter(u => u.team === 'player' && !u.dead && u.type !== 'civ' && u.type !== 'king' && !isMachine(u));
function orderButtons() { for (const [id, k] of [['btnPatrol', 'patrol'], ['btnGuardA', 'guard']]) { const b = document.getElementById(id); if (b) b.classList.toggle('on', orderMode === k); } }
function startOrder(kind) {
  if (!started) return;
  if (orderMode === kind) { cancelOrder(); return; }
  if (!orderable().length) { showBanner('First choose the soldiers (tap one, or draw a box round them), then press ' + (kind === 'patrol' ? 'Patrol.' : 'Guard.'), 3); return; }
  orderMode = kind; orderRec = null; placing = null; settingRally = null; rallyButtons(); orderButtons();
  showBanner(kind === 'patrol' ? 'Draw the patrol route: hold your finger (or the mouse button) down and trace it.' : 'Tap or click the place they should guard.', 3.5);
}
function cancelOrder() { orderMode = null; orderRec = null; orderButtons(); showBanner('Order cancelled.', 1.5); }
function orderDown(p) {
  const w = toWorld(p.x, p.y); if (!w) return;
  orderRec = { pts: [{ x: w.x, y: w.y }], sx: p.x, sy: p.y };
  if (orderMode === 'patrol') markers.push({ x: w.x, y: w.y, t: 0, col: '255,214,120' });
}
function orderMove(p) {
  if (!orderRec || orderMode !== 'patrol') return;
  const w = toWorld(p.x, p.y); if (!w) return;
  const last = orderRec.pts[orderRec.pts.length - 1];
  if (Math.hypot(w.x - last.x, w.y - last.y) >= ORDERS.routeStep) { orderRec.pts.push({ x: w.x, y: w.y }); markers.push({ x: w.x, y: w.y, t: 0, col: '255,214,120' }); }
}
function orderUp(p) {
  if (!orderRec) return;
  const w = toWorld(p.x, p.y), rec = orderRec; orderRec = null;
  if (w && orderMode === 'patrol') { const last = rec.pts[rec.pts.length - 1]; if (Math.hypot(w.x - last.x, w.y - last.y) > 6) rec.pts.push({ x: w.x, y: w.y }); }
  const list = orderable();
  if (orderMode === 'patrol') {
    const pts = simplifyRoute(rec.pts);
    if (pts.length < 2) { showBanner('That route is too short: hold down and trace a longer line.', 2.5); return; }   // stay in patrol mode, try again
    setPatrol(list, pts);
  } else if (orderMode === 'guard' && w) setGuard(list, w.x, w.y);
  orderMode = null; orderButtons();
  selection.clear(); try { UI.setSelection(selectedList()); } catch (e) {}   // a command given lets them go, as everywhere else
  AudioSys.ui('ack');
}
// keep the points that matter: drop ones closer than a step, keep only reachable ground
function simplifyRoute(pts) {
  const out = [];
  for (const q of pts) { const f = nearestFree(Math.floor(q.x / TILE), Math.floor(q.y / TILE)); if (!f) continue; const pt = { x: f.c * TILE + 16, y: f.r * TILE + 16 }, l = out[out.length - 1]; if (!l || Math.hypot(pt.x - l.x, pt.y - l.y) >= 40) out.push(pt); }
  return out;
}
function clearDuty(u) { u.patrol = null; u.guardArea = null; }
function setPatrol(list, pts) {
  const loop = pts.length > 2 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 110;
  list.forEach((u, i) => {
    if (u.onWall) dismount(u); u.guardOf = null; u.escort = null;
    clearDuty(u); u.cmdT = time; u.lastArmy = -1;
    const a = i * 2.4, r = i ? 14 + 9 * Math.sqrt(i) : 0;   // each walks a little to the side of the line, so they do not stand on one spot
    // start at the route point nearest to him
    let bi = 0, bd = 1e12; pts.forEach((q, j) => { const d = Math.hypot(q.x - u.x, q.y - u.y); if (d < bd) { bd = d; bi = j; } });
    u.patrol = { pts, i: bi, dir: 1, loop, dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.7, look: 0 };
    patrolNext(u, false);
  });
  floatText(pts[0].x, pts[0].y - 40, `${list.length} on patrol`, '#ffd678');
  showBanner(`${list.length} soldier${list.length > 1 ? 's' : ''} on patrol ${loop ? 'round the loop' : 'along the route, there and back'}. Give them any other order to end it.`, 3);
}
function setGuard(list, x, y) {
  const f = nearestFree(Math.floor(x / TILE), Math.floor(y / TILE)); if (!f) return; x = f.c * TILE + 16; y = f.r * TILE + 16;
  const slots = formationSlots(list.length, x, y);
  list.forEach((u, i) => {
    if (u.onWall) dismount(u); u.guardOf = null; u.escort = null;
    clearDuty(u); u.cmdT = time; u.lastArmy = -1;
    const s = slots[i] || { x, y }; u.guardArea = { x, y, r: ORDERS.guardRadius, spot: { x: s.x, y: s.y }, look: 0 };
    u.order = 'move'; u.target = null; u.dest = { x: s.x, y: s.y }; u.stuckT = 0; u.path = findPath(u.x, u.y, s.x, s.y);
  });
  markers.push({ x, y, t: 0, col: '255,214,120' });
  floatText(x, y - 40, `${list.length} guarding here`, '#ffd678');
  showBanner(`${list.length} soldier${list.length > 1 ? 's' : ''} guarding that area. Give them any other order to end it.`, 3);
}
function patrolNext(u, advance) {
  const P = u.patrol, n = P.pts.length;
  if (advance) {
    if (P.loop) P.i = (P.i + 1) % n;
    else { if (P.i + P.dir >= n || P.i + P.dir < 0) P.dir = -P.dir; P.i += P.dir; }
  }
  const q = P.pts[P.i], tx = q.x + P.dx, ty = q.y + P.dy, f = nearestFree(Math.floor(tx / TILE), Math.floor(ty / TILE)), d = f ? { x: f.c * TILE + 16, y: f.r * TILE + 16 } : q;
  u.order = 'move'; u.target = null; u.dest = d; u.stuckT = 0; u.bestD = undefined; u.progT = 0; u.path = findPath(u.x, u.y, d.x, d.y); P.leg = time;
}
const nearRoute = (u, P) => P.pts.reduce((m, q) => Math.min(m, Math.hypot(q.x - u.x, q.y - u.y)), 1e9);
// each frame, before the usual player brain: returns true when it has decided what he does
function patrolBrain(u, dt) {
  const P = u.patrol;
  if (u.order === 'attack') {   // fighting: but not chasing far from the route
    if (!alive(u.target) || nearRoute(u.target, P) > ORDERS.patrolLeash) { u.target = null; patrolNext(u, false); }
    return true;
  }
  P.look -= dt;
  if (P.look <= 0) { P.look = 0.4; const n = nearestEnemy(u, ORDERS.patrolSight); if (n && nearRoute(n, P) < ORDERS.patrolLeash) { u.order = 'attack'; u.target = n; u.repath = 0; return true; } }
  if (u.order === 'idle') { patrolNext(u, true); return true; }
  if (u.order === 'move' && time - (P.leg || 0) > 25) patrolNext(u, true);   // a leg that takes too long (blocked): go on to the next point
  return true;
}
function guardBrain(u, dt) {
  const G = u.guardArea;
  if (u.order === 'attack') {
    if (!alive(u.target) || Math.hypot(u.target.x - G.x, u.target.y - G.y) > G.r + ORDERS.guardLeash) { u.target = null; u.order = 'move'; u.dest = G.spot; u.stuckT = 0; u.path = findPath(u.x, u.y, G.spot.x, G.spot.y); }
    return true;
  }
  G.look -= dt;
  if (G.look <= 0) {
    G.look = 0.4;
    let best = null, bd = 1e9;
    for (const e of units) { if (e.dead || !hostile('player', e.team) || e.inside || fogHides(e, 'player')) continue; const dc = Math.hypot(e.x - G.x, e.y - G.y); if (dc > G.r + 40) continue; const d = Math.hypot(e.x - u.x, e.y - u.y); if (d < bd) { bd = d; best = e; } }
    if (best) { u.order = 'attack'; u.target = best; u.repath = 0; return true; }
  }
  if (u.order === 'idle' && Math.hypot(u.x - G.spot.x, u.y - G.spot.y) > 46 && !(G.backT > time)) { G.backT = time + 3; u.order = 'move'; u.dest = G.spot; u.stuckT = 0; u.path = findPath(u.x, u.y, G.spot.x, G.spot.y); }
  if (u.order === 'idle') u.moving = false;
  return true;
}
function dutyBrain(u, dt) {
  if (!IND() || u.team !== 'player' || u.dead) return false;
  if (u.patrol) return patrolBrain(u, dt);
  if (u.guardArea) return guardBrain(u, dt);
  return false;
}
// ---------- the main army: a command to three or more soldiers is where the army goes; the others without orders follow ----------
function noteMarch(list, x, y) {
  if (!IND()) return;
  const sold = list.filter(u => !u.dead && u.type !== 'civ' && u.type !== 'king' && !isMachine(u));
  if (sold.length < ORDERS.marchMin) return;
  armyMarch = { x, y, t: time, members: sold.slice() };
  for (const u of list) if (!u.dead && u.type !== 'civ' && u.type !== 'king') u.lastArmy = time;
}
const hasOwnOrders = u => u.onWall || u.guardOf || u.escort || u.patrol || u.guardArea || u.sentry || u.gift || u.inside || u.toHeal || u.inSchool || u.trebBuild || u.cartPal || u.raider
  || (u.cmdT !== undefined && u.cmdT > -50 && !(u.lastArmy >= u.cmdT - 0.01));   // told something of his own since he last went with the army
let marchT = 0;
function updateMarch(dt) {
  if (!IND() || !armyMarch) return;
  marchT -= dt; if (marchT > 0) return; marchT = 1;
  if (!armyMarch.members.some(u => !u.dead)) { armyMarch = null; return; }   // the army that marched is gone: nobody follows a dead army
  const A = armyMarch; let k = 0;
  for (const u of units) {
    if (u.dead || u.team !== 'player' || u.type === 'civ' || u.type === 'king' || u.type === 'oxcart' || u.order !== 'idle' || u.followed === A.t || hasOwnOrders(u)) continue;
    if (A.members.includes(u) || Math.hypot(u.x - A.x, u.y - A.y) < 160) continue;
    u.followed = A.t; u.lastArmy = A.t;
    const back = isMachine(u) ? 90 : 40, a = (k++) * 2.1, r = back + 14 * Math.sqrt(k);   // engines stay a little behind the soldiers
    const f = nearestFree(Math.floor((A.x + Math.cos(a) * r) / TILE), Math.floor((A.y + Math.sin(a) * r * 0.7) / TILE)); if (!f) continue;
    u.order = 'move'; u.target = null; u.dest = { x: f.c * TILE + 16, y: f.r * TILE + 16 }; u.stuckT = 0; u.path = findPath(u.x, u.y, u.dest.x, u.dest.y);
  }
}
// ---------- the buttons ----------
(() => {
  const btns = document.querySelector('#cmdbar .btns'); if (!btns) return;
  const mk = (id, label, title, svg) => { const b = document.createElement('button'); b.id = id; b.className = 'sm'; b.title = title; b.innerHTML = svg + '<span>' + label + '</span>'; return b; };
  const pat = mk('btnPatrol', 'Patrol', 'Patrol: choose soldiers, press this, then draw the route with your finger or the mouse',
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 18 C8 6, 14 20, 20 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="3 2.4" stroke-linecap="round"/><path d="M17 5 L21 5 L20 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>');
  const grd = mk('btnGuardA', 'Guard', 'Guard: choose soldiers, press this, then tap or click the place they should hold',
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2 L20 5 V11 C20 16 16 20 12 22 C8 20 4 16 4 11 V5 Z" fill="currentColor" opacity="0.85"/></svg>');
  const stop = document.getElementById('btnStop'); btns.insertBefore(grd, stop); btns.insertBefore(pat, grd);
  pat.onclick = () => startOrder('patrol'); grd.onclick = () => startOrder('guard');
  document.getElementById('btnStop').onclick = () => { const l = selectedList(); for (const u of l) clearDuty(u); commandStop(l); };
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && orderMode) cancelOrder(); });
})();
