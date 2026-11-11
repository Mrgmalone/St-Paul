const { chromium } = require('playwright'); const fs = require('fs'); const SP = require('./env').SP, USE3D = process.argv[3] === '3d';
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  if (USE3D) await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' })); else await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(800);
  await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0; SD.res.wood = 900; SD.res.stone = 200; SD.res.gold = 400; });
  // real buttons: train one of each
  await p.keyboard.press('3'); await p.waitForTimeout(200);
  await p.click('.tb[data-k="catapult"]'); await p.click('.tb[data-k="ballista"]');
  console.log('queued', await p.evaluate(()=>SD.trainQueue.map(q=>q.kind).join(',')), '| left wood/stone/gold', await p.evaluate(()=>[SD.res.wood, SD.res.stone, SD.res.gold].map(Math.floor).join('/')));
  await p.evaluate(()=>{ SD.trainQueue.forEach(q => q.t = q.dur - 0.05); }); await p.waitForTimeout(800);
  // a target range: an enemy wall and enemy soldiers in the field
  const r = await p.evaluate(()=>{ const k = SD.keep(); const m = SD.units.filter(u => u.team === 'player' && (u.type === 'catapult' || u.type === 'ballista'));
    const cx = k.x + 120, cy = k.y + 60; m.forEach((u, i) => { u.x = cx + i * 50; u.y = cy; u.path = []; u.order = 'idle'; });
    for (let i = 0; i < 3; i++) { const w = SD.createBuilding('highwall', Math.floor((cx + 330) / 32) + i, Math.floor((cy - 40) / 32)); w.team = 'enemy'; w.done = true; w.progress = 1; w.hp = w.maxHp; }
    for (let i = 0; i < 3; i++) { const e = makeUnit('enemy', 'sword', cx + 290 + i * 14, cy + 100); e.order = 'hold'; e.post = { x: e.x, y: e.y }; }
    window.__m = m; return { pop: document.getElementById('vPeople').textContent, kinds: m.map(u => u.type).join(',') }; });
  console.log('machines', JSON.stringify(r));
  await p.evaluate(()=>{ SD.cam.z = 1.3; centerOn(window.__m[0].x + 160, window.__m[0].y); }); await p.waitForTimeout(400);
  const w0 = await p.evaluate(()=>SD.structures.filter(s=>s.kind==='highwall'&&s.team==='enemy').map(s=>s.hp).join(','));
  await p.waitForTimeout(USE3D ? 7000 : 2600); await p.screenshot({ path: SP + `/Sg_${USE3D?'3d':'2d'}.png` });
  await p.waitForTimeout(USE3D ? 20000 : 12000);
  console.log('targets:', await p.evaluate(()=>window.__m.map(u => u.type + '->' + (u.target ? (u.target.kind === 'unit' ? u.target.type : u.target.kind) : 'none')).join(' ')));
  console.log('enemy wall hp', w0, '->', await p.evaluate(()=>SD.structures.filter(s=>s.kind==='highwall'&&s.team==='enemy').map(s=>s.dead?'down':s.hp).join(',')));
  console.log('enemy swords', await p.evaluate(()=>SD.units.filter(u=>u.team==='enemy'&&u.type==='sword'&&u.x>0).slice(-3).map(u=>u.dead?'dead':u.hp).join(',')));
  await p.evaluate(()=>{ for (let i = 0; i < 6; i++) SD.spawnRaid(); }); await p.waitForTimeout(300);
  console.log('enemy siege in raids:', await p.evaluate(()=>SD.units.filter(u=>u.team==='enemy'&&(u.type==='catapult'||u.type==='ballista')).map(u=>u.type+':'+u.order).join(',')));
  console.log('errors', errs.slice(0, 6)); await b.close(); })();
