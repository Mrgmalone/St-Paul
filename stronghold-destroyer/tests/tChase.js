// Phase 4D bug sweep: a soldier who goes for a foe by himself (an idle soldier with a foe close by) does not chase it
// across the map. Past the leash (CHASE_LEASH, 360 points from where the fight began) he walks back. Before, a rival
// scout that came near and went home drew your soldiers into the rival's castle, where they died, and each death
// takes 3 from happiness. A fight the player orders (commandAttack) still goes as far as the player sends them.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done } = await start('cyyoung', { start: 0 });
  const r = await p.evaluate(() => {
    const k = playerKeep(), cx = COLS * TILE / 2, cy = ROWS * TILE / 2, d0 = Math.hypot(cx - k.x, cy - k.y) || 1;
    const dir = { x: (cx - k.x) / d0, y: (cy - k.y) / d0 };   // toward the middle of the map, where there is room
    const trial = explicit => {
      const f0 = nearestFree(Math.floor((k.x + dir.x * 220) / TILE), Math.floor((k.y + dir.y * 220) / TILE));
      const x0 = f0.c * TILE + 16, y0 = f0.r * TILE + 16;
      const s = makeUnit('player', 'spear', x0, y0); s.maxHp = s.hp = 99999;
      const foe = makeUnit('enemy', 'spear', x0 + dir.x * 80, y0 + dir.y * 80); foe.maxHp = foe.hp = 99999; foe.dmg = 0;
      window.__step(4);
      const engaged = s.order === 'attack' && s.target === foe;
      if (explicit) commandAttack([s], foe);
      let far = 0;
      for (let i = 0; i < 20 * 40; i++) {   // 40 seconds: the foe runs off at 60 points a second
        foe.x += dir.x * 3; foe.y += dir.y * 3; foe.path = []; foe.order = 'idle'; foe.target = null;
        window.__step(1); far = Math.max(far, Math.hypot(s.x - x0, s.y - y0));
      }
      const order40 = s.order;
      foe.dead = true; foe.hp = 0; window.__step(20 * 25);   // the foe is gone: 25 more seconds
      const back = Math.round(Math.hypot(s.x - x0, s.y - y0));
      s.dead = true; s.hp = 0; window.__step(2);
      return { engaged, far: Math.round(far), order40, back };
    };
    return { auto: trial(false), ordered: trial(true), leash: CHASE_LEASH };
  });
  console.log('chase', JSON.stringify(r));
  need(r.auto.engaged, 'an idle soldier goes for a foe that comes close, by himself');
  need(r.auto.far <= r.leash + 80, `by himself he chases no further than the leash (went ${r.auto.far}, leash ${r.leash})`);
  need(r.auto.back < 120, `then he walks back to where the fight began (${r.auto.back} points away at the end)`);
  need(r.ordered.far > r.leash + 200, `a fight the player orders goes further (went ${r.ordered.far})`);
  await done();
})();
