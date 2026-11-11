const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(600);
  await p.evaluate(()=>{ SD.setRaid(9999); SD.WEATHER.on = false; });
  console.log('keep knight:', await p.evaluate(()=>SD.units.filter(u => u.gift).map(u => u.type + '@' + u.guardOf.kind).join(',')), '| people shown:', await p.evaluate(()=>document.getElementById('vPeople').textContent));
  await p.evaluate(()=>{ const k = SD.keep(); for (const [kind, dc] of [['lookout', 12], ['roundtower', -12], ['gtower', 8]]) { const t = SD.createBuilding(kind, k.c + dc, k.r + 4); t.hp = t.maxHp; finishBuilding(t); (window.__t = window.__t || []).push(t); } });
  await p.waitForTimeout(3000);
  console.log('gift knights:', await p.evaluate(()=>SD.units.filter(u => u.gift).map(u => u.guardOf.kind + ' d=' + Math.round(Math.hypot(u.x - u.guardOf.x, u.y - u.guardOf.y))).join(', ')), '| people shown:', await p.evaluate(()=>document.getElementById('vPeople').textContent));
  // an enemy walks into the lookout's radius
  await p.evaluate(()=>{ const t = window.__t[0]; const e = makeUnit('enemy', 'sword', t.x + 170, t.y + 40); e.order = 'hold'; e.post = { x: e.x, y: e.y }; window.__e = e; });
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(1000); const st = await p.evaluate(()=>{ const g = SD.units.find(u => u.gift && u.guardOf === window.__t[0]); return g.order + ' spot=' + JSON.stringify(g.guardSpot) + ' tgt=' + (g.target === window.__e) + ' dist=' + Math.round(Math.hypot(g.x - window.__e.x, g.y - window.__e.y)) + ' enemyHp=' + Math.round(window.__e.hp) + (window.__e.dead ? ' DEAD' : ''); }); console.log(i, st); if (st.includes('DEAD')) break; }
  await p.waitForTimeout(6000);
  console.log('after fight, back at door:', await p.evaluate(()=>{ const g = SD.units.find(u => u.gift && u.guardOf === window.__t[0]); return g.order + ' d=' + Math.round(Math.hypot(g.x - g.guardOf.x, g.y - g.guardOf.y)); }));
  console.log('talk:', await p.evaluate(()=>SD.sayLine(SD.units.find(u => u.gift))));
  console.log('errors', errs); await b.close(); })();
