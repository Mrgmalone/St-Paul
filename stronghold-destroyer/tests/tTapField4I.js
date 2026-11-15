// Phase 4I (Gerald, after 4H): "I don't have a box that pops up once I click on the farm or the field... a box pops up right
// next to it"; "the food needs to be picked first... automatically"; the guards "come with the building... free".
//  - a real mouse click and a real finger tap on a field or a farm open its box, beside it; so does a tap on one of its
//    workers or guards standing in it; people chosen and sent to a field still go to work there
//  - a field comes with two guards and a farm with one, free (no gold, no place in the houses)
//  - food first: when food runs short people leave other work to pick food; people picking food are not called to a new
//    workplace while food is needed (someone else takes it); a new field starts on corn; the farm feeds people again
const { start } = require('./lib4b');
(async () => {
  const { p, need, done } = await start('cyyoung', { start: 0, page: { hasTouch: true } });
  const setup = await p.evaluate(() => {
    res.wood = 3000; res.gold = 500; res.food = 2000; mood = 60; const k = SD.keep();
    const put = (kind, c, r) => { for (let rad = 0; rad < 30; rad++) for (let a = 0; a < 24; a++) { const cc = c + Math.round(Math.cos(a / 24 * 6.283) * rad), rr = r + Math.round(Math.sin(a / 24 * 6.283) * rad); if (canPlace(kind, cc, rr)) { const bb = createBuilding(kind, cc, rr); finishBuilding(bb); bb.hp = bb.maxHp; return bb; } } return null; };
    const gold0 = res.gold, pop0 = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && !u.gift).length;
    window.__f = put('wheatfarm', k.c + 7, k.r - 2); window.__fm = put('farm', k.c + 7, k.r + 5);
    T.people(8); T.run(4);
    const f = window.__f, fm = window.__fm;
    return { plan: Object.assign({}, f.plan), fieldGuards: guardsOf(f).length, farmGuards: guardsOf(fm).length, gold: gold0 - res.gold, giftGuards: guardsOf(f).concat(guardsOf(fm)).every(u => u.gift && u.type === 'knight' && !u.mounted),
      popAfter: units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && !u.gift).length - pop0, farmEvery: +farmRate(workersOf(fm)[0] || { job: null }, fm).toFixed(2) };
  });
  console.log('setup', JSON.stringify(setup));
  need(setup.plan.corn === 2 && setup.plan.wheat === 0, `a new field starts with two people on corn (${JSON.stringify(setup.plan)})`);
  need(setup.fieldGuards === 2 && setup.farmGuards === 1 && setup.gold <= 0 && setup.giftGuards, `the field comes with 2 guards and the farm with 1, free, knights on foot (${JSON.stringify(setup)})`);
  need(setup.popAfter === 8, `the guards take no place in the houses (${setup.popAfter} new people counted, the 8 citizens)`);
  // where things are on the screen
  const at = async (kind, what) => p.evaluate(([kind, what]) => {
    const b = kind === 'field' ? window.__f : window.__fm; UI.closePops && UI.closePops(); document.getElementById('storePop').hidden = true; storeShown = null; selection.clear();
    cam.z = 1.4; SD.centerOn((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); window.__step(3);
    let x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2, h = 0;
    if (what === 'worker') { const u = workersOf(b).find(w => w.x > b.x0 + 8 && w.x < b.x1 - 8 && w.y > b.y0 + 8 && w.y < b.y1 - 8) || workersOf(b)[0]; x = u.x; y = u.y; h = 22; }
    if (what === 'guard') { const g = guardsOf(b)[0]; x = g.x; y = g.y; h = 22; }
    const q = SD.scr(x, y, h), r = document.getElementById('game').getBoundingClientRect();
    const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([px, py]) => SD.scr(px, py, 0));
    return { x: r.left + q.x, y: r.top + q.y, bx0: r.left + Math.min(...pts.map(o => o.x)), bx1: r.left + Math.max(...pts.map(o => o.x)) };
  }, [kind, what]);
  const box = () => p.evaluate(() => { const el = document.getElementById('storePop'), r = el.getBoundingClientRect(), b = storeShown, g = document.getElementById('game').getBoundingClientRect();
    const pts = b && b.x0 !== undefined ? [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([px, py]) => SD.scr(px, py, 0)) : [{ x: 0 }];   /* (where the field is now: the view may have slid to make room) */
    return { open: !el.hidden, title: (el.querySelector('h3') || {}).textContent || '', left: Math.round(r.left), right: Math.round(r.right), bx0: Math.round(g.left + Math.min(...pts.map(o => o.x))), bx1: Math.round(g.left + Math.max(...pts.map(o => o.x))), crops: !!el.querySelector('[data-ind="crop+:corn"]'), animals: !!el.querySelector('[data-ind="raise:cows"]'), guards: /Guards/.test(el.textContent) }; });
  const results = {};
  for (const [kind, what, how] of [['field', 'middle', 'mouse'], ['field', 'middle', 'touch'], ['field', 'worker', 'mouse'], ['field', 'worker', 'touch'], ['field', 'guard', 'touch'], ['farm', 'middle', 'mouse'], ['farm', 'middle', 'touch'], ['farm', 'worker', 'touch']]) {
    const q = await at(kind, what); await p.waitForTimeout(400);   /* (no double tap) */
    if (how === 'mouse') await p.mouse.click(q.x, q.y); else await p.touchscreen.tap(q.x, q.y);
    await p.waitForTimeout(150); await p.evaluate(() => window.__step(1));
    const b = await box(); results[`${kind} ${what} ${how}`] = Object.assign(b, { beside: b.left >= b.bx1 - 2 || b.right <= b.bx0 + 2 });
  }
  console.log('taps', JSON.stringify(results));
  for (const [k, b] of Object.entries(results)) {
    const want = k.startsWith('field') ? 'FIELD' : 'FARM';
    need(b.open && b.title === want && (want === 'FIELD' ? b.crops : b.animals) && b.guards, `${k}: the ${want.toLowerCase()}'s box opens with its controls and guards (${JSON.stringify(b)})`);
    need(b.beside, `${k}: the box opens beside the ${want.toLowerCase()}, not over it`);
  }
  // with people chosen, a tap on the field still sends them to work it
  const sent = await p.evaluate(() => { document.getElementById('storePop').hidden = true; storeShown = null; const c = T.people(1)[0]; window.__step(2); selectOnly([c]); return c.id; });
  { const q = await at('field', 'middle'); await p.evaluate(id => selectOnly([units.find(u => u.id === id)]), sent); await p.mouse.click(q.x, q.y); await p.waitForTimeout(100); }
  const went = await p.evaluate(id => { const u = units.find(v => v.id === id); return !!u && u.job === window.__f; }, sent);
  need(went, 'a citizen chosen and sent to a field goes to work in it');

  // ---------- food first ----------
  const ff = await p.evaluate(() => {
    const out = {}; for (const u of units) if (u.team === 'player' && u.type === 'civ' && !u.dead) { u.job = null; u.order = 'idle'; u.task = null; }
    for (const f of farms) if (f.team === 'player') f.asleep = true;   /* (the field and farm rest: this part is about other work) */
    const hut = T.put('woodhut'), ale = T.put('alehouse'), pole = T.put('poleturner'); T.people(6); T.run(3);
    out.staffedFirst = [staffOf(hut), staffOf(ale), staffOf(pole)];
    // everyone has work (no one is free to pick food): those without a job leave the town for this part
    for (const u of units) if (u.team === 'player' && u.type === 'civ' && !u.dead && !u.job) { u.dead = true; u.hp = 0; } T.run(0.2);
    // the stores run nearly empty: people leave other work, alehouse first, to pick food
    res.food = 10; foodKinds.crops = 10; foodKinds.berries = 0; foodKinds.corn = 0; foodKinds.farm = 0; foodKinds.bread = 0;
    const eatMin = foodFirst(units.filter(u => u.type === 'civ' && u.team === 'player' && !u.dead)).eatMin, need0 = Math.ceil(eatMin / FOOD_FIRST.perPicker);
    T.run(1.2); out.firstToLeave = staffOf(ale) === 0 && staffOf(hut) === 2;
    T.run(8); res.food = Math.min(res.food, 10);
    const civs = units.filter(u => u.type === 'civ' && u.team === 'player' && !u.dead);
    out.pickers = civs.filter(u => !u.job && u.order === 'gather' && u.task && u.task.type === 'food').length; out.needPickers = need0;
    out.staffNow = [staffOf(hut), staffOf(ale), staffOf(pole)];
    // food is still needed (less than four minutes of eating): a new workplace does not take anyone picking food
    T.people(6); T.run(3);   /* (some people with no job again: they pick food first) */
    res.food = Math.round(eatMin * 2.5); foodKinds.crops = res.food;
    for (const u of civs) if (!u.job) { const b = bushes.filter(x => x.amount > 3).sort((a, c) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(c.x - u.x, c.y - u.y))[0]; if (b) commandGather([u], b); u.manualT = -99; }
    const pickers0 = civs.filter(u => !u.job && u.order === 'gather' && u.task && u.task.type === 'food');
    const bow = T.put('bowyer'); T.run(3);
    out.newShopStaff = staffOf(bow); out.pickersKept = pickers0.filter(u => !u.job).length === pickers0.length;
    // and once food is plentiful, work is staffed as before
    res.food = 5000; foodKinds.crops = 5000; T.run(4); out.staffPlenty = staffOf(bow);
    return out; });
  console.log('food first', JSON.stringify(ff));
  need(ff.staffedFirst.every(n => n >= 1), `with food enough, workplaces are staffed by themselves (${ff.staffedFirst})`);
  need(ff.firstToLeave, 'when the stores run nearly empty, the alehouse worker is first to leave to pick food');
  need(ff.pickers >= Math.min(ff.needPickers, 4), `people go to pick food by themselves (${ff.pickers} picking; ${ff.needPickers} wanted, from 4 workers)`);
  need(ff.newShopStaff === 0 && ff.pickersKept, `while food is needed, no one picking food is called to a new workplace (${ff.newShopStaff} at the new fletcher)`);
  need(ff.staffPlenty >= 1, `with food plentiful, the new workplace is staffed (${ff.staffPlenty})`);
  need(setup.farmEvery > 0 && setup.farmEvery <= 3.2, `a farm keeper brings in food about every ${setup.farmEvery} seconds (it was 8 in 4H)`);
  await done();
})();
