// The five castle stages: at stage 1 only stage-1 items are on the buttons (and locked ones are refused); when a stage's
// requirements are met the castle grows by itself: the keep changes, the ring wall moves out in the new material, trees on the
// new ground are cleared, a building in the way of the new wall is moved inside (not lost), and the next stage's items appear.
const { chromium } = require('playwright'); const env = require('./env'); const SP = env.SP;
(async () => {
  const b = await chromium.launch(env.LAUNCH); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 999999 });
  const errs = [], fails = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  const need = (ok, what) => { if (!ok) fails.push(what); };
  await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
  await p.goto(env.GAME_REAL); await p.waitForTimeout(600);
  await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
  await p.click('.fac[data-fac="cyyoung"]'); await p.click('.fac[data-fac="cyyoung"] .fgo');
  await p.evaluate(() => { window.__step(3); document.getElementById('banner').style.display = 'none'; SD.setRaid(99999); });
  const shown = () => p.evaluate(() => ({ b: [...document.querySelectorAll('.bb[data-b]')].filter(x => !x.classList.contains('locked')).map(x => x.dataset.b), u: [...document.querySelectorAll('[data-k]')].filter(x => !x.classList.contains('locked')).map(x => x.dataset.k) }));
  // ---- stage 1 ----
  let s1 = await shown(); console.log('stage 1 shows', JSON.stringify(s1));
  need(s1.u.includes('spear') && s1.u.includes('archer') && !s1.u.includes('sword') && !s1.u.includes('maceman') && !s1.u.includes('knight') && !s1.u.includes('catapult'), 'stage 1 units are spearmen and archers only');
  need(s1.b.includes('house') && s1.b.includes('wall') && !s1.b.includes('quarry') && !s1.b.includes('smithy') && !s1.b.includes('market'), 'stage 1 buildings');
  const refused = await p.evaluate(() => { SD.res.gold = 100; SD.res.sword = 3; const q0 = trainQueue.length; SD.trainUnit ? SD.trainUnit('sword') : trainUnit('sword'); return trainQueue.length === q0; });
  need(refused, 'a locked unit is refused');
  // ---- grow through every stage ----
  for (let n = 2; n <= 5; n++) {
    const r = await p.evaluate(n => {
      const k = SD.keep(), st = STAGES[n - 1], q = st.need, out = { n };
      // a building right where the new wall will run, and a tree on the new ground
      const R = ringOf(n), wallLine = ringTiles(k, R);
      const [wc, wr] = wallLine[Math.floor(wallLine.length * 0.3)];
      let victim = null; if (canPlace('stockpile', wc, wr - 1)) { victim = createBuilding('stockpile', wc, wr - 1); finishBuilding(victim); } else if (canPlace('stockpile', wc, wr)) { victim = createBuilding('stockpile', wc, wr); finishBuilding(victim); }
      out.victim = !!victim;
      const treesIn0 = SD.trees.filter(t => t.x >= (k.c - R) * TILE && t.x < (k.c + 3 + R) * TILE && t.y >= (k.r - R) * TILE && t.y < (k.r + 3 + R) * TILE).length;
      // meet every requirement (4D: the game's own list, which Medium and Hard raise)
      const rows = needRows(n, playerHave()), nd = key => (rows.find(r => r.key === key) || { need: 0 }).need;
      for (const [kind] of Object.entries(q.buildings || {})) { const cnt = nd('b:' + kind), kk = kind === 'farmAny' ? 'farm' : kind; for (let i = countBuilt(kind, 'player'); i < cnt; i++) {
        let placed = false; for (let rad = 4; rad < 30 && !placed; rad++) for (let a = 0; a < 24 && !placed; a++) { const c = k.c + 1 + Math.round(Math.cos(a / 24 * 6.283) * (R + rad)), rr = k.r + 1 + Math.round(Math.sin(a / 24 * 6.283) * (R + rad)); if (canPlace(kk, c, rr)) { const bb = createBuilding(kk, c, rr); finishBuilding(bb); placed = true; } }
        /* (no room in the ring round the castle on this map, as a player would find: build further out, nearest first) */
        if (!placed) { let best = null, bd = 1e9; for (let c = 1; c < COLS - 1; c++) for (let rr = 1; rr < ROWS - 1; rr++) { const d = (c - k.c) ** 2 + (rr - k.r) ** 2; if (d < bd && d > (R + 4) ** 2 && canPlace(kk, c, rr)) { bd = d; best = [c, rr]; } } if (best) { finishBuilding(createBuilding(kk, best[0], best[1])); placed = true; } } } }
      while (myPeople() < nd('people')) { const f = nearestFree(k.c + 2, k.r + 6); makeUnit('player', 'civ', f.c * TILE + 16, f.r * TILE + 16); }
      SD.res.stone = nd('stone') + 5; SD.res.iron = nd('iron') + 5; addFood('crops', Math.max(0, nd('food') + 50 - SD.res.food));
      mood = 90; window.__step(30);
      out.stage = stageN; if (stageN < n) out.short = needRows(n, playerHave()).filter(r => !r.ok).map(r => r.what + ' ' + r.have + '/' + r.need); out.wallMat = [...new Set(SD.structures.filter(w => w.castleRing && !w.dead && w.team === 'player').map(w => w.mat))].join(','); out.ring = SD.structures.filter(w => w.castleRing && !w.dead && w.team === 'player').length;   // your ring only (the rivals have their own)
      out.victimSafe = !victim || (!victim.dead && SD.structures.includes(victim) && !wallLine.some(([c, rr]) => c >= victim.c && c < victim.c + victim.w && rr >= victim.r && rr < victim.r + victim.h));
      out.treesIn = SD.trees.filter(t => t.x >= (k.c - R) * TILE && t.x < (k.c + 3 + R) * TILE && t.y >= (k.r - R) * TILE && t.y < (k.r + 3 + R) * TILE).length; out.treesIn0 = treesIn0;
      out.keepHp = k.maxHp; out.stoneLeft = SD.res.stone;
      return out; }, n);
    const s = await shown();
    console.log('stage', n, JSON.stringify(r), 'new units', s.u.filter(x => !s1.u.includes(x)).join(','), 'new buildings', s.b.filter(x => !s1.b.includes(x)).join(','));
    need(r.stage === n, `grew into stage ${n}`); need(r.wallMat === ({ 2: 'brick', 3: 'stone', 4: 'thick', 5: 'thick' })[n], `stage ${n} wall material`);
    need(r.victimSafe, `stage ${n}: a building in the way of the new wall moved inside, not lost`); need(r.treesIn === 0, `stage ${n}: trees on the new ground cleared`);
    need(r.stoneLeft === 5, `stage ${n}: stone spent`);
    for (const u of STAGE_UNITS[n]) need(s.u.includes(u), `stage ${n} shows ${u}`);
    for (const bb of STAGE_BLD[n]) need(s.b.includes(bb), `stage ${n} shows ${bb}`);
    await p.evaluate(() => { const k = SD.keep(); SD.cam.z = 0.9; SD.centerOn(k.x, k.y - 40); window.__drawMs = 0; window.__step(3); window.__drawMs = 999999; });
    await p.screenshot({ path: SP + `/stage${n}.png` });
  }
  const pop = await p.evaluate(() => { showStagePop(); const t = document.getElementById('stagePop').textContent; return t.slice(0, 80); }); console.log('stage box:', pop);
  console.log('fails', JSON.stringify(fails)); console.log('errors', errs.slice(0, 5)); await b.close();
  if (fails.length) process.exit(1);
})();
const STAGE_UNITS = { 2: [], 3: ['sword', 'maceman', 'ballista', 'knight'], 4: ['ram', 'catapult'], 5: [] };   // foot knights at the Hold; trebuchets also need the school's top level
const STAGE_BLD = { 2: ['quarry', 'tavern', 'brewery', 'highwall'], 3: ['smithy', 'market', 'mill', 'bakery', 'ironmine'], 4: ['roundtower', 'greattower'], 5: [] };
