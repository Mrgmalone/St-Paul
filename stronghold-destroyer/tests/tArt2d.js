const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(500); await p.click('.civ[data-civ="legion"]'); await p.waitForTimeout(900);
  console.log('art ready', await p.evaluate(()=>ART.ready), 'started', await p.evaluate(()=>started));
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0; SD.WEATHER.on = false; const k = SD.keep(); const x0 = k.x + 380, y0 = k.y + 330;
    window.__w = {};
    [['sword', -400, 0, 'L'], ['spear', 400, 0, 'R'], ['archer', 0, 400, 'D'], ['knight', -150, -400, 'U']].forEach(([t, dx, dy, n], i) => { const u = makeUnit('player', t, x0 + i * 45, y0); SD.commandMove([u], u.x + dx, u.y + dy); u.cmdT = time; window.__w[n] = u; });
    const c = makeUnit('player', 'catapult', x0 - 40, y0 + 90); c.order = 'hold'; const t = makeUnit('player', 'trebuchet', x0 + 60, y0 + 110); t.order = 'hold';
    for (const [ty, dx] of [['sword', 160], ['knight', 210], ['archer', 250], ['spear', 285]]) { const e = makeUnit('enemy', ty, x0 + dx, y0 + 70); e.order = 'hold'; e.post = { x: e.x, y: e.y }; }
    SD.cam.z = 2.2; SD.cam.x = x0 - 120; SD.cam.y = y0 - 150; });
  await p.waitForTimeout(1500);
  const v2 = await p.evaluate(()=>Object.fromEntries(Object.entries(window.__w).map(([k, u]) => [k, u.artV])));
  console.log('2D views:', JSON.stringify(v2));
  if (v2.L !== 'left' || v2.R !== 'right' || v2.D !== 'front' || !['left', 'right'].includes(v2.U)) errs.push('wrong 2D view for the direction of travel: ' + JSON.stringify(v2));
  if (!(await p.evaluate(()=>ART.ready))) errs.push('unit art did not load');
  await p.screenshot({ path: 'art2d.png', clip: { x: 0, y: 50, width: 868, height: 720 } });
  const icon = await p.evaluate(()=>{ const c = document.querySelector('canvas[data-icon="u:sword"]'); if (!c) return 'none'; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; }); console.log('icon pixels', icon); if (!(icon > 200)) errs.push('swordsman icon not drawn');
  console.log('errors', errs); await b.close(); })();
