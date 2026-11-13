'use strict';
// Stronghold Destroyer — mood, economy, self-running workers.
// Loaded in order by index.html; all files share one global scope.

// ---------- mood: rations, taxes, and how your people feel ----------
const RATIONS = [ { name: 'Lean', eat: 0.5, mood: -8 }, { name: 'Normal', eat: 1, mood: 0 }, { name: 'Generous', eat: 1.5, mood: 8 } ];
const TAXES = [ { name: 'None', gold: 0, mood: 3 }, { name: 'Low', gold: 1, mood: -4 }, { name: 'High', gold: 2.5, mood: -12 } ];
let aleBonus = 0, aleCover = 0, aleT = 0, varietyBonus = 0, relCover = 0, relBonus = 0, crowdPen = 0, fearGood = 0, fearHard = 0;
let fatBonus = 0, sickPen = 0, contentUntil = 0, leftCount = 0, returnT = 20, fullGranary = 0;
function cheer(n, secs, msg) { mood = Math.min(100, mood + n); contentUntil = Math.max(contentUntil, time + secs); if (msg) { const k = playerKeep(); if (k) floatText(k.x, k.y - 160, msg, '#ffd27a'); } }
let mood = 60, ration = 1, tax = 1, goldT = 0, settleT = 30, leaveT = 25, moodRate = 0;
const moodName = () => mood >= 70 ? 'Happy' : mood >= 40 ? 'Steady' : mood >= 20 ? 'Unhappy' : 'Rebellious';
const fatWork = u => (1 - 0.35 * (u.fat || 0)) * (u.sick > 0 ? 0.4 : 1);   // the well-fed are lazy; the sick hardly work
const countOf = k => structures.filter(b => b.kind === k && b.done && !b.dead && b.team === 'player').length;
const workMul = () => (mood >= 70 ? 1.15 : mood >= 40 ? 1 : 0.8) * (1 + 0.08 * countOf('stocks') - 0.05 * countOf('garden'));
function moodHtml() {
  const col = mood >= 70 ? '#9fe39a' : mood >= 40 ? '#ffd98a' : mood >= 20 ? '#ffb38a' : '#ff8a7a';
  const r = Math.round(moodRate);
  return `Mood: <b style="color:${col}">${Math.round(mood)} ${moodName()}</b> (${r > 0 ? '+' : ''}${r}/min)`;
}
const k0 = () => playerKeep();
function moodReasons() {
  const r = [];
  if (starving) r.push('there is no food: they are starving');
  if (ration === 0) r.push('rations are lean');
  if (tax === 2) r.push('taxes are high');
  else if (tax === 1) r.push('they pay taxes');
  if (crowdPen) r.push('the houses are crowded');
  if (fearHard) r.push('the stocks frighten them');
  if (!varietyBonus && !starving) r.push('they eat only one kind of food');
  if (!aleBonus) r.push('there is no ale');
  if (!relBonus) r.push('there is no house of prayer');
  return r;
}
function updateMood(dt, people) {
  const taverns = structures.filter(b => b.kind === 'tavern' && b.done && !b.dead && b.team === 'player').length;
  aleBonus = 0; aleCover = 0;
  if (taverns && res.ale > 0 && people.length) {
    aleCover = Math.min(1, taverns * 15 / people.length); aleBonus = Math.round(8 * aleCover);
    aleT += people.length * aleCover * dt / 240;   // about one ale for every 15 people every minute while (aleT >= 1) { aleT -= 1; res.ale = Math.max(0, res.ale - 1); }
  }
  const variety = foodVariety(); varietyBonus = variety >= 3 ? 6 : variety === 2 ? 3 : 0;
  relCover = people.length ? Math.min(1, countOf('chapel') * 20 / people.length) : 0; relBonus = Math.round(5 * relCover);
  crowdPen = people.length >= popCap() * 0.9 ? -4 : 0;
  fearGood = 2 * countOf('garden'); fearHard = -2 * countOf('stocks');
  fullGranary = !starving && res.food > 300 ? 4 : 0;
  { const fats = people.filter(u => u.fat > 0.45).length, sick = people.filter(u => u.sick).length; fatBonus = people.length && fats / people.length > 0.3 ? 3 : 0; sickPen = -Math.min(8, sick * 2); }
  moodRate = (starving ? -20 : RATIONS[ration].mood) + TAXES[tax].mood + aleBonus + (starving ? 0 : varietyBonus) + relBonus + crowdPen + fearGood + fearHard + fullGranary + fatBonus + sickPen;
  const holdsUp = time < contentUntil && moodRate < 0;   // after a feast or a new comfort, spirits stay up for a while
  mood = clamp(mood + (holdsUp ? 0 : moodRate) * dt / 60, 0, 100);
  // people who left come back when the town is happy again
  if (leftCount > 0 && mood >= 55 && k0()) { returnT -= dt; if (returnT <= 0) { returnT = 20; if (people.length + trainQueue.length < popCap()) { leftCount--; const en = roadEntry(); const u = makeUnit('player', 'civ', en.x, en.y); const kk = k0(); commandMove([u], kk.x1 + 40, kk.y1 + 30); showBanner('A citizen who left has come back to your town!', 3.5); AudioSys.ui('bell'); } } }
  // taxes: gold per person every 20 seconds
  goldT += people.length * TAXES[tax].gold * dt / 20;
  while (goldT >= 1) { goldT -= 1; res.gold += 1; }
  const k = playerKeep();
  // happy towns draw new settlers along the road
  if (mood >= 70 && k) {
    settleT -= dt;
    if (settleT <= 0) {
      settleT = 40;
      if (people.length + trainQueue.length < popCap()) {
        const en = roadEntry(); const u = makeUnit('player', 'civ', en.x, en.y);
        commandMove([u], k.x1 + 40 + RR(-20, 20), k.y1 + 30 + RR(-15, 15));
        showBanner('A settler has come to join your town.', 3); AudioSys.ui('bell');
      }
    }
  } else settleT = Math.max(settleT, 15);
  // rebellious towns lose people
  if (mood < 20) {
    leaveT -= dt;
    if (leaveT <= 0) {
      leaveT = 25;
      const civs = people.filter(u => u.type === 'civ' && u.order !== 'leave');
      if (civs.length) {
        const u = civs[Math.floor(Math.random() * civs.length)];
        u.order = 'leave'; u.task = null; u.carry = 0; u.path = findPath(u.x, u.y, 24, clamp(u.y, 200, 1250)); leftCount++;
        showLeftNote(moodReasons()); AudioSys.ui('warn');
      }
    }
  } else leaveT = 25;
}
document.querySelectorAll('.rb').forEach(b => b.onclick = () => { const r0 = ration, t0 = tax; if (b.dataset.r !== undefined) ration = +b.dataset.r; else tax = +b.dataset.t; if (ration > r0) cheer(6, 60, 'More food! Your people are glad'); if (tax < t0) cheer(6, 60, 'Lower taxes! Your people are glad'); updateHud(); });
document.getElementById('feast').onclick = () => {
  if (!started || won) return;
  if (res.gold < 50) { showBanner('A feast costs 50 gold.', 2.5); return; }
  res.gold -= 50; cheer(25, 180, 'Feast! +25 mood');
  AudioSys.ui('cheer'); showBanner('You hold a feast. Your people rejoice!', 3); updateHud();
};

// ---------- economy: stores, upkeep, training ----------
const res = { food: 100, wood: 80, gold: 0, stone: 0, mace: 0, armor: 0, hops: 0, ale: 0, iron: 0, bow: 0, spear: 0, sword: 0, wheat: 0, flour: 0 };
const foodKinds = { berries: 0, crops: 100, bread: 0 };
const FOOD_NAME = { berries: 'berries', crops: 'crops', bread: 'bread' };
function addFood(kind, n) { foodKinds[kind] = (foodKinds[kind] || 0) + n; res.food += n; }
function spendFood(n) {
  res.food -= n;
  for (let i = 0; i < n; i++) { let best = null; for (const k in foodKinds) if (foodKinds[k] >= 1 && (!best || foodKinds[k] > foodKinds[best])) best = k; if (!best) break; foodKinds[best] -= 1; }
  // keep the kinds in step with the store if the store was changed elsewhere
  const sum = Object.values(foodKinds).reduce((a, b) => a + b, 0);
  if (res.food <= 0) for (const k in foodKinds) foodKinds[k] = 0;
  else if (sum < res.food - 1) foodKinds.crops += res.food - sum;
}
const foodVariety = () => res.food > 0 ? Object.values(foodKinds).filter(v => v >= 1).length : 0;
const COSTS = { civ: { food: 40, wood: 0, time: 12 }, sword: { food: 0, wood: 0, gold: 10, time: 15 }, spear: { food: 0, wood: 0, gold: 10, time: 15 }, archer: { food: 0, wood: 0, gold: 10, time: 14 }, ram: { food: 0, wood: 80, gold: 20, time: 20 }, catapult: { food: 0, wood: 150, stone: 30, gold: 40, time: 30 }, ballista: { food: 0, wood: 110, gold: 50, time: 24 }, trebuchet: { food: 0, wood: 220, stone: 40, gold: 80, time: 40 }, maceman: { food: 0, wood: 0, gold: 10, time: 15 }, knight: { food: 0, wood: 0, gold: 20, time: 22 } };
const trainQueue = [];
const QUEUE_MAX = 10;   // up to ten of each kind waiting; each kind trains side by side
const queuedOf = kind => trainQueue.filter(q => q.kind === kind).length;
function whyNotTrain(kind) {
  const c = COSTS[kind], pop = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && !u.gift).length + trainQueue.filter(q => !MACHINE[q.kind]).length;
  if (!playerKeep()) return 'keep lost';
  if (queuedOf(kind) >= QUEUE_MAX) return 'queue full (10)';
  if (WEAPON[kind]) { const miss = NEEDS[kind].filter(w => res[w] < 1); if (miss.length) return 'need ' + miss.map(w => w === 'armor' ? 'armor' : 'a ' + w).join(' and '); }
  if (WEAPON[kind] && res.gold < feeOf(kind)) return `need ${feeOf(kind)} gold`;
  if (!WEAPON[kind]) { if (res.food < c.food) return `need ${c.food - Math.floor(res.food)} more food`; if (res.wood < c.wood) return `need ${c.wood - Math.floor(res.wood)} more wood`; if (res.stone < (c.stone || 0)) return `need ${c.stone - Math.floor(res.stone)} more stone`; if (res.gold < (c.gold || 0)) return `need ${c.gold - Math.floor(res.gold)} more gold`; }
  if (!MACHINE[kind] && pop >= popCap() && !(kind !== 'civ' && draftable())) return kind === 'civ' ? 'houses full: build a house' : 'houses full and no free civilian to call up';
  return '';
}
function cancelTrain(kind) {   // right-click a training button: take back the last one queued, with its cost
  for (let i = trainQueue.length - 1; i >= 0; i--) if (trainQueue[i].kind === kind) {
    const q = trainQueue.splice(i, 1)[0], c = COSTS[kind];
    if (WEAPON[kind]) { for (const w of NEEDS[kind]) res[w] += 1; res.gold += feeOf(kind); } else { if (c.food) addFood('crops', c.food); res.wood += c.wood; res.gold += (c.gold || 0); res.stone += (c.stone || 0); }
    floatText(keep.x, keep.y - 140, `${KINDS[kind].name} cancelled`, '#ffd98a'); updateHud(); return;
  }
}
let starving = false, hungerT = 0, starveMsgT = 0;
const WEAPON = { sword: 'sword', spear: 'spear', archer: 'bow', maceman: 'mace', knight: 'sword' };
const NEEDS = { sword: ['sword'], spear: ['spear'], archer: ['bow'], maceman: ['mace'], knight: ['sword', 'armor'] };
const feeOf = k => k === 'knight' ? 20 : 10;
const weaponRoute = kind => WEAPON[kind] && NEEDS[kind].every(w => res[w] >= 1) && res.gold >= feeOf(kind);
const BUY = { sword: 40, spear: 20, bow: 30, mace: 30, armor: 70 };
const hasArmory = () => countOf('armory') > 0;
// the market: buying always costs more than making it yourself, and selling pays far less than buying
const MARKET = [
  ['wood', 'Wood', 10, 20, 8], ['stone', 'Stone', 10, 30, 12], ['iron', 'Iron', 5, 30, 12], ['hops', 'Hops', 10, 30, 12], ['wheat', 'Wheat', 10, 30, 12], ['flour', 'Flour', 10, 45, 18],
  ['food', 'Food (crops)', 10, 25, 10], ['bread', 'Bread', 10, 40, 16], ['ale', 'Ale', 5, 40, 16],
  ['bow', 'Bow', 1, BUY.bow, 12], ['spear', 'Spear', 1, BUY.spear, 8], ['sword', 'Sword', 1, BUY.sword, 16], ['mace', 'Mace', 1, BUY.mace, 12], ['armor', 'Knight armor', 1, BUY.armor, 28]
];
const WEAPONS = { bow: 1, spear: 1, sword: 1, mace: 1, armor: 1 };
// a happy town trades on good terms; an upset one pays a market tax. Even at best, buying never gets as cheap as making it yourself,
// and selling never pays as much as buying.
const marketMul = () => mood >= 50 ? 1 - (mood - 50) / 50 * 0.25 : 1 + (50 - mood) / 50 * 0.4;   // 0.75 when overjoyed, 1.4 when furious
const priceOf = row => { const [, , , buy, sell] = row, m = marketMul(), fm = myRule('marketBuyMul', 1);   // Ticanologue buys at half price
  const b = fm < 1 ? Math.max(2, Math.ceil(buy * m * fm)) : Math.max(Math.ceil(buy * m), Math.ceil(sell * 1.6)); return { buy: b, sell: Math.min(Math.round(sell * (2 - m)), b - 1) }; };
const haveOf = k => Math.floor(k === 'food' ? (foodKinds.crops || 0) + (foodKinds.berries || 0) : k === 'bread' ? (foodKinds.bread || 0) : (res[k] || 0));
function trade(b, act, key) {
  const row = MARKET.find(r => r[0] === key); if (!row || !b || b.dead || b.done === false) return;
  const [, name, lot] = row, { buy, sell } = priceOf(row);
  if (act === 'buy') {
    if (WEAPONS[key] && !hasArmory()) { showBanner('Build an Armory first: bought weapons are stored there.', 3); return; }
    if (res.gold < buy) { showBanner(`${lot > 1 ? lot + ' ' : 'A '}${name.toLowerCase()} costs ${buy} gold. You have ${Math.floor(res.gold)}.`, 2.5); return; }
    res.gold -= buy;
    if (key === 'food') addFood('crops', lot); else if (key === 'bread') addFood('bread', lot); else res[key] += lot;
    b.mkMsg = `Bought ${lot > 1 ? lot + ' ' : ''}${name.toLowerCase()} for ${buy} gold.`;
  } else {
    if (haveOf(key) < lot) { showBanner(`You need ${lot} ${name.toLowerCase()} to sell. You have ${haveOf(key)}.`, 2.5); return; }
    if (key === 'food') { let n = lot; for (const k of ['berries', 'crops']) { const t = Math.min(n, foodKinds[k] || 0); foodKinds[k] -= t; n -= t; } res.food -= lot; }
    else if (key === 'bread') { foodKinds.bread -= lot; res.food -= lot; }
    else res[key] -= lot;
    res.gold += sell;
    b.mkMsg = `Sold ${lot > 1 ? lot + ' ' : ''}${name.toLowerCase()} for ${sell} gold.`;
  }
  AudioSys.ui('select'); updateHud(); showMarket(b);
}
function showMarket(b) {
  storeShown = b; const p = document.getElementById('storePop'); if (b.dead) { p.hidden = true; storeShown = null; return; }
  if (b.done === false) { setBox(p, `<h3>MARKET</h3><div class="ln"><span>Status</span><b>Being built</b></div>`); p.dataset.site = ''; p.hidden = false; return; }
  // the buttons are built once; only the amounts refresh, so a tap is never lost
  if (p.dataset.site !== 'mk' + b.id || !document.getElementById('mkGold')) {
    p.innerHTML = `<h3>MARKET</h3><div class="ln"><span>Your gold</span><b id="mkGold"></b></div><div class="ln"><span>Prices</span><b id="mkMood"></b></div><div id="mkMsg" style="min-height:20px;color:#9fe8a8;font-weight:600;font-size:15px"></div>
      <table style="border-collapse:collapse;font-size:15px;margin-top:6px"><tr style="color:#d9c9a3;font-size:13px"><th style="text-align:left">Goods</th><th>You have</th><th>Buy</th><th>Sell</th></tr>` +
      MARKET.map(([k, name, lot, buy, sell]) => `<tr><td style="padding:3px 8px 3px 0">${name}${lot > 1 ? ` <small style="color:#d9c9a3">(${lot})</small>` : ''}</td><td style="text-align:center"><b id="mkHave-${k}"></b></td>
        <td style="padding:2px"><button class="sm" data-mk="buy:${k}" style="min-width:86px"></button></td><td style="padding:2px"><button class="sm" data-mk="sell:${k}" style="min-width:86px"></button></td></tr>`).join('') +
      `</table>${fixRow}<div style="font-size:13px;color:#d9c9a3;margin-top:6px;max-width:420px">Buying always costs more than making it yourself, and selling pays less than buying. A happy town gets better prices; an upset town pays a market tax. Bought weapons go to the Armory. Esc closes.</div>`;
    p.dataset.site = 'mk' + b.id;
  }
  document.getElementById('mkGold').textContent = Math.floor(res.gold); document.getElementById('mkMsg').textContent = b.mkMsg || '';
  const m = marketMul(), pct = Math.round((m - 1) * 100);
  document.getElementById('mkMood').textContent = pct < 0 ? `${-pct}% cheaper: your people are happy` : pct > 0 ? `${pct}% market tax: your people are upset` : 'normal';
  document.getElementById('mkMood').style.color = pct < 0 ? '#9fe8a8' : pct > 0 ? '#ffb38a' : '';
  for (const row of MARKET) { const [k, , lot] = row, pr = priceOf(row); document.getElementById('mkHave-' + k).textContent = haveOf(k); const bb = p.querySelector(`[data-mk="buy:${k}"]`), sb = p.querySelector(`[data-mk="sell:${k}"]`);
    const bt = `Buy ${pr.buy}g`, st = `Sell ${pr.sell}g`; if (bb.textContent !== bt) bb.textContent = bt; if (sb.textContent !== st) sb.textContent = st; bb.style.opacity = res.gold >= pr.buy ? 1 : 0.45; sb.style.opacity = haveOf(k) >= lot ? 1 : 0.45; }
  p.hidden = false;
}
document.getElementById('storePop').addEventListener('click', e => { const t = e.target.closest('[data-mk]'); if (t && storeShown && storeShown.kind === 'market') { const [act, key] = t.dataset.mk.split(':'); trade(storeShown, act, key); } });
const weaponPrice = w => priceOf(MARKET.find(r => r[0] === w)).buy;   // the armory charges the same as the market
function buyWeapon(w) {
  if (!started || won) return;
  if (!hasArmory()) { showBanner('Build an Armory first (Industry tab). Bought weapons are stored there.', 3); return; }
  const cost = weaponPrice(w);
  if (res.gold < cost) { showBanner(`A ${w} costs ${cost} gold. You have ${Math.floor(res.gold)}.`, 2.5); return; }
  res.gold -= cost; res[w] += 1; AudioSys.play('click'); updateHud();
}
// a free civilian (no building job) who can be called up to become a soldier
const draftable = () => units.find(u => u.team === 'player' && !u.dead && u.type === 'civ' && !u.job);
function canTrain(kind) {
  const c = COSTS[kind], pop = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && !u.gift).length + trainQueue.filter(q => !MACHINE[q.kind]).length;
  return !!playerKeep() && (WEAPON[kind] ? weaponRoute(kind) : (res.food >= c.food && res.wood >= c.wood && res.gold >= (c.gold || 0) && res.stone >= (c.stone || 0))) && (MACHINE[kind] || pop < popCap() || (kind !== 'civ' && draftable())) && queuedOf(kind) < QUEUE_MAX;
}
function trainUnit(kind) {
  if (!canTrain(kind)) {
    const c = COSTS[kind];
    if (WEAPON[kind] && NEEDS[kind].some(w => res[w] < 1)) showBanner(`You need ${NEEDS[kind].map(w => w === 'armor' ? 'armor' : 'a ' + w).join(' and ')} to train ${/^[AEIOU]/.test(KINDS[kind].name) ? 'an' : 'a'} ${KINDS[kind].name}. Make one in a workshop or buy one at the armory.`, 3.5);
    else if (WEAPON[kind] && res.gold < feeOf(kind)) showBanner(`Training a ${KINDS[kind].name} also costs ${feeOf(kind)} gold.`, 2.5);
    else if (res.food < c.food || res.wood < c.wood || res.gold < (c.gold || 0)) showBanner(`Not enough ${res.food < c.food ? 'food' : res.wood < c.wood ? 'wood' : 'gold'} to train an ${KINDS[kind].name}.`.replace('an S', 'a S').replace('an C', 'a C').replace('an B', 'a B'), 2.5);
    else showBanner(queuedOf(kind) >= QUEUE_MAX ? `Ten ${KINDS[kind].name}s are already waiting.` : 'Your houses are full. Build a house for more people.', 2.5);
    return;
  }
  const c = COSTS[kind];
  if (WEAPON[kind]) { for (const w of NEEDS[kind]) res[w] -= 1; res.gold -= feeOf(kind); }   // every soldier takes a weapon from the armory
  else { spendFood(c.food); res.wood -= c.wood; res.gold -= (c.gold || 0); res.stone -= (c.stone || 0); }
  { const pop = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && !u.gift).length + trainQueue.filter(q => !MACHINE[q.kind]).length, d = draftable();
    if (!MACHINE[kind] && kind !== 'civ' && pop >= popCap() && d) { units.splice(units.indexOf(d), 1); selection.delete(d); floatText(d.x, d.y - 50, `Called up to be a ${KINDS[kind].name}`, '#9fe8a8'); } }
  trainQueue.push({ kind, t: 0, dur: c.time * CIV.train });
  updateHud();
}
// ---------- self-running workers ----------
const JOBS = { quarry: 1, wheatfarm: 1, mill: 1, bakery: 1, woodhut: 1, farm: 1, hopfarm: 1, brewery: 1, ironmine: 1, bowyer: 1, poleturner: 1, smithy: 1 };
const JOB_MAX = 3;
const maxStaff = k => (k === 'woodhut' || isField(k)) ? 2 : 3;   // blacksmith: 3   // huts and farms hold 2, other industries 3; each worker adds full output
const staffOf = site => units.filter(u => !u.dead && u.type === 'civ' && u.team === 'player' && u.job === site).length;
const DROPS = { keep: ['wood', 'stone', 'food', 'hops', 'iron', 'ale', 'wheat', 'flour', 'bread'], stockpile: ['wood', 'stone', 'hops', 'iron', 'wheat', 'flour'], woodhut: ['wood'], granary: ['food', 'ale', 'bread'], tavern: ['ale'], armory: ['bow', 'spear', 'sword', 'mace', 'armor'] };
const CRAFT = {
  brewery: { inp: { hops: 2 }, out: 'ale', time: 7, batch: 2 },
  mill: { inp: { wheat: 2 }, out: 'flour', time: 6, batch: 3 },
  bakery: { inp: { flour: 1 }, out: 'bread', time: 6, batch: 9, n: 3 },
  ironmine: { inp: {}, out: 'iron', time: 3, batch: 4 },
  quarry: { inp: {}, out: 'stone', time: 2, batch: 8 },
  bowyer: { inp: { wood: 3 }, out: 'bow', time: 9, batch: 1 },
  poleturner: { inp: { wood: 3 }, out: 'spear', time: 8, batch: 1 },
  smithy: { inp: { iron: 2 }, out: 'sword', time: 10, batch: 1 }
};
const SMITH = { sword: { inp: { iron: 2 }, out: 'sword', time: 10, batch: 1 }, mace: { inp: { iron: 2 }, out: 'mace', time: 9, batch: 1 }, armor: { inp: { iron: 3 }, out: 'armor', time: 14, batch: 1 } };
const recipeOf = site => site.kind === 'smithy' ? SMITH[site.make || 'sword'] : CRAFT[site.kind];

const WORKSHOP = { bakery: 1, brewery: 1, tavern: 1, ironmine: 1, bowyer: 1, poleturner: 1, smithy: 1, armory: 1 };
const JOB_NAME = { smithy: 'Blacksmith', quarry: 'Stonecutter', wheatfarm: 'Wheat farmer', mill: 'Miller', bakery: 'Baker', woodhut: 'Woodcutter', farm: 'Farmer', hopfarm: 'Hop farmer', brewery: 'Brewer', ironmine: 'Miner', bowyer: 'Bowyer', poleturner: 'Spear-maker', smithy: 'Smith' };
const craftCost = site => Math.max(0.5, 1 - 0.05 * Math.floor((site.made || 0) / 4));   // every 4 made: 5% less material, down to half
function craftBrain(u, dt) {
  const site = u.job; if (!site || site.dead) { u.order = 'idle'; u.job = null; return; }
  const rc = recipeOf(site);
  if (u.sub === 'toDrop') {
    const drop = nearestDrop(u, u.carryType);
    if (!drop) { u.waitMsgT = (u.waitMsgT || 0) - dt; if (u.waitMsgT <= 0) { floatText(site.x, site.y - site.topH - 8, `Build an ${u.carryType === 'bow' || u.carryType === 'spear' || u.carryType === 'sword' ? 'armory' : 'store'} for the ${u.carryType}`, '#ffb38a'); u.waitMsgT = 10; } u.path = []; u.moving = false; return; }
    if (edgeDist(u, drop) <= 10 || stalled(u) && edgeDist(u, drop) <= 30) { site.produced = (site.produced || 0) + u.carry; if (u.carryType === 'bread') addFood('bread', u.carry); else res[u.carryType] += u.carry; floatText(u.x, u.y - 50, `+${u.carry} ${u.carryType}`, '#e0c088'); u.carry = 0; u.sub = 'toSite'; u.path = []; return; }
    if (!u.path.length || u.repath <= 0) { const ap = approachPoint(u, drop); u.path = findPath(u.x, u.y, ap.x, ap.y); u.repath = 3; }
    followPath(u, dt); return;
  }
  if (edgeDist(u, site) > 12 && !(stalled(u) && edgeDist(u, site) <= 36) && !(u.inside === site)) { u.sub = 'toSite'; if (!u.path.length || u.repath <= 0) { const ap = approachPoint(u, site); u.path = findPath(u.x, u.y, ap.x, ap.y); u.repath = 3; } followPath(u, dt); return; }
  u.sub = 'work'; u.path = []; u.moving = false; u.facing = site.x >= u.x ? 1 : -1;
  if (u.crafting === null || u.crafting === undefined) {
    if (site.kind === 'quarry' && (site.stock || 0) >= 60) { u.waitMsgT = (u.waitMsgT || 0) - dt; if (u.waitMsgT <= 0) { floatText(site.x, site.y - 40, 'Quarry pile full: waiting for the ox cart', '#ffb38a'); u.waitMsgT = 10; } return; }
    if (!Object.entries(rc.inp).every(([k, v]) => res[k] >= v * craftCost(site))) {   // waiting for materials
      u.waitMsgT = (u.waitMsgT || 0) - dt;
      if (u.waitMsgT <= 0) { const need = Object.entries(rc.inp).filter(([k, v]) => res[k] < v * craftCost(site)).map(([k, v]) => `${k} (needs ${+(v * craftCost(site)).toFixed(1)}, you have ${Math.floor(res[k])})`); floatText(site.x, site.y - site.topH - 8, `${site.name} is waiting for ${need.join(' and ')}`, '#ffb38a'); u.waitMsgT = 10; }
      return;
    }
    for (const [k, v] of Object.entries(rc.inp)) res[k] -= v * craftCost(site);
    u.crafting = 0;
  }
  if (u.attackAnim === 0) { u.attackAnim = 0.001; AudioSys.play(site.kind === 'ironmine' || site.kind === 'quarry' ? 'chop' : 'hammer', u.x, u.y); }
  u.crafting += dt * workMul() * fatWork(u);
  if (u.crafting >= rc.time) {
    u.crafting = null; site.made = (site.made || 0) + 1;
    if (Object.keys(rc.inp).length && site.made % 4 === 0 && craftCost(site) > 0.55) floatText(site.x, site.y - site.topH - 14, `${site.name} is getting skilled: now uses ${Math.round((1 - craftCost(site)) * 100)}% less material`, '#9fe8a8');
    if (site.kind === 'quarry' && units.some(o => o.type === 'oxcart' && !o.dead && o.home === site)) {
      site.stock = (site.stock || 0) + (rc.n || 1); if (site.stock > 60) site.stock = 60;
      if (site.stock % 4 === 0) floatText(site.x, site.y - 40, `${site.stock} stone cut, waiting for the ox cart`, '#e9dcbc');
      return;
    }
    // (Cy Young bakeries make 4.5 times the bread)
    u.carry += (rc.n || 1) * bakeryMulOf(site); u.carryType = rc.out; if (u.carry >= rc.batch) { u.sub = 'toDrop'; u.path = []; } }
}
function nearestDrop(u, type) {
  let best = null, bd = 1e9;
  for (const b of structures) { if (b.dead || b.team !== 'player' || b.done === false || !DROPS[b.kind] || !DROPS[b.kind].includes(type)) continue; const d = edgeDist(u, b); if (d < bd) { bd = d; best = b; } }
  return best;
}
const isManual = u => time - (u.manualT === undefined ? -99 : u.manualT) < 20;
function startJob(u) {
  const site = u.job;
  if (CRAFT[site.kind]) { u.order = 'craft'; u.sub = 'toSite'; u.path = []; u.repath = 0; u.crafting = null; u.task = null; return; }
  if (site.kind === 'hopfarm' || site.kind === 'wheatfarm') { u.order = 'gather'; u.task = { type: site.kind === 'hopfarm' ? 'hops' : 'wheat', node: site }; u.sub = 'toNode'; u.path = []; u.repath = 0; return; }
  if (site.kind === 'farm') { u.order = 'gather'; u.task = { type: 'food', node: site }; u.sub = 'toNode'; u.path = []; u.repath = 0; return; }
  const t = nearestNode('wood', site.x, site.y, 460, u.bad);
  if (!t) { u.job = null; floatText(u.x, u.y - 50, 'No trees near the hut', '#ffb38a'); return; }
  u.order = 'gather'; u.task = { type: 'wood', node: t }; u.sub = u.carry > 0 ? 'toKeep' : 'toNode'; u.path = []; u.repath = 0;
}
let jobT = 0;
function updateJobs(dt) {
  jobT -= dt; if (jobT > 0) return; jobT = 1;
  for (const q of structures) if (q.kind === 'quarry' && q.team === 'player' && q.done && !q.dead && !units.some(o => o.type === 'oxcart' && !o.dead && o.home === q)) {
    const f = nearestFree(Math.floor((q.x + 40) / TILE), Math.floor(q.y / TILE)); if (f) { const c = makeUnit('player', 'oxcart', f.c * TILE + 16, f.r * TILE + 16); c.home = q; c.order = 'cart'; c.facing = 1; floatText(q.x, q.y - 60, 'An ox cart arrives to haul the stone', '#9fe8a8'); }
  }
  const civs = units.filter(u => !u.dead && u.type === 'civ' && u.team === 'player' && u.order !== 'leave');
  for (const u of civs) if (u.job && (u.job.dead || (u.job.x0 !== undefined && !farms.includes(u.job) && !structures.includes(u.job)))) u.job = null;
  const sites = structures.concat(farms).filter(b => JOBS[b.kind] && b.team === 'player' && !b.dead && b.done && !b.asleep);
  for (const u of civs) if (u.job && u.job.asleep) { u.job = null; u.order = 'idle'; u.task = null; u.crafting = null; }
  for (const site of sites) {
    let staff = civs.filter(u => u.job === site).length;
    while (staff < JOBS[site.kind]) {
      // first an idle person; if nobody is idle, a gatherer with no job is called over, so every new workplace is staffed by itself
      let free = civs.filter(u => !u.job && u.order === 'idle' && !isManual(u));
      if (!free.length) free = civs.filter(u => !u.job && (u.order === 'gather' || u.order === 'move' || u.order === 'idle') && u.order !== 'build' && !(u.task && u.task.node && JOBS[u.task.node.kind]));
      if (!free.length) { if (!site.noStaffMsg) { site.noStaffMsg = true; floatText(site.x, site.y - site.topH - 10, `${site.name}: no free civilian. Train one at the keep (Town list).`, '#ffb38a'); } break; }
      site.noStaffMsg = false;
      free.sort((a, b) => Math.hypot(a.x - site.x, a.y - site.y) - Math.hypot(b.x - site.x, b.y - site.y));
      free[0].job = site; staff++; if (free[0].order !== 'build') { free[0].order = 'idle'; free[0].task = null; free[0].carry = 0; startJob(free[0]); }
      floatText(free[0].x, free[0].y - 50, JOB_NAME[site.kind] || 'Worker', '#ffe9a8');
    }
  }
  // breaks: every few minutes a worker rests 20 to 30 seconds by the fire, then goes back to the same work
  for (const u of civs) {
    if (u.breakUntil) { if (time < u.breakUntil) continue; u.breakUntil = 0; u.breakAt = null; u.workedT = 0; if (u.job) { u.order = 'idle'; } else if (u.breakNode && nodeOk(u.breakNode, u.breakType)) commandGather([u], u.breakNode); continue; }
    const busy = (u.order === 'gather' || u.order === 'craft') && !isManual(u);
    if (busy) u.workedT = (u.workedT || 0) + 1;
    if (busy && playerFire && u.carry === 0 && u.workedT > 170 + (u.seed * 37 % 70) && (u.sub === 'toNode' || u.sub === 'toSite')) {
      u.breakNode = u.task && u.task.node; u.breakType = u.task && u.task.type; u.breakUntil = time + 20 + Math.random() * 10;
      const mineB = k => structures.filter(h => h.kind === k && h.team === 'player' && h.done && !h.dead), pick = l => l[Math.floor(Math.random() * l.length)];
      const tav = mineB('tavern'), chp = mineB('chapel'), homes = mineB('house'), roll = Math.random();
      const home = tav.length && roll < 0.25 ? pick(tav) : chp.length && roll < 0.42 ? pick(chp) : homes.length && roll < 0.7 ? pick(homes) : null;
      u.breakAt = home;
      const a = Math.random() * Math.PI * 2, d = home ? { x: home.x + RR(-8, 8), y: home.y + 10 } : { x: playerFire.x + Math.cos(a) * 46, y: playerFire.y + Math.sin(a) * 32 };
      u.order = 'move'; u.dest = d; u.stuckT = 0; u.path = findPath(u.x, u.y, d.x, d.y); u.task = null; u.crafting = null;
      floatText(u.x, u.y - 50, home ? `A short break at the ${home.kind === 'chapel' ? 'House of Prayer' : home.kind === 'tavern' ? 'tavern' : 'house'}` : 'Taking a short break', '#e9dcbc');
    }
  }
  // anything waiting to be built gets builders at once: idle people first, then gatherers, then (if no one else) workers
  for (const b of structures.concat(farms)) {
    if (b.team !== 'player' || b.dead || b.done !== false) continue;
    const on = civs.filter(u => u.order === 'build' && u.buildTarget === b).length; if (on >= 2) continue;
    const near = (a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y);
    let pool = civs.filter(u => !u.job && !u.toHeal && !u.sick && !isManual(u) && u.order !== 'build' && u.order !== 'leave' && !(u.carry > 0 && u.sub === 'toKeep'));
    if (!pool.length && !on) pool = civs.filter(u => u.job && !u.toHeal && !u.sick && u.order !== 'build' && u.order !== 'leave' && !(u.carry > 0));
    pool.sort(near).slice(0, 2 - on).forEach(u => { u.breakUntil = 0; commandBuild([u], b); floatText(u.x, u.y - 50, `Off to build the ${b.name}`, '#ffe9a8'); });
  }
  for (const u of civs) if (u.job && u.order === 'idle' && !(u.breakUntil > time) && !u.toHeal) startJob(u);
  // anyone with no building job gathers by themselves: food when stores are low, otherwise wood; at most 5 to a bush, tree or rock
  // how many are already on each bush, tree or rock: counted once, then kept up to date as people are sent
  const onCount = new Map(); for (const o of civs) if (o.task && o.task.node && o.order === 'gather') onCount.set(o.task.node, (onCount.get(o.task.node) || 0) + 1);
  const onNode = n => onCount.get(n) || 0;
  for (const u of civs) {
    if (u.job || u.toHeal || u.order !== 'idle' || isManual(u) || u.breakUntil > time || u.carry > 0 && false) continue;
    const want = res.food < 120 || foodKinds.berries + foodKinds.crops < res.wood * 0.6 ? 'food' : 'wood';
    for (const type of [want, want === 'food' ? 'wood' : 'food']) {
      const list = type === 'wood' ? trees : bushes; let best = null, bd = 1100;
      for (const n of list) { if (!nodeOk(n, type) || onNode(n) >= 5 || (u.bad && u.bad.has(n))) continue; const c = nodeCenter(n), d = Math.hypot(c.x - u.x, c.y - u.y); if (d < bd) { bd = d; best = n; } }
      if (best) { commandGather([u], best); onCount.set(best, onNode(best) + 1); break; }
    }
  }
  // people with no job wait by the campfire
  if (playerFire) for (const u of civs) if (!u.job && u.order === 'idle' && !isManual(u) && !(u.breakUntil > time) && !u.inside && !u.toHeal && Math.hypot(u.x - playerFire.x, u.y - playerFire.y) > 75) {
    const a = Math.random() * Math.PI * 2, r = 34 + Math.random() * 26, d = { x: playerFire.x + Math.cos(a) * r, y: playerFire.y + Math.sin(a) * r * 0.7 };
    u.order = 'move'; u.dest = d; u.stuckT = 0; u.path = findPath(u.x, u.y, d.x, d.y);
  }
}
const idleCount = () => units.filter(u => !u.dead && u.type === 'civ' && u.team === 'player' && !u.job && (u.order === 'idle' || (u.order === 'move' && !isManual(u)))).length;
function updateEconomy(dt) {
  updateJobs(dt);
  const k = playerKeep();
  // everyone eats: 1 food per person every 15 seconds
  const people = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u));
  hungerT += people.length * dt * RATIONS[ration].eat / CIV.eatEvery;
  updateMood(dt, people);
  while (hungerT >= 1) { hungerT -= 1; spendFood(1); }
  starving = res.food <= 0;
  if (starving) {
    res.food = 0;
    for (const u of people) { u.hp -= 0.5 * dt; if (u.hp <= 0) kill(u); }
    starveMsgT -= dt; if (starveMsgT <= 0) { showBanner('Your people are starving! Send civilians to gather food.', 4); starveMsgT = 20; AudioSys.ui('warn'); }
  }
  // berry bushes slowly grow back
  for (const b of bushes) b.amount = Math.min(b.max, b.amount + dt / CIV.regrow);
  for (const fm of farms) if (fm.done) fm.amount = Math.min(fm.max, fm.amount + dt / 1.2 * (1 + 0.25 * WEATHER.rain - 0.3 * WEATHER.snow));
  // training at the keep
  if (k && trainQueue.length) {
    const heads = new Set();
    for (const q of trainQueue.slice()) {
      if (heads.has(q.kind)) continue; heads.add(q.kind);
      q.t += dt;
      if (q.t >= q.dur) {
        trainQueue.splice(trainQueue.indexOf(q), 1);
        const u = makeUnit('player', q.kind, k.x1 + 14, k.y1 - 20), rp = rallyFor(q.kind);
        commandMove([u], rp.x + RR(-25, 25), rp.y + RR(-20, 20));
        floatText(u.x, u.y - 50, `${u.name} ready`, '#9fe8a8'); AudioSys.ui('ready');
      }
    }
  }
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.6) floats.splice(i, 1); }
}

