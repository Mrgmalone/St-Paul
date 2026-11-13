// Phase 4C step C9: wherever there is water it moves (the sea band, the river, the pond and any moat you dig all carry
// moving ripples; the sea also rolls in gentle waves), with now and then a splash; a fish jumps, birds fly over, and
// butterflies and frogs appear near the shore. All of it is occasional and capped.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done, SP } = await start('cyyoung', { start: 0 });
  const w = await p.evaluate(() => { const k = SD.keep(), f = nearestFree(k.c + 8, k.r + 9), m = createBuilding('moat', f.c, f.r); finishBuilding(m);
    const draw = n => { window.__drawMs = 0; for (let i = 0; i < n; i++) window.__step(1); window.__drawMs = 999999; };
    SD.centerOn(m.x, m.y); draw(3); const a = R3D.waterInfo(); T.run(6); draw(3); const b = R3D.waterInfo(); return { a, b }; });
  console.log('water', JSON.stringify(w));
  const moved = k => w.a[k] && w.b[k] && (w.a[k][0] !== w.b[k][0] || w.a[k][1] !== w.b[k][1]);
  need(moved('sea') && w.b.seaWave > w.a.seaWave, 'the sea band moves: ripples and gentle waves');
  need(moved('river') && moved('pond'), 'the river and the pond ripple');
  need(moved('moat'), 'a moat you dig has moving water too');
  // by the river: watch for a minute of play; butterflies and frogs keep near the water; nothing goes over its cap
  const life = await p.evaluate(() => { const RX = 1236, ry = 1300; SD.cam.z = 1.2; SD.centerOn(RX + 40, ry);
    const cap = R3D.LIFE_CAP, worst = {}, flies = [], frogs = [];
    for (let s = 0; s < 120; s++) { window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; window.__step(9);
      const c = R3D.lifeCount(); for (const k in cap) worst[k] = Math.max(worst[k] || 0, c[k] || 0);
      const sp = R3D.lifeSpots(); flies.push(...sp.fly); frogs.push(...sp.frog); }
    const nearWater = ([x, z]) => riverDist(x, z) < RIVER_HALF + 70   /* within about two squares of the bank */ || Math.min(x, z, MW - x, MH - z) < 30 || (pond && Math.hypot((x - pond.x) / pond.rx, (z - pond.y) / pond.ry) < 1.4);
    return { worst, cap, flies: flies.length, fliesNear: flies.filter(nearWater).length, frogs: frogs.length, frogsNear: frogs.filter(nearWater).length }; });
  console.log('life', JSON.stringify(life));
  need(Object.keys(life.cap).every(k => (life.worst[k] || 0) <= life.cap[k]), 'no kind of creature ever goes over its cap');
  need(life.flies > 0 && life.fliesNear >= life.flies * 0.8, 'butterflies appear near the shore');
  need(life.frogs === 0 || life.frogsNear === life.frogs, 'frogs sit by the water');
  need((life.worst.splash || 0) > 0, 'now and then a splash');
  await done();
})();
