// Phase 4K (Gerald): a gate goes into the wall by itself, lies along the wall, and your people walk through it every time.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done } = await start('cyyoung', { start: 0 });
  const r = await p.evaluate(() => {
    const out = {}; res.wood = 5000; const k = SD.keep(); let sp = null;
    for (let rad = 8; rad < 40 && !sp; rad++) for (let a = 0; a < 24 && !sp; a++) { const c = k.c + Math.round(Math.cos(a / 24 * 6.283) * rad) - 3, r = k.r + Math.round(Math.sin(a / 24 * 6.283) * rad) - 4; let ok = true; for (let i = 0; i < 7 && ok; i++) for (let j = 0; j < 9 && ok; j++) if (!canPlace('wall', c + i, r + j)) ok = false; if (ok) sp = { c, r }; }
    for (const [dx, dy] of [[0, 0]]) { }
    // an east-west wall and a north-south wall
    const mk = (c, r) => { const w = createBuilding('wall', c, r); finishBuilding(w); return w; };
    const row = []; for (let i = 0; i < 7; i++) row.push(mk(sp.c + i, sp.r));
    const col = []; for (let j = 1; j < 9; j++) col.push(mk(sp.c, sp.r + j));
    window.__step(2);
    const tryGate = (w) => { startPlacing('gate'); const s = SD.scr(w.x, (w.y0 + w.y1) / 2, 0); placeAt(s.x, s.y, false); T.run(8); };
    const g1 = row[3]; tryGate(g1);
    const gates = structures.filter(s => s.kind === 'gate' && !s.dead && s.c === g1.c && s.r === g1.r);
    out.gate1 = gates.length === 1 && g1.dead && gates[0].dir === 0;
    const g2w = col[4]; tryGate(g2w); const gs2 = structures.filter(s => s.kind === 'gate' && !s.dead && s.c === g2w.c && s.r === g2w.r);
    out.gate2 = gs2.length === 1 && gs2[0].dir === 1;
    // people walk through each gate
    curTeam = 'player';
    const crosses = (a, pth, g) => { let px = a.x, py = a.y; for (const q of pth) { for (let t = 0; t <= 1; t += 0.05) { const x = px + (q.x - px) * t, y = py + (q.y - py) * t; if (Math.floor(x / TILE) === g.c && Math.floor(y / TILE) === g.r) return true; } px = q.x; py = q.y; } return false; };
    const through = (g, horiz) => { const a = horiz ? { x: g.x, y: g.y0 - 40 } : { x: g.x0 - 40, y: g.y }, b = horiz ? { x: g.x, y: g.y1 + 40 } : { x: g.x1 + 40, y: g.y };
      const pth = findPath(a.x, a.y, b.x, b.y), e = pth.length ? pth[pth.length - 1] : a; return Math.hypot(e.x - b.x, e.y - b.y) < 24 && crosses(a, pth, g); };
    out.walk1 = through(gates[0], true); out.walk2 = through(gs2[0], false);
    // not on a wall: refused
    startPlacing('gate'); const far = SD.scr(k.x + 500, k.y + 400, 0); const n0 = structures.length; placeAt(far.x, far.y, false); out.refused = structures.length === n0;
    return out; });
  console.log(JSON.stringify(r));
  need(r.gate1 && r.gate2, `a gate takes the wall piece's place and lies along the wall (${r.gate1}, ${r.gate2})`);
  need(r.walk1 && r.walk2, `people walk through both gates (${r.walk1}, ${r.walk2})`);
  need(r.refused, 'away from a wall nothing is placed');
  await done();
})();
