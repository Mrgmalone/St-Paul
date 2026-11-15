'use strict';
// Stronghold Destroyer — Phase 4H: the Field and the Farm (Gerald, after 4G).
// "There should be two separate things, a field and a farm." Tap either one to control what is made there and how many
// people work there.
//  - The Field (it was the Wheat Field): at most five, up to ten people each. It grows wheat (the fastest), corn (next)
//    and grapes (the slowest), up to all three at once: you choose how many people work on each crop.
//  - The Farm: at most two, up to five people each. It raises the animals you tick (chickens, cows, pigs, ducks; and the
//    turkeys and sheep the feast needs); you see them walking about in the pen. It gets better with time, and with a stable.
//  - Both: happy people grow food faster; a well makes it grow faster still (and is water for fires nearby); a lookout
//    tower sees the land around and rings the bell when raiders come near; Reserve gives a guard with a knight's
//    strength (two for a field, one for a farm), even before knights can be trained.
// The numbers live in settings.js (FARMING). Rivals' fields and farms keep their old simple ways.

const FIELD_CROPS = Object.keys(FARMING.field.crops);   // wheat, corn, grapes
const isNewField = b => !!b && b.kind === 'wheatfarm' && b.team === 'player' && IND();
const isNewFarm = b => !!b && b.kind === 'farm' && b.team === 'player' && IND();
const farmStyle = b => isNewField(b) ? 'field' : isNewFarm(b) ? 'farm' : '';
const cropName = c => (FARMING.field.crops[c] || {}).name || c;
const animalName = k => (typeof ANIMAL_NAME !== 'undefined' && ANIMAL_NAME[k]) || (k[0].toUpperCase() + k.slice(1));
const ONE_ANIMAL = { chickens: 'chicken', ducks: 'duck', turkeys: 'turkey', pigs: 'pig', cows: 'cow', oxen: 'ox', sheep: 'sheep' };
const workersOf = b => units.filter(u => !u.dead && u.type === 'civ' && u.team === 'player' && u.job === b);

// ---------- the Field's plan: how many people on each crop ----------
function fieldPlan(b) {
  if (!b.plan) { b.plan = { wheat: 0, corn: 0, grapes: 0 }; b.plan[FARMING.field.startOn] = clamp(Math.max(staffOf(b), FARMING.field.startWorkers), 0, FARMING.field.staff); }
  for (const c of FIELD_CROPS) if (!(b.plan[c] >= 0)) b.plan[c] = 0;
  return b.plan;
}
const planTotal = b => FIELD_CROPS.reduce((a, c) => a + fieldPlan(b)[c], 0);
// how many people each building wants (updateJobs calls this through jobWant): a field, its plan; a farm, what you set
function farmWant(b) {
  const st = farmStyle(b); if (!st) return undefined;
  if (st === 'field') return planTotal(b);
  if (!(b.want >= 0)) b.want = FARMING.farm.startWorkers;
  return clamp(b.want, 0, FARMING.farm.staff);
}
const cropCount = (b, c, not) => units.filter(u => u !== not && !u.dead && u.type === 'civ' && u.job === b && u.crop === c).length;
function pickCrop(b, u) {   // the crop that is shortest of people
  const P = fieldPlan(b); let best = null, gap = -1e9;
  for (const c of FIELD_CROPS) { const g = P[c] - cropCount(b, c, u); if (g > gap) { gap = g; best = c; } }
  return gap > 0 ? best : (FIELD_CROPS.find(c => P[c] > 0) || FARMING.field.startOn);
}
// the strips of the field, west to east, each as wide as its share of the people (no one working: the last crop, fallow)
function stripsOf(b) {
  const P = fieldPlan(b), on = FIELD_CROPS.filter(c => P[c] > 0), tot = on.reduce((a, c) => a + P[c], 0), x0 = b.x0 + 4, w = b.x1 - b.x0 - 8;
  if (!tot) return [{ crop: b.lastCrop || FARMING.field.startOn, x0, x1: x0 + w, fallow: true }];
  let x = x0; return on.map(c => { const s = { crop: c, x0: x, x1: x + w * P[c] / tot, fallow: false }; x = s.x1; return s; });
}
// where a worker stands to work: in his crop's strip (a field) or among the animals (a farm), each in his own place
function farmSpot(u, b) {
  const st = farmStyle(b); if (!st || u.job !== b) return null;
  if (b._crewT !== time) { b._crewT = time; b._crew = workersOf(b).sort((p, q) => p.id - q.id); }   /* (worked out once a moment, not for every worker) */
  const mates = st === 'farm' ? b._crew : b._crew.filter(o => o.crop === u.crop);
  const i = Math.max(0, mates.indexOf(u)), n = Math.max(1, mates.length), y0 = b.y0 + 12, y1 = b.y1 - 12;
  let x0 = b.x0 + 12, x1 = b.x1 - 12;
  if (st === 'field') { const s = stripsOf(b).find(q => q.crop === u.crop); if (s) { x0 = s.x0 + 4; x1 = s.x1 - 4; } }
  const w = Math.max(8, x1 - x0), cols = Math.max(1, Math.min(n, Math.floor(w / 20) || 1)), rows = Math.ceil(n / cols);
  return { x: x0 + (i % cols + 0.5) * w / cols, y: y0 + (Math.floor(i / cols) + 0.5) * (y1 - y0) / rows };
}

// ---------- how fast: happy people grow food faster; a well, the weather, a feast and the farm's level too ----------
function farmMoodMul() { const M = FARMING.mood; return mood >= M.happyAt ? M.happy : mood < M.upsetBelow ? M.upset : 1; }
const stableBy = b => mineDone('stable').some(s => Math.hypot(s.x - b.x, (s.y0 + s.y1) / 2 - (b.y0 + b.y1) / 2) < 140);
function farmLvl(b) {
  const L = FARMING.farm.levels; let n = 0;
  for (let i = 1; i < L.length; i++) if ((b.workedT || 0) >= L[i].after && (!L[i].stable || stableBy(b))) n = i;
  return Object.assign({ n: n + 1, of: L.length }, L[n]);
}
function growMul(b) {
  return farmMoodMul() * (b.well ? FARMING.well.mul : 1) * feastWork() * Math.max(0.4, 1 + 0.25 * WEATHER.rain - 0.3 * WEATHER.snow) * (b.kind === 'farm' ? farmLvl(b).mul : 1);
}
// seconds of work for one person to bring in one (0: not one of the new fields or farms)
function farmRate(u, b) {
  const st = farmStyle(b); if (!st || u.job !== b) return 0;
  const every = st === 'field' ? (FARMING.field.crops[u.crop] || FARMING.field.crops.wheat).every : FARMING.farm.every;
  return every / (growMul(b) * fatWork(u) * (CIV.gather || 1));
}
const perMinute = (b, n, c) => n ? Math.round(60 / ((c ? FARMING.field.crops[c].every : FARMING.farm.every) / (growMul(b) * (CIV.gather || 1))) * n) : 0;
// what a worker brings in: wheat to the stores; corn and the farm's eggs, milk and meat as food; grapes to the granary
const farmFoodKind = (u, b) => { const st = farmStyle(b); if (!st || u.job !== b) return null; return st === 'farm' ? FARMING.farm.food : (FARMING.field.crops[u.crop] || {}).food || null; };
// how many one person carries to the stores at a time (0: the usual load)
const farmLoad = (u, b) => { const st = farmStyle(b); if (!st || u.job !== b) return 0; return st === 'farm' ? FARMING.farm.load : (FARMING.field.crops[u.crop] || {}).load || 0; };
// what each crop has brought in (shown in the field's box)
function noteMade(u, n) { const b = u.job; if (!b || !farmStyle(b) || !n) return; b.made = b.made || {}; b.made[u.crop] = (b.made[u.crop] || 0) + n; }
// a farm with no animals of the kinds it raises has nothing to tend
const farmHasAnimals = b => !isNewFarm(b) || (b.raise || []).some(k => ((b.animals || {})[k] || 0) > 0);

// ---------- the job: a worker takes his crop and his place ----------
function farmJob(u, site) {
  const st = farmStyle(site); if (!st) return false;
  if (st === 'field') { if (!FIELD_CROPS.includes(u.crop) || u.cropOf !== site) u.crop = pickCrop(site, u); }
  else u.crop = 'farm';
  u.cropOf = site;
  const type = st === 'field' ? FARMING.field.crops[u.crop].carry : 'food';
  if (u.carry > 0 && u.carryType && u.carryType !== type) { if (u.carryType === 'food') addFood(u.carryKind || 'crops', u.carry); else res[u.carryType] = (res[u.carryType] || 0) + u.carry; u.carry = 0; }
  u.order = 'gather'; u.task = { type, node: site }; u.sub = u.carry > 0 ? 'toKeep' : 'toNode'; u.path = []; u.repath = 0;
  return true;
}
// after the plan changes: people move to the crops that want them; any beyond the plan are let go to gather
function rebalance(b) {
  if (!isNewField(b)) return;
  const P = fieldPlan(b), crew = workersOf(b).sort((p, q) => q.id - p.id);
  for (const c of FIELD_CROPS) {
    let over = crew.filter(u => u.crop === c).length - P[c];
    for (const u of crew) { if (over <= 0) break; if (u.crop !== c) continue;
      const to = FIELD_CROPS.find(k => P[k] > crew.filter(o => o.crop === k).length);
      if (to) { u.crop = to; farmJob(u, b); floatText(u.x, u.y - 50, `Now on the ${cropName(to).toLowerCase()}`, '#ffe9a8'); }
      else { u.job = null; u.crop = null; u.order = 'idle'; u.task = null; floatText(u.x, u.y - 50, 'Freed to gather', '#e9dcbc'); }
      over--; }
  }
}

// ---------- the box: what is made, by how many, and the well, the lookout tower and the guards ----------
const guardsOf = b => units.filter(u => !u.dead && u.team === 'player' && u.guardOf === b);
const guardMax = b => b.kind === 'farm' ? FARMING.guard.farm : FARMING.guard.field;
function farmBoxKey(b) { return [b.id, b.well ? 1 : 0, b.lookout ? 1 : 0, (b.raise || []).join(',')].join(':'); }
function farmControls(b) {   // built once (or when something is added); farmRefresh fills in the numbers
  const st = farmStyle(b); if (!st || b.done === false) return '';
  const B = (a, t, x = '') => `<button class="sm" data-ind="${a}"${x}>${t}</button>`, big = ' style="min-width:46px;min-height:44px;font-size:20px"';
  let h = '<div class="farmCtl" style="margin:4px 0 8px;padding-bottom:8px;border-bottom:1px solid rgba(255,215,122,.25)">';
  if (st === 'field') {
    h += '<div style="font-size:14px;color:#d9c9a3;margin:2px 0 4px">What this field grows (tap + or &minus; to put people on a crop):</div>';
    for (const c of FIELD_CROPS) h += `<div class="ln" style="align-items:center"><span style="min-width:72px">${cropName(c)}</span><b style="display:flex;gap:6px;align-items:center">${B('crop-:' + c, '&minus;', big)}<span id="fc-n-${c}" style="min-width:24px;text-align:center;font-size:18px"></span>${B('crop+:' + c, '+', big)}<small id="fc-r-${c}" style="min-width:110px;color:#d9c9a3"></small></b></div>`;
  } else {
    h += '<div style="font-size:14px;color:#d9c9a3;margin:2px 0 4px">Which animals this farm raises (tap to choose):</div><div style="display:flex;gap:6px;flex-wrap:wrap">';
    for (const k of FARMING.farm.animals) h += `<button class="sm${(b.raise || []).includes(k) ? ' on' : ''}" data-ind="raise:${k}" style="min-height:44px">${animalName(k)} <span id="fa-n-${k}"></span></button>`;
    h += '</div>';
  }
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';
  if (!b.well) h += B('well', `Add a well (${FARMING.well.wood} wood)`);
  if (!b.lookout) h += B('lookout', `Add a lookout tower (${FARMING.lookout.wood} wood)`);
  h += `<button class="sm" data-ind="guard" id="fc-guard">Reserve a guard (${FARMING.guard.gold} gold)</button>`;
  return h + '</div></div>';
}
function farmRefresh(b) {
  const st = farmStyle(b); if (!st) return;
  const set = (id, t) => { const el = document.getElementById(id); if (el && el.textContent !== String(t)) el.textContent = t; };
  if (st === 'field') { const P = fieldPlan(b); for (const c of FIELD_CROPS) { const on = cropCount(b, c); set('fc-n-' + c, P[c]); set('fc-r-' + c, P[c] ? `${on} at work · up to ${perMinute(b, on || P[c], c)} a minute` : ''); } }
  else for (const k of FARMING.farm.animals) set('fa-n-' + k, (b.animals && b.animals[k]) || 0);
  const g = document.getElementById('fc-guard'); if (g) { const n = guardsOf(b).length, mx = guardMax(b); g.disabled = n >= mx; g.style.opacity = n >= mx ? 0.5 : 1; g.textContent = n >= mx ? `Guards: ${n} of ${mx} (all on watch)` : `Reserve a guard (${FARMING.guard.gold} gold) · ${n} of ${mx}`; }
}
function farmLines(b) {   // the lines above the controls
  const st = farmStyle(b), ln = (a, v) => `<div class="ln"><span>${a}</span><b>${v}</b></div>`; if (!st) return '';
  const M = farmMoodMul(), pct = Math.round((growMul(b) - 1) * 100);
  let h = '';
  if (st === 'field') { const P = fieldPlan(b), on = FIELD_CROPS.filter(c => P[c] > 0), M0 = b.made || {}; h += ln('Grows', on.length ? on.map(c => `${cropName(c)} (${P[c]})`).join(', ') : 'nothing yet: put people on a crop');
    if (FIELD_CROPS.some(c => M0[c])) h += ln('Brought in', FIELD_CROPS.filter(c => M0[c]).map(c => `${Math.floor(M0[c])} ${cropName(c).toLowerCase()}`).join(', ')); }
  else {
    const L = farmLvl(b), next = FARMING.farm.levels[L.n], left = next ? Math.max(0, Math.ceil((next.after - (b.workedT || 0)) / 60)) : 0;
    h += ln('Level', `${L.n} of ${L.of}` + (next ? ` (next: ${left ? `${left} more minute${left === 1 ? '' : 's'} of work` : 'ready'}${next.stable && !stableBy(b) ? ' and a stable beside it' : ''})` : ' (the best)'));
    h += ln('Animals', Object.entries(b.animals || {}).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${v === 1 ? ONE_ANIMAL[k] || k : k}`).join(', ') || 'none');
    h += ln('Makes', `eggs, milk and meat (food)${farmHasAnimals(b) ? '' : ': <span style="color:#ffb38a">no animals to tend</span>'}`) + ln('Leather made', Math.floor(res.leather || 0));
  }
  h += ln('Growing speed', `${pct >= 0 ? '+' : ''}${pct}%: ${M > 1 ? 'your people are happy' : M < 1 ? 'your people are upset' : 'your people are content'}${b.well ? ', a well' : ''}`);
  h += ln('Well', b.well ? 'yes: grows 25% faster, and water for fires' : 'none') + ln('Lookout tower', b.lookout ? 'yes: watching for raiders' : 'none');
  const gs = guardsOf(b); h += ln('Guards', gs.length ? `${gs.length} of ${guardMax(b)}: ${gs.map(u => u.name).join(', ')}` : `<span style="color:#ffb38a">none (up to ${guardMax(b)})</span>`);
  return h;
}
function farmAction(b, act) {   // true when it was one of ours
  if (!farmStyle(b)) return false;
  if (act.startsWith('crop+:') || act.startsWith('crop-:')) {
    const c = act.slice(6), P = fieldPlan(b), up = act[4] === '+';
    if (up) {
      if (planTotal(b) >= FARMING.field.staff) { showBanner(`A field holds ${FARMING.field.staff} people. Take someone off another crop first.`, 3); return true; }
      P[c]++; b.lastCrop = c;
      // someone already on the field but on no crop that wants him moves over; otherwise a free person is called
      const free = units.filter(u => u.team === 'player' && !u.dead && u.type === 'civ' && !u.job && !u.inSchool && !u.engineer && !(u.breakUntil > time)).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
      if (staffOf(b) < planTotal(b) && free) { free.job = b; free.crop = c; free.cropOf = b; free.manualT = -99; farmJob(free, b); floatText(free.x, free.y - 50, `${cropName(c)} farmer`, '#ffe9a8'); }
      else if (staffOf(b) < planTotal(b)) showBanner(`No free person right now: one will come to the ${cropName(c).toLowerCase()} as soon as someone is free (train one at the keep).`, 3.5);
    } else { if (P[c] <= 0) return true; P[c]--; if (!planTotal(b)) b.lastCrop = c; }
    rebalance(b); b.asleep = false;
  } else if (act.startsWith('raise:')) {
    const k = act.slice(6); b.raise = b.raise || FARMING.farm.startRaise.slice();
    if (b.raise.includes(k)) { b.raise = b.raise.filter(x => x !== k); floatText(b.x, b.y - 40, `No more ${k} are raised here`, '#e9dcbc'); }
    else { b.raise.push(k); if (!(b.animals[k] > 0)) b.animals[k] = 2; floatText(b.x, b.y - 40, `Now raising ${k}`, '#9fe8a8'); }
    if (R3D.active) R3D.rebuildModel(b);
  } else if (act === 'well' || act === 'lookout') {
    const C = FARMING[act]; if (b[act]) return true;
    if (res.wood < C.wood || res.stone < (C.stone || 0)) { showBanner(`A ${act === 'well' ? 'well' : 'lookout tower'} costs ${C.wood} wood${C.stone ? ` and ${C.stone} stone` : ''}. You have ${Math.floor(res.wood)} wood.`, 3); return true; }
    res.wood -= C.wood; res.stone -= C.stone || 0; b[act] = { at: time };
    floatText(b.x, b.y - 60, act === 'well' ? 'A well is dug: things grow 25% faster' : 'A lookout tower goes up: it watches for raiders', '#9fe8a8');
    if (R3D.active) R3D.rebuildModel(b);
  } else if (act === 'guard') reserveGuard(b);
  else return false;
  AudioSys.ui('select'); updateHud();
  const p = document.getElementById('storePop'); if (p) p.dataset.site = '';   // (rebuild the box: a button may have gone)
  showSite(b); return true;
}

// ---------- Reserve: a guard with a knight's strength who stays with his field or farm ----------
function guardSpotFor(b, i) {
  const k = playerKeep(), mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2, away = k ? Math.atan2(my - k.y, mx - k.x) : 0;
  // the guards stand on the side away from the keep (where raiders come from), one each side of the middle
  const sides = [[Math.cos(away), Math.sin(away)], [-Math.sin(away), Math.cos(away)], [Math.sin(away), -Math.cos(away)]];
  for (let s = 0; s < sides.length; s++) {
    const [dx, dy] = sides[(s + i) % sides.length], r = (b.x1 - b.x0) / 2 + 16, x = mx + dx * r + (i % 2 ? -14 : 14) * -dy, y = my + dy * r + (i % 2 ? -14 : 14) * dx;
    if (!circleBlocked(x, y, 8)) return { x, y };
  }
  const f = nearestFree(Math.floor(b.x1 / TILE) + 1, Math.floor(my / TILE)); return f ? { x: f.c * TILE + 16, y: f.r * TILE + 16 } : { x: b.x1 + 16, y: my };
}
function reserveGuard(b) {
  const have = guardsOf(b).length, mx = guardMax(b), G = FARMING.guard, what = b.kind === 'farm' ? 'farm' : 'field';
  if (b.done === false) { showBanner('Finish building it first.', 2); return; }
  if (have >= mx) { showBanner(`This ${what} already has ${mx === 1 ? 'its guard' : `its ${mx} guards`}.`, 2.5); return; }
  if (res.gold < G.gold) { showBanner(`A guard costs ${G.gold} gold. You have ${Math.floor(res.gold)}.`, 2.5); return; }
  const pop = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && !u.gift).length + trainQueue.filter(q => !MACHINE[q.kind]).length;
  if (pop >= popCap()) { const d = draftable(); if (!d) { showBanner('Your houses are full and no free civilian can be called up. Build a house first.', 3.5); return; }
    units.splice(units.indexOf(d), 1); selection.delete(d); floatText(d.x, d.y - 50, 'Called up to guard the ' + what, '#9fe8a8'); }
  res.gold -= G.gold;
  const sp = guardSpotFor(b, have), u = makeUnit('player', 'knight', sp.x, sp.y);
  u.guardOf = b; u.guardSpot = sp; u.fieldGuard = true; u.cmdT = -99; u.mounted = false; u.kit = 'foot'; u.speed = SOLDIERS.knight.footSpeed; u.name = b.kind === 'farm' ? 'Farm Guard' : 'Field Guard';   /* a knight's strength, on foot */
  floatText(sp.x, sp.y - 60, `${u.name} guards the ${what}`, '#9fe8a8'); AudioSys.ui('ready');
}

// ---------- each second ----------
let farmT = 0;
function updateFarming(dt) {
  if (!IND() || !started) return;
  farmT -= dt; if (farmT > 0) return; farmT = 1;
  for (const b of farms) {
    if (b.dead || b.team !== 'player' || b.done === false) continue;
    const st = farmStyle(b); if (!st) continue;
    b.amount = b.max;   // (the new fields never run out: what they give depends on the people working them)
    if (st === 'field') { rebalance(b); if (staffOf(b)) b.lastCrop = (stripsOf(b)[0] || {}).crop || b.lastCrop; }
    else { const was = b.lvlSeen || 1, L = farmLvl(b); if (L.n > was) { showBanner(`Your farm has grown better: level ${L.n} of ${L.of}. Its animals breed faster and it holds more of them.`, 4); floatText(b.x, b.y - 60, `Farm level ${L.n}`, '#9fe8a8'); AudioSys.ui('bell'); } b.lvlSeen = L.n; }
    // the lookout tower: sees the land around, and rings the bell when raiders come near
    if (b.lookout) {
      if (typeof reveal === 'function' && FOG.on) reveal((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, FARMING.lookout.sight);
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, foe = units.find(e => !e.dead && hostile('player', e.team) && e.type !== 'civ' && Math.hypot(e.x - cx, e.y - cy) < FARMING.lookout.warn);
      if (foe && !(b.warnT > time - 30)) { b.warnT = time; showBanner(`<b>Raiders near your ${b.name.toLowerCase()}!</b> The lookout rings the bell.`, 4); AudioSys.ui('warn'); try { AudioSys.ui('bell'); } catch (e) {} }
    }
  }
}
// wells are water for the fire fighters nearby (a full bucket each time)
function wellNear(u, team) {
  let best = null, bd = 1e9;
  for (const b of farms) if (b.well && !b.dead && b.team === team) { const w = wellPos(b), d = Math.hypot(w.x - u.x, w.y - u.y); if (d < bd) { bd = d; best = w; } }
  return best ? { at: best, d: bd } : null;
}
const wellPos = b => ({ x: b.x1 - 14, y: b.y0 + 14 });       // the well stands in the north-east corner
const lookoutPos = b => ({ x: b.x0 + 14, y: b.y0 + 14 });    // the lookout tower in the north-west corner

// ---------- the market: corn and the animals ----------
const LIVESTOCK = { chickens: 1, ducks: 1, turkeys: 1, pigs: 1, sheep: 1, cows: 1 };
function animalSell(k, n) { if (typeof takeAnimals === 'function') takeAnimals(k, n); }
function animalBuy(k, n) { const f = mineDone('farm')[0]; if (!f) return false; f.animals = f.animals || {}; f.animals[k] = (f.animals[k] || 0) + n; f.raise = f.raise || FARMING.farm.startRaise.slice(); if (!f.raise.includes(k)) f.raise.push(k); return true; }
