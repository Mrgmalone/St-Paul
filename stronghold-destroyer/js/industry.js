'use strict';
// Stronghold Destroyer — Phase 4B, step B1: the industries.
// Yards that grow and merge, quarries and their oxen, the animal farm, the Fletcher and the stable, wheat fields, mills and
// bakeries, the granary's limit, ale prices, the feast, market prices, the school and its engineers, and the houses of healing.
// The numbers live in settings.js (INDUSTRY). The older test game (LEGACY) runs without any of this.

const IND = () => !LEGACY && !!FACKEY;
const lv = a => a[clamp(stageN, 1, 5) - 1];
const FIELD_TYPE = { farm: 'food', wheatfarm: 'wheat', hopfarm: 'hops', vineyard: 'grapes', orchard: 'apples' };
let schoolLvl = 0, schoolStudy = null, alePrice = 1, taxTotal = 0, feastUntil = 0, doctorLvl = 0, doctorStudy = null, warNow = false;
let indStage = 0, indT = 0, granaryOverT = 0, bugsOn = false, bugT = 0, bugCalmT = 0, rockNoteT = -99, oxFoodT = 0;
const mineAll = k => structures.concat(farms).filter(b => b.kind === k && b.team === 'player' && !b.dead);
const mineDone = k => mineAll(k).filter(b => b.done !== false);

// ---------- how many of each may stand, and how many people each holds ----------
function indMax(kind) {
  const I = INDUSTRY;
  if (kind === 'woodhut') return lv(I.yard.max);
  if (kind === 'quarry') return I.quarry.max;
  if (kind === 'wheatfarm') return lv(I.fields.max);
  if (kind === 'mill') return stageN >= 3 ? I.mill.maxLate : I.mill.maxEarly;
  if (kind === 'bakery') return I.mill.bakeries * mineDone('mill').length;
  if (kind === 'school' || kind === 'market') return 1;
  if (kind === 'stable') return mineDone('farm').length;
  return Infinity;
}
const IND_STAFF = { quarry: () => INDUSTRY.quarry.staff, woodhut: () => lv(INDUSTRY.yard.staff), wheatfarm: () => lv(INDUSTRY.fields.staff),
  mill: () => stageN >= 3 ? INDUSTRY.mill.staffLate : INDUSTRY.mill.staffEarly, bakery: () => INDUSTRY.mill.bakeryStaff,
  alehouse: () => 1, waterpot: () => 1, bowyer: () => 2, stable: () => 4, farm: () => 4, vineyard: () => 3, orchard: () => 3, apothecary: () => 1 };
const indStaff = k => IND_STAFF[k] ? IND_STAFF[k]() : 3;
// how many come by themselves; more can be added from the building's box (Fill adds as many as it holds)
const IND_AUTO = { wheatfarm: 2, woodhut: 2, quarry: 2, farm: 2, stable: 4 };
const jobWant = site => IND() ? Math.min(indStaff(site.kind), IND_AUTO[site.kind] || 1) : JOBS[site.kind];
// may another of this kind be placed now? (an empty string means yes)
function indWhyNot(kind) {
  if (!IND()) return '';
  const have = mineAll(kind).length, max = indMax(kind), nm = indName(kind);
  if (kind === 'bakery' && !mineDone('mill').length) return 'Build a Mill first: each mill keeps five bakeries going.';
  if (kind === 'stable' && !mineDone('farm').length) return 'The stable stands inside a farm: build a Farm first.';
  if (have >= max) return kind === 'woodhut' || kind === 'wheatfarm' || kind === 'mill' ? `You have the most ${nm}s the ${stageName(stageN)} allows (${max}). As the castle grows they merge into fewer, bigger ones.`
    : `You can have ${max === 1 ? 'one' : max} ${max === 1 ? nm : nm + 's'}${kind === 'bakery' ? ' (five for each mill)' : ''}.`;
  return '';
}
const indName = k => k === 'woodhut' ? yardName(stageN) : k === 'bowyer' ? 'Fletcher' : BUILD[k] ? BUILD[k].name : k;
const yardName = n => n >= 3 ? 'Wood and Iron Yard' : n >= 2 ? 'Wood Yard' : "Woodcutter's Hut";

// ---------- growing: the castle's industries merge into fewer, bigger ones ----------
function mergeOnGrowth() {
  for (const kind of ['woodhut', 'wheatfarm', 'mill']) {
    const list = mineDone(kind), max = indMax(kind); if (list.length <= max) continue;
    list.sort((a, b) => (b.produced || 0) - (a.produced || 0));   // the busiest stay
    const keepers = list.slice(0, max);
    for (const b of list.slice(max)) {
      const to = keepers.slice().sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
      for (const u of units) if (u.job === b && !u.dead) { u.job = staffOf(to) < indStaff(kind) ? to : null; u.order = 'idle'; u.task = null; u.crafting = null; u.path = []; u.ironWork = false; }
      to.produced = (to.produced || 0) + (b.produced || 0);
      if (isField(kind)) { b.dead = true; const i = farms.indexOf(b); if (i >= 0) farms.splice(i, 1); if (R3D.active) R3D.rebuildModel(b); } else removeQuietly(b);
      floatText(to.x, to.y - (to.topH || 30) - 16, `Merged into this ${indName(kind)}`, '#9fe8a8');
    }
    showBanner(`Your ${indName(kind)}s merge: ${max === 1 ? 'one' : max} now, each holding up to ${indStaff(kind)} people.`, 4);
  }
}
function renameAll() {
  for (const b of structures) if (b.team === 'player' && !b.dead) {
    if (b.kind === 'woodhut') { const n = yardName(stageN); if (b.name !== n) { b.name = n; if (R3D.active) R3D.rebuildModel(b); } }
    else if (b.kind === 'bowyer') b.name = 'Fletcher';
    b.lvl = stageN;
  }
}
function relabelButtons() {
  const set = (k, title, small) => { const el = document.querySelector(`[data-b="${k}"]`); if (!el) return; const sm = el.querySelector('small'); if (el.childNodes[1] && el.childNodes[1].nodeType === 3) el.childNodes[1].textContent = title; if (sm && small) sm.innerHTML = small; };
  set('woodhut', yardName(stageN), `30 wood &middot; ${lv(INDUSTRY.yard.staff)} people${stageN >= 3 ? ' &middot; wood and iron' : ''}`);
  set('bowyer', 'Fletcher', '40 wood &middot; wood to bows &middot; needs cows');
  set('mill', 'Mill', `60 wood &middot; wheat to flour${stageN >= 3 ? ' &middot; keeps 5 bakeries' : ''}`);
  const f = document.getElementById('feast'); if (f) { const sm = f.querySelector('small'); if (sm) sm.innerHTML = 'from the Hold &middot; a great feast'; }
}

// ---------- the wood and iron yard ----------
const YARD_IRON = { inp: {}, out: 'iron', time: INDUSTRY.yard.ironEvery, batch: 4 };
function yardIron(b) {
  if (stageN < INDUSTRY.yard.ironFrom) return 0;
  if (!b.ironChosen) b.ironN = Math.round(indStaff('woodhut') * 0.4);   // at the Stronghold: 10 of the 25 on iron, 15 on wood
  return Math.min(b.ironN, staffOf(b));
}
function updateYards() {
  for (const b of mineDone('woodhut')) {
    const want = yardIron(b), crew = units.filter(u => u.job === b && !u.dead && u.type === 'civ');
    crew.forEach((u, i) => {
      const iron = i < want;
      if (!!u.ironWork !== iron) { if (u.carry > 0 && u.carryType) { res[u.carryType] = (res[u.carryType] || 0) + u.carry; u.carry = 0; } u.ironWork = iron; u.order = 'idle'; u.task = null; u.crafting = null; u.path = []; }
      // from the Hold, wagons carry the woodcutters to the forest and back (a hitching area stands by the yard)
      u.speedMul = !iron && stageN >= 3 && u.order === 'gather' && (u.sub === 'toNode' || u.sub === 'toKeep') ? INDUSTRY.yard.wagonSpeed : 1;
    });
  }
}
const yardReach = () => IND() && stageN >= INDUSTRY.yard.ironFrom ? 1100 : 460;   // how far the woodcutters go for trees (wagons from the Hold)
// arrows and bolts cost wood; with no wood, archers tip their arrows with stones (a little weaker, no quarry needed)
function arrowCost(a) {
  if (!IND() || !a.from || a.from.team !== 'player' || a.kind === 'stone') return;
  const c = a.kind === 'bolt' ? INDUSTRY.boltWood : INDUSTRY.arrowWood;
  if (res.wood >= c) { res.wood -= c; return; }
  a.dmg = Math.round(a.dmg * INDUSTRY.rockArrow); a.rock = true;
  if (time - rockNoteT > 60) { rockNoteT = time; showBanner('No wood for arrows: your archers tip them with stones (a little weaker).', 3.5); }
}

// ---------- quarries and their oxen ----------
const oxenOf = q => units.filter(o => o.type === 'oxcart' && !o.dead && o.home === q);
function updateQuarries(dt) {
  const want = lv(INDUSTRY.quarry.oxen), cost = lv(INDUSTRY.quarry.oxReplace);
  for (const q of mineDone('quarry')) {
    q.oxFree = Math.max(q.oxFree || 0, want);   // the castle's growth brings its oxen free
    const have = oxenOf(q);
    for (const o of have) { o.speedMul = lv(INDUSTRY.quarry.oxSpeed); o.strong = lv(INDUSTRY.quarry.oxSpeed); }
    if (have.length >= want) continue;
    const f = nearestFree(Math.floor((q.x + 40) / TILE), Math.floor(q.y / TILE)); if (!f) continue;
    let how = '';
    if ((q.oxHad || 0) < q.oxFree) how = 'free with the castle';
    else { const fm = mineDone('farm').find(x => x.animals && x.animals.oxen > 0);
      if (fm) { fm.animals.oxen--; how = 'from your farm'; }
      else if ((q.oxWaitT || 0) <= time && res.food >= cost[0] && res.gold >= cost[1]) { spendFood(cost[0]); res.gold -= cost[1]; how = `bought for ${cost[0]} food and ${cost[1]} gold`; }
      else { if (!(q.oxWaitT > time)) { q.oxWaitT = time + 30; floatText(q.x, q.y - 60, `An ox is needed: ${cost[0]} food and ${cost[1]} gold, or one from a farm`, '#ffb38a'); } continue; } }
    const c = makeUnit('player', 'oxcart', f.c * TILE + 16, f.r * TILE + 16); c.home = q; c.order = 'cart'; c.facing = 1; q.oxHad = (q.oxHad || 0) + 1;
    floatText(q.x, q.y - 60, `An ox cart arrives (${how})`, '#9fe8a8');
  }
  // oxen eat
  oxFoodT += dt; if (oxFoodT >= 60) { oxFoodT -= 60; const n = units.filter(o => o.type === 'oxcart' && !o.dead && o.team === 'player').length, eat = n * lv(INDUSTRY.quarry.oxFood); if (eat > 0 && res.food > 0) spendFood(Math.min(Math.floor(res.food), eat)); }
}
// on foot, people carry stone only from rocks near the castle; farther stone needs a quarry and its oxen
const nearStone = r => { const k = playerKeep(); return !IND() || !k || Math.hypot(r.x - k.x, r.y - k.y) <= INDUSTRY.quarry.footStone; };

// ---------- the animal farm, the stable and the Fletcher ----------
const ANIMAL_NAME = { cows: 'Cows', pigs: 'Pigs', oxen: 'Oxen', chickens: 'Chickens', turkeys: 'Turkeys', sheep: 'Sheep', horses: 'Horses' };
const animalsAll = k => mineDone('farm').reduce((a, f) => a + ((f.animals && f.animals[k]) || 0), 0);
const horsesAll = () => mineDone('stable').reduce((a, s) => a + (s.horses || 0), 0);
function updateFarms(dt) {
  for (const f of mineDone('farm')) {
    if (!f.animals) { f.animals = Object.assign({}, INDUSTRY.farmStart); f.bornT = {}; }
    if (!staffOf(f)) continue;   // the animals breed while their keepers work
    for (const [k, [every, cap]] of Object.entries(INDUSTRY.animals)) {
      if (k === 'horses') continue;
      const from = k === 'oxen' ? f.animals.cows : f.animals[k];   // bulls born to the cows become oxen
      if (from < (k === 'oxen' ? 2 : 1) || f.animals[k] >= cap) continue;
      f.bornT[k] = (f.bornT[k] || 0) + dt; if (f.bornT[k] < every) continue; f.bornT[k] = 0; f.animals[k]++;
    }
    f.leatherT = (f.leatherT || 0) + dt;
    if (f.leatherT >= INDUSTRY.leatherEvery && f.animals.cows >= 2) { f.leatherT = 0; res.leather = (res.leather || 0) + 1; }
  }
  for (const s of mineDone('stable')) {
    s.horses = s.horses || 0;
    if (staffOf(s) < indStaff('stable')) continue;   // the stable needs four people to run
    s.horseT = (s.horseT || 0) + dt;
    if (s.horseT >= INDUSTRY.animals.horses[0] && s.horses < INDUSTRY.animals.horses[1]) { s.horseT = 0; s.horses++; floatText(s.x, s.y - 50, 'A foal is born at the stable', '#9fe8a8'); }
  }
}
// what stops a workshop now and then (an empty string means nothing)
function indBlock(site) {
  if (!IND()) return '';
  if (site.kind === 'bowyer' && animalsAll('cows') < 2) return 'The Fletcher needs 2 cows at your farms (hide glue and sinew for the bows)';
  if (site.kind === 'bakery' && !mineDone('mill').some(m => staffOf(m) > 0)) return 'The bakery needs a working mill';
  return '';
}
// the stable must stand inside (beside) a farm
const nearFarm = (cx, cy) => mineDone('farm').some(f => Math.hypot(f.x - cx, (f.y0 + f.y1) / 2 - cy) < 110);

// ---------- sentries for fields and farms ----------
function postSentry(b) {
  const sold = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && u.type !== 'civ' && u.type !== 'king' && !u.gift && !u.guardOf && !u.onWall && u.order === 'idle')
    .sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
  if (!sold) { showBanner('No idle soldier to post as a sentry. Train a spearman or archer.', 3); return; }
  const sp = nearestFree(Math.floor(b.x1 / TILE), Math.floor(((b.y0 + b.y1) / 2) / TILE)); if (!sp) return;
  sold.guardOf = b; sold.guardSpot = { x: sp.c * TILE + 16, y: sp.r * TILE + 16 }; sold.cmdT = -99; sold.sentry = true;
  commandMove([sold], sold.guardSpot.x, sold.guardSpot.y);
  floatText(b.x, b.y - 40, `${sold.name} stands sentry here`, '#9fe8a8');
}
const sentryOf = b => units.find(u => !u.dead && u.guardOf === b && u.team === 'player');

// ---------- the granary: food beyond what the stores hold brings bugs, sickness and deaths ----------
function foodCap() {
  let c = INDUSTRY.granary.keepCap;
  for (const b of mineDone('granary')) c += b.expanded ? INDUSTRY.granary.capExpanded : INDUSTRY.granary.cap;
  return c;
}
function updateGranary(dt) {
  const over = res.food - foodCap(), G = INDUSTRY.granary;
  if (over > 0) {
    granaryOverT += dt; bugCalmT = 0;
    if (granaryOverT >= G.bugsAfter && !bugsOn) { bugsOn = true; bugT = 0; showBanner('Bugs in the granary! More food is stored than it holds. Rest some farms (their workers wait by the fire, no harm done) or sell food at the market. From the Hold you can expand the granary.', 6); AudioSys.ui('warn'); }
    if (bugsOn) {
      const spoil = Math.max(1, Math.round(over * G.spoil * dt)); spendFood(Math.min(spoil, Math.floor(res.food)));
      bugT += dt;
      const people = units.filter(u => u.team === 'player' && !u.dead && u.type === 'civ' && !u.sick);
      if (bugT % 20 < dt && people.length) { const v = people[Math.floor(Math.random() * people.length)]; v.sick = 1; v.healT = 0; floatText(v.x, v.y - 55, 'Sick from the spoiled food...', '#c8e0a0'); }
      if (bugT > 120 && bugT % 30 < dt) { const s = units.filter(u => u.team === 'player' && !u.dead && u.type === 'civ' && u.sick).sort((a, b) => (b.sickT || 0) - (a.sickT || 0))[0]; if (s) { floatText(s.x, s.y - 55, 'Died of the sickness', '#ff8a7a'); kill(s); showBanner('Someone has died of the sickness from the spoiled food.', 3.5); } }
    }
  } else { granaryOverT = 0; if (bugsOn && (bugCalmT += dt) > 10) { bugsOn = false; showBanner('The granary is clean again.', 3); } }
}
function restFarms(on) { for (const f of mineDone('farm')) { f.asleep = on; if (on) for (const u of units) if (u.job === f) { u.job = null; u.order = 'idle'; u.task = null; u.crafting = null; } } }

// ---------- ale: the price at the alehouse and tavern ----------
const alePriceNow = () => Math.min(2, alePrice + (warNow ? 0.5 : 0));   // in wartime the price goes up half a step
const aleAt = (arr, p) => { const i = Math.floor(p), f = p - i; return i >= arr.length - 1 ? arr[arr.length - 1] : arr[i] * (1 - f) + arr[i + 1] * f; };   // between two price settings
function indWarCheck() { const k = playerKeep(); warNow = !!k && units.some(e => !e.dead && hostile('player', e.team) && e.type !== 'civ' && Math.hypot(e.x - k.x, e.y - k.y) < 1000); }
function aleDrunks(dt, drinkers) {
  if (alePriceNow() >= 0.5 || !drinkers) return;   /* only cheap ale makes drunks */
  if (Math.random() < INDUSTRY.ale.drunks[0] * drinkers * dt) {
    const w = units.filter(u => u.team === 'player' && !u.dead && u.type === 'civ' && u.job && !(u.drunkUntil > time));
    const v = w[Math.floor(Math.random() * w.length)]; if (v) { v.drunkUntil = time + 30; floatText(v.x, v.y - 55, 'Drunk! (cheap ale)', '#ffd27a'); }
  }
}
const drunkMul = u => u.drunkUntil > time ? 0.5 : 1;

// ---------- the feast (from the Hold): never by itself, costs more than every tax gathered this game ----------
const feastCost = () => Math.max(INDUSTRY.feast.minGold, Math.ceil(taxTotal * 1.1));
function feastNeeds() {
  const N = INDUSTRY.feast.needs, have = { grapes: Math.floor(res.grapes || 0), apples: Math.floor(res.apples || 0), chickens: animalsAll('chickens'), turkeys: animalsAll('turkeys'), cows: animalsAll('cows'), sheep: animalsAll('sheep') };
  return Object.entries(N).map(([k, v]) => ({ k, what: k[0].toUpperCase() + k.slice(1), have: have[k], need: v, ok: have[k] >= v }));
}
function takeAnimals(k, n) { for (const f of mineDone('farm')) { const t = Math.min(n, (f.animals && f.animals[k]) || 0); if (t) { f.animals[k] -= t; n -= t; } if (!n) break; } }
function holdFeast() {
  if (stageN < 3) { showBanner('The feast comes at stage 3, the Hold.', 3); return; }
  if (feastUntil > time) { showBanner('A feast is already under way.', 2.5); return; }
  const rows = feastNeeds(), miss = rows.filter(r => !r.ok), cost = feastCost();
  if (miss.length) { showBanner('For a feast you still need: ' + miss.map(r => `${r.need - r.have} more ${r.k}`).join(', ') + '.', 4.5); return; }
  if (res.gold < cost) { showBanner(`A feast costs ${cost} gold (more than all the taxes gathered this game). You have ${Math.floor(res.gold)}.`, 4); return; }
  res.gold -= cost; res.grapes -= INDUSTRY.feast.needs.grapes; res.apples -= INDUSTRY.feast.needs.apples;
  for (const k of ['chickens', 'turkeys', 'cows', 'sheep']) takeAnimals(k, INDUSTRY.feast.needs[k]);
  feastUntil = time + INDUSTRY.feast.lasts; cheer(INDUSTRY.feast.mood, INDUSTRY.feast.lasts, `A great feast! +${INDUSTRY.feast.mood} mood`);
  AudioSys.ui('cheer'); showBanner(`A great feast! For ${Math.round(INDUSTRY.feast.lasts / 60)} minutes nothing upsets your people, and they work twice as hard.`, 5); updateHud();
}
const feastWork = () => feastUntil > time ? INDUSTRY.feast.work : 1;
{ const fb = document.getElementById('feast'), old = fb.onclick; fb.onclick = () => { if (!IND()) return old(); if (!started || won) return; showIndBox(FEAST_BOX); }; }
const FEAST_BOX = { kind: 'feastbox', name: 'The Feast', x: 0, y: 0 };

// ---------- the market: prices from what goods cost to make ----------
function indPrice(row) {
  const [k, , lot] = row, M = INDUSTRY.market, L = Math.min(3, schoolLvl), m = marketMul(), fm = myRule('marketBuyMul', 1), base = (M.makeCost[k] || 2) * lot;
  if (k === 'food' || k === 'bread') { const p = Math.max(1, Math.round(base * 1.5 * m * fm)); return { buy: p, sell: p }; }   // food costs the same to buy and to sell
  const buy = Math.max(2, Math.ceil(base * M.buy[L] * m * fm));
  return { buy, sell: Math.max(1, Math.min(buy - 1, Math.floor(base * M.sell[L] * (2 - m) * fm))) };
}
function checkMarketLoss() {
  for (const b of structures) if (b.kind === 'market' && b.team === 'player' && b.dead && !b.lossDone && b.hp <= 0) {
    b.lossDone = true; mood = Math.max(0, mood + INDUSTRY.market.destroyedMood);
    showBanner(`Your market has been destroyed! It was your most valuable building: your people lose heart (${INDUSTRY.market.destroyedMood} mood) and trade stops until you rebuild it.`, 6); AudioSys.ui('warn');
  }
}

// ---------- the school, engineers and the doctor ----------
const schoolBuilt = () => mineDone('school').length > 0;
function startStudy(kind) {
  if (kind === 'school') {
    if (!schoolBuilt()) return; if (schoolStudy) { showBanner('A lesson is already under way.', 2); return; }
    if (schoolLvl >= 3) { showBanner('Your people have learned all three levels.', 2.5); return; }
    const [g, s] = INDUSTRY.school.levels[schoolLvl]; if (res.gold < g) { showBanner(`Level ${schoolLvl + 1} costs ${g} gold. You have ${Math.floor(res.gold)}.`, 3); return; }
    res.gold -= g; schoolStudy = { lvl: schoolLvl + 1, t: 0, dur: s }; showBanner(`The school begins teaching level ${schoolLvl + 1} (about ${Math.round(s / 60 * 10) / 10} minutes).`, 3);
  } else {
    if (stageN < 5) { showBanner('The doctor can learn more at stage 5, the Stronghold.', 3); return; }
    if (doctorLvl || doctorStudy) { showBanner(doctorLvl ? 'The doctor has already learned all he can.' : 'The doctor is already studying.', 2.5); return; }
    if (res.gold < INDUSTRY.health.doctorCost) { showBanner(`It costs ${INDUSTRY.health.doctorCost} gold. You have ${Math.floor(res.gold)}.`, 3); return; }
    res.gold -= INDUSTRY.health.doctorCost; doctorStudy = { t: 0, dur: INDUSTRY.health.doctorTime }; showBanner('The doctor studies to become smarter (about 2 minutes).', 3);
  }
  AudioSys.ui('select'); updateHud();
}
function updateStudy(dt) {
  if (schoolStudy && schoolBuilt()) { schoolStudy.t += dt; if (schoolStudy.t >= schoolStudy.dur) { schoolLvl = schoolStudy.lvl; schoolStudy = null; showBanner(`Your people have learned level ${schoolLvl}: less material wasted, cheaper and quicker building${schoolLvl >= 2 ? ', better market prices' : ''}.`, 5); AudioSys.ui('bell'); } }
  if (doctorStudy && mineDone('apothecary').length) { doctorStudy.t += dt; if (doctorStudy.t >= doctorStudy.dur) { doctorLvl = 1; doctorStudy = null; showBanner('The doctor is smarter now: the apothecary heals twice as fast.', 4); } }
}
const learnWaste = () => IND() ? 1 - INDUSTRY.school.waste * schoolLvl : 1;
const learnCost = () => IND() ? 1 - INDUSTRY.school.buildCost * schoolLvl : 1;
const learnTime = () => IND() ? 1 - INDUSTRY.school.buildTime * schoolLvl : 1;
const engineers = () => units.filter(u => u.team === 'player' && !u.dead && u.engineer);
function trainEngineer() {
  const huts = mineDone('engineerhut'), room = huts.length * INDUSTRY.engineersPerHut;
  if (!huts.length) { showBanner("Engineers live in an Engineer's Hut: build one first.", 3); return; }
  if (engineers().length >= room) { showBanner(`Your engineer's huts are full (${room}). Build another hut for more engineers.`, 3); return; }
  if (res.gold < INDUSTRY.school.engineerCost) { showBanner(`Training an engineer costs ${INDUSTRY.school.engineerCost} gold.`, 2.5); return; }
  const s = mineDone('school')[0], u = units.filter(v => v.team === 'player' && !v.dead && v.type === 'civ' && !v.job && !v.engineer && !(v.breakUntil > time)).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
  if (!u) { showBanner('No free civilian to train. Train one at the keep.', 3); return; }
  res.gold -= INDUSTRY.school.engineerCost; u.engineer = true; u.name = 'Engineer';
  const hut = huts.find(h => engineers().filter(e => e.job === h).length < INDUSTRY.engineersPerHut) || huts[0];
  u.job = hut; u.order = 'idle'; u.task = null; u.carry = 0; startJob(u);
  floatText(u.x, u.y - 55, 'Trained as an engineer', '#9fe8a8'); AudioSys.ui('ready'); updateHud();
}
// an engineer waits at the hut (repairs come in step B5, Fire and repair)
function engineerJob(u) { const h = u.job; if (edgeDist(u, h) > 40) { const ap = approachPoint(u, h); commandMove([u], ap.x, ap.y); u.cmdT = -99; } else { u.order = 'idle'; u.moving = false; } }
// the trebuchet needs the Stronghold and the school's top level
const trebOk = () => !IND() || schoolLvl >= 3;

// ---------- houses of healing and prayer ----------
const HEAL_KINDS = ['apothecary', 'chapel', 'church', 'abbey'];
let healers = [];
function healRate(b) { const H = INDUSTRY.health[b.kind]; let r = H.heal; if (b.kind === 'apothecary' && doctorLvl) r *= INDUSTRY.health.doctorMul; if (b.kind === 'abbey') r *= myRule('abbeyHealMul', 1); return r; }
function healerFor(u) { let best = 0; for (const b of healers) if (Math.hypot(b.x - u.x, b.y - u.y) < INDUSTRY.health[b.kind].r) best = Math.max(best, healRate(b)); return best; }
function healthMood(n) {
  let cap = 0, best = 0, sum = 0;
  for (const b of healers) { const H = INDUSTRY.health[b.kind]; cap += H.serves; best = Math.max(best, H.mood); sum += H.mood; }
  const cover = n ? Math.min(1, cap / n) : 0;
  return [cover, Math.round(Math.min(12, Math.max(best, sum * 0.5)) * cover)];
}
function updateHealHouses(dt) {   /* (not updateHealers: that is Hekaranok's own, in factions.js) */
  healers = HEAL_KINDS.flatMap(k => mineDone(k));
  if (!healers.length) return;
  // the wounded nearby slowly mend (not while fighting)
  for (const u of units) if (u.team === 'player' && !u.dead && !isMachine(u) && u.hp < u.maxHp && time - (u.lastHurt || -99) > 8) { const h = healerFor(u); if (h) u.hp = Math.min(u.maxHp, u.hp + h * dt); }
}

// ---------- building boxes: the extra lines and buttons for the industries ----------
const IND_BOX = { school: 1, engineerhut: 1, apothecary: 1, church: 1, abbey: 1, feastbox: 1 };
const lnI = (a, v) => `<div class="ln"><span>${a}</span><b>${v}</b></div>`;
function indSiteHtml(b) {
  if (!IND()) return '';
  let h = '';
  if (b.kind === 'woodhut') {
    h += lnI('Level', `${stageN} of 5 (${b.name})`);
    if (stageN >= 3) { const ir = yardIron(b); h += lnI('Working', `${staffOf(b) - ir} on wood, ${ir} on iron`) + lnI('Wagons', 'carry the woodcutters to the forest'); }
    else h += lnI('Iron', `the blacksmith joins at stage ${INDUSTRY.yard.ironFrom}`);
    h += lnI('Yards allowed now', indMax('woodhut'));
  }
  if (b.kind === 'quarry') { const ox = oxenOf(b).length; h += lnI('Oxen', `${ox} of ${lv(INDUSTRY.quarry.oxen)} (each eats ${lv(INDUSTRY.quarry.oxFood)} food a minute)`) + lnI('Work', 'one always stays at the stone; the rest cut and load the carts in pairs'); }
  if (b.kind === 'farm' && b.animals) h += lnI('Animals', Object.entries(b.animals).map(([k, v]) => `${v} ${k}`).join(', ')) + lnI('Leather made', Math.floor(res.leather || 0));
  if (b.kind === 'stable') h += lnI('Horses', `${b.horses || 0} (for mounted knights)`) + lnI('Needs', `${indStaff('stable')} people to run (has ${staffOf(b)})`) + lnI('Oxen at your farms', animalsAll('oxen'));
  if (b.kind === 'bowyer') h += lnI('Cows at your farms', `${animalsAll('cows')} (needs 2)`);
  if (b.kind === 'mill') h += lnI('Mills allowed now', `${indMax('mill')}${stageN >= 3 ? ', each keeps 5 bakeries going' : ''}`);
  if (b.kind === 'bakery') h += lnI('Bakeries allowed', `${indMax('bakery')} (five for each mill)`) + (bakeryMulOf(b) > 1 ? lnI('Cy Young bakers', `${bakeryMulOf(b)} times the bread`) : '');
  if (isField(b.kind) || b.kind === 'farm') { const s = sentryOf(b); h += lnI('Sentry', s ? `${s.name} on watch` : '<span style="color:#ffb38a">none: this field needs a sentry</span>'); }
  h += groupsHtml(b);
  if (b.kind === 'alehouse' || b.kind === 'tavern') h += lnI('Ale price', `${INDUSTRY.ale.prices[alePrice]}${warNow && alePrice < 2 ? ' (raised for wartime)' : ''}`) + lnI('Serves', `${b.kind === 'alehouse' ? INDUSTRY.ale.alehouseServes : INDUSTRY.ale.tavernServes} people`);
  return h;
}
function indSiteButtons(b) {
  if (!IND()) return '';
  const B = (a, t) => `<button class="sm" data-ind="${a}">${t}</button>`;
  let h = B('fill', '+ Fill it up');
  if (b.kind === 'woodhut') h += B('iron+', 'More on iron') + B('iron-', 'More on wood');
  if (isField(b.kind) || b.kind === 'farm') h += B('sentry', 'Post a sentry');
  if (b.kind === 'alehouse' || b.kind === 'tavern') h += INDUSTRY.ale.prices.map((p, i) => `<button class="sm${alePrice === i ? ' on' : ''}" data-ind="ale:${i}">${p}</button>`).join('');
  return `<div class="row" style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">${h}</div>` + groupsButtons(b);
}
function indAction(b, act) {
  if (act === 'fill') { let n = 0; while (staffOf(b) < indStaff(b.kind)) { const before = staffOf(b); siteAction(b, 'add'); if (staffOf(b) === before) break; n++; } if (n) floatText(b.x, b.y - (b.topH || 30) - 30, `+${n} workers`, '#9fe8a8'); }
  else if (act === 'iron+' || act === 'iron-') { b.ironChosen = true; b.ironN = clamp((b.ironN || 0) + (act === 'iron+' ? 1 : -1), 0, indStaff('woodhut')); }
  else if (act === 'sentry') postSentry(b);
  else if (act.startsWith('escort:')) sendEscort(b, +act.slice(7));
  else if (act.startsWith('ale:')) { alePrice = +act.slice(4); showBanner(`Ale is now ${INDUSTRY.ale.prices[alePrice].toLowerCase()}: ${alePrice === 0 ? 'happy, but some will be drunk at work' : alePrice === 2 ? 'good gold, but your people are angry' : 'the fair middle'}.`, 3); }
  else if (act === 'study') startStudy('school');
  else if (act === 'slessons') startSoldierLessons();
  else if (act === 'doctor') startStudy('doctor');
  else if (act === 'engineer') trainEngineer();
  else if (act === 'feast') holdFeast();
  else if (act === 'expand') { const c = INDUSTRY.granaryExpand; if (stageN < 3) showBanner('The granary can be expanded from stage 3, the Hold.', 3); else if (b.expanded) showBanner('This granary is already expanded.', 2); else if (res.wood < c.wood || res.stone < c.stone) showBanner(`Expanding costs ${c.wood} wood and ${c.stone} stone.`, 3); else { res.wood -= c.wood; res.stone -= c.stone; b.expanded = true; floatText(b.x, b.y - 80, `Expanded: holds ${INDUSTRY.granary.capExpanded} food`, '#9fe8a8'); } }
  else if (act === 'rest') restFarms(true); else if (act === 'wake') restFarms(false);
  AudioSys.ui('select'); updateHud();
  if (IND_BOX[b.kind]) showIndBox(b); else if (b.kind === 'granary') showStore(b); else showSite(b);
}
document.getElementById('storePop').addEventListener('click', e => { const t = e.target.closest('[data-ind]'); if (t && storeShown) indAction(storeShown, t.dataset.ind); });
function granaryHtml() {
  if (!IND()) return '';
  const cap = foodCap(), over = res.food > cap;
  return lnI('Food stored', `<span style="color:${over ? '#ff8a7a' : '#9fe8a8'}">${Math.floor(res.food)} of ${cap}</span>`) + (bugsOn ? lnI('Bugs', '<span style="color:#ff8a7a">the extra food is spoiling and making people sick</span>') : over ? lnI('Warning', `<span style="color:#ffb38a">too full: bugs in ${Math.max(0, Math.ceil(INDUSTRY.granary.bugsAfter - granaryOverT))} s</span>`) : '');
}
function granaryButtons(b) {
  if (!IND() || b.kind !== 'granary') return '';
  const B = (a, t) => `<button class="sm" data-ind="${a}">${t}</button>`;
  return `<div class="row" style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">${stageN >= 3 && !b.expanded ? B('expand', `Expand (${INDUSTRY.granaryExpand.wood} wood, ${INDUSTRY.granaryExpand.stone} stone)`) : ''}${mineDone('farm').some(f => !f.asleep) ? B('rest', 'Rest the farms') : B('wake', 'Wake the farms')}</div>`;
}
function showIndBox(b) {
  storeShown = b; const p = document.getElementById('storePop'); if (b.dead) { p.hidden = true; storeShown = null; return; }
  const B = (a, t) => `<button class="sm" data-ind="${a}">${t}</button>`;
  let h = `<h3>${b.name.toUpperCase()}</h3>`;
  if (b.done === false) h += lnI('Status', 'Being built');
  else if (b.kind === 'school') {
    h += lnI('Learning', `level ${schoolLvl} of 3`) + (schoolStudy ? lnI('Teaching now', `level ${schoolStudy.lvl}: ${Math.round(schoolStudy.t / schoolStudy.dur * 100)}%`) : '');
    h += lnI('Each level', 'wastes 10% less material, builds 10% cheaper and 15% quicker; from level 2, better market prices');
    h += lnI('Engineers', `${engineers().length} (room for ${mineDone('engineerhut').length * INDUSTRY.engineersPerHut})`) + lnI('Trebuchets', schoolLvl >= 3 ? 'allowed at the Stronghold' : 'need level 3 and the Stronghold');
    h += lnI("Soldiers' lessons", `level ${soldierLvl} of 5${soldierStudy ? ` (learning level ${soldierStudy.lvl}: ${Math.round(soldierStudy.t / soldierStudy.dur * 100)}%)` : ''}`);
    h += `<div class="row" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${soldierLvl < 5 && !soldierStudy ? B('slessons', `Soldiers' lessons, level ${soldierLvl + 1} (${SOLDIERS.lessons.levels[soldierLvl][0]} gold)`) : ''}${schoolLvl < 3 && !schoolStudy ? B('study', `Teach level ${schoolLvl + 1} (${INDUSTRY.school.levels[schoolLvl][0]} gold)`) : ''}${B('engineer', `Train an engineer (${INDUSTRY.school.engineerCost} gold)`)}</div>`;
  } else if (b.kind === 'engineerhut') {
    const mine = engineers().filter(e => e.job === b).length;
    h += lnI('Engineers here', `${mine} of ${INDUSTRY.engineersPerHut}`) + lnI('Trained at', 'the School') + lnI('Work', 'they repair damage very fast and later build trebuchets');
  } else if (HEAL_KINDS.includes(b.kind)) {
    const H = INDUSTRY.health[b.kind];
    h += lnI('Heals', `the sick and wounded within ${H.r} points, ${Math.round(healRate(b) * 10) / 10} times as fast as the keep`) + lnI('Cheers', `up to ${H.serves} people`);
    if (b.kind === 'apothecary') { h += lnI('Doctor', doctorLvl ? 'smarter (heals twice as fast)' : doctorStudy ? `studying: ${Math.round(doctorStudy.t / doctorStudy.dur * 100)}%` : 'can learn more at the Stronghold'); if (!doctorLvl && !doctorStudy) h += `<div class="row" style="margin-top:8px">${B('doctor', `Make the doctor smarter (${INDUSTRY.health.doctorCost} gold)`)}</div>`; }
  } else if (b.kind === 'feastbox') {
    const cost = feastCost();
    h += lnI('Comes at', 'stage 3, the Hold' + (stageN >= 3 ? ' (you are there)' : '')) + feastNeeds().map(r => lnI(r.what, `<span style="color:${r.ok ? '#9fe8a8' : '#ffb38a'}">${r.have} of ${r.need}</span>`)).join('');
    h += lnI('Gold', `<span style="color:${res.gold >= cost ? '#9fe8a8' : '#ffb38a'}">${cost} (you have ${Math.floor(res.gold)})</span>`) + lnI('Gives', `+${INDUSTRY.feast.mood} mood for ${Math.round(INDUSTRY.feast.lasts / 60)} minutes: nothing upsets them, and they work twice as hard`);
    if (feastUntil > time) h += lnI('Now', `a feast is on: ${Math.ceil((feastUntil - time) / 60)} min left`);
    h += `<div class="row" style="margin-top:8px">${B('feast', 'Hold the feast')}</div><div style="font-size:13px;color:#d9c9a3;margin-top:6px">Grapes come from a Vineyard, apples from an Orchard, the animals from your Farms. A feast never happens by itself.</div>`;
  }
  if (b.kind !== 'feastbox') h += fixRow;
  setBox(p, h); p.dataset.site = ''; p.hidden = false;
}

// ---------- each frame ----------
function updateIndustry(dt) {
  if (!IND() || !started) return;
  if (stageN !== indStage) { const grew = indStage && stageN > indStage; indStage = stageN; if (grew) mergeOnGrowth(); renameAll(); relabelButtons(); }
  updateStudy(dt);
  indT -= dt; if (indT > 0) return; indT = 1;
  checkMarketLoss();
  updateGroups(1); renameAll(); indWarCheck(); updateYards(); updateQuarries(1); updateFarms(1); updateGranary(1); updateHealHouses(1);
}
