// The four factions' rules, each checked in a game started from the front page (stand-ins where the real building or unit comes later):
// Cy Young: bakeries make 4.5x the bread, spare food is sold for gold. Ticanologue: half-price market, 3x market cost.
// Hekaranok: double the people, weaker people, the wounded walk home, heal and return to their spot, the bell. Psychana: far sight,
// a small berserker band (stand-in: soldiers in the berserker kit) is hidden until a tower near your castle spots it.
const { chromium } = require('playwright'); const env = require('./env');
(async () => {
  const b = await chromium.launch(env.LAUNCH); const errs = [], fails = [];
  const need = (ok, what) => { if (!ok) fails.push(what); };
  const start = async key => {
    const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 999999 });
    p.on('pageerror', e => errs.push(key + ': ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
    await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
    await p.goto(env.GAME_REAL); await p.waitForTimeout(600);
    await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
    await p.click(`.fac[data-fac="${key}"]`); await p.click(`.fac[data-fac="${key}"] .fgo`);
    await p.evaluate(() => { window.__step(3); document.getElementById('banner').style.display = 'none'; SD.setRaid(99999); });
    return p;
  };
  // ---- Cy Young ----
  { const p = await start('cyyoung');
    const r = await p.evaluate(() => {
      const k = SD.keep(), out = {};
      // a finished bakery with a baker and flour: count the bread it brings in
      const f = nearestFree(k.c + 6, k.r + 2); const bk = createBuilding('bakery', f.c, f.r); finishBuilding(bk);
      SD.res.flour = 200; const baker = SD.units.find(u => u.team === 'player' && u.type === 'civ'); baker.job = bk; baker.manualT = -99; baker.order = 'idle'; startJob(baker);
      out.mul = bakeryMulOf(bk);
      const bread0 = foodKinds.bread || 0; window.__step(1200); out.bread = (foodKinds.bread || 0) - bread0;
      // spare food sold: lift food well above the line and wait one selling round
      addFood('crops', 400); const g0 = SD.res.gold, f0 = SD.res.food; window.__step(220); out.gold = SD.res.gold - g0; out.foodLeft = SD.res.food; out.food0 = f0;
      return out; });
    console.log('cyyoung', JSON.stringify(r));
    need(r.mul === 4.5 && r.bread >= 13, 'Cy Young bakery makes 4.5x (one load is 13.5 bread, not 9)'); need(r.gold > 0 && r.foodLeft < r.food0, 'Cy Young sells spare food');
    await p.close(); }
  // ---- Ticanologue ----
  { const p = await start('ticanologue');
    const r = await p.evaluate(() => { const row = MARKET.find(x => x[0] === 'iron') || MARKET[0]; const mine = priceOf(row).buy; const k = FACKEY; FACKEY = 'cyyoung'; const other = priceOf(row).buy; FACKEY = k; return { mine, other, market: BUILD.market.wood }; });
    console.log('ticanologue', JSON.stringify(r));
    need(r.mine <= Math.ceil(r.other / 2) + 1 && r.mine < r.other, 'Ticanologue half price'); need(r.market === 180, 'Ticanologue market cost x3');
    await p.close(); }
  // ---- Hekaranok ----
  { const p = await start('hekaranok');
    const r = await p.evaluate(() => {
      const k = SD.keep(), mine = SD.units.filter(u => u.team === 'player' && !u.dead), out = { civs: mine.filter(u => u.type === 'civ').length, cap: popCap(), civHp: mine.find(u => u.type === 'civ').maxHp };
      const s = makeUnit('player', 'spear', k.x + 420, k.y + 260); s.cmdT = -99; out.spearHp = s.maxHp;
      window.__step(4); const spot = { x: s.x, y: s.y }; s.hp = s.maxHp * 0.2; out.went = false; out.healed = false; out.back = false;
      for (let i = 0; i < 160 && !out.back; i++) { window.__step(20); if (s.hk && s.hk.state === 'healing') out.went = true; if (out.went && s.hp >= s.maxHp * 0.98) out.healed = true; if (out.healed && !s.hk) out.back = Math.hypot(s.x - spot.x, s.y - spot.y) < 40; }
      out.dist = Math.round(Math.hypot(s.x - spot.x, s.y - spot.y));
      const t = makeUnit('player', 'spear', k.x + 380, k.y + 300); t.cmdT = -99; window.__step(4); out.bell = ringBell(); out.bellGoing = !!(t.hk && t.hk.bell);
      return out; });
    console.log('hekaranok', JSON.stringify(r));
    need(r.civs === 10 && r.cap === 30, 'Hekaranok doubled people'); need(r.civHp < 50 && r.spearHp < 95, 'Hekaranok weaker people');
    need(r.went && r.healed && r.back, 'Hekaranok wounded go home, heal and return'); need(r.bell >= 1 && r.bellGoing, 'Hekaranok bell');
    await p.close(); }
  // ---- Psychana ----
  { const p = await start('psychana');
    const r = await p.evaluate(() => {
      const k = SD.keep(), out = { sight: SD.units.find(u => u.team === 'player').sight };
      // a small band of enemy berserkers (stand-in) playing Psychana, well away from any of your towers
      const band = []; for (let i = 0; i < 4; i++) { const u = SD.makeKit('enemy', 'berserker', k.x + 520 + i * 20, k.y + 40); u.fac = 'psychana'; u.order = 'hold'; band.push(u); }
      window.__step(10); out.hidden = band.every(u => hiddenFrom(u, 'player')); out.inEnemies = enemiesOf('player').filter(o => band.includes(o)).length;
      // a tower by your castle spots them
      const f = nearestFree(Math.floor((k.x + 300) / TILE), Math.floor((k.y + 30) / TILE)); const tw = createBuilding('gtower', f.c, f.r); finishBuilding(tw);
      window.__step(10); out.spotted = band.every(u => !hiddenFrom(u, 'player'));
      // ten or more together cannot hide
      for (let i = 0; i < 10; i++) { const u = SD.makeKit('enemy', 'berserker', k.x + 1400 + i * 14, k.y + 600); u.fac = 'psychana'; u.order = 'hold'; band.push(u); }
      window.__step(10); out.bigHidden = band.slice(4).some(u => hiddenFrom(u, 'player'));
      return out; });
    console.log('psychana', JSON.stringify(r));
    need(r.sight === 240, 'Psychana sight'); need(r.hidden && r.inEnemies === 0, 'Psychana small band hidden'); need(r.spotted, 'Psychana band spotted by a tower near the castle'); need(!r.bigHidden, 'Psychana big band not hidden');
    await p.close(); }
  console.log('fails', JSON.stringify(fails));
  console.log('errors', errs.slice(0, 5)); await b.close();
  if (fails.length) process.exit(1);
})();
