// Fighting: a wind-up and a swing, red and yellow sparks when the blow lands, no blood, a flinch when hit,
// a fall when killed; archers draw and loose arrows.
const { chromium } = require('playwright'); const env = require('./env'); const SP = env.SP;
// the game is advanced by hand, 50 ms a frame, drawing every frame, so the check does not depend on how fast this machine draws
async function open(civ) {
  const b = await chromium.launch(env.LAUNCH); const p = await b.newPage({ viewport: { width: 760, height: 520 } }); await env.use3d(p, { drawMs: 0 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
  await p.goto(env.GAME); await p.waitForTimeout(600);
  await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
  await p.click(`.civ[data-civ="${civ}"]`);
  await p.evaluate(() => { window.__step(3); document.getElementById('banner').style.display = 'none'; SD.setRaid(99999); });
  return { b, p, errs, step: n => p.evaluate(n => window.__step(n), n) };
}
(async () => {
  const { b, p, errs, step } = await open('legion');
  await p.evaluate(() => { const k = SD.keep(), x = k.x + 300, y = k.y + 260;
    const a = makeUnit('player', 'sword', x, y), e = makeUnit('enemy', 'sword', x + 26, y + 4); a.hp = a.maxHp = 5000; e.hp = e.maxHp = 5000; a.cmdT = time;
    window.__a = a; window.__e = e; SD.commandAttack([a], e); SD.cam.z = 2.4; SD.centerOn(x + 10, y); });
  const arm = [], flinch = [], kinds = {}; let landAt = null, lastHp = 5000, shot = false;
  for (let i = 0; i < 70; i++) { await step(1);
    const s = await p.evaluate(() => { const a = window.__a, e = window.__e, q = SD.R3D.poseOf(a), qe = SD.R3D.poseOf(e); const kinds = {}; for (const pt of particles) kinds[pt.type] = (kinds[pt.type] || 0) + 1;
      return { arm: q.armR, anim: a.attackAnim, hitAt: a.hitAt, eBody: qe.bodyX, eHp: e.hp, kinds }; });
    arm.push(s.arm); flinch.push(s.eBody); for (const k in s.kinds) kinds[k] = Math.max(kinds[k] || 0, s.kinds[k]);
    if (s.eHp < lastHp && landAt === null) landAt = { at: s.anim, hitAt: s.hitAt }; lastHp = s.eHp;
    if (!shot && (s.kinds.spark || s.kinds.sparkR)) { shot = true; await p.screenshot({ path: SP + '/fight_sparks.png' }); } }
  const range = a => Math.max(...a) - Math.min(...a);
  console.log('sword arm travels', range(arm).toFixed(2), 'radians | victim rocks back to', Math.min(...flinch).toFixed(2), '| particles seen', JSON.stringify(kinds));
  if (range(arm) < 1.5) throw new Error('no wind-up and swing');
  if (!(kinds.spark > 0 && kinds.sparkR > 0)) throw new Error('no red and yellow sparks');
  if (kinds.blood) throw new Error('blood drawn');
  if (!(Math.min(...flinch) < -0.05)) throw new Error('no flinch when hit');
  console.log('damage lands at swing position', landAt && landAt.at.toFixed(2), '(hit point', landAt && landAt.hitAt, ')');
  if (!landAt || Math.abs(landAt.at - landAt.hitAt) > 0.15) throw new Error('hit not in time with the swing');
  // a proper fall when killed
  await p.evaluate(() => { window.__e.hp = 1; }); let fell = 0; for (let i = 0; i < 80 && fell > -1.2; i++) { await step(1); const q = await p.evaluate(() => window.__e.dead ? SD.R3D.poseOf(window.__e) : null); if (q) fell = q.bodyX; }
  console.log('killed: the body ends at', fell.toFixed(2), 'radians (lying down)'); if (fell > -1.2) throw new Error('no fall');
  // archers draw and loose
  await p.evaluate(() => { const a = window.__a, ar = makeUnit('player', 'archer', a.x - 40, a.y + 30), t = makeUnit('enemy', 'spear', a.x + 150, a.y + 30); t.hp = t.maxHp = 5000; t.holdFire = true; ar.cmdT = time; SD.commandAttack([ar], t); window.__ar = ar; });
  let n = 0, mn = 9, mx = -9; for (let i = 0; i < 60; i++) { await step(1); const s = await p.evaluate(() => ({ n: arrows.length, q: SD.R3D.poseOf(window.__ar) })); n = Math.max(n, s.n); if (s.q) { mn = Math.min(mn, s.q.armR); mx = Math.max(mx, s.q.armR); } }
  console.log('archer: arrows in the air', n, '| drawing arm travels', (mx - mn).toFixed(2)); if (!n) throw new Error('archer never looses an arrow');
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
