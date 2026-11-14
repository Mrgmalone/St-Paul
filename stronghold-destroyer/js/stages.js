'use strict';
// Stronghold Destroyer — the five castle stages: what each allows, what it takes to grow, and the growing itself.
// The numbers live in settings.js (STAGES, ECONOMY). Rivals use the same table (see realm.js).

let stageN = 1, stageCheckT = 0, wageT = 0, wagesUnpaid = false;

// which stage first allows a unit or building; anything not listed in any stage is always open
const STAGE_OF_ITEM = (() => { const m = {}; for (const st of STAGES) { for (const k of st.unlock.units) m['u:' + k] = st.n; for (const k of st.unlock.buildings) m['b:' + k] = st.n; } return m; })();
const stageOfItem = (kind, isUnit) => STAGE_OF_ITEM[(isUnit ? 'u:' : 'b:') + kind] || 1;
const unlocked = (kind, isUnit, stage = stageN) => LEGACY || !FACKEY || stageOfItem(kind, isUnit) <= stage && !(isUnit && kind === 'trebuchet' && !trebOk());   // trebuchets also need the school's top level
const stageName = n => STAGES[n - 1] ? STAGES[n - 1].name : '';

// ---------- what a side has, measured against the next stage ----------
const NEED_LABEL = { house: 'Houses', woodhut: "Woodcutter's huts", farmAny: 'Farms or wheat fields', quarry: 'Quarries', tavern: 'Taverns', smithy: 'Blacksmiths', market: 'Markets',
  mill: 'Mills', bakery: 'Bakeries', stower: 'Stone towers', school: 'School' };
function countBuilt(kind, team, owner) {
  const ok = b => !b.dead && b.done !== false && b.team === team && (owner === undefined || b.owner === owner);
  if (kind === 'farmAny') return structures.concat(farms).filter(b => ok(b) && (b.kind === 'farm' || b.kind === 'wheatfarm')).length;
  return structures.concat(farms).filter(b => ok(b) && b.kind === kind).length;
}
// have: { people, mood, food, stone, iron, count(kind) } -> one row per requirement of stage n
// the difficulty's share (Phase 4D): Medium and Hard ask more people, food, stone and iron, and a little more happiness
const stagePace = () => (typeof STAGE_PACE !== 'undefined' && FACKEY && !LEGACY && STAGE_PACE[DIFF.key]) || { mul: 1, step: 0, mood: 0 };
// a rival's people, food, stone or iron for stage n: its own table (RIVAL_NEED, the numbers from before Phase 4D)
function rivalNeedOf(n, key, base) { const t = typeof RIVAL_NEED !== 'undefined' && RIVAL_NEED[n]; return t && t[key] !== undefined ? t[key] : Math.round((base || 0) * stageMul(n, true)); }
// the multiplier for stage n's people, food, stone and iron (yours by difficulty)
function stageMul(n, rival) { if (rival) return typeof RIVAL_STAGE_MUL !== 'undefined' ? RIVAL_STAGE_MUL : 1; const P = stagePace(); return P.mul + (P.step || 0) * Math.max(0, n - 2); }
function needRows(n, have, rival) {
  const st = STAGES[n - 1]; if (!st || !st.need) return [];
  const q = st.need, rows = [], P = stagePace(), mul = stageMul(n, rival), m = v => Math.round(v * mul);
  const counted = k => !rival && typeof STAGE_COUNTED !== 'undefined' && STAGE_COUNTED.includes(k);
  if (q.people) rows.push({ key: 'people', what: 'People', have: have.people, need: rival ? rivalNeedOf(n, 'people', q.people) : Math.round(q.people * (1 + (mul - 1) / 2)) });
  if (q.mood) rows.push({ key: 'mood', what: 'Happiness', have: Math.round(have.mood), need: q.mood + (rival ? 0 : P.mood) });
  const g = (key, v) => rival ? rivalNeedOf(n, key, v) : m(v);
  if (q.food) rows.push({ key: 'food', what: 'Food in store', have: Math.floor(have.food), need: g('food', q.food) });
  if (q.stone) rows.push({ key: 'stone', what: 'Stone (used up)', have: Math.floor(have.stone), need: g('stone', q.stone) });
  if (q.iron) rows.push({ key: 'iron', what: 'Iron (used up)', have: Math.floor(have.iron), need: g('iron', q.iron) });
  for (const [k, v] of Object.entries(q.buildings || {})) rows.push({ key: 'b:' + k, kind: k, what: NEED_LABEL[k] || (BUILD[k] ? BUILD[k].name : k), have: have.count(k), need: counted(k) ? Math.round(v * (1 + (mul - 1) / 2)) : v });
  for (const r of rows) r.ok = r.have >= r.need;
  return rows;
}
const myPeople = () => units.filter(u => u.team === 'player' && !u.dead && !isMachine(u)).length;
// the stored food the next stage asks for (Cy Young's automatic sale keeps this much back: only food beyond it is surplus)
function nextStageFood(rival) {
  const n = (rival ? rival.stage : stageN) + 1, st = STAGES[n - 1]; if (!st || !st.need || !st.need.food) return 0;
  return rival ? rivalNeedOf(n, 'food', st.need.food) : Math.round(st.need.food * stageMul(n));
}
function playerHave() { return { people: myPeople(), mood, food: res.food, stone: res.stone, iron: res.iron, count: k => countBuilt(k, 'player') }; }

// ---------- growing the castle ----------
// The castle's ground is a square round the keep; its ring wall runs along the north and west sides (toward the woods),
// leaving south and east open so nobody is shut in. Each stage widens the ground by 'grow' squares in every direction.
const ringOf = n => 3 + STAGES.slice(1, n).reduce((a, s) => a + s.grow, 0);
function ringTiles(k, R) {
  const t = [];
  for (let x = k.c - R; x <= k.c + 2 + R; x++) t.push([x, k.r - R]);
  for (let y = k.r - R + 1; y <= k.r + 1 + R; y++) t.push([k.c - R, y]);
  return t.filter(([c, r]) => c >= 1 && r >= 1 && c < COLS - 1 && r < ROWS - 1);
}
function removeQuietly(b) {   // take a building away without the crash and smoke of a fall
  for (const u of units) { if (u.onWall === b) dismount(u); if (u.job === b) { u.job = null; u.order = 'idle'; u.task = null; u.crafting = null; } if (u.inside === b) u.inside = null; if (u.guardOf === b) u.guardOf = null; }
  for (let i = 0; i < b.w; i++) for (let j = 0; j < b.h; j++) setBlock(b.c + i, b.r + j, 0);
  b.dead = true; const i = structures.indexOf(b); if (i >= 0) structures.splice(i, 1);
  if (R3D.active) R3D.rebuildModel(b);
}
function moveBuilding(b, c, r) {   // nothing lost: the same building, carried to a free spot
  const field = isField(b.kind);
  if (!field) for (let i = 0; i < b.w; i++) for (let j = 0; j < b.h; j++) setBlock(b.c + i, b.r + j, 0);
  Object.assign(b, { c, r, x0: c * TILE, y0: r * TILE, x1: (c + b.w) * TILE, y1: (r + b.h) * TILE, x: (c + b.w / 2) * TILE, y: (r + b.h) * TILE });
  if (!field) for (let i = 0; i < b.w; i++) for (let j = 0; j < b.h; j++) setBlock(c + i, r + j, 1);
  if (!field) for (const u of units) { if (u.dead || u.inside || u.onWall || u.x < b.x0 - 6 || u.x > b.x1 + 6 || u.y < b.y0 - 6 || u.y > b.y1 + 6) continue;   /* anyone standing where it is set down steps aside */
    const f = nearestFree(Math.floor(u.x / TILE), Math.floor(u.y / TILE)); if (f) { u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; u.path = []; } }
  for (const u of units) if (!u.dead && (u.inside === b || u.job === b)) { u.path = []; if (u.inside === b) { u.x = b.x; u.y = b.y1 + 14; } }
  if (R3D.active) R3D.rebuildModel(b);
}
function freeSpotFor(b, k, R, wallSet) {   // nearest place inside the castle ground where the building fits clear of the wall
  const fits = (c, r) => { for (let i = -1; i <= b.w; i++) for (let j = -1; j <= b.h; j++) { const cc = c + i, rr = r + j, edge = i < 0 || j < 0 || i >= b.w || j >= b.h;
    if (wallSet.has(cc + ',' + rr)) return false; if (!edge && (tileBlocked(cc, rr) || riverTile[rr * COLS + cc])) return false; } return true; };
  let best = null, bd = 1e9;
  for (let c = k.c - R + 1; c <= k.c + 2 + R - b.w; c++) for (let r = k.r - R + 1; r <= k.r + 2 + R - b.h; r++) {
    if (c < 1 || r < 1 || c + b.w >= COLS - 1 || r + b.h >= ROWS - 1) continue;
    if (c + b.w > k.c - 1 && c < k.c + 4 && r + b.h > k.r - 1 && r < k.r + 4) continue;   // not against the keep
    if (!fits(c, r)) continue; const d = Math.hypot(c - b.c, r - b.r); if (d < bd) { bd = d; best = { c, r }; } }
  return best;
}
function raiseRing(k, n, team, opts = {}) {
  const R = ringOf(n), mat = STAGES[n - 1].wall, tiles = ringTiles(k, R), wallSet = new Set(tiles.map(([c, r]) => c + ',' + r));
  // the old ring comes down (its walls become part of the new)
  for (const b of structures.slice()) if (b.team === team && (b.startPalisade || b.castleRing) && b.ringOf === k) removeQuietly(b);
  // clear the trees and rocks on the castle's ground
  /* the castle's ground and a strip two squares wide outside it, so the new wall never closes off a pocket against the forest */
  const inGround = (x, y) => x >= (k.c - R - 2) * TILE && x < (k.c + 5 + R) * TILE && y >= (k.r - R - 2) * TILE && y < (k.r + 5 + R) * TILE;
  for (const t of trees.slice()) if (!t.gone && inGround(t.x, t.y)) fellTree(t);
  for (const q of rocks) if (!q.gone && !q.iron && inGround(q.x, q.y)) { q.gone = true; setBlock(Math.floor(q.x / TILE), Math.floor(q.y / TILE), 0); }
  // your buildings in the way of the new wall move inside it
  let moved = 0;
  for (const b of structures.concat(farms)) {
    if (b.dead || b.team !== team || b === k || b.kind === 'wall' || b.kind === 'gate' || (opts.owner !== undefined && b.owner !== opts.owner)) continue;
    let hit = false; for (let i = 0; i < b.w && !hit; i++) for (let j = 0; j < b.h && !hit; j++) if (wallSet.has((b.c + i) + ',' + (b.r + j))) hit = true;
    if (!hit) continue; const s = freeSpotFor(b, k, R, wallSet); if (s) { moveBuilding(b, s.c, s.r); moved++; }
  }
  // the new wall, in this stage's material; trees, water or other buildings in the line simply leave a gap
  let made = 0;
  for (const [c, r] of tiles) {
    if (tileBlocked(c, r) || riverTile[r * COLS + c]) continue;
    for (const u of units) if (!u.dead && !u.onWall && u.x > c * TILE - 12 && u.x < (c + 1) * TILE + 12 && u.y > r * TILE - 12 && u.y < (r + 1) * TILE + 12) { const f = nearestFree(c + 1, r + 1); if (f) { u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; u.path = []; } }   /* anyone the new wall would touch steps clear */
    const w = makeBuildingObj('wall', c, r);
    const hp = { wood: 300, brick: 600, stone: 900, thick: 1300 }[mat] || 300;
    Object.assign(w, { team, owner: opts.owner, fac: opts.fac, done: true, progress: 1, hp, maxHp: hp, castleRing: true, ringOf: k, mat, name: { wood: 'Palisade', brick: 'Brick Wall', stone: 'Stone Wall', thick: 'Thick Stone Wall' }[mat] });
    if (team !== 'player') Object.assign(w, { name: 'Enemy ' + w.name });
    setBlock(c, r, 1); structures.push(w); made++;
  }
  return { made, moved, R };
}
function growCastle() {
  const k = playerKeep(); if (!k) return;
  const st = STAGES[stageN], q = st.need || {};   // STAGES[stageN] is the next stage (the table starts at stage 1)
  { const mul = stageMul(st.n); res.stone = Math.max(0, res.stone - Math.round((q.stone || 0) * mul)); res.iron = Math.max(0, res.iron - Math.round((q.iron || 0) * mul)); }   /* (never below nothing) */
  stageN = st.n; k.stage = stageN;
  const add = st.keepHp - k.maxHp; k.maxHp = st.keepHp; k.hp = Math.min(k.maxHp, k.hp + Math.max(0, add));
  const n0 = floats.length; const r = raiseRing(k, stageN, 'player'); floats.length = n0;
  k.archerY = [0, 128, 92, 86, 110, 130][stageN]; k.topH = [0, 125, 96, 92, 120, 140][stageN];   // the archer on the keep stands higher as it grows
  if (R3D.active) R3D.rebuildModel(k);
  applyStageLocks();
  const news = [...st.unlock.units.map(u => KINDS[u].name + 's'), ...st.unlock.buildings.map(b => BUILD[b].name)];
  showBanner(`<b>Your castle grows: stage ${stageN}, the ${st.name}!</b> The ground widens by ${st.grow} squares and the wall is now ${{ brick: 'brick', stone: 'stone', thick: 'thick stone', wood: 'wood' }[st.wall]}${r.moved ? `; ${r.moved} building${r.moved > 1 ? 's' : ''} moved inside` : ''}.<br>Now open: ${news.join(', ') || 'stronger walls and keep'}.`, 9);
  AudioSys.ui && AudioSys.ui('warhorn');
  for (let i = 0; i < 24; i++) spawn('dust', k.x + RR(-80, 80), k.y - RR(0, 40), k.y);
  updateHud();
}
function updateStages(dt) {
  if (!FACKEY || LEGACY) return;
  updateWages(dt);
  if ((stageCheckT += dt) < 1) return; stageCheckT = 0;
  if (stageN >= STAGES.length) return;
  const rows = needRows(stageN + 1, playerHave());
  if (rows.length && rows.every(r => r.ok)) growCastle();
}

// ---------- wages ----------
function updateWages(dt) {
  if ((wageT += dt) < 60) return; wageT = 0;
  let owed = 0; for (const u of units) if (u.team === 'player' && !u.dead) owed += (kitOf(u) ? kitOf(u).wage : ECONOMY.wages[u.type]) || 0;
  if (!owed) { wagesUnpaid = false; return; }
  if (res.gold >= owed) { res.gold -= owed; wagesUnpaid = false; const k = playerKeep(); if (k) floatText(k.x, k.y0 - 40, `Wages paid: ${owed} gold`, '#e9dcbc'); }
  else { res.gold = 0; wagesUnpaid = true; showBanner(`<b>Your soldiers are unpaid</b> (wages ${owed} gold a minute). The people grow unhappy until there is gold.`, 4); }
}
const taxStageMul = () => FACKEY && !LEGACY ? ECONOMY.taxStageMul[stageN - 1] || 1 : 1;

// ---------- buttons: only what this stage allows ----------
function applyStageLocks() {
  document.querySelectorAll('.bb[data-b]').forEach(b => { const k = b.dataset.b; b.classList.toggle('locked', !unlocked(k, false)); });
  document.querySelectorAll('[data-k]').forEach(b => { const k = b.dataset.k; b.classList.toggle('locked', !unlocked(k, true) || (IND() && k === 'civ')); });   /* citizens grow; they cannot be bought */
  const chip = document.getElementById('vStage'); if (chip) chip.textContent = `Stage ${stageN} · ${stageName(stageN)}`;
}
// the stage box: where you stand, and what the next stage needs
function showStagePop() {
  const p = document.getElementById('stagePop'); if (!p) return;
  const next = STAGES[stageN], rows = next ? needRows(stageN + 1, playerHave()) : [];
  p.innerHTML = `<h3>Stage ${stageN}: the ${stageName(stageN)}</h3>` + (next ? `<div class="stnext">To grow into stage ${next.n}, the <b>${next.name}</b>:</div>
    <table class="sttab">${rows.map(r => `<tr class="${r.ok ? 'ok' : 'no'}"><td>${r.ok ? '&#10004;' : '&#10008;'}</td><td>${r.what}</td><td>${r.have} of ${r.need}</td></tr>`).join('')}</table>
    <div class="stnext">Then open: ${[...next.unlock.units.map(u => KINDS[u].name + 's'), ...next.unlock.buildings.map(b => BUILD[b].name)].join(', ') || 'stronger walls and keep'}.</div>` : '<div class="stnext">Your castle is at its greatest.</div>');
  p.hidden = false;
}
