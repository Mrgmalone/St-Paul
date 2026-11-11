const { chromium } = require('playwright'); const SP = require('./env').SP;
(async () => { const b = await chromium.launch(require('./env').LAUNCH); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await require('./env').use3d(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(600);
  await p.evaluate(()=>{ SD.setRaid(9999); SD.WEATHER.on = false; document.getElementById('banner').style.opacity = 0; Object.assign(SD.res, { wood: 2000, stone: 900, gold: 900, iron: 20 }); for (let i = 0; i < 6; i++) { const h = SD.createBuilding('house', 2 + i * 2, 18); h.done = true; h.progress = 1; } });
  console.log('king:', await p.evaluate(()=>{ const k = SD.units.find(u => u.type === 'king'); return k ? k.name + ' hp ' + k.hp : 'none'; }), '| iron rocks:', await p.evaluate(()=>rocks.filter(r => r.iron).length));
  // 1. building priority: everyone gathering, a house is placed with no one selected
  await p.waitForTimeout(3000);
  const bp = await p.evaluate(()=>{ SD.selection().clear(); const k = SD.keep(); const h = SD.createBuilding('house', k.c - 6, k.r + 6); window.__h = h; return SD.units.filter(u => u.type === 'civ' && u.order === 'build').length; });
  await p.waitForTimeout(1500); console.log('builders on the new house after 1.5s:', await p.evaluate(()=>SD.units.filter(u => u.type === 'civ' && u.order === 'build' && u.buildTarget === window.__h).length));
  // 2. blacksmith making armor
  await p.evaluate(()=>{ const k = SD.keep(); const ar = SD.createBuilding('armory', k.c + 8, k.r - 3); ar.done = true; ar.progress = 1; window.__s = SD.createBuilding('smithy', k.c + 5, k.r - 3); window.__s.done = true; window.__s.progress = 1; window.__s.hp = window.__s.maxHp; SD.showSite(window.__s); });
  await p.click('[data-site="make:armor"]'); await p.evaluate(()=>{ document.getElementById('storePop').hidden = true; }); await p.waitForTimeout(30000);
  console.log('armor made:', await p.evaluate(()=>SD.res.armor), '| smith recipe:', await p.evaluate(()=>SD.recipeOf(window.__s).out));
  // 3. knights: train 6 (sword + armor)
  await p.evaluate(()=>{ SD.res.sword = 10; SD.res.armor = 10; SD.res.mace = 4; }); await p.keyboard.press('3');
  for (let i = 0; i < 6; i++) await p.click('.tb[data-k="knight"]'); for (let i = 0; i < 2; i++) await p.click('.tb[data-k="maceman"]');
  await p.evaluate(()=>{ SD.trainQueue.forEach(q => q.t = q.dur); }); await p.waitForTimeout(800); await p.evaluate(()=>{ SD.trainQueue.forEach(q => q.t = q.dur); }); await p.waitForTimeout(600);
  for (let i = 0; i < 8; i++) { await p.evaluate(()=>{ SD.trainQueue.forEach(q => q.t = q.dur); }); await p.waitForTimeout(200); }
  // 4. a lookout tower and a round tower
  await p.evaluate(()=>{ const k = SD.keep(); const lt = SD.createBuilding('lookout', k.c + 12, k.r + 2); lt.done = true; lt.progress = 1; lt.hp = lt.maxHp; window.__lt = lt; const rt = SD.createBuilding('roundtower', k.c + 12, k.r + 8); rt.done = true; rt.progress = 1; rt.hp = rt.maxHp; window.__rt = rt; for (let i = 0; i < 2; i++) makeUnit('player', 'archer', k.x + 260 + i * 20, k.y + 20); });
  await p.waitForTimeout(9000);
  console.log('knights:', await p.evaluate(()=>SD.units.filter(u => u.type === 'knight').map(u => u.guardOf ? (u.guardOf.type === 'king' ? 'king' : u.guardOf.kind) : '-').join(',')), '| macemen:', await p.evaluate(()=>SD.units.filter(u => u.type === 'maceman').map(u => u.guardOf ? u.guardOf.kind : '-').join(',')));
  console.log('lookout: archers on top', await p.evaluate(()=>SD.units.filter(u => u.onWall === window.__lt).length), '| guards', await p.evaluate(()=>SD.units.filter(u => u.guardOf === window.__lt).length));
  // 5. mount a trebuchet on the round tower; enemies far away
  await p.evaluate(()=>{ SD.showTower(window.__rt); }); await p.click('[data-tw="trebuchet"]'); await p.evaluate(()=>{ document.getElementById('storePop').hidden = true; }); await p.waitForTimeout(200);
  await p.evaluate(()=>{ const rt = window.__rt; for (let i = 0; i < 3; i++) { const e = makeUnit('enemy', 'sword', rt.x + 560 + i * 12, rt.y + 40); e.order = 'hold'; e.post = { x: e.x, y: e.y }; } });
  await p.waitForTimeout(3500); console.log('engine:', await p.evaluate(()=>window.__rt.engine), '| stones in flight from the tower:', await p.evaluate(()=>SD.arrows.filter(a => a.from === window.__rt).length));
  await p.evaluate(()=>SD.showTower(window.__rt)); await p.click('[data-tw="stop"]'); console.log('after stop:', await p.evaluate(()=>window.__rt.engineHold)); await p.evaluate(()=>{ document.getElementById('storePop').hidden = true; }); 
  // 6. armor: a swordsman hits a knight, a knight hits a knight
  console.log('armor x (sword->knight, knight->knight, ballista->knight):', await p.evaluate(()=>{ const kn = SD.units.find(u => u.type === 'knight'); return [SD.armorMul(kn, { type: 'sword' }), SD.armorMul(kn, { type: 'knight' }), SD.armorMul(kn, { type: 'ballista' })].join(' '); }));
  // 7. speech
  console.log('speech:', await p.evaluate(()=>['civ', 'knight', 'archer', 'king', 'maceman'].map(t => { const u = SD.units.find(o => o.type === t && o.team === 'player'); return t + ': ' + SD.sayLine(u); }).join(' | ')));
  // 8. someone leaves; Why? button
  await p.evaluate(()=>{ SD.setMood(5); SD.rule(); }); await p.evaluate(()=>{ for (const u of SD.units) if (u.type === 'civ') u.manualT = -99; }); await p.waitForTimeout(26500);
  console.log('left note:', await p.evaluate(()=>document.getElementById('leftNote').hidden ? 'hidden' : document.getElementById('leftText').innerText));
  if (await p.evaluate(()=>!document.getElementById('leftNote').hidden)) { await p.click('#leftWhy'); console.log('why:', await p.evaluate(()=>document.getElementById('leftText').innerText.slice(0, 220))); }
  // 9. a feast lifts spirits and holds them
  await p.evaluate(()=>{ document.getElementById('leftNote').hidden = true; SD.res.gold = 100; }); await p.evaluate(()=>UI.showTab('rule')); await p.click('#feast'); const m1 = await p.evaluate(()=>SD.mood()); await p.waitForTimeout(5000);
  console.log('feast mood', m1.toFixed(1), '-> after 5s', (await p.evaluate(()=>SD.mood())).toFixed(1));
  await p.evaluate(()=>{ const k = SD.keep(); SD.cam.z = 1.0; centerOn(k.x + 300, k.y + 60); document.getElementById('storePop').hidden = true; const kn = SD.units.find(u => u.type === 'knight'); talkTo(kn); talkTo(SD.units.find(u => u.type === 'king')); }); await p.waitForTimeout(400);
  await p.screenshot({ path: SP + '/K_2d.png' });
  console.log('errors', errs.slice(0, 6)); await b.close(); })();
