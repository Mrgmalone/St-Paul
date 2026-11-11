const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500); await p.click('.civ[data-civ="legion"]'); await p.waitForTimeout(800);
  console.log('audio', await p.evaluate(()=>[SD.AudioSys.vol('music'), SD.AudioSys.vol('sfx')]));
  console.log('king', await p.evaluate(()=>{ const k = SD.units.find(u => u.type === 'king'); return { onKeep: !!(k.onWall && k.onWall.kind === 'keep') }; }));
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0; });
  await p.waitForTimeout(4000);
  console.log('king after 4s', await p.evaluate(()=>{ const k = SD.units.find(u => u.type === 'king'); return { onKeep: !!k.onWall, order: k.order }; }));
  // an enemy appears far off: the King warns
  await p.evaluate(()=>{ const k = SD.keep(); const e = makeUnit('enemy', 'sword', k.x + 700, k.y + 100); e.order = 'hold'; e.post = { x: e.x, y: e.y }; });
  await p.waitForTimeout(2500); console.log('king warns:', await p.evaluate(()=>document.getElementById('banner').innerText));
  // order him out, then back
  await p.evaluate(()=>{ const k = SD.units.find(u => u.type === 'king'); SD.selectOnly([k]); });
  const top = await p.evaluate(()=>document.getElementById('game').getBoundingClientRect().top);
  await p.waitForTimeout(300); console.log('fix button shown for selected king', await p.isVisible('#btnFix'));
  await p.evaluate(()=>{ const kp = SD.keep(); const k = SD.units.find(u => u.type === 'king'); k.cmdT = time; k.leftKeep = true; SD.commandMove([k], kp.x + 150, kp.y + 120); });
  await p.waitForTimeout(5000); console.log('king out', await p.evaluate(()=>{ const k = SD.units.find(u => u.type === 'king'); return { onKeep: !!k.onWall, d: Math.round(edgeDist(k, SD.keep())) }; }));
  await p.evaluate(()=>{ const kp = SD.keep(); const k = SD.units.find(u => u.type === 'king'); SD.selectOnly([k]); issueAt(SD.scr((kp.x0 + kp.x1) / 2, (kp.y0 + kp.y1) / 2).x, SD.scr((kp.x0 + kp.x1) / 2, (kp.y0 + kp.y1) / 2).y); });
  await p.waitForTimeout(8000); console.log('king back', await p.evaluate(()=>{ const k = SD.units.find(u => u.type === 'king'); return { onKeep: !!k.onWall }; }));
  // a glitching civilian: stuck inside a tree, jittering; select and press Fix
  const r = await p.evaluate(()=>{ const t = SD.trees.find(t => !t.gone); const u = SD.units.find(o => o.type === 'civ'); u.x = t.x; u.y = t.y; u.path = [{ x: t.x + 400, y: t.y }]; u.order = 'move'; SD.selectOnly([u]); window.__u = u; SD.camWorld(u.x - 400, u.y - 300); return [Math.round(u.x), Math.round(u.y)]; });
  await p.waitForTimeout(400); const fb = await p.isVisible('#btnFix'); await p.click('#btnFix'); await p.waitForTimeout(300);
  console.log('fix: button', fb, 'before', r, 'after', await p.evaluate(()=>{ const u = window.__u; return [Math.round(u.x), Math.round(u.y), u.order, circleBlocked(u.x, u.y, 7)]; }));
  // fix a wall from its small panel
  const wsp = await p.evaluate(()=>{ SD.selection().clear(); const k = SD.keep(); let w = null; for (let i = 0; i < 20 && !w; i++) if (SD.canPlace('wall', k.c - 4, k.r + 6 + i)) { w = SD.createBuilding('wall', k.c - 4, k.r + 6 + i); finishBuilding(w); } window.__w = w; blocked[w.r * COLS + w.c] = 0; SD.camWorld(w.x - 300, w.y - 250); return { sx: SD.scr(w.x, w.y, 14).x, sy: SD.scr(w.x, w.y, 14).y }; });
  await p.mouse.click(wsp.sx, wsp.sy + top); await p.waitForTimeout(300); console.log('wall panel:', await p.evaluate(()=>document.getElementById('storePop').innerText.replace(/\n/g, ' | ').slice(0, 120)));
  await p.click('#storePop [data-fix]'); console.log('wall tile blocked again after fix', await p.evaluate(()=>!!blocked[window.__w.r * COLS + window.__w.c]));
  console.log('errors', errs); await b.close(); })();
