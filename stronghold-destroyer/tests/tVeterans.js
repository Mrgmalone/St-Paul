// Phase 4B step B4, soldiers: veteran stars (a battle survived adds one; colours lighten; each is stronger), soldier lessons at
// the school (five levels), longbowmen and crossbowmen, flamethrower squads (ten for a knight's cost; fire cannot kill, the knife
// kills archers, longbows cannot hit them; they dig a moat in the field; never guards or escorts), foot knights at the Hold and
// mounted knights at the Castle on stable horses (the horse takes the blows unless a crossbow bolt strikes the rider), lookout
// crews (a longbowman from the Homestead), engines for the giant towers at new prices, and a soldier's glance on a quick tap.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done, SP } = await start('psychana', { start: 0 });   /* the west start: the flamethrowers' open field is measured from it */
  const r = await p.evaluate(() => {
    const out = {}, k = SD.keep(); SD.res.gold = 20000; SD.res.wood = 5000; SD.res.stone = 3000; SD.res.iron = 200; CIV.popCap = 300; T.people(20);   /* (room in the houses for everyone trained here) */
    // ---- a battle survived ----
    const [sp] = T.people(1, 'spear'); const foe = makeUnit('enemy', 'spear', sp.x + 30, sp.y); foe.think = 99;
    const s0 = strongMul(sp); sp.fightT = time; T.run(1); foe.dead = true; T.run(SOLDIERS.stars.battleEnds + 3); out.vet = sp.vet; out.stronger = strongMul(sp) > s0;
    out.tiers = [starLook(1).col, starLook(12).col, starLook(30).col, starLook(100).col, starLook(100).shown].join(',');
    // ---- soldiers' lessons ----
    T.stage(3); T.put('school'); startSoldierLessons(); T.run(SOLDIERS.lessons.levels[0][1] + 2); out.lessons = soldierLvl;
    // ---- longbowmen, crossbowmen ----
    SD.res.bow = 5; trainKit('longbow'); trainKit('crossbow'); T.run(40);
    const lb = units.find(u => u.kit === 'longbow' && !u.dead), cb = units.find(u => u.kit === 'crossbow' && !u.dead);
    out.longbow = !!lb && lb.range === 240 && lb.sight > 300; out.crossbow = !!cb && cb.dmg === 22;
    // ---- a foot knight at the Hold ----
    SD.res.sword = 10; SD.res.armor = 10; trainUnit('knight'); T.run(40); const fk = units.find(u => u.type === 'knight' && !u.dead && u.team === 'player' && !u.gift);
    out.footKnight = !!fk && fk.kit === 'foot' && !fk.mounted;
    // ---- mounted knights at the Castle ----
    T.stage(4); const fm = T.put('farm'), st = T.put('stable', { c: fm.c, r: fm.r }); st.horses = 2;
    trainUnit('knight'); T.run(40); const mk = units.find(u => u.type === 'knight' && !u.dead && u.mounted);
    out.mounted = !!mk && st.horses === 1;
    if (mk) { const h0 = mk.hp, hh = mk.horseHp, sw = makeUnit('enemy', 'sword', mk.x + 200, mk.y); sw.think = 99;
      out.horseTakes = adjHit(mk, 30, sw, 'melee') === 0 && mk.horseHp < hh && mk.hp === h0;
      const xb = makeUnit('enemy', 'archer', mk.x + 300, mk.y); xb.kit = 'crossbow'; xb.think = 99; out.boltHitsRider = adjHit(mk, 30, xb, 'arrow') > 0;
      adjHit(mk, 999, sw, 'melee'); out.unhorsed = !mk.mounted && mk.kit === 'foot'; sw.dead = true; xb.dead = true; }
    // ---- flamethrowers ----
    const q0 = trainQueue.length; trainKit('flame'); T.run(60); const fl = units.filter(u => u.kit === 'flame' && !u.dead && u.team === 'player');
    out.squad = fl.length; out.noGuard = fl.every(u => u.noGuard);
    const tough = makeUnit('enemy', 'spear', k.x + 400, k.y); tough.hp = 5; tough.think = 99; out.fireCannotKill = adjHit(tough, 40, fl[0], 'melee') === 4;
    const arch = makeUnit('enemy', 'archer', k.x + 420, k.y); arch.hp = 5; arch.think = 99; out.knifeKillsArcher = adjHit(arch, 40, fl[0], 'melee') >= 5;
    const lbe = makeUnit('enemy', 'archer', k.x + 440, k.y); lbe.kit = 'longbow'; lbe.think = 99; out.longbowMisses = adjHit(fl[1], 20, lbe, 'arrow') === 0;
    for (const x of [tough, arch, lbe]) x.dead = true;
    // they dig a moat when they stop in the open field, facing the enemy
    const m0 = structures.filter(s => s.kind === 'moat' && !s.dead).length, far = nearestFree(k.c + 26, k.r + 4);
    for (const t of SD.trees.slice()) if (!t.gone && Math.hypot(t.x - far.c * TILE, t.y - far.r * TILE) < 260) fellTree(t);   /* (an open field: the map differs each game) */
    for (const [i, u] of fl.entries()) { u.x = far.c * TILE + 16 + (i % 5) * 18; u.y = far.r * TILE + 16 + Math.floor(i / 5) * 18; u.path = []; u.order = 'idle'; u.dugAt = null; }
    const e2 = makeUnit('enemy', 'sword', far.c * TILE + 600, far.r * TILE); e2.think = 99; T.run(3); out.moats = structures.filter(s => s.kind === 'moat' && !s.dead).length - m0; e2.dead = true;
    // ---- a lookout: a longbowman joins from the Homestead ----
    const lo = T.put('lookout'); T.run(2); out.lookout = lo && lo.longbow && lo.range === SOLDIERS.lookout.range && lo.shots === 2;
    // ---- giant tower engines: new prices; the trebuchet waits for the Stronghold and the school's top level ----
    out.trebRefused = !!engineWhyNot('trebuchet'); out.ballistaCost = engineText('ballista');
    const gt = T.put('greattower'); showTower(gt); out.towerBox = /Mount Ballista \(400 gold/.test(document.getElementById('storePop').textContent); T.close();
    // ---- a soldier's glance on a quick tap ----
    const gs = T.people(1, 'spear')[0]; gs.vet = 7; tapIcon(gs); out.glance = document.querySelector('#tapIcon b').textContent;
    return out;
  });
  console.log(JSON.stringify(r));
  need(r.vet === 1 && r.stronger, 'a battle survived adds a star, and stars make him stronger');
  need(r.tiers === '#c8823a,#d8dde2,#ffd84a,#ffffff,5', 'the stars lighten from bronze to white as they grow');
  need(r.lessons === 1, "the school's soldier lessons teach a level");
  need(r.longbow && r.crossbow, 'longbowmen and crossbowmen are trained, each their own soldier');
  need(r.footKnight, 'knights come on foot at the Hold');
  need(r.mounted && r.horseTakes && r.boltHitsRider && r.unhorsed, 'mounted knights ride stable horses; the horse takes the blows, a crossbow bolt strikes the rider');
  need(r.squad === 10 && r.noGuard, 'one click: a squad of ten flamethrowers, who never guard or escort');
  need(r.fireCannotKill && r.knifeKillsArcher && r.longbowMisses, 'fire cannot kill; the knife kills archers; longbows cannot hit flamethrowers');
  need(r.moats >= 2, 'flamethrowers dig a moat in the field');
  need(r.lookout, 'a lookout gets a longbowman from the Homestead');
  need(r.trebRefused && r.towerBox, 'giant tower engines at the new prices; the trebuchet needs the Stronghold and top school level');
  need(/★\s?7/.test(r.glance) && /%/.test(r.glance), "a quick tap on a soldier shows a glance with his stars and health");
  await p.evaluate(() => { const u = units.find(x => x.vet); u.vet = 30; const k = SD.keep(); SD.cam.z = 1.3; SD.centerOn(u.x, u.y); window.__drawMs = 0; window.__step(3); window.__drawMs = 999999; });
  await p.screenshot({ path: SP + '/veteran-stars.png' });
  await done();
})();
