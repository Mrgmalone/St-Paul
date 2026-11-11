const { chromium } = require('playwright');
const SP = require('./env').SP;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500);
  await p.click('.civ[data-civ="wardens"]'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ SD.res.wood = 1000; SD.res.food = 1000; SD.setRaid(9999); });
  const top = await p.evaluate(()=>document.getElementById('game').getBoundingClientRect().top);
  const scr = (wx,wy) => p.evaluate(([x,y])=>SD.scr(x,y), [wx,wy]);
  const clickWorld = async (wx,wy,btn='left') => { const s = await scr(wx,wy); await p.mouse.move(s.x, s.y+top); await p.mouse.click(s.x, s.y+top, {button:btn}); };
  // place a farm, a house, a tower through the real UI
  await p.evaluate(()=>UI.showTab('town')); await p.click('.bb[data-b="farm"]'); await clickWorld(330+352, 760-96);
  await p.evaluate(()=>UI.showTab('town')); await p.click('.bb[data-b="house"]'); await clickWorld(420+352, 880-96);
  await p.evaluate(()=>UI.showTab('castle')); await p.click('.bb[data-b="gtower"]'); await clickWorld(520+352, 800-96);
  // a wall: start then end, with mouse hovering for ghost screenshot
  await p.evaluate(()=>UI.showTab('castle')); await p.click('.bb[data-b="wall"]'); await clickWorld(600+352, 640-96);
  const s2 = await scr(600+352, 900-96); await p.mouse.move(s2.x, s2.y+top); await p.waitForTimeout(150);
  await p.screenshot({path:SP+'/b_ghost.png'});
  await clickWorld(600+352, 900-96);
  // try an invalid spot (far away)
  await p.evaluate(()=>UI.showTab('town')); await p.click('.bb[data-b="house"]'); await clickWorld(1500, 500); 
  console.log('invalid banner:', await p.textContent('#banner')); await p.keyboard.press('Escape');
  const st = () => p.evaluate(()=>({ blds: SD.structures.filter(s=>s.team==='player'&&s.kind!=='keep').map(s=>s.kind+(s.done?'✓':Math.round(s.progress*100)+'%')).join(' '), farms: SD.farms.map(f=>f.done?'farm✓'+Math.floor(f.amount):'farm'+Math.round(f.progress*100)+'%').join(' '), civs: SD.units.filter(u=>u.type==='civ').map(u=>u.order).join(','), wood: Math.floor(SD.res.wood), status: 'People: ' + document.getElementById('vPeople').textContent }));
  console.log('placed:', JSON.stringify(await st()));
  // put all civilians to work on the building queue
  await p.evaluate(()=>{ const cs=SD.units.filter(u=>u.type==='civ'); cs.forEach(u=>{u.order='build'; u.buildTarget=null;}); });
  for (let i=0;i<90;i++){ await p.waitForTimeout(1000); if (i%15==0) console.log(i, JSON.stringify(await st())); if (i===20) await p.screenshot({path:SP+'/b_build.png'});
    const done = await p.evaluate(()=>SD.structures.concat(SD.farms).filter(s=>s.team==='player'&&s.done===false).length===0); if (done) { console.log('all built at', i, JSON.stringify(await st())); break; } }
  // farm gathering
  await p.evaluate(()=>{ const cs=SD.units.filter(u=>u.type==='civ'); SD.commandGather(cs.slice(0,2), SD.farms[0]); });
  const f0 = await p.evaluate(()=>SD.res.food); await p.waitForTimeout(20000); const f1 = await p.evaluate(()=>SD.res.food);
  console.log('farm food in 20s (2 civs, minus eating):', Math.round(f1-f0));
  // raid vs the tower and wall
  await p.evaluate(()=>{ SD.spawnRaid(); });
  for (let i=0;i<60;i++){ await p.waitForTimeout(1000); const r = await p.evaluate(()=>({raiders:SD.units.filter(u=>u.raider&&!u.dead).map(u=>u.order+(u.target?':'+(u.target.kind||''):'')).join(' '), arrows: SD.arrows.filter(a=>a.from.kind==='gtower').length, hurt: SD.structures.filter(s=>s.team==='player'&&s.hp<s.maxHp&&s.done).map(s=>s.kind).join(',')}));
    if (i%10==0) console.log('raid', i, JSON.stringify(r)); if (i===25) { await p.evaluate(()=>{SD.camWorld(250, 480);}); await p.waitForTimeout(60); await p.screenshot({path:SP+'/b_raid.png'}); } if (!r.raiders) { console.log('raid over at', i); break; } }
  console.log('errors', errs); await b.close();
})();
