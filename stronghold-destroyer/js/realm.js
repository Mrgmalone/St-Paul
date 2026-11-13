'use strict';
// Stronghold Destroyer — the four computer rivals, the trading friend and the rogue bandits (the real game).
// Each rival plays one of the four factions by the same rules and the same five stages as you: it starts with a shack,
// a small palisade, its lord and a few workers, gathers, builds, grows by its economy, trains soldiers and raids.
// The older tests keep the old single enemy camp (rivals.js); none of this runs for them.

const REALM = { on: false, rivals: [], rogueT: 0 };
const rivalOf = o => o && o.owner !== undefined ? REALM.rivals[o.owner] || null : null;

// what a rival builds at each stage, in order (kind, how many in all); placed on its castle ground
const RIVAL_PLAN = {
  1: [['house', 3], ['farm', 2], ['woodhut', 1], ['granary', 1], ['gtower', 1]],
  2: [['house', 4], ['farm', 3], ['quarry', 1], ['tavern', 1], ['wheatfarm', 1], ['chapel', 1], ['lookout', 1], ['mill', 1], ['house', 5]],
  3: [['smithy', 1], ['ironmine', 1], ['market', 1], ['bakery', 1], ['stower', 1], ['school', 1], ['house', 7], ['stower', 2]],
  4: [['roundtower', 1], ['house', 9], ['bakery', 2]],
  5: [['greattower', 1], ['house', 11]]
};
// what a rival makes each minute from each finished building (your own town makes these through its workers)
const RIVAL_YIELD = { farm: { food: 30 }, wheatfarm: { food: 20 }, woodhut: { wood: 25 }, quarry: { stone: 20 }, ironmine: { iron: 12 }, bakery: { food: 25 }, market: { gold: 15 } };
// what a rival pays for a soldier, and which soldiers each stage allows it
const RIVAL_COST = { spear: { gold: 10, wood: 10 }, archer: { gold: 10, wood: 12 }, sword: { gold: 10, iron: 8 }, maceman: { gold: 10, iron: 8 }, ballista: { gold: 20, wood: 60 },
  knight: { gold: 20, iron: 15 }, ram: { wood: 80, gold: 20 }, catapult: { wood: 150, stone: 40 }, trebuchet: { wood: 200, stone: 80, gold: 40 } };
const ARMY_CAP = [3, 6, 10, 14, 18];

// ---------- the start: four rivals, each a different faction, one of them (not your own faction) a trading friend ----------
function realmStart() {
  REALM.on = true; REALM.rivals = []; REALM.rogueT = ROGUES.first;
  const facs = FACTION_ORDER.slice(); for (let i = facs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [facs[i], facs[j]] = [facs[j], facs[i]]; }
  RIVALS.sites.slice(0, RIVALS.count).forEach(([c, r], i) => {
    const fac = facs[i % facs.length], f = FACTIONS[fac];
    REALM.rivals.push({ id: i, fac, name: RIVALS.lords[i], team: 'enemy', friend: false, stage: 1, defeated: false,
      res: { food: f.start.food, wood: f.start.wood, stone: 0, iron: 0, gold: 20 }, pace: RIVALS.pace[DIFF.key] || 1,
      placeT: 6 + i * 2, trainT: 25 + i * 4, workerT: 20, raidT: (RIVALS.raid.first[DIFF.key] || 450) + i * 75, tickT: i * 0.25, built: 0, site: { c, r } });
  });
  if (RIVALS.friend) { const cands = REALM.rivals.filter(R => R.fac !== FACKEY); const F = cands[Math.floor(Math.random() * cands.length)]; if (F) { F.friend = true; F.team = 'friend'; } }
  for (const R of REALM.rivals) setUpRival(R);
}
function setUpRival(R) {
  const f = FACTIONS[R.fac];
  // the keep: the nearest free 3x3 to its site
  let at = null;
  for (let rad = 0; rad < 12 && !at; rad++) for (let dc = -rad; dc <= rad && !at; dc++) for (let dr = -rad; dr <= rad && !at; dr++) {
    const c = R.site.c + dc, r = R.site.r + dr; let ok = c > 4 && r > 4 && c < COLS - 7 && r < ROWS - 7;
    for (let i = -1; i <= 3 && ok; i++) for (let j = -1; j <= 3 && ok; j++) if (tileBlocked(c + i, r + j) || riverTile[(r + j) * COLS + c + i]) ok = false;
    if (ok) at = { c, r };
  }
  if (!at) { R.defeated = true; return; }
  R.keep = makeRivalKeep(R, at.c, at.r);
  const n0 = floats.length; raiseRing(R.keep, 1, R.team, { owner: R.id, fac: R.fac }); floats.length = n0;
  // the lord, on foot, and the workers
  const k = R.keep, spot = (dx, dy) => { const fr = nearestFree(Math.floor((k.x + dx) / TILE), Math.floor((k.y1 + dy) / TILE)); return fr ? [fr.c * TILE + 16, fr.r * TILE + 16] : [k.x, k.y1 + 30]; };
  const L = rivalUnit(R, 'sword', ...spot(10, 30));
  const hp = { easy: 520, medium: 760, hard: 1000 }[DIFF.key] || 760;
  Object.assign(L, { lord: true, name: R.name, hp: Math.round(hp * facRule(R.fac, 'hpMul', 1)), maxHp: Math.round(hp * facRule(R.fac, 'hpMul', 1)), dmg: 30, speed: 66, radius: 13, pal: PAL.lord, look: { beard: !/Lady/.test(R.name), longHair: true, female: /Lady/.test(R.name), w: 1.08, h: 1.0, s: 1.3 } });
  L.post = { x: L.x, y: L.y }; R.lord = L;
  for (let i = 0; i < f.start.civilians; i++) rivalUnit(R, 'civ', ...spot(-60 + (i % 5) * 22, 50 + Math.floor(i / 5) * 24));
}
function makeRivalKeep(R, c, r) {
  const s = { id: nextId++, kind: 'keep', team: R.team, owner: R.id, fac: R.fac, campCenter: true, name: `${R.name}'s Shack`, c, r, w: 3, h: 3,
    x0: c * TILE, y0: r * TILE, x1: (c + 3) * TILE, y1: (r + 3) * TILE, x: (c + 1.5) * TILE, y: (r + 3) * TILE, hp: STAGES[0].keepHp, maxHp: STAGES[0].keepHp,
    flash: 0, dead: false, deathT: 0, radius: 48, wobble: 0, topH: 125, range: 220, fireRate: 2.6, arrowDmg: 6, archerY: 128, stage: 1, done: true };
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) setBlock(c + i, r + j, 1);
  structures.push(s); return s;
}
function rivalUnit(R, kind, x, y, kit) {
  const u = kit ? makeKit(R.team, kit, x, y) : makeUnit(R.team, kind, x, y);
  u.owner = R.id; applyFaction(u, R.fac); u.post = { x, y };
  return u;
}

// ---------- each rival, once a second ----------
const rivalPeople = R => units.filter(u => !u.dead && u.owner === R.id && !isMachine(u));
const rivalArmy = R => units.filter(u => !u.dead && u.owner === R.id && u.type !== 'civ' && !u.lord);
function rivalHave(R) { return { people: rivalPeople(R).length, mood: 100, food: R.res.food, stone: R.res.stone, iron: R.res.iron, count: k => countBuilt(k, R.team, R.id) }; }
function updateRealm(dt) {
  if (!REALM.on) return;
  for (const R of REALM.rivals) { if (R.defeated) continue; R.tickT += dt; if (R.tickT >= 1) { rivalTick(R, R.tickT); R.tickT = 0; } }
  updateRogues(dt);
  updateFriendTrade(dt);
}
function rivalTick(R, dt) {
  if (!R.keep || R.keep.dead) { defeatRival(R); return; }
  const p = R.pace, cnt = k => countBuilt(k, R.team, R.id), people = rivalPeople(R);
  // income from finished buildings, the people's food, a little gold from taxes
  for (const [k, y] of Object.entries(RIVAL_YIELD)) { const n = cnt(k); if (!n) continue;
    for (const [res2, v] of Object.entries(y)) { let add = n * v * p * dt / 60; if (k === 'bakery') add *= cnt('mill') ? facRule(R.fac, 'bakeryMul', 1) : 0; if (k === 'market') add *= 1 / (facRule(R.fac, 'marketBuyMul', 1)); R.res[res2] = (R.res[res2] || 0) + add; } }
  R.res.food -= people.length * 2 * dt / 60; if (R.res.food < 0) R.res.food = 0;
  R.res.gold += people.length * 1 * p * dt / 60;
  // Cy Young sell their spare food for gold
  const sa = facRule(R.fac, 'sellAbove', 0); if (sa && R.res.food > sa) { const lots = Math.floor((R.res.food - sa) / 10); R.res.food -= lots * 10; R.res.gold += lots * facRule(R.fac, 'sellGold', 3); }
  // build: the next thing on this stage's plan (and the stages before) it does not have yet
  if ((R.placeT -= dt) <= 0) { R.placeT = 10 / p; rivalBuild(R); }
  // more workers while there is room and food
  const cap = Math.round((RIVALS.workersPerStage[R.stage - 1] || 4) * facRule(R.fac, 'popMul', 1)), workers = people.filter(u => u.type === 'civ').length;
  if (!IND() && (R.workerT -= dt) <= 0 && workers < cap && R.res.food >= 40) {   /* (the real game: their citizens grow, see rivals4b.js) */ R.workerT = 24 / p; R.res.food -= 40; const k = R.keep, fr = nearestFree(Math.floor(k.x / TILE) - 2, Math.floor(k.y1 / TILE) + 1); if (fr) rivalUnit(R, 'civ', fr.c * TILE + 16, fr.r * TILE + 16); }
  // soldiers
  if ((R.trainT -= dt) <= 0) { R.trainT = 14 / p; rivalTrain(R); }
  // grow a stage when the same needs as yours are met
  if (R.stage < STAGES.length) { const rows = needRows(R.stage + 1, rivalHave(R)); if (rows.length && rows.every(r => r.ok)) growRival(R); }
  // raids (never the trading friend)
  if (!R.friend && (R.raidT -= dt) <= 0) rivalRaid(R);
}
function rivalBuild(R) {
  const cnt = k => countBuilt(k, R.team, R.id) + structures.filter(b => !b.dead && b.owner === R.id && b.kind === k && b.done === false).length;
  for (let s = 1; s <= R.stage; s++) for (const [kind, want] of RIVAL_PLAN[s]) {
    if (cnt(kind) >= want || !BUILD[kind]) continue;
    const d = BUILD[kind], wood = (d.wood || 0) * (kind === 'market' ? facRule(R.fac, 'marketCostMul', 1) : 1);
    if (R.res.wood < wood || R.res.stone < (d.stone || 0) || R.res.gold < (d.gold || 0)) return;   // save up for it
    const at = rivalSpot(R, kind); if (!at) continue;
    R.res.wood -= wood; R.res.stone -= d.stone || 0; R.res.gold -= d.gold || 0;
    const b = placeRivalBuilding(R, kind, at.c, at.r); if (b) return;
  }
}
function rivalSpot(R, kind) {   // a free place on the rival's castle ground (or just outside it), clear of its ring wall
  const k = R.keep, d = BUILD[kind], w = d.w, h = d.h, Rr = ringOf(R.stage);
  const ring = new Set(ringTiles(k, Rr).map(([c, r]) => c + ',' + r));
  for (let rad = 2; rad < Rr + 9; rad++) for (let a = 0; a < 20; a++) {
    const ang = a / 20 * Math.PI * 2 + R.id, c = Math.round(k.c + 1 + Math.cos(ang) * rad - w / 2), r = Math.round(k.r + 1 + Math.sin(ang) * rad - h / 2);
    let ok = c > 2 && r > 2 && c + w < COLS - 3 && r + h < ROWS - 3;
    for (let i = -1; i <= w && ok; i++) for (let j = -1; j <= h && ok; j++) { const cc = c + i, rr = r + j; if (ring.has(cc + ',' + rr) || tileBlocked(cc, rr) || riverTile[rr * COLS + cc]) ok = false; }
    if (ok && !(c + w > k.c - 1 && c < k.c + 4 && r + h > k.r - 1 && r < k.r + 5)) return { c, r };
  }
  return null;
}
function placeRivalBuilding(R, kind, c, r) {
  const d = BUILD[kind], b = makeBuildingObj(kind, c, r);
  Object.assign(b, { team: R.team, owner: R.id, fac: R.fac, name: `${FACTIONS[R.fac].name} ${d.name}`, hp: Math.round(b.maxHp * 0.1) });
  if (kind === 'chapel') b.maxHp = Math.round(b.maxHp * facRule(R.fac, 'abbeyHpMul', 1));
  if (!isField(kind)) for (let i = 0; i < b.w; i++) for (let j = 0; j < b.h; j++) setBlock(c + i, r + j, 1);
  for (const u of units) if (!u.dead && u.x > b.x0 - 12 && u.x < b.x1 + 12 && u.y > b.y0 - 12 && u.y < b.y1 + 12) { const f = nearestFree(Math.floor(u.x / TILE), Math.floor(u.y / TILE)); if (f) { u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; u.path = []; } }
  if (isField(kind)) { Object.assign(b, { done: true, progress: 1, hp: b.maxHp, amount: 10 }); farms.push(b); } else structures.push(b);   // fields are ready at once
  return b;
}
function rivalTrain(R) {
  const army = rivalArmy(R), cap = Math.round(ARMY_CAP[R.stage - 1] * (DIFF.size || 1));
  if (army.length >= cap) return;
  const can = Object.keys(RIVAL_COST).filter(k => stageOfItem(k, true) <= R.stage);
  const foot = can.filter(k => !MACHINE[k]), pick = foot[Math.floor(Math.random() * foot.length)]; if (!pick) return;
  const c = RIVAL_COST[pick]; for (const [k, v] of Object.entries(c)) if ((R.res[k] || 0) < v) return;
  for (const [k, v] of Object.entries(c)) R.res[k] -= v;
  const k = R.keep, fr = nearestFree(Math.floor(k.x / TILE) + 2, Math.floor(k.y1 / TILE) + 2); if (!fr) return;
  // Psychana's swordsmen from the Hold on are berserkers (stand-in: the berserker kit) who can slip past unseen in small bands
  const kit = R.fac === 'psychana' && pick === 'sword' && R.stage >= 3 ? 'berserker' : null;
  rivalUnit(R, pick, fr.c * TILE + 16, fr.r * TILE + 16, kit);
}
function growRival(R) {
  const st = STAGES[R.stage], q = st.need || {};
  R.res.stone -= q.stone || 0; R.res.iron -= q.iron || 0; R.stage = st.n;
  const k = R.keep; k.stage = R.stage; k.maxHp = st.keepHp; k.hp = Math.min(k.maxHp, k.hp + st.keepHp * 0.4); k.name = `${R.name}'s ${st.name}`;
  k.archerY = [0, 128, 92, 86, 110, 130][R.stage]; k.topH = [0, 125, 96, 92, 120, 140][R.stage];
  const n0 = floats.length; raiseRing(k, R.stage, R.team, { owner: R.id, fac: R.fac }); floats.length = n0;
  if (R3D.active) R3D.rebuildModel(k);
  showBanner(`${R.friend ? 'Your friend' : 'Your rival'} <b>${R.name}</b> (${FACTIONS[R.fac].name}) has grown to stage ${R.stage}, the ${st.name}.`, 4);
}
// ---------- raids: from the rival's own base toward you; siege engines only with a large army ----------
function rivalRaid(R) {
  const army = rivalArmy(R).filter(u => !u.raider && !u.onWall && !u.hk), k = playerKeep();
  R.raidT = (RIVALS.raid.every[DIFF.key] || 240) * (0.85 + Math.random() * 0.3);
  if (!k || army.length < RIVALS.raid.minArmy) return;
  const home = army.length > 4 ? 2 : 1, go = army.slice(home);   // a couple stay home to guard
  const big = go.length >= RIVALS.raid.largeArmy;
  if (big) { const sk = ['catapult', 'ram', 'trebuchet'].filter(t => stageOfItem(t, true) <= R.stage && (t !== 'trebuchet' || !IND() || R.schoolTop))[0]; if (sk) { const c = RIVAL_COST[sk]; if (Object.entries(c).every(([kk, v]) => (R.res[kk] || 0) >= v)) { for (const [kk, v] of Object.entries(c)) R.res[kk] -= v; const fr = nearestFree(Math.floor(R.keep.x / TILE), Math.floor(R.keep.y1 / TILE) + 2); if (fr) go.push(rivalUnit(R, sk, fr.c * TILE + 16, fr.r * TILE + 16)); } } }
  // a route through way-points along a planned way, bent a little each time so raids do not all come the same way
  const ap = approachPoint({ x: R.keep.x, y: R.keep.y1 + 40, radius: 11 }, k), pth = findPath(R.keep.x, R.keep.y1 + 40, ap.x, ap.y);
  if (pth.length < 2) return;
  // a way-point about every 380 points along the way, each nudged a little
  /* a way-point every 380 points measured along the whole way (however many bends it has), none in its last 120 */
  const way = []; let total = 0; for (let i = 1; i < pth.length; i++) total += Math.hypot(pth[i].x - pth[i - 1].x, pth[i].y - pth[i - 1].y);
  { let walked = 0, next = 380; for (let i = 1; i < pth.length; i++) { const a = pth[i - 1], b2 = pth[i], L = Math.hypot(b2.x - a.x, b2.y - a.y); while (next <= walked + L && next < total - 120) { const f = (next - walked) / L; way.push({ x: a.x + (b2.x - a.x) * f + RR(-40, 40), y: a.y + (b2.y - a.y) * f + RR(-40, 40) }); next += 380; } walked += L; } }
  if (!way.length) way.push({ x: (R.keep.x + ap.x) / 2, y: (R.keep.y1 + ap.y) / 2 });
  raidSide(R, way);   /* each raid comes at you from a different side */
  for (const u of go) { u.raider = true; u.order = 'raid'; u.repath = 0; u.path = []; u.route = way.map(w => ({ x: w.x + RR(-24, 24), y: w.y + RR(-24, 24) })); }
  raidPing = { x: R.keep.x, y: R.keep.y, t: 0 };
  showBanner(`<b>${R.name}</b> (${FACTIONS[R.fac].name}) sends ${go.length} soldiers against you${big ? ', with siege engines' : ''}!`, 4);
  AudioSys.ui && AudioSys.ui('warhorn');
}
function defeatRival(R) {
  if (R.defeated) return; R.defeated = true;
  for (const u of units) if (!u.dead && u.owner === R.id) { u.dead = true; u.deathT = 99; selection.delete(u); }   // its people scatter
  for (const b of structures) if (!b.dead && b.owner === R.id && b !== R.keep) { b.hp = 0; kill(b); }
  showBanner(`<b>${R.name}</b>'s ${FACTIONS[R.fac].name} have fallen: their keep is destroyed and their people scatter.`, 6);
}

// ---------- the trading friend ----------
// Once you have a market, the friend trades with you there: she sells her spare goods and buys yours. Her prices sit
// between your market's buying and selling prices (so neither side can buy from one and sell to the other at a profit),
// shaped by her faction: a Ticanologue friend sells at half, a Cy Young friend sells food at half. What can be traded
// follows the lower of your two stages: food and wood from the start, stone from the Homestead, iron from the Hold.
const TRADE_GOODS = [['food', 'Food', 1], ['wood', 'Wood', 1], ['stone', 'Stone', 2], ['iron', 'Iron', 3]];
const TRADE_RESERVE = { food: 120, wood: 100, stone: 30, iron: 10 };
const tradeFriend = () => REALM.rivals.find(R => R.friend && !R.defeated) || null;
function friendPrices(R, k) {
  const row = MARKET.find(r => r[0] === k), mk = priceOf(row), lot = row[2];
  let sell = Math.round((mk.buy + mk.sell) / 2), buy = mk.sell + Math.round((mk.buy - mk.sell) / 4);
  if (facRule(R.fac, 'marketBuyMul', 1) < 1 || (k === 'food' && R.fac === 'cyyoung')) sell = Math.round(sell * 0.5);
  sell = Math.max(sell, mk.sell + 1); buy = Math.min(buy, mk.buy - 1, sell - 1);
  return { lot, sell, buy };
}
const tradeOpen = (R, stage) => !!R && stage <= Math.min(R.stage, stageN);
const myHave = k => k === 'food' ? Math.floor(res.food) : Math.floor(res[k] || 0);
function friendTrade(act, k) {   // act 'buy': you buy from her; 'sell': you sell to her. Returns a message.
  const R = tradeFriend(), g = TRADE_GOODS.find(x => x[0] === k); if (!R || !g) return 'No trading friend.';
  if (!tradeOpen(R, g[2])) return `${g[1]} is traded from stage ${g[2]} for both of you.`;
  const { lot, sell, buy } = friendPrices(R, k);
  if (act === 'buy') {
    if ((R.res[k] || 0) - TRADE_RESERVE[k] < lot) return `${R.name} has no ${g[1].toLowerCase()} to spare.`;
    if (res.gold < sell) return `You need ${sell} gold.`;
    R.res[k] -= lot; R.res.gold += sell; res.gold -= sell; if (k === 'food') addFood('crops', lot); else res[k] += lot;
    R.traded = (R.traded || 0) + 1; return `Bought ${lot} ${g[1].toLowerCase()} from ${R.name} for ${sell} gold.`;
  }
  if (myHave(k) < lot) return `You have no ${g[1].toLowerCase()} to sell.`;
  if ((R.res.gold || 0) < buy) return `${R.name} cannot pay just now.`;
  if (k === 'food') spendFood(lot); else res[k] -= lot; R.res[k] = (R.res[k] || 0) + lot; R.res.gold -= buy; res.gold += buy;
  R.traded = (R.traded || 0) + 1; return `Sold ${lot} ${g[1].toLowerCase()} to ${R.name} for ${buy} gold.`;
}
function friendTradeHtml() {   // the rows added to your market's box
  const R = tradeFriend(); if (!R) return '';
  return `<h3 style="margin-top:12px">TRADE WITH ${R.name.toUpperCase()}</h3><div style="font-size:15px;color:#9fe8a8">${FACTIONS[R.fac].name}, your trading friend · stage ${R.stage}</div>
    <table style="border-collapse:collapse;font-size:15px;margin-top:4px">` + TRADE_GOODS.map(([k, name, st]) => `<tr><td style="padding:3px 8px 3px 0">${name}</td>
      <td style="padding:2px"><button class="sm" data-ft="buy:${k}" style="min-width:110px"></button></td><td style="padding:2px"><button class="sm" data-ft="sell:${k}" style="min-width:110px"></button></td></tr>`).join('') +
    `</table><div id="ftMsg" style="min-height:20px;color:#9fe8a8;font-weight:600;font-size:15px"></div>`;
}
function refreshFriendTrade(p) {
  const R = tradeFriend(); if (!R) return;
  for (const [k, , st] of TRADE_GOODS) { const pr = friendPrices(R, k), bb = p.querySelector(`[data-ft="buy:${k}"]`), sb = p.querySelector(`[data-ft="sell:${k}"]`); if (!bb) continue;
    const open = tradeOpen(R, st); bb.textContent = open ? `Buy ${pr.lot}: ${pr.sell}g` : `stage ${st}`; sb.textContent = open ? `Sell ${pr.lot}: ${pr.buy}g` : `stage ${st}`;
    bb.style.opacity = open && (R.res[k] || 0) - TRADE_RESERVE[k] >= pr.lot && res.gold >= pr.sell ? 1 : 0.45; sb.style.opacity = open && myHave(k) >= pr.lot && R.res.gold >= pr.buy ? 1 : 0.45; }
}
let friendToldT = 0;
function updateFriendTrade(dt) {   // tell you once, when you first have a market, that the friend will trade
  const R = tradeFriend(); if (!R || R.told) return;
  if ((friendToldT += dt) < 2) return; friendToldT = 0;
  if (structures.some(b => b.team === 'player' && b.kind === 'market' && b.done && !b.dead)) { R.told = true; showBanner(`<b>${R.name}</b> (${FACTIONS[R.fac].name}) is your trading friend: open your market to trade.`, 5); }
}

// ---------- rogue bandits: no one's men ----------
// Small bands come in from the edge of the map, make for your nearest store, steal and run off the map again.
// They fight whoever stands in their way (a rival's people too); kill them before they get away with the goods.
function spawnRogues(from) {   // from: a set place to come in from (tests); otherwise an edge far from every camp
  const k = playerKeep(); if (!k) return;
  const n = ROGUES.band[0] + Math.floor(Math.random() * (ROGUES.band[1] - ROGUES.band[0] + 1));
  // an edge point far from every camp, on the land
  let at = from || null;
  for (let t = 0; t < 40 && !at; t++) {
    const side = Math.floor(Math.random() * 4), f = 0.1 + Math.random() * 0.8;
    const E = 230, x = side === 0 ? f * MW : side === 1 ? MW - E : side === 2 ? f * MW : E, y = side === 0 ? E : side === 1 ? f * MH : side === 2 ? MH - E : f * MH;   // well inside the land, clear of the shore
    const fr = nearestFree(Math.floor(x / TILE), Math.floor(y / TILE)); if (!fr) continue;
    const px = fr.c * TILE + 16, py = fr.r * TILE + 16; if (circleBlocked(px, py, 8) || campDist(px, py) < 700 || Math.hypot(px - k.x, py - k.y) < 700) continue;
    if (!findPath(px, py, k.x, k.y1 + 40).length) continue; at = { x: px, y: py };
  }
  if (!at) return;
  for (let i = 0; i < n; i++) {
    let sp = null; for (let t = 0; t < 12 && !sp; t++) { const fr = nearestFree(Math.floor(at.x / TILE) + (i % 3) - 1 + (t % 3) - 1, Math.floor(at.y / TILE) + Math.floor(i / 3) + Math.floor(t / 3) - 1); if (fr && !circleBlocked(fr.c * TILE + 16, fr.r * TILE + 16, 8) && findPath(fr.c * TILE + 16, fr.r * TILE + 16, k.x, k.y1 + 40).length) sp = fr; }
    if (!sp) continue;   // each bandit on its own clear square
    const u = makeUnit('rogue', i % 2 ? 'spear' : 'sword', sp.c * TILE + 16, sp.r * TILE + 16);
    Object.assign(u, { rogue: true, name: 'Bandit', exit: { x: at.x, y: at.y }, sub: 'toStore', post: { x: at.x, y: at.y } });
  }
  raidPing = { x: at.x, y: at.y, t: 0 };
  showBanner(`<b>Bandits</b> (no one's men) are coming for your stores. Stop them before they get away with your goods.`, 4);
}
function rogueStore(u) {   // your nearest store with something in it
  let best = null, bd = 1e9;
  for (const b of structures) { if (b.dead || b.team !== 'player' || b.done === false || !DROPS[b.kind]) continue; const d = Math.hypot(b.x - u.x, b.y - u.y); if (d < bd) { bd = d; best = b; } }
  return best;
}
function rogueBrain(u, dt) {
  const walk = (x, y) => { if (!u.path.length || u.repath <= 0) { u.path = findPath(u.x, u.y, x, y); u.repath = 3; if (!u.path.length && (u.noWay = (u.noWay || 0) + 1) > 3 && u.sub === 'toStore') { u.sub = 'flee'; u.exit = { x: u.x, y: u.y }; } } followPath(u, dt); };   // no way at all: give up and go
  if (u.hp < u.maxHp * 0.5 && u.sub !== 'flee') { u.sub = 'flee'; u.path = []; }   // badly hurt: run for it
  if (u.order === 'attack' && alive(u.target) && edgeDist(u, u.target) < 60 && u.sub !== 'flee') return;   // fighting whoever blocks them
  const foe = aggro(u, 70); if (foe && u.sub !== 'flee') { u.order = 'attack'; u.target = foe; u.repath = 0; return; }
  u.order = u.sub === 'flee' ? 'move' : 'raid';
  if (u.sub === 'toStore') {
    const s = u.store && !u.store.dead ? u.store : (u.store = rogueStore(u)); if (!s) { u.sub = 'flee'; return; }
    if (edgeDist(u, s) < 18) {   // steal
      const st = ROGUES.steal, got = [];
      for (const [k, v] of Object.entries(st)) { const have = k === 'food' ? res.food : res[k] || 0, take = Math.min(v, Math.floor(have)); if (take <= 0) continue; if (k === 'food') spendFood(take); else res[k] -= take; u.loot = (u.loot || 0) + take; got.push(`${take} ${k}`); }
      if (got.length) floatText(s.x, s.y - 50, `Bandits stole ${got.join(', ')}!`, '#ffb38a');
      u.sub = 'flee'; u.path = []; return;
    }
    const ap = approachPoint(u, s); walk(ap.x, ap.y); return;
  }
  if (u.sub === 'flee') {
    if (Math.hypot(u.x - u.exit.x, u.y - u.exit.y) < 40) { u.dead = true; u.deathT = 99; selection.delete(u); return; }   // gone, with the loot
    walk(u.exit.x, u.exit.y);
  }
}
function updateRogues(dt) {
  if ((REALM.rogueT -= dt) > 0) return;
  REALM.rogueT = ROGUES.every * (0.8 + Math.random() * 0.4); spawnRogues();
}

// ---------- the rivals box: who you face ----------
function showRivalsPop() {
  const p = document.getElementById('rivalsPop'); if (!p) return;
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  p.innerHTML = '<h3>Your rivals</h3>' + REALM.rivals.map(R => { const f = FACTIONS[R.fac];
    const status = R.defeated ? '<span class="rvx">fallen</span>' : R.friend ? '<span class="rvf">trading friend</span>' : '<span class="rve">enemy</span>';
    return `<div class="rvrow"><canvas width="44" height="52" data-emb="${R.fac}"></canvas><div><div class="rvn">${R.name} ${status}</div>
      <div class="rvd">${f.name} (${f.epithet}) · stage ${R.stage}, the ${stageName(R.stage)}${R.defeated ? '' : ` · ${rivalArmy(R).length} soldiers`}${R.defeated || R.friend ? '' : ` · next raid in ${mmss(Math.max(0, R.raidT))}`}</div>
      <div class="rvw">Weakness: ${f.weakness}</div></div></div>`; }).join('');
  p.querySelectorAll('canvas[data-emb]').forEach(c => drawEmblem(c.getContext('2d'), c.dataset.emb, c.width, c.height));
  p.hidden = false;
}
