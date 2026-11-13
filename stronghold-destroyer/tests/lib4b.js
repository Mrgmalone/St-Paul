// Shared start for the Phase 4B checks: the real game with one faction, time stepped by hand, raids and bandits held off,
// and small helpers in the page (T.put a finished building near the keep, T.people, T.stage, T.run seconds, T.act on a box).
const { chromium } = require('playwright'); const env = require('./env');
async function start(fac, opts = {}) {
  const b = await chromium.launch(env.LAUNCH); const p = await b.newPage({ viewport: opts.viewport || { width: 1180, height: 820 }, ...(opts.page || {}) }); await env.use3d(p, { drawMs: 999999 });
  const errs = [], fails = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  const need = (ok, what) => { if (!ok) fails.push(what); };
  await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
  await p.goto(env.GAME_REAL + (opts.start !== undefined ? '?start=' + opts.start : '')); await p.waitForTimeout(600);   // opts.start pins the starting place
  await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
  await p.click(`.fac[data-fac="${fac}"]`); await p.click(`.fac[data-fac="${fac}"] .fgo`);
  await p.evaluate(() => { window.__step(3); document.getElementById('banner').style.display = 'none'; SD.setRaid(99999); REALM.rogueT = 1e9; for (const R of REALM.rivals) R.raidT = 1e9;
    window.T = {
      put(kind, near) { const k = SD.keep(), o = near || { c: k.c + 1, r: k.r + 1 };
        for (let rad = 3; rad < 40; rad++) for (let a = 0; a < 28; a++) { const c = o.c + Math.round(Math.cos(a / 28 * 6.283) * rad), r = o.r + Math.round(Math.sin(a / 28 * 6.283) * rad); if (canPlace(kind, c, r)) { const bb = createBuilding(kind, c, r); finishBuilding(bb); bb.hp = bb.maxHp; return bb;   /* (built and whole) */ } }
        return null; },
      people(n, type = 'civ') { const k = SD.keep(), out = []; for (let i = 0; i < n; i++) { const f = nearestFree(k.c + 2 + (i % 5), k.r + 6 + Math.floor(i / 5)); out.push(makeUnit('player', type, f.c * TILE + 16, f.r * TILE + 16)); } return out; },
      stage(n) { stageN = n; window.__step(25); },
      run(secs) { window.__step(Math.round(secs * 20)); },
      act(b, a) { indAction(b, a); T.close(); },
      close() { document.getElementById('storePop').hidden = true; storeShown = null; }   // (an open box pauses the game)
    }; });
  const done = async () => { console.log('fails', JSON.stringify(fails)); console.log('errors', errs.slice(0, 5)); await b.close(); if (fails.length || errs.length) process.exit(1); };
  return { b, p, errs, fails, need, done, SP: env.SP };
}
module.exports = { start };
