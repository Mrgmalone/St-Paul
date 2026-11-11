const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(require('./env').LAUNCH); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await require('./env').use3d(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(900);
  await p.screenshot({ path: 'x_banner.png' });
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); const cs = getComputedStyle(e); return !e.hidden && cs.display !== 'none' && cs.opacity !== '0' && !e.classList.contains('hide'); }, sel);
  console.log('banner shown', await vis('#banner')); await p.click('#banner .xbtn'); await p.waitForTimeout(1200); console.log('banner after X', await p.evaluate(()=>getComputedStyle(document.getElementById('banner')).opacity));
  // a woodcutter panel
  await p.evaluate(()=>{ SD.setRaid(9999); const k = SD.keep(); SD.res.wood = 500; const w = SD.createBuilding('woodhut', k.c + 7, k.r + 1); w.hp = w.maxHp; finishBuilding(w); SD.showSite(w); });
  await p.waitForTimeout(1500); await p.screenshot({ path: 'x_panel.png' });
  console.log('panel X count', await p.evaluate(()=>document.querySelectorAll('#storePop > .xbtn').length)); await p.click('#storePop .xbtn'); console.log('panel after X visible', await vis('#storePop'));
  for (const [open, id] of [['#btnMenu', '#menuPop'], ['#cMood, [data-pop=mood], #vMood', '#moodPop']]) { try { await p.click(open, { timeout: 2000 }); } catch (e) { console.log('no opener', open); continue; } await p.waitForTimeout(200); console.log(id, 'open', await vis(id)); await p.click(id + ' > .xbtn'); console.log(id, 'after X', await vis(id)); }
  await p.keyboard.press('h'); await p.waitForTimeout(200); console.log('help open', await vis('#help')); await p.click('#help .box > .xbtn'); console.log('help after X', await vis('#help'));
  await p.evaluate(()=>{ document.getElementById('goodsPop').hidden = false; document.getElementById('goodsPop').innerHTML = '<h3>GOODS</h3>x'; }); await p.waitForTimeout(100); await p.click('#goodsPop > .xbtn'); console.log('goods after X', await vis('#goodsPop'));
  // clicking the map after the banner faded must not hit an invisible X
  console.log('banner X clickable when faded', await p.evaluate(()=>getComputedStyle(document.querySelector('#banner .xbtn')).pointerEvents));
  console.log('errors', errs); await b.close(); })();
