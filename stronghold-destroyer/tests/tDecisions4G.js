// Phase 4G: Gerald's answers after 4F.
//  - Berserkers belong to everyone: every faction can train them (Psychana's still slip past unseen in small bands),
//    and every rival's swordsmen from the Hold on may be berserkers.
//  - Raids: Medium much stronger than Easy, Hard the strongest (RIVALS.power: a bigger army to send, and raiders who hit
//    harder and take more).
//  - Add: tap Add with soldiers chosen and the group is marked; soldiers you click or tap are added to it (with a mouse
//    too), and every soldier trained while Add is on marches to the group and takes his place in its formation. Tap Add
//    again and new soldiers go to the rally flag as before.
//  (Generals at 7 stars and five-star generals at 10 are checked in tCallCitizens.js.)
const { start } = require('./lib4b');
(async () => {
  const { p, need, done } = await start('cyyoung', { start: 0 });
  // ---------- berserkers for every faction ----------
  const bz = await p.evaluate(() => {
    stageN = 3; window.__step(25); res.mace = 2; res.leather = 4; res.gold = 200; kitButtons();
    const btn = document.querySelector('.kb[data-kit="berserker"]'), why = kitWhyNot('berserker');
    // a rival who is not Psychana, at the Hold, with plenty to spend: some of his swordsmen are berserkers
    const R = REALM.rivals.find(r => r.fac !== 'psychana'); R.stage = 3; R.res = { food: 1e5, wood: 1e5, stone: 1e5, iron: 1e5, gold: 1e5 };
    const before = rivalArmy(R).length, cap0 = ARMY_CAP; window.ARMY_CAP_SAVE = cap0.slice(); cap0[2] = 400;
    for (let i = 0; i < 120; i++) rivalTrain(R);
    const made = rivalArmy(R).slice(before), swords = made.filter(u => u.type === 'sword' || u.kit === 'berserker'), bers = made.filter(u => u.kit === 'berserker');
    for (const u of made) { u.dead = true; u.hp = 0; } cap0.splice(0, cap0.length, ...window.ARMY_CAP_SAVE);
    return { shown: !!btn && !btn.hidden, why, fac: R.fac, swords: swords.length, bers: bers.length };
  });
  console.log('berserkers', JSON.stringify(bz));
  need(bz.shown && bz.why === '', `Cy Young can train berserkers: the button shows and nothing stops it (${JSON.stringify(bz.why)})`);
  need(bz.bers > 0 && bz.bers < bz.swords, `a ${bz.fac} rival's swordsmen at the Hold include berserkers (${bz.bers} of ${bz.swords})`);

  // ---------- raids by difficulty ----------
  const rd = await p.evaluate(() => {
    const out = {}; const keep = DIFF;
    for (const d of ['easy', 'medium', 'hard']) {
      DIFF = DIFFS[d]; const R = REALM.rivals.find(r => !r.friend); R.stage = 3; R.res = { food: 1e5, wood: 1e5, stone: 1e5, iron: 1e5, gold: 1e5 };
      for (const u of rivalArmy(R)) { u.dead = true; u.hp = 0; } window.__step(1);
      for (let i = 0; i < 200; i++) rivalTrain(R);
      const army = rivalArmy(R).length; R.raidT = 0; rivalRaid(R);
      const go = units.filter(u => !u.dead && u.owner === R.id && u.raider), one = go.find(u => !isMachine(u));
      out[d] = { army, sent: go.length, mul: one ? +strongMul(one).toFixed(2) : 0, tough: one ? +toughMul(one).toFixed(2) : 0, power: Math.round(go.filter(u => !isMachine(u)).reduce((a, u) => a + u.maxHp * strongMul(u) * toughMul(u), 0)) };
      for (const u of units) if (u.owner === R.id && !u.dead && u.type !== 'civ') { u.dead = true; u.hp = 0; } raidGroups.length = 0; window.__step(1);
    }
    DIFF = keep; return out;
  });
  console.log('raids', JSON.stringify(rd));
  need(rd.easy.sent > 0 && rd.medium.sent > rd.easy.sent && rd.hard.sent > rd.medium.sent, `at the Hold, more raiders on Medium than Easy and more on Hard (${rd.easy.sent}, ${rd.medium.sent}, ${rd.hard.sent})`);
  need(rd.easy.mul === 1 && rd.medium.mul > 1 && rd.hard.mul > rd.medium.mul && rd.hard.tough > rd.medium.tough, `each raider hits harder and takes more on Medium and Hard (x${rd.easy.mul}, x${rd.medium.mul}, x${rd.hard.mul})`);
  need(rd.medium.power >= rd.easy.power * 2 && rd.hard.power >= rd.medium.power * 1.5, `a Medium raid is much stronger than an Easy one, and a Hard raid the strongest (${rd.easy.power}, ${rd.medium.power}, ${rd.hard.power})`);

  // ---------- Add: new soldiers join the marked formation ----------
  const setup = await p.evaluate(() => {
    const k = playerKeep(), inSq = (x, y, c0, r0) => x >= c0 * TILE && x < (c0 + 18) * TILE && y >= r0 * TILE && y < (r0 + 18) * TILE; let spot = null;
    for (let rad = 12; rad < 60 && !spot; rad += 3) for (let a = 0; a < 16 && !spot; a++) { const c0 = Math.round(k.c + Math.cos(a / 16 * 6.283) * rad) - 9, r0 = Math.round(k.r + Math.sin(a / 16 * 6.283) * rad) - 9;
      if (c0 < 2 || r0 < 2 || c0 + 20 > COLS || r0 + 20 > ROWS) continue;
      if (structures.concat(farms).some(b => !b.dead && b.x1 > c0 * TILE && b.x0 < (c0 + 18) * TILE && b.y1 > r0 * TILE && b.y0 < (r0 + 18) * TILE)) continue;
      let wet = false; for (let c = c0; c < c0 + 18 && !wet; c++) for (let rr = r0; rr < r0 + 18 && !wet; rr++) if (riverTile[rr * COLS + c]) wet = true; if (wet) continue;
      for (const t of trees.slice()) if (!t.gone && inSq(t.x, t.y, c0, r0)) fellTree(t);
      for (const q of rocks) if (!q.gone && inSq(q.x, q.y, c0, r0)) { q.gone = true; setBlock(Math.floor(q.x / TILE), Math.floor(q.y / TILE), 0); }
      spot = { x: (c0 + 9) * TILE, y: (r0 + 9) * TILE }; }
    for (const u of units) if (u.team === 'player' && !u.dead && u.type !== 'civ' && u.type !== 'king') { u.dead = true; u.hp = 0; } window.__step(2);
    window.__g = []; for (let i = 0; i < 4; i++) window.__g.push(makeUnit('player', 'spear', spot.x - 60 + i * 24, spot.y + 40));
    window.__extra = makeUnit('player', 'spear', spot.x + 70, spot.y + 90);
    window.__step(2); commandMarch(window.__g, spot.x, spot.y - 60, 'wedge'); T.run(14);
    selectOnly(window.__g); centerOn(spot.x, spot.y - 20); window.__step(4); updateHud();
    window.__spot = spot; return { formed: window.__g.every(u => u.formed === 'wedge'), sel: selection.size };
  });
  need(setup.formed && setup.sel === 4, `four spearmen stand in a wedge, chosen (${JSON.stringify(setup)})`);
  await p.click('#camAdd'); await p.waitForTimeout(80);
  const on = await p.evaluate(() => ({ add: TOUCH.add, g: joinGroup && joinGroup.members.length, kind: joinGroup && joinGroup.kind, banner: document.getElementById('banner').textContent }));
  need(on.add && on.g === 4 && on.kind === 'wedge' && /join its wedge/.test(on.banner), `Add marks the group of 4 and its wedge (${on.banner.slice(0, 90)})`);
  // a mouse click on another soldier while Add is on adds him to the group (before, a click chose only him)
  const pt = await p.evaluate(() => { const c = document.getElementById('game').getBoundingClientRect(), q = screenOf(window.__extra.x, window.__extra.y, 20 + (R3D.active ? elev3D(window.__extra) : elev2D(window.__extra))); return { x: c.left + q.x, y: c.top + q.y }; });
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(60); await p.evaluate(() => window.__step(2));
  const clicked = await p.evaluate(() => ({ sel: selection.size, inSel: selection.has(window.__extra), inGroup: joinGroup.members.includes(window.__extra) }));
  need(clicked.sel === 5 && clicked.inSel && clicked.inGroup, `a mouse click with Add on adds the soldier to the group (${JSON.stringify(clicked)})`);
  // a soldier trained now marches to the group, which closes up round him in a wedge where it stands
  const joined = await p.evaluate(() => {
    const before = new Set(units); trainQueue.push({ kind: 'spear', t: 0, dur: 0.5 }); T.run(1);
    const fresh = units.find(u => !before.has(u) && u.team === 'player' && u.type === 'spear');
    const went = fresh && fresh.march && fresh.march.kind === 'wedge';
    T.run(40);
    const all = window.__g.concat([window.__extra, fresh]).filter(Boolean), cx = all.reduce((a, u) => a + u.x, 0) / all.length, cy = all.reduce((a, u) => a + u.y, 0) / all.length;
    return { fresh: !!fresh, went, n: all.length, formed: all.filter(u => u.formed === 'wedge').length, inGroup: joinGroup.members.includes(fresh), chosen: selection.has(fresh),
      far: Math.round(Math.max(...all.map(u => Math.hypot(u.x - cx, u.y - cy)))), fromSpot: Math.round(Math.hypot(cx - window.__spot.x, cy - (window.__spot.y - 60))) };
  });
  console.log('joined', JSON.stringify(joined));
  need(joined.fresh && joined.went && joined.inGroup && joined.chosen, `a soldier trained with Add on marches to join the group (${JSON.stringify(joined)})`);
  need(joined.formed === joined.n && joined.far < 110 && joined.fromSpot < 80, `all ${joined.n} stand in the wedge where the group stood (formed ${joined.formed}, ${joined.fromSpot} points off)`);
  // Add off: the next one goes to the rally flag
  await p.click('#camAdd'); await p.waitForTimeout(60);
  const off = await p.evaluate(() => {
    const before = new Set(units); trainQueue.push({ kind: 'spear', t: 0, dur: 0.5 }); T.run(1.5);
    const fresh = units.find(u => !before.has(u) && u.team === 'player' && u.type === 'spear'), rp = rallyFor('spear');
    return { add: TOUCH.add, group: joinGroup, march: !!(fresh && fresh.march), toRally: fresh && fresh.dest ? Math.round(Math.hypot(fresh.dest.x - rp.x, fresh.dest.y - rp.y)) : -1 };
  });
  need(!off.add && off.group === null && !off.march && off.toRally >= 0 && off.toRally < 60, `with Add off, a new soldier goes to the rally flag (${JSON.stringify(off)})`);
  // Add with nobody chosen says so, and new soldiers still go to the rally flag
  await p.evaluate(() => { selection.clear(); updateHud(); }); await p.click('#camAdd'); await p.waitForTimeout(60);
  const none = await p.evaluate(() => ({ group: joinGroup, banner: document.getElementById('banner').textContent })); await p.click('#camAdd');
  need(none.group === null && /Choose soldiers first/.test(none.banner), `Add with nobody chosen explains how to use it (${none.banner.slice(0, 80)})`);
  await done();
})();
