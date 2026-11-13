// Phase 4C step C1, the leftovers from 4B: quarry workers walk out in pairs beside each loaded ox cart while one stays at the
// stone; an engineer builds a trebuchet at his hut (Stronghold and school level 3); the new buildings have models of their own
// (not the plain workshop); and the sheet's soldiers have outfits of their own (pictured for a look).
const { start } = require('./lib4b');
(async () => {
  const { p, need, done, SP } = await start('cyyoung', { start: 0 });
  const r = await p.evaluate(() => {
    const out = {}, k = SD.keep(); SD.res.wood = 9000; SD.res.gold = 9000; SD.res.stone = 9000; CIV.popCap = 300; T.people(30);
    // ---- quarry pairs ----
    T.stage(2); const rk = rocks.filter(x => !x.iron && !x.gone).sort((a, b) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b.x - k.x, b.y - k.y))[0];
    const q = T.put('quarry', { c: Math.floor(rk.x / TILE), r: Math.floor(rk.y / TILE) }); T.act(q, 'fill'); T.run(4); q.stock = 40;
    let pals = 0, stay = 0, cartOut = false; for (let i = 0; i < 20 && !pals; i++) { T.run(1); const crew = units.filter(u => u.job === q && !u.dead).sort((a, b) => a.id - b.id); pals = crew.filter(u => u.cartPal).length; stay = crew[0] && !crew[0].cartPal ? 1 : 0; cartOut = oxenOf(q).some(c => c.sub === 'haul'); }
    out.pairs = { pals, stay, cartOut };
    for (let i = 0; i < 60 && units.some(u => u.cartPal); i++) T.run(1); out.palsBack = !units.some(u => u.cartPal);
    // ---- an engineer builds a trebuchet ----
    T.stage(5); schoolLvl = 3; T.put('school'); const hut = T.put('engineerhut'); trainEngineer(); T.run(3);
    const t0 = units.filter(u => u.type === 'trebuchet' && !u.dead).length; trainUnit('trebuchet'); out.building = engineers().some(e => e.trebBuild);
    for (let i = 0; i < 120 && engineers().some(e => e.trebBuild); i++) T.run(1);
    const tr = units.filter(u => u.type === 'trebuchet' && !u.dead); out.trebuchets = tr.length - t0; out.nearHut = tr.length ? Math.round(Math.min(...tr.map(u => Math.hypot(u.x - hut.x, u.y - hut.y)))) : -1;
    // ---- the new buildings' models ----
    const kinds = ['alehouse', 'apothecary', 'school', 'engineerhut', 'stable', 'church', 'abbey', 'orchard', 'vineyard', 'poleturner'], made = {};
    const fm = T.put('farm'); for (const kd of kinds) made[kd] = kd === 'stable' ? T.put('stable', { c: fm.c, r: fm.r }) : T.put(kd);
    window.__drawMs = 0; window.__step(2); window.__drawMs = 999999;
    out.models = Object.fromEntries(kinds.map(kd => [kd, made[kd] && R3D.modelOf(made[kd]) ? R3D.modelOf(made[kd]).inner : -1]));
    window.__made = made;
    return out; });
  console.log(JSON.stringify(r));
  need(r.pairs.pals === 2 && r.pairs.stay === 1 && r.pairs.cartOut, 'quarry: two walk out beside the loaded ox cart, one stays at the stone');
  need(r.palsBack, 'quarry: the pair come back with the cart');
  need(r.building && r.trebuchets === 1 && r.nearHut >= 0 && r.nearHut < 200, 'an engineer builds a trebuchet at his hut');
  const generic = r.models.poleturner, own = ['alehouse', 'apothecary', 'school', 'engineerhut', 'stable', 'church', 'abbey', 'orchard'];
  need(own.every(k => r.models[k] > 8 && r.models[k] !== generic), 'the new buildings have models of their own');
  // pictures: the new buildings, and the sheet's soldiers in their outfits
  for (const kd of ['school', 'church', 'abbey', 'stable', 'alehouse', 'apothecary', 'engineerhut', 'orchard']) {
    await p.evaluate(kd => { const b = window.__made[kd]; SD.cam.z = 1.6; SD.centerOn(b.x, (b.y0 + b.y1) / 2); window.__drawMs = 0; window.__step(2); window.__drawMs = 999999; }, kd);
    await p.screenshot({ path: SP + `/model-${kd}.png`, clip: { x: 200, y: 160, width: 500, height: 420 } });
  }
  await p.evaluate(() => { const k = SD.keep(), x0 = k.x + 220, y0 = k.y + 200; const f = nearestFree(Math.floor(x0 / TILE), Math.floor(y0 / TILE));
    const kits = [['archer', null], ['archer', 'longbow'], ['archer', 'crossbow'], ['archer', 'flame'], ['maceman', null], ['maceman', 'berserker'], ['knight', 'foot']];
    kits.forEach(([t, kit], i) => { const u = makeUnit('player', t, f.c * TILE + 16 + i * 34, f.r * TILE + 16); if (kit === 'foot') { u.kit = 'foot'; } else if (kit) applyKit(u, kit); u.order = 'hold'; u.facing = 1; });
    paused = true; SD.cam.z = 2.2; SD.centerOn(f.c * TILE + 16 + 100, f.r * TILE); window.__drawMs = 0; window.__step(3); window.__drawMs = 999999; });
  await p.screenshot({ path: SP + '/soldier-kits.png' });
  await done();
})();
