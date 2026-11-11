const { chromium } = require('playwright'); const fs = require('fs'); const SP = require('./env').SP, USE3D = process.argv[3] === '3d';
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  if (USE3D) await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' })); else await require('./env').use3d(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(800); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(600);
  await p.evaluate(()=>{ SD.setRaid(9999); SD.WEATHER.on = false; document.getElementById('banner').style.opacity = 0; document.getElementById('side').classList.add('collapsed'); });
  console.log('grey rocks:', await p.evaluate(()=>rocks.filter(r => !r.iron).length), '| near castle (<500):', await p.evaluate(()=>{ const k = SD.keep(); return rocks.filter(r => !r.iron && Math.hypot(r.x - k.x, r.y - k.y) < 500).length; }));
  // assign gatherers: wood, food, stone
  await p.evaluate(()=>{ const k = SD.keep(); const civs = SD.units.filter(u => u.type === 'civ' && u.team === 'player');
    const rock = rocks.filter(r => !r.iron && !r.gone).sort((a, b) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b.x - k.x, b.y - k.y))[0];
    const tree = SD.trees.sort((a, b) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b.x - k.x, b.y - k.y))[0], bush = SD.bushes[0];
    SD.commandGather([civs[0], civs[1]], rock); SD.commandGather([civs[2]], tree); SD.commandGather([civs[3]], bush); window.__c = civs; window.__rock = rock; });
  await p.waitForTimeout(500);
  console.log('gear on the way:', await p.evaluate(()=>window.__c.slice(0, 4).map(u => u.task.type + '->' + gearOf(u)).join(' ')));
  const s0 = await p.evaluate(()=>SD.res.stone);
  await p.waitForTimeout(USE3D ? 15000 : 40000);
  console.log('stone', s0, '->', await p.evaluate(()=>SD.res.stone), '| rock left', await p.evaluate(()=>window.__rock.amount), '| carrying:', await p.evaluate(()=>window.__c.slice(0, 4).map(u => (u.carryType || '-') + u.carry + '/' + u.sub).join(' ')));
  // quarry with an ox cart
  const q = await p.evaluate(()=>{ let spot = null; for (const r of rocks.filter(r => !r.iron && !r.gone)) { const c = Math.floor(r.x / 32), rr = Math.floor(r.y / 32); for (let dc = -3; dc <= 2 && !spot; dc++) for (let dr = -3; dr <= 2 && !spot; dr++) if (SD.canPlace('quarry', c + dc, rr + dr)) spot = [c + dc, rr + dr]; if (spot) break; }
    const qb = SD.createBuilding('quarry', spot[0], spot[1]); qb.done = true; qb.progress = 1; qb.hp = qb.maxHp; window.__q = qb; const k = SD.keep(); const sp = SD.createBuilding('stockpile', k.c + 4, k.r + 4); sp.done = true; sp.progress = 1; sp.hp = sp.maxHp; for (let i = 0; i < 2; i++) makeUnit('player', 'civ', k.x1 + 30, k.y1 + 20); return spot; });
  await p.waitForTimeout(2500);
  console.log('ox cart:', await p.evaluate(()=>SD.units.filter(u => u.type === 'oxcart').map(u => u.sub || 'waiting').join(',')), '| quarry worker:', await p.evaluate(()=>SD.units.filter(u => u.job === window.__q).length));
  const st1 = await p.evaluate(()=>SD.res.stone);
  await p.waitForTimeout(USE3D ? 30000 : 45000);
  console.log('after: quarry pile', await p.evaluate(()=>window.__q.stock || 0), '| cart', await p.evaluate(()=>SD.units.filter(u => u.type === 'oxcart').map(u => (u.sub || 'wait') + ' load ' + u.carry).join(',')), '| stone', st1, '->', await p.evaluate(()=>SD.res.stone));
  await p.evaluate(()=>{ const c = SD.units.find(u => u.type === 'oxcart'); SD.cam.z = 2.0; centerOn(c.x, c.y - 10); }); await p.waitForTimeout(USE3D ? 3500 : 500);
  await p.screenshot({ path: SP + `/G_cart_${USE3D?'3d':'2d'}.png` });
  await p.evaluate(()=>{ const u = window.__c[0]; SD.cam.z = 2.4; centerOn(u.x, u.y - 10); }); await p.waitForTimeout(USE3D ? 3500 : 500);
  await p.screenshot({ path: SP + `/G_civ_${USE3D?'3d':'2d'}.png` });
  // click the stockpile
  await p.evaluate(()=>{ const sp = SD.structures.find(s => s.kind === 'stockpile'); SD.selection().clear(); SD.cam.z = 1.6; centerOn(sp.x, sp.y - 20); }); await p.waitForTimeout(USE3D ? 3500 : 400);
  const sc = await p.evaluate(()=>{ const sp = SD.structures.find(s => s.kind === 'stockpile'); return screenOf(sp.x, sp.y - 10, 10); }); const top = await p.evaluate(()=>document.getElementById('game').getBoundingClientRect().top);
  await p.mouse.click(sc.x, sc.y + top); await p.waitForTimeout(300);
  console.log('store panel:', await p.evaluate(()=>document.getElementById('storePop').hidden ? 'hidden' : document.getElementById('storePop').innerText.replace(/\n/g, ' | ').slice(0, 200)));
  await p.screenshot({ path: SP + `/G_store_${USE3D?'3d':'2d'}.png` });
  console.log('errors', errs.slice(0, 6)); await b.close(); })();
