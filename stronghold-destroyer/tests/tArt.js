// Phase 4D step D3: art in both views.
//  - Settings has View: 3D or Flat (and V switches); the flat view draws the land, buildings, people, the fog, the rally
//    flags and patrol routes, and shows the newer buildings and the sheet's soldiers as pictures of their 3D models.
//  - Pictures from files: put art/buildings/<kind>.png, art/inside/<kind>.jpg or art/ui/people-face.png in place and the
//    game uses them with no change to the code (the check makes sample pictures, then removes them).
//  - The People button has its painted face; the wood yard has its horse and wagon; the longbow is full height.
const { start } = require('./lib4b'); const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), made = [], http = require('http');
// the game is served from a small local web server here, as it is on the web (pictures loaded from files on a web page can
// be read back; straight from the disk they cannot)
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
function samplePng(file, w, h, draw) {   // a small picture written with the browser later; here only the folders
  fs.mkdirSync(path.dirname(file), { recursive: true }); made.push(file);
}
(async () => {
  // sample pictures (made by the browser, saved to the art folders)
  const files = { 'art/buildings/school.png': 'magenta', 'art/inside/school.jpg': 'scene', 'art/ui/people-face.png': 'magenta' };
  for (const f of Object.keys(files)) samplePng(path.join(ROOT, f));
  await new Promise(ok => server.listen(0, ok)); const BASE = `http://127.0.0.1:${server.address().port}/index.html`;
  { const { p, done } = await start('cyyoung', { start: 0, base: BASE });
    const pics = await p.evaluate(files => { const out = {}; for (const [f, kind] of Object.entries(files)) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = kind === 'magenta' ? '#ff00ff' : '#3a6ab0'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#20c040'; g.fillRect(32, 32, 64, 64);
      out[f] = c.toDataURL(f.endsWith('.jpg') ? 'image/jpeg' : 'image/png').split(',')[1]; } return out; }, files);
    for (const [f, b64] of Object.entries(pics)) fs.writeFileSync(path.join(ROOT, f), Buffer.from(b64, 'base64'));
    await done(); }
  const { p, need, done, SP } = await start('cyyoung', { start: 0, base: BASE });
  try {
    await p.evaluate(() => { SD.res.wood = 5000; SD.res.stone = 3000; SD.res.gold = 3000; T.stage(3);
      for (const k of ['house', 'woodhut', 'school', 'stable', 'apothecary', 'alehouse', 'church', 'granary', 'engineerhut']) T.put(k);
      const k = SD.keep(); rally.army = { x: k.x + 140, y: k.y + 200 }; rally.town = { x: k.x - 120, y: k.y + 150 };
      const at = (dx, dy) => [k.x + dx, k.y + dy];
      window.__kits = [['longbow', 160], ['crossbow', 200], ['flame', 240], ['berserker', 280]].map(([kit, dx]) => SD.makeKit('player', kit, ...at(dx, 120)));
      window.__knight = makeUnit('player', 'knight', ...at(320, 120));
      INSIDE.pic('school', 3);   /* (asks for the inside picture; it arrives a moment later) */
      T.run(20); });
    await p.waitForTimeout(2500);
    // pictures from files
    const art = await p.evaluate(() => ({ loaded: ARTFILES.list(), face: !!document.querySelector('#btnPeople canvas'), insideSchool: INSIDE.pic('school', 3), flatSchool: !!(picOf2D('school') && picOf2D('school').width === 128),
      cut: (() => { const c = ARTFILES.get('art/buildings/school.png', true); if (!c) return null; const d = c.getContext('2d').getImageData(4, 4, 1, 1).data, m = c.getContext('2d').getImageData(64, 64, 1, 1).data; return { cornerAlpha: d[3], middle: [m[0], m[1], m[2], m[3]] }; })() }));
    need(art.loaded.length === 3, 'all three sample pictures loaded: ' + JSON.stringify(art.loaded));
    need(art.face, 'the People button shows the painted face from art/ui/people-face.png');
    need(art.insideSchool === 'art/inside/school.jpg', 'the school box uses art/inside/school.jpg: ' + art.insideSchool);
    need(art.flatSchool, 'the flat view uses art/buildings/school.png for the school');
    need(art.cut && art.cut.cornerAlpha === 0 && art.cut.middle[3] === 255 && art.cut.middle[1] > 150, 'the magenta around a building picture is cut away: ' + JSON.stringify(art.cut));
    const btn = await p.evaluate(() => { const c = document.querySelector('.bb[data-b="school"] canvas[data-icon]'); if (!c) return null; UI.paintIcons(); const g = c.getContext('2d'), d = g.getImageData(c.width / 2, c.height / 2, 1, 1).data; return [d[0], d[1], d[2], d[3]]; });
    need(btn && btn[1] > 150 && btn[0] < 100, 'the school button shows the picture from the file: ' + JSON.stringify(btn));
    // the View setting: 3D to Flat and back; V switches too
    await p.click('#btnMenu'); const v0 = await p.textContent('#btnView'); await p.click('#btnView'); const v1 = await p.evaluate(() => ({ txt: document.getElementById('btnView').textContent, active: R3D.active, saved: localStorage.getItem('sd-view') }));
    need(/3D/.test(v0) && /Flat/.test(v1.txt) && !v1.active && v1.saved === '2d', 'Settings switches to the flat view and remembers it: ' + JSON.stringify(v1));
    await p.evaluate(() => UI.closePops());
    // the flat view draws: buildings as pictures of their models, the soldiers as pictures of their figures, flags, fog
    const fl = await p.evaluate(() => { const k = SD.keep(); cam.z = 1.4; SD.centerOn(k.x + 140, k.y + 80); const t0 = performance.now(); window.__drawMs = 0; window.__step(2); window.__drawMs = 999999; const ms = performance.now() - t0;
      return { ms: Math.round(ms), cards: window.__kits.map(u => !!cardOf2D(u)).concat(!!cardOf2D(window.__knight)), pics: Object.keys(PIC2D).filter(k => picOf2D(k)).length, fog: FOG.on, flags: !!rally.army && !!rally.town }; });
    need(fl.cards.every(Boolean), 'the longbowman, crossbowman, flame trooper, berserker and mounted knight are drawn from their 3D figures: ' + JSON.stringify(fl.cards));
    need(fl.pics >= 15, `the newer buildings are drawn from their 3D models (${fl.pics} kinds)`);
    await p.screenshot({ path: SP + '/tArt-flat.png' });
    // the fog: far land is dark in the flat view
    const fog = await p.evaluate(() => { const far = { x: MW - 300, y: 300 }; SD.centerOn(far.x, far.y); window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; const c = document.getElementById('game'), g = c.getContext('2d'), d = g.getImageData(c.width / 2, c.height / 2, 1, 1).data; return { seen: fogSeen(far.x, far.y), lum: Math.round((d[0] + d[1] + d[2]) / 3) }; });
    need(!fog.seen && fog.lum < 50, 'unexplored land lies dark under the fog in the flat view: ' + JSON.stringify(fog));
    // V switches back to 3D
    await p.evaluate(() => { const k = SD.keep(); SD.centerOn(k.x, k.y); }); await p.keyboard.press('v'); const back = await p.evaluate(() => R3D.active);
    need(back, 'V switches back to 3D');
    // 3D details: the yard's horse and wagon (from the Hold), the full-height longbow, the flame trooper's tank and pilot flame
    const d3 = await p.evaluate(() => { const y = structures.find(b => b.kind === 'woodhut' && b.team === 'player'); y.lvl = 3; R3D.rebuildModel(y); cam.z = 2.2; SD.centerOn(y.x - 20, y.y + 10); window.__drawMs = 0; window.__step(2); window.__drawMs = 999999;
      return R3D.modelOf(y); });
    need(d3 && d3.par, 'the wood yard (with its horse and wagon from the Hold) is built in 3D');
    await p.screenshot({ path: SP + '/tArt-yard.png' });
    art.insideSchool = String(art.insideSchool).slice(0, 40);
    console.log(JSON.stringify({ art, btn, fl, fog, d3 }));
  } finally {
    for (const f of Object.keys(files)) try { fs.unlinkSync(path.join(ROOT, f)); } catch (e) {}
    for (const d of ['art/buildings', 'art/inside', 'art/ui', 'art']) try { fs.rmdirSync(path.join(ROOT, d)); } catch (e) {}
  }
  server.close(); await done();
})();
