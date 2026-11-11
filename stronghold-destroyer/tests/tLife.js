// Living water and wildlife: every kind appears, never more than its cap, and the game stays error-free.
const { chromium } = require('playwright'); const env = require('./env'); const SP = env.SP;
(async () => {
  const b = await chromium.launch(env.LAUNCH); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 0 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await p.goto(env.GAME); await p.waitForTimeout(600); await p.click('.civ[data-civ="legion"]'); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.getElementById('banner').style.display = 'none'; SD.setRaid(9999); SD.cam.z = 2.0; SD.centerOn(pond.x + pond.rx * 0.9, pond.y + 20); });
  await p.waitForTimeout(1500); await p.evaluate(() => SD.R3D.lifeDemo()); await p.waitForTimeout(250); await p.screenshot({ path: SP + '/life_pond.png' });
  const demo = await p.evaluate(() => SD.R3D.lifeCount()); console.log('all at once', JSON.stringify(demo));
  for (const k of ['splash', 'fish', 'flock', 'fly', 'frog']) if (!(demo[k] > 0)) throw new Error('no ' + k);
  const cap = await p.evaluate(() => SD.R3D.LIFE_CAP); let worst = {};
  for (let i = 0; i < 30; i++) { await p.waitForTimeout(400); const c = await p.evaluate(() => SD.R3D.lifeCount()); for (const k in cap) worst[k] = Math.max(worst[k] || 0, c[k]); }
  console.log('most at once over 12 s', JSON.stringify(worst), 'caps', JSON.stringify(cap));
  for (const k in cap) if (worst[k] > cap[k]) throw new Error('too many ' + k);
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
