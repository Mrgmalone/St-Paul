const { chromium } = require('playwright'); const SP = require('./env').SP;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(600);
  await p.evaluate(()=>{ SD.setRaid(9999); SD.WEATHER.on = false; document.getElementById('banner').style.opacity = 0; SD.res.wood = 400; SD.res.gold = 200; });
  await p.waitForTimeout(4000);
  console.log('after 4s, idle civilians:', await p.evaluate(()=>SD.units.filter(u => u.type === 'civ' && u.team === 'player' && u.order === 'idle').length), '| gathering:', await p.evaluate(()=>SD.units.filter(u => u.type === 'civ' && u.team === 'player' && u.order === 'gather').map(u => u.task.type).join(',')));
  const k = await p.evaluate(()=>{ const k = SD.keep(); const ar = SD.createBuilding('armory', k.c + 8, k.r - 3); ar.done = true; ar.progress = 1; window.__b = SD.createBuilding('bowyer', k.c + 5, k.r - 3); window.__b.done = true; window.__b.progress = 1; window.__b.hp = window.__b.maxHp;
    window.__h = SD.createBuilding('woodhut', k.c - 5, k.r + 5); window.__h.done = true; window.__h.progress = 1; window.__h.hp = window.__h.maxHp; return { x: k.x, y: k.y }; });
  await p.waitForTimeout(2500);
  // click the bowyer with the mouse
  const sc = await p.evaluate(()=>screenOf(window.__b.x, window.__b.y - 20, 0)); const top = await p.evaluate(()=>document.getElementById('game').getBoundingClientRect().top);
  await p.mouse.click(sc.x, sc.y + top); await p.waitForTimeout(300);
  const panel = () => p.evaluate(()=>document.getElementById('storePop').hidden ? 'hidden' : document.getElementById('storePop').innerText.replace(/\n/g, ' | ').slice(0, 260));
  console.log('panel:', await panel());
  await p.click('[data-site="add"]'); await p.click('[data-site="add"]'); await p.click('[data-site="add"]'); await p.waitForTimeout(300);
  console.log('after 3 adds:', await p.evaluate(()=>SD.staffOf(window.__b)), '| banner:', await p.textContent('#banner'));
  await p.waitForTimeout(400); console.log('panel:', await panel());
  await p.keyboard.press('z'); await p.waitForTimeout(1500);
  console.log('after Z:', await p.evaluate(()=>({ asleep: window.__b.asleep, staff: SD.staffOf(window.__b) })), '| panel:', (await panel()).slice(0, 80));
  await p.keyboard.press('z'); await p.waitForTimeout(1500); console.log('after Z again:', await p.evaluate(()=>({ asleep: window.__b.asleep, staff: SD.staffOf(window.__b) })));
  // the hut holds two
  console.log('woodhut max', await p.evaluate(()=>SD.maxStaff('woodhut')), '| farm max', await p.evaluate(()=>SD.maxStaff('farm')), '| bowyer max', await p.evaluate(()=>SD.maxStaff('bowyer')));
  // houses full: calling up a civilian
  const d = await p.evaluate(()=>{ SD.res.sword = 5; const pop = () => SD.units.filter(u => u.team === 'player' && !u.dead && !isMachine(u)).length + SD.trainQueue.filter(q => !['ram','catapult','ballista','oxcart'].includes(q.kind)).length;
    while (pop() < popCap()) makeUnit('player', 'spear', 50, 50);
    const civ0 = SD.units.filter(u => u.type === 'civ' && u.team === 'player' && !u.dead).length; const ok = canTrain('sword'); trainUnit('sword');
    return { full: pop() >= popCap(), canTrain: ok, civBefore: civ0, civAfter: SD.units.filter(u => u.type === 'civ' && u.team === 'player' && !u.dead).length, queued: SD.trainQueue.length }; });
  console.log('call-up:', JSON.stringify(d));
  // breaks
  await p.evaluate(()=>{ for (const u of SD.units) if (u.type === 'civ' && u.team === 'player' && u.order === 'gather') u.workedT = 999; }); await p.waitForTimeout(6000);
  console.log('on break:', await p.evaluate(()=>SD.units.filter(u => u.breakUntil > time).length));
  await p.screenshot({ path: SP + '/Site.png' });
  console.log('errors', errs.slice(0, 5)); await b.close(); })();
