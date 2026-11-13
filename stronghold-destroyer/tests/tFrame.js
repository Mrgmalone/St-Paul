// Phase 4C step C8: the table, the frame and the glass. The board sits on a wooden table: land, a band of moving water, a
// brass and gold bar, carved steps down to the table, then dark glass that reflects the board, and black beyond. A gold
// globe on each corner shows its continent (set in FRAME.globes); the reflection is cheap (a copy of the picture, taken only
// when the glass is in view) and fades away when the frame rate drops, coming back when it is smooth. The map is wider.
const { start } = require('./lib4b'); const { chromium } = require('playwright'); const env = require('./env');
(async () => {
  const { p, need, done, SP } = await start('cyyoung', { start: 0 });
  const b0 = await p.evaluate(() => ({ border: R3D.borderInfo(), glass: R3D.glassInfo(), MW, MH, cols: COLS, frame: FRAME }));
  const at = (gx, gz) => { const g = b0.glass.globes.find(q => (q[0] < 0) === (gx < 0) && (q[1] < 0) === (gz < 0)); return g && g[2]; };
  console.log('frame', JSON.stringify(b0));
  need(b0.border.sea && b0.border.glass && b0.border.steps === 3 && b0.border.table < b0.border.seaLevel + 1, 'the table, its carved steps and the glass are there, the table below the water band');
  need(b0.glass.globes.length === 4 && at(-1, -1) === 'northAmerica' && at(1, -1) === 'asia' && at(-1, 1) === 'southAmerica' && at(1, 1) === 'australia', 'the four globes: North America, Asia, South America, Australia (north-west, north-east, south-west, south-east)');
  need(b0.cols >= 148 && b0.MW >= 4736, 'the map is wider (148 squares across, was 128)');
  // the reflection: copies of the picture only while the glass is in view
  const live = await p.evaluate(() => { R3D.glassForce(0.55); const draw = n => { window.__drawMs = 0; for (let i = 0; i < n; i++) window.__step(1); window.__drawMs = 999999; };
    SD.cam.z = 1; SD.centerOn(MW / 2, MH / 2); draw(4); const mid = R3D.glassInfo();
    SD.centerOn(-120, MH / 2); draw(6); const edge = R3D.glassInfo();
    return { midVisible: mid.visible, edgeVisible: edge.visible, copiesMid: mid.copies, copiesEdge: edge.copies }; });
  await p.screenshot({ path: SP + '/tFrame-edge.png' });
  console.log('reflection', JSON.stringify(live));
  need(!live.midVisible && live.edgeVisible && live.copiesEdge > live.copiesMid, 'the glass reflects only while it is in view (no work in the middle of the map)');
  // fading: slow frames fade it out, smooth frames bring it back
  const fade = await p.evaluate(() => { R3D.glassForce(null); const q = R3D.glassInfo().quality;
    const smooth1 = R3D.glassFeed(1 / 60, 300), slow = R3D.glassFeed(1 / 20, 90), smooth2 = R3D.glassFeed(1 / 60, 600);
    return { quality: q, smooth1: smooth1.strength, slow: slow.strength, slowTarget: slow.target, smooth2: smooth2.strength, want: FRAME.reflection }; });
  console.log('fade', JSON.stringify(fade));
  need(fade.slow === 0 && fade.slowTarget === 0, 'the reflection fades away when the frame rate drops (20 a second)');
  need(fade.quality >= 2 || (Math.abs(fade.smooth1 - fade.want) < 0.03 && Math.abs(fade.smooth2 - fade.want) < 0.03), 'and comes back when the game is smooth again (60 a second)');
  await done();
  // the corner layout comes from one setting: change FRAME.globes and the balls follow
  const b = await chromium.launch(env.LAUNCH), pg = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(pg, { drawMs: 999999 });
  await pg.route('**/js/settings.js', async route => { const t = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'settings.js'), 'utf8'); await route.fulfill({ contentType: 'application/javascript', body: t.replace("globes: { nw: 'northAmerica', ne: 'asia', sw: 'southAmerica', se: 'australia' }", "globes: { nw: 'europe', ne: 'africa', sw: 'plain', se: 'asia' }") }); });
  await pg.goto(env.GAME_REAL + '?start=0'); await pg.waitForTimeout(800);
  await pg.click('.fac[data-fac="cyyoung"]'); await pg.click('.fac[data-fac="cyyoung"] .fgo'); await pg.waitForTimeout(1500);
  const g2 = await pg.evaluate(() => R3D.glassInfo().globes.map(q => q[2]).sort().join(','));
  console.log('changed layout', g2);
  const ok = g2 === 'africa,asia,europe,plain'; if (!ok) { console.log('fails ["the globe layout follows the one setting"]'); }
  await b.close(); if (!ok) process.exit(1);
})();
