// Phase 4C: the touch round on an iPad and on a phone, all by finger: tap a soldier to choose him and tap the ground to send
// him (he is let go); a finger box picks soldiers; Patrol drawn with a finger; a house dragged into place; citizens tapped
// onto a moat fill it; then a soldier walks over the filled square (collision and pathfinding updated) and round a wall.
const { start } = require('./lib4b'); const { devices } = require('playwright');
async function run(devName) {
  const dev = devices[devName], { p, need, done } = await start('cyyoung', { start: 0, viewport: dev.viewport, page: { ...dev } });
  const cdp = await p.context().newCDPSession(p), tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(450); };
  const drag = async (pts, holdMs) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] }); if (holdMs) await p.waitForTimeout(holdMs);
    for (const q of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q[0], y: q[1] }] }); await p.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(450); };
  // a clear patch of ground on screen, and helpers to find screen points
  await p.evaluate(() => { window.__draw = () => { window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; }; window.__scr = (x, y, h = 0) => { const cr = document.getElementById('game').getBoundingClientRect(), s = screenOf(x, y, h); return { x: s.x + cr.left, y: s.y + cr.top }; };
    const k = SD.keep(); let f = null; for (let d = 10; d < 30 && !f; d += 2) { const g = nearestFree(k.c + d, k.r + 10), x = g.c * TILE + 16, y = g.r * TILE + 16; if (!units.some(u => !u.dead && Math.hypot(u.x - x, u.y - y) < 330)) f = g; }   /* open ground with nobody else on it */ window.__O = { x: f.c * TILE + 16, y: f.r * TILE + 16 }; SD.cam.z = 1.1; SD.centerOn(window.__O.x, window.__O.y); window.__draw(); });
  const onMap = async (x, y) => p.evaluate(([x, y]) => document.elementFromPoint(x, y) === document.getElementById('game'), [x, y]);
  // 1) tap a soldier, tap the ground: he goes and is let go
  const s1 = await p.evaluate(() => { const O = window.__O, u = makeUnit('player', 'spear', O.x, O.y); u.order = 'idle'; window.__u = u; window.__draw(); return { at: window.__scr(u.x, u.y, 20 + elev3D(u)), to: window.__scr(O.x + 120, O.y + 60) }; });
  await tap(s1.at.x, s1.at.y); const chose = await p.evaluate(() => selection.has(window.__u));
  await tap(s1.to.x, s1.to.y); const sent = await p.evaluate(() => ({ order: window.__u.order, sel: selection.size }));
  // 2) a finger box (rest, then draw) picks the soldiers
  const s2 = await p.evaluate(() => { const O = window.__O, list = [0, 1, 2].map(i => { const u = makeUnit('player', 'spear', O.x - 60 + i * 30, O.y - 90); u.order = 'hold'; return u; }); window.__sq = list; window.__draw();
    const qs = list.map(u => window.__scr(u.x, u.y, 20 + elev3D(u))); return { a: [Math.min(...qs.map(q => q.x)) - 75, Math.min(...qs.map(q => q.y)) - 75], b: [Math.max(...qs.map(q => q.x)) + 40, Math.max(...qs.map(q => q.y)) + 40] }; });   /* (a box starts on open ground: a finger held on a person opens his card instead) */
  await drag([s2.a, [(s2.a[0] + s2.b[0]) / 2, (s2.a[1] + s2.b[1]) / 2], s2.b], 420); const boxed = await p.evaluate(() => window.__sq.filter(u => selection.has(u)).length);
  // 3) Patrol drawn with a finger
  await p.evaluate(() => { for (const u of window.__sq) u.order = 'idle'; });
  await p.waitForTimeout(900);   /* (a person's next tap comes a moment later; a tap at once after a lightning-fast test swipe only stops the browser's fling) */
  await p.tap('#btnPatrol'); const r = await p.evaluate(() => { const O = window.__O; return [window.__scr(O.x - 150, O.y + 120), window.__scr(O.x, O.y + 170), window.__scr(O.x + 150, O.y + 120)].map(q => [q.x, q.y]); });
  await drag(r, 0); const patrol = await p.evaluate(() => window.__sq.every(u => u.patrol && u.patrol.pts.length >= 2) && selection.size === 0);
  // 4) a house dragged into place by finger (on a phone, from the bottom bar)
  await p.evaluate(() => { SD.centerOn(window.__O.x, window.__O.y); window.__draw(); });
  await p.evaluate(() => { SD.res.wood = 5000; window.__step(2); updateHud(); });
  if (await p.evaluate(() => document.body.classList.contains('phone'))) { await p.tap('#catBar [data-cat="town"]'); await p.waitForTimeout(300); } else await p.evaluate(() => UI.showTab('town'));
  await p.tap('#side .bb[data-b="house"]'); await p.waitForTimeout(150);
  const hs = await p.evaluate(() => { const O = window.__O; const map = (x, y) => document.elementFromPoint(x, y) === document.getElementById('game'); for (let dc = -8; dc <= 8; dc += 2) for (let dr = -8; dr <= 4; dr += 2) { const c = Math.floor(O.x / TILE) + dc, r = Math.floor(O.y / TILE) + dr; if (!canPlace('house', c, r)) continue; const s = window.__scr(c * TILE + 32, r * TILE + 32); if (map(s.x, s.y) && map(s.x + 30, s.y - 20)) return { x: s.x, y: s.y, c, r, h0: structures.filter(b => b.kind === 'house').length }; } return null; });
  let placed = false;
  if (hs && await onMap(hs.x, hs.y) && await onMap(hs.x + 30, hs.y - 20)) { await drag([[hs.x + 30, hs.y - 20], [hs.x + 15, hs.y - 10], [hs.x, hs.y]], 0); placed = await p.evaluate(h0 => structures.filter(b => b.kind === 'house').length === h0 + 1 && !placing, hs.h0); }
  await p.evaluate(() => { if (placing) cancelPlacing(); selection.clear(); });   // (each step stands on its own)
  await p.waitForTimeout(900); await p.evaluate(() => { SD.centerOn(window.__O.x, window.__O.y); window.__draw(); });
  // 5) two citizens tapped onto a moat fill it; a soldier then walks straight over the filled square
  const m = await p.evaluate(() => { const O = window.__O, c = Math.floor((O.x + 40) / TILE), r0 = Math.floor((O.y - 40) / TILE); const tiles = [];
    for (let r = r0 - 3; r <= r0 + 3; r++) { const mo = createBuilding('moat', c, r); finishBuilding(mo); tiles.push(mo); } window.__moat = tiles; window.__mid = tiles[3];
    const civs = [0, 1].map(i => { const f = nearestFree(c - 3, r0 + i); return makeUnit('player', 'civ', f.c * TILE + 16, f.r * TILE + 16); }); window.__civs = civs; window.__draw();
    return { civ: window.__scr(civs[0].x, civs[0].y, 20 + elev3D(civs[0])), moat: window.__scr(window.__mid.x, (window.__mid.y0 + window.__mid.y1) / 2, 2), blocked: tileBlocked(c, r0) }; });
  await tap(m.civ.x, m.civ.y); await p.evaluate(() => selection.add(window.__civs[1]));
  await tap(m.moat.x, m.moat.y);
  const fill = await p.evaluate(() => { const ordered = window.__civs.some(u => u.order === 'fill'); for (let i = 0; i < 90 && !window.__mid.dead; i++) T.run(1);
    const c = window.__mid.c, r = window.__mid.r, open = !tileBlocked(c, r);
    // a soldier from the far side walks across the filled square (not round the moat)
    const a = { x: (c - 3) * TILE + 16, y: r * TILE + 16 }, b = { x: (c + 3) * TILE + 16, y: r * TILE + 16 }, pth = findPath(a.x, a.y, b.x, b.y), len = pth.reduce((s, q, i) => s + (i ? Math.hypot(q.x - pth[i - 1].x, q.y - pth[i - 1].y) : Math.hypot(q.x - a.x, q.y - a.y)), 0);
    // and a wall there afterwards: the way goes round it
    const w = createBuilding('wall', c, r); finishBuilding(w); const pth2 = findPath(a.x, a.y, b.x, b.y), through = pth2.some(q => Math.floor(q.x / TILE) === c && Math.floor(q.y / TILE) === r);
    return { ordered, filled: window.__mid.dead, open, straight: Math.round(len), round: !through && pth2.length > 0 }; });
  console.log(devName, JSON.stringify({ chose, sent, boxed, patrol, placed, hs: !!hs, m: { blockedBefore: m.blocked }, fill }));
  need(chose && sent.order === 'move' && sent.sel === 0, `${devName}: tap a soldier, tap the ground: he goes and is let go`);
  need(boxed === 3, `${devName}: a finger box picks the soldiers`);
  need(patrol, `${devName}: a patrol drawn with a finger`);
  need(placed, `${devName}: a house dragged into place with a finger`);
  need(m.blocked && fill.ordered && fill.filled && fill.open, `${devName}: citizens tapped onto a moat fill it, and the square opens`);
  need(fill.straight > 0 && fill.straight < 6 * 32 + 60 && fill.round, `${devName}: the way goes straight over the filled square, and round a wall`);
  await done();
}
(async () => { await run('iPad (gen 7) landscape'); if (process.env.ONE) return; await run('iPhone 13'); })();
