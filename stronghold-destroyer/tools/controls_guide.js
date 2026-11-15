// Phase 4E: the troop controls guide. Takes pictures of the real diamond (and the formations, and a phone screen) from
// the game itself, numbers every button, and writes design/Troop-Controls-Guide.pdf plus a picture of the diamond with
// its numbers, design/Troop-Diamond.png. The names and descriptions come from the buttons themselves, so the guide
// says what the game says.
// usage, from the stronghold-destroyer folder:   node tools/controls_guide.js
const { chromium, devices } = require('playwright'); const env = require('../tests/env'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, '..', 'design');
const b64 = buf => 'data:image/png;base64,' + buf.toString('base64'), j64 = buf => 'data:image/jpeg;base64,' + buf.toString('base64');
const JPG = { type: 'jpeg', quality: 84 };   // (photos of the game as JPEG keep the PDF small)

async function game(dev, scale) {
  const b = await chromium.launch(env.LAUNCH);
  const ctx = await b.newContext(dev ? { ...dev, deviceScaleFactor: scale || dev.deviceScaleFactor } : { viewport: { width: 1280, height: 860 }, deviceScaleFactor: scale || 2 });
  const p = await ctx.newPage(); await env.use3d(p, { drawMs: 0 });   /* (every frame drawn: the pictures must be current) */
  await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
  await p.goto(env.GAME_REAL + '?start=0'); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
  await p.click('.fac[data-fac="cyyoung"]'); await p.click('.fac[data-fac="cyyoung"] .fgo'); await p.waitForTimeout(200);
  await p.evaluate(() => { window.__step(4); document.getElementById('banner').style.display = 'none'; SD.setRaid(99999); REALM.rogueT = 1e9; for (const R of REALM.rivals) R.raidT = 1e9; const t = document.getElementById('tips'); if (t) t.classList.add('gone4e'); });
  return { b, p };
}
// open ground near the keep, cleared of trees and rocks (as woodcutters would), with six or ten soldiers on it
const OPEN = n => {
  const k = playerKeep(), inSq = (x, y, c0, r0) => x >= c0 * TILE && x < (c0 + 18) * TILE && y >= r0 * TILE && y < (r0 + 18) * TILE; let spot = null;
  for (let rad = 14; rad < 80 && !spot; rad += 3) for (let a = 0; a < 16 && !spot; a++) { const c0 = Math.round(k.c + Math.cos(a / 16 * 6.283) * rad) - 9, r0 = Math.round(k.r + Math.sin(a / 16 * 6.283) * rad) - 9;
    if (c0 < 2 || r0 < 2 || c0 + 20 > COLS || r0 + 20 > ROWS) continue;
    if (structures.concat(farms).some(b => !b.dead && b.x1 > c0 * TILE && b.x0 < (c0 + 18) * TILE && b.y1 > r0 * TILE && b.y0 < (r0 + 18) * TILE)) continue;
    let wet = false; for (let c = c0; c < c0 + 18 && !wet; c++) for (let rr = r0; rr < r0 + 18 && !wet; rr++) if (riverTile[rr * COLS + c]) wet = true; if (wet) continue;
    for (const t of trees.slice()) if (!t.gone && inSq(t.x, t.y, c0, r0)) fellTree(t);
    for (const q of rocks) if (!q.gone && inSq(q.x, q.y, c0, r0)) { q.gone = true; setBlock(Math.floor(q.x / TILE), Math.floor(q.y / TILE), 0); }
    spot = { x: (c0 + 9) * TILE, y: (r0 + 9) * TILE }; }
  window.__guide = []; for (let i = 0; i < n; i++) window.__guide.push(makeUnit('player', i % 5 === 4 ? 'archer' : 'spear', spot.x - 60 + (i % 5) * 26, spot.y + 40 + Math.floor(i / 5) * 26));
  window.__spot = spot; selectOnly(window.__guide); window.__step(2); updateHud(); return spot;
};

(async () => {
  // ---------- 1. the diamond on an iPad, every button numbered ----------
  let { b, p } = await game(devices['iPad (gen 7) landscape'], 2);
  await p.evaluate(OPEN, 6);
  const parts = await p.evaluate(() => {
    const D = document.getElementById('diamond'), r0 = D.getBoundingClientRect(), side = D.querySelector('.dside').getBoundingClientRect();
    const order = ['dMoveUp', 'dMoveRight', 'dMoveDown', 'dMoveLeft', 'dMarch', 'btnPatrol', 'btnGuardA', 'camAdd', 'btnStop', 'btnPeople', 'btnSold', 'camHome', 'btnClear', 'btnAll', 'btnCiv'];
    const clip = { x: r0.left - 14, y: r0.top - 14, width: side.right - r0.left + 28, height: r0.height + 28 };
    return { clip, items: order.map(id => { const e = document.getElementById(id), r = e.getBoundingClientRect(); const sat = e.classList.contains('dsat'), off = sat ? 19 : 24; return { id, name: e.dataset.dname, sub: e.dataset.dsub || '', x: r.left + r.width / 2 - clip.x - off, y: r.top + r.height / 2 - clip.y - off }; }) };
  });
  const diamondPic = await p.screenshot({ clip: parts.clip });   /* (PNG: crisp buttons) */
  // the formations, open above the diamond
  await p.evaluate(() => document.getElementById('dMarch').click()); await p.waitForTimeout(100);
  const fanInfo = await p.evaluate(() => { const f = document.getElementById('dFan').getBoundingClientRect(), D = document.getElementById('diamond').getBoundingClientRect();
    return { clip: { x: Math.min(f.left, D.left) - 12, y: f.top - 12, width: Math.max(f.right, D.right) - Math.min(f.left, D.left) + 24, height: D.bottom - f.top + 24 }, list: [...document.querySelectorAll('#dFan .dfm')].map(b => ({ f: b.dataset.f, name: b.dataset.dname, sub: b.dataset.dsub })) }; });
  const fanPic = await p.screenshot({ clip: fanInfo.clip, ...JPG });
  await p.evaluate(() => document.getElementById('dMarch').click());
  // each formation, ten soldiers on open ground, seen from above in the flat view
  await p.evaluate(() => { for (const u of window.__guide) u.dead = true; window.__step(2); setView(false); for (const id of ['diamond', 'btnTrophy', 'mini', 'tips', 'alertBar']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; } });
  await p.evaluate(OPEN, 10);
  const shapes = [];
  for (const f of fanInfo.list) {
    await p.evaluate(k => { const l = window.__guide, s = window.__spot;   /* start in a block below, march up the screen: a line reads across, a wedge points up */
      l.forEach((u, i) => { u.order = 'idle'; u.path = []; u.march = null; u.formed = null; u.x = s.x - 52 + (i % 5) * 26; u.y = s.y + 150 + Math.floor(i / 5) * 26; });
      commandMarch(l, s.x, s.y - 10, k); for (let i = 0; i < 20 * 16; i++) window.__step(1);
      speeches.length = 0; floats.length = 0; for (const u of l) { u.sick = 0; u.toHeal = false; }   /* (no speech bubbles or floating words in the picture) */
      cam.z = 1.6; centerOn(l.reduce((a, u) => a + u.x, 0) / l.length, l.reduce((a, u) => a + u.y, 0) / l.length); selection.clear(); window.__step(3); }, f.f);
    const c = await p.evaluate(() => { const g = document.getElementById('game').getBoundingClientRect(); return { x: g.left + g.width / 2 - 190, y: g.top + g.height / 2 - 150, width: 380, height: 300 }; });
    shapes.push({ ...f, pic: await p.screenshot({ clip: c, ...JPG }) });
  }
  await b.close();
  // ---------- 2. a phone: the diamond, the top bar in pictures, the tabs ----------
  ({ b, p } = await game(devices['iPhone 13'], 2));
  await p.evaluate(OPEN, 6); await p.evaluate(() => { const s = window.__spot; centerOn(s.x, s.y); updateHud(); window.__step(3); });
  const phonePic = await p.screenshot(JPG);
  await b.close();

  // ---------- 3. the picture of the diamond, numbered ----------
  const marks = parts.items.map((it, i) => `<div class="mk" style="left:${it.x}px;top:${it.y}px">${i + 1}</div>`).join('');
  const legend = parts.items.map(it => `<li><b>${it.name}</b>${it.sub ? ' — ' + it.sub : ''}</li>`).join('');
  const css = `body{margin:0;background:#15100a;color:#fff3d6;font-family:Georgia,'Times New Roman',serif}
    @page{size:Letter;margin:0} .page{width:8.5in;height:11in;box-sizing:border-box;padding:0.42in 0.5in;overflow:hidden;page-break-after:always;break-after:page}
    h1{font-size:30px;color:#f1d38f;margin:0 0 6px} h2{font-size:22px;color:#f1d38f;margin:14px 0 6px}
    p,li{font-size:17px;line-height:1.38} ol,ul{padding-left:24px;margin:4px 0} li{margin:2px 0}
    .pic{position:relative;display:inline-block;flex-shrink:0;border:2px solid #b8913f;border-radius:12px;overflow:hidden;background:#000}   /* (never squeezed: the right edge holds buttons 14 and 15) */
    .pic img{display:block} .mk{position:absolute;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;background:#e2b13c;color:#1b1209;
      font:bold 15px Arial,sans-serif;line-height:24px;text-align:center;border:2px solid #fff3d6;box-shadow:0 1px 4px #000}
    .row{display:flex;gap:22px;align-items:flex-start} .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .shape{border:2px solid #b8913f;border-radius:10px;overflow:hidden;background:#000} .shape img{display:block;width:100%} .shape div{padding:5px 7px;font-size:13.5px;line-height:1.3}
    .shape b{color:#f1d38f;font-size:16px} .lg li{font-size:15.5px;line-height:1.3;margin:1px 0} small{color:#d9c79f}`;
  const half = 0.5;   // the pictures were taken at twice the size
  const diamondHtml = `<div class="pic" style="width:${parts.clip.width}px;height:${parts.clip.height}px"><img src="${b64(diamondPic)}" style="width:${parts.clip.width}px">${marks}</div>`;
  fs.writeFileSync(path.join(OUT, '.guide-diamond.html'), `<!doctype html><meta charset="utf-8"><style>${css} body{display:inline-block}</style>
    <div class="page" style="width:${parts.clip.width + 580}px"><h1>The troop diamond</h1><div class="row">${diamondHtml}<ol style="max-width:430px;margin:0">${legend}</ol></div></div>`);
  // ---------- 4. the guide ----------
  const html = `<!doctype html><meta charset="utf-8"><title>Stronghold Destroyer: Troop Controls</title><style>${css}
    .big{zoom:1.55;margin:4px auto 10px} .cols{columns:2;column-gap:26px} .cols li{break-inside:avoid} .center{text-align:center}
    .grid2{display:grid;grid-template-columns:repeat(3,1fr);gap:12px} .grid2 .shape div{font-size:14.5px;line-height:1.3} .grid2 .shape b{font-size:17px} .cols.lg li{font-size:17px;line-height:1.32}</style>
  <div class="page"><h1>Stronghold Destroyer — Troop Controls</h1>
    <p>The troop controls are a diamond at the bottom left of the screen, on a computer, an iPad and a phone. Choose soldiers first (tap one, draw a box round several, or tap the crossed swords, 11, to choose them all), then use the diamond. Touch any button, or hover over it with the mouse, to see its name.</p>
    <div class="center">${diamondHtml.replace('class="pic"', 'class="pic big"')}</div>
    <h2>What each button does</h2><ol class="lg cols">${legend}</ol></div>
  <div class="page"><h1>Good to know</h1><ul>
      <li>Tap the ground with soldiers chosen and they march there in the formation you chose (or in a neat block when the formation is Free).</li>
      <li>They march at the pace of the slowest, so they arrive together, and stand facing the way they went.</li>
      <li>The green number on the middle button is how many are chosen. With nobody chosen the order buttons are dimmed; a dimmed button says why.</li>
      <li>Soldiers in a formation stay in it until you give them a new order.</li>
      <li>One tap puts away a hint, a message or the Art of War advice. A double tap (or double click) on any box, away from its buttons, closes it.</li></ul>
    <h1 style="margin-top:22px">Formations</h1>
    <p>Tap the two walking soldiers in the middle of the diamond (5): the formations open above it. Choose one and the chosen soldiers form up where they stand; then tap the ground and they march there in that shape. Any number works, from 3 to 30 or more.</p>
    <div class="center"><div class="pic"><img src="${j64(fanPic)}" style="width:${Math.round(fanInfo.clip.width * 1.25)}px"></div></div>
    <p>The seven shapes, left to right in the row above: ${shapes.map(s => '<b>' + s.name + '</b>').join(' · ')}. Pictures of each are on the next page.</p></div>
  <div class="page"><h1>The seven formations</h1><p>Ten soldiers each (spearmen, with a bowman in every five), seen from above, after marching up the page.</p>
    <div class="grid2">${shapes.map(s => `<div class="shape"><img src="${j64(s.pic)}"><div><b>${s.name}</b> — ${s.sub}</div></div>`).join('')}</div></div>
  <div class="page"><h1>On a phone</h1>
    <p>The same diamond sits above the five list tabs. The top bar shows pictures and numbers only: the faction's shield, food, wood, stone, gold, people (12/15), happiness (a number) and taxes (dots: none, one, two). The tabs show their pictures, and the open tab shows its name. Touch any of them to see its name.</p>
    <div class="center"><div class="pic"><img src="${j64(phonePic)}" style="width:430px"></div></div></div>`;
  fs.writeFileSync(path.join(OUT, '.guide.html'), html);
  const b2 = await chromium.launch(); const pg = await b2.newPage({ deviceScaleFactor: 2 });
  await pg.goto('file://' + path.join(OUT, '.guide-diamond.html'));
  const box = await pg.evaluate(() => { const r = document.querySelector('.page').getBoundingClientRect(); return { x: 0, y: 0, width: Math.ceil(r.width), height: Math.ceil(r.height) }; });
  await pg.setViewportSize({ width: box.width, height: box.height });
  await pg.screenshot({ path: path.join(OUT, 'Troop-Diamond.png'), clip: box });
  await pg.goto('file://' + path.join(OUT, '.guide.html'));
  await pg.pdf({ path: path.join(OUT, 'Troop-Controls-Guide.pdf'), format: 'Letter', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await b2.close();
  fs.unlinkSync(path.join(OUT, '.guide.html')); fs.unlinkSync(path.join(OUT, '.guide-diamond.html'));
  console.log('written', path.join(OUT, 'Troop-Controls-Guide.pdf'), path.join(OUT, 'Troop-Diamond.png'), 'formations', shapes.length);
})();
