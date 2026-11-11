const { chromium } = require('playwright'); const SP = require('./env').SP;
(async () => { const b = await chromium.launch(require('./env').LAUNCH); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await require('./env').use3d(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500);
  await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(600);
  console.log('peace:', await p.evaluate(()=>Math.round(SD.raid())), '|', (await p.textContent('#status')).match(/Peace [0-9:]+/)?.[0]);
  await p.click('#btnPause'); await p.waitForTimeout(300);
  const a = await p.evaluate(()=>({ x: SD.units[0].x, t: time, raid: SD.raid(), food: SD.res.food }));
  await p.waitForTimeout(2500);
  const b2 = await p.evaluate(()=>({ x: SD.units[0].x, t: time, raid: SD.raid(), food: SD.res.food }));
  console.log('paused world frozen:', a.t === b2.t && a.raid === b2.raid, '| note shown:', await p.evaluate(()=>!document.getElementById('pauseNote').hidden));
  // place a house while paused
  const placed = await p.evaluate(()=>{ const k = SD.keep(); const scr = (c, r) => [SD.scr((c + 1) * 32, (r + 1) * 32).x, SD.scr((c + 1) * 32, (r + 1) * 32).y]; SD.startPlacing('house'); const s = scr(k.c - 4, k.r + 4); SD.placeAt(s[0], s[1]); return SD.structures.filter(b => b.kind === 'house').length; });
  console.log('house placed while paused:', placed);
  await p.screenshot({ path: SP + '/Pause.png' });
  await p.keyboard.press('p'); await p.waitForTimeout(1500); console.log('resumed, time moving:', await p.evaluate((t)=>time > t, b2.t));
  // enemies close: cannot pause
  await p.evaluate(()=>{ const k = SD.keep(); makeUnit('enemy', 'sword', k.x + 200, k.y); }); await p.keyboard.press('p'); await p.waitForTimeout(300);
  console.log('with enemy near:', await p.evaluate(()=>document.getElementById('pauseNote').hidden ? 'not paused' : 'PAUSED'), '|', await p.textContent('#banner'));
  console.log('errors', errs); await b.close(); })();
