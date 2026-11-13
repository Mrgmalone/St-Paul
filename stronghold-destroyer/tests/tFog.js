// Phase 4B step B6: random starts (you begin at one of five places; the rivals take the other four), the fog of war (what you
// have seen stays seen; rivals in the fog are not shown, on the map or the minimap), sight (longbowmen twice as far; a tower
// ballista as far; Psychana like longbowmen), newcomers walk in along the nearest road, and nobody starts in the trees.
const { chromium } = require('playwright'); const env = require('./env');
(async () => {
  const b = await chromium.launch(env.LAUNCH); const errs = [], fails = []; const need = (ok, what) => { if (!ok) fails.push(what); };
  const starts = [];
  for (const s of [0, 1, 2, 3, 4, null, null]) {
    const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 999999 }); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
    await p.goto(env.GAME_REAL + (s === null ? '' : '?start=' + s)); await p.waitForTimeout(500);
    await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
    await p.click('.fac[data-fac="psychana"]'); await p.click('.fac[data-fac="psychana"] .fgo');
    const r = await p.evaluate(() => { window.__step(4); SD.setRaid(99999); const k = SD.keep();
      const out = { at: START_AT, keep: [k.c, k.r], rivals: REALM.rivals.filter(R => R.keep).map(R => [R.keep.c, R.keep.r]) };
      // no one starts inside trees or rock; each rival has a way to your keep
      out.stuckStart = units.filter(u => !u.dead && !u.onWall && !u.inside && circleBlocked(u.x, u.y, 6)).length;   /* (the king stands on top of the keep) */
      out.routes = REALM.rivals.filter(R => R.keep).map(R => { const ap = approachPoint({ x: R.keep.x, y: R.keep.y1 + 40, radius: 11 }, k); const pth = findPath(R.keep.x, R.keep.y1 + 40, ap.x, ap.y); const e = pth[pth.length - 1]; return pth.length > 1 && Math.hypot(e.x - ap.x, e.y - ap.y) < 60; }).every(Boolean);
      return out; });
    starts.push(r);
    if (s === 2) {   // one game looked at closely: the fog
      const f = await p.evaluate(() => { const k = SD.keep(), out = {};
        out.fogOn = FOG.on; out.share0 = +exploredShare().toFixed(3); out.homeSeen = fogSeen(k.x, k.y);
        const R = REALM.rivals.find(x => x.keep && Math.hypot(x.keep.x - k.x, x.keep.y - k.y) > 1500); out.rivalHidden = !!R && hiddenFrom(R.keep, 'player') && !fogSeen(R.keep.x, R.keep.y);
        const ru = units.find(u => u.owner === R.id && !u.dead); out.unitHidden = !ru || hiddenFrom(ru, 'player');
        // a scout walks over: the land he sees stays seen after he leaves
        const sc = makeUnit('player', 'spear', R.keep.x - 200, R.keep.y + 160); window.__step(14); out.seenNow = fogSeen(R.keep.x, R.keep.y) && !hiddenFrom(R.keep, 'player');
        sc.x = k.x; sc.y = k.y + 80; window.__step(14); out.staysSeen = fogSeen(R.keep.x, R.keep.y);
        // sight: longbowmen twice an archer; a ballista tower as far; Psychana's soldiers like longbowmen
        const lb = makeUnit('player', 'archer', k.x, k.y); applyKit(lb, 'longbow'); const ar = makeUnit('player', 'archer', k.x, k.y);
        out.sight = { longbow: sightOf(lb), archer: sightOf(ar), ballistaTower: sightOf({ x0: 0, y0: 0, x1: 64, y1: 64, kind: 'roundtower', engine: 'ballista', range: 300 }), psySword: sightOf(makeUnit('player', 'sword', k.x, k.y)) };
        // newcomers walk in along a road near you
        const e = roadEntry(); out.entryDist = Math.round(Math.hypot(e.x - k.x, e.y - k.y));
        return out; });
      console.log('fog', JSON.stringify(f));
      need(f.fogOn && f.homeSeen && f.share0 < 0.25, 'the fog covers the land you have not seen; your home is seen');
      need(f.rivalHidden && f.unitHidden, 'a far rival and his people are hidden in the fog');
      need(f.seenNow && f.staysSeen, 'what a scout has seen stays seen');
      need(f.sight.longbow === 2 * f.sight.archer || f.sight.archer === f.sight.longbow, "longbowmen see twice as far (Psychana's all see like longbowmen)");
      need(f.sight.ballistaTower === f.sight.longbow && f.sight.psySword === f.sight.longbow, 'a ballista tower and Psychana see like longbowmen');
      need(f.entryDist < 900, 'newcomers walk in along the nearest road');
      await p.evaluate(() => { const k = SD.keep(); SD.cam.z = 0.55; SD.centerOn(k.x + 300, k.y - 100); window.__drawMs = 0; window.__step(3); window.__drawMs = 999999; });
      await p.screenshot({ path: env.SP + '/fog.png' });
    }
    await p.close();
  }
  console.log('starts', JSON.stringify(starts));
  need(new Set(starts.slice(0, 5).map(s => s.keep.join(','))).size === 5, 'each of the five starting places works');
  need(starts.every(s => s.rivals.length === 4 && !s.rivals.some(r => r.join(',') === s.keep.join(','))), 'the rivals take the other four places');
  need(starts.every(s => s.stuckStart === 0), 'nobody starts inside trees or rock');
  need(starts.every(s => s.routes), 'every rival has a way to your keep from every start');
  console.log('fails', JSON.stringify(fails)); console.log('errors', errs.slice(0, 5)); await b.close();
  if (fails.length || errs.length) process.exit(1);
})();
