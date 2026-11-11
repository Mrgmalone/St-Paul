const { chromium } = require('playwright'); const fs = require('fs'); const SP = require('./env').SP, USE3D = process.argv[3] === '3d';
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  if (USE3D) await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' })); else await require('./env').use3d(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(800);
  await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ SD.setRaid(9999); SD.WEATHER.on = false; });
  console.log('lord:', await p.evaluate(()=>{ const L = SD.LORD.unit; return { name: L.name, hp: L.hp, dmg: L.dmg, team: L.team, x: Math.round(L.x), y: Math.round(L.y) }; }));
  await p.waitForTimeout(23500); console.log('taunt:', await p.textContent('#banner'));
  await p.evaluate(()=>{ const L = SD.LORD.unit; SD.cam.z = 2.2; centerOn(L.x, L.y - 20); document.getElementById('banner').style.opacity = 0; }); await p.waitForTimeout(USE3D ? 3500 : 700);
  await p.screenshot({ path: SP + `/L_${USE3D?'3d':'2d'}.png` });
  // he leads raid 6
  await p.evaluate(()=>{ for (let i = 0; i < 6; i++) SD.spawnRaid(); document.getElementById('banner').style.opacity = 1; }); await p.waitForTimeout(800);
  console.log('after raid 6:', await p.evaluate(()=>{ const L = SD.LORD.unit; return { raider: L.raider, order: L.order, route: L.route ? L.route.length : 0 }; }), '|', await p.textContent('#banner'));
  // he falls
  const before = await p.evaluate(()=>Math.round(SD.raid()));
  await p.evaluate(()=>{ const L = SD.LORD.unit; L.hp = 1; L.flash = 1; kill(L); }); await p.waitForTimeout(1200);
  console.log('fallen:', await p.evaluate(()=>({ broken: SD.LORD.broken })), 'raid timer', before, '->', await p.evaluate(()=>Math.round(SD.raid())), '|', await p.textContent('#banner'));
  console.log('errors', errs.slice(0, 6)); await b.close(); })();
