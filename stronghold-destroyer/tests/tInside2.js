const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(require('./env').LAUNCH); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await require('./env').use3d(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(600);
  await p.evaluate(()=>{ SD.setRaid(9999); SD.WEATHER.on = false; document.getElementById('banner').style.opacity = 0; Object.assign(SD.res, { wood: 900, stone: 300, gold: 300 });
    const k = SD.keep(); const bw = SD.createBuilding('bowyer', k.c + 7, k.r + 1); bw.hp = bw.maxHp; finishBuilding(bw); window.__bw = bw;
    const ar = SD.createBuilding('armory', k.c + 7, k.r - 3); ar.hp = ar.maxHp; finishBuilding(ar);
    const tv = SD.createBuilding('tavern', k.c - 6, k.r + 6); tv.hp = tv.maxHp; finishBuilding(tv); window.__tv = tv;
    for (let i = 0; i < 3; i++) SD.siteAction(bw, 'add'); document.getElementById('storePop').hidden = true; });
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(2500); console.log('t', i, await p.evaluate(()=>SD.units.filter(u => u.job === window.__bw).map(u => u.sub + (u.inside ? '[IN]' : '') + ' d' + Math.round(edgeDist(u, window.__bw))).join(', '))); }
  await p.evaluate(()=>SD.showSite(window.__bw)); await p.waitForTimeout(300);
  console.log('panel:', await p.evaluate(()=>document.getElementById('siteInfo').innerText.replace(/\n/g, ' | ')), '| figures:', await p.evaluate(()=>document.querySelectorAll('#siteInfo svg').length));
  const k = await p.evaluate(()=>{ const bw = window.__bw; SD.cam.z = 2.2; SD.camWorld(bw.x - 300, bw.y - 220); return 1; }); await p.waitForTimeout(400);
  await p.screenshot({ path: 'inside_panel.png' });
  // break at the tavern
  await p.evaluate(()=>{ document.getElementById('storePop').hidden = true; const tv = window.__tv; const u = SD.units.find(o => o.type === 'civ' && !o.job && !o.dead); window.__bu = u; u.carry = 0; u.task = null; u.sub = null; u.order = 'idle'; u.breakUntil = time + 25; u.breakAt = tv; SD.commandMove([u], tv.x, tv.y + 10); });
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(2000); console.log(await p.evaluate(()=>{ const u = window.__bu; return [Math.round(u.x), Math.round(u.y), u.order, u.sub, u.path.length, u.dest ? Math.round(u.dest.x) + ',' + Math.round(u.dest.y) : '', Math.round(edgeDist(u, window.__tv)), u.breakUntil > time].join(' '); })); } console.log('tavern break:', await p.evaluate(()=>({ inside: window.__bu.inside && window.__bu.inside.kind, order: window.__bu.order, d: Math.round(edgeDist(window.__bu, window.__tv)) })));
  await p.evaluate(()=>SD.siteAction ? null : null); await p.evaluate(()=>{ showInside(window.__tv); }); console.log('tavern panel:', await p.evaluate(()=>document.getElementById('storePop').innerText.replace(/\n/g, ' | ')));
  // pick through: clicking where the worker stands finds the building, not him
  console.log('pick at hidden worker:', await p.evaluate(()=>{ const u = SD.units.find(o => o.inside === window.__bw); return u ? (pickAt(u.x, u.y - 21) || {}).kind || 'nothing' : 'no one inside'; }));
  await p.evaluate(()=>{ document.getElementById('storePop').hidden = true; });
  // sick person cared for inside the keep
  await p.evaluate(()=>{ const u = SD.units.find(o => o.type === 'civ' && !o.job && !o.dead && o !== window.__bu); u.sick = 1; u.toHeal = true; u.healT = 0; window.__su = u; });
  await p.waitForTimeout(12000); console.log('sick:', await p.evaluate(()=>({ inside: window.__su.inside && window.__su.inside.kind, healT: window.__su.healT, keepPanel: (SD.showSite, showStore(SD.keep()), document.getElementById('storePop').innerText.match(/Being cared for inside\s*\S+ \S+/)?.[0]) })));
  console.log('errors', errs); await b.close(); })();
