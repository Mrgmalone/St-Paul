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
  await p.click('.civ[data-civ="legion"]', { timeout: 300000 }); await p.waitForTimeout(800);
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0;
    const mk=(k,c,r)=>{ const b=SD.createBuilding(k,c,r); b.done=true; b.progress=1; b.hp=b.maxHp; return b; };
    for (let c = 11; c <= 16; c++) mk('wall', c, 27); window.__w = SD.structures.find(s=>s.kind==='wall'&&s.c===13);
    const k = SD.keep(); makeUnit('player', 'archer', k.x1 + 40, k.y1 - 10); makeUnit('player', 'archer', k.x1 + 60, k.y1 - 10); });
  await p.waitForTimeout(500);
  const nArch = await p.evaluate(()=>SD.units.filter(u=>u.type==='archer'&&!u.dead).length);
  // real UI: select archers, right-click the wall segment
  await p.evaluate(()=>SD.selectOnly(SD.units.filter(u=>u.type==='archer')));
  const top = await p.evaluate(()=>document.getElementById('game').getBoundingClientRect().top);
  const wp = await p.evaluate(()=>{ const w=window.__w; const q = (SD.R3D.active ? SD.R3D.project(w.x, 20, (w.y0+w.y1)/2) : { x: (w.x - SD.cam.x)*SD.cam.z, y: (w.y - 20 - SD.cam.y)*SD.cam.z }); return q; });
  await p.mouse.click(wp.x, wp.y + top, { button: 'right' }); await p.waitForTimeout(300);
  console.log('archers', nArch, 'orders', await p.evaluate(()=>SD.units.filter(u=>u.type==='archer').map(u=>u.order).join(',')));
  for (let i = 0; i < 90; i++) { await p.waitForTimeout(500); if (await p.evaluate(()=>SD.units.filter(u=>u.type==='archer'&&u.onWall).length===2)) break; }
  console.log('on wall:', await p.evaluate(()=>SD.units.filter(u=>u.type==='archer').map(u=>u.onWall ? u.onWall.kind+'@'+u.onWall.c : 'ground').join(',')));
  // a raid: three swordsmen right next to the wall, our other soldiers sent away
  await p.evaluate(()=>{ SD.commandMove(SD.units.filter(u=>u.team==='player'&&u.type!=='civ'&&u.type!=='archer'), 300, 1250);
    SD.spawnRaid(); const w = window.__w; SD.units.filter(u=>u.raider&&!u.dead).forEach((u,i)=>{ u.x = w.x - 30 + i * 20; u.y = w.y1 + 30; });
    SD.cam.z = 1.8; SD.cam.x = w.x - 1280/2/1.8; SD.cam.y = w.y - 600/2/1.8; });
  const hp0 = await p.evaluate(()=>SD.units.filter(u=>u.type==='archer').map(u=>u.hp));
  await p.waitForTimeout(USE3D ? 25000 : 9000);
  await p.screenshot({ path: SP + `/w_archers_${USE3D?'3d':'2d'}.png` });
  console.log('archer hp start', hp0, 'after 9s', await p.evaluate(()=>SD.units.filter(u=>u.type==='archer').map(u=>Math.round(u.hp))),
    'raiders', await p.evaluate(()=>SD.units.filter(u=>u.raider).map(u=>(u.dead?'dead':Math.round(u.hp)+':'+(u.target? u.target.kind : '-'))).join(' ')));
  // wall destroyed under them
  await p.evaluate(()=>{ kill(window.__w); });
  await p.waitForTimeout(1500);
  console.log('after wall falls:', await p.evaluate(()=>SD.units.filter(u=>u.type==='archer').map(u=>(u.dead?'dead':(u.onWall?'wall':'ground')+':'+Math.round(u.hp))).join(',')), 'wall dead', await p.evaluate(()=>window.__w.dead));
  console.log('errors', errs.slice(0, 5)); await b.close(); })();
