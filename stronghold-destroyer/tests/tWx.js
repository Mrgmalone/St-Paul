const { chromium } = require('playwright'); const fs = require('fs'); const SP = require('./env').SP, USE3D = process.argv[3] === '3d';
const THREE_JS = fs.readFileSync(SP + '/lib/three/package/build/three.min.js');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  if (USE3D) await p.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' })); else await require('./env').use3d(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n')[1]));
  await p.goto(require('./env').GAME); await p.waitForTimeout(800);
  await p.click('.civ[data-civ="harvest"]'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ SD.setRaid(9999); document.getElementById('banner').style.opacity = 0; });
  const st = () => p.evaluate(()=>({ kind: SD.WEATHER.kind, rain: +SD.WEATHER.rain.toFixed(2), snow: +SD.WEATHER.snow.toFixed(2), wind: +SD.WEATHER.wind.toFixed(2), range: +SD.weatherRange().toFixed(2), speed: +SD.weatherSpeed().toFixed(2), cover: +SD.WEATHER.cover.toFixed(2), chip: document.getElementById('vWeather').textContent }));
  console.log('start', JSON.stringify(await st()));
  // archery accuracy test: 40 arrows at a standing target, calm vs strong wind
  const acc = (kind) => p.evaluate((kind)=>{ SD.setWeather(kind, true); const w = SD.WEATHER, t = WTYPES[kind]; w.rain = t.rain; w.snow = t.snow; w.wind = t.wind;
    const k = SD.keep(); const a = makeUnit('player', 'archer', k.x + 100, k.y + 300), tgt = makeUnit('enemy', 'sword', k.x + 250, k.y + 300); tgt.maxHp = tgt.hp = 99999; tgt.order = 'hold';
    let hits = 0; for (let i = 0; i < 40; i++) { const before = SD.arrows.length; a.target = tgt; a.order = 'attack'; doHit(a); const ar = SD.arrows[SD.arrows.length - 1]; if (ar && Math.hypot(tgt.x - ar.x1, tgt.y - 16 - ar.y1) < 18) hits++; SD.arrows.pop(); }
    a.dead = true; tgt.dead = true; return hits; }, kind);
  console.log('hits out of 40 at 150 px: clear', await acc('clear'), '| windy', await acc('windy'), '| storm', await acc('storm'));
  await p.evaluate(()=>{ SD.setWeather('storm'); }); await p.waitForTimeout(USE3D ? 9000 : 7000); console.log('storm', JSON.stringify(await st()));
  await p.evaluate(()=>{ const k = SD.keep(); SD.cam.z = 1.2; centerOn(k.x + 120, k.y + 40); }); await p.waitForTimeout(800);
  await p.screenshot({ path: SP + `/Wx_storm_${USE3D?'3d':'2d'}.png` });
  await p.evaluate(()=>{ SD.setWeather('snow'); SD.WEATHER.cover = 0.8; }); await p.waitForTimeout(USE3D ? 9000 : 7000); console.log('snow', JSON.stringify(await st()));
  await p.screenshot({ path: SP + `/Wx_snow_${USE3D?'3d':'2d'}.png` });
  await p.click('#btnMenu'); await p.click('#btnWeather'); await p.keyboard.press('Escape'); await p.waitForTimeout(USE3D ? 8000 : 6000);
  console.log('weather off', JSON.stringify(await st()), await p.textContent('#btnWeather'));
  console.log('errors', errs.slice(0, 6)); await b.close(); })();
