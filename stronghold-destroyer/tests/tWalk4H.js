// Phase 4H (Gerald): "there was also some glitching... when they go near the greenery. Remove any glitching: even if people
// are in the way they do not glitch. They should just go around that person."
// Measured in the real game: twelve people walking through the forest, ten soldiers walking through a line of people
// standing in their way, and ten people picking berries five to a bush. Before the fix: 59 and 52 back-and-forth turns a
// minute of walking, 102 and 71 sudden turns of the head, and pickers shifting 4.9 points a second while at work.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done } = await start('cyyoung', { start: 0 });
  const r = await p.evaluate((variant) => {
    if (variant === 'noSep') window.separate = () => {}; if (variant === 'noSlide') window.slideAround = () => {}; if (variant === 'noSettle') window.settleSpot = () => {};
    // per step: for each tracked unit, its step this frame; count turns of more than 100 degrees (back and forth), and the
    // drawn heading's swings (as the 3D view turns the figure), and shaking while standing at work
    const track = (list, secs, pred) => {
      const st = new Map(); for (const u of list) st.set(u, { px: u.x, py: u.y, dx: 0, dy: 0, head: null, flips: 0, turns: 0, movT: 0, workShake: 0, workT: 0, swing: 0 });
      for (let i = 0; i < secs * 20; i++) { window.__step(1);
        for (const u of list) { if (u.dead) continue; const s = st.get(u), dx = u.x - s.px, dy = u.y - s.py, d = Math.hypot(dx, dy);
          if (pred && !pred(u)) { s.px = u.x; s.py = u.y; continue; }
          if (s.sub !== u.sub || !u.moving) { s.dx = 0; s.dy = 0; s.head = null; s.dh = null; } s.sub = u.sub;   /* (a new errand, or a stop: turning round then is no twitch) */
          if (u.moving && u.path && u.path.length) { const wp = u.path[0], hh = Math.atan2(wp.x - u.x, wp.y - u.y); if (Math.hypot(wp.x - u.x, wp.y - u.y) > 2) { if (s.dh !== null && s.dh !== undefined && s.wp === wp) { let a = Math.abs(hh - s.dh); if (a > Math.PI) a = 2 * Math.PI - a; s.dswing = (s.dswing || 0) + a; } s.dh = hh; s.wp = wp; } }
          if (u.moving) { s.movT += 0.05; if (d > 0.3 && Math.hypot(s.dx, s.dy) > 0.3) { const c = (dx * s.dx + dy * s.dy) / (d * Math.hypot(s.dx, s.dy)); if (c < -0.17) s.turns++; }
            if (d > 0.1) { const h = Math.atan2(dx, dy); if (s.head !== null) { let a = Math.abs(h - s.head); if (a > Math.PI) a = 2 * Math.PI - a; s.swing += a; if (a > 1.2) s.flips++; } s.head = h; } }
          else if (u.sub === 'work' || u.order === 'idle') { s.workT += 0.05; s.workShake += d; }
          if (d > 0.3) { s.dx = dx; s.dy = dy; } s.px = u.x; s.py = u.y; } }
      let movT = 0, turns = 0, flips = 0, swing = 0, workT = 0, shake = 0, dsw = 0; for (const s of st.values()) { dsw += s.dswing || 0; movT += s.movT; turns += s.turns; flips += s.flips; swing += s.swing; workT += s.workT; shake += s.workShake; }
      return { walkSecs: Math.round(movT), backTurnsPerMin: +(turns / Math.max(1, movT) * 60).toFixed(1), headFlipsPerMin: +(flips / Math.max(1, movT) * 60).toFixed(1), swingDegPerSec: Math.round(swing / Math.max(1, movT) * 57.3), drawnSwingDegPerSec: Math.round(dsw / Math.max(1, movT) * 57.3), standSecs: Math.round(workT), shakePtsPerSec: +(shake / Math.max(1, workT)).toFixed(2) };
    };
    const k = SD.keep(), out = {};
    for (const u of units) if (u.team === 'player' && u.type === 'civ') { u.dead = true; u.hp = 0; } window.__step(2);
    // A: twelve people walk through the forest (the nearest trees beyond the castle)
    const T0 = trees.filter(t => !t.gone).sort((a, b) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b.x - k.x, b.y - k.y))[30];
    const A = []; for (let i = 0; i < 12; i++) { const f = nearestFree(Math.floor(T0.x / TILE) - 6 + (i % 4), Math.floor(T0.y / TILE) - 2 + Math.floor(i / 4)); A.push(makeUnit('player', i % 2 ? 'civ' : 'spear', f.c * TILE + 16, f.r * TILE + 16)); }
    const goA = nearestFree(Math.floor(T0.x / TILE) + 8, Math.floor(T0.y / TILE) + 2);
    for (const u of A) { u.manualT = time; commandMove([u], goA.c * TILE + 16 + RR(-30, 30), goA.r * TILE + 16 + RR(-30, 30)); }
    out.A_forest = track(A, 25);
    for (const u of A) { u.dead = true; u.hp = 0; } window.__step(2);
    // B: ten soldiers walk through eight people standing in a line across their way
    const f0 = nearestFree(k.c + 6, k.r + 8), bx = f0.c * TILE + 16, by = f0.r * TILE + 16, B = [], wall = [];
    for (let i = 0; i < 8; i++) { const w = makeUnit('player', 'civ', bx + 140, by - 100 + i * 26); w.manualT = time + 999; w.order = 'idle'; wall.push(w); }
    for (let i = 0; i < 10; i++) B.push(makeUnit('player', 'spear', bx + (i % 2) * 20, by - 50 + i * 10));
    for (const u of B) commandMove([u], bx + 300, by + RR(-40, 40));
    out.B_throughPeople = track(B, 15);
    out.B_standersShake = track(wall, 1, () => true).shakePtsPerSec;
    for (const u of B.concat(wall)) { u.dead = true; u.hp = 0; } window.__step(2);
    // C: people picking berries, five to a bush
    const bs = bushes.filter(b => b.amount > 5).sort((a, b) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b.x - k.x, b.y - k.y)).slice(0, 2), C = [];
    for (const bu of bs) for (let i = 0; i < 5; i++) { const f = nearestFree(Math.floor(bu.x / TILE) + (i % 3) - 1, Math.floor(bu.y / TILE) + 2); const u = makeUnit('player', 'civ', f.c * TILE + 16, f.r * TILE + 16); u.manualT = time; bu.amount = 999; commandGather([u], bu); C.push(u); }
    window.__step(60); out.C_berries = track(C, 25, u => u.order === 'gather');
    return out; }, '');
  console.log(JSON.stringify(r));
  const A = r.A_forest, B = r.B_throughPeople, C = r.C_berries;
  need(A.backTurnsPerMin < 20 && A.headFlipsPerMin < 30 && A.shakePtsPerSec < 1.5, `walking through the forest: no back-and-forth, no twitching (${JSON.stringify(A)})`);
  need(B.backTurnsPerMin < 15 && B.headFlipsPerMin < 15 && B.drawnSwingDegPerSec < 40, `walking through people standing in the way: they go round (${JSON.stringify(B)})`);
  need(r.B_standersShake < 0.5, `the people standing are not shoved about (${r.B_standersShake} points a second)`);
  need(C.shakePtsPerSec < 1.5 && C.headFlipsPerMin < 20, `picking berries, five to a bush: each in his own place, no shoving (${JSON.stringify(C)})`);
  need(A.walkSecs > 60 && B.walkSecs > 20 && C.standSecs > 100, 'they really walked and worked');
  await done();
})();
