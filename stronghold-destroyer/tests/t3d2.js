const { chromium } = require('playwright');
const fs = require('fs');
const SP = require('./env').SP;
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(800);
  await p.click('.civ[data-civ="wardens"]', { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0; });
  const top = await p.evaluate(()=>document.getElementById('game').getBoundingClientRect().top);
  const scr = (x, y, h=20) => p.evaluate(([x,y,h])=>SD.scr(x, y, h), [x,y,h]);
  // 1. drag a box around the soldiers (real mouse)
  const pos = await p.evaluate(()=>SD.units.filter(u=>u.team==='player'&&u.type!=='civ').map(u=>SD.scr(u.x, u.y, 20)));
  const xs = pos.map(q=>q.x), ys = pos.map(q=>q.y);
  await p.mouse.move(Math.min(...xs)-25, Math.min(...ys)-25+top); await p.mouse.down(); await p.mouse.move(Math.max(...xs)+25, Math.max(...ys)+25+top, {steps: 6}); await p.mouse.up();
  console.log('box-selected:', await p.evaluate(()=>[...SD.selection()].map(u=>u.type).join(',')));
  // 2. right-click the ground to move
  const tgt = await scr(700, 900, 0);
  await p.mouse.click(tgt.x, tgt.y + top, { button: 'right' }); await p.waitForTimeout(400);
  console.log('orders after right-click:', await p.evaluate(()=>[...SD.selection()].map(u=>u.order).join(',')), 'dest approx', await p.evaluate(()=>{ const u=[...SD.selection()][0]; return u.dest && [Math.round(u.dest.x), Math.round(u.dest.y)]; }));
  // 3. click one civilian directly, then right-click a berry bush
  const civ = await p.evaluate(()=>{ const c=SD.units.find(u=>u.type==='civ'); return SD.scr(c.x, c.y, 22); });
  await p.mouse.click(civ.x, civ.y + top); await p.waitForTimeout(200);
  console.log('clicked civilian -> selected:', await p.evaluate(()=>[...SD.selection()].map(u=>u.type).join(',')));
  const bush = await p.evaluate(()=>{ const k=SD.keep(); const b=SD.bushes.slice().sort((a,b)=>Math.hypot(a.x-k.x,a.y-k.y)-Math.hypot(b.x-k.x,b.y-k.y))[0]; return SD.scr(b.x, b.y, 8); });
  await p.mouse.click(bush.x, bush.y + top, { button: 'right' }); await p.waitForTimeout(300);
  console.log('civilian order after right-click bush:', await p.evaluate(()=>{ const u=[...SD.selection()][0]; return u.order + '/' + (u.task && u.task.type); }));
  // 4. place a house with the mouse in 3D
  await p.evaluate(()=>{ SD.res.wood = 400; }); await p.click('.bb[data-b="house"]');
  const hs = await scr(420, 880, 0); await p.mouse.move(hs.x, hs.y + top); await p.waitForTimeout(300);
  await p.screenshot({ path: SP + '/d_place.png' });
  await p.mouse.click(hs.x, hs.y + top); await p.waitForTimeout(300);
  console.log('house placed:', await p.evaluate(()=>SD.structures.filter(s=>s.kind==='house').map(s=>s.c+','+s.r).join(' ')));
  // 5. a fight in 3D
  await p.evaluate(()=>{ const me=SD.units.filter(u=>u.team==='player'&&u.type!=='civ'); SD.commandAttack(me, SD.units.find(u=>u.team==='enemy')); });
  await p.evaluate(()=>{ const g=SD.units.find(u=>u.team==='enemy'); SD.units.filter(u=>u.team==='player'&&u.type!=='civ').forEach((u,i)=>{u.x=g.x-60+i*8;u.y=g.y+30;}); SD.cam.z=2.0; SD.camWorld(g.x-1280/4, g.y-600/4); });
  await p.waitForTimeout(6000); await p.screenshot({ path: SP + '/d_fight.png' });
  // 6. one fixed view: V no longer switches anything
  const z0 = await p.evaluate(()=>SD.cam.z); await p.keyboard.press('v'); await p.waitForTimeout(300);
  console.log('one view: V changes nothing:', z0 === await p.evaluate(()=>SD.cam.z));
  console.log('errors', errs.slice(0, 6));
  await b.close(); })();
