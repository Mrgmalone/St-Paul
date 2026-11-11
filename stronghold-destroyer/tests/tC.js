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
  const info = await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0;
    const iron = SD.trees ? rocks.filter(r=>r.iron).map(r=>[Math.round(r.x), Math.round(r.y)]) : [];
    return iron; });
  console.log('iron rocks:', JSON.stringify(info));
  // can an iron mine be placed away from iron? beside iron?
  const place = await p.evaluate(()=>{ const r = rocks.find(q=>q.iron); const c = Math.floor(r.x / 32) + 1, rr = Math.floor((r.y - 6) / 32) - 2;
    let near = null; for (let dc = -3; dc <= 2 && !near; dc++) for (let dr = -3; dr <= 2 && !near; dr++) if (SD.canPlace('ironmine', c + dc, rr + dr)) near = [c + dc, rr + dr];
    return { farFromIron: SD.canPlace('ironmine', 12, 24), besideIron: near }; });
  console.log('iron mine placement:', JSON.stringify(place));
  // a full set of industry, finished, with materials, and extra civilians to staff it
  await p.evaluate((near)=>{ const mk=(k,c,r)=>{ const b=SD.createBuilding(k,c,r); b.progress=1; b.done=true; b.hp=b.maxHp; if (k.endsWith('farm')) b.amount = 30; return b; };
    mk('hopfarm', 8, 22); mk('brewery', 11, 22); mk('tavern', 14, 22); mk('stockpile', 6, 25); mk('armory', 14, 26); mk('bowyer', 11, 26); mk('smithy', 8, 26);
    if (near) mk('ironmine', near[0], near[1]);
    const k = SD.keep(); for (let i = 0; i < 6; i++) makeUnit('player', 'civ', k.x1 + 30 + i * 12, k.y1 + 30);
    SD.res.wood = 400; SD.res.gold = 100; SD.res.hops = 10; SD.res.iron = 6; }, place.besideIron);
  const st = () => p.evaluate(()=>({ jobs: SD.units.filter(u=>u.type==='civ'&&!u.dead&&u.job).map(u=>u.job.kind).sort().join(','),
    goods: ['hops','ale','iron','bow','spear','sword'].map(k=>k+'='+Math.floor(SD.res[k])).join(' '), mood: SD.mood().toFixed(1), moodRate: document.getElementById('vMoodR').textContent }));
  await p.waitForTimeout(USE3D ? 10000 : 3000);
  console.log('staffed:', JSON.stringify(await st()));
  await p.waitForTimeout(USE3D ? 60000 : 45000);
  console.log('after work:', JSON.stringify(await st()));
  // training with a weapon from the armory (real buttons)
  await p.evaluate(()=>{ SD.res.sword = Math.max(SD.res.sword, 1); SD.res.food = 0; SD.res.wood = 0; SD.res.gold = 20; });
  await p.click('.tab[data-tab="army"]'); await p.waitForTimeout(300);
  console.log('swordsman button now says:', await p.textContent('.tb[data-k="sword"] small'), '| armory line:', await p.textContent('#armoryInfo'));
  await p.click('.tb[data-k="sword"]'); await p.waitForTimeout(200);
  console.log('queued:', await p.textContent('#queue'), '| left: swords', await p.evaluate(()=>SD.res.sword), 'gold', await p.evaluate(()=>SD.res.gold), 'food', await p.evaluate(()=>SD.res.food));
  await p.click('.tab[data-tab="industry"]'); await p.waitForTimeout(200);
  await p.evaluate((u3)=>{ SD.cam.z = u3 ? 1.5 : 1.3; SD.cam.x = 200; SD.cam.y = 640; }, USE3D); await p.waitForTimeout(1500);
  await p.screenshot({ path: SP + `/C_${USE3D ? '3d' : '2d'}.png` });
  await p.click('#cGoods'); await p.waitForTimeout(200); await p.screenshot({ path: SP + `/C_goods.png` });
  console.log('errors', errs.slice(0, 5)); await b.close(); })();
