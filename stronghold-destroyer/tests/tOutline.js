// Outlines: a unit standing behind a wall or a tower shows as a team-coloured shape drawn over it. Buildings stay
// solid. Compares the same view with outlines on and off; also saves the two pictures for Gerald.
const { chromium } = require('playwright'); const env = require('./env'); const SP = env.SP;
(async () => {
  const b = await chromium.launch(env.LAUNCH); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 0 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await p.goto(env.GAME); await p.waitForTimeout(600); await p.click('.civ[data-civ="wardens"]'); await p.waitForTimeout(2000);
  const spot = await p.evaluate(() => { document.getElementById('banner').style.display = 'none'; SD.setRaid(9999); Object.assign(SD.res, { wood: 9999, stone: 9999, gold: 9999 });
    const k = SD.keep(); let w = null, t = null;
    for (let d = 6; d < 20 && !w; d++) { let ok = true; for (let i = 0; i < 5; i++) if (!SD.canPlace('highwall', k.c + d, k.r - 2 + i)) ok = false; if (ok) { for (let i = 0; i < 5; i++) { const s = SD.createBuilding('highwall', k.c + d, k.r - 2 + i); s.done = true; s.progress = 1; s.hp = s.maxHp; } w = { c: k.c + d, r: k.r }; } }
    for (let d = 4; d < 20 && !t; d++) if (SD.canPlace('stower', k.c - 2, k.r + d)) { t = SD.createBuilding('stower', k.c - 2, k.r + d); t.done = true; t.progress = 1; t.hp = t.maxHp; }
    // one swordsman just behind (north-west of) the wall, one just behind the tower, as seen from the camera
    const u1 = makeUnit('player', 'sword', w.c * 32 - 14, w.r * 32 + 10), u2 = makeUnit('player', 'archer', t.x0 - 12, t.y0 - 10);
    for (const u of [u1, u2]) { u.order = 'idle'; u.moving = false; u.holdT = 1e9; }
    window.__o = { wall: { x: w.c * 32, y: w.r * 32 }, tower: { x: t.x, y: t.y0 }, u1: u1.id, u2: u2.id };
    return window.__o; });
  if (!spot.wall || !spot.tower) throw new Error('could not place the wall or tower');
  const diff = async (name, at) => {
    await p.evaluate(a => { SD.cam.z = 2.0; SD.centerOn(a.x, a.y); outlinesOn = true; }, at); await p.waitForTimeout(1800);
    await p.screenshot({ path: SP + `/outline_${name}.png` }); const on = await p.screenshot();
    await p.evaluate(() => { outlinesOn = false; }); await p.waitForTimeout(1200); const off = await p.screenshot();
    await p.evaluate(() => { outlinesOn = true; });
    // count the pixels that turn pinkish-red (the outline colour) when outlines are on
    return p.evaluate(async ([a, b]) => { const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
      const [A, B] = await Promise.all([load(a), load(b)]), c = document.createElement('canvas'); c.width = A.width; c.height = A.height; const g = c.getContext('2d');
      g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data; g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < da.length; i += 4) if (da[i] - db[i] > 40 && da[i] > da[i + 1] + 30) n++; return n; }, [on.toString('base64'), off.toString('base64')]); };
  const dw = await diff('behind_wall', spot.wall), dt = await diff('behind_tower', spot.tower);
  console.log('picture changes when outlines turn off: behind the wall', dw, 'pixels; behind the tower', dt, 'pixels');
  if (dw < 200 || dt < 200) throw new Error('no outline seen');
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
