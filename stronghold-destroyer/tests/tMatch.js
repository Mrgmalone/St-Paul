// Phase 4C step C7: the match setup (how many rivals, their factions, a trading friend only with two or more, where you
// start) and truly random starts: in a dozen fresh games every start is new for you and for every rival, nobody starts
// in the trees or shut in, the rivals' camps lie hidden in the fog, and the winning rule follows the number of rivals.
const { chromium } = require('playwright'); const env = require('./env'); const { start } = require('./lib4b');
(async () => {
  const fails = [], errs = [], need = (ok, what) => { if (!ok) fails.push(what); };
  // ---- the front page ----
  {
    const b = await chromium.launch(env.LAUNCH), p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 999999 });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(env.GAME_REAL); await p.waitForTimeout(800);
    const f0 = await p.evaluate(() => { try { localStorage.removeItem('sd-match'); } catch (e) {} return { box: !!document.getElementById('match'), rivals: MATCH.rivals, on: (document.querySelector('#match [data-n].on') || {}).textContent, region: (document.querySelector('#match [data-r].on') || {}).textContent }; });
    await p.click('#match [data-n="1"]');
    const f1 = await p.evaluate(() => ({ friendHidden: document.getElementById('mFriend').hidden, selects: document.querySelectorAll('#mFacs select').length, win: document.getElementById('mWin').textContent }));
    await p.click('#match [data-n="4"]');
    const f4 = await p.evaluate(() => ({ friendShown: !document.getElementById('mFriend').hidden, selects: document.querySelectorAll('#mFacs select').length, win: document.getElementById('mWin').textContent }));
    await p.screenshot({ path: env.SP + '/tMatch-front.png' });
    console.log('front', JSON.stringify({ f0, f1, f4 }));
    need(f0.box && f0.rivals === 3 && f0.on === '3' && f0.region === 'Random', 'the front page offers the match setup: 3 rivals and a random start unless you change them');
    need(f1.friendHidden && f1.selects === 1 && /your rival\./.test(f1.win), 'with one rival there is no trading friend, and the goal is to defeat him');
    need(f4.friendShown && f4.selects === 4 && /all 3 of your rivals/.test(f4.win), 'with four rivals and a friend, the goal is the other three');
    await b.close();
  }
  // ---- what you choose is what you get; the winning rule follows the count ----
  for (const [n, friend, facs] of [[1, true, ['psychana']], [2, true, ['hekaranok', 'random']], [3, false, ['random', 'random', 'random']]]) {
    const { p, need: nd, done, fails: f2 } = await start('cyyoung', { query: 'rivals=' + n + '&x=' + Math.random() });
    const r = await p.evaluate(([n, friend, facs]) => {
      // (the game is already started by lib4b with the stored setup; start a fresh realm with this setup to check it)
      MATCH.rivals = n; MATCH.friend = friend; MATCH.facs = facs.concat(['random', 'random', 'random']).slice(0, 4);
      for (const R of REALM.rivals) { if (R.keep) R.keep.dead = true; for (const u of units) if (u.owner === R.id) u.dead = true; }
      realmStart();
      const out = { n: REALM.rivals.length, friends: REALM.rivals.filter(R => R.friend).length, facs: REALM.rivals.map(R => R.fac), hidden: REALM.rivals.every(R => !R.keep || fogHides(R.keep, 'player')) };
      won = false; updateHud(); out.early = won;
      for (const R of REALM.rivals) if (!R.friend) R.defeated = true;
      updateHud(); out.won = won; out.title = document.getElementById('endTitle').textContent;
      return out; }, [n, friend, facs]);
    console.log('setup', n, friend, JSON.stringify(r));
    need(r.n === n, `${n} rival(s) asked for, ${n} in the game`);
    need(r.friends === (friend && n >= 2 ? 1 : 0), `a trading friend only when asked and with two or more rivals (${n})`);
    if (facs[0] !== 'random') need(r.facs[0] === facs[0], 'a rival plays the faction you chose for him');
    if (n === 3) need(new Set(r.facs).size === 3, 'random rivals get different factions');
    need(r.hidden, 'the rivals\' camps lie hidden in the fog at the start');
    need(!r.early && r.won && r.title === 'VICTORY', `the winning rule follows the number of rivals (${n})`);
    f2.forEach(x => fails.push(x)); await done().catch(() => {});
  }
  // ---- a dozen fresh games: every start new, nobody in the trees or shut in ----
  const seen = [], bG = await chromium.launch(env.LAUNCH), ctxG = await bG.newContext({ viewport: { width: 1180, height: 820 } });   /* one player, twelve games in a row */
  for (let g = 0; g < 12; g++) {
    const p = await ctxG.newPage(); await env.use3d(p, { drawMs: 999999 });
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
    await p.goto(env.GAME_REAL + '?rivals=4'); await p.waitForTimeout(500);
    await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
    await p.click('.fac[data-fac="ticanologue"]'); await p.click('.fac[data-fac="ticanologue"] .fgo');
    const r = await p.evaluate(() => {
      window.__step(3); const k = SD.keep(), out = { me: [k.c, k.r], region: START_REGION, random: START_RANDOM, rivals: REALM.rivals.map(R => R.keep ? [R.keep.c, R.keep.r] : null) };
      out.inTrees = units.filter(u => !u.dead && !u.onWall && !u.inside && (blockedAt(u.x, u.y) || trees.some(t => !t.gone && Math.hypot(t.x - u.x, t.y - u.y) < 12))).map(u => [u.type, u.team, Math.round(u.x), Math.round(u.y)]);
      // reach: from your keep's door to every rival's door, and out to the nearest road
      const door = s => { const f = nearestFree(Math.floor(s.x / TILE), Math.floor((s.y1 + 40) / TILE)); return { x: f.c * TILE + 16, y: f.r * TILE + 16 }; };
      const a = door(k), reach = s => { const d = door(s), pth = findPath(a.x, a.y, d.x, d.y); return pth.length > 0 && Math.hypot(pth[pth.length - 1].x - d.x, pth[pth.length - 1].y - d.y) < 50; };
      out.shut = REALM.rivals.filter(R => R.keep && !reach(R.keep)).map(R => R.id);
      out.lost = REALM.rivals.filter(R => !R.keep).length;
      out.minGap = Math.round(Math.min(...REALM.rivals.filter(R => R.keep).map(R => Math.hypot(R.keep.x - k.x, R.keep.y - k.y))));
      return out; });
    seen.push(r); console.log('game', g + 1, JSON.stringify(r));
    await p.close();
  }
  await bG.close();
  const keyMe = new Set(seen.map(s => s.me.join(','))), keyAll = new Set(seen.map(s => JSON.stringify(s.rivals)));
  need(seen.every(s => s.random), 'every game draws a fresh random start');
  need(seen.every((s, i) => !seen.slice(Math.max(0, i - 5), i).some(o => o.me.join() === s.me.join())) && keyMe.size >= seen.length - 1, 'your starting place is new every game (never one of your last five; at most one repeat in twelve)');
  need(keyAll.size === seen.length, "the rivals' places differ in every game too");
  need(seen.every(s => s.inTrees.length === 0), 'nobody starts inside the trees');
  need(seen.every(s => s.shut.length === 0 && s.lost === 0), 'nobody is shut in: every rival camp can be reached from yours');
  need(seen.every(s => s.minGap > 900), 'every rival starts well away from you');
  need(new Set(seen.map(s => s.region)).size >= 3, 'starts land in different parts of the map');
  // ---- choosing where you start ----
  {
    const b = await chromium.launch(env.LAUNCH), p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 999999 });
    await p.goto(env.GAME_REAL); await p.waitForTimeout(600);
    const before = await p.evaluate(() => START_REGION), want = before === 'east' ? 'west' : 'east';
    await Promise.all([p.waitForNavigation({ timeout: 60000 }).catch(() => null), p.click(`#match [data-r="${want}"]`)]); await p.waitForTimeout(800);
    const after = await p.evaluate(() => ({ region: START_REGION, on: (document.querySelector('#match [data-r].on') || {}).dataset.r }));
    console.log('choose start', before, '->', JSON.stringify(after));
    need(after.region === want && after.on === want, 'choosing a part of the map starts you there');
    await p.evaluate(() => { try { localStorage.removeItem('sd-match'); } catch (e) {} });
    await b.close();
  }
  console.log('fails', JSON.stringify(fails)); console.log('errors', errs.slice(0, 5));
  process.exit(fails.length || errs.length ? 1 : 0);
})();
