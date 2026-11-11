// Where does the time go? Profiles a big battle (N people) and lists the busiest functions by their own time.
// usage, from the stronghold-destroyer folder:   node tests/profile.js 800
const { chromium } = require('playwright'); const { GAME } = require('./env');
const N = +(process.argv[2] || 800), DRAW = process.argv[3] === 'draw';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p.route('**/three.min.js', r => r.abort());
  await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
  await p.goto(GAME); await p.evaluate(() => { window.__raf.splice(0).forEach(f => f(0)); window.__now = 0; });
  await p.click('.civ[data-civ="legion"]');
  await p.evaluate((N) => {
    SD.setRaid(99999); SD.WEATHER.on = false; Object.assign(SD.res, { wood: 99999, stone: 99999, gold: 99999 }); SD.res.food = 99999;
    const k = SD.keep(), mine = Math.floor(N / 2), kinds = ['civ', 'civ', 'sword', 'spear', 'archer'];
    const free = (x, y) => { const f = nearestFree(Math.floor(x / TILE), Math.floor(y / TILE)); return f ? [f.c * TILE + 16, f.r * TILE + 16] : [x, y]; };
    for (let i = 0; i < mine; i++) { const [x, y] = free(k.x - 300 + (i % 20) * 30, k.y + 120 + Math.floor(i / 20) * 30); makeUnit('player', kinds[i % 5], x, y); }
    for (let i = 0; i < N - mine; i++) { const [x, y] = free(k.x + 700 + (i % 20) * 30, k.y - 200 + Math.floor(i / 20) * 30); const e = makeUnit('enemy', ['sword', 'spear', 'archer'][i % 3], x, y); e.order = 'attack'; e.target = k; e.raider = true; e.repath = 0; }
    window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 33; window.__raf.splice(0).forEach(f => f(window.__now)); } };
    if (!window.__drawToo) window.render = () => {};   // logic only unless asked
    window.__step(60);
  }, N);
  if (DRAW) await p.evaluate(() => { window.__drawToo = true; });
  const cdp = await p.context().newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await p.evaluate(() => window.__step(300));
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), total = profile.samples.length, byId = new Map(profile.nodes.map(n => [n.id, n])), counts = new Map();
  for (const s of profile.samples) counts.set(s, (counts.get(s) || 0) + 1);
  for (const [id, c] of counts) { const n = byId.get(id), f = n.callFrame; const key = (f.functionName || '(anon)') + ' ' + (f.url.split('/').pop() || '') + ':' + (f.lineNumber + 1); self.set(key, (self.get(key) || 0) + c); }
  console.log(`N=${N}, samples ${total}`); for (const [k, v] of [...self].sort((a, c) => c[1] - a[1]).slice(0, 25)) console.log(String((v / total * 100).toFixed(1)).padStart(5) + '%  ' + k);
  await b.close();
})();
