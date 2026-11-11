const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(700);
  await p.evaluate(()=>{ SD.setRaid(9999); SD.res.wood = 300; SD.res.gold = 500; const k = SD.keep(); for (let r = 0; r < 12; r++) for (let a = 0; a < 16; a++) { const c = k.c + 8 + Math.round(Math.cos(a / 16 * 6.28) * r), rr = k.r + 2 + Math.round(Math.sin(a / 16 * 6.28) * r); if (SD.canPlace('market', c, rr)) { const m = SD.createBuilding('market', c, rr); m.hp = m.maxHp; finishBuilding(m); window.__m = m; return; } } });
  for (const md of [100, 75, 50, 25, 0]) { await p.evaluate(v => { SD.setMood(v); showMarket(window.__m); }, md); await p.waitForTimeout(100);
    console.log('mood', md, '|', await p.textContent('#mkMood'), '| wood', await p.textContent('[data-mk="buy:wood"]'), await p.textContent('[data-mk="sell:wood"]'), '| sword', await p.textContent('[data-mk="buy:sword"]'), await p.textContent('[data-mk="sell:sword"]'), '| armor', await p.textContent('[data-mk="buy:armor"]'), await p.textContent('[data-mk="sell:armor"]')); }
  await p.evaluate(()=>{ SD.setMood(100); showMarket(window.__m); }); const g0 = await p.evaluate(()=>SD.res.gold); await p.click('[data-mk="buy:wood"]'); console.log('happy: bought 10 wood for', g0 - await p.evaluate(()=>SD.res.gold), await p.textContent('#mkMsg'));
  // any price pair: can you profit by buying then selling? must never
  console.log('arbitrage anywhere:', await p.evaluate(()=>{ let bad = []; for (let m = 0; m <= 100; m += 5) { SD.setMood(m); for (const r of MARKET) { const q = priceOf(r); if (q.sell >= q.buy) bad.push(r[0] + '@' + m); } } return bad.length ? bad.join(',') : 'none'; }));
  console.log('errors', errs); await b.close(); })();
