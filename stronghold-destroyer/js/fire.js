'use strict';
// Stronghold Destroyer — Phase 4B, step B5: fire and repair.
// A building set alight (by flamethrowers, or a burning siege stone) raises the alarm; citizens fetch water — from a Water Pot
// if one stands near (each pot has a keeper, and holds more as time goes on), otherwise from the river — and throw it on the
// flames. A fire nobody fights for about 10 seconds burns half the building; anyone inside is burned too. The school's
// learning makes firefighting and repairs quicker. Damaged buildings are mended by their own workers or other citizens
// (twice as long as building them); engineers mend very fast. A building that is destroyed is rebuilt where it stood, taking
// twice its first building time, and waits until there are supplies to pay for it. All of this is the same for every building.
const FIRE = { grow: 0.05, burn: 0.02, halfAfter: 10, fighters: 4, douse: 0.12, riverDouse: 0.06, beat: 0.02, learn: 0.25, insideBurn: 6, potGrowEvery: 180, potMax: 3,
  citizenRepair: 0.5, engineerRepair: 4, learnRepair: 0.15, rebuildTime: 2 };
let fireT = 0, repT = 0, rebuildQ = [];
const burning = () => structures.filter(b => b.fire > 0 && !b.dead);
// ---------- catching fire ----------
function ignite(b, by) {
  if (!IND() || !b || b.dead || b.x0 === undefined || b.kind === 'moat' || b.kind === 'pit' || isField(b.kind)) return;
  if (b.fire > 0) { b.fire = Math.min(1, b.fire + 0.05); return; }
  b.fire = 0.25; b.fireT = 0; b.unfought = 0; b.halfBurned = false;
  if (b.team === 'player') { showBanner(`<b>Fire!</b> The ${b.name} is burning. Your people run for water.`, 4); AudioSys.ui('warn'); try { AudioSys.ui('bell'); } catch (e) {} VOICE.say(`Fire at the ${b.name}!`, { key: 'fire' + b.id, again: 30, interrupt: true }); }
}
// ---------- water pots: one keeper each; they hold more as time goes on ----------
const potLevel = p => Math.min(FIRE.potMax, 1 + Math.floor((time - (p.builtAt || time)) / FIRE.potGrowEvery));
function nearestWater(u, team) {
  let best = null, bd = 1e9;
  for (const p of structures) if (p.kind === 'waterpot' && !p.dead && p.done !== false && p.team === team) { const d = Math.hypot(p.x - u.x, p.y - u.y); if (d < bd) { bd = d; best = p; } }
  if (best && bd < 900) return { at: best, pot: best };
  // no pot near: the river (the nearest open bank)
  let rb = null, rd = 1e9; const c0 = Math.floor(u.x / TILE), r0 = Math.floor(u.y / TILE);
  for (let rad = 1; rad < 40 && !rb; rad++) for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr += (Math.abs(dc) === rad ? 1 : 2 * rad)) { const c = c0 + dc, r = r0 + dr;   /* the whole ring of squares at this distance */ if (c < 1 || r < 1 || c >= COLS - 1 || r >= ROWS - 1) continue; if (riverTile[r * COLS + c]) { const d = Math.hypot(dc, dr); if (d < rd) { rd = d; rb = { x: c * TILE + 16, y: r * TILE + 16 }; } } }
  return rb ? { at: rb, pot: null } : null;
}
// ---------- the firefighters ----------
function fireBrain(u, dt) {
  const b = u.fireB;
  if (!b || b.dead || !(b.fire > 0)) { u.order = 'idle'; u.fireB = null; u.path = []; u.carry = 0; return; }
  const walk = (x, y) => { if (!u.path.length || u.repath <= 0) { u.path = findPath(u.x, u.y, x, y); u.repath = 2; } followPath(u, dt); };
  if (u.sub === 'toWater') {
    const w = u.water || (u.water = nearestWater(u, u.team)); if (!w) { u.sub = 'toFire'; u.bucket = 0; return; }   /* no water anywhere: they beat at the flames */
    const tx = w.pot ? w.pot.x : w.at.x, ty = w.pot ? w.pot.y1 + 10 : w.at.y;
    if (Math.hypot(u.x - tx, u.y - ty) < 40 || stalled(u) && Math.hypot(u.x - tx, u.y - ty) < 70) { u.bucket = w.pot ? potLevel(w.pot) : 0.5; u.sub = 'toFire'; u.path = []; u.carryType = 'water'; return; }
    walk(tx, ty); return;
  }
  if (edgeDist(u, b) > 14 && !(stalled(u) && edgeDist(u, b) < 40)) { const ap = approachPoint(u, b); walk(ap.x, ap.y); return; }
  // throw the water (a throw takes a moment; with no water they can only beat at the flames, slowly)
  u.path = []; u.moving = false; u.facing = b.x >= u.x ? 1 : -1;
  if ((u.throwT = (u.throwT || 0) - dt) > 0) return; u.throwT = u.bucket > 0 ? 1.2 : 2.5;
  const learn = 1 + FIRE.learn * (u.team === 'player' ? schoolLvl : 0);
  b.fire = Math.max(0, b.fire - (u.bucket >= 1 ? FIRE.douse * u.bucket : u.bucket > 0 ? FIRE.riverDouse : FIRE.beat) * learn); b.fought = time;
  for (let i = 0; i < 6; i++) spawn('dust', b.x + RR(-20, 20), b.y - RR(10, 50), b.y);
  if (b.fire <= 0) { b.fire = 0; if (b.team === 'player') floatText(b.x, b.y - (b.topH || 40) - 10, 'The fire is out', '#9fe8a8'); }
  if (u.bucket > 0) { u.sub = 'toWater'; u.water = null; u.carryType = null; }   /* back for more water */
}
function callFighters(b) {
  const on = units.filter(u => !u.dead && u.order === 'firefight' && u.fireB === b).length; if (on >= FIRE.fighters) return;
  const pool = units.filter(u => !u.dead && u.team === b.team && u.type === 'civ' && u.order !== 'firefight' && u.order !== 'leave' && !u.toHeal && !u.inside && Math.hypot(u.x - b.x, u.y - b.y) < 1400 && (b.owner === undefined || u.owner === b.owner))
    .sort((p, q) => (!!p.job - !!q.job) || (Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y)));
  for (const u of pool.slice(0, FIRE.fighters - on)) { u.order = 'firefight'; u.fireB = b; u.sub = 'toWater'; u.water = null; u.path = []; u.task = null; u.crafting = null; u.carry = 0; if (u.team === 'player') floatText(u.x, u.y - 50, 'Water! Fire!', '#9fd8ff'); }
}
function updateFires(dt) {
  for (const b of burning()) {
    b.fireT += dt;
    const fought = time - (b.fought || -99) < 4;
    b.unfought = fought ? 0 : (b.unfought || 0) + dt;
    if (!fought) b.fire = Math.min(1, b.fire + FIRE.grow * dt);
    b.hp -= b.maxHp * FIRE.burn * b.fire * dt; b.flash = Math.max(b.flash, 0.2);
    // about 10 seconds with nobody fighting it: half the building burns
    if (b.unfought >= FIRE.halfAfter && !b.halfBurned) { b.halfBurned = true; b.hp = Math.min(b.hp, b.maxHp * 0.5); if (b.team === 'player') showBanner(`Nobody fought the fire: half the ${b.name} has burned.`, 3.5); }
    for (const u of units) if (u.inside === b && !u.dead) { u.hp -= FIRE.insideBurn * dt; if (u.hp <= 0) kill(u); else if (Math.random() < dt) { u.inside = null; u.x = b.x; u.y = b.y1 + 16; floatText(u.x, u.y - 50, 'Out of the flames!', '#ffb38a'); } }
    if (b.hp <= 0) { b.fire = 0; kill(b); continue; }
    callFighters(b);
  }
}
function fireFx(dt) {   // flames and smoke over burning buildings (drawn every frame)
  for (const b of structures) if (b.fire > 0 && !b.dead) { const n = Math.random() < b.fire * dt * 30 ? 2 : 0; for (let i = 0; i < n; i++) { spawn('sparkR', b.x + RR(-(b.x1 - b.x0) / 2, (b.x1 - b.x0) / 2), b.y - RR(10, (b.topH || 40)), b.y); spawn('smoke', b.x + RR(-20, 20), b.y - (b.topH || 40), b.y); } }
}
// ---------- repairs: the building's own workers or other citizens (half speed), engineers (very fast) ----------
function repairBrain(u, dt) {
  const b = u.repairB;
  if (!b || b.dead || b.hp >= b.maxHp || b.fire > 0) { u.order = 'idle'; u.repairB = null; u.path = []; return; }
  if (edgeDist(u, b) > 14 && !(stalled(u) && edgeDist(u, b) < 40)) { if (!u.path.length || u.repath <= 0) { const ap = approachPoint(u, b); u.path = findPath(u.x, u.y, ap.x, ap.y); u.repath = 3; } followPath(u, dt); return; }
  u.path = []; u.moving = false; u.facing = b.x >= u.x ? 1 : -1;
  if (u.attackAnim === 0) { u.attackAnim = 0.001; AudioSys.play('hammer', u.x, u.y); }
  const speed = (u.engineer ? FIRE.engineerRepair : FIRE.citizenRepair) * (1 + FIRE.learnRepair * (u.team === 'player' ? schoolLvl : 0));
  b.hp = Math.min(b.maxHp, b.hp + b.maxHp / Math.max(2, (BUILD[b.kind] ? BUILD[b.kind].time : 10)) * speed * dt * workMul());
  if (b.hp >= b.maxHp && b.team === 'player') floatText(b.x, b.y - (b.topH || 40) - 10, `${b.name} repaired`, '#9fe8a8');
}
function assignRepairs() {
  for (const b of structures) {
    if (b.team !== 'player' || b.dead || b.done === false || b.fire > 0 || b.hp >= b.maxHp * 0.98 || b.kind === 'keep' && false) continue;
    if (units.some(u => !u.dead && u.order === 'repair' && u.repairB === b)) continue;
    if (units.some(e => !e.dead && hostile('player', e.team) && e.type !== 'civ' && Math.hypot(e.x - b.x, e.y - b.y) < 260)) continue;   // not while the enemy is at it
    const civ = u => !u.dead && u.team === 'player' && u.type === 'civ' && !u.toHeal && !u.trebBuild && !u.cartPal && u.order !== 'firefight' && u.order !== 'repair' && u.order !== 'build' && u.order !== 'leave' && !u.inSchool && !(u.breakUntil > time);
    const near = (p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y);
    const w = units.filter(u => civ(u) && u.engineer).sort(near)[0] || units.filter(u => civ(u) && u.job === b).sort(near)[0] || units.filter(u => civ(u) && !u.job && !u.engineer && (u.order === 'idle' || u.order === 'gather' && !(u.carry > 0)) && Math.hypot(u.x - b.x, u.y - b.y) < 900).sort(near)[0];   /* a citizen with no trade leaves his gathering to mend it */
    if (!w) continue;
    w.order = 'repair'; w.repairB = b; w.path = []; w.task = null; w.crafting = null; w.sub = null;
    floatText(w.x, w.y - 50, w.engineer ? `Engineer to mend the ${b.name}` : `Off to mend the ${b.name}`, '#ffe9a8');
  }
}
// ---------- rebuilding what was destroyed: twice as long, and only once it can be paid for ----------
function onBuildingLost(b) {
  if (!IND() || b.team !== 'player' || b.torn || !BUILD[b.kind] || b.kind === 'moat' || b.kind === 'pit' || b.kind === 'keep' || b.castleRing) return;
  rebuildQ.push({ kind: b.kind, c: b.c, r: b.r, dir: b.dir || 0, name: b.name, since: time });
}
function updateRebuilds() {
  for (let i = rebuildQ.length - 1; i >= 0; i--) {
    const q = rebuildQ[i];
    if (units.some(e => !e.dead && hostile('player', e.team) && e.type !== 'civ' && Math.hypot(e.x - q.c * TILE, e.y - q.r * TILE) < 400)) continue;   // not while the enemy is there
    if (!canPlace(q.kind, q.c, q.r, q.dir) && !isField(q.kind)) { if (time - q.since > 120) rebuildQ.splice(i, 1); continue; }
    if (!afford(BUILD[q.kind])) { q.waiting = true; continue; }   // waits for supplies
    pay(BUILD[q.kind]); rebuildQ.splice(i, 1);
    const b = createBuilding(q.kind, q.c, q.r, q.dir); b.buildTime *= FIRE.rebuildTime; b.rebuilt = true;
    floatText(b.x, b.y - 40, `Rebuilding the ${b.name}`, '#ffe9a8');
  }
}
const rebuildWaiting = () => rebuildQ.filter(q => q.waiting);
// ---------- each frame ----------
function updateFireRepair(dt) {
  if (!IND() || !started) return;
  updateFires(dt); fireFx(dt);
  for (const p of structures) if (p.kind === 'waterpot' && p.done && !p.builtAt) p.builtAt = time;
  repT -= dt; if (repT > 0) return; repT = 2;
  assignRepairs(); updateRebuilds();
}
