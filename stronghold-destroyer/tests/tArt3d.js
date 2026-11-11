const { chromium } = require('playwright'); const fs = require('fs'); const SP = require('./env').SP; const OUT = process.argv[3] || 'art3d';
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(800); await p.click('.civ[data-civ="legion"]', { timeout: 300000 }); await p.waitForTimeout(3000);
  console.log('art ready', await p.evaluate(()=>ART.ready));
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0; SD.WEATHER.on = false; const k = SD.keep(); const x0 = k.x + 420, y0 = k.y + 330;
    // which world direction moves things left on screen?
    const a = SD.R3D.project(x0, 0, y0), bq = SD.R3D.project(x0 + 100, 0, y0), cq = SD.R3D.project(x0, 0, y0 + 100);
    const sx = [(bq.x - a.x), (cq.x - a.x)], sy = [(bq.y - a.y), (cq.y - a.y)];
    // solve for world vectors giving screen left / right / down (towards camera) / up (away)
    const det = sx[0] * sy[1] - sx[1] * sy[0], W = (vx, vy) => ({ dx: (vx * sy[1] - vy * sx[1]) / det * 100, dz: (sx[0] * vy - sy[0] * vx) / det * 100 });
    const dirs = { screenLeft: W(-1, 0), screenRight: W(1, 0), towardCamera: W(0, 1), away: W(0, -1) };
    window.__walkers = {};
    const types = ['sword', 'spear', 'archer', 'knight'];
    Object.entries(dirs).forEach(([nm, d], i) => { const L = Math.hypot(d.dx, d.dz); const u = makeUnit('player', types[i], x0 + (i - 1.5) * 60, y0); SD.commandMove([u], u.x + d.dx / L * 600, u.y + d.dz / L * 600); u.cmdT = time; window.__walkers[nm] = u; window.__dirs = dirs; });
    const c = makeUnit('player', 'catapult', x0 - 60, y0 + 90); c.order = 'hold'; const t = makeUnit('player', 'trebuchet', x0 + 40, y0 + 110); t.order = 'hold';
    const e = makeUnit('enemy', 'sword', x0 + 130, y0 + 80); e.order = 'hold'; e.post = { x: e.x, y: e.y }; const e2 = makeUnit('enemy', 'knight', x0 + 170, y0 + 100); e2.order = 'hold'; e2.post = { x: e2.x, y: e2.y };
    SD.cam.z = 2.6; centerOn(x0 + 20, y0 + 40); });
  await p.waitForTimeout(2500);
  const v3 = await p.evaluate(()=>{ const out = {}; for (const [k, u] of Object.entries(window.__walkers)) out[k] = SD.R3D.artViewOf(u); return out; });
  console.log('views while walking:', JSON.stringify(v3));
  const first = k => (v3[k] || '').split(' ')[0];
  if (first('screenLeft') !== 'left' || first('screenRight') !== 'right' || !['left', 'right'].includes(first('away'))) errs.push('wrong 3D view for the direction of travel: ' + JSON.stringify(v3));
  await p.waitForTimeout(4000); await p.screenshot({ path: OUT + '.png', clip: { x: 0, y: 50, width: 868, height: 720 } });
  console.log('errors', errs); await b.close(); })();
