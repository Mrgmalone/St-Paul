'use strict';
// Stronghold Destroyer — Phase 4B, step B4: soldiers.
// Veteran stars (one per battle survived, up to 100, a cluster above the head that lightens as it grows, each a little
// stronger); soldier lessons at the school (five levels, numbers hidden); longbowmen, crossbowmen, flamethrower squads and
// (for Psychana) berserkers; knights on foot from the Hold and mounted from the Castle on the stable's horses; lookout crews;
// engines for the giant towers. The numbers live in settings.js (SOLDIERS).
let soldierLvl = 0, soldierStudy = null, solT = 0;
const isSoldier = u => u && u.kind === 'unit' && !u.dead && u.type !== 'civ' && u.type !== 'oxcart' && !isMachine(u);
const kitOf = u => u && u.kit && SOLDIERS.kits[u.kit];
// how much stronger a soldier is: his stars and (yours only) the soldiers' lessons
const lessonsOf = u => u.team === 'player' ? soldierLvl : ((rivalOf(u) || {}).soldierLvl || 0);   // a rival's soldiers take lessons at his school too
function strongMul(u) { if (!IND() || !isSoldier(u)) return 1; return 1 + SOLDIERS.stars.dmgPer * (u.vet || 0) + SOLDIERS.lessons.dmgPer * lessonsOf(u); }
function toughMul(u) { if (!IND() || !isSoldier(u)) return 1; return 1 + SOLDIERS.stars.toughPer * (u.vet || 0) + SOLDIERS.lessons.toughPer * lessonsOf(u); }

// ---------- every blow, arrow and bolt passes through here (how: 'melee', 'arrow', 'bolt', 'stone') ----------
function adjHit(t, dmg, from, how) {
  if (!IND() || !t || t.x0 !== undefined) return dmg;
  if (from && from.kind === 'unit') from.fightT = time; t.fightT = time;
  // a soldier filling a moat cannot be hit while he does it
  if (t.order === 'attack' && t.target && t.target.kind === 'moat' && how !== 'stone') return 0;
  dmg = dmg * strongMul(from) / toughMul(t);
  // flamethrowers: longbows cannot hit them, plain archers only a little
  if (t.kit === 'flame' && how === 'arrow') { if (from && from.kit === 'longbow') return 0; if (from && from.type === 'archer' && !from.kit) dmg *= 0.5; }
  // the horse takes the blows until it falls, unless a crossbow or ballista bolt strikes the rider
  if (t.mounted && t.horseHp > 0 && !(how === 'bolt' || (from && from.kit === 'crossbow'))) {
    t.horseHp -= dmg; if (t.horseHp <= 0) dismountKnight(t); return 0;
  }
  // a flamethrower's fire hurts but cannot kill; his small knife kills archers (not crossbowmen or berserkers)
  if (from && from.kit === 'flame' && how === 'melee') { const knife = t.type === 'archer' && t.kit !== 'crossbow' && t.kit !== 'flame'; if (!knife) dmg = Math.min(dmg, Math.max(0, t.hp - 1)); }
  dmg = Math.round(dmg);
  if (from && from.kind === 'unit' && dmg >= t.hp && t.hp > 0) from.kills = (from.kills || 0) + 1;
  return dmg;
}
function dismountKnight(u) {
  u.mounted = false; u.horseHp = 0; u.kit = 'foot'; u.speed = SOLDIERS.knight.footSpeed;
  floatText(u.x, u.y - 60, 'His horse falls!', '#ffb38a'); try { R3D.rebuildModel(u); } catch (e) {}
}
// ---------- battles survived: a fight that is over while he still stands ----------
function updateBattles() {
  for (const u of units) {
    if (!isSoldier(u)) continue;
    if (u.fightT > time - 2) u.inBattle = true;
    else if (u.inBattle && time - u.fightT > SOLDIERS.stars.battleEnds) {
      u.inBattle = false; if ((u.vet || 0) < SOLDIERS.stars.max) { u.vet = (u.vet || 0) + 1; if (u.team === 'player') floatText(u.x, u.y - 64, `★ A battle survived (${u.vet})`, '#ffe08a'); }
    }
  }
}
// the stars: up to five shown, their colour lightening from bronze to white as the count grows
const STAR_TIERS = [[100, '#ffffff'], [50, '#fff4c8'], [25, '#ffd84a'], [10, '#d8dde2'], [1, '#c8823a']];
function starLook(n) { const [lo, col] = STAR_TIERS.find(([m]) => n >= m) || STAR_TIERS[4]; return { col, shown: n >= 100 ? 5 : Math.min(5, Math.max(1, Math.ceil(n / Math.max(1, lo / 2)))) }; }
function starPath(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
function drawStars(g, project) {
  if (!IND()) return;
  for (const u of units) {
    if (!u.vet || u.dead || u.inside || hiddenFrom(u, 'player') || !isSoldier(u)) continue;
    const p = project(u.x, (u.mounted ? 78 : 60) + elev3D(u), u.y); if (!p.ok || p.x < -20 || p.y < -20 || p.x > vw + 20 || p.y > vh + 20) continue;
    const { col, shown } = starLook(u.vet), r = 5;
    g.save(); g.lineWidth = 1.4; g.strokeStyle = 'rgba(30,20,8,0.9)'; g.fillStyle = col;
    for (let i = 0; i < shown; i++) { const x = p.x + (i - (shown - 1) / 2) * (r * 1.9), y = p.y - (i % 2) * 3; starPath(g, x, y, r); g.fill(); g.stroke(); }
    g.restore();
  }
}

// ---------- training the sheet's soldiers, flamethrower squads, and knights with or without horses ----------
function kitWhyNot(kit) {
  const K = SOLDIERS.kits[kit]; if (!K) return 'unknown';
  if (K.only && FACKEY !== K.only) return `only the ${FACTIONS[K.only].name} train them`;
  if (stageN < K.stage) return `come at stage ${K.stage}, the ${stageName(K.stage)}`;
  const miss = K.needs.filter(w => res[w] < 1); if (miss.length) return 'need ' + miss.map(w => w === 'armor' ? 'armor' : 'a ' + w).join(' and ');
  if ((K.iron || 0) > res.iron) return `need ${K.iron} iron`;
  if ((K.leather || 0) > (res.leather || 0)) return `need ${K.leather} leather (from your farms' cows)`;
  if (res.gold < K.gold) return `need ${K.gold} gold`;
  const pop = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && !u.gift).length + trainQueue.reduce((a, q) => a + (q.squad || 1), 0);
  if (pop + (K.squad || 1) > popCap()) return `houses full: room for ${K.squad || 1} more needed`;
  return '';
}
function trainKit(kit) {
  if (!started || won) return;
  const K = SOLDIERS.kits[kit], why = kitWhyNot(kit);
  if (why) { showBanner(`${K.name}s: ${why}.`, 3.5); return; }
  for (const w of K.needs) res[w] -= 1; res.iron -= K.iron || 0; res.leather = (res.leather || 0) - (K.leather || 0); res.gold -= K.gold;
  trainQueue.push({ kind: K.base, kit, squad: K.squad || 0, t: 0, dur: (COSTS[K.base] ? COSTS[K.base].time : 15) * CIV.train * (K.squad ? 1.5 : 1) });
  updateHud();
}
function applyKit(u, kit) {
  const K = SOLDIERS.kits[kit]; u.kit = kit; u.name = K.name;
  Object.assign(u, { hp: K.hp, maxHp: K.hp, dmg: K.dmg, range: K.range, cd: K.cd, speed: K.speed });
  if (K.sight) u.sight = Math.max(u.sight || 0, (KINDS.archer.range + 30) * K.sight);
  if (kit === 'flame') u.noGuard = true;   // flamethrowers go to war only: no guarding, no escorting
}
// a finished place in the training queue: the sheet's soldiers, a squad of ten, or a knight with a horse if there is one
function finishTraining(q, k, rp) {
  const out = [];
  if (q.kit === 'flame') { for (let i = 0; i < (q.squad || 10); i++) { const f = nearestFree(Math.floor(k.x1 / TILE) + (i % 5), Math.floor(k.y1 / TILE) + 1 + Math.floor(i / 5)); const u = makeUnit('player', 'archer', f ? f.c * TILE + 16 : k.x1 + 14, f ? f.r * TILE + 16 : k.y1 + 20); applyKit(u, 'flame'); u.squadId = q.t0 || time; out.push(u); } }
  else { const u = makeUnit('player', q.kind, k.x1 + 14, k.y1 - 20); if (q.kit) applyKit(u, q.kit); else if (IND() && q.kind === 'knight') horseFor(u); out.push(u); }
  return out;
}
function horseFor(u) {
  const st = stageN >= 4 ? mineDone('stable').find(s => (s.horses || 0) > 0) : null;
  if (st) { st.horses--; u.mounted = true; u.horseHp = SOLDIERS.knight.horseHp; u.speed = SOLDIERS.knight.mountedSpeed; u.name = 'Mounted Knight'; floatText(u.x, u.y - 60, 'Mounted on a horse from the stable', '#9fe8a8'); }
  else { u.kit = 'foot'; u.speed = SOLDIERS.knight.footSpeed; u.name = 'Foot Knight'; if (stageN >= 4) floatText(u.x, u.y - 60, 'No horse in the stable: he fights on foot', '#ffd98a'); }
}
// flamethrowers dig a short moat round themselves when they stand in the open field
function flameMoats() {
  for (const u of units) {
    if (u.kit !== 'flame' || u.dead || u.order !== 'idle') continue;
    const k = u.team === 'player' ? playerKeep() : null; if (k && Math.hypot(u.x - k.x, u.y - k.y) < TERRITORY) continue;
    if (u.dugAt && Math.hypot(u.dugAt.x - u.x, u.dugAt.y - u.y) < 120) continue;
    u.dugAt = { x: u.x, y: u.y };
    const lead = units.filter(o => o.kit === 'flame' && !o.dead && o.squadId === u.squadId && o.team === u.team && Math.hypot(o.x - u.x, o.y - u.y) < 160);
    if (lead[0] !== u) continue;   // one digs for the squad
    const cx = lead.reduce((a, o) => a + o.x, 0) / lead.length, cy = lead.reduce((a, o) => a + o.y, 0) / lead.length, foe = nearestEnemy(u, 900);
    const ang = foe ? Math.atan2(foe.y - cy, foe.x - cx) : 0; let dug = 0;
    for (let i = -2; i <= 2 && dug < SOLDIERS.flameMoat; i++) {
      const a = ang + i * 0.35, c = Math.floor((cx + Math.cos(a) * 110) / TILE), r = Math.floor((cy + Math.sin(a) * 110) / TILE);
      if (c < 1 || r < 1 || c >= COLS - 1 || r >= ROWS - 1 || tileBlocked(c, r) || riverTile[r * COLS + c] || units.some(o => !o.dead && Math.floor(o.x / TILE) === c && Math.floor(o.y / TILE) === r)) continue;
      const m = createBuilding('moat', c, r); m.team = u.team; if (u.owner !== undefined) m.owner = u.owner; finishBuilding(m); dug++;
    }
    if (dug) floatText(cx, cy - 60, 'The flamethrowers dig in behind a moat', '#ffd98a');
  }
}
// ---------- the school's soldier lessons (five levels; the numbers stay hidden) ----------
function startSoldierLessons() {
  if (!schoolBuilt()) { showBanner('Build a School first.', 2.5); return; }
  if (soldierStudy) { showBanner('The soldiers are already at their lessons.', 2.5); return; }
  if (soldierLvl >= 5) { showBanner('Your soldiers have learned all five levels.', 2.5); return; }
  const [g, s] = SOLDIERS.lessons.levels[soldierLvl]; if (res.gold < g) { showBanner(`Soldier lessons, level ${soldierLvl + 1}: ${g} gold. You have ${Math.floor(res.gold)}.`, 3); return; }
  res.gold -= g; soldierStudy = { lvl: soldierLvl + 1, t: 0, dur: s }; showBanner(`Your soldiers begin lessons, level ${soldierLvl + 1}.`, 3); AudioSys.ui('select'); updateHud();
}
// ---------- lookout towers: a sentry at the door, an archer on top, and a longbowman from the Homestead ----------
function lookoutCrews() {
  for (const b of structures) {
    if (b.kind !== 'lookout' || b.dead || b.done === false) continue;
    const st = b.team === 'player' ? stageN : (rivalOf(b) || {}).stage || 1;
    if (st >= SOLDIERS.lookout.longbowFrom && !b.longbow) { b.longbow = true; b.range = SOLDIERS.lookout.range; b.shots = 2; try { R3D.rebuildModel(b); } catch (e) {} if (b.team === 'player') floatText(b.x, b.y - b.topH - 10, 'A longbowman joins the lookout', '#9fe8a8'); }
  }
}
// ---------- the giant towers' engines ----------
const engineCost = a => IND() ? SOLDIERS.towerEngine[a] : (a === 'ballista' ? { wood: 110, gold: 50 } : { wood: 200, stone: 40, gold: 80 });
const engineText = a => Object.entries(engineCost(a)).map(([k, v]) => `${v} ${k}`).join(', ');
function engineWhyNot(a) { if (a === 'trebuchet' && IND() && (stageN < 5 || schoolLvl < 3)) return 'A trebuchet needs stage 5, the Stronghold, and the school\'s top level.'; return ''; }

// ---------- each frame ----------
function updateSoldiers(dt) {
  if (!IND() || !started) return;
  if (soldierStudy && schoolBuilt()) { soldierStudy.t += dt; if (soldierStudy.t >= soldierStudy.dur) { soldierLvl = soldierStudy.lvl; soldierStudy = null; showBanner(`Your soldiers have finished their lessons: level ${soldierLvl} of 5.`, 4); AudioSys.ui('bell'); } }
  solT -= dt; if (solT > 0) return; solT = 1;
  updateBattles(); lookoutCrews(); flameMoats(); kitButtons();
  for (const u of units) if (u.kit === 'flame' && !u.dead) { u.guardOf = null; u.escort = null; }
}
// the Army tab's buttons for the sheet's soldiers: locked until their stage (the berserker only for Psychana)
document.querySelectorAll('.kb[data-kit]').forEach(b => { b.onclick = () => trainKit(b.dataset.kit); });
function kitButtons() {
  document.querySelectorAll('.kb[data-kit]').forEach(b => { const K = SOLDIERS.kits[b.dataset.kit]; b.hidden = !IND() || (K.only && FACKEY !== K.only); b.classList.toggle('locked', stageN < K.stage);
    const w = b.querySelector('.why'), why = stageN < K.stage ? '' : kitWhyNot(b.dataset.kit); if (w && w.textContent !== why) w.textContent = why; });
}
