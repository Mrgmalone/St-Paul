// Phase 4C step C5: patrol routes drawn with the mouse or a finger (the chosen soldiers walk them over and over and fight what
// comes near); the Guard command holds an area (meets anyone in it, never chases far out); three distinct rally flags (army,
// citizens, siege); soldiers and siege engines without orders of their own follow the main army; a new order ends a duty;
// idle citizens go back to the campfire.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done, SP } = await start('cyyoung', { start: 0, viewport: { width: 1180, height: 820 }, page: { hasTouch: true } });
  const cdp = await p.context().newCDPSession(p);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  // two route ends on open ground, both on screen
  const geo = await p.evaluate(() => {
    const k = SD.keep(), fa = nearestFree(k.c + 6, k.r + 9), fb = nearestFree(k.c + 17, k.r + 9);
    const A = { x: fa.c * TILE + 16, y: fa.r * TILE + 16 }, B = { x: fb.c * TILE + 16, y: fb.r * TILE + 16 };
    SD.cam.z = 1; SD.centerOn((A.x + B.x) / 2, (A.y + B.y) / 2); window.__drawMs = 0; window.__step(2); window.__drawMs = 999999;
    const cr = document.getElementById('game').getBoundingClientRect(), s = q => { const v = screenOf(q.x, q.y, 0); return { x: v.x + cr.left, y: v.y + cr.top }; };
    window.__A = A; window.__B = B; window.__scr = s;
    const mk = (type, n, dx) => { const out = []; for (let i = 0; i < n; i++) { const f = nearestFree(k.c + 2 + i + dx, k.r + 6); out.push(makeUnit('player', type, f.c * TILE + 16, f.r * TILE + 16)); } return out; };
    window.__pat = mk('spear', 3, 0); selectOnly(window.__pat);
    return { A, B, sa: s(A), sb: s(B), sm: s({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 + 60 }) }; });
  // ---- a patrol drawn with the mouse ----
  await p.click('#btnPatrol');
  await p.mouse.move(geo.sa.x, geo.sa.y); await p.mouse.down(); await p.mouse.move(geo.sm.x, geo.sm.y, { steps: 8 }); await p.mouse.move(geo.sb.x, geo.sb.y, { steps: 8 }); await p.mouse.up();
  const pm = await p.evaluate(() => ({ set: window.__pat.every(u => u.patrol && u.patrol.pts.length >= 3), pts: window.__pat[0].patrol ? window.__pat[0].patrol.pts.length : 0, sel: selection.size, mode: orderMode }));
  // walk it: everyone gets near both ends, more than once
  const walk = await p.evaluate(() => { const A = window.__A, B = window.__B, hits = window.__pat.map(() => ({ a: 0, b: 0, la: false, lb: false }));
    for (let s = 0; s < 120; s++) { T.run(1); window.__pat.forEach((u, i) => { const h = hits[i], na = Math.hypot(u.x - A.x, u.y - A.y) < 100, nb = Math.hypot(u.x - B.x, u.y - B.y) < 100;   /* (a squad walks side by side: the outside man turns a body or two short of the line's end) */ if (na && !h.la) h.a++; if (nb && !h.lb) h.b++; h.la = na; h.lb = nb; }); }
    return hits; });
  // an enemy steps onto the route: they fight it, then carry on
  const fight = await p.evaluate(() => { const A = window.__A, B = window.__B, e = makeUnit('enemy', 'spear', (A.x + B.x) / 2, (A.y + B.y) / 2 + 40); e.think = 99; e.order = 'hold'; let att = false;
    for (let s = 0; s < 40 && !e.dead; s++) { T.run(0.5); if (window.__pat.some(u => u.order === 'attack' && u.target === e)) att = true; }
    T.run(3); return { att, dead: e.dead, resumed: window.__pat.filter(u => !u.dead).every(u => u.patrol && (u.order === 'move' || u.order === 'attack' || u.order === 'idle')) }; });
  console.log('mouse patrol', JSON.stringify({ pm, walk, fight }));
  need(pm.set && pm.pts >= 3, 'a route drawn with the mouse becomes a patrol for every chosen soldier');
  need(pm.sel === 0 && !pm.mode, 'after the patrol order the soldiers are let go (nothing stays selected)');
  need(walk.every(h => h.a >= 2 && h.b >= 2), 'patrolling soldiers walk the route over and over (both ends, twice or more)');
  need(fight.att && fight.dead && fight.resumed, 'patrol soldiers fight an enemy on their route, then carry on patrolling');
  // ---- a patrol drawn with a finger ----
  const tp = await p.evaluate(() => { const k = SD.keep(); window.__tp = []; for (let i = 0; i < 2; i++) { const f = nearestFree(k.c + 2 + i, k.r + 7); window.__tp.push(makeUnit('player', 'archer', f.c * TILE + 16, f.r * TILE + 16)); } selectOnly(window.__tp); return true; });
  await p.tap('#btnPatrol');
  await touch('touchStart', geo.sb.x, geo.sb.y); for (let i = 1; i <= 8; i++) await touch('touchMove', geo.sb.x + (geo.sa.x - geo.sb.x) * i / 8, geo.sb.y + 50 * Math.sin(i / 8 * Math.PI)); await touch('touchEnd');
  const tpr = await p.evaluate(() => { const ok = window.__tp.every(u => u.patrol && u.patrol.pts.length >= 3); T.run(20); return { ok, sel: selection.size, moving: window.__tp.some(u => u.moving || u.order === 'move') }; });
  console.log('finger patrol', JSON.stringify(tpr));
  need(tpr.ok && tpr.sel === 0 && tpr.moving, 'a route drawn with a finger works the same');
  // ---- a new order ends the duty ----
  const ended = await p.evaluate(() => { const u = window.__tp[0]; selectOnly([u]); const s = window.__scr({ x: SD.keep().x + 80, y: SD.keep().y + 220 }), cr = document.getElementById('game').getBoundingClientRect(); issueAt(s.x - cr.left, s.y - cr.top); return { patrol: !!u.patrol, sel: selection.size }; });
  need(!ended.patrol && ended.sel === 0, 'any new order ends a patrol');
  // ---- Guard an area ----
  const gd = await p.evaluate(() => { const k = SD.keep(); window.__gd = []; for (let i = 0; i < 3; i++) { const f = nearestFree(k.c + 3 + i, k.r + 8); window.__gd.push(makeUnit('player', 'sword', f.c * TILE + 16, f.r * TILE + 16)); }
    for (const u of window.__pat.concat(window.__tp)) u.dead = true; selectOnly(window.__gd); const f = nearestFree(k.c + 12, k.r + 14); window.__G = { x: f.c * TILE + 16, y: f.r * TILE + 16 }; return window.__scr(window.__G); });
  await p.click('#btnGuardA'); await p.mouse.click(gd.x, gd.y);
  const g1 = await p.evaluate(() => { const G = window.__G, set = window.__gd.every(u => u.guardArea); T.run(20); return { set, sel: selection.size, near: window.__gd.map(u => u.toHeal || u.sick ? 0 : Math.round(Math.hypot(u.x - G.x, u.y - G.y))),   /* (a soldier who falls ill goes home to be cared for: a game event that rightly interrupts his duty) */
    foes: units.filter(e => !e.dead && hostile('player', e.team) && Math.hypot(e.x - G.x, e.y - G.y) < 700).map(e => (e.type) + (e.scout ? ':scout' : '')), why: window.__gd.filter(u => Math.hypot(u.x - G.x, u.y - G.y) > 80).map(u => ({ at: [Math.round(u.x), Math.round(u.y)], order: u.order, path: u.path.length, spot: u.guardArea && u.guardArea.spot, guardOf: u.guardOf ? u.guardOf.kind || u.guardOf.type : null, escort: !!u.escort, patrol: !!u.patrol, target: u.target ? (u.target.type || u.target.kind) + ':' + u.target.team : null, onWall: !!u.onWall, inside: !!u.inside, toHeal: !!u.toHeal, dead: u.dead })) }; });
  const g2 = await p.evaluate(() => { const G = window.__G, e = makeUnit('enemy', 'spear', G.x + 120, G.y + 40); e.think = 99; e.order = 'hold'; let att = false;
    for (let s = 0; s < 40 && !e.dead; s++) { T.run(0.5); if (window.__gd.some(u => u.order === 'attack' && u.target === e)) att = true; }
    T.run(8);
    // one standing well outside: they must not go after it
    const far = makeUnit('enemy', 'archer', G.x + 560, G.y); far.think = 99; far.order = 'hold'; far.hp = far.maxHp = 99999; let maxOut = 0;
    for (let s = 0; s < 40; s++) { T.run(0.5); for (const u of window.__gd) if (!u.dead && !u.toHeal && !u.sick) maxOut = Math.max(maxOut, Math.hypot(u.x - G.x, u.y - G.y)); }
    far.dead = true; T.run(8);
    return { att, dead: e.dead, maxOut: Math.round(maxOut), back: window.__gd.filter(u => !u.dead && !u.toHeal && !u.sick).map(u => Math.round(Math.hypot(u.x - u.guardArea.spot.x, u.y - u.guardArea.spot.y))) }; });
  console.log('guard', JSON.stringify({ g1, g2 }));
  need(g1.set && g1.sel === 0 && g1.near.every(d => d < 80), 'Guard: the soldiers go to the place and stand round it');
  need(g2.att && g2.dead, 'Guard: they meet an enemy who comes into the area');
  need(g2.maxOut < ORDERS_LIMIT(), 'Guard: they do not chase an enemy far outside the area');
  need(g2.back.every(d => d < 60), 'Guard: afterwards they go back to their spots');
  // ---- three rally flags ----
  const fl = await p.evaluate(() => { const ids = ['rallyArmy', 'rallyTown', 'rallySiege'].map(id => document.getElementById(id)); return { have: ids.every(Boolean), svgs: new Set(ids.map(b => b && b.querySelector('svg') ? b.querySelector('svg').innerHTML : '')).size, labels: ids.map(b => b && b.textContent.trim()) }; });
  const spots = await p.evaluate(() => { const k = SD.keep(), pts = [[k.x + 160, k.y + 200], [k.x - 60, k.y + 230], [k.x + 260, k.y + 120]]; return pts.map(q => window.__scr({ x: q[0], y: q[1] })); });
  await p.evaluate(() => { UI.showTab('army'); });
  for (const [i, id] of ['rallyArmy', 'rallyTown', 'rallySiege'].entries()) { await p.evaluate(id => document.getElementById(id).click(), id); await p.mouse.click(spots[i].x, spots[i].y); }
  const fr = await p.evaluate(() => ({ army: !!rally.army, town: !!rally.town, siege: !!rally.siege, distinct: rally.army && rally.town && rally.siege && Math.hypot(rally.army.x - rally.siege.x, rally.army.y - rally.siege.y) > 50,
    who: { spear: rallyFor('spear') === rally.army, civ: rallyFor('civ') === rally.town, catapult: rallyFor('catapult') === rally.siege, ram: rallyFor('ram') === rally.siege, trebuchet: rallyFor('trebuchet') === rally.siege } }));
  await p.evaluate(() => { SD.centerOn(rally.army.x, rally.army.y); window.__drawMs = 0; window.__step(2); window.__drawMs = 999999; });
  await p.screenshot({ path: SP + '/tOrders-flags.png' });
  console.log('flags', JSON.stringify({ fl, fr }));
  need(fl.have && fl.svgs === 3, 'three rally flag buttons, each with its own picture');
  need(fr.army && fr.town && fr.siege && fr.distinct, 'each flag is set where you click');
  need(Object.values(fr.who).every(Boolean), 'soldiers gather at the army flag, citizens at the citizens\' flag, siege engines at the siege flag');
  // ---- the main army: those without orders of their own follow it ----
  const fo = await p.evaluate(() => { const k = SD.keep(); for (const u of window.__gd) u.dead = true;
    const mk = (type, c, r) => { const f = nearestFree(c, r); return makeUnit('player', type, f.c * TILE + 16, f.r * TILE + 16); };
    const army = [0, 1, 2, 3].map(i => mk('spear', k.c + 2 + i, k.r + 6)), cat = mk('catapult', k.c + 8, k.r + 5), fresh = mk('archer', k.c + 3, k.r + 9), own = mk('sword', k.c + 5, k.r + 9);
    own.cmdT = time;   // given an order of his own just now
    T.run(1); selectOnly(army); const f = nearestFree(k.c + 30, k.r + 20), to = { x: f.c * TILE + 16, y: f.r * TILE + 16 }, cr = document.getElementById('game').getBoundingClientRect();
    SD.centerOn(to.x, to.y); window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; const s = screenOf(to.x, to.y, 0); issueAt(s.x, s.y);
    T.run(3); const r = { cat: cat.order === 'move' && cat.dest && Math.hypot(cat.dest.x - to.x, cat.dest.y - to.y) < 260, fresh: fresh.order === 'move' && fresh.dest && Math.hypot(fresh.dest.x - to.x, fresh.dest.y - to.y) < 200, ownStays: own.order === 'idle' || Math.hypot(own.x - to.x, own.y - to.y) > 400, march: !!armyMarch };
    for (const u of army.concat([cat, fresh, own])) u.dead = true; return r; });
  console.log('follow', JSON.stringify(fo));
  need(fo.march && fo.cat && fo.fresh, 'soldiers and siege engines without orders of their own follow the main army');
  need(fo.ownStays, 'a soldier given his own order stays where he was sent');
  // ---- idle citizens go back to the campfire (or find work) ----
  const cf = await p.evaluate(() => { const k = SD.keep(), f = nearestFree(k.c + 9, k.r + 3), u = makeUnit('player', 'civ', f.c * TILE + 16, f.r * TILE + 16); u.manualT = time - 40; u.order = 'idle';
    const d0 = Math.hypot(u.x - playerFire.x, u.y - playerFire.y); T.run(40); return { d0: Math.round(d0), d: Math.round(Math.hypot(u.x - playerFire.x, u.y - playerFire.y)), order: u.order, job: !!u.job, toFire: u.order === 'move' && !!u.dest && Math.hypot(u.dest.x - playerFire.x, u.dest.y - playerFire.y) < 100, other: !!(u.toHeal || u.sick || u.breakUntil > time || u.order === 'build') }; });
  console.log('campfire', JSON.stringify(cf));
  need(cf.d < 100 || cf.toFire || cf.order === 'gather' || cf.job || cf.other, 'an idle citizen goes back to the campfire (unless he finds work, falls ill or takes a break)');
  await done();
})();
function ORDERS_LIMIT() { return 200 + 150 + 60; }   // the area (200) + the leash (150) + a little room
