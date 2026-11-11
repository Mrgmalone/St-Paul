const { chromium } = require('playwright'); const fs = require('fs'); const SP = require('./env').SP;
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('./env').GAME); await p.waitForTimeout(800); const t0=Date.now(); await p.click(".civ[data-civ=\"harvest\"]", { timeout: 300000 }); console.log("start took", Date.now()-t0); await p.waitForTimeout(1500);
  await p.click('#btnMenu'); await p.click('#btnTrees'); const t1 = await p.textContent('#btnTrees'); await p.click('#btnTrees'); const t2 = await p.textContent('#btnTrees');
  console.log('toggle:', t1, '->', t2, 'errors', errs); await b.close(); })();
