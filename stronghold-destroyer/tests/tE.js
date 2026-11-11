const { chromium } = require('playwright'); const fs = require('fs'); const SP = require('./env').SP, USE3D = process.argv[3] === '3d';
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  if (USE3D) await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' })); else await require('./env').use3d(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(800);
  await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(600);
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 1; });
  const ban = () => p.evaluate(()=>document.getElementById('banner').textContent);
  console.log('start stone', await p.evaluate(()=>SD.res.stone), '| chip', await p.textContent('#vStone'));
  // quarry placement
  const q = await p.evaluate(()=>{ let spot = null; for (const r of rocks.filter(r=>!r.iron)) { const c = Math.floor(r.x/32), rr = Math.floor(r.y/32); for (let dc=-3; dc<=2 && !spot; dc++) for (let dr=-3; dr<=2 && !spot; dr++) if (SD.canPlace('quarry', c+dc, rr+dr)) spot=[c+dc, rr+dr]; if (spot) break; } return { spot, farOK: SD.canPlace('quarry', 12, 24) }; });
  console.log('quarry spot', JSON.stringify(q));
  await p.evaluate((q)=>{ const mk=(k,c,r)=>{ const b=SD.createBuilding(k,c,r); b.progress=1; b.done=true; b.hp=b.maxHp; return b; }; mk('quarry', q.spot[0], q.spot[1]);
    const k = SD.keep(); for (let i = 0; i < 2; i++) makeUnit('player', 'civ', k.x1 + 30 + i * 12, k.y1 + 30); }, q);
  await p.waitForTimeout(USE3D ? 30000 : 25000);
  console.log('stone after quarry work', await p.evaluate(()=>SD.res.stone), 'jobs', await p.evaluate(()=>SD.units.filter(u=>u.job&&u.job.kind==='quarry').length));
  // stairs rule, high wall line via real placement API
  const k = await p.evaluate(()=>{ const k = SD.keep(); return { c: k.c, r: k.r }; });
  const r = await p.evaluate((k)=>{ const out = {}; SD.res.stone = 500; SD.res.wood = 500; SD.res.gold = 200;
    const c0 = k.c + 5, r0 = k.r + 6; out.stairsAlone = SD.canPlace('stairs', c0, r0 - 1);
    for (let i = 0; i < 5; i++) { const b = SD.createBuilding('highwall', c0 + i, r0); b.done = true; b.progress = 1; b.hp = b.maxHp; }
    out.stairsBeside = SD.canPlace('stairs', c0, r0 - 1); out.wall = [c0, r0];
    return out; }, k);
  console.log('stairs rule:', JSON.stringify(r));
  // archers: mount without stairs
  await p.evaluate((r)=>{ window.__ar = []; for (let i = 0; i < 2; i++) window.__ar.push(makeUnit('player', 'archer', r.wall[0]*32 + 20 + i*10, (r.wall[1]-2)*32)); }, r);
  await p.evaluate((r)=>{ const w = SD.structures.find(s=>s.kind==='highwall' && s.c===r.wall[0]+2); commandMount(window.__ar, w); }, r);
  console.log('mount without stairs ->', await ban(), '| orders', await p.evaluate(()=>window.__ar.map(u=>u.order).join(',')));
  await p.evaluate((r)=>{ const s = SD.createBuilding('stairs', r.wall[0], r.wall[1]-1); s.done = true; s.progress = 1; s.hp = s.maxHp; const w = SD.structures.find(s=>s.kind==='highwall' && s.c===r.wall[0]+2); commandMount(window.__ar, w); }, r);
  await p.waitForTimeout(USE3D ? 14000 : 6000);
  console.log('after stairs:', await p.evaluate(()=>window.__ar.map(u=>u.order+' '+(u.onWall? u.onWall.kind+' e2='+elev2D(u)+' range='+Math.round(rangeOf(u)) : 'ground')).join(' | ')));
  // towers
  const t = await p.evaluate((k)=>{ const mk=(kd,c,r)=>{ const b=SD.createBuilding(kd,c,r); b.progress=1; b.done=true; b.hp=b.maxHp; return b; };
    const st = mk('stower', k.c - 4, k.r + 6), gt = mk('greattower', k.c + 12, k.r + 2);
    return { st: [st.maxHp, st.range, st.topH], gt: [gt.maxHp, gt.range, gt.shots] }; }, k);
  console.log('towers:', JSON.stringify(t));
  await p.evaluate((k)=>{ const gt = SD.structures.find(s=>s.kind==='greattower'); for (let i = 0; i < 3; i++) makeUnit('enemy', 'sword', gt.x + 120 + i*20, gt.y + 60); window.__arrowsBefore = SD.arrows.length; }, k);
  await p.waitForTimeout(2500);
  console.log('great tower arrows in flight from it:', await p.evaluate(()=>SD.arrows.filter(a=>a.from && a.from.kind==='greattower').length));
  await p.evaluate((k)=>{ SD.cam.z = USE3D_Z(); function USE3D_Z(){ return 1.1; } centerOn(k.c*32 + 160, k.r*32 + 160); for (const u of SD.units) if (u.team==='enemy') u.hp = -1; }, k);
  await p.click('.tab[data-tab="castle"]'); await p.waitForTimeout(1500);
  await p.screenshot({ path: SP + `/E_${USE3D?'3d':'2d'}.png` });
  console.log('errors', errs.slice(0, 6)); await b.close(); })();
