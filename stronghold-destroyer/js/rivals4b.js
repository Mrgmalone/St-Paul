'use strict';
// Stronghold Destroyer — Phase 4B, step B7: the rivals live by the same rules as you.
// Their citizens grow in their houses (no buying); they build the new industries at the same stages (alehouse, water pot,
// mill, apothecary, school, stable, engineer's hut, church, abbey); their granaries hold only so much; they fight fires and
// mend damage; their woodcutters go out with an escort from the Hold; their knights ride stable horses from the Castle; their
// archers become longbowmen and crossbowmen, and a large army brings a flamethrower squad; their soldiers take lessons at
// their school; their great towers carry a ballista. They send a scout before they raid, come at you from a different side
// each time, and trade surpluses through the trading friend. Challenging, but each can be beaten: the pace follows the difficulty.
const R4 = { growMin: 180, growMax: 300, scoutEvery: 200, tradeEvery: 120, lessonEvery: 300, engineGold: 120 };
// the new buildings join the rivals' plan at the same stages as yours
(() => {
  const add = (s, list) => { for (const it of list) RIVAL_PLAN[s].push(it); };
  add(1, [['alehouse', 1], ['waterpot', 1]]);
  add(2, [['apothecary', 1]]);
  add(3, [['stable', 1], ['engineerhut', 1], ['church', 1]]);
  add(4, [['abbey', 1]]);
})();
const rivalCivs = R => units.filter(u => !u.dead && u.owner === R.id && u.type === 'civ');
const rivalBuilt = (R, k) => structures.filter(b => !b.dead && b.owner === R.id && b.kind === k && b.done !== false);
// ---------- citizens grow (each house and the keep raises one at a time); the pace follows the difficulty ----------
function rivalGrowth(R, dt) {
  if (!IND()) return false;
  const p = (RIVALS.pace[DIFF.key] || 1), cap = RIVALS.workersPerStage[R.stage - 1] || 8;
  R.growing = R.growing || [];
  for (let i = R.growing.length - 1; i >= 0; i--) { const g = R.growing[i]; g.t += dt * p; if (g.t < g.dur) continue; R.growing.splice(i, 1);
    const k = R.keep, fr = nearestFree(Math.floor(k.x / TILE) - 3 + Math.floor(Math.random() * 7), Math.floor(k.y1 / TILE) + 1 + Math.floor(Math.random() * 3)); if (fr && rivalCivs(R).length < cap) rivalUnit(R, 'civ', fr.c * TILE + 16, fr.r * TILE + 16); }   /* (spread out, not all on one square) */
  const homes = [R.keep].concat(rivalBuilt(R, 'house'));
  for (const h of homes) { if (rivalCivs(R).length + R.growing.length >= cap || R.res.food < 20) break; if (R.growing.some(g => g.home === h)) continue; R.growing.push({ t: 0, dur: R4.growMin + Math.random() * (R4.growMax - R4.growMin), home: h }); }
  return true;
}
// ---------- granaries: food beyond what they hold spoils ----------
function rivalGranary(R, dt) {
  const cap = INDUSTRY.granary.keepCap + rivalBuilt(R, 'granary').length * (R.stage >= 3 ? INDUSTRY.granary.capExpanded : INDUSTRY.granary.cap);
  if (R.res.food > cap) R.res.food -= (R.res.food - cap) * INDUSTRY.granary.spoil * dt;
}
// ---------- repairs: a worker mends a damaged building when no enemy is near ----------
function rivalRepairs(R) {
  for (const b of structures) {
    if (b.owner !== R.id || b.dead || b.done === false || b.fire > 0 || b.hp >= b.maxHp * 0.98) continue;
    if (units.some(u => !u.dead && u.order === 'repair' && u.repairB === b)) continue;
    if (units.some(e => !e.dead && hostile(R.team, e.team) && e.type !== 'civ' && Math.hypot(e.x - b.x, e.y - b.y) < 260)) continue;
    const w = rivalCivs(R).filter(u => u.order !== 'firefight' && u.order !== 'repair' && !u.carry).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0];
    if (w) { w.order = 'repair'; w.repairB = b; w.path = []; w.task = null; }
  }
}
// ---------- escorts: from the Hold their woodcutters go out in fives with a soldier ----------
function rivalSite(R) { return R.workSite || (R.workSite = { rival: R, kind: 'rivalwork', dead: false, name: R.name }); }
function rivalGroups(R) {
  const k = R.keep, out = rivalCivs(R).filter(u => Math.hypot(u.x - k.x, u.y - k.y) > 400).sort((a, b) => a.id - b.id), gs = [];
  for (let i = 0; i < out.length; i += GROUP_SIZE) gs.push(out.slice(i, i + GROUP_SIZE));
  return gs;
}
function rivalEscorts(R) {
  if (R.stage < 3) return;
  const site = rivalSite(R), gs = rivalGroups(R);
  for (let g = 0; g < gs.length; g++) if (!units.some(u => !u.dead && u.escort && u.escort.site === site && u.escort.g === g)) {
    const s = units.find(u => !u.dead && u.owner === R.id && ESCORT_KINDS[u.type] && !u.noGuard && !u.escort && !u.raider && !u.onWall && !u.guardOf && u.order === 'idle');
    if (s) { s.escort = { site, g }; s.escRe = 0; }
  }
}
// ---------- the sheet's soldiers and mounted knights for the rivals ----------
function rivalKit(R, u) {
  if (!IND() || !u || u.dead) return;
  if (u.type === 'archer' && !u.kit) { const roll = Math.random(); if (R.stage >= 3 && roll < 0.3) applyKit(u, 'crossbow'); else if (R.stage >= 2 && roll < 0.6) applyKit(u, 'longbow'); }
  if (u.type === 'knight') { const st = rivalBuilt(R, 'stable')[0]; if (R.stage >= 4 && st) { u.mounted = true; u.horseHp = SOLDIERS.knight.horseHp; u.speed = SOLDIERS.knight.mountedSpeed; u.name = 'Mounted Knight'; } else { u.kit = 'foot'; u.speed = SOLDIERS.knight.footSpeed; u.name = 'Foot Knight'; } }
}
function rivalFlamers(R) {   // a large army at the Castle brings one squad of ten
  if (R.stage < 4 || R.flamed || rivalArmy(R).length < RIVALS.raid.largeArmy || R.res.gold < 60) return;
  R.flamed = true; R.res.gold -= 60; const k = R.keep; const sq = time;
  for (let i = 0; i < 10; i++) { const f = nearestFree(Math.floor(k.x / TILE) + 2 + (i % 5), Math.floor(k.y1 / TILE) + 2 + Math.floor(i / 5)); if (!f) continue; const u = rivalUnit(R, 'archer', f.c * TILE + 16, f.r * TILE + 16); if (u) { applyKit(u, 'flame'); u.squadId = sq; } }
}
// ---------- the school: soldier lessons for the rivals; the great towers carry a ballista ----------
function rivalLessons(R, dt) {
  if (!rivalBuilt(R, 'school').length || (R.soldierLvl || 0) >= 5) return;
  R.lessonT = (R.lessonT || 0) + dt; if (R.lessonT < R4.lessonEvery / (RIVALS.pace[DIFF.key] || 1)) return;
  R.lessonT = 0; R.soldierLvl = (R.soldierLvl || 0) + 1; if (R.stage >= 5 && R.soldierLvl >= 3) R.schoolTop = true;
}
function rivalEngines(R) {
  for (const b of structures) if (b.owner === R.id && !b.dead && b.done !== false && (b.kind === 'roundtower' || b.kind === 'greattower') && !b.engine && R.res.gold >= R4.engineGold) { R.res.gold -= R4.engineGold; b.engine = 'ballista'; }
}
// ---------- a scout before the raids; each raid from a different side ----------
function rivalScout(R, dt) {
  if (R.friend || R.defeated) return;
  R.scoutT = (R.scoutT === undefined ? 60 + R.id * 30 : R.scoutT) - dt; if (R.scoutT > 0) return; R.scoutT = R4.scoutEvery;
  const pk = playerKeep(); if (!pk) return;
  const s = rivalArmy(R).find(u => !u.raider && !u.onWall && !u.escort && u.order === 'idle' && (u.type === 'archer' || u.type === 'knight' || u.type === 'spear'));
  if (!s) return;
  const a = Math.random() * Math.PI * 2, t = nearestFree(Math.floor((pk.x + Math.cos(a) * 520) / TILE), Math.floor((pk.y + Math.sin(a) * 520) / TILE)); if (!t) return;
  s.scout = { back: { x: s.x, y: s.y }, t: time }; s.order = 'move'; s.dest = { x: t.c * TILE + 16, y: t.r * TILE + 16 }; s.path = findPath(s.x, s.y, s.dest.x, s.dest.y); s.stuckT = 0;
  R.scouted = (R.scouted || 0) + 1;
}
function scoutBrain(u) {   // walks out, looks, comes home (or fights if caught)
  const sc = u.scout; if (!sc) return false;
  if (time - sc.t > 90 || (u.order === 'idle' && sc.home)) { u.scout = null; return false; }
  if (u.order === 'idle' && !sc.home) { sc.home = true; u.order = 'move'; u.dest = sc.back; u.path = findPath(u.x, u.y, sc.back.x, sc.back.y); u.stuckT = 0; }
  return false;
}
// the last way-point of a raid swings round to a different side of your castle each time
function raidSide(R, way) {
  const pk = playerKeep(); if (!pk || !IND()) return;
  R.raidSide = ((R.raidSide === undefined ? Math.floor(Math.random() * 4) : R.raidSide) + 1) % 4;
  const a = R.raidSide * Math.PI / 2 + RR(-0.4, 0.4), t = nearestFree(Math.floor((pk.x + Math.cos(a) * 560) / TILE), Math.floor((pk.y + Math.sin(a) * 560) / TILE));
  if (t) way.push({ x: t.c * TILE + 16, y: t.r * TILE + 16 });
}
// ---------- trade through the friend: surplus for what is short ----------
function rivalTrade(R, dt) {
  const F = REALM.rivals.find(x => x.friend && !x.defeated); if (!F || F === R || R.defeated) return;
  R.tradeT = (R.tradeT || R4.tradeEvery) - dt; if (R.tradeT > 0) return; R.tradeT = R4.tradeEvery;
  const sell = ['wood', 'food'].find(k => (R.res[k] || 0) > 400), buy = ['stone', 'iron'].find(k => (R.res[k] || 0) < 60 && R.stage >= (k === 'iron' ? 3 : 2));
  if (sell) { R.res[sell] -= 100; if (buy) R.res[buy] = (R.res[buy] || 0) + 40; else R.res.gold = (R.res.gold || 0) + 30; R.trades = (R.trades || 0) + 1; }
}
// ---------- each frame ----------
let r4T = 0;
function updateRivals4b(dt) {
  if (!IND() || !REALM.on) return;
  r4T -= dt; const tick = r4T <= 0; if (tick) r4T = 1;
  for (const R of REALM.rivals) {
    if (R.defeated || !R.keep || R.keep.dead) continue;
    rivalGranary(R, dt);
    if (!tick) continue;
    rivalGrowth(R, 1); rivalRepairs(R); rivalEscorts(R); rivalFlamers(R); rivalLessons(R, 1); rivalEngines(R); rivalScout(R, 1); rivalTrade(R, 1);
    for (const b of structures) if (b.owner === R.id && b.fire > 0 && !b.dead) callFighters(b);
  }
  for (const u of units) if (u.team !== 'player' && u.owner !== undefined && !u.dead && !u.kitDone) { u.kitDone = true; const R = rivalOf(u); if (R) rivalKit(R, u); }
}
