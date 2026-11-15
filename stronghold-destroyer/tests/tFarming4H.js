// Phase 4H: the Field and the Farm (Gerald, after 4G).
//  - Field: at most five (at every stage: no more merging), ten people each, wheat (fastest), corn, grapes (slowest),
//    up to all three at once; + and - in its box put people on a crop or take them off (and they stay off).
//  - Farm: at most two, five people each; it raises the animals you tick (and only those are born); its keepers bring in
//    eggs, milk and meat; it gets better with time (and a stable).
//  - Happy people grow food faster; a well 25% faster (and water for fires); a lookout tower sees around and rings the bell.
//  - Reserve: a guard with a knight's strength, on foot, even before knights; two for a field, one for a farm.
//  - The market: corn and the animals; animals always sell at the top price.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done } = await start('cyyoung', { start: 0 });
  const r = await p.evaluate(() => {
    const out = {}; res.wood = 9000; res.gold = 3000; res.stone = 2000; mood = 55;
    Object.assign(FOOD_FIRST, { protect: 0, min: 0, low: 0, short: 0 });   /* (4I's food-first rule is checked in tTapField4I.js; here the field and farm alone) */
    T.people(40); T.run(2);
    // ---------- the Field ----------
    const fields = []; for (let i = 0; i < 5; i++) fields.push(T.put('wheatfarm'));
    out.fiveFields = fields.every(Boolean); out.sixthWhy = indWhyNot('wheatfarm'); out.size = [fields[0].w, fields[0].h]; out.staff = maxStaff('wheatfarm');
    T.stage(4); out.fieldsAtCastle = mineDone('wheatfarm').length; out.staffAtCastle = maxStaff('wheatfarm'); T.stage(1);
    for (const f of fields.slice(1)) { f.plan = { wheat: 0, corn: 0, grapes: 0 }; } T.run(3);   // (only the first field works)
    const f = fields[0]; out.start = Object.assign({}, fieldPlan(f)); T.run(3); out.startStaff = staffOf(f);
    for (const a of ['crop+:wheat', 'crop+:corn', 'crop+:corn', 'crop+:corn', 'crop+:corn', 'crop+:grapes', 'crop+:grapes', 'crop+:grapes', 'crop+:grapes']) T.act(f, a);
    out.plan = Object.assign({}, f.plan); out.planned = planTotal(f); T.act(f, 'crop+:grapes'); out.eleventh = planTotal(f); T.run(4);
    out.crew = { wheat: cropCount(f, 'wheat'), corn: cropCount(f, 'corn'), grapes: cropCount(f, 'grapes') };
    // each crop at its own pace: wheat fastest, grapes slowest (seconds of work for one, at the same mood)
    const one = c => workersOf(f).find(u => u.crop === c), plain = c => ({ job: f, crop: c, fat: 0, sick: 0 });   /* (a worker who is neither ill nor stout: one real worker may be either) */
    out.rate = { wheat: +farmRate(plain('wheat'), f).toFixed(2), corn: +farmRate(plain('corn'), f).toFixed(2), grapes: +farmRate(plain('grapes'), f).toFixed(2) };
    // what comes in over two minutes
    f.made = {}; T.run(150);
    out.made = { wheat: Math.round(f.made.wheat || 0), corn: Math.round(f.made.corn || 0), grapes: Math.round(f.made.grapes || 0) };   /* (what was carried in: people eat the corn as it comes) */
    out.spotsInside = workersOf(f).every(u => u.x > f.x0 - 20 && u.x < f.x1 + 20 && u.y > f.y0 - 20 && u.y < f.y1 + 20 || u.sub === 'toKeep' || u.sub === 'toNode' || u.breakUntil > time);
    // too much food: take people off, and they stay off
    T.act(f, 'crop-:corn'); T.act(f, 'crop-:corn'); T.act(f, 'crop-:corn'); T.run(12);
    out.afterRemove = { plan: f.plan.corn, corn: cropCount(f, 'corn'), staff: staffOf(f) };
    // happy people grow faster; upset slower; a well 25% faster
    const u = one('wheat'); mood = 80; const rHappy = farmRate(u, f); mood = 55; const rMid = farmRate(u, f); mood = 20; const rSad = farmRate(u, f); mood = 55;
    T.act(f, 'well'); const rWell = farmRate(u, f);
    out.mood = { happy: +(rMid / rHappy).toFixed(2), upset: +(rMid / rSad).toFixed(2), well: +(rMid / rWell).toFixed(2), wellBuilt: !!f.well };
    // ---------- the Farm ----------
    const fm1 = T.put('farm'), fm2 = T.put('farm'); out.twoFarms = !!fm1 && !!fm2; out.thirdWhy = indWhyNot('farm'); out.farmStaff = maxStaff('farm'); out.farmSize = [fm1.w, fm1.h];
    T.run(3); out.raise = (fm1.raise || []).slice(); out.ducksAt = fm1.animals.ducks;
    T.act(fm1, 'fill'); T.run(3); out.farmCrew = staffOf(fm1);
    T.act(fm1, 'raise:pigs'); const pigs0 = fm1.animals.pigs, ch0 = fm1.animals.chickens; T.run(90);
    out.breed = { pigsKept: fm1.animals.pigs === pigs0, chickensBorn: fm1.animals.chickens > ch0 };
    const food0 = foodKinds.farm || 0; T.run(60); out.farmFood = Math.round((foodKinds.farm || 0) - food0);
    // levels: with time; the third needs a stable beside it
    fm1.workedT = 365; T.run(2); out.lvl2 = farmLvl(fm1).n; fm1.workedT = 905; T.run(2); out.lvl3NoStable = farmLvl(fm1).n;
    T.stage(3); let st = null; for (const [c, rr] of [[fm1.c + fm1.w, fm1.r + 1], [fm1.c - 2, fm1.r + 1], [fm1.c + 1, fm1.r + fm1.h], [fm1.c + 1, fm1.r - 2], [fm1.c + fm1.w, fm1.r], [fm1.c + fm1.w, fm1.r + 2], [fm1.c - 2, fm1.r], [fm1.c - 2, fm1.r + 2]]) if (!st && canPlace('stable', c, rr)) { st = createBuilding('stable', c, rr); finishBuilding(st); } T.run(2); out.stable = !!st && stableBy(fm1); out.lvl3 = farmLvl(fm1).n; T.stage(1);
    // fewer people on the farm, and it stays so
    T.act(fm1, 'fill'); T.run(2); siteAction(fm1, 'remove'); siteAction(fm1, 'remove'); siteAction(fm1, 'remove'); T.close(); T.run(10); out.farmAfterRemove = [fm1.want, staffOf(fm1)];
    // ---------- the lookout tower ----------
    T.act(fm2, 'lookout'); FOG.seen.fill(0); T.run(2); const cx = (fm2.x0 + fm2.x1) / 2, cy = (fm2.y0 + fm2.y1) / 2;
    out.lookoutSees = fogSeen(cx + 400, cy) || fogSeen(cx - 400, cy) || fogSeen(cx, cy + 400) || fogSeen(cx, cy - 400);
    const R = REALM.rivals.find(q => !q.friend), foe = makeUnit(R.team, 'spear', cx + 300, cy); foe.owner = R.id; foe.order = 'idle';
    document.getElementById('banner').style.display = ''; T.run(2); out.warned = /Raiders near your farm/.test(document.getElementById('banner').textContent); document.getElementById('banner').style.display = 'none';
    // ---------- the guards ----------
    const gold0 = res.gold; T.act(f, 'guard'); T.act(f, 'guard'); T.act(f, 'guard'); const gs = guardsOf(f);
    out.guards = { field: gs.length, paid: gold0 - res.gold, type: gs[0] && gs[0].type, onFoot: gs[0] && !gs[0].mounted && gs[0].kit === 'foot', hp: gs[0] && gs[0].maxHp, knightHp: KINDS.knight.hp, stage: stageN };
    T.act(fm2, 'guard'); T.act(fm2, 'guard'); out.guards.farm = guardsOf(fm2).length;
    // the guard goes after a raider who comes near his field, and comes back after
    foe.x = (f.x0 + f.x1) / 2 + 150; foe.y = (f.y0 + f.y1) / 2; T.run(1);
    const g = gs[0], d0 = Math.hypot(g.x - foe.x, g.y - foe.y); T.run(4); out.guardFights = g.order === 'attack' || Math.hypot(g.x - foe.x, g.y - foe.y) < d0 - 20 || foe.dead;
    foe.dead = true; foe.hp = 0; T.run(30); out.guardBack = Math.hypot(g.x - g.guardSpot.x, g.y - g.guardSpot.y) < 70;
    // ---------- the market ----------
    T.stage(3); const mk = T.put('market'); T.stage(1); const row = k => MARKET.find(q => q[0] === k);
    mood = 90; schoolLvl = 0; const cowHappy = priceOf(row('cows')); mood = 15; const cowSad = priceOf(row('cows')); schoolLvl = 3; const cowSchool = priceOf(row('cows')); schoolLvl = 0; mood = 55;
    const wheatSell = priceOf(row('wheat')).sell, cornP = priceOf(row('corn')), grapeSell = priceOf(row('grapes')).sell;
    const each = (k, v) => +(v / row(k)[2]).toFixed(2);   /* (prices are for a lot: 2 chickens, 10 wheat) */
    out.market = { cowSell: [cowHappy.sell, cowSad.sell, cowSchool.sell], cowBuy: cowSad.buy, chickenSell: each('chickens', priceOf(row('chickens')).sell), wheatSell: each('wheat', wheatSell), cornSell: each('corn', cornP.sell), grapeSell: each('grapes', grapeSell), corn: !!row('corn') };
    const g1 = res.gold, cows0 = animalsAll('cows'); trade(mk, 'sell', 'cows'); out.market.soldCow = [res.gold - g1, cows0 - animalsAll('cows')];
    const c1 = foodKinds.corn; trade(mk, 'buy', 'corn'); out.market.boughtCorn = Math.round(foodKinds.corn - c1); T.close();
    // ---------- the boxes ----------
    showSite(f); out.fieldBox = { crops: ['wheat', 'corn', 'grapes'].every(c => document.querySelector(`#storePop [data-ind="crop+:${c}"]`)), noAdd: !document.querySelector('#storePop [data-site="add"]'),
      well: !document.querySelector('#storePop [data-ind="well"]'), whatIs: !!document.querySelector('#storePop .whatIs'), first: (document.querySelector('#storePop .farmCtl') || {}).previousElementSibling ? document.querySelector('#storePop .farmCtl').previousElementSibling.tagName : '' }; T.close();
    document.getElementById('storePop').dataset.site = ''; showSite(fm1); out.farmBox = { toggles: ['chickens', 'cows', 'pigs', 'ducks', 'turkeys', 'sheep'].every(k => document.querySelector(`#storePop [data-ind="raise:${k}"]`)), lookout: !!document.querySelector('#storePop [data-ind="lookout"]') }; T.close();
    return out; });
  console.log(JSON.stringify(r));
  need(r.fiveFields && r.sixthWhy && r.size[0] === 4 && r.size[1] === 4 && r.staff === 10, `five fields of ten people, 4 by 4, and no sixth (${r.sixthWhy})`);
  need(r.fieldsAtCastle === 5 && r.staffAtCastle === 10, `fields no longer merge as the castle grows (${r.fieldsAtCastle} at the Castle, ${r.staffAtCastle} each)`);
  need(r.start.corn === 2 && r.startStaff === 2, `a new field starts with two people on corn (4I) (${JSON.stringify(r.start)}, ${r.startStaff})`);
  need(r.planned === 10 && r.eleventh === 10 && r.crew.wheat === r.plan.wheat && r.crew.corn === r.plan.corn && r.crew.grapes === r.plan.grapes && r.plan.wheat > 0 && r.plan.grapes > 0, `+ puts people on each crop, up to ten (${JSON.stringify(r.crew)} for ${JSON.stringify(r.plan)})`);
  need(r.rate.wheat < r.rate.corn && r.rate.corn < r.rate.grapes, `wheat grows fastest, then corn, grapes slowest (${JSON.stringify(r.rate)} seconds each)`);
  need(r.made.wheat > 0 && r.made.corn > 0 && r.made.grapes > 0, `all three crops come in (${JSON.stringify(r.made)})`);
  need(r.afterRemove.plan === r.plan.corn - 3 && r.afterRemove.corn === r.afterRemove.plan && r.afterRemove.staff === 7, `taking people off a crop frees them, and they stay off (${JSON.stringify(r.afterRemove)})`);
  need(r.mood.happy >= 1.2 && r.mood.upset <= 0.85 && r.mood.well >= 1.2 && r.mood.wellBuilt, `happy people grow food faster, upset slower; a well 25% faster (${JSON.stringify(r.mood)})`);
  need(r.twoFarms && r.thirdWhy && r.farmStaff === 5 && r.farmSize[0] === 4, `two farms of five people, no third (${r.thirdWhy})`);
  need(['chickens', 'cows', 'pigs', 'ducks'].every(k => r.raise.includes(k)) && r.ducksAt > 0 && r.farmCrew === 5, `a farm raises chickens, cows, pigs and ducks, and holds five (${r.raise}, ${r.farmCrew})`);
  need(r.breed.pigsKept && r.breed.chickensBorn, `only the animals you tick are born (${JSON.stringify(r.breed)})`);
  need(r.farmFood > 0, `the farm's keepers bring in eggs, milk and meat (${r.farmFood} in a minute)`);
  need(r.lvl2 === 2 && r.lvl3NoStable === 2 && r.stable && r.lvl3 === 3, `the farm gets better with time, and its best with a stable (${r.lvl2}, ${r.lvl3NoStable}, ${r.lvl3})`);
  need(r.farmAfterRemove[0] === 2 && r.farmAfterRemove[1] === 2, `fewer people on the farm stay fewer (${r.farmAfterRemove})`);
  need(r.lookoutSees && r.warned, `a lookout tower sees around and rings the bell for raiders (${r.lookoutSees}, ${r.warned})`);
  need(r.guards.field === 2 && r.guards.farm === 1 && r.guards.paid <= 0 && r.guards.type === 'knight' && r.guards.onFoot && r.guards.hp >= r.guards.knightHp && r.guards.stage === 1, `knight-strength guards on foot at the Shack, free (4I): two for a field, one for a farm (${JSON.stringify(r.guards)})`);
  need(r.guardFights && r.guardBack, `a guard goes after a raider near his field and comes back (${r.guardFights}, ${r.guardBack})`);
  const M = r.market;
  need(M.corn && M.cowSell[0] === M.cowSell[1] && M.cowSell[1] === M.cowSell[2] && M.cowBuy > M.cowSell[0], `animals always sell at the top price, whatever the mood or the school (${M.cowSell}, buy ${M.cowBuy})`);
  need(M.chickenSell > M.grapeSell && M.grapeSell > M.wheatSell, `farm animals sell for more than crops, and grapes for more than wheat (each: ${M.chickenSell}, ${M.grapeSell}, ${M.wheatSell} gold)`);
  need(M.soldCow[0] === M.cowSell[1] && M.soldCow[1] === 1 && M.boughtCorn === 10, `selling a cow and buying corn work (${JSON.stringify(M)})`);
  need(r.fieldBox.crops && r.fieldBox.noAdd && r.fieldBox.well && !r.fieldBox.whatIs && r.fieldBox.first === 'H3', `the field's box opens on its crops (${JSON.stringify(r.fieldBox)})`);
  need(r.farmBox.toggles && r.farmBox.lookout, `the farm's box lets you tick its animals and add a lookout (${JSON.stringify(r.farmBox)})`);
  await done();
})();
