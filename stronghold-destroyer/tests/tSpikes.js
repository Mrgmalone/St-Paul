// Phase 4C step C4, spikes: an enemy crossing active spikes is struck down; an ordinary unarmored one dies from one strike,
// (Gerald: anybody dies from one strike) except knights, berserkers and mounted knights, who need two (a mounted knight loses his horse to the first); bandits likewise; the owner's own
// people walk over them safely (a rival's spikes catch your men; the rivals stand together, so his allies pass).
const { start } = require('./lib4b');
(async () => {
  const { p, need, done } = await start('cyyoung', { start: 0 });
  const r = await p.evaluate(() => {
    const k = SD.keep(), out = {}; const pit = createBuilding('pit', k.c + 7, k.r + 8); finishBuilding(pit);
    const on = (team, type, kit, extra) => { const u = makeUnit(team, type, pit.x, (pit.y0 + pit.y1) / 2); if (kit === 'foot') u.kit = 'foot'; else if (kit) applyKit(u, kit); Object.assign(u, extra || {}); u.think = 99; u.order = 'hold'; return u; };
    const strikes = (u, max = 4) => { let n = 0; for (let i = 0; i < max && !u.dead; i++) { pit.cool = 0; pit.charges = 9; const hp0 = u.hp, h0 = u.horseHp; updateTraps(0.05); if (u.dead || u.hp < hp0 || u.horseHp !== h0) n++; if (u.hp <= 0 && !u.dead) kill(u); } const res = { n, dead: u.dead }; u.dead = true; return res; };
    out.spear = strikes(on('enemy', 'spear')); out.archer = strikes(on('enemy', 'archer')); out.civ = strikes(on('enemy', 'civ'));
    out.bandit = strikes(on('rogue', 'spear', null, { rogue: true }));
    out.sword = strikes(on('enemy', 'sword')); out.knight = strikes(on('enemy', 'knight', 'foot')); out.berserker = strikes(on('enemy', 'maceman', 'berserker')); out.maceman = strikes(on('enemy', 'maceman'));
    const lordU = on('enemy', 'sword', null, { lord: true, hp: 760, maxHp: 760 }); out.lord = strikes(lordU);
    out.mounted = strikes(on('enemy', 'knight', null, { mounted: true, horseHp: 180 }));
    // your own people are safe on your spikes
    const mine = on('player', 'spear'); pit.cool = 0; pit.charges = 9; const h = mine.hp; updateTraps(0.05); out.ownSafe = !mine.dead && mine.hp === h; mine.dead = true;
    // a rival's spikes: his own men safe, another rival's man struck
    const R = REALM.rivals.find(x => !x.friend && x.keep), R2 = REALM.rivals.find(x => !x.friend && x.keep && x !== R);
    pit.team = R.team; pit.owner = R.id;
    const hisOwn = on(R.team, 'spear', null, { owner: R.id }); pit.cool = 0; updateTraps(0.05); out.rivalOwnSafe = !hisOwn.dead && hisOwn.hp > 0; hisOwn.dead = true;
    // the rivals stand together against you (one team), so a rival's spikes catch YOUR men, not his allies'
    const ally = on(R2.team, 'spear', null, { owner: R2.id }); pit.cool = 0; updateTraps(0.05); out.allySafe = !ally.dead && ally.hp > 0; ally.dead = true;
    const yours = on('player', 'spear'); pit.cool = 0; pit.charges = 9; updateTraps(0.05); out.playerStruck = yours.hp <= 0 || yours.dead; yours.dead = true;
    return out; });
  console.log(JSON.stringify(r));
  need(r.spear.dead && r.spear.n === 1 && r.archer.dead && r.archer.n === 1 && r.civ.dead && r.civ.n === 1, 'an ordinary unarmored enemy dies from one strike');
  need(r.bandit.dead && r.bandit.n === 1, 'a bandit dies from one strike');
  need(r.sword.dead && r.sword.n === 1 && r.maceman.dead && r.maceman.n === 1 && r.lord.dead && r.lord.n === 1, 'swordsmen, macemen, even a rival lord: dead from one strike');
  need(r.knight.dead && r.knight.n === 2 && r.berserker.dead && r.berserker.n === 2, 'knights and berserkers need two strikes');
  need(r.mounted.dead && r.mounted.n === 2, 'a mounted knight: the first strike kills the horse, the second the knight');
  need(r.ownSafe && r.rivalOwnSafe, "the owner's own people walk over the spikes safely");
  need(r.playerStruck && r.allySafe, "a rival's spikes strike your men and spare his allies");
  await done();
})();
