// The edge of the world: a band of water, a gold frame, black beyond; nothing standing outside the land.
const { chromium } = require('playwright'); const env = require('./env'); const SP = env.SP;
(async () => {
  const b = await chromium.launch(env.LAUNCH); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 0 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await p.goto(env.GAME); await p.waitForTimeout(600); await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { document.getElementById('banner').style.display = 'none'; SD.setRaid(9999);
    const outside = SD.trees.filter(t => t.x < 0 || t.y < 0 || t.x > MW || t.y > MH).length;
    return { map: [MW, MH], border: SD.R3D.borderInfo(), treesOutside: outside }; });
  console.log('map size', r.map.join(' x '), '(was 3072 x 1792) | border', JSON.stringify(r.border), '| trees outside the land', r.treesOutside);
  if (r.map[0] <= 3072 || r.map[1] <= 1792) throw new Error('map not wider');
  if (!r.border.sea || !r.border.black || r.treesOutside) throw new Error('border wrong');
  // a corner of the world: the screen beyond the frame is black, the band is water-coloured
  await p.evaluate(() => { SD.cam.z = 0.7; SD.centerOn(0, 0); }); await p.waitForTimeout(1500); await p.screenshot({ path: SP + '/border_corner.png' });
  const px = await p.evaluate(() => { const c = document.getElementById('gl'), g = document.createElement('canvas'); g.width = c.width; g.height = c.height; const x = g.getContext('2d'); x.drawImage(c, 0, 0); const d = x.getImageData(4, 4, 1, 1).data; return [...d]; });
  console.log('top-left corner pixel', px.join(','));
  if (px[0] + px[1] + px[2] > 40) throw new Error('beyond the frame is not black');
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
