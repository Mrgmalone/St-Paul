// Phase 4B step B3, citizens: they grow in your houses (3-5 minutes) and cannot be bought; every building gets one worker
// before any gets a second; they gather near the castle; some study at the school. The People tab lists them and pauses the
// game; a quick tap on a person shows his trade's icon; holding him a second makes him speak and opens his card (beside him
// on an iPad, sliding up from the bottom on a phone). Needs alerts are shown, and the most urgent is spoken.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done, SP } = await start('hekaranok');
  await p.evaluate(() => { window.__spoken = []; speechSynthesis.speak = u => { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 20); }; speechSynthesis.cancel = () => {}; });
  const r = await p.evaluate(() => {
    const out = {}, civs = () => units.filter(u => u.team === 'player' && !u.dead && u.type === 'civ');
    out.civLocked = document.querySelector('.tb[data-k="civ"]').classList.contains('locked');
    const q0 = trainQueue.length; SD.res.food = 500; trainUnit('civ'); out.notBought = trainQueue.length === q0;
    T.run(6); out.growing = growing.length; out.growDur = growing.length ? Math.round(growing[0].dur) : 0;
    const n0 = civs().length; growing[0].t = growing[0].dur - 0.5; T.run(2); out.grewUp = civs().length - n0;
    // one each first: as many buildings as free people, each wanting two or more
    SD.res.wood = 3000; const free = civs().filter(u => !u.job).length;
    const kinds = ['woodhut', 'farm', 'wheatfarm', 'woodhut', 'farm', 'wheatfarm', 'woodhut', 'farm', 'wheatfarm', 'woodhut', 'farm', 'wheatfarm'], made = [];
    for (let i = 0; i < Math.min(free, kinds.length); i++) made.push(T.put(kinds[i]));
    T.run(3); out.oneEach = made.filter(Boolean).map(b => staffOf(b)).join(',');
    // the People tab
    T.people(6);
    return out;
  });
  console.log(JSON.stringify(r));
  need(r.civLocked && r.notBought, 'citizens cannot be bought');
  need(r.growing >= 1 && r.growDur >= 180 && r.growDur <= 300, 'citizens grow up in 3 to 5 minutes');
  need(r.grewUp === 1, 'a grown citizen joins the town');
  need(r.oneEach.split(',').every(n => n === '1'), 'every building gets one worker before any gets a second');
  await p.click('#btnPeople'); await p.evaluate(() => window.__step(6));
  const tab = await p.evaluate(() => ({ open: !document.getElementById('peoplePop').hidden, paused: menuPause, text: document.getElementById('peoplePop').textContent.replace(/\s+/g, ' ').slice(0, 260), rows: document.querySelectorAll('#peoplePop .prow').length, scroll: getComputedStyle(document.getElementById('peoplePop')).overflowY }));
  console.log('people tab:', JSON.stringify(tab));
  need(tab.open && tab.paused && /Growing up/.test(tab.text) && /Citizens/.test(tab.text) && tab.rows > 5 && tab.scroll === 'auto', 'the People tab: counts, growing, jobs, everyone; it scrolls and pauses the game');
  await p.screenshot({ path: SP + '/people-tab.png' });
  await p.click('#peoplePop .prow'); await p.evaluate(() => window.__step(2));
  const card1 = await p.evaluate(() => ({ open: !document.getElementById('personPop').hidden, text: document.getElementById('personPop').textContent.replace(/\s+/g, ' ').slice(0, 300) }));
  need(card1.open && /Happiness/.test(card1.text) && /Education/.test(card1.text) && /Earns/.test(card1.text) && /Worries/.test(card1.text), 'a name in the list opens that person\'s card');
  // quick tap and hold on a person with the mouse
  await p.evaluate(() => { document.getElementById('personPop').hidden = true; cardOf = null; T.close(); paused = true; selection.clear(); window.__step(1); document.getElementById('btnFix').hidden = true; });   /* (the fix button floats over a selected person; frames are not drawn here) */
  const at = await p.evaluate(() => { const k = SD.keep(), u = units.find(v => v.team === 'player' && v.type === 'civ' && !v.dead && v.job) || units.find(v => v.team === 'player' && v.type === 'civ' && !v.dead);
    // a spot where a tap lands on him and nothing else (the map differs each game)
    let q = null; for (let i = 0; i < 40; i++) { const f = nearestFree(k.c + 1 + (i % 8) * 2 - 6, k.r + 7 + Math.floor(i / 8) * 2); if (!f) continue; u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; u.path = []; u.order = 'idle';
      SD.cam.z = 1.2; SD.centerOn(u.x, u.y); window.__drawMs = 0; window.__step(2); window.__drawMs = 999999; q = screenOf(u.x, u.y, 20 + elev3D(u)); if (pickScreen(q.x, q.y) === u) break; }
    window.__who = u; const h = pickScreen(q.x, q.y), cr = document.getElementById("game").getBoundingClientRect(), el = document.elementFromPoint(q.x + cr.left, q.y + cr.top); return { x: q.x + cr.left, y: q.y + cr.top, ok: h === u, hit: h ? h.kind || h.type : null, el: el && (el.id || el.tagName), paused, sel: selection.size }; });
  console.log("at", JSON.stringify(at));
  await p.evaluate(() => { window.__log = []; const ps = pickScreen; pickScreen = (a, c) => { const h = ps(a, c); __log.push('pick ' + Math.round(a) + ',' + Math.round(c) + ' ' + (h && (h.kind || h.type) + (h === window.__who ? '*' : ''))); return h; }; const t0 = talkTo; talkTo = x => { __log.push('talk'); t0(x); }; });
  await p.mouse.click(at.x, at.y); await p.waitForTimeout(150); console.log('click log', await p.evaluate(() => JSON.stringify(window.__log))); await p.evaluate(() => window.__step(1));
  const tap = await p.evaluate(() => ({ icon: !document.getElementById('tapIcon').hidden, card: !document.getElementById('personPop').hidden, spoken: window.__spoken.length }));
  need(tap.icon && !tap.card, 'a quick tap shows the trade icon only');
  await p.evaluate(() => { selection.clear(); document.getElementById('btnFix').hidden = true; }); await p.evaluate(() => { window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; }); await p.mouse.move(at.x, at.y); await p.mouse.down(); await p.waitForTimeout(1300); await p.mouse.up(); await p.evaluate(() => window.__step(1));
  const hold = await p.evaluate(a => ({ card: !document.getElementById('personPop').hidden, who: cardOf === window.__who && (r => r.left > a.x || r.right < a.x)(document.getElementById('personPop').getBoundingClientRect()), sheet: document.getElementById('personPop').classList.contains('sheet'), spoken: window.__spoken.slice(-1)[0] || '', text: document.getElementById('personPop').textContent.replace(/\s+/g, ' ').slice(0, 200) }), at);
  console.log('tap', JSON.stringify(tap), 'hold', JSON.stringify(hold));
  need(hold.card && hold.who && !hold.sheet && /I am /.test(hold.spoken), 'holding a person: he speaks, and his card floats beside him');
  await p.screenshot({ path: SP + '/person-card.png' });
  // needs alerts, and the most urgent spoken
  const al = await p.evaluate(() => { document.getElementById('personPop').hidden = true; cardOf = null; paused = false; stageN = 2; const f = T.put('wheatfarm'); T.run(6);
    const a = document.getElementById('alertBar').textContent; spendFood(Math.floor(SD.res.food)); SD.res.food = 0; T.run(6);
    return { sentry: /needs a sentry/.test(collectAlerts().map(x => x.text).join('|')), shown: !document.getElementById('alertBar').hidden, first: document.querySelector('#alertBar .al').textContent, spoken: window.__spoken.slice(-1)[0] }; });
  console.log('alerts', JSON.stringify(al));
  need(al.sentry && al.shown && /no food/.test(al.first) && /no food/.test(al.spoken), 'needs alerts: shown, the most urgent spoken');
  await p.evaluate(() => addFood('crops', 300));
  // school pupils and staying near the castle
  const sc = await p.evaluate(() => { stageN = 3; SD.res.gold = 2000; SD.res.stone = 500; T.people(8); const s = T.put('school'); startStudy('school'); T.run(4);
    const pupils = units.filter(u => u.inSchool && !u.dead).length; T.close(); showPeople(); const txt = document.getElementById('peoplePop').textContent; document.getElementById('peoplePop').hidden = true;
    T.run(20); const k = SD.keep(), far = units.filter(u => u.team === 'player' && u.type === 'civ' && !u.dead && !u.job && u.order === 'gather' && u.task && u.task.node && Math.hypot(nodeCenter(u.task.node).x - k.x, nodeCenter(u.task.node).y - k.y) > 770).length;
    return { pupils, shown: /In school\s*3/.test(txt), far }; });
  console.log('school', JSON.stringify(sc));
  need(sc.pupils === 3 && sc.shown, 'three citizens study while the school teaches, and the People tab shows it');
  need(sc.far === 0, 'citizens with no trade gather near the castle');
  // a phone: the card slides up from the bottom
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => { window.__step(2); holdPerson(units.find(v => v.team === 'player' && v.type === 'civ' && !v.dead)); window.__drawMs = 0; window.__step(2); window.__drawMs = 999999; });
  const ph = await p.evaluate(() => { const el = document.getElementById('personPop'), r = el.getBoundingClientRect(); return { sheet: el.classList.contains('sheet'), bottom: Math.round(r.bottom), h: innerHeight, w: Math.round(r.width) }; });
  console.log('phone card', JSON.stringify(ph)); await p.waitForTimeout(400); await p.screenshot({ path: SP + '/person-card-phone.png' });
  need(ph.sheet && Math.abs(ph.bottom - ph.h) < 4 && ph.w >= 380, 'on a phone the card slides up from the bottom');
  await done();
})();
