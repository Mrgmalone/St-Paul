const { chromium } = require('playwright'); const SP = require('./env').SP;
(async () => { const b = await chromium.launch(require('./env').LAUNCH); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await require('./env').use3d(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(600);
  await p.screenshot({ path: SP + '/En_pick.png' });
  await p.click('.dbtn[data-d="medium"]'); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(800);
  const st = () => p.evaluate(()=>{ const c = SD.enemyCamp(); const k = SD.keep(); return { dist: Math.round(Math.hypot(c.x - k.x, c.y - k.y)), res: SD.ENEMY.res, built: SD.ENEMY.built, plan: SD.ENEMY.plan.length, sites: SD.structures.filter(b=>b.team==='enemy'&&b.kind!=='wall'&&b.kind!=='tower').map(b=>b.kind+(b.done?'':'('+Math.round(b.progress*100)+'%)')).join(','), workers: SD.units.filter(u=>u.team==='enemy'&&u.type==='civ'&&!u.dead).map(u=>u.sub||'-').join(','), raid: Math.round(SD.raid()) }; });
  console.log('start', JSON.stringify(await st()));
  await p.waitForTimeout(30000); console.log('30s', JSON.stringify(await st()));
  await p.evaluate(()=>{ SD.ENEMY.res += 400; }); await p.waitForTimeout(30000); console.log('60s', JSON.stringify(await st()));
  // raids from each route
  for (let i = 0; i < 4; i++) { await p.evaluate(()=>SD.spawnRaid()); console.log('raid', i + 1, await p.textContent('#banner')); }
  await p.waitForTimeout(20000);
  console.log('raiders:', await p.evaluate(()=>SD.units.filter(u=>u.raider&&!u.dead).map(u=>Math.round(u.x)+','+Math.round(u.y)+':'+(u.route?u.route.length:0)).join(' ')));
  await p.evaluate(()=>{ const c = SD.enemyCamp(); SD.cam.z = 1.0; centerOn(c.x - 60, c.y + 60); document.getElementById('banner').style.opacity = 0; }); await p.waitForTimeout(600);
  await p.screenshot({ path: SP + '/En_camp.png' });
  await p.evaluate(()=>{ SD.cam.z = 0.3; centerOn(1536, 896); }); await p.waitForTimeout(400); await p.screenshot({ path: SP + '/En_map.png' });
  console.log('errors', errs.slice(0, 6)); await b.close(); })();
