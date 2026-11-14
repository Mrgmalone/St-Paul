// Phase 4D step D1: how long a normal game takes to reach each castle stage, at a difficulty.
// usage, from the stronghold-destroyer folder:   DIFF=easy node tests/pace.js [faction] [game-minutes]
// The test player pays its own way (no free resources): it builds what the next stage still needs (read from the game's own
// requirement list), plus what a sensible player builds anyway (a woodcutter's hut, farms, a house when the houses are full,
// a granary, an alehouse or chapel when spirits are low, a quarry or iron mine when stone or iron is short), lowers taxes when
// happiness is short, trains a few spearmen and sends them at raiders. Raids, bandits and rivals run as in a real game.
// Prints the game-minute each stage was reached.
const { chromium } = require('playwright'); const env = require('./env');
const FAC = process.argv[2] || 'cyyoung', MIN = +(process.argv[3] || 75), DIFF = process.env.DIFF || 'easy';
(async () => {
  const b = await chromium.launch(env.LAUNCH), p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 999999 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
  await p.goto(env.GAME_REAL + (process.env.RIVALS ? '?rivals=' + process.env.RIVALS : '')); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
  await p.evaluate(k => SD.setDiff(k), DIFF);
  await p.click(`.fac[data-fac="${FAC}"]`); await p.click(`.fac[data-fac="${FAC}"] .fgo`);
  await p.evaluate(() => {
    window.__step(3); document.getElementById('banner').style.display = 'none';
    window.__stages = [{ stage: 1, min: 0 }]; window.__placed = [];
    const mine = () => structures.concat(farms).filter(b => !b.dead && b.team === 'player');
    const cnt = kd => mine().filter(b => kd === 'farmAny' ? (b.kind === 'farm' || b.kind === 'wheatfarm') : b.kind === kd).length;   // standing or being built
    const building = () => mine().some(b => b.done === false);
    function spot(kind) {
      const k = playerKeep(), ok = (c, r) => canPlace(kind, c, r);
      if (kind === 'quarry' || kind === 'ironmine') {
        const rk = rocks.filter(x => !x.gone && (kind === 'ironmine' ? x.iron : !x.iron)).sort((a, c) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(c.x - k.x, c.y - k.y));
        for (const x of rk.slice(0, 12)) for (let dc = -4; dc <= 3; dc++) for (let dr = -4; dr <= 3; dr++) { const c = Math.floor(x.x / TILE) + dc, r = Math.floor(x.y / TILE) + dr; if (ok(c, r)) return [c, r]; }
        return null;
      }
      if (kind === 'woodhut') {   // a sensible player puts the woodcutters beside a stand of trees (the game warns when a hut has none near it)
        const near = trees.filter(t => !t.gone && Math.hypot(t.x - k.x, t.y - k.y) < 1100).map(t => ({ t, n: trees.filter(o => Math.abs(o.x - t.x) < 150 && Math.abs(o.y - t.y) < 150).length, d: Math.hypot(t.x - k.x, t.y - k.y) }))
          .filter(o => o.n >= 8).sort((a, c) => a.d - c.d).slice(0, 6);
        for (const o of near) for (let rad = 2; rad < 8; rad++) for (let a = 0; a < 16; a++) { const c = Math.floor(o.t.x / TILE) + Math.round(Math.cos(a / 16 * 6.283) * rad), r = Math.floor(o.t.y / TILE) + Math.round(Math.sin(a / 16 * 6.283) * rad); if (ok(c, r)) return [c, r]; }
      }
      const a0 = Math.random() * 6.283;
      for (let rad = 5; rad < 34; rad++) for (let a = 0; a < 24 + rad; a++) { const t = a0 + a / (24 + rad) * 6.283, c = k.c + 1 + Math.round(Math.cos(t) * rad), r = k.r + 1 + Math.round(Math.sin(t) * rad); if (ok(c, r)) return [c, r]; }
      return null;
    }
    function place(kind) {
      const d = BUILD[kind]; if (!d || !unlocked(kind, false) || !afford(d)) return false;
      const at = spot(kind); if (!at) return false;
      pay(d); const bl = createBuilding(kind, at[0], at[1]); window.__placed.push([Math.round(time / 6) / 10, kind]); return !!bl;
    }
    window.__defend = () => { const k = playerKeep(); if (!k) return;
      const foes = units.filter(e => !e.dead && hostile('player', e.team) && e.team !== 'friend' && Math.hypot(e.x - k.x, e.y - k.y) < 650);
      for (const u of units) if (!u.dead && u.team === 'player' && u.type !== 'civ' && u.type !== 'king' && !isMachine(u) && u.order === 'idle' && foes.length) { const f = foes.reduce((a, e) => Math.hypot(e.x - u.x, e.y - u.y) < Math.hypot(a.x - u.x, a.y - u.y) ? e : a); commandAttack([u], f); } };
    window.__paceBot = () => {
      const k = playerKeep(); if (!k || won) return;
      if (stageN > window.__stages[window.__stages.length - 1].stage) window.__stages.push({ stage: stageN, min: +(time / 60).toFixed(1), last: window.__short || [] });   /* (last: what was still short just before) */
      const rows = stageN < STAGES.length ? needRows(stageN + 1, playerHave()) : [], miss = key => rows.find(r => r.key === key && !r.ok);
      { const sh = rows.filter(r => !r.ok).map(r => r.key.replace('b:', '')); if (sh.length) window.__short = sh; }
      // spirits: lower taxes when happiness is short (and raise them again when it is comfortable)
      const moodNeed = (rows.find(r => r.key === 'mood') || { need: 50 }).need;
      if (mood < moodNeed - 3 && tax > 0 && res.gold > 60) setTax(tax - 1); else if ((mood > moodNeed + 12 || res.gold < 30) && tax < 1) setTax(tax + 1);
      const people = myPeople(), room = Math.floor(popCap() * GROW.room), want = [];
      // a sensible player: only as many people as the next stage wants (and a few spare), and food to feed them
      const pNeed = (rows.find(r => r.key === 'people') || { need: people }).need, target = pNeed + 4;
      const gCap = foodCap(), fNeed = (rows.find(r => r.key === 'food') || { need: 0 }).need;
      if (cnt('woodhut') < 1) want.push('woodhut');
      if (cnt('farmAny') < Math.max(1, Math.ceil(people / 6))) want.push('farm');
      if ((res.food > gCap * 0.75 || fNeed > gCap * 0.8) && !mine().some(b => b.kind === 'granary' && b.done === false)) want.push('granary');
      if (people + growing.length >= room - 1 && people < target) want.push('house');
      for (const r of rows) if (r.kind && !r.ok && cnt(r.kind) < r.need) want.push(r.kind === 'farmAny' ? 'farm' : r.kind);
      if (mood < moodNeed + 6) { if (cnt('alehouse') < 1) want.push('alehouse'); if (stageN >= 2 && cnt('chapel') < 1) want.push('chapel'); }
      if (miss('food') && cnt('farmAny') < Math.max(2 + stageN, Math.ceil(people / 4))) want.push('farm');
      if (miss('stone') && cnt('quarry') < 1) want.push('quarry');
      if (miss('iron') && cnt('ironmine') < 1) want.push('ironmine');
      if (miss('people') && people < target && people + growing.length >= room - 3) want.push('house');
      if (cnt('house') >= 2 && cnt('poleturner') < 1) want.push('poleturner');
      if (cnt('house') >= 2 && cnt('armory') < 1) want.push('armory');
      if (stageN >= 2 && cnt('woodhut') < 2) want.push('woodhut');
      if (cnt('house') >= 2 && cnt('bowyer') < 1) want.push('bowyer');
      if (stageN >= 2 && cnt('lookout') < 1) want.push('lookout');
      if (DIFF.key !== 'easy' && cnt('house') >= 2 && cnt('gtower') < (DIFF.key === 'hard' ? 2 : 1)) want.push('gtower');
      // spirits first when they are short: an alehouse and a chapel come before anything else
      if (cnt('alehouse') > 0 && cnt('wheatfarm') < 1 + (cnt('mill') > 0 ? 1 : 0)) want.unshift('wheatfarm');   /* (the mill grinds the same wheat the alehouse brews from) */
      if (mood < moodNeed + 10) { const sp = []; if (cnt('alehouse') < 1) sp.push('alehouse'); if (stageN >= 2 && cnt('chapel') < 1) sp.push('chapel'); if (stageN >= 2 && cnt('tavern') < 1) sp.push('tavern'); want.unshift(...sp); }
      if (res.wood < 40 && cnt('woodhut') < 1 + stageN) want.unshift('woodhut');
      if (mine().some(b => b.kind === 'woodhut' && b.done !== false && !nearestNode('wood', b.x, b.y, yardReach())) && cnt('woodhut') < 2 + stageN) want.unshift('woodhut');   /* (a hut with no trees near it: build one by the forest) */
      for (const kd of want) { if (cnt(kd) > 0 && mine().some(b => b.kind === kd && b.done === false)) continue; if (place(kd)) break; }
      // put more hands where a resource runs short (a workplace fills its first workers by itself; the rest are added in its box)
      const addTo = kd => { for (const b of structures.concat(farms)) if (!b.dead && b.team === 'player' && b.done && b.kind === kd && staffOf(b) < maxStaff(b.kind)) { siteAction(b, 'add'); return true; } return false; };
      if (res.wood < 120) addTo('woodhut');
      if (miss('stone') || res.stone < 40) addTo('quarry');
      if (miss('iron')) addTo('ironmine');
      if (miss('food') || res.food < 60) addTo('farm');
      // a sensible player with gold to spare buys wood at the market when the woodcutters cannot keep up (the workshops eat wood)
      const mk = structures.find(b => !b.dead && b.team === 'player' && b.kind === 'market' && b.done);
      if (mk) for (let i = 0; i < 3 && res.wood < 80 && res.gold > 150; i++) trade(mk, 'buy', 'wood');
      // short of stored food: move hands from a workplace whose goods are piling up (put it to sleep, as the game advises) onto
      // the farms, and buy food when there is gold to spare; wake it again when its goods are wanted
      const pile = { ironmine: 'iron', quarry: 'stone' };
      for (const [kd, g] of Object.entries(pile)) for (const b of structures) if (!b.dead && b.team === 'player' && b.kind === kd && b.done) {
        const want = rows.find(r => r.key === g), plenty = res[g] > Math.max(300, want ? want.need * 2 : 0);
        if (miss('food') && plenty && !b.asleep) siteAction(b, 'sleep'); else if (b.asleep && (!plenty || !miss('food'))) siteAction(b, 'sleep'); }
      if (miss('food')) for (let i = 0; i < 4; i++) if (!addTo('farm')) break;
      if (mk && miss('food')) for (let i = 0; i < 3 && res.gold > 250 && res.food < foodCap() - 20; i++) trade(mk, 'buy', 'food');
      document.getElementById('storePop').hidden = true; storeShown = null;   /* (the box siteAction opens) */
      // a few spearmen for defence
      const soldiers = units.filter(u => !u.dead && u.team === 'player' && u.type !== 'civ' && u.type !== 'king' && !isMachine(u)).length;
      const army = Math.round((3 + 2 * stageN) * ({ easy: 1, medium: 1.25, hard: 1.6 }[DIFF.key] || 1));   // a sensible player keeps a bigger guard when the rivals are fiercer
      if (soldiers + trainQueue.length < army && res.gold > 30 + 6 * soldiers) { if (res.spear >= 1 && res.gold >= 15) { try { trainUnit('spear'); } catch (e) {} } else if (res.bow >= 1 && res.gold >= 15) { try { trainUnit('archer'); } catch (e) {} } }
      window.__defend();
      // (bug hunt) an ox cart that has carried its load for over two minutes without arriving: say exactly where it is
      for (const c of units.filter(u => u.type === 'oxcart' && !u.dead && u.team === 'player')) {
        if (c.sub !== 'haul') { c._haulT = time; continue; } if (time - (c._haulT || time) < 120 || c._told) continue; c._told = true;
        const drop = nearestDrop(c, 'stone'), ap = drop && approachPoint(c, drop), path = ap ? findPath(c.x, c.y, ap.x, ap.y) : [];
        const tc = (x, y) => [Math.floor(x / TILE), Math.floor(y / TILE)], blk = (x, y) => { const [cc, rr] = tc(x, y); return tileBlocked(cc, rr) ? 'blocked' : 'open'; };
        console.log('STUCKCART', JSON.stringify({ t: Math.round(time), cart: [Math.round(c.x), Math.round(c.y)], cartTile: blk(c.x, c.y), drop: drop && drop.kind, dropAt: drop && [drop.x0, drop.y0, drop.x1, drop.y1], ap: ap && [Math.round(ap.x), Math.round(ap.y)], apTile: ap && blk(ap.x, ap.y),
          edge: drop && Math.round(edgeDist(c, drop)), apEdge: ap && drop && Math.round(edgeDist({ x: ap.x, y: ap.y, radius: c.radius }, drop)), pathLen: path.length, noPath: c.noPathT > time, cpath: c.path.length, moving: c.moving, stage: stageN,
          ring: structures.filter(s => !s.dead && s.castleRing).length, gates: structures.filter(s => !s.dead && s.kind === 'gate' && s.team === 'player').length }));
      }
    };
  });
  const t0 = Date.now(); let last = '';
  for (let s = 0; s < MIN * 12; s++) {   // every 5 game-seconds
    const r = await p.evaluate(NR => { if (NR) { SD.setRaid(1e9); REALM.rogueT = 1e9; for (const R of REALM.rivals) R.raidT = 1e9; } window.__step(100); window.__paceBot(); return { st: stageN, won, min: +(time / 60).toFixed(1) }; }, !!process.env.NORAIDS);
    if (r.st >= 5 || r.won) break;
    if (s % 60 === 0) { const line = await p.evaluate(() => JSON.stringify({ min: +(time / 60).toFixed(1), stage: stageN, people: myPeople(), mood: Math.round(mood), food: Math.floor(res.food), wood: Math.floor(res.wood), stone: Math.floor(res.stone), iron: Math.floor(res.iron), gold: Math.floor(res.gold), tax, cap: foodCap(), farms: farms.filter(f => !f.dead && f.team === 'player' && f.done).map(f => f.kind[0] + staffOf(f)).join(''), gran: mineDone('granary').length, quarry: mineAll('quarry').map(q => (q.done === false ? 'building' : 'q') + staffOf(q) + '/' + (q.stock || 0) + (q.asleep ? 'zz' : '')).join(' ') + ' carts ' + units.filter(u => u.type === 'oxcart' && !u.dead).map(u => u.sub || '-').join(','), civ: units.filter(u => !u.dead && u.team === 'player' && u.type === 'civ').length, jobless: idleCount(), sold: units.filter(u => !u.dead && u.team === 'player' && u.type !== 'civ').length, why: (SD.moodReasons ? SD.moodReasons() : []).slice(0, 8) })); if (line !== last) console.log('   ', line); last = line; }
  }
  const out = await p.evaluate(() => ({ stages: window.__stages, end: { min: +(time / 60).toFixed(1), stage: stageN, people: myPeople(), mood: Math.round(mood), keep: playerKeep() ? Math.round(playerKeep().hp) + '/' + playerKeep().maxHp : 'fallen', won, rivals: REALM.rivals.map(R => (R.friend ? 'F' : '') + R.stage + (R.defeated ? 'x' : '')) }, placed: window.__placed.length,
    needNext: stageN < STAGES.length ? needRows(stageN + 1, playerHave()).filter(r => !r.ok).map(r => `${r.what} ${r.have}/${r.need}`) : [] }));
  console.log('PACE', DIFF + (process.env.NORAIDS ? ' (raids held off)' : ''), FAC, JSON.stringify(out.stages.map(s => `stage ${s.stage}: ${s.min} min${s.last && s.last.length ? ' (last: ' + s.last.join('+') + ')' : ''}`)), JSON.stringify(out.end), 'still short:', JSON.stringify(out.needNext));
  console.log('real time', Math.round((Date.now() - t0) / 1000), 's; errors', JSON.stringify(errs.slice(0, 5)));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
