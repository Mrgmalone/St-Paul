const { chromium } = require('playwright');
const SP = require('./env').SP;
(async () => {
  const b = await chromium.launch(require('./env').LAUNCH); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await require('./env').use3d(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500);
  await p.click('.civ[data-civ="legion"]'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ SD.setRaid(9999); SD.res.food = 2000; });
  const st = () => p.evaluate(()=>({mood:+SD.mood().toFixed(1), gold:SD.res.gold, rule:SD.rule(), people:SD.units.filter(u=>u.team==='player'&&!u.dead).length, status:document.getElementById('status').textContent.replace(/\s+/g,' ').slice(60,190)}));
  console.log('start', JSON.stringify(await st()));
  // High taxes via real button, 20 seconds
  await p.evaluate(()=>UI.showTab('rule')); await p.click('.rb[data-t="2"]'); await p.waitForTimeout(20000);
  console.log('high tax 20s', JSON.stringify(await st()));
  // Generous rations + no taxes
  await p.evaluate(()=>UI.showTab('rule')); await p.click('.rb[data-r="2"]'); await p.evaluate(()=>UI.showTab('rule')); await p.click('.rb[data-t="0"]'); await p.waitForTimeout(10000);
  console.log('generous/no tax 10s', JSON.stringify(await st()));
  // feast
  await p.evaluate(()=>{ SD.res.gold = 60; }); await p.evaluate(()=>UI.showTab('rule')); await p.click('#feast'); await p.waitForTimeout(300);
  console.log('after feast', JSON.stringify(await st()), await p.textContent('#banner'));
  // happy -> settler arrives
  await p.evaluate(()=>SD.setMood(95)); await p.waitForTimeout(31000);
  console.log('happy 31s', JSON.stringify(await st()), '|', await p.textContent('#banner'));
  // rebellious -> someone leaves
  await p.evaluate(()=>UI.showTab('rule')); await p.click('.rb[data-r="0"]'); await p.evaluate(()=>UI.showTab('rule')); await p.click('.rb[data-t="2"]');
  await p.evaluate(()=>SD.setMood(10)); await p.waitForTimeout(27000);
  console.log('rebellious 27s', JSON.stringify(await st()), '|', await p.textContent('#banner'));
  await p.screenshot({path:SP+'/m_hud.png'});
  // archer: train via button, then shoot the enemy tower area guard
  await p.evaluate(()=>{ SD.setMood(60); SD.res.gold=100; SD.res.wood=200; });
  await p.evaluate(()=>UI.showTab('army')); await p.click('.tb[data-k="archer"]'); for (let i = 0; i < 120 && !(await p.evaluate(()=>SD.units.some(u=>u.type==='archer'&&!u.dead))); i++) await p.waitForTimeout(500);   // training takes a few game seconds
  const arch = await p.evaluate(()=>SD.units.filter(u=>u.type==='archer'&&!u.dead).length); console.log('archers', arch);
  await p.evaluate(()=>{ const a=SD.units.find(u=>u.type==='archer'); const g=SD.units.find(u=>u.team==='enemy'&&!u.dead); a.x=g.x-150; a.y=g.y; SD.commandAttack([a], g); SD.camWorld(g.x-500, g.y-350); });
  await p.waitForTimeout(2200); await p.screenshot({path:SP+'/m_archer.png'});
  await p.waitForTimeout(4000);
  console.log('guard hp after archer fire', await p.evaluate(()=>SD.units.filter(u=>u.team==='enemy').map(u=>Math.round(u.hp)+(u.dead?'✗':'')).join(',')));
  console.log('errors', errs); await b.close();
})();
