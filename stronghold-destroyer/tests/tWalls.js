// Phase 4C step C3: a wall follows the exact route drawn (bends included), clearing bushes and loose rocks or trees in the way
// instead of walking round them, and leaves an existing gate open; moats stop people but never hurt them; only the moat-fillers
// (MOAT_FILLERS in settings.js: citizens, spearmen, flamethrowers) may fill one; a filled square is ordinary ground for everyone;
// those filling cannot be hit, and flamethrowers cannot be hit by them.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done, SP } = await start('cyyoung', { start: 0 });
  const r = await p.evaluate(() => {
    const out = {}, k = SD.keep(); SD.res.wood = 9000; SD.res.stone = 9000;
    // an L-shaped stroke south-east of the keep, with a bush on it and a gate already standing on it
    const c0 = k.c + 6, r0 = k.r + 7, route = []; for (let i = 0; i < 6; i++) route.push({ c: c0 + i, r: r0 }); for (let j = 1; j < 5; j++) route.push({ c: c0 + 5, r: r0 + j });
    for (const t of route) { for (const tr of trees.slice()) if (!tr.gone && tr.c === t.c && tr.r === t.r) fellTree(tr); }
    const bush = { kind: 'bush', x: (c0 + 2) * TILE + 16, y: r0 * TILE + 16, amount: 30, max: 30 }; bushes.push(bush);
    const g = createBuilding('gate', c0 + 4, r0); finishBuilding(g);
    startPlacing('wall'); placing.start = { c: c0, r: r0 }; placing.route = route.slice(0, -1);
    const end = route[route.length - 1], cr = document.getElementById('game').getBoundingClientRect(), s = screenOf((end.c + 0.5) * TILE, (end.r + 0.5) * TILE, 0); placeAt(s.x, s.y, false);
    const at = (c, r) => structures.find(b => !b.dead && b.c === c && b.r === r && (b.kind === 'wall' || b.kind === 'gate'));
    out.onRoute = route.map(t => at(t.c, t.r) ? at(t.c, t.r).kind[0] : '-').join('');
    out.bushCleared = !!bush.cleared; out.gateKept = !!at(c0 + 4, r0) && at(c0 + 4, r0).kind === 'gate';
    out.blocked = route.filter(t => t.c !== c0 + 4).every(t => blocked[t.r * COLS + t.c]);
    // ---- moats ----
    out.fillers = MOAT_FILLERS.join(',');
    const mk = (t, kit, mounted) => { const u = makeUnit('player', t, k.x, k.y + 300); if (kit) applyKit(u, kit); if (mounted) u.mounted = true; return u; };
    out.may = { civ: canFillMoat(mk('civ')), spear: canFillMoat(mk('spear')), flame: canFillMoat(mk('archer', 'flame')), sword: canFillMoat(mk('sword')), archer: canFillMoat(mk('archer')), knight: canFillMoat(mk('knight')), mounted: canFillMoat(mk('spear', null, true)) };
    for (const u of units.filter(u => u.y === k.y + 300)) u.dead = true;
    const mc = k.c + 8, mr = k.r + 12; const m = createBuilding('moat', mc, mr); finishBuilding(m); m.hp = m.maxHp; out.moatBlocks = !!blocked[mr * COLS + mc];
    // a moat never hurts: a person standing beside it for a while is unharmed
    const by = makeUnit('player', 'civ', (mc - 1) * TILE + 16, mr * TILE + 16); const hp0 = by.hp; T.run(3); out.unharmed = by.hp === hp0;
    // a swordsman is not allowed to fill it; a citizen is
    const sw = makeUnit('player', 'sword', (mc - 1) * TILE + 16, (mr + 1) * TILE + 16); const ok = issueAt0; selection.clear(); selection.add(sw);
    const ms = screenOf((mc + 0.5) * TILE, (mr + 0.5) * TILE, 4); issueAt(ms.x, ms.y); out.swordFills = sw.order === 'fill' || (sw.order === 'attack' && sw.target === m);
    by.order = 'idle'; selection.clear(); selection.add(by); issueAt(ms.x, ms.y); out.civFilling = by.order === 'fill';
    for (let i = 0; i < 40 && !m.dead; i++) T.run(0.5); out.filled = m.dead; out.ground = !blocked[mr * COLS + mc];
    // everyone crosses the filled square
    const pth = findPath((mc - 2) * TILE + 16, mr * TILE + 16, (mc + 2) * TILE + 16, mr * TILE + 16); out.crosses = pth.some(q => Math.floor(q.x / TILE) === mc && Math.floor(q.y / TILE) === mr) || pth.length > 0;
    // those filling cannot be hit; flamethrowers cannot be hit by them
    const filler = makeUnit('enemy', 'spear', k.x + 500, k.y + 500); filler.think = 99; const m2 = createBuilding('moat', mc + 3, mr); finishBuilding(m2); filler.order = 'attack'; filler.target = m2;
    const fl = makeUnit('player', 'archer', k.x + 520, k.y + 500); applyKit(fl, 'flame');
    out.fillerUnhit = adjHit(filler, 30, fl, 'melee') === 0; out.flameUnhit = adjHit(fl, 30, filler, 'melee') === 0;
    filler.dead = true; fl.dead = true;
    return out; });
  console.log(JSON.stringify(r));
  need(r.onRoute === 'wwwwgwwwww' && r.blocked, 'the wall follows the exact route drawn, bend and all');
  need(r.bushCleared, 'a bush in the way is cleared, not walked round');
  need(r.gateKept, 'a gate already on the route stays open');
  need(r.fillers === 'civ,spear,flame' && r.may.civ && r.may.spear && r.may.flame && !r.may.sword && !r.may.archer && !r.may.knight && !r.may.mounted, 'only citizens, spearmen and flamethrowers may fill a moat (one setting)');
  need(r.moatBlocks && r.unharmed, 'a moat blocks the way but never hurts');
  need(!r.swordFills && r.civFilling, 'a swordsman is not sent to fill; a citizen is');
  need(r.filled && r.ground && r.crosses, 'a filled square is ordinary ground that everyone crosses');
  need(r.fillerUnhit && r.flameUnhit, 'those filling cannot be hit, and flamethrowers cannot be hit by them');
  await done();
})();
