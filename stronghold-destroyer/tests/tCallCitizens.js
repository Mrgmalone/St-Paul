// Phase 4F (Gerald): ten minutes of peace at the start (five on Hard), and citizens can be called again.
//  - Peace: the first rival raid and the first bandits wait 10 minutes on Easy and Medium, 5 on Hard; the opening
//    banner says so.
//  - The Citizen button in the Town list calls one citizen from the countryside: it costs food and gold and he walks in
//    along the road when his wait is over. Unhappy people: longer and dearer (below 20 happiness, 4.5 minutes); happy
//    people: sooner and cheaper. Each war won (a raid beaten off, a rival defeated) and each general (a soldier with 10+
//    stars) makes it sooner and cheaper, and makes the houses raise their children sooner. Full houses and five on the
//    way stop it.
const { chromium } = require('playwright'); const env = require('./env'); const { start } = require('./lib4b');
(async () => {
  // ---------- peace time, read before anything else changes it ----------
  const peace = {};
  for (const d of ['easy', 'medium', 'hard']) {
    const b = await chromium.launch(env.LAUNCH), p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p);
    await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
    await p.goto(env.GAME_REAL + '?start=0'); await p.waitForTimeout(500);
    await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
    await p.click(`.dbtn[data-d="${d}"]`); await p.click('.fac[data-fac="cyyoung"]'); await p.click('.fac[data-fac="cyyoung"] .fgo'); await p.evaluate(() => window.__step(2));
    peace[d] = await p.evaluate(() => ({ diff: DIFF.key, raids: REALM.rivals.filter(R => !R.friend).map(R => Math.round(R.raidT)), rogue: Math.round(REALM.rogueT), banner: (document.getElementById('banner').textContent.match(/(\d+) minutes of peace/) || [])[1] }));
    await b.close();
  }
  console.log('peace', JSON.stringify(peace));
  const { p, need, done } = await start('cyyoung', { start: 0 });
  for (const [d, want] of [['easy', 600], ['medium', 600], ['hard', 300]]) {
    const P = peace[d];
    need(P.diff === d && Math.min(...P.raids) >= want - 5 && Math.min(...P.raids) <= want + 5, `${d}: the first raid waits ${want / 60} minutes (${P.raids.join(', ')} s)`);
    need(Math.abs(P.rogue - want) <= 5, `${d}: the first bandits wait ${want / 60} minutes too (${P.rogue} s)`);
    need(+P.banner === want / 60, `${d}: the opening banner says ${want / 60} minutes of peace (it says ${P.banner})`);
  }
  // ---------- the Citizen button ----------
  const btn = await p.evaluate(() => { const b = document.querySelector('.tb[data-k="civ"]'); UI.showTab && UI.showTab('town'); return { here: !!b, locked: b.classList.contains('locked'), text: b.textContent, inTown: !!b.closest('[data-pane="town"], #paneTown, .pane') }; });
  need(btn.here && !btn.locked && /Citizen/.test(btn.text) && /food/.test(btn.text) && /gold/.test(btn.text), `the Citizen button is in the Town list, open, showing its cost and wait (${btn.text.replace(/\s+/g, ' ').trim()})`);
  const terms = await p.evaluate(() => { const out = {}; for (const m of [80, 60, 40, 25, 10]) { mood = m; out[m] = citizenTerms(); } mood = 60; return out; });
  console.log('terms', JSON.stringify(Object.fromEntries(Object.entries(terms).map(([m, t]) => [m, [t.food, t.gold, t.secs]]))));
  need(terms[10].secs >= 180 && terms[10].secs <= 300, `below 20 happiness a citizen takes 3 to 5 minutes (${terms[10].secs} s)`);
  need(terms[80].secs < terms[60].secs && terms[60].secs < terms[40].secs && terms[40].secs < terms[25].secs && terms[25].secs < terms[10].secs, 'the unhappier the people, the longer the wait');
  need(terms[80].food < terms[60].food && terms[60].food < terms[40].food && terms[40].food < terms[25].food && terms[25].food < terms[10].food && terms[10].gold > terms[60].gold, 'the unhappier the people, the higher the cost');
  // calling one: paid, waits, then walks in along the road
  const call = await p.evaluate(() => { mood = 60; SD.res.food = 500; SD.res.gold = 500; const t = citizenTerms(), n0 = units.filter(u => u.team === 'player' && u.type === 'civ' && !u.dead).length, f0 = SD.res.food, g0 = SD.res.gold;
    document.querySelector('.tb[data-k="civ"]').click(); const q = trainQueue.find(q => q.called);
    return { t, queued: !!q, dur: q && q.dur, paidFood: Math.round(f0 - SD.res.food), paidGold: Math.round(g0 - SD.res.gold), n0 }; });
  need(call.queued && call.dur === call.t.secs && call.paidFood === call.t.food && call.paidGold === call.t.gold, `tapping it calls one: paid ${call.paidFood} food and ${call.paidGold} gold, wait ${call.dur} s`);
  const arrived = await p.evaluate(n0 => { T.run(30); const mid = units.filter(u => u.team === 'player' && u.type === 'civ' && !u.dead).length; T.run(35); const after = units.filter(u => u.team === 'player' && u.type === 'civ' && !u.dead);
    const e = roadEntry(), newest = after.reduce((a, u) => u.id > a.id ? u : a, after[0]); return { mid, after: after.length, n0, fromRoad: Math.round(Math.hypot(newest.spawnX !== undefined ? newest.spawnX - e.x : 0, 0)), waiting: trainQueue.filter(q => q.called).length }; }, call.n0);
  need(arrived.after >= arrived.n0 + 1 && arrived.waiting === 0, `he arrives when his wait is over (${arrived.n0} citizens, then ${arrived.after})`);
  // wars won and generals: sooner and cheaper; houses raise children sooner too
  const boost = await p.evaluate(() => { mood = 60; const base = citizenTerms(); CALL4F.winWar('A test war.'); CALL4F.winWar('Another.'); const won = citizenTerms(), gb = CALL4F.growBoost();
    warWins = []; const k = playerKeep(); const gens = []; for (let i = 0; i < 3; i++) { const s = makeUnit('player', 'spear', k.x + 40 * i, k.y + 150); s.vet = 10; gens.push(s); }
    const withGen = citizenTerms(); const card = (() => { try { showCard(gens[0]); return document.getElementById('personPop').textContent; } catch (e) { return ''; } })(); UI.closePops();
    for (const s of gens) { s.dead = true; s.hp = 0; } return { base: [base.secs, base.food], won: [won.secs, won.food, won.wins], gb: +gb.toFixed(2), gen: [withGen.secs, withGen.food, withGen.generals], card: /a general/.test(card) }; });
  console.log('boost', JSON.stringify(boost));
  need(boost.won[2] === 2 && boost.won[0] < boost.base[0] && boost.won[1] < boost.base[1], `two wars won: sooner and cheaper (${boost.base[0]} s / ${boost.base[1]} food -> ${boost.won[0]} s / ${boost.won[1]} food)`);
  need(boost.gb > 1.2, `wars won make the houses raise their children sooner (x${boost.gb})`);
  need(boost.gen[2] === 3 && boost.gen[0] < boost.base[0], `three generals: sooner (${boost.base[0]} s -> ${boost.gen[0]} s)`);
  need(boost.card, 'a soldier with 10 stars is called a general in his box');
  // a raid beaten off counts as a war won
  const raid = await p.evaluate(() => { warWins = []; const R = REALM.rivals.find(r => !r.friend), k = playerKeep(), l = [];
    for (let i = 0; i < 5; i++) { const u = makeUnit('enemy', 'spear', k.x + 400 + i * 20, k.y + 300); u.owner = R.id; u.raider = true; u.order = 'idle'; l.push(u); }
    noteRaid(R, l); T.run(2); const during = warWins.length; for (const u of l.slice(0, 4)) { u.hp = 0; kill(u); } l[4].raider = false; T.run(2); return { during, after: warWins.length, text: document.getElementById('banner').textContent }; });
  need(raid.during === 0 && raid.after === 1 && /Victory/.test(raid.text), `beating off a raid counts as a war won (${raid.text.slice(0, 70)})`);
  // full houses and the queue limit
  const limits = await p.evaluate(() => { trainQueue.length = 0; SD.res.food = 5000; SD.res.gold = 5000; let n = 0; for (let i = 0; i < 8; i++) if (requestCitizen()) n++;
    const q = trainQueue.filter(q => q.called).length; trainQueue.length = 0;
    const was = CIV.popCap; CIV.popCap = -1000; const full = requestCitizen(); CIV.popCap = was; return { n, q, full }; });   /* (houses full: no room at all) */
  need(limits.n === 5 && limits.q === 5, `at most five are called at once (${limits.n})`);
  need(limits.full === false, 'with the houses full, none can be called');
  await done();
})();
