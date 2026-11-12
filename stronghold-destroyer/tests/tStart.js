// The start: a shack in the woods with a small wooden palisade, a king on foot, a few civilians, wood and food only, and no army on either side.
// Also the land: dense forest with clear roads, nobody standing inside the trees, a river with a bridge at every road,
// and a walkable way from your shack to the enemy camp.
const { chromium } = require('playwright'); const env = require('./env'); const SP = env.SP;
(async () => {
  const b = await chromium.launch(env.LAUNCH); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 0 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  // no faction starts with an army, whichever people you pick: the king (on foot) is your only fighter, the lord is theirs
  for (const civ of ['legion', 'wardens', 'harvest']) {
    await p.goto(env.GAME_REAL); await p.waitForTimeout(600); await p.click(`.civ[data-civ="${civ}"]`); await p.waitForTimeout(2500);
    const a = await p.evaluate(() => { const live = SD.units.filter(u => !u.dead), mine = live.filter(u => u.team === 'player'), theirs = live.filter(u => u.team === 'enemy'), king = mine.find(u => u.type === 'king');
      return { soldiers: mine.filter(u => u.type !== 'civ' && u.type !== 'king').map(u => u.type), foes: theirs.filter(u => u.type !== 'civ' && !u.lord).map(u => u.type), lord: theirs.filter(u => u.lord).length,
        weapons: SD.res.spear + SD.res.bow + SD.res.sword + SD.res.mace + SD.res.armor, gold: SD.res.gold, stone: SD.res.stone, king: !!king, kingHorse: king ? (SD.R3D.poseOf(king) || {}).horse != null : null }; });
    console.log(civ, JSON.stringify(a));
    if (a.soldiers.length || a.foes.length || !a.king || a.kingHorse || a.weapons || a.gold || a.stone) throw new Error(civ + ': the start should hold no army, no weapons, no gold or stone, and a king on foot');
  }
  await p.goto(env.GAME_REAL); await p.waitForTimeout(600); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { document.getElementById('banner').style.display = 'none'; SD.setRaid(9999);
    const k = SD.keep(), mine = SD.units.filter(u => u.team === 'player' && !u.dead), pal = SD.structures.filter(s => s.startPalisade);
    const inTrees = SD.units.filter(u => !u.dead && !u.onWall && blocked[Math.floor(u.y / TILE) * COLS + Math.floor(u.x / TILE)]).length;
    let roadTrees = 0; for (const rd of ROADS) for (const pt of rd) for (const t of SD.trees) if (Math.hypot(t.x - pt.x, t.y - pt.y) < 40) roadTrees++;
    let water = 0, bridge = 0; for (const v of riverTile) { if (v === 1) water++; else if (v === 2) bridge++; }
    const camp = SD.structures.find(s => s.kind === 'tower'), path = findPath(k.x, k.y1 + 40, camp.x, camp.y + 60);
    // how wooded: the share of land squares holding a tree, and the biggest solid block of trees
    const tset = new Set(SD.trees.map(t => t.c + ',' + t.r)); let solid = 0; for (const t of SD.trees) { let n = 0; for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (tset.has((t.c + dc) + ',' + (t.r + dr))) n++; if (n >= 7) solid++; }
    return { stone: SD.res.stone, wood: SD.res.wood, food: SD.res.food, king: mine.filter(u => u.type === 'king').length, civs: mine.filter(u => u.type === 'civ').length, palisade: pal.length, palisadeWood: pal.every(s => s.kind === 'wall'),
      shack: !!SD.R3D.modelOf(k), inTrees, roadTrees, trees: SD.trees.length, share: +(SD.trees.length / (COLS * ROWS)).toFixed(2), solid, water, bridge, bridges: BRIDGES.length, pathSteps: path.length }; });
  console.log(JSON.stringify(r));
  const need = (ok, what) => { if (!ok) throw new Error(what); };
  need(r.stone === 0 && r.wood > 0 && r.food > 0, 'start should have wood and food only');
  need(r.king === 1 && r.civs >= 3, 'a king and a few civilians'); need(r.palisade >= 8 && r.palisadeWood, 'a small wooden palisade'); need(r.shack, 'the shack is drawn');
  need(r.inTrees === 0, 'someone starts inside the trees'); need(r.roadTrees === 0, 'trees on a road');
  need(r.share >= 0.2 && r.solid > 300, 'the woods are not dense'); need(r.water > 100 && r.bridges >= 2 && r.bridge > 8, 'river and bridges'); need(r.pathSteps > 5, 'no way from the shack to the enemy camp');
  await p.evaluate(() => { const k = SD.keep(); SD.cam.z = 1.1; SD.centerOn(k.x + 20, k.y - 30); }); await p.waitForTimeout(2500); await p.screenshot({ path: SP + '/start_shack.png' });
  await p.evaluate(() => { const B = BRIDGES[0]; SD.cam.z = 1.3; SD.centerOn(B.x, B.y); }); await p.waitForTimeout(2500); await p.screenshot({ path: SP + '/bridge_water.png' });
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
