// Speed benchmark: a big battle with N people, timed frame by frame in the flat view.
// usage, from the stronghold-destroyer folder:   node tests/bench.js 100 200 400 800
// Reports, per size: average and slowest-5% frame time, split into game logic and drawing. 16.7 ms is 60 frames a second.
// LOGIC=1 node tests/bench.js ... times the game logic alone (no drawing).
// Note: this runs on a desktop processor in a headless browser; an iPad is slower, so treat the numbers as relative.
const { chromium } = require('playwright'); const { GAME } = require('./env');
const sizes = process.argv.slice(2).map(Number).filter(Boolean); if (!sizes.length) sizes.push(100, 200, 400, 800);
(async () => {
  const b = await chromium.launch(); const rows = [];
  for (const N of sizes) {
    const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p.route('**/three.min.js', r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
    await p.goto(GAME);
    await p.evaluate(() => { window.__raf.splice(0).forEach(f => f(0)); window.__now = 0; });
    await p.click('.civ[data-civ="legion"]');
    if (process.env.LOGIC) await p.evaluate(() => { window.__logicOnly = true; });
    const r = await p.evaluate((N) => {
      SD.setRaid(99999); SD.WEATHER.on = false; document.getElementById('banner').style.opacity = 0;
      Object.assign(SD.res, { wood: 99999, stone: 99999, gold: 99999, food: 99999 }); SD.res.food = 99999;
      const k = SD.keep(), mine = Math.floor(N / 2), foes = N - mine, kinds = ['civ', 'civ', 'sword', 'spear', 'archer'];
      const free = (x, y) => { const f = nearestFree(Math.floor(x / TILE), Math.floor(y / TILE)); return f ? [f.c * TILE + 16, f.r * TILE + 16] : [x, y]; };
      for (let i = 0; i < mine; i++) { const [x, y] = free(k.x - 300 + (i % 20) * 30, k.y + 120 + Math.floor(i / 20) * 30); makeUnit('player', kinds[i % 5], x, y); }
      for (let i = 0; i < foes; i++) { const [x, y] = free(k.x + 700 + (i % 20) * 30, k.y - 200 + Math.floor(i / 20) * 30); const e = makeUnit('enemy', ['sword', 'spear', 'archer'][i % 3], x, y); e.order = 'attack'; e.target = k; e.raider = true; e.repath = 0; }
      SD.cam.z = 1.0; SD.cam.x = k.x - 200; SD.cam.y = k.y - 200;
      const orig = window.render; let rt = 0; window.render = window.__logicOnly ? function () {} : function () { const t = performance.now(); orig(); rt += performance.now() - t; };
      const times = [], rts = []; let last = 0;
      for (let i = 0; i < 900; i++) { window.__now += 33; const t0 = performance.now(); rt = 0; window.__raf.splice(0).forEach(f => f(window.__now)); times.push(performance.now() - t0); rts.push(rt); }
      window.render = orig;
      const sl = times.slice(60), rs = rts.slice(60), avg = a => a.reduce((s, x) => s + x, 0) / a.length;
      const sorted = sl.slice().sort((a, c) => a - c);
      return { N, alive: units.filter(u => !u.dead).length, frame: +avg(sl).toFixed(2), p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2), draw: +avg(rs).toFixed(2), logic: +(avg(sl) - avg(rs)).toFixed(2) };
    }, N);
    r.errors = errs.length; rows.push(r); console.log(JSON.stringify(r)); await p.close();
  }
  console.log('\nN people | frame ms (avg) | slowest 5% | game logic | drawing');
  for (const r of rows) console.log(`${String(r.N).padStart(5)}    | ${String(r.frame).padStart(8)}      | ${String(r.p95).padStart(8)}   | ${String(r.logic).padStart(8)}   | ${String(r.draw).padStart(7)}`);
  await b.close();
})();
