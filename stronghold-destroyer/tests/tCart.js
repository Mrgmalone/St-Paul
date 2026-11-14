// Phase 4D step D4 (bug sweep): a quarry's ox cart always delivers. Found in the long games: when the spot beside the
// keep that the cart chose was an open pocket walled in by other buildings, the cart waited outside with its load
// forever, and stone stayed at nothing. Now each trip heads for a spot it can really reach.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done } = await start('cyyoung', { start: 0 });
  const r = await p.evaluate(() => { SD.res.wood = 5000; window.__step(4); growCastle(); window.__step(10);
    const k = SD.keep(), c = makeUnit('player', 'oxcart', (k.c + 9) * TILE + 16, (k.r + 1) * TILE + 16), q = T.put('quarry') || k;
    c.home = q; c.order = 'cart'; c.sub = 'haul'; c.carry = 24; c.carryType = 'stone';
    const ap = approachPoint(c, k), pc = Math.floor(ap.x / TILE), pr = Math.floor(ap.y / TILE); let walls = 0;
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) { if (!dc && !dr) continue; if (canPlace('wall', pc + dc, pr + dr)) { const w = createBuilding('wall', pc + dc, pr + dr); finishBuilding(w); walls++; } }
    const s0 = SD.res.stone; T.run(90); return { walls, delivered: Math.round(SD.res.stone - s0), sub: c.sub }; });
  need(r.walls >= 3 && r.delivered >= 24, `the cart delivers even when the nearest spot by the keep is walled in (${r.delivered} stone; ${r.walls} walls round that spot)`);
  // and an ordinary quarry keeps the stone coming
  const r2 = await p.evaluate(() => { const k = SD.keep(), rk = rocks.filter(x => !x.gone && !x.iron).sort((a, b) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b.x - k.x, b.y - k.y)); let q = null;
    outer: for (const x of rk.slice(0, 12)) for (let dc = -4; dc <= 3; dc++) for (let dr = -4; dr <= 3; dr++) { const c = Math.floor(x.x / TILE) + dc, r = Math.floor(x.y / TILE) + dr; if (canPlace('quarry', c, r)) { q = createBuilding('quarry', c, r); finishBuilding(q); break outer; } }
    T.people(4); const s0 = SD.res.stone; T.run(240); return { stone: Math.round(SD.res.stone - s0), quarry: !!q }; });
  need(r2.quarry && r2.stone >= 60, `an ordinary quarry and its cart bring stone home (${r2.stone} in four minutes)`);
  console.log(JSON.stringify({ r, r2 })); await done();
})();
