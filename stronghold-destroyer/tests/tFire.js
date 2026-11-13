// Phase 4B step B5, fire and repair: a fire raises the alarm and citizens fetch water (from a Water Pot, whose keeper's pot holds
// more as time goes on, or the river) and put it out; a fire nobody fights for about ten seconds burns half the building, and
// people inside are burned; flamethrowers set buildings alight; damaged buildings are mended by citizens (twice as long as building)
// and engineers (very fast); a destroyed building is rebuilt where it stood, twice as slowly, once there are supplies.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done, SP } = await start('cyyoung');
  await p.evaluate(() => { window.__spoken = []; speechSynthesis.speak = u => { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 20); }; });
  const r = await p.evaluate(() => {
    const out = {}, k = SD.keep(); SD.res.wood = 5000; SD.res.gold = 3000; SD.res.stone = 1000; T.people(12);
    // ---- unfought: half burns ----
    const h1 = T.put('house'); for (const u of units) if (u.team === 'player' && u.type === 'civ') u.hold4test = true;
    const savedCall = callFighters; callFighters = () => {};   // nobody comes (to see what an unfought fire does)
    h1.hp = h1.maxHp; ignite(h1); out.alarm = /Fire at the House/.test(window.__spoken.join('|')); T.run(11); out.halfBurned = h1.halfBurned && h1.hp <= h1.maxHp * 0.5 + 1;
    const inside = makeUnit('player', 'civ', h1.x, h1.y); inside.inside = h1; const hp0 = inside.hp; T.run(1); out.insideBurned = inside.hp < hp0 || !inside.inside;
    // ---- fought: citizens with water put it out ----
    const pot = T.put('waterpot'); callFighters = savedCall; out.trace = []; T.run(1); out.trace.push([+h1.fire.toFixed(2), 0, units.filter(u => u.order === 'firefight').length]); T.run(2); out.potKeeper = staffOf(pot) === 1; out.potLevel1 = potLevel(pot);
    pot.builtAt = time - 400; out.potLevel3 = potLevel(pot);
    for (let i = 0; i < 40 && h1.fire > 0 && !h1.dead; i++) { T.run(1); if (i % 5 === 0) out.trace.push([+h1.fire.toFixed(2), Math.round(h1.hp / h1.maxHp * 100), units.filter(u => u.order === 'firefight').length]); }
    out.out = !(h1.fire > 0) && !h1.dead;
    // ---- repairs: a citizen, then an engineer ----
    T.run(4); const h2 = T.put('house'); h2.hp = h2.maxHp * 0.4; T.run(4); out.repairer = units.some(u => u.order === 'repair' && u.repairB === h2);
    /* time spent mending (at the building), not walking there */
    const mendTime = (h, step) => { let t = 0; for (let i = 0; i < 160 && h.hp < h.maxHp; i++) { const w = units.find(u => u.order === 'repair' && u.repairB === h); T.run(step); if (w && edgeDist(w, h) <= 42) t += step; } return t; };
    out.citizenRepairSecs = mendTime(h2, 0.5);
    T.stage(3); T.put('school'); T.put('engineerhut'); trainEngineer(); const eng = engineers()[0]; for (const u of units) if (u.order === 'repair') { u.order = 'idle'; u.repairB = null; }
    h2.hp = h2.maxHp; const h3 = T.put('house'); h3.hp = h3.maxHp * 0.4; T.run(3); out.engineerCame = eng && eng.order === 'repair' && eng.repairB === h3;
    out.engDbg = eng ? [eng.order, eng.repairB && eng.repairB.name, eng.job && eng.job.kind, Math.round(Math.hypot(eng.x - h3.x, eng.y - h3.y))] : 'none';
    out.engineerRepairSecs = mendTime(h3, 0.25);
    // ---- flamethrowers set buildings alight ----
    const h4 = T.put('house'); const fl = makeUnit('enemy', 'archer', h4.x + 40, h4.y1 + 20); fl.kit = 'flame'; fl.range = 36; fl.target = h4; fl.order = 'attack'; fl.think = 99; doHit(fl); out.flameIgnites = h4.fire > 0; fl.dead = true;
    // ---- a destroyed building is rebuilt, twice as long, once it can be paid for ----
    const h5 = T.put('granary'), at = { c: h5.c, r: h5.r }; SD.res.wood = 0; kill(h5); T.run(5);
    out.waits = rebuildWaiting().some(q => q.kind === 'granary') && !structures.some(s => s.kind === 'granary' && !s.dead && s.c === at.c && s.r === at.r);
    SD.res.wood = 500; T.run(3); const nb = structures.find(s => s.kind === 'granary' && !s.dead && s.c === at.c && s.r === at.r);
    out.rebuilt = !!nb && nb.done === false && nb.buildTime >= BUILD.granary.time * learnTime() * 2 - 0.01;
    // torn down on purpose: not rebuilt
    const h6 = T.put('stockpile'); h6.torn = true; kill(h6); T.run(3); out.tornNotRebuilt = !rebuildQ.some(q => q.kind === 'stockpile');
    return out;
  });
  console.log(JSON.stringify(r));
  need(r.alarm, 'a fire raises the alarm (spoken)');
  need(r.halfBurned, 'a fire nobody fights for about ten seconds burns half the building');
  need(r.insideBurned, 'people inside a burning building are burned (or flee)');
  need(r.potKeeper && r.potLevel1 === 1 && r.potLevel3 === 3, 'a water pot has a keeper and holds more as time goes on');
  need(r.out && r.trace.some(t => t[2] > 0), 'citizens fetch water and put the fire out');
  need(r.repairer && r.citizenRepairSecs > 10, 'citizens mend a damaged building (slowly)');
  need(r.engineerCame && r.engineerRepairSecs < r.citizenRepairSecs / 3, 'engineers mend very fast');
  need(r.flameIgnites, 'flamethrowers set buildings alight');
  need(r.waits && r.rebuilt, 'a destroyed building waits for supplies, then is rebuilt where it stood, twice as slowly');
  need(r.tornNotRebuilt, 'a building you tear down is not rebuilt');
  await done();
})();
