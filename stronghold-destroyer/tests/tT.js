const { chromium, devices } = require('playwright'); const fs = require('fs'); const SP = require('./env').SP, USE3D = process.argv[3] === '3d';
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ ...devices['iPad Pro 11 landscape'] }); const p = await ctx.newPage();
  if (USE3D) await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' })); else await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i })) });
  await p.goto(require('./env').GAME); await p.waitForTimeout(800);
  await p.tap('.civ[data-civ="harvest"]'); await p.waitForTimeout(1000);
  await p.evaluate(()=>{ SD.setRaid(9999); SD.WEATHER.on = false; document.getElementById('banner').style.opacity = 0; document.getElementById('side').classList.add('collapsed'); });
  await p.waitForTimeout(500);
  const top = await p.evaluate(()=>document.getElementById('game').getBoundingClientRect().top);
  const scr = (x, y, h = 20) => p.evaluate(([x, y, h]) => screenOf(x, y, h), [x, y, h]);
  // 1. tap a soldier: selects him
  const sold = await p.evaluate(()=>{ const u = SD.units.find(u => u.team === 'player' && u.type === 'sword'); return { id: u.id, x: u.x, y: u.y }; });
  let q = await scr(sold.x, sold.y, 18); await touch('touchStart', [[q.x, q.y + top]]); await touch('touchEnd', []); await p.waitForTimeout(200);
  console.log('tap soldier -> selected:', await p.evaluate(()=>[...SD.selection()].map(u => u.type).join(',')));
  // 2. tap the ground: he walks there
  const k = await p.evaluate(()=>{ const k = SD.keep(); return { x: k.x, y: k.y }; });
  q = await scr(k.x + 200, k.y + 120, 0); await touch('touchStart', [[q.x, q.y + top]]); await touch('touchEnd', []); await p.waitForTimeout(300);
  console.log('tap ground -> order:', await p.evaluate((id)=>SD.units.find(u => u.id === id).order, sold.id));
  // 3. a civilian taps a tree: gathers on arrival
  const civ = await p.evaluate(()=>{ const u = SD.units.find(u => u.team === 'player' && u.type === 'civ'); return { id: u.id, x: u.x, y: u.y }; });
  q = await scr(civ.x, civ.y, 18); await touch('touchStart', [[q.x, q.y + top]]); await touch('touchEnd', []); await p.waitForTimeout(450);
  const tree = await p.evaluate((c)=>{ let best = null, bd = 1e9; for (const t of SD.trees) { const d = Math.hypot(t.x - c.x, t.y - c.y); if (d < bd && d > 80) { bd = d; best = t; } } return { x: best.x, y: best.y }; }, civ);
  q = await scr(tree.x, tree.y, 20); await touch('touchStart', [[q.x, q.y + top]]); await touch('touchEnd', []); await p.waitForTimeout(300);
  console.log('civ tapped tree -> order:', await p.evaluate((id)=>{ const u = SD.units.find(u => u.id === id); return u.order + (u.task ? '/' + u.task.type : ''); }, civ.id));
  // 4. one-finger drag scrolls, and a flick glides
  const c0 = await p.evaluate(()=>({ x: SD.cam.x, y: SD.cam.y }));
  await touch('touchStart', [[600, 500]]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [[600 - i * 30, 500 - i * 10]]); await p.waitForTimeout(16); } await touch('touchEnd', []);
  const c1 = await p.evaluate(()=>({ x: SD.cam.x, y: SD.cam.y })); await p.waitForTimeout(600); const c2 = await p.evaluate(()=>({ x: SD.cam.x, y: SD.cam.y }));
  console.log('drag moved view by', Math.round(c1.x - c0.x), Math.round(c1.y - c0.y), '| glide after release', Math.round(c2.x - c1.x), Math.round(c2.y - c1.y));
  // 5. pinch zoom and twist
  const z0 = await p.evaluate(()=>SD.cam.z);
  await touch('touchStart', [[500, 400], [700, 400]]); for (let i = 1; i <= 8; i++) { const r = 100 + i * 12, a = i * 0.05; await touch('touchMove', [[600 - Math.cos(a) * r, 400 - Math.sin(a) * r], [600 + Math.cos(a) * r, 400 + Math.sin(a) * r]]); await p.waitForTimeout(16); } await touch('touchEnd', []);
  console.log('pinch zoom', z0.toFixed(2), '->', (await p.evaluate(()=>SD.cam.z)).toFixed(2));
  // 6. press-and-hold then drag: selection box
  await p.evaluate(()=>{ const k = SD.keep(); centerOn(k.x + 90, k.y - 10); SD.selection().clear(); }); await p.waitForTimeout(300);
  const box = await p.evaluate(()=>{ const s = SD.units.filter(u => u.team === 'player' && !u.dead).map(u => screenOf(u.x, u.y, 20)); return [Math.min(...s.map(q => q.x)) - 20, Math.min(...s.map(q => q.y)) - 20, Math.max(...s.map(q => q.x)) + 20, Math.max(...s.map(q => q.y)) + 20]; });
  await touch('touchStart', [[box[0], box[1] + top]]); await p.waitForTimeout(600); for (let i = 1; i <= 6; i++) { await touch('touchMove', [[box[0] + (box[2] - box[0]) * i / 6, box[1] + top + (box[3] - box[1]) * i / 6]]); await p.waitForTimeout(20); } await touch('touchEnd', []);
  console.log('hold-and-drag box selected', await p.evaluate(()=>SD.selection().size), 'people');
  await p.screenshot({ path: SP + `/T_${USE3D?'3d':'2d'}.png` });
  console.log('errors', errs.slice(0, 6)); await b.close(); })();
