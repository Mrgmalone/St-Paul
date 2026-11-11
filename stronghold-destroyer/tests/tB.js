const { chromium } = require('playwright');
const fs = require('fs');
const SP = require('./env').SP, USE3D = process.argv[3] === '3d';
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  if (USE3D) await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(800);
  await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(500);
  const st = () => p.evaluate(()=>({ wood: Math.floor(SD.res.wood), food: Math.floor(SD.res.food),
    civs: SD.units.filter(u=>u.type==='civ'&&!u.dead).map(u=>(u.job ? u.job.kind[0].toUpperCase() : '-') + ':' + u.order + (u.sub ? '/' + u.sub : '')).join(' '),
    idle: document.getElementById('vIdle').textContent }));
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0; });
  await p.waitForTimeout(USE3D ? 8000 : 3000);
  console.log('start (people go to the campfire):', JSON.stringify(await st()));
  // a woodcutter's hut near the west forest, a farm, a stockpile — all finished
  await p.evaluate(()=>{ const mk=(k,c,r)=>{ const b=SD.createBuilding(k,c,r); b.progress=1; b.done=true; b.hp=b.maxHp; if (k==='farm') b.amount = 10; return b; };
    mk('woodhut', 3, 24); mk('farm', 9, 26); mk('stockpile', 6, 25); });
  for (let i = 0; i < (USE3D ? 6 : 1); i++) await p.waitForTimeout(2500);
  console.log('after buildings:', JSON.stringify(await st()));
  const w0 = await p.evaluate(()=>SD.res.wood);
  await p.waitForTimeout(USE3D ? 60000 : 30000);
  console.log('after working:', JSON.stringify(await st()), 'wood gained', Math.floor(await p.evaluate(()=>SD.res.wood) - w0));
  await p.evaluate((u3)=>{ SD.cam.z = u3 ? 1.7 : 1.4; SD.cam.x = 40; SD.cam.y = 680; }, USE3D);
  await p.waitForTimeout(1200); await p.screenshot({ path: SP + `/B_${USE3D ? '3d' : '2d'}.png` });
  // a direct order takes the woodcutter off the job
  await p.evaluate(()=>{ const w = SD.units.find(u=>u.job && u.job.kind==='woodhut'); SD.selectOnly([w]); });
  const top = await p.evaluate(()=>document.getElementById('game').getBoundingClientRect().top);
  await p.mouse.click(700, 400 + top, { button: 'right' }); await p.waitForTimeout(400);
  console.log('after a direct order:', JSON.stringify(await st()));
  console.log('errors', errs.slice(0, 5)); await b.close(); })();
