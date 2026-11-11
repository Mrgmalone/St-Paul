const { chromium } = require('playwright'); const fs = require('fs'); const SP = require('./env').SP, USE3D = process.argv[3] === '3d';
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  if (USE3D) await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' })); else await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(800);
  await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ SD.setRaid(9999); SD.WEATHER.on = false; document.getElementById('banner').style.opacity = 1; SD.res.wood = 500; });
  // dig a moat line with the real placement path; builders dig it
  const r = await p.evaluate(()=>{ const k = SD.keep(); const scr = (c, r) => [((c + 0.5) * 32 - SD.cam.x) * SD.cam.z, ((r + 0.5) * 32 - SD.cam.y) * SD.cam.z];
    SD.cam.z = 1; centerOn(k.x + 150, k.y + 60);
    const c0 = k.c + 6, r0 = k.r + 5; SD.startPlacing('moat'); let a = scr(c0, r0), e = scr(c0 + 8, r0); SD.placeAt(a[0], a[1]); SD.placeAt(e[0], e[1]);
    SD.startPlacing('pit'); a = scr(c0 + 4, r0 + 3); SD.placeAt(a[0], a[1]);
    return { moats: SD.structures.filter(s => s.kind === 'moat').length, pit: SD.structures.filter(s => s.kind === 'pit').length, c0, r0, wood: SD.res.wood }; });
  console.log('placed', JSON.stringify(r));
  await p.waitForTimeout(USE3D ? 30000 : 20000);
  console.log('dug:', await p.evaluate(()=>SD.structures.filter(s => s.kind === 'moat' || s.kind === 'pit').map(s => s.kind[0] + (s.done ? '' : Math.round(s.progress * 100))).join(',')));
  await p.evaluate(()=>{ for (const s of SD.structures) if ((s.kind === 'moat' || s.kind === 'pit') && !s.done) { s.progress = 1; s.done = true; s.hp = s.maxHp; } });
  // blocking: a ram and a swordsman north of the moat try to reach the keep side (south)
  const t = await p.evaluate((r)=>{ const x = (r.c0 + 4) * 32 + 16, y = (r.r0 - 3) * 32; const path = SD.findPath(x, y, x, (r.r0 + 3) * 32);
    let crosses = false; const pts = [{ x, y }].concat(path); for (let i = 1; i < pts.length; i++) for (let k = 0; k <= 20; k++) { const px = pts[i-1].x + (pts[i].x - pts[i-1].x) * k / 20, py = pts[i-1].y + (pts[i].y - pts[i-1].y) * k / 20; const m = SD.structures.find(s => s.kind === 'moat' && !s.dead && s.c === Math.floor(px / 32) && s.r === Math.floor(py / 32)); if (m) crosses = true; }
    const row = SD.structures.filter(s => s.kind === 'moat').map(s => s.c).sort((a, b) => a - b).join(' ');
    // an enemy walks over the pit
    const e1 = makeUnit('enemy', 'sword', (r.c0 + 4) * 32 + 16, (r.r0 + 3) * 32 + 16 - 40); SD.commandMove([e1], (r.c0 + 4) * 32 + 16, (r.r0 + 3) * 32 + 18); window.__e1 = e1;
    return { pathAroundMoat: !crosses, pathLen: path.length, moatCols: row, path: path.map(q => Math.floor(q.x/32) + ',' + Math.floor(q.y/32)).join(' ') }; }, r);
  console.log('pathing:', JSON.stringify(t));
  await p.waitForTimeout(2500);
  console.log('pit:', await p.evaluate(()=>{ const pit = SD.structures.find(s => s.kind === 'pit'); return { charges: pit.charges, enemyHp: window.__e1.hp, banner: document.getElementById('banner').textContent }; }));
  // filling: an enemy soldier attacks a moat tile
  const f = await p.evaluate(()=>{ const m = SD.structures.find(s => s.kind === 'moat' && !s.dead); const e = makeUnit('enemy', 'sword', m.x, m.y - 50); SD.commandAttack([e], m); window.__m = m; return m.hp; });
  await p.waitForTimeout(USE3D ? 25000 : 16000);
  console.log('moat fill:', f, '->', await p.evaluate(()=>window.__m.dead ? 'filled' : window.__m.hp), '| tile open again:', await p.evaluate(()=>!tileBlocked(window.__m.c, window.__m.r)));
  await p.evaluate((r)=>{ SD.cam.z = USE3D_ ? 1.6 : 1.6; function USE3D_(){} centerOn((r.c0 + 4) * 32, (r.r0 + 1) * 32); document.getElementById('banner').style.opacity = 0; }, r); await p.waitForTimeout(USE3D ? 3000 : 600);
  await p.screenshot({ path: SP + `/M_${USE3D?'3d':'2d'}.png` });
  console.log('errors', errs.slice(0, 6)); await b.close(); })();
