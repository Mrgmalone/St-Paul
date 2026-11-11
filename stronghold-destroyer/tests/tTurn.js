const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(700);
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0; Object.assign(SD.res, { wood: 900, stone: 300, gold: 300 }); const k = SD.keep(); SD.cam.z = 1.6; SD.cam.x = k.x - 120; SD.cam.y = k.y - 200; });
  // place a market turned to face west, using the real button and the R key
  await p.evaluate(()=>UI.showTab('town')); await p.click('.bb[data-b="market"]');
  const spot = await p.evaluate(()=>{ const k = SD.keep(); for (let r = 0; r < 10; r++) for (let a = 0; a < 16; a++) { const c = k.c + 7 + Math.round(Math.cos(a / 16 * 6.28) * r), rr = k.r + 2 + Math.round(Math.sin(a / 16 * 6.28) * r); if (SD.canPlace('market', c, rr, 1)) { const wx = (c + 1) * TILE, wy = (rr + 1.5) * TILE; return { sx: (wx - SD.cam.x) * SD.cam.z, sy: (wy - SD.cam.y) * SD.cam.z }; } } });
  console.log('turn button visible', await p.isVisible('#btnTurn'));
  await p.mouse.move(spot.sx, spot.sy + 44); await p.keyboard.press('r'); await p.waitForTimeout(200);
  console.log('after R:', await p.textContent('#btnTurn'));
  await p.screenshot({ path: 'turn_ghost.png' });
  const top = await p.evaluate(()=>document.getElementById('game').getBoundingClientRect().top);
  await p.mouse.click(spot.sx, spot.sy + top);
  const mk = await p.evaluate(()=>{ const m = SD.structures.find(s => s.kind === 'market'); return m ? { dir: m.dir, w: m.w, h: m.h } : null; }); console.log('market placed', mk, 'turn hidden', await p.isHidden('#btnTurn'));
  // a gate turned once
  await p.evaluate(()=>UI.showTab('castle')); await p.click('.bb[data-b="gate"]'); await p.click('#btnTurn'); console.log('gate dir while placing', await p.evaluate(()=>SD.placing().dir));
  // tear down: build a wall piece then pull it down
  const before = await p.evaluate(()=>{ const k = SD.keep(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); let w = null; for (let i = 0; i < 20 && !w; i++) if (SD.canPlace('wall', k.c - 4, k.r + 6 + i)) { w = SD.createBuilding('wall', k.c - 4, k.r + 6 + i); w.done = true; w.progress = 1; } window.__w = w; return { wood: SD.res.wood, n: SD.structures.filter(s => s.kind === 'wall' && s.team === 'player').length }; });
  await p.evaluate(()=>{ const w = window.__w; SD.cam.x = w.x - 300; SD.cam.y = w.y - 250; }); await p.waitForTimeout(100);
  await p.click('#btnTear'); console.log('tearing on', await p.evaluate(()=>document.getElementById('btnTear').classList.contains('tearing')));
  const ws = await p.evaluate(()=>{ const w = window.__w; return { sx: ((w.x0 + w.x1) / 2 - SD.cam.x) * SD.cam.z, sy: ((w.y0 + w.y1) / 2 - SD.cam.y) * SD.cam.z }; });
  await p.mouse.move(ws.sx, ws.sy + top); await p.waitForTimeout(200); await p.screenshot({ path: 'tear_hover.png' });
  await p.mouse.click(ws.sx, ws.sy + top); await p.waitForTimeout(200);
  console.log('wall torn:', before, '->', await p.evaluate(()=>({ wood: SD.res.wood, n: SD.structures.filter(s => s.kind === 'wall' && s.team === 'player').length, tileFree: !blocked[window.__w.r * COLS + window.__w.c] })));
  // tear down the market: half of 60 wood back, still in tear mode
  await p.evaluate(()=>{ const m = SD.structures.find(s => s.kind === 'market'); SD.cam.x = m.x - 300; SD.cam.y = m.y - 250; });
  const m = await p.evaluate(()=>{ const m = SD.structures.find(s => s.kind === 'market'); return { sx: ((m.x0 + m.x1) / 2 - SD.cam.x) * SD.cam.z, sy: ((m.y0 + m.y1) / 2 - SD.cam.y) * SD.cam.z, wood: SD.res.wood }; });
  await p.mouse.click(m.sx, m.sy + top); console.log('market torn, wood', m.wood, '->', await p.evaluate(()=>SD.res.wood), 'markets left', await p.evaluate(()=>SD.structures.filter(s => s.kind === 'market').length));
  const kk = await p.evaluate(()=>{ const k = SD.keep(); SD.cam.x = k.x - 300; SD.cam.y = k.y - 250; return { sx: ((k.x0 + k.x1) / 2 - SD.cam.x) * SD.cam.z, sy: ((k.y0 + k.y1) / 2 - SD.cam.y) * SD.cam.z }; }); await p.mouse.click(kk.sx, kk.sy + top); console.log('keep:', await p.textContent('#banner'), 'keep alive', await p.evaluate(()=>!SD.keep().dead));
  await p.keyboard.press('Escape'); console.log('tearing after Esc', await p.evaluate(()=>document.getElementById('btnTear').classList.contains('tearing')));
  console.log('errors', errs); await b.close(); })();
