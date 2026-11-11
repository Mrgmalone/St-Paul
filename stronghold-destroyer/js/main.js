'use strict';
// Stronghold Destroyer — rally points, weather, outlines, main loop, start.
// Loaded in order by index.html; all files share one global scope.

// ---------- rally points: where new soldiers, and new civilians and rams, gather ----------
const rally = { army: null, town: null }; let settingRally = null;
function rallyFor(kind) {
  const k = keep, which = (kind === 'civ' || MACHINE[kind]) ? 'town' : 'army';
  return rally[which] || { x: k.x1 + 70, y: k.y1 - 10 };
}
function startRally(which) { if (!started) return; settingRally = settingRally === which ? null : which; placing = null; showBanner(settingRally ? `Click the ground where ${which === 'army' ? 'new soldiers' : 'new civilians and rams'} should gather. Right-click or Esc cancels.` : 'Rally point unchanged.', 3.5); rallyButtons(); }
function setRallyAt(sx, sy) { const w = toWorld(sx, sy); if (!w || w.x < 20 || w.y < 20 || w.x > MW - 20 || w.y > MH - 20) return; rally[settingRally] = { x: w.x, y: w.y }; markers.push({ x: w.x, y: w.y, t: 0, col: '255,230,120' }); showBanner(`${settingRally === 'army' ? 'Army' : 'Town'} rally point set.`, 2); AudioSys.ui('place'); settingRally = null; rallyButtons(); }
function rallyButtons() { document.getElementById('rallyArmy').classList.toggle('on', settingRally === 'army'); document.getElementById('rallyTown').classList.toggle('on', settingRally === 'town'); }
document.getElementById('rallyArmy').onclick = () => startRally('army');
document.getElementById('rallyTown').onclick = () => startRally('town');
document.getElementById('sendRally').onclick = () => { const rp = rallyFor('sword'), sold = units.filter(u => u.team === 'player' && !u.dead && u.type !== 'civ' && !isMachine(u) && !u.onWall); if (!sold.length) return; commandMove(sold, rp.x, rp.y); showBanner(`${sold.length} soldiers are marching to the rally point.`, 2.5); };
function goHome() { const k = playerKeep(); if (k) centerOn(k.x + 40, k.y - 20); }
document.getElementById('camHome').onclick = goHome;
let outlinesOn = true;
try { outlinesOn = localStorage.getItem('sd-outlines') !== 'off'; } catch (e) {}
(function outlineButton() {
  const b = document.getElementById('btnOutline'), show = () => { b.textContent = 'Outlines: ' + (outlinesOn ? 'On' : 'Off'); };
  b.onclick = () => { outlinesOn = !outlinesOn; try { localStorage.setItem('sd-outlines', outlinesOn ? 'on' : 'off'); } catch (e) {} show(); }; show();
})();
function setView(want3d) {
  R3D.setActive(want3d);
  document.body.classList.toggle('v3d', R3D.active);
  if (R3D.active && cam.z < 1.05) { const cx = cam.x + vw / cam.z / 2, cy = cam.y + vh / cam.z / 2; cam.z = 1.15; centerOn(cx, cy); }
  if (!R3D.available) { const n = document.getElementById('banner'); n.innerHTML = 'This game needs 3D graphics (WebGL), which this browser has turned off.'; n.style.opacity = 1; }
  resize();
}

// ---------- weather: wind pushes missiles off course, rain and snow shorten shots and slow feet ----------
const WTYPES = {
  clear:  { name: 'Clear',  icon: '☀', rain: 0, snow: 0, wind: 0.12, msg: 'The sky clears.' },
  breezy: { name: 'Breezy', icon: '☁', rain: 0, snow: 0, wind: 0.42, msg: 'A breeze picks up: arrows drift a little with the wind.' },
  windy:  { name: 'Windy',  icon: '☁', rain: 0, snow: 0, wind: 0.85, msg: 'Strong winds! Arrows, bolts and stones drift off course.' },
  rain:   { name: 'Rain',   icon: '☂', rain: 0.7, snow: 0, wind: 0.3, msg: 'Rain is falling: arrows fall shorter and the ground is muddy.' },
  storm:  { name: 'Storm',  icon: '☂', rain: 1, snow: 0, wind: 0.9, msg: 'A storm rolls in! Short, wild shots and slow, muddy marching.' },
  snow:   { name: 'Snow',   icon: '❄', rain: 0, snow: 0.85, wind: 0.3, msg: 'Snow is falling: shorter shots, and everyone moves slowly.' }
};
const WEATHER = { kind: 'clear', rain: 0, snow: 0, wind: 0.12, ang: 0.6, angT: 0.6, cover: 0, t: 600, on: true, season: 0, seasonT: 900 };
// seasons turn every 15 minutes; weather holds 10 to 15 minutes and fits the season: snow only in winter
const SEASONS = [
  { name: 'Spring', icon: '\u2740', pick: ['clear', 'breezy', 'rain', 'rain', 'clear'] },
  { name: 'Summer', icon: '\u2600', pick: ['clear', 'clear', 'breezy', 'windy', 'storm'] },
  { name: 'Autumn', icon: '\u2766', pick: ['windy', 'rain', 'breezy', 'storm', 'clear'] },
  { name: 'Winter', icon: '\u2744', pick: ['snow', 'snow', 'clear', 'windy', 'snow'] }
];
const SEASON_LEN = 900, weatherHold = () => 600 + Math.random() * 300;
function pickWeather(not) { const opts = SEASONS[WEATHER.season].pick.filter(k => k !== not); return opts[Math.floor(Math.random() * opts.length)] || 'clear'; }
try { WEATHER.on = localStorage.getItem('sd-weather') !== 'off'; } catch (e) {}
const weatherRange = () => 1 - 0.14 * WEATHER.rain - 0.1 * WEATHER.snow;
const weatherSpeed = () => 1 - 0.08 * WEATHER.rain - 0.16 * WEATHER.snow;
function setWeather(kind, quiet) {
  WEATHER.kind = kind; WEATHER.t = weatherHold(); WEATHER.angT = Math.random() * Math.PI * 2;
  if (!quiet && started) showBanner(WTYPES[kind].msg, 3.5);
}
function updateWeather(dt) {
  if (!WEATHER.on) { WEATHER.kind = 'clear'; }
  else if (started) {
    WEATHER.seasonT -= dt;
    if (WEATHER.seasonT <= 0) { WEATHER.season = (WEATHER.season + 1) % 4; WEATHER.seasonT = SEASON_LEN; const ns = SEASONS[WEATHER.season]; const k = pickWeather(); WEATHER.kind = k; WEATHER.t = weatherHold(); WEATHER.angT = Math.random() * Math.PI * 2; showBanner(`${ns.icon} ${ns.name} has come. ${WTYPES[k].msg}`, 4.5); }
    WEATHER.t -= dt; if (WEATHER.t <= 0) setWeather(pickWeather(WEATHER.kind));
  }
  const w = WTYPES[WEATHER.kind], k = Math.min(1, dt / 6);
  WEATHER.rain += (w.rain - WEATHER.rain) * k; WEATHER.snow += (w.snow - WEATHER.snow) * k; WEATHER.wind += (w.wind - WEATHER.wind) * k;
  WEATHER.ang += Math.atan2(Math.sin(WEATHER.angT - WEATHER.ang), Math.cos(WEATHER.angT - WEATHER.ang)) * Math.min(1, dt / 8);
  WEATHER.cover = clamp(WEATHER.cover + (WEATHER.snow > 0.3 ? dt / 50 : -dt / (WEATHER.season === 3 ? 400 : 40)), 0, 1);   // snow settles on the ground, then melts
  const el = document.getElementById('vWeather'); if (el) { el.textContent = `${SEASONS[WEATHER.season].name} · ${w.icon} ${w.name}`; const a = document.getElementById('vWind'); a.style.transform = `rotate(${WEATHER.ang}rad)`; a.style.opacity = 0.35 + WEATHER.wind * 0.65; a.title = `Wind ${WEATHER.wind > 0.7 ? 'strong' : WEATHER.wind > 0.35 ? 'moderate' : 'light'}`; }
}
// every missile leaves through here: the wind pushes where it comes down
function fire(a) {
  const push = a.kind === 'stone' ? 40 : a.kind === 'bolt' ? 34 : 72, d = Math.max(0, a.dur) * WEATHER.wind * push * RR(0.45, 1.35);   // gusts: some shots blow wide, some fly true
  const jit = 1 + WEATHER.rain * 0.6 + WEATHER.snow * 0.4;
  a.x1 += Math.cos(WEATHER.ang) * d + RR(-2, 2) * jit * WEATHER.rain; a.y1 += Math.sin(WEATHER.ang) * d * 0.6;
  arrows.push(a);
}
const wdrops = [];
function drawWeatherFx(g) {
  const W = vw, H = vh, rain = WEATHER.rain, snow = WEATHER.snow;
  g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (rain > 0.02) { g.fillStyle = `rgba(30,40,58,${0.22 * rain})`; g.fillRect(0, 0, W, H); }
  if (snow > 0.02) { g.fillStyle = `rgba(210,220,235,${0.1 * snow})`; g.fillRect(0, 0, W, H); }
  const want = Math.round(420 * rain + 320 * snow);
  while (wdrops.length < want) wdrops.push({ x: Math.random() * W, y: Math.random() * H, z: 0.5 + Math.random() * 0.5, s: Math.random() < snow / Math.max(0.01, rain + snow) });
  if (wdrops.length > want) wdrops.length = want;
  const wx = Math.cos(WEATHER.ang) * WEATHER.wind, dt = frameDt;
  g.lineCap = 'round';
  for (const d of wdrops) {
    if (d.s) { d.x += (wx * 90 + Math.sin(time * 1.3 + d.z * 20) * 18) * d.z * dt; d.y += 46 * d.z * dt; }
    else { d.x += wx * 380 * d.z * dt; d.y += 900 * d.z * dt; }
    if (d.y > H) { d.y -= H + 20; d.x = Math.random() * W; d.s = Math.random() < snow / Math.max(0.01, rain + snow); } if (d.x > W + 20) d.x -= W + 40; if (d.x < -20) d.x += W + 40;
    if (d.s) { g.fillStyle = `rgba(255,255,255,${0.55 + 0.4 * d.z})`; g.beginPath(); g.arc(d.x, d.y, 1.2 + 1.6 * d.z, 0, Math.PI * 2); g.fill(); }
    else { g.strokeStyle = `rgba(200,215,235,${0.25 + 0.3 * d.z})`; g.lineWidth = 0.8 + 0.6 * d.z; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x - wx * 18 * d.z, d.y - 16 * d.z); g.stroke(); }
  }
  g.restore();
}
(function treesButton() {
  const b = document.getElementById('btnTrees'), show = () => { b.textContent = 'Trees: ' + (R3D.treeDetailOn() ? 'Detailed' : 'Simple'); };
  b.onclick = () => { R3D.treeDetail(!R3D.treeDetailOn()); show(); }; show();
})();
(function weatherButton() {
  const b = document.getElementById('btnWeather'), show = () => { b.textContent = 'Weather: ' + (WEATHER.on ? 'On' : 'Off'); };
  b.onclick = () => { WEATHER.on = !WEATHER.on; try { localStorage.setItem('sd-weather', WEATHER.on ? 'on' : 'off'); } catch (e) {} if (WEATHER.on) WEATHER.t = Math.min(WEATHER.t, 30); show(); }; show();
})();
// ---------- main loop ----------
let last = performance.now(), time = 0, lastSel = 0, lastRaiders = 0, frameDt = 0.016;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // reading a menu (help, mood, goods, a building's panel) pauses the game, unless enemies are close
  menuT -= dt; if (menuT <= 0) { menuT = 0.25; const open = started && !won && (!document.getElementById('help').classList.contains('hide') || ['menuPop', 'moodPop', 'goodsPop', 'storePop'].some(id => !document.getElementById(id).hidden));
    menuPause = open && !enemiesClose(); document.getElementById('menuNote').hidden = !menuPause || paused; }
  const halted = paused || menuPause;
  if (!halted) time += dt; frameDt = halted ? 0 : dt;
  // camera scrolling
  const sp = 620 / cam.z * dt;
  let mx = 0, my = 0;
  if (keys.ArrowLeft) mx -= 1; if (keys.ArrowRight) mx += 1; if (keys.ArrowUp) my -= 1; if (keys.ArrowDown) my += 1;
  const modal = !document.getElementById('help').classList.contains('hide') || document.getElementById('pick').style.display !== 'none' && !started;
  if (edge.on && !pinch && !orbit && !modal && !TOUCH.mode && performance.now() > edge.touchUntil) { const E = 12, W = window.innerWidth, H = window.innerHeight; if (edge.x <= E) mx -= 1; if (edge.x >= W - 1 - E) mx += 1; if (edge.y <= E) my -= 1; if (edge.y >= H - 1 - E) my += 1; }
  edge.held = (mx || my) && !(keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown) ? edge.held + dt : 0;
  const boost = 1 + Math.min(1, edge.held / 1.2) * 0.8;   // edge scrolling speeds up the longer you hold
  mx *= boost; my *= boost;
  if (mx || my) { if (R3D.active) { const { c, s } = R3D.panAxes(); const ax = mx * c + my * s, ay = -mx * s + my * c; mx = ax; my = ay; } }
  const ease = Math.min(1, dt * 9);
  camVel.x += (mx * sp / Math.max(dt, 1e-3) - camVel.x) * ease; camVel.y += (my * sp / Math.max(dt, 1e-3) - camVel.y) * ease;
  if (Math.abs(camVel.x) + Math.abs(camVel.y) > 2) { cam.x += camVel.x * dt; cam.y += camVel.y * dt; clampCam(); } else { camVel.x = camVel.y = 0; }
  if (Math.abs(fling.x) + Math.abs(fling.y) > 4) { cam.x += fling.x * dt; cam.y += fling.y * dt; clampCam(); const k = Math.exp(-dt * 3.2); fling.x *= k; fling.y *= k; } else fling.x = fling.y = 0;
  // smooth zoom toward the wheel's target
  if (zoomAnim) {
    const z0 = cam.z, z1 = z0 + (zoomAnim.z - z0) * Math.min(1, dt * 11), done = Math.abs(zoomAnim.z - z1) < 0.002;
    const nz = done ? zoomAnim.z : z1;
    if (R3D.active) { const cx = cam.x + vw / z0 / 2, cy = cam.y + vh / z0 / 2; cam.z = nz; centerOn(cx, cy); }
    else { const wx = zoomAnim.sx / z0 + cam.x, wy = zoomAnim.sy / z0 + cam.y; cam.z = nz; cam.x = wx - zoomAnim.sx / nz; cam.y = wy - zoomAnim.sy / nz; clampCam(); }
    if (done) zoomAnim = null;
  }

  if (!halted) {
  buildUnitGrid();
  for (const u of units) updateUnit(u, dt);
  curTeam = 'player';
  separate();
  curTeam = 'player';
  if (!won && started) { updateWar(dt); updateEconomy(dt); }
  for (const s of structures) if (s.selfBuild && !s.done && !s.dead) { s.progress = Math.min(1, s.progress + dt / s.buildTime); s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.9 * dt / s.buildTime); if (s.progress >= 1) s.done = true; }
  for (const s of structures) { s.flash = Math.max(0, s.flash - dt * 5); s.wobble = Math.max(0, s.wobble - dt * 3); if (s.dead) s.deathT += dt; }
  for (const fi of fires) if (Math.random() < dt * 4) spawn('smoke', fi.x + RR(-3, 3), fi.y - 18, fi.y);
  updateParticles(dt);
  for (let i = markers.length - 1; i >= 0; i--) { markers[i].t += dt; if (markers[i].t > 0.7) markers.splice(i, 1); }
  for (let i = units.length - 1; i >= 0; i--) if (units[i].dead && units[i].deathT > 10) units.splice(i, 1);
  }

  hover = mouse.inside ? pickScreen(mouse.x, mouse.y) : null;
  placeFixButton();
  updateTrainButtons(); if (!halted) updateWeather(dt);
  if (leftNoteT > 0) { leftNoteT -= dt; if (leftNoteT <= 0) document.getElementById('leftNote').hidden = true; }
  for (let i = prints.length - 1; i >= 0; i--) { prints[i].t += frameDt; if (prints[i].t > (WEATHER.cover > 0.3 ? 60 : 28)) prints.splice(i, 1); }
  for (let i = speeches.length - 1; i >= 0; i--) { speeches[i].t += dt; if (speeches[i].t > 3.6 || speeches[i].u.dead) speeches.splice(i, 1); } AudioSys.setRain(WEATHER.rain + WEATHER.snow * 0.15, WEATHER.wind);
  const civSel = [...selection].some(u => u.type === 'civ');
  const overRes = civSel && !hover && mouse.inside ? pickResourceScreen(mouse.x, mouse.y) : null;
  canvas.style.cursor = placing ? 'crosshair' : hover && hover.team === 'enemy' && selection.size ? 'crosshair' : (isMine(hover) || overRes) ? 'pointer' : 'default';

  render();
  hudT -= dt; if (hudT <= 0) { hudT = 0.2; updateHud(); UI.drawMini(); }
  {
    const fire = fires.filter(f => f.x > cam.x - 100 && f.x < cam.x + vw / cam.z + 100 && f.y > cam.y - 100 && f.y < cam.y + vh / cam.z + 100);
    let marching = 0, mx = 0, my = 0;
    for (const u of units) if (!u.dead && u.moving && !isMachine(u) && u.x > cam.x && u.x < cam.x + vw / cam.z && u.y > cam.y && u.y < cam.y + vh / cam.z) { marching++; mx += u.x; my += u.y; }
    const k = playerKeep(), civCount = units.filter(u => !u.dead && u.type === 'civ').length;
    AudioSys.ambientTick(dt, { fires: fire, marching, mx: marching ? mx / marching : 0, my: marching ? my / marching : 0, town: k && civCount >= 3 ? { x: k.x, y: k.y } : null });
    const raiders = units.filter(u => u.raider && !u.dead).length;
    if (lastRaiders > 0 && raiders === 0 && started && !won) { AudioSys.ui('triumph'); showBanner('The raid has been beaten back!', 3); }
    lastRaiders = raiders;
  }
  if (selection.size !== lastSel) { if (selection.size > lastSel) AudioSys.ui('select'); lastSel = selection.size; }
  requestAnimationFrame(frame);
}

function render() {
  if (R3D.active) { R3D.render(ctx, frameDt); drawWeatherFx(ctx); return; }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);   // no 3D graphics: nothing to draw
}

// ---------- start ----------
setupWorld();
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(document.getElementById('view'));
resize();
cam.z = clamp(Math.min(1.25, Math.max(vw / 1150, vh / 760)), minZoom(), 2.4);
centerOn(PLAYER_START.x + 160, PLAYER_START.y - 120);
document.getElementById('banner').style.opacity = 0; document.getElementById('banner').classList.remove('shown');
let palVer = 0;
function startGame(key) {
  palVer++;   // team colours change: 3D buildings made before this are rebuilt in the new colours
  AudioSys.init(); AudioSys.setTheme(key);
  CIV = CIVS[key];
  Object.assign(PAL.player, { tunic: ARMY.crimson, tunicDark: ARMY.crimsonDark, shield: ARMY.crimson });   // every civilisation's army wears Gerald's crimson and gold
  PAL.civ.trim = CIV.color;
  res.food = CIV.food; res.wood = CIV.wood; foodKinds.berries = 0; foodKinds.bread = 0; foodKinds.crops = CIV.food; res.sword = 0; res.spear = 2; res.bow = 2; res.stone = 30;
  Object.assign(keep, { hp: CIV.keepHp, maxHp: CIV.keepHp, fireRate: CIV.keepRate, arrowDmg: CIV.keepDmg, range: CIV.keepRange });
  spawnPlayerPeople(); spawnKing(); if (keep) giftKnight(keep, '');
  centerOn(keep.x + 90, keep.y - 10);   // open the game looking at your castle
  planEnemyWalls(); buildEnemyWalls(16, true);
  planEnemyBase(); raidTimer = Math.max(300, DIFF.first + 210);
  Object.assign(WEATHER, { season: 0, seasonT: SEASON_LEN, kind: 'clear', t: weatherHold(), cover: 0 });
  LORD.unit = null; LORD.said = {}; LORD.broken = false; spawnLord();
  setTimeout(() => lordSay('hello', 'So, a new lord in the west. Enjoy your little keep while it stands.'), 22000);
  { const camp = enemyCamp(); for (let i = 0; i < 4; i++) { const f = nearestFree(Math.floor((camp.x - 70 + i * 22) / TILE), Math.floor((camp.y + 40) / TILE)); if (f) makeUnit('enemy', 'civ', f.c * TILE + 16, f.r * TILE + 16); } }
  started = true;
  document.getElementById('pick').style.display = 'none';
  UI.paintIcons();
  showBanner(`${DIFF.name} difficulty. <b>${Math.round(raidTimer / 60)} minutes of peace</b> to build before the war begins. Press Pause (P) any time to plan your castle.<br>You lead the <b>${CIV.name}</b>. The war is already underway.<br>Put your civilians to work gathering food and wood, train soldiers at your keep,<br>and destroy the enemy watchtower in the northeast to stop the raids.<br>The enemy is walling in its camp. Strike early, or bring battering rams.<br><b>Press Help (or H) to see the controls.</b>`, 10);
  updateHud();
}
document.querySelectorAll('.civ').forEach(b => b.onclick = () => startGame(b.dataset.civ));
(function difficulty() {
  let d = 'medium'; try { d = localStorage.getItem('sd-diff') || 'medium'; } catch (e) {}
  const set = k => { DIFF = DIFFS[k] || DIFFS.medium; document.querySelectorAll('.dbtn').forEach(b => b.classList.toggle('on', b.dataset.d === DIFF.key)); try { localStorage.setItem('sd-diff', DIFF.key); } catch (e) {} };
  document.querySelectorAll('.dbtn').forEach(b => b.onclick = () => set(b.dataset.d)); set(d);
})();
document.addEventListener('pointerdown', () => AudioSys.init());
document.getElementById('btnMusic').onclick = () => { AudioSys.init(); AudioSys.setOn('music', !AudioSys.isOn('music')); refreshSoundButtons(); };
document.getElementById('btnSound').onclick = () => { AudioSys.init(); AudioSys.setOn('sfx', !AudioSys.isOn('sfx')); refreshSoundButtons(); };
document.getElementById('volMusic').oninput = e => { AudioSys.init(); AudioSys.setVol('music', e.target.value / 100); };
document.getElementById('volSound').oninput = e => { AudioSys.init(); AudioSys.setVol('sfx', e.target.value / 100); AudioSys.ui('select'); };
document.getElementById('volMusic').value = Math.round(AudioSys.vol('music') * 100);
document.getElementById('volSound').value = Math.round(AudioSys.vol('sfx') * 100);
refreshSoundButtons();
UI.paintIcons(); UI.drawMini();
setView(true);
updateHud();
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });

// test hook
window.SD = { sayLine, talkTo, speeches, cheer, moodReasons, showTower, updateGuards, armorMul, recipeOf, leftCountOf: () => leftCount, showSite, siteAction, staffOf, maxStaff, LORD, spawnLord, WEATHER, setWeather, weatherRange, weatherSpeed, ENEMY, DIFFS, setDiff: k => { DIFF = DIFFS[k]; }, diff: () => DIFF, enemyCamp, raidRoutes, rally, rallyFor, queuedOf, whyNotTrain, buyWeapon, BUY, foodKinds, foodVariety, addFood, CRAFT, WEAPON, weaponRoute, R3D, setView, scr: (x, y, h = 0) => screenOf(x, y, h), camWorld: (x, y) => centerOn(x + vw / cam.z / 2, y + vh / cam.z / 2), centerOn, goHome, AudioSys, buildEnemyWalls, enemyWalls: () => structures.filter(b => b.team === 'enemy' && b.kind === 'wall'), wallPlan: () => enemyWallPlan.length, mood: () => mood, setMood: v => { mood = v; }, rule: () => [ration, tax], farms, BUILD, createBuilding, canPlace, assignBuilders, startPlacing, placeAt, placing: () => placing, gate, startGame, civ: () => CIV, res, bushes, trees, keep: () => keep, trainUnit, trainQueue, commandGather, units, structures, arrows, raid: () => raidTimer, setRaid: v => { raidTimer = v; }, spawnRaid, selection: () => selection, selectOnly, commandMove, commandAttack, cam, toWorld, findPath };
