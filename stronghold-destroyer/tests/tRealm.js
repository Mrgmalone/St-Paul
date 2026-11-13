// The four rivals, the trading friend and the rogues, in a game started from the front page:
// - four rivals, each a different faction, one a trading friend whose faction is not yours, all named and shown in the Rivals box;
// - a rival uses its own faction's rule (healers: weaker people, the wounded run home; Psychana: far sight; Cy Young: sells spare food);
// - raids come from the rival's own base, siege engines only with a large army;
// - the trading friend actually trades with you through your market;
// - rogue bandits belong to no rival, steal and run off;
// - a rival's stage rises with its economy, and burning its farms and woodcutter slows it.
const { chromium } = require('playwright'); const env = require('./env');
(async () => {
  const b = await chromium.launch(env.LAUNCH); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 999999 });
  const errs = [], fails = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  const need = (ok, what) => { if (!ok) fails.push(what); };
  await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
  await p.goto(env.GAME_REAL + '?start=0');   /* the west start: this check places stores by distance from it (random starts have their own check, tFog) */ await p.waitForTimeout(600);
  await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
  await p.click('.fac[data-fac="cyyoung"]'); await p.click('.fac[data-fac="cyyoung"] .fgo');
  // ---- who they are ----
  const who = await p.evaluate(() => { window.__step(3); document.getElementById('banner').style.display = 'none';
    showRivalsPop(); const box = document.getElementById('rivalsPop').textContent; document.getElementById('rivalsPop').hidden = true;
    return { facs: REALM.rivals.map(R => R.fac), friends: REALM.rivals.filter(R => R.friend).map(R => R.fac), keeps: REALM.rivals.filter(R => R.keep && R.keep.fac === R.fac).length,
      lords: REALM.rivals.filter(R => R.lord && R.lord.owner === R.id).length, inBox: REALM.rivals.every(R => box.includes(R.name) && box.includes(FACTIONS[R.fac].name)),
      people: REALM.rivals.map(R => rivalPeople(R).length), soldiers: REALM.rivals.map(R => rivalArmy(R).length) }; });
  console.log('rivals', JSON.stringify(who));
  need(new Set(who.facs).size === 4, 'four rivals, each a different faction'); need(who.friends.length === 1 && who.friends[0] !== 'cyyoung', 'one trading friend, not your faction');
  need(who.keeps === 4 && who.lords === 4 && who.inBox, 'each rival has its keep, its lord and shows in the Rivals box'); need(who.soldiers.every(n => n === 0), 'no rival starts with an army');
  // ---- a rival uses its own faction's rule ----
  const rules = await p.evaluate(() => {
    const by = f => REALM.rivals.find(R => R.fac === f), out = {};
    const H = by('hekaranok'), P = by('psychana'), C = by('cyyoung');
    out.healerWorkerHp = rivalPeople(H).find(u => u.type === 'civ').maxHp;
    const hs = rivalUnit(H, 'spear', H.keep.x + 260, H.keep.y1 + 120); window.__step(4); hs.hp = hs.maxHp * 0.2; window.__step(40); out.healerFlees = !!(hs.hk && (hs.hk.state === 'going' || hs.hk.state === 'healing'));
    out.psychanaSight = rivalUnit(P, 'spear', P.keep.x + 100, P.keep.y1 + 60).sight;
    C.res.food = 600; const g0 = C.res.gold; rivalTick(C, 1); out.cySold = C.res.gold - g0; out.cyFood = Math.round(C.res.food);
    return out; });
  console.log('rules', JSON.stringify(rules));
  need(rules.healerWorkerHp < 50, 'Hekaranok rival: weaker people'); need(rules.healerFlees, 'Hekaranok rival: the wounded run home'); need(rules.psychanaSight === 240, 'Psychana rival: far sight');
  need(rules.cySold > 0 && rules.cyFood <= 210, 'Cy Young rival sells its spare food');
  // ---- raids from the rival's base; siege only with a large army ----
  const raid = await p.evaluate(() => {
    const R = REALM.rivals.find(x => !x.friend), out = {};
    for (let i = 0; i < 5; i++) rivalUnit(R, 'spear', R.keep.x + 40 + i * 16, R.keep.y1 + 60);
    rivalRaid(R); const go = SD.units.filter(u => u.owner === R.id && u.raider && !u.dead);
    out.small = go.length; out.smallSiege = go.filter(u => isMachine(u)).length; out.fromHome = go.every(u => Math.hypot(u.x - R.keep.x, u.y - R.keep.y) < 500); out.route = go.every(u => u.route && u.route.length > 2); out.routeLens = go.map(u => u.route ? u.route.length : -1).join(','); out.dist = Math.round(Math.hypot(R.keep.x - SD.keep().x, R.keep.y - SD.keep().y));
    R.stage = 4; R.res.wood = 999; R.res.stone = 999; R.res.gold = 999; for (let i = 0; i < 14; i++) rivalUnit(R, 'spear', R.keep.x - 60 + (i % 7) * 16, R.keep.y1 + 90 + Math.floor(i / 7) * 16);
    rivalRaid(R); out.bigSiege = SD.units.filter(u => u.owner === R.id && u.raider && !u.dead && isMachine(u)).length;
    for (const u of SD.units) if (u.owner === R.id && u.raider) { u.dead = true; }   // send them away again for the rest of the check
    R.stage = 1; return out; });
  console.log('raid', JSON.stringify(raid));
  need(raid.small >= 3 && raid.smallSiege === 0, 'a small raid has no siege engines'); need(raid.fromHome && raid.route, 'raids set out from the rival\'s own base on a route'); need(raid.bigSiege >= 1, 'a large army brings a siege engine');
  // ---- the trading friend trades through your market ----
  const trade = await p.evaluate(() => {
    const F = tradeFriend(), k = SD.keep(); stageN = 3; F.stage = 3; Object.assign(F.res, { food: 600, wood: 500, stone: 200, iron: 60, gold: 300 }); SD.res.gold = 300; SD.res.stone = 50;
    const f = nearestFree(k.c + 6, k.r + 4); const m = createBuilding('market', f.c, f.r); finishBuilding(m);
    const g0 = SD.res.gold, w0 = SD.res.wood, fw0 = F.res.wood; const a = friendTrade('buy', 'wood'), c = friendTrade('sell', 'stone');
    showMarket(m); const box = document.getElementById('storePop').textContent.includes('TRADE WITH'); document.getElementById('storePop').hidden = true; storeShown = null; stageN = 1; F.stage = 1;
    return { a, c, wood: SD.res.wood - w0, friendWood: F.res.wood - fw0, box, traded: F.traded }; });
  console.log('trade', JSON.stringify(trade));
  need(trade.wood === 10 && trade.friendWood === -10 && trade.traded === 2 && trade.box, 'the trading friend trades through your market');
  // ---- rogues ----
  const rog = await p.evaluate(() => {
    SD.keep().range = 0; const k = SD.keep(); /* a stockpile far from the keep (and the king), on your side of the river: the band's nearest store */ const sp = nearestFree(Math.floor((k.x - 120) / TILE), Math.floor((k.y + 900) / TILE)); const pile = createBuilding('stockpile', sp.c, sp.r); finishBuilding(pile); SD.res.wood += 100; const fr = nearestFree(Math.floor((k.x - 200) / TILE), Math.floor((k.y + 1400) / TILE)); spawnRogues({ x: fr.c * TILE + 16, y: fr.r * TILE + 16 }); const band = SD.units.filter(u => u.rogue && !u.dead), out = { n: band.length, owner: band.every(u => u.owner === undefined && !u.fac && u.team === 'rogue'), hostileToRivals: hostile('rogue', 'enemy') };
    for (let i = 0; i < 80 && band.some(u => !u.dead); i++) window.__step(100);
    out.loot = band.reduce((a, u) => a + (u.loot || 0), 0); out.gone = band.every(u => u.dead); SD.keep().range = 240; return out; });
  console.log('rogues', JSON.stringify(rog));
  need(rog.n >= 2 && rog.owner && rog.hostileToRivals, 'rogues belong to no rival'); need(rog.loot > 0 && rog.gone, 'rogues steal and run off');
  // ---- a rival's stage rises with its economy; burning its farms and woodcutter slows it ----
  const grow = await p.evaluate(() => {
    const foes = REALM.rivals.filter(R => !R.friend), A = foes[0], B = foes[1], out = {};
    for (const R of REALM.rivals) R.raidT = 99999;   // no raids during this part
    let aStage2 = null, bStage2 = null;
    for (let s = 0; s < 480; s++) {   // eight minutes
      for (const x of SD.structures.concat(farms)) if (x.owner === A.id && !x.dead && (x.kind === 'farm' || x.kind === 'woodhut' || x.kind === 'wheatfarm')) { x.hp = 0; if (farms.includes(x)) { x.dead = true; farms.splice(farms.indexOf(x), 1); } else kill(x); }
      window.__step(20);
      if (A.stage >= 2 && aStage2 === null) aStage2 = s; if (B.stage >= 2 && bStage2 === null) bStage2 = s;
    }
    return { burned: A.name + ' ' + A.fac, aStage: A.stage, bStage: B.stage, aStage2, bStage2, aFood: Math.round(A.res.food), bFood: Math.round(B.res.food) }; });
  console.log('growth', JSON.stringify(grow));
  need(grow.bStage >= 2, 'an untouched rival grows a stage by its economy'); need(grow.aStage2 === null || (grow.bStage2 !== null && grow.aStage2 > grow.bStage2), 'a rival whose farms are burned grows later (or not at all)');
  console.log('fails', JSON.stringify(fails)); console.log('errors', errs.slice(0, 5)); await b.close();
  if (fails.length) process.exit(1);
})();
