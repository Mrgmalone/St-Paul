const { chromium } = require('playwright'); const SP = require('./env').SP;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(600);
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0; SD.res.wood = 300; SD.res.gold = 100; });
  // everyone busy gathering, then a bowyer is built: someone must be called over
  await p.evaluate(()=>{ const civs = SD.units.filter(u => u.type === 'civ' && u.team === 'player'); const tree = SD.trees[0]; civs.forEach(u => SD.commandGather([u], tree)); civs.forEach(u => u.manualT = -99);
    const k = SD.keep(); const ar = SD.createBuilding('armory', k.c + 8, k.r - 3); ar.done = true; ar.progress = 1; window.__b = SD.createBuilding('bowyer', k.c + 5, k.r - 3); window.__b.done = true; window.__b.progress = 1; window.__b.hp = window.__b.maxHp; });
  await p.waitForTimeout(2500);
  console.log('bowyer staff (all were gathering):', await p.evaluate(()=>SD.units.filter(u => u.job === window.__b).length));
  // send a second civilian to it with the real command
  const r2 = await p.evaluate(()=>{ const c = SD.units.find(u => u.type === 'civ' && u.team === 'player' && !u.job); SD.selectOnly([c]); const q = screenOf(window.__b.x, window.__b.y - 30, 0); issueAt(q.x, q.y); return SD.units.filter(u => u.job === window.__b).length; });
  console.log('after sending a second:', r2);
  const w0 = await p.evaluate(()=>SD.res.bow + SD.res.wood / 1000);
  await p.waitForTimeout(60000);
  console.log('bows in store after 60s (started 2) with 2 workers:', await p.evaluate(()=>SD.res.bow), '| skill cost now', await p.evaluate(()=>{ const st = window.__b; return Math.round(100 * Math.max(0.5, 1 - 0.05 * Math.floor((st.made || 0) / 4))) + '% (made ' + st.made + ')'; }));
  // wood speed: one woodcutter hut, wood per minute
  const wood = await p.evaluate(()=>{ const k = SD.keep(); const h = SD.createBuilding('woodhut', k.c - 6, k.r + 6); h.done = true; h.progress = 1; h.hp = h.maxHp; window.__h = h; return SD.res.wood; });
  console.log('weather:', await p.evaluate(()=>({ kind: SD.WEATHER.kind, holdsMin: (SD.WEATHER.t / 60).toFixed(1), season: SD.WEATHER.season, seasonLeftMin: (SD.WEATHER.seasonT / 60).toFixed(1) })), await p.textContent('#vWeather'));
  await p.evaluate(()=>{ SD.WEATHER.seasonT = 0.1; }); await p.waitForTimeout(400); console.log('season turned:', await p.textContent('#vWeather'), '|', await p.textContent('#banner'));
  // stockpile shows stock
  await p.evaluate(()=>{ const k = SD.keep(); const sp = SD.createBuilding('stockpile', k.c + 5, k.r + 5); sp.done = true; sp.progress = 1; sp.hp = sp.maxHp; SD.cam.z = 2.4; centerOn(sp.x, sp.y - 10); document.getElementById('banner').style.opacity = 0; SD.res.wood = 15; SD.res.stone = 0; });
  await p.waitForTimeout(400); await p.screenshot({ path: SP + '/Stock_low.png', clip: { x: 300, y: 250, width: 360, height: 260 } });
  await p.evaluate(()=>{ SD.res.wood = 400; SD.res.stone = 120; SD.res.wheat = 30; }); await p.waitForTimeout(400); await p.screenshot({ path: SP + '/Stock_high.png', clip: { x: 300, y: 250, width: 360, height: 260 } });
  console.log('errors', errs.slice(0, 5)); await b.close(); })();
