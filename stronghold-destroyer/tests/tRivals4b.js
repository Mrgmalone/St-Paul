// Phase 4B steps B7 and B8: the rivals live by your rules (citizens grow; the new buildings at the same stages; fires fought
// and damage mended; escorted woodcutters from the Hold; mounted knights on stable horses; soldier lessons; a ballista on great
// towers; a scout before raids; each raid from a different side; surplus traded through the friend), and the Art of War
// advisor (always on in the top corner, one short tip at a time, shown and spoken).
const { start } = require('./lib4b');
(async () => {
  const { p, need, done, SP } = await start('ticanologue');
  await p.evaluate(() => { window.__spoken = []; speechSynthesis.speak = u => { window.__spoken.push(u.text); u.onend && u.onend(); }; });
  const r = await p.evaluate(() => {
    const out = {}, R = REALM.rivals.find(x => !x.friend && x.keep), F = REALM.rivals.find(x => x.friend);
    out.plan = RIVAL_PLAN[1].some(x => x[0] === 'alehouse') && RIVAL_PLAN[1].some(x => x[0] === 'waterpot') && RIVAL_PLAN[3].some(x => x[0] === 'school') && RIVAL_PLAN[3].some(x => x[0] === 'stable');
    R.res.food = 300; T.run(8); out.growing = (R.growing || []).length > 0 || rivalCivs(R).length >= RIVALS.workersPerStage[R.stage - 1];
    const c0 = rivalCivs(R).length; if (R.growing && R.growing[0]) R.growing[0].t = R.growing[0].dur; T.run(2); out.grew = rivalCivs(R).length > c0 || rivalCivs(R).length >= RIVALS.workersPerStage[R.stage - 1];
    // a fire at the rival's: his own people fight it
    const mk = (kind, dc, dr) => { const at = rivalSpot(R, kind) || { c: R.keep.c + dc, r: R.keep.r + dr }; return placeRivalBuilding(R, kind, at.c, at.r); };
    const rb = mk('house', 6, 6); if (rb) finishBuilding(rb); R.res.food = 300; T.run(1);
    if (rb) { ignite(rb); T.run(3); out.rivalFighters = units.filter(u => u.order === 'firefight' && u.fireB === rb).length; T.run(40); out.rivalPutOut = !(rb.fire > 0) || rb.dead; }
    // damage mended
    const rb2 = mk('granary', -6, 6); if (rb2) finishBuilding(rb2); if (rb2) { rb2.hp = rb2.maxHp * 0.5; T.run(3); out.rivalRepair = units.some(u => u.order === 'repair' && u.repairB === rb2); }
    // escorts from the Hold; mounted knights from the Castle with a stable
    R.stage = 3; const k = R.keep; for (const u of rivalCivs(R).slice(0, 5)) { u.x = k.x + 600; u.y = k.y + 100; }
    const g1 = rivalUnit(R, 'spear', k.x + 40, k.y1 + 40); g1.order = 'idle'; T.run(2); out.rivalEscort = units.some(u => u.escort && u.escort.site === rivalSite(R));
    R.stage = 4; const st = createBuilding('stable', k.c + 8, k.r + 8); st.team = R.team; st.owner = R.id; st.fac = R.fac; finishBuilding(st);
    const kn = rivalUnit(R, 'knight', k.x + 60, k.y1 + 60); T.run(2); out.rivalMounted = kn.mounted === true;
    // a ballista on a great tower; lessons at the school
    const gt = createBuilding('greattower', k.c - 8, k.r + 8); gt.team = R.team; gt.owner = R.id; gt.fac = R.fac; finishBuilding(gt); R.res.gold = 500; T.run(2); out.rivalEngine = gt.engine === 'ballista';
    const sc = createBuilding('school', k.c + 8, k.r - 6); sc.team = R.team; sc.owner = R.id; finishBuilding(sc); R.lessonT = 1e6; T.run(2); out.rivalLessons = (R.soldierLvl || 0) >= 1;
    // a scout, then raids from different sides
    R.scoutT = 0.5; rivalUnit(R, 'archer', k.x + 30, k.y1 + 30).order = 'idle'; T.run(2); out.scout = units.some(u => u.owner === R.id && u.scout);
    const w1 = [], w2 = []; raidSide(R, w1); raidSide(R, w2); out.sides = w1[0] && w2[0] ? Math.round(Math.hypot(w1[0].x - w2[0].x, w1[0].y - w2[0].y)) : 0;
    // trade through the friend
    R.res.wood = 1000; R.tradeT = 0.5; T.run(2); out.traded = F ? (R.trades || 0) >= 1 : 'no friend';
    // the advisor
    ADVISOR.at = -99; T.run(2); const tips = document.getElementById('tips'); out.tip = tips.textContent; out.tipShown = tips.classList.contains('adv') && /Art of War/.test(tips.textContent);
    out.spoken = window.__spoken.some(s => tips.textContent.includes(s));
    return out;
  });
  console.log(JSON.stringify(r));
  need(r.plan, "the new buildings are in the rivals' plans at the same stages");
  need(r.growing && r.grew, "the rivals' citizens grow in their houses");
  need(r.rivalFighters >= 1 && r.rivalPutOut, 'a rival fights a fire at his castle');
  need(r.rivalRepair, 'a rival mends damage');
  need(r.rivalEscort, "a rival's woodcutters go out with an escort from the Hold");
  need(r.rivalMounted, "a rival's knights ride stable horses from the Castle");
  need(r.rivalEngine && r.rivalLessons, "a rival's great tower carries a ballista and his soldiers take lessons");
  need(r.scout && r.sides > 300, 'a rival sends a scout, and each raid comes from a different side');
  need(r.traded === true || r.traded === 'no friend', 'a rival trades surplus through the friend');
  need(r.tipShown && r.spoken, 'the advisor shows one short tip in the corner and says it');
  await p.evaluate(() => { const k = SD.keep(); SD.cam.z = 0.9; SD.centerOn(k.x, k.y); window.__drawMs = 0; window.__step(2); window.__drawMs = 999999; });
  await p.screenshot({ path: SP + '/advisor.png' });
  await done();
})();
