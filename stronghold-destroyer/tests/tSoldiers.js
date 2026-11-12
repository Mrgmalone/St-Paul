// Soldiers are jointed figures, not flat pictures: legs swing when they walk, they stand still when idle,
// the knight's horse trots, and every kind from the sheet can be built (player and enemy).
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
  await p.evaluate(() => { const k = SD.keep(), x = k.x + 260, y = k.y + 160; window.__sq = {};
    for (const [i, t] of ['sword', 'spear', 'archer', 'maceman', 'knight'].entries()) window.__sq[t] = makeUnit('player', t, x + i * 40, y);
    for (const [i, t] of ['longbow', 'crossbow', 'flame', 'berserker', 'heavyspear'].entries()) window.__sq[t] = SD.makeKit('player', t, x + i * 40, y + 60);
    for (const [i, t] of ['sword', 'spear', 'archer', 'knight'].entries()) window.__sq['e' + t] = makeUnit('enemy', t, x + 1500 + i * 40, y + 900);
    for (const u of Object.values(window.__sq)) { u.holdFire = true; u.cmdT = time; }
    SD.cam.z = 1.6; SD.centerOn(x + 80, y + 30); });
  await step(4); await p.screenshot({ path: SP + '/soldiers_parade.png' });
  const built = await p.evaluate(() => Object.fromEntries(Object.entries(window.__sq).map(([k, u]) => { const q = SD.R3D.poseOf(u); return [k, q ? (q.flat ? 'FLAT' : 'jointed') : 'missing']; })));
  console.log('figures:', JSON.stringify(built));
  const bad = Object.entries(built).filter(([k, v]) => v !== 'jointed'); if (bad.length) throw new Error('not jointed: ' + JSON.stringify(bad));
  // walking: legs swing, the figure moves, the feet keep pace with the ground, the horse trots
  const walk = async name => { await p.evaluate(n => { const u = window.__sq[n]; u.holdFire = false; window.__w0 = { x: u.x, y: u.y, ph: u.walkPhase }; SD.commandMove([u], u.x + 30, u.y + 420); }, name);
    const hips = [], horse = [], bob = []; let pose = null; for (let i = 0; i < 30; i++) { await step(1); pose = await p.evaluate(n => SD.R3D.poseOf(window.__sq[n]), name); hips.push(pose.hipL); bob.push(pose.bodyY); if (pose.horse !== null) horse.push(pose.horse); }
    const r = await p.evaluate(n => { const u = window.__sq[n], w = window.__w0, d = Math.hypot(u.x - w.x, u.y - w.y), cyc = (u.walkPhase - w.ph) / (Math.PI * 2); return { moved: Math.round(d), perCycle: cyc > 0 ? Math.round(d / cyc) : 0 }; }, name);
    const range = a => Math.max(...a) - Math.min(...a);
    return Object.assign(r, { legSwing: +range(hips).toFixed(2), bob: +range(bob).toFixed(2), horseSwing: horse.length ? +range(horse).toFixed(2) : null }); };
  const ws = await walk('sword'); console.log('swordsman walking 1.5 s:', JSON.stringify(ws));
  if (ws.legSwing < 0.5 || ws.moved < 60) throw new Error('swordsman legs do not swing');
  if (ws.perCycle < 25 || ws.perCycle > 50) throw new Error('feet slide: ' + ws.perCycle + ' pixels per two steps');
  await p.screenshot({ path: SP + '/soldier_walking.png' });
  const wk = await walk('knight'); console.log('knight riding 1.5 s:', JSON.stringify(wk));
  if (!(wk.horseSwing > 0.4)) throw new Error('the horse does not trot');
  // standing still: nothing moves in the legs
  await p.evaluate(() => { for (const u of Object.values(window.__sq)) { u.order = 'idle'; u.path = []; u.moving = false; u.holdFire = true; } }); await step(50);
  const still = []; for (let i = 0; i < 8; i++) { await step(4); still.push((await p.evaluate(() => SD.R3D.poseOf(window.__sq.spear))).hipL); }
  console.log('spearman standing, leg angle over 1.6 s:', still.map(v => v.toFixed(3)).join(' '));
  if (Math.max(...still) - Math.min(...still) > 0.02) throw new Error('idle soldier is moving');
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
