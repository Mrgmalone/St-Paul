// Phase 4C step C2: mouse-edge scrolling is much slower than the keys and eases in; a box drawn round a crowd picks the
// soldiers (mouse and finger); while placing, a finger drags the building's outline and lifting it sets the building down;
// a wall is drawn from where the finger lands to where it lifts; the Turn button says "faces toward you" / "away from you".
const { start } = require('./lib4b');
(async () => {
  const { p, need, done, SP } = await start('cyyoung', { start: 0, viewport: { width: 1180, height: 820 }, page: { hasTouch: true } });
  const cdp = await p.context().newCDPSession(p);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  // ---- edge scrolling: at the edge of the game's own picture (not the window), slower than the keys, easing in ----
  const sc = await p.evaluate(() => { const R = document.getElementById('game').getBoundingClientRect(), mid = (R.top + R.bottom) / 2, k = SD.keep(); SD.centerOn(k.x + 300, k.y);
    const run = f => { const x0 = cam.x; f(); const steps = []; for (let i = 0; i < 30; i++) { window.__step(1); steps.push(cam.x); } keys.ArrowRight = false; edge.on = false; return { moved: cam.x - x0, first: steps[0] - x0, steps }; };
    const kb = run(() => { keys.ArrowRight = true; }); SD.centerOn(k.x + 300, k.y); window.__step(30);
    const ed = run(() => { edge.on = true; edge.x = R.right - 2; edge.y = mid; edge.touchUntil = 0; });
    SD.centerOn(k.x + 300, k.y); window.__step(30); const half = run(() => { edge.on = true; edge.x = R.right - CONTROLS.edgeZone / 2; edge.y = mid; edge.touchUntil = 0; });
    return { kb: Math.round(kb.moved), edge: Math.round(ed.moved), half: Math.round(half.moved), edgeFirst: +ed.first.toFixed(2), edgeLast: +(ed.steps[29] - ed.steps[28]).toFixed(2), gameRight: Math.round(R.right), win: innerWidth }; });
  console.log('scroll', JSON.stringify(sc));
  need(sc.edge > 0 && sc.edge < sc.kb * 0.5, 'edge scrolling is much slower than the keys');
  need(sc.half > 0 && sc.half < sc.edge, 'the deeper into the edge band, the faster (up to the limit)');
  need(sc.edgeFirst < sc.edgeLast, 'edge scrolling eases in');
  // with the real mouse: at the game's right edge (beside the command panel) it scrolls; over the panel, or off the game, it does not
  const R = await p.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { right: r.right, top: r.top, bottom: r.bottom, left: r.left }; }), my = (R.top + R.bottom) / 2;
  const moveAndRun = async (x, y) => { await p.evaluate(() => { edge.on = false; const k = SD.keep(); SD.centerOn(k.x + 300, k.y); window.__step(30); }); await p.mouse.move(x - 6, y); await p.mouse.move(x, y);
    return p.evaluate(() => { edge.touchUntil = 0; for (let i = 0; i < 20; i++) window.__step(1); const x0 = cam.x; for (let i = 0; i < 30; i++) window.__step(1); return Math.round(cam.x - x0); }); };   /* (after the gentle stop has finished) */
  const atGameEdge = await moveAndRun(R.right - 3, my), overPanel = await moveAndRun(R.right + 40, my), offWindow = await p.evaluate(() => { edge.on = false; const x0 = cam.x; for (let i = 0; i < 30; i++) window.__step(1); return Math.round(cam.x - x0); });
  console.log('mouse edge', JSON.stringify({ atGameEdge, overPanel, offWindow }));
  need(atGameEdge > 0, "the mouse at the edge of the game's picture scrolls that way");
  need(overPanel === 0 && offWindow === 0, 'over the command panel, or off the game, it does not scroll');
  // the player's scroll speed in Settings: Fast scrolls further than Slow
  const speed = await p.evaluate(() => { const R = document.getElementById('game').getBoundingClientRect(), k = SD.keep(), out = {};
    for (const s of ['slow', 'fast']) { document.querySelector(`#menuPop .sbtn[data-s="${s}"]`).click(); SD.centerOn(k.x + 300, k.y); window.__step(30); const x0 = cam.x; edge.on = true; edge.x = R.right - 2; edge.y = (R.top + R.bottom) / 2; edge.touchUntil = 0; for (let i = 0; i < 30; i++) window.__step(1); edge.on = false; out[s] = Math.round(cam.x - x0); }
    document.querySelector('#menuPop .sbtn[data-s="medium"]').click(); out.buttons = document.querySelectorAll('#menuPop .sbtn').length; return out; });
  console.log('scroll speed', JSON.stringify(speed));
  need(speed.buttons === 3 && speed.fast > speed.slow * 2, 'Settings: the scroll speed (Slow, Medium, Fast) changes how fast it scrolls');
  // ---- box selection picks the soldiers ----
  const box = await p.evaluate(() => { const k = SD.keep(); paused = true; const f = nearestFree(k.c + 6, k.r + 8), x0 = f.c * TILE + 16, y0 = f.r * TILE + 16, made = [];
    ['spear', 'civ', 'archer', 'civ', 'sword', 'civ'].forEach((t, i) => { const u = makeUnit('player', t, x0 + (i % 3) * 30, y0 + Math.floor(i / 3) * 30); u.order = 'hold'; made.push(u); });
    SD.cam.z = 1.2; SD.centerOn(x0 + 30, y0 + 15); window.__drawMs = 0; window.__step(2); window.__drawMs = 999999; window.__made = made;
    const cr = document.getElementById('game').getBoundingClientRect(), qs = made.map(u => screenOf(u.x, u.y, 20 + elev3D(u))), a = { x: Math.min(...qs.map(q => q.x)) - 30, y: Math.min(...qs.map(q => q.y)) }, b = { x: Math.max(...qs.map(q => q.x)) + 30, y: Math.max(...qs.map(q => q.y)) };   /* (frame the group on the screen: the view is turned) */
    window.__boxAt = made.map(u => [u.type, Math.round(u.x), Math.round(u.y)]); return { ax: a.x + cr.left, ay: a.y + cr.top - 30, bx: b.x + cr.left, by: b.y + cr.top + 30 }; });
  await p.mouse.move(box.ax, box.ay); await p.mouse.down(); await p.mouse.move((box.ax + box.bx) / 2, (box.ay + box.by) / 2, { steps: 4 }); await p.mouse.move(box.bx, box.by, { steps: 4 }); await p.mouse.up();
  const mBox = await p.evaluate(() => ({ n: selection.size, soldiers: [...selection].every(u => u.type !== 'civ'), made: window.__made.map(u => [u.type, Math.round(u.x), Math.round(u.y), u.dead, selection.has(u)]) }));
  await p.evaluate(() => selection.clear());
  await touch('touchStart', box.ax, box.ay); await p.waitForTimeout(420); await touch('touchMove', (box.ax + box.bx) / 2, (box.ay + box.by) / 2); await touch('touchMove', box.bx, box.by); await touch('touchEnd');
  const tBox = await p.evaluate(() => ({ n: selection.size, soldiers: [...selection].every(u => u.type !== 'civ') }));
  console.log('box', JSON.stringify({ mBox, tBox }));
  need(mBox.n === 3 && mBox.soldiers, 'a mouse box picks the three soldiers, not the civilians');
  need(tBox.n === 3 && tBox.soldiers, 'a finger box picks the three soldiers, not the civilians');
  // ---- placing by dragging with a finger ----
  await p.evaluate(() => { selection.clear(); for (const u of window.__made) u.dead = true; SD.res.wood = 5000; SD.res.stone = 1000; paused = false; window.__step(2); startPlacing('house'); });
  const pl = await p.evaluate(() => { const k = SD.keep(), cr = document.getElementById('game').getBoundingClientRect(); let a = null, b = null;
    for (let rad = 5; rad < 14 && !b; rad++) { const f = nearestFree(k.c + rad, k.r + 6); if (f && canPlace('house', f.c, f.r)) { const s = screenOf(f.c * TILE + 32, f.r * TILE + 32, 0); b = { x: s.x + cr.left, y: s.y + cr.top, c: f.c, r: f.r }; } }
    const s0 = screenOf(k.x + 60, k.y + 200, 0); a = { x: s0.x + cr.left, y: s0.y + cr.top }; return { a, b, label: document.getElementById('turnDir').textContent, houses: structures.filter(s => s.kind === 'house').length }; });
  await touch('touchStart', pl.a.x, pl.a.y); await touch('touchMove', (pl.a.x + pl.b.x) / 2, (pl.a.y + pl.b.y) / 2); await touch('touchMove', pl.b.x, pl.b.y);
  const mid = await p.evaluate(() => ({ placing: !!placing, ghostAt: [Math.round(mouse.x), Math.round(mouse.y)] }));
  await touch('touchEnd');
  const placed = await p.evaluate(h0 => { const hs = structures.filter(s => s.kind === 'house'); return { houses: hs.length - h0, last: hs.length ? [hs[hs.length - 1].c, hs[hs.length - 1].r] : null }; }, pl.houses);
  console.log('place', JSON.stringify({ label: pl.label, mid, placed, target: [pl.b.c, pl.b.r] }));
  need(/toward you/.test(pl.label), 'the Turn button says the building faces toward you');
  need(mid.placing && placed.houses === 1 && Math.abs(placed.last[0] - pl.b.c) <= 1 && Math.abs(placed.last[1] - pl.b.r) <= 1, 'a finger drags the house to its spot and lifting sets it down there');
  // ---- a wall drawn with one finger stroke ----
  const wl = await p.evaluate(() => { startPlacing('wall'); const k = SD.keep(), cr = document.getElementById('game').getBoundingClientRect(); const a = screenOf(k.x + 250, k.y + 330, 0), b = screenOf(k.x + 250 + 6 * TILE, k.y + 330, 0);
    return { a: { x: a.x + cr.left, y: a.y + cr.top }, b: { x: b.x + cr.left, y: b.y + cr.top }, w0: structures.filter(s => s.kind === 'wall' && !s.castleRing).length }; });
  await touch('touchStart', wl.a.x, wl.a.y); await touch('touchMove', (wl.a.x + wl.b.x) / 2, wl.a.y); await touch('touchMove', wl.b.x, wl.b.y); await touch('touchEnd');
  const walls = await p.evaluate(w0 => structures.filter(s => s.kind === 'wall' && !s.castleRing).length - w0, wl.w0);
  console.log('wall pieces', walls);
  need(walls >= 5, 'a wall is drawn from where the finger lands to where it lifts');
  await done();
})();
