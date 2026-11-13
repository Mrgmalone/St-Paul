// Phase 4B step B2, escorted work groups: from the Hold, a yard's woodcutters go out in groups of five and each quarry's ox cart
// is a group; each wants a swordsman, spearman or archer with it. The box shows which group needs a soldier; an escort walks
// with its group and fights whoever comes at it; a soldier left idle goes with a group by himself.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done, SP } = await start('cyyoung');
  const r = await p.evaluate(() => {
    const out = {}; T.people(30); SD.res.wood = 5000; SD.res.gold = 5000;
    const yard = T.put('woodhut'); T.stage(3); T.act(yard, 'fill'); T.run(3);
    out.before2 = groupsOf(yard).length;
    stageN = 2; out.noGroupsEarly = groupsOf(yard).length === 0; stageN = 3;
    showSite(yard); window.__step(1); out.boxNeeds = /Group one[^]*needs a soldier/.test(document.getElementById('storePop').textContent); T.close();
    const [sp] = T.people(1, 'spear'); sp.cmdT = time; T.act(yard, 'escort:0');
    out.escorted = sp.escort && sp.escort.g === 0;
    let near = 0; for (let i = 0; i < 40; i++) { T.run(1); const c = groupCenter(groupsOf(yard)[0]); if (Math.hypot(sp.x - c.x, sp.y - c.y) < 160) near++; }
    out.keptClose = near;
    // a raider comes at the group: the escort goes for him
    const c = groupCenter(groupsOf(yard)[0]), foe = makeUnit('enemy', 'spear', c.x + 120, c.y); foe.order = 'idle'; foe.think = 99;
    T.run(1.5); out.fought = sp.order === 'attack' && sp.target === foe;
    foe.dead = true; T.run(3);
    // a soldier left idle goes with the second group by himself
    const [ar] = T.people(1, 'archer'); ar.cmdT = time - 120; T.run(7); out.autoEscort = !!(ar.escort && ar.escort.site === yard);
    // the quarry's ox cart is a group of its own
    const k = SD.keep(), rk = rocks.filter(x => !x.iron && !x.gone).sort((a, b) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b.x - k.x, b.y - k.y))[0];
    const q = T.put('quarry', { c: Math.floor(rk.x / TILE), r: Math.floor(rk.y / TILE) }); T.run(3); out.quarryGroups = q ? groupsOf(q).length : -1;
    // an order from you takes the soldier off escort duty
    commandMove([sp], k.x, k.y + 80); sp.cmdT = time; T.run(1); out.released = !sp.escort;
    showSite(yard); window.__step(1); out.box = document.getElementById('storePop').textContent.replace(/\s+/g, ' ').match(/Group one[^G]*/g);
    return out;
  });
  console.log(JSON.stringify(r));
  need(r.before2 === 2 && r.noGroupsEarly, 'from the Hold a yard of ten goes out in two groups (none before)');
  need(r.boxNeeds, 'the box says group one needs a soldier');
  need(r.escorted && r.keptClose >= 22, 'the escort walks with its group (most of the time within 160 points: woodcutters on wagons go faster than a soldier walks)');
  need(r.fought, 'the escort fights whoever comes at the group');
  need(r.autoEscort, 'an idle soldier goes with a group by himself');
  need(r.quarryGroups >= 1, "each quarry's ox cart is a group");
  need(r.released, 'your own order takes a soldier off escort duty');
  await p.screenshot({ path: SP + '/groups-box.png' });
  await done();
})();
