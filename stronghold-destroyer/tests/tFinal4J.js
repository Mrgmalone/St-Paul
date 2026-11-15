// Phase 4J (Gerald): markers over the buildings that are asking; the compass when a building is let go; the low brick wall;
// any soldier on any wall or tower; walls that drop while you draw; the sick alert over ten and the apothecary's carers; the voice volume.
const { start } = require('./lib4b');
(async () => {
  const { p, need, done } = await start('cyyoung', { start: 0 });
  const r = await p.evaluate(async () => {
    const out = {}; res.wood = 9000; res.stone = 5000; res.gold = 3000; res.food = 3000; mood = 60; T.people(14); T.run(3);
    Object.assign(FOOD_FIRST, { protect: 0, min: 0, low: 0, short: 0 });
    // ---- markers ----
    const bow = T.put('bowyer'), f = T.put('farm'), al = T.put('alehouse'); for (const u of units) if (u.team === 'player' && u.type === 'civ') { u.job = null; } bow.asleep = false;
    bow.fire = 1; al.fire = 1; f.fire = 1;   /* three buildings with something to say */
    alertT = 0; updateAlerts(99); citizensFrame(); window.__step(2);
    const marks = markList.slice(); out.markCount = marks.length; out.markDistinct = new Set(marks.map(b => markOf(b).col + markOf(b).shape)).size === marks.length;
    out.markEls = document.querySelectorAll('#markLayer .bmark').length; out.alertHasSvg = /<svg/.test(document.getElementById('alertBar').innerHTML);
    bow.fire = al.fire = f.fire = 0; alertT = 0; updateAlerts(99);
    // ---- compass ----
    UI.closePops && UI.closePops(); startPlacing('house'); const k = SD.keep(); let at = null; for (let rad = 6; rad < 30 && !at; rad++) for (let a = 0; a < 24 && !at; a++) { const c = k.c + Math.round(Math.cos(a / 24 * 6.283) * rad), rr = k.r + Math.round(Math.sin(a / 24 * 6.283) * rad); if (canPlace('house', c, rr, 0) && canPlace('house', c, rr, 3)) at = { x: (c + 1) * TILE, y: (rr + 1) * TILE }; }
    const s0 = SD.scr(at.x, at.y, 0);
    placeAt(s0.x, s0.y, false); out.compassOpen = !!placing && !!placing.pending && !document.getElementById('compass').hidden; const n0 = structures.length;
    out.noTurnText = document.getElementById('btnTurn').hidden;
    document.querySelector('#compass .cmpE').click(); out.placedFacing = structures.length === n0 + 1 && structures[structures.length - 1].dir === 3;
    // ---- low brick wall ----
    stageN = 2; window.__step(25); startPlacing('lowwall'); out.lowStarted = placing && placing.kind === 'lowwall';
    const w1 = createBuilding('lowwall', k.c + 12, k.r + 6); finishBuilding(w1); out.lowKind = [w1.kind, w1.mat, w1.low, canMount(w1)];
    // ---- any soldier on a high wall without stairs; a tower ----
    const hw = createBuilding('highwall', k.c + 14, k.r + 6); finishBuilding(hw); const sp = T.people(1, 'spear')[0], ar = T.people(1, 'archer')[0];
    commandMount([sp, ar], hw); T.run(8); out.onWall = [!!sp.onWall, !!ar.onWall];
    // ---- walls drop while drawing ----
    startPlacing('wall'); out.wallsDown = wallsDownNow(); cancelPlacing(); out.wallsUp = !wallsDownNow(); setEditWalls(true); out.edit = wallsDownNow(); setEditWalls(false);
    // ---- sickness alert over ten; apothecary ----
    const civs = units.filter(u => u.type === 'civ' && u.team === 'player' && !u.dead); for (const u of civs.slice(0, 5)) u.sick = 1; updateAlerts(99); alertT = 0; updateAlerts(99);
    out.noAlertAt5 = !collectAlerts().some(a => /ill/.test(a.text));
    stageN = 3; for (const u of units.filter(u => u.team === 'player' && !u.dead && u.type === 'civ').slice(0, 12)) u.sick = 1; T.people(10);
    out.alertAt12 = collectAlerts().some(a => /ill/.test(a.text) && /apothecary/i.test(a.text));
    const ap = T.put('apothecary'); T.act(ap, 'fill'); T.run(3); out.carers = staffOf(ap); out.maxCarers = indStaff('apothecary'); const r5 = healRate(ap); const keepOne = staffOf(ap);
    showIndBox(ap); out.apBox = /Carers/.test(document.getElementById('storePop').textContent); T.close();
    out.rate = r5;
    const sc = T.put('school'); showIndBox(sc); out.schoolBox = /Pupils in class/.test(document.getElementById('storePop').textContent); T.close();
    // ---- voice ----
    out.voiceSlider = !!document.getElementById('volVoice'); VOICE.vol = 0.4; out.voiceVol = VOICE.vol;
    return out; });
  console.log(JSON.stringify(r));
  need(r.markCount >= 1 && r.markDistinct && r.markEls === r.markCount, `each asking building gets its own marker over it (${r.markCount} buildings, ${r.markEls} drawn)`);
  need(r.alertHasSvg, 'the alert text carries the same marker');
  need(r.compassOpen && r.noTurnText && r.placedFacing, `letting go opens a compass; tapping East sets it down facing that way (${r.compassOpen} ${r.noTurnText} ${r.placedFacing})`);
  need(r.lowStarted && r.lowKind[0] === 'wall' && r.lowKind[1] === 'brick' && r.lowKind[2] && !r.lowKind[3], `a low brick wall can be bought and cannot be stood on (${JSON.stringify(r.lowKind)})`);
  need(r.onWall[0] && r.onWall[1], `a spearman and an archer both climb a high wall with no stairs (${r.onWall})`);
  need(r.wallsDown && r.wallsUp && r.edit, 'walls drop while you draw them or edit, and stand again after');
  need(r.noAlertAt5 && r.alertAt12, 'the ill alert comes only above ten');
  need(r.carers >= 2 && r.maxCarers === 5 && r.apBox && r.rate > 1.5, `the apothecary takes carers (up to five) and shows them (${r.carers}, rate ${r.rate})`);
  need(r.schoolBox, 'the school box shows pupils in class');
  need(r.voiceSlider && Math.abs(r.voiceVol - 0.4) < 0.01, 'there is a voice volume slider');
  await done();
})();
