// Phase 4B step B1, the industries: yards that grow and merge (and work iron from the Hold), arrows that cost wood,
// quarries with oxen, stone carried by hand only near the castle, the animal farm, the Fletcher's cows, the stable,
// the granary's limit and its bugs, ale prices, the feast, market prices, the school, engineers, healing houses,
// and the inside picture behind a building's box.
const { chromium } = require('playwright'); const env = require('./env'); const SP = env.SP;
(async () => {
  const b = await chromium.launch(env.LAUNCH); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 999999 });
  const errs = [], fails = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  const need = (ok, what) => { if (!ok) fails.push(what); };
  await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
  await p.goto(env.GAME_REAL); await p.waitForTimeout(600);
  await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
  await p.click('.fac[data-fac="ticanologue"]'); await p.click('.fac[data-fac="ticanologue"] .fgo');
  await p.evaluate(() => { window.__step(3); document.getElementById('banner').style.display = 'none'; SD.setRaid(99999); REALM.rogueT = 1e9; for (const R of REALM.rivals) R.raidT = 1e9; });
  // helpers inside the page: place a finished building near the keep, add people, jump to a stage
  await p.evaluate(() => {
    window.T = {
      put(kind, near) { const k = SD.keep(), o = near || { c: k.c + 1, r: k.r + 1 };
        for (let rad = 3; rad < 40; rad++) for (let a = 0; a < 28; a++) { const c = o.c + Math.round(Math.cos(a / 28 * 6.283) * rad), r = o.r + Math.round(Math.sin(a / 28 * 6.283) * rad); if (canPlace(kind, c, r)) { const bb = createBuilding(kind, c, r); finishBuilding(bb); return bb; } }
        return null; },
      people(n) { const k = SD.keep(); for (let i = 0; i < n; i++) { const f = nearestFree(k.c + 2 + (i % 5), k.r + 6 + Math.floor(i / 5)); makeUnit('player', 'civ', f.c * TILE + 16, f.r * TILE + 16); } },
      stage(n) { stageN = n; window.__step(25); },
      run(secs) { window.__step(Math.round(secs * 20)); },
      act(b, a) { indAction(b, a); document.getElementById('storePop').hidden = true; storeShown = null; }   // (an open box pauses the game)
    };
  });
  const r = await p.evaluate(() => {
    const out = {};
    T.people(40); SD.res.wood = 5000; SD.res.gold = 5000; SD.res.stone = 2000;
    // ---- the yard: four huts at the Shack; a fifth refused; two each; they merge as the castle grows ----
    const huts = []; for (let i = 0; i < 4; i++) huts.push(T.put('woodhut'));
    out.fifthRefused = !!indWhyNot('woodhut'); out.staff1 = maxStaff('woodhut');
    T.run(4); out.hutCrew1 = huts.filter(h => nearestNode('wood', h.x, h.y, 460)).map(h => staffOf(h));   /* (a hut with no trees near loses its woodcutters) */
    T.stage(2); out.huts2 = mineDone('woodhut').length; out.name2 = mineDone('woodhut')[0].name; out.staff2 = maxStaff('woodhut');
    T.stage(3); out.huts3 = mineDone('woodhut').length; out.name3 = mineDone('woodhut')[0].name;
    const yard = mineDone('woodhut')[0]; T.act(yard, 'fill'); T.run(2);
    out.yardCrew = staffOf(yard); out.ironCrew = units.filter(u => u.job === yard && u.ironWork).length;
    const iron0 = SD.res.iron; T.run(40); out.ironMade = SD.res.iron - iron0;
    out.wagon = false; for (let i = 0; i < 30 && !out.wagon; i++) { T.run(1); out.wagon = units.some(u => u.job === yard && !u.ironWork && u.speedMul > 1); }
    // ---- arrows cost wood; no wood, rock-tipped (weaker) ----
    const k = SD.keep(), arch = makeUnit('player', 'archer', k.x + 60, k.y + 60), foe = makeUnit('enemy', 'spear', k.x + 160, k.y + 60);
    SD.res.wood = 10; fire({ x0: arch.x, y0: arch.y, x1: foe.x, y1: foe.y, t: 0, dur: 0.5, h: 18, target: foe, from: arch, dmg: 10 }); out.woodAfterArrow = +SD.res.wood.toFixed(2);
    SD.res.wood = 0; const a2 = { x0: arch.x, y0: arch.y, x1: foe.x, y1: foe.y, t: 0, dur: 0.5, h: 18, target: foe, from: arch, dmg: 10 }; fire(a2); out.rockArrow = a2.rock === true && a2.dmg === 8;
    foe.dead = true; SD.res.wood = 5000;
    // ---- quarries: two at most, oxen by stage; on foot only near stone ----
    const rock = rocks.filter(rk => !rk.iron && !rk.gone).sort((a, b2) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b2.x - k.x, b2.y - k.y));
    const q = T.put('quarry', { c: Math.floor(rock[0].x / TILE), r: Math.floor(rock[0].y / TILE) });
    out.quarryPlaced = !!q; out.quarryStaff = maxStaff('quarry'); out.quarryMax = indMax('quarry');
    T.run(3); out.oxen3 = q ? oxenOf(q).length : -1;
    T.stage(4); T.run(3); out.oxen4 = q ? oxenOf(q).length : -1;
    const far = rocks.find(rk => !rk.iron && !rk.gone && Math.hypot(rk.x - k.x, rk.y - k.y) > 900), civ = units.find(u => u.type === 'civ' && u.team === 'player' && !u.job);
    if (far && civ) { civ.order = 'idle'; commandGather([civ], far); out.farStoneRefused = civ.order !== 'gather'; } else out.farStoneRefused = 'no far rock';
    // ---- the animal farm, the Fletcher and the stable ----
    const fm = T.put('farm'); T.run(2); out.animals = fm && fm.animals ? Object.assign({}, fm.animals) : null;
    const fl = T.put('bowyer'); fm.animals.cows = 0; out.fletcherBlocked = !!indBlock(fl); fm.animals.cows = 3; out.fletcherOk = !indBlock(fl);
    out.stableFarAway = !canPlace('stable', SD.keep().c + 30, SD.keep().r + 30);
    const st = T.put('stable', { c: fm.c, r: fm.r }); out.stablePlaced = !!st;
    if (st) { T.act(st, 'fill'); T.run(2); out.stableCrew = staffOf(st); T.run(75); out.horses = st.horses; }
    // ---- the granary: too much food brings bugs; it can be expanded from the Hold ----
    const gr = T.put('granary'); const cap = foodCap(); out.cap = cap;
    addFood('crops', cap + 400 - SD.res.food); T.run(62); out.bugs = bugsOn; const f1 = SD.res.food; T.run(5); out.spoiling = SD.res.food < f1;
    T.act(gr, 'expand'); out.capExpanded = foodCap(); spendFood(Math.max(0, Math.floor(SD.res.food - 200))); T.run(12); out.bugsGone = !bugsOn;
    // ---- ale prices ----
    const ah = T.put('alehouse'); SD.res.ale = 200; alePrice = 0; T.run(3); out.aleCheap = aleBonus; alePrice = 2; T.run(3); out.aleDear = aleBonus;
    { const g0 = SD.res.gold; SD.res.ale = 200; T.run(30); out.aleGold = SD.res.gold - g0; } alePrice = 1;
    // ---- the market: food costs the same either way; the school's level 2 buys cheaper ----
    const row = MARKET.find(x => x[0] === 'stone'), food = MARKET.find(x => x[0] === 'food');
    const fp = priceOf(food); out.foodEven = fp.buy === fp.sell;
    schoolLvl = 0; const p0 = priceOf(row); schoolLvl = 2; const p2 = priceOf(row); schoolLvl = 0; out.schoolCheaper = p2.buy < p0.buy && p2.sell > p0.sell;
    // ---- the school ----
    const sc = T.put('school'); out.schoolPlaced = !!sc;
    const before = { craft: craftCost({ made: 0 }), wood: cm(100) };
    SD.res.gold = 5000; startStudy('school'); T.run(INDUSTRY.school.levels[0][1] + 2); out.schoolLvl = schoolLvl;
    out.lessWaste = craftCost({ made: 0 }) < before.craft; out.cheaperBuild = cm(100) < before.wood;
    T.stage(5); out.trebLocked = !unlocked('trebuchet', true); schoolLvl = 3; out.trebOpen = unlocked('trebuchet', true);
    const eh = T.put('engineerhut'); trainEngineer(); out.engineers = engineers().length;
    // ---- a sick person near an apothecary is cared for where they are ----
    const ap = T.put('apothecary'); T.run(2);
    const sick = units.find(u => u.type === 'civ' && u.team === 'player' && !u.dead && Math.hypot(u.x - ap.x, u.y - ap.y) < 300) || makeUnit('player', 'civ', ap.x, ap.y + 50);
    sick.sick = 1; sick.healT = 0; sick.sickT = 0; T.run(16); out.healedInPlace = !sick.sick;
    // ---- the feast ----
    SD.res.grapes = 20; SD.res.apples = 20; fm.animals.chickens = 6; fm.animals.turkeys = 3; fm.animals.cows = 3; fm.animals.sheep = 2; taxTotal = 300; SD.res.gold = 1000;
    const g0 = SD.res.gold, w0 = workMul(); holdFeast(); out.feastOn = feastUntil > time; out.feastCost = g0 - SD.res.gold; out.feastWork = +(workMul() / w0).toFixed(2);
    out.feastMoreThanTaxes = out.feastCost > taxTotal;
    return out;
  });
  console.log(JSON.stringify(r));
  need(r.fifthRefused && r.staff1 === 2, 'Shack: four huts of two people at most');
  need(r.hutCrew1.every(n => n === 2), 'each hut fills with two by itself');
  need(r.huts2 === 3 && r.name2 === 'Wood Yard' && r.staff2 === 5, 'Homestead: huts merge into three Wood Yards of five');
  need(r.huts3 === 2 && r.name3 === 'Wood and Iron Yard', 'Hold: two Wood and Iron Yards');
  need(r.yardCrew === 10 && r.ironCrew === 4 && r.ironMade > 0, 'the yard works iron from the Hold (the blacksmith joins)');
  need(r.wagon, 'wagons carry the woodcutters from the Hold');
  need(Math.abs(r.woodAfterArrow - 9.9) < 0.01 && r.rockArrow, 'arrows cost wood; with none, rock-tipped arrows (weaker)');
  need(r.quarryPlaced && r.quarryStaff === 10 && r.quarryMax === 2, 'quarry: two at most, ten people each');
  need(r.oxen3 === 1 && r.oxen4 === 2, 'oxen: one, then a second free at the Castle');
  need(r.farStoneRefused === true, 'stone far from the castle cannot be carried by hand');
  need(r.animals && r.animals.cows >= 2 && r.animals.pigs >= 2 && r.animals.oxen >= 2, 'the farm has cows, pigs and oxen');
  need(r.fletcherBlocked && r.fletcherOk, 'the Fletcher needs two cows');
  need(r.stableFarAway && r.stablePlaced && r.stableCrew === 4 && r.horses >= 1, 'the stable stands in a farm, needs four people, and breeds horses');
  need(r.bugs && r.spoiling && r.capExpanded > r.cap && r.bugsGone, 'granary: overfull brings bugs and spoiling; expanding and selling clears them');
  need(r.aleCheap > r.aleDear && r.aleDear < 0 && r.aleGold > 0, 'ale: cheap pleases, dear angers, and ale earns gold');
  need(r.foodEven && r.schoolCheaper, 'market: food even; better prices after school level 2');
  need(r.schoolPlaced && r.schoolLvl === 1 && r.lessWaste && r.cheaperBuild, 'the school teaches a level: less waste, cheaper building');
  need(r.trebLocked && r.trebOpen, 'trebuchets need the school top level at the Stronghold');
  need(r.engineers === 1, 'an engineer trained at the school');
  need(r.healedInPlace, 'the sick near an apothecary are cared for where they are');
  need(r.feastOn && r.feastMoreThanTaxes && r.feastWork >= 1.9, 'the feast: costs more than all taxes, twice the work');
  // ---- the building box: new lines, buttons, and the inside picture behind it ----
  const box = await p.evaluate(() => { const y = mineDone('woodhut')[0]; showSite(y); window.__step(2); const pp = document.getElementById('storePop'); return { text: pp.textContent.replace(/\s+/g, ' ').slice(0, 400), pic: pp.classList.contains('pic') && /data:image/.test(pp.style.backgroundImage), fill: !!pp.querySelector('[data-ind="fill"]'), iron: !!pp.querySelector('[data-ind="iron+"]') }; });
  console.log('yard box:', JSON.stringify(box));
  need(box.pic && box.fill && box.iron && /on iron/.test(box.text), 'the yard box: level, iron split, Fill and the inside picture');
  await p.evaluate(() => { const y = mineDone('woodhut')[0]; SD.cam.z = 1; SD.centerOn(y.x, y.y - 40); window.__drawMs = 0; window.__step(3); window.__drawMs = 999999; });
  await p.screenshot({ path: SP + '/industry-yard.png' });
  const sbox = await p.evaluate(() => { showIndBox(mineDone('school')[0]); window.__step(2); return document.getElementById('storePop').textContent.replace(/\s+/g, ' ').slice(0, 300); });
  console.log('school box:', sbox); need(/level 3 of 3/.test(sbox) && /Train an engineer/.test(sbox), 'the school box');
  await p.screenshot({ path: SP + '/industry-school.png' });
  console.log('fails', JSON.stringify(fails)); console.log('errors', errs.slice(0, 5)); await b.close();
  if (fails.length) process.exit(1);
})();
