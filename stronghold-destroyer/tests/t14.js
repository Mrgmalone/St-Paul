const { chromium } = require('playwright');
const SP = require('./env').SP;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500);
  await p.click('.civ[data-civ="legion"]'); await p.waitForTimeout(400);
  console.log('enemy walls at start', await p.evaluate(()=>SD.enemyWalls().length), 'plan left', await p.evaluate(()=>SD.wallPlan()));
  await p.evaluate(()=>{ SD.setRaid(9999); SD.res.wood=2000; SD.res.gold=500; SD.res.food=2000; });
  // train 2 rams with the real button
  await p.evaluate(()=>UI.showTab('army')); await p.click('.tb[data-k="ram"]'); await p.evaluate(()=>UI.showTab('army')); await p.click('.tb[data-k="ram"]');
  console.log('status', 'People: ' + (await p.textContent('#vPeople')), 'queue', await p.textContent('#queue'));
  await p.waitForTimeout(41000);
  console.log('enemy walls after ~41s', await p.evaluate(()=>SD.enemyWalls().length), 'rams', await p.evaluate(()=>SD.units.filter(u=>u.type==='ram'&&!u.dead).length));
  // complete the ring quickly to test breaching
  await p.evaluate(()=>{ for (let i=0;i<40;i++) { /* finish plan */ } });
  await p.evaluate(()=>{ while (SD.wallPlan()>0) { window.__b = 1; break; } });
  await p.evaluate(()=>{ const n=SD.wallPlan(); SD.structures; });
  await p.evaluate(()=>{ const all=SD.units.filter(u=>u.team==='player'&&!u.dead&&u.type!=='civ'); SD.commandMove(all, 1250+928, 560); });
  await p.waitForTimeout(42000);
  // swords alone vs a wall: damage rate
  const w0 = await p.evaluate(()=>{ const w=SD.enemyWalls().filter(w=>!w.dead).sort((a,b)=>Math.hypot(a.x-2228,a.y-560)-Math.hypot(b.x-2228,b.y-560))[0]; window.__w=w; return w.hp; });
  await p.evaluate(()=>{ const sw=SD.units.filter(u=>u.type==='sword'&&!u.dead); SD.commandAttack(sw, window.__w); });
  await p.waitForTimeout(8000);
  const w1 = await p.evaluate(()=>window.__w.hp);
  console.log('3 swordsmen vs wall in 8s:', w0, '->', w1);
  // order attack on the tower behind walls: soldiers should breach; rams join
  await p.evaluate(()=>{ const all=SD.units.filter(u=>u.team==='player'&&!u.dead&&u.type!=='civ'); SD.commandAttack(all, SD.structures.find(s=>s.kind==='tower')); const t=SD.structures.find(s=>s.kind==='tower'); SD.cam.z=1.0; SD.cam.x=t.x-700; SD.cam.y=t.y-380; });
  for (let i=0;i<70;i++){ await p.waitForTimeout(1000);
    const st = await p.evaluate(()=>({walls:SD.enemyWalls().filter(w=>!w.dead).length, broken:SD.enemyWalls().filter(w=>w.dead).length, tower:SD.structures.find(s=>s.kind==='tower').hp, rams:SD.units.filter(u=>u.type==='ram'&&!u.dead).map(u=>u.order+':'+(u.target?u.target.kind:'')).join(' '), mine:SD.units.filter(u=>u.team==='player'&&!u.dead&&u.type!=='civ').length, end:document.getElementById('win').style.display}));
    if (i%10==0) console.log(i, JSON.stringify(st)); if (i===8) await p.screenshot({path:SP+'/s_siege.png'}); if (st.end==='flex' || st.tower<=0) { console.log('end', i, JSON.stringify(st)); break; } }
  // enemy ram raid
  await p.evaluate(()=>{ for (let i=0;i<3;i++) SD.spawnRaid(); });
  console.log('enemy rams', await p.evaluate(()=>SD.units.filter(u=>u.type==='ram'&&u.team==='enemy'&&!u.dead).map(u=>u.order+':'+(u.target?u.target.kind:'-')).join(' ')), await p.textContent('#banner'));
  console.log('errors', errs); await b.close();
})();
