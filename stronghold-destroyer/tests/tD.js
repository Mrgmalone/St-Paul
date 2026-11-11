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
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0; });
  // gold cost + limit checks via placement
  const gold = await p.evaluate(()=>{ SD.res.wood = 999; SD.res.gold = 5; const out = {};
    out.chapelNoGold = SD.canPlace ? 'n/a' : 0;
    return out; });
  await p.evaluate(()=>{ const mk=(k,c,r)=>{ const b=SD.createBuilding(k,c,r); b.progress=1; b.done=true; b.hp=b.maxHp; if (k.endsWith('farm')) b.amount = 30; return b; };
    mk('wheatfarm', 8, 22); mk('mill', 11, 22); mk('bakery', 14, 22); mk('stockpile', 6, 25); mk('granary', 9, 26);
    mk('chapel', 14, 26); mk('garden', 18, 22); mk('stocks', 18, 25);
    const k = SD.keep(); for (let i = 0; i < 6; i++) makeUnit('player', 'civ', k.x1 + 30 + i * 12, k.y1 + 30);
    SD.res.wood = 400; SD.res.gold = 100; SD.res.wheat = 6; });
  const st = () => p.evaluate(()=>({ jobs: SD.units.filter(u=>u.type==='civ'&&!u.dead&&u.job).map(u=>u.job.kind).sort().join(','),
    goods: ['wheat','flour','food'].map(k=>k+'='+Math.floor(SD.res[k])).join(' '), kinds: JSON.stringify(SD.foodKinds), variety: SD.foodVariety(),
    mood: SD.mood().toFixed(1), moodRate: document.getElementById('vMoodR').textContent }));
  await p.waitForTimeout(USE3D ? 10000 : 3000);
  console.log('staffed:', JSON.stringify(await st()));
  await p.waitForTimeout(USE3D ? 60000 : 45000);
  console.log('after work:', JSON.stringify(await st()));
  await p.evaluate(()=>SD.addFood('berries', 10)); await p.waitForTimeout(1200);
  console.log('with berries:', JSON.stringify(await st()));
  // mood report
  await p.click('#cMood').catch(()=>{}); await p.waitForTimeout(300);
  const rep = await p.evaluate(()=>{ const el = [...document.querySelectorAll('div')].find(d=>/Food variety/.test(d.textContent) && d.children.length < 40 && d.offsetParent); return el ? el.innerText : 'NO REPORT'; });
  console.log('report:\n' + rep);
  await p.screenshot({ path: SP + `/D_mood_${USE3D?'3d':'2d'}.png` });
  await p.keyboard.press('Escape').catch(()=>{});
  // limits: garden 3, gold
  await p.click('.tab[data-tab="rule"]'); await p.waitForTimeout(200);
  const lim = await p.evaluate(()=>{ const mk=(k,c,r)=>{ const b=SD.createBuilding(k,c,r); b.progress=1; b.done=true; return b; };
    mk('garden', 22, 22); mk('garden', 22, 25); SD.res.gold = 100; SD.res.wood = 100; updateHud && updateHud();
    const g = document.querySelector('.bb[data-b="garden"]'); const before = SD.res.gold;
    return { gardenBtn: g ? g.className + ' | ' + g.textContent.replace(/\s+/g,' ') : 'none' }; });
  console.log('limit:', JSON.stringify(lim));
  await p.evaluate(()=>{ SD.res.gold = 10; SD.res.wood = 500; }); await p.click('.tab[data-tab="town"]'); await p.waitForTimeout(300);
  console.log('chapel btn with 10 gold:', await p.evaluate(()=>{ const g=document.querySelector('.bb[data-b="chapel"]'); return g.className + ' | ' + g.textContent.replace(/\s+/g,' '); }));
  const sails = await p.evaluate(async ()=>{ return null; });
  await p.click('.tab[data-tab="industry"]'); await p.waitForTimeout(200);
  await p.evaluate((u3)=>{ SD.cam.z = u3 ? 1.5 : 1.3; SD.camWorld(300, 680); }, USE3D); await p.waitForTimeout(1500);
  await p.screenshot({ path: SP + `/D_${USE3D ? '3d' : '2d'}.png` });
  console.log('errors', errs.slice(0, 5)); await b.close(); })();
