'use strict';
// Stronghold Destroyer — castle and town building, panels, market.
// Loaded in order by index.html; all files share one global scope.

// ---------- castle building ----------
const BUILD = {
  farm:   { name: 'Farm',  w: 2, h: 2, wood: 60,  time: 10, hp: 200, topH: 12 },
  house:  { name: 'House', w: 2, h: 2, wood: 50,  time: 12, hp: 400, topH: 80 },
  wall:   { name: 'Wall',  w: 1, h: 1, wood: 8,   time: 3,  hp: 300, topH: 40 },
  gate:   { name: 'Gate',  w: 1, h: 1, wood: 15,  time: 5,  hp: 400, topH: 44 },
  gtower: { name: 'Tower', w: 2, h: 2, wood: 120, time: 20, hp: 700, topH: 122 },
  highwall: { name: 'High Wall', w: 1, h: 1, wood: 0, stone: 6, time: 6, hp: 900, topH: 104 },
  stairs: { name: 'Stairs', w: 1, h: 1, wood: 0, stone: 4, time: 4, hp: 500, topH: 96 },
  stower: { name: 'Stone Tower', w: 2, h: 2, wood: 20, stone: 60, time: 28, hp: 1600, topH: 158 },
  greattower: { name: 'Great Tower', w: 3, h: 3, wood: 40, stone: 120, gold: 30, time: 42, hp: 2800, topH: 186 },
  moat: { name: 'Moat', w: 1, h: 1, wood: 0, time: 5, hp: 160, topH: 4 },
  pit: { name: 'Spike Pit', w: 1, h: 1, wood: 10, time: 4, hp: 60, topH: 4 },
  lookout: { name: 'Lookout Tower', w: 2, h: 2, wood: 40, stone: 50, time: 26, hp: 1100, topH: 261 },
  roundtower: { name: 'Round Tower', w: 3, h: 3, wood: 60, stone: 160, gold: 50, time: 40, hp: 3200, topH: 150 },
  quarry: { name: 'Quarry', w: 2, h: 2, wood: 40, time: 10, hp: 300, topH: 50 },
  woodhut: { name: "Woodcutter's Hut", w: 2, h: 2, wood: 30, time: 8, hp: 250, topH: 56 },
  stockpile: { name: 'Stockpile', w: 2, h: 2, wood: 20, time: 6, hp: 200, topH: 22 },
  granary: { name: 'Granary', w: 2, h: 2, wood: 40, time: 10, hp: 350, topH: 72 },
  hopfarm: { name: 'Hop Farm', w: 2, h: 2, wood: 40, time: 10, hp: 200, topH: 30 },
  brewery: { name: 'Brewery', w: 2, h: 2, wood: 50, time: 12, hp: 350, topH: 66 },
  wheatfarm: { name: 'Wheat Field', w: 2, h: 2, wood: 40, time: 10, hp: 200, topH: 14 },
  mill: { name: 'Mill', w: 2, h: 2, wood: 60, time: 14, hp: 350, topH: 110 },
  bakery: { name: 'Bakery', w: 2, h: 2, wood: 50, time: 12, hp: 350, topH: 64 },
  chapel: { name: 'House of Prayer', w: 2, h: 2, wood: 80, gold: 40, time: 18, hp: 600, topH: 104 },
  garden: { name: 'Garden', w: 2, h: 2, wood: 20, gold: 10, time: 6, hp: 150, topH: 16 },
  stocks: { name: 'Stocks', w: 1, h: 1, wood: 15, time: 4, hp: 150, topH: 30 },
  tavern: { name: 'Tavern', w: 2, h: 2, wood: 60, time: 14, hp: 400, topH: 74 },
  ironmine: { name: 'Iron Mine', w: 2, h: 2, wood: 40, time: 10, hp: 300, topH: 58 },
  bowyer: { name: 'Bowyer', w: 2, h: 2, wood: 40, time: 10, hp: 300, topH: 60 },
  poleturner: { name: 'Spear-maker', w: 2, h: 2, wood: 40, time: 10, hp: 300, topH: 60 },
  smithy: { name: 'Blacksmith', w: 2, h: 2, wood: 50, time: 12, hp: 380, topH: 64 },
  armory: { name: 'Armory', w: 2, h: 2, wood: 50, time: 12, hp: 450, topH: 66 },
  market: { name: 'Market', w: 3, h: 2, wood: 60, time: 14, hp: 400, topH: 48 }
};
const TERRITORY = 560;
const farms = [];
let placing = null;
// MAX_PEOPLE: the most people you can have, however many houses (proposed 400; the game stays smooth with
// about 700 people on the map at once, so this leaves room for the rivals' armies too). Each house adds 5 room.
const MAX_PEOPLE = 400;
const popCap = () => Math.min(MAX_PEOPLE, (CIV.popCap + 5 * structures.filter(b => b.kind === 'house' && b.done && !b.dead && b.team === 'player').length) * (CIV.popMul || 1));   // Hekaranok: room for twice the people
// a building can face any of four ways before it is set down: 0 south (toward you), 1 west, 2 north, 3 east
const DIR_NAME = ['south', 'west', 'north', 'east'], DIR_VEC = [[0, 1], [-1, 0], [0, -1], [1, 0]];
const dimsOf = (kind, dir = 0) => { const d = BUILD[kind]; return dir % 2 ? { w: d.h, h: d.w } : { w: d.w, h: d.h }; };
function tileFor(kind, wx, wy, dir = 0) { const d = dimsOf(kind, dir); return { c: Math.round(wx / TILE - d.w / 2), r: Math.round(wy / TILE - d.h / 2) }; }
function canPlace(kind, c, r, dir = 0) {
  const k = playerKeep(), d = dimsOf(kind, dir); if (!k) return false;
  const cx = (c + d.w / 2) * TILE, cy = (r + d.h / 2) * TILE;
  if (kind !== 'ironmine' && kind !== 'quarry' && Math.hypot(cx - k.x, cy - (k.y0 + k.y1) / 2) > TERRITORY) return false;
  if (kind === 'ironmine' && !rocks.some(rk => rk.iron && Math.hypot(rk.x - cx, rk.y - 6 - cy) < 80)) return false;
  if (kind === 'quarry' && !rocks.some(rk => !rk.iron && !rk.gone && Math.hypot(rk.x - cx, rk.y - 6 - cy) < 80)) return false;
  if (kind === 'stairs' && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => { const o = structAt(c + dc, r + dr); return o && o.kind === 'highwall'; })) return false;
  for (let i = 0; i < d.w; i++) for (let j = 0; j < d.h; j++) {
    const cc = c + i, rr2 = r + j;
    if (cc < 1 || rr2 < 1 || cc >= COLS - 1 || rr2 >= ROWS - 1 || blocked[rr2 * COLS + cc] || gate[rr2 * COLS + cc]) return false;
    const x0 = cc * TILE, y0 = rr2 * TILE;
    if (farms.some(fm => x0 < fm.x1 && x0 + TILE > fm.x0 && y0 < fm.y1 && y0 + TILE > fm.y0)) return false;
    if (bushes.some(b => b.x > x0 - 8 && b.x < x0 + TILE + 8 && b.y > y0 - 8 && b.y < y0 + TILE + 8)) return false;
  }
  return true;
}
function makeBuildingObj(kind, c, r, dir = 0) {
  const d = Object.assign({}, BUILD[kind], dimsOf(kind, dir));
  const b = { id: nextId++, kind, team: 'player', name: d.name, c, r, w: d.w, h: d.h, dir,
    x0: c * TILE, y0: r * TILE, x1: (c + d.w) * TILE, y1: (r + d.h) * TILE, x: (c + d.w / 2) * TILE, y: (r + d.h) * TILE,
    maxHp: Math.round(d.hp * (['wall', 'gate', 'gtower', 'highwall', 'stairs', 'stower', 'greattower', 'lookout', 'roundtower'].includes(kind) ? CIV.bldHp : 1)), hp: d.hp * 0.1, done: false, progress: 0, buildTime: d.time, flash: 0, dead: false, deathT: 0, radius: d.w * 16, wobble: 0, topH: d.topH };
  if (kind === 'gtower') Object.assign(b, { range: 230, fireRate: 2.0, arrowDmg: 7, archerY: 112 });
  if (kind === 'stower') Object.assign(b, { range: 265, fireRate: 1.6, arrowDmg: 8, archerY: 146 });
  if (kind === 'lookout') Object.assign(b, { range: 320, fireRate: 1.7, arrowDmg: 8, archerY: 255 });
  if (kind === 'roundtower') Object.assign(b, { range: 290, fireRate: 1.5, arrowDmg: 8, archerY: 150, shots: 2 });
  if (kind === 'greattower') Object.assign(b, { range: 290, fireRate: 1.4, arrowDmg: 9, archerY: 170, shots: 2 });
  if (isField(kind)) Object.assign(b, { amount: 0, max: 40 });
  return b;
}
function createBuilding(kind, c, r, dir = 0) {
  const b = makeBuildingObj(kind, c, r, dir);
  if (isField(kind)) { farms.push(b); return b; }
  for (let i = 0; i < b.w; i++) for (let j = 0; j < b.h; j++) { if (kind === 'gate') gate[(r + j) * COLS + c + i] = 1; else if (kind !== 'pit') setBlock(c + i, r + j, 1); }
  if (kind === 'pit') Object.assign(b, { charges: 3, sprung: 0, cool: 0 });
  if (kind !== 'gate' && kind !== 'pit') for (const u of units) {   // step anyone standing on the new foundation aside
    if (u.dead || u.x < b.x0 - 6 || u.x > b.x1 + 6 || u.y < b.y0 - 6 || u.y > b.y1 + 6) continue;
    const f = nearestFree(Math.floor(u.x / TILE), Math.floor(u.y / TILE)); if (f) { u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; u.path = []; }
  }
  structures.push(b);
  return b;
}
const COMFORT = { tavern: [10, 120], chapel: [12, 150], granary: [8, 90], garden: [6, 60], house: [4, 45], bakery: [6, 60] };
function finishBuilding(b) {
  b.done = true; b.progress = 1;
  if (b.team === 'player' && COMFORT[b.kind]) cheer(COMFORT[b.kind][0], COMFORT[b.kind][1], `${b.name}: your people cheer! +${COMFORT[b.kind][0]} mood`);
  if (isField(b.kind)) b.amount = 10;
  if (b.team === 'player') floatText(b.x, b.y - b.topH - 10, `${b.name} built`, '#9fe8a8');
  if (b.team === 'player') AudioSys.play('built', b.x, b.y);
  if (b.team === 'player' && GIFT_TOWERS[b.kind]) giftKnight(b, 'A knight comes with the tower to guard its door.');
}
// every tower, big or small, and the keep come with one free knight who guards the door
const GIFT_TOWERS = { gtower: 1, stower: 1, greattower: 1, lookout: 1, roundtower: 1 };
function giftKnight(b, msg) {
  // he stands on the open side that faces home, so he never ends up outside the wall
  const home = keep && keep !== b ? keep : { x: b.x, y: b.y + 999 }, mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2;
  const spots = [[mx, b.y1 + 14], [mx, b.y0 - 14], [b.x0 - 14, my], [b.x1 + 14, my]].filter(([x, y]) => !circleBlocked(x, y, 6)).sort((p, q) => Math.hypot(p[0] - home.x, p[1] - home.y) - Math.hypot(q[0] - home.x, q[1] - home.y));
  const fr = spots[0] ? null : nearestFree(Math.floor(mx / TILE), Math.floor((b.y1 + 14) / TILE)), sp = spots[0] || (fr ? [fr.c * TILE + 16, fr.r * TILE + 16] : [mx, b.y1 + 14]);   /* every side of the tower hemmed in: the nearest clear spot, never inside the trees */
  // the door guard that comes with a tower fits your stage: a spearman, then a maceman (until foot knights come), then a knight
  const u = makeUnit('player', FACKEY && !LEGACY ? (stageN >= 4 ? 'knight' : stageN >= 3 ? 'maceman' : 'spear') : 'knight', sp[0], sp[1]);
  u.gift = true; u.guardOf = b; u.cmdT = -99; u.guardSpot = { x: sp[0], y: sp[1] };
  if (msg) floatText(b.x, (b.y1 !== undefined ? b.y1 : b.y) - 30, msg, '#9fe8a8');
  return u;
}
// a door guard throws itself at anyone who comes within reach of its tower or keep
const GUARD_R = { keep: 260 };
function guardPost(u) {
  const g = u.guardOf; if (!g || g.dead || g.x0 === undefined || u.toHeal) return false;
  const R = GUARD_R[g.kind] || 230;
  if (u.order === 'attack' && alive(u.target) && hostile('player', u.target.team) && u.target.x0 === undefined) {
    if (edgeDist(g, u.target) > R + 90) { u.order = 'idle'; u.target = null; u.path = []; return true; }   // gone: back to the door
    return false;
  }
  if (u.order !== 'idle' && u.order !== 'attack') return false;
  let best = null, bd = R;
  for (const e of units) if (!e.dead && hostile('player', e.team) && !hiddenFrom(e, 'player')) { const d = edgeDist(g, e); if (d < bd) { bd = d; best = e; } }
  if (best) { u.order = 'attack'; u.target = best; u.repath = 0; u.cmdT = -99; return true; }
  return false;
}
function nearestFoundation(u, maxD) {
  let best = null, bd = maxD;
  for (const b of structures.concat(farms)) if (b.team === 'player' && !b.dead && b.done === false) { const d = edgeDist(u, b); if (d < bd) { bd = d; best = b; } }
  return best;
}
function assignBuilders(b) {
  let civs = selectedList().filter(u => u.type === 'civ');
  if (!civs.length) {
    const all = units.filter(u => !u.dead && u.type === 'civ' && u.team === 'player' && u.order !== 'flee' && u.order !== 'build');
    const idle = all.filter(u => u.order === 'idle'), pool = idle.length ? idle : all;
    civs = pool.sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y)).slice(0, 2);
  }
  if (civs.length) commandBuild(civs, b);
}
const afford = d => res.wood >= (d.wood || 0) && res.gold >= (d.gold || 0) && res.stone >= (d.stone || 0);
const pay = d => { res.wood -= d.wood || 0; res.gold -= d.gold || 0; res.stone -= d.stone || 0; };
const lacking = d => res.wood < (d.wood || 0) ? 'wood' : res.stone < (d.stone || 0) ? 'stone' : 'gold';
const isLine = k => k === 'wall' || k === 'highwall' || k === 'moat';
function startPlacing(kind) {
  if (!started || won) return;
  if (!unlocked(kind, false)) { showBanner(`The ${BUILD[kind].name} comes at stage ${stageOfItem(kind, false)}, the ${stageName(stageOfItem(kind, false))}.`, 3); return; }
  if (!afford(BUILD[kind])) { showBanner(`Not enough ${lacking(BUILD[kind])} for a ${BUILD[kind].name}.${lacking(BUILD[kind]) === 'stone' ? ' Build a Quarry beside a grey rock.' : ''}`, 3); return; }
  if ((kind === 'garden' || kind === 'stocks') && structures.filter(b => b.kind === kind && !b.dead && b.team === 'player').length >= 3) { showBanner(`You can have at most 3 ${kind === 'garden' ? 'gardens' : 'sets of stocks'}.`, 2.5); return; }
  tearing = false; tearButton();
  placing = { kind, start: null, dir: lastDir };
  showBanner(isLine(kind) ? 'Click where the wall starts, then where it ends. Right-click or Esc cancels.' : `Click near your keep to place the ${BUILD[kind].name}. Press R (or the Turn button) to turn it; the arrow shows its front. Right-click or Esc cancels.`, 4.5);
  updateHud();
}
function cancelPlacing() { placing = null; updateHud(); }
let lastDir = 0;
// fix a glitch: remove anything that is stuck or jittering and rebuild it fresh where it stands, keeping what it is and what it was doing
function fixUnit(u) {
  if (!u || u.dead) return;
  const keepRoof = u.type === 'king' && u.onWall && u.onWall.kind === 'keep' ? u.onWall : null;
  if (u.onWall && !keepRoof) dismount(u);
  for (const k of ['path', 'target', 'goal', 'chopTree', 'pose', 'buildTarget']) u[k] = k === 'path' ? [] : null;
  Object.assign(u, { order: 'idle', sub: null, moving: false, attackAnim: 0, stuckT: 0, rstuck: 0, repath: 0, fpT: undefined, fpN: 0, stT: undefined, noPathT: 0, poseK: 0, idleT: 0, inside: null, cmdT: time, mountTarget: null });
  if (u.type === 'civ' && u.task && !u.job) u.task = null;
  if (!keepRoof && circleBlocked(u.x, u.y, u.radius * 0.8)) { const f = nearestFree(Math.floor(u.x / TILE), Math.floor(u.y / TILE)); if (f) { u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; } }
  u.lastX = u.x; u.lastY = u.y;
  try { R3D.rebuildModel(u); } catch (e) {}
  for (let i = 0; i < 12; i++) spawn('smoke', u.x + RR(-8, 8), u.y - RR(0, 30), u.y);
  floatText(u.x, u.y - 60, 'Fixed and rebuilt', '#9fe8a8'); AudioSys.ui('select');
  if (u.job && u.type === 'civ') startJob(u);
}
function fixBuilding(b) {
  if (!b || b.dead) return;
  if (!isField(b.kind)) for (let i = 0; i < b.w; i++) for (let j = 0; j < b.h; j++) { if (b.kind === 'gate') gate[(b.r + j) * COLS + b.c + i] = 1; else if (b.kind !== 'pit') setBlock(b.c + i, b.r + j, 1); }
  for (const u of units) {
    if (u.dead || u.inside === b || u.onWall === b) continue;
    if (u.x > b.x0 - 4 && u.x < b.x1 + 4 && u.y > b.y0 - 4 && u.y < b.y1 + 4 && b.kind !== 'gate' && b.kind !== 'pit') { const f = nearestFree(Math.floor(u.x / TILE), Math.floor(u.y / TILE)); if (f) { u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; u.path = []; } }
    if (u.job === b && u.type === 'civ' && !u.inside) { u.order = 'idle'; u.sub = null; u.path = []; u.crafting = null; startJob(u); }
  }
  b.flash = 0; b.wobble = 0; b.dropT = performance.now();
  try { R3D.rebuildModel(b); } catch (e) {}
  for (let i = 0; i < 20; i++) spawn('smoke', b.x + RR(-25, 25), b.y - RR(0, 50), b.y);
  floatText(b.x, b.y - Math.min(60, b.topH || 20) - 10, `${b.name} rebuilt`, '#9fe8a8'); AudioSys.ui('select');
}
const fixRow = '<div style="margin-top:8px"><button class="sm" data-fix="1" style="background:#6a2a1c;color:#fff6e6;border-color:#f0c070">&#10005; Remove &amp; rebuild <small>(fix a glitch)</small></button></div>';
document.getElementById('storePop').addEventListener('click', e => { const t = e.target.closest('[data-fix]'); if (t && storeShown) { const b = storeShown; if (b.kind === 'unit') fixUnit(b); else fixBuilding(b); } });
// walls, gates, towers and other buildings without a panel of their own get a small one, so they too can be fixed
function showBasic(b) {
  storeShown = b; const p = document.getElementById('storePop'); if (b.dead) { p.hidden = true; storeShown = null; return; }
  setBox(p, `<h3>${b.name.toUpperCase()}</h3><div class="ln"><span>Status</span><b>${b.done === false ? 'Being built' : 'Standing'}</b></div><div class="ln"><span>Strength</span><b>${Math.ceil(b.hp)} of ${b.maxHp}</b></div>${fixRow}<div style="font-size:13px;color:#d9c9a3;margin-top:6px">If it ever looks wrong or people get stuck on it, Remove &amp; rebuild puts it right at no cost. Esc closes.</div>`);
  p.dataset.site = ''; p.hidden = false;
}
const fixBtn = document.getElementById('btnFix');
fixBtn.addEventListener('pointerdown', e => e.stopPropagation());
fixBtn.onclick = e => { e.stopPropagation(); const u = selection.size === 1 ? [...selection][0] : null; if (u) fixUnit(u); };
function placeFixButton() {
  const u = selection.size === 1 ? [...selection][0] : null;
  if (!u || u.dead || u.inside || !started) { if (!fixBtn.hidden) fixBtn.hidden = true; return; }
  const q = screenOf(u.x, u.y, (isMachine(u) ? 60 : 64) + (R3D.active ? elev3D(u) : elev2D(u)));
  if (!q.ok || q.x < 0 || q.y < 30 || q.x > vw || q.y > vh) { fixBtn.hidden = true; return; }
  fixBtn.hidden = false; fixBtn.style.left = q.x + 'px'; fixBtn.style.top = q.y + 'px';
}
// tearing down: pull down your own walls and buildings and get back half of what they cost
let tearing = false;
function tearButton() { const b = document.getElementById('btnTear'); if (b) b.classList.toggle('tearing', tearing); }
function startTearing() {
  if (!started || won) return;
  placing = null; tearing = !tearing; tearButton();
  showBanner(tearing ? 'Tear Down: click one of your walls or buildings to pull it down. You get back half of what it cost. Right-click, Esc or the button again to stop.' : 'Tear Down finished.', tearing ? 5 : 1.5);
  updateHud();
}
const refundOf = b => { const d = BUILD[b.kind] || {}; return { wood: Math.floor((d.wood || 0) / 2), stone: Math.floor((d.stone || 0) / 2), gold: Math.floor((d.gold || 0) / 2) }; };
const refundText = r => [r.wood && r.wood + ' wood', r.stone && r.stone + ' stone', r.gold && r.gold + ' gold'].filter(Boolean).join(', ') || 'nothing';
function tearTarget(sx, sy) {
  const h = pickScreen(sx, sy); if (h && h.x0 !== undefined && h.team === 'player' && !h.dead) return h;
  const w = toWorld(sx, sy); return structures.concat(farms).find(b => b.team === 'player' && !b.dead && w.x > b.x0 - 4 && w.x < b.x1 + 4 && w.y > b.y0 - 4 && w.y < b.y1 + 4) || null;
}
function tearAt(sx, sy) {
  const b = tearTarget(sx, sy);
  if (!b) { showBanner('Click one of your own walls or buildings to tear it down.', 2); return; }
  if (b.kind === 'keep') { showBanner('The keep cannot be torn down.', 2.5); return; }
  const r = refundOf(b); res.wood += r.wood; res.stone += r.stone; res.gold += r.gold;
  for (const u of units) {
    if (u.dead) continue;
    if (u.onWall === b) dismount(u);
    if (u.job === b) { u.job = null; u.order = 'idle'; u.task = null; u.crafting = null; }
    if (u.buildTarget === b) { u.buildTarget = null; u.order = 'idle'; u.sub = null; }
    if (u.inside === b) u.inside = null;
    if (u.guardOf === b) u.guardOf = null;
    if (u.breakAt === b) u.breakAt = null;
  }
  if (isField(b.kind)) { const i = farms.indexOf(b); if (i >= 0) farms.splice(i, 1); }
  else { kill(b); const i = structures.indexOf(b); if (i >= 0) structures.splice(i, 1); }
  if (storeShown === b) { document.getElementById('storePop').hidden = true; storeShown = null; }
  floatText(b.x, b.y - Math.min(60, b.topH || 20) - 10, `${b.name} torn down: got back ${refundText(r)}`, '#ffd98a');
  updateHud();
}
function drawTearHover(g, proj) {
  const b = tearTarget(mouse.x, mouse.y); if (!b) return;
  const q = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map(([x, y]) => proj(x, y));
  g.save(); g.beginPath(); q.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath();
  g.fillStyle = b.kind === 'keep' ? 'rgba(120,120,120,0.3)' : 'rgba(255,80,60,0.35)'; g.fill(); g.setLineDash([6, 4]); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,140,110,0.95)'; g.stroke(); g.restore();
  const c = proj((b.x0 + b.x1) / 2, b.y0 - 6), label = b.kind === 'keep' ? 'The keep cannot be torn down' : `Tear down ${b.name}: get back ${refundText(refundOf(b))}`;
  g.save(); g.font = 'bold 16px "Source Sans 3", Georgia, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(label, c.x, c.y - 10); g.fillStyle = '#ffd98a'; g.fillText(label, c.x, c.y - 10); g.restore();
}
document.getElementById('btnTear').onclick = startTearing;
document.getElementById('btnTurn').onclick = e => { e.stopPropagation(); turnPlacing(); };
document.getElementById('btnTurn').addEventListener('pointerdown', e => e.stopPropagation());
function turnPlacing() { if (!placing || isLine(placing.kind)) return; placing.dir = lastDir = (placing.dir + 1) % 4; AudioSys.ui('select'); updateHud(); }
function wallLine(c0, r0, c1, r1) {
  const out = []; let dx = Math.abs(c1 - c0), dy = -Math.abs(r1 - r0), sx = c0 < c1 ? 1 : -1, sy = r0 < r1 ? 1 : -1, err = dx + dy, c = c0, r = r0;
  for (let n = 0; n < 200; n++) { out.push({ c, r }); if (c === c1 && r === r1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; c += sx; } if (e2 <= dx) { err += dx; r += sy; } }
  return out;
}
function placeAt(sx, sy, keepGoing) {
  const w = toWorld(sx, sy), kind = placing.kind, d = BUILD[kind]; let { c, r } = tileFor(kind, w.x, w.y);
  if (isLine(kind)) {
    if (!placing.start) { placing.start = { c, r }; showBanner('Now click where the wall should end.', 3); return; }
    let first = null, short = false;
    for (const t of wallLine(placing.start.c, placing.start.r, c, r)) {
      if (!canPlace(kind, t.c, t.r)) continue;
      if (!afford(d)) { short = true; break; }
      pay(d); const b = createBuilding(kind, t.c, t.r); if (!first) first = b;
    }
    if (short) showBanner(`Not enough ${lacking(d)} to finish the whole wall.`, 3);
    if (first) { assignBuilders(first); AudioSys.ui('place'); }
    placing = keepGoing ? { kind, start: null } : null; updateHud(); return;
  }
  const dir = placing.dir || 0, tf = tileFor(kind, w.x, w.y, dir); c = tf.c; r = tf.r;
  if (!canPlace(kind, c, r, dir)) { showBanner(kind === 'stairs' ? 'Stairs must stand right beside one of your High Walls.' : kind === 'quarry' ? 'A quarry must stand beside a grey rock.' : 'You cannot build there. Build on open ground near your keep.', 2.5); return; }
  if (!afford(d)) { showBanner(`Not enough ${lacking(d)}.`, 2); placing = null; updateHud(); return; }
  pay(d);
  { const nb = createBuilding(kind, c, r, dir); nb.dropT = performance.now(); assignBuilders(nb); } AudioSys.ui('place');
  if (!keepGoing) placing = null; else placing = { kind, start: null, dir };
  updateHud();
}
function drawPlacement(g) {
  const k = playerKeep(); if (!k) return;
  g.save(); g.setLineDash([10, 8]); g.strokeStyle = 'rgba(255,230,140,0.55)'; g.lineWidth = 2;
  g.beginPath(); g.arc(k.x, (k.y0 + k.y1) / 2, TERRITORY, 0, Math.PI * 2); g.stroke(); g.restore();
  const dir = isLine(placing.kind) ? 0 : placing.dir || 0;
  const w = toWorld(mouse.x, mouse.y), kind = placing.kind, d = BUILD[kind], cur = tileFor(kind, w.x, w.y, dir);
  const spots = isLine(kind) && placing.start ? wallLine(placing.start.c, placing.start.r, cur.c, cur.r) : [cur];
  let cost = 0; const bob = -8 - Math.sin(performance.now() / 260) * 3;
  for (const t of spots) {
    const ok = canPlace(kind, t.c, t.r, dir); if (ok) cost += d.stone || d.wood;
    const ghost = makeBuildingObj(kind, t.c, t.r, dir); ghost.done = true; ghost.progress = 1;
    g.fillStyle = ok ? 'rgba(120,255,140,0.28)' : 'rgba(255,80,60,0.35)'; g.fillRect(ghost.x0, ghost.y0, ghost.x1 - ghost.x0, ghost.y1 - ghost.y0);
    g.save(); g.globalAlpha = 0.55; g.translate(0, isLine(kind) ? 0 : bob); drawBuilding(g, ghost, time); g.restore();
    if (!isLine(kind)) facingArrow(g, (ghost.x0 + ghost.x1) / 2, (ghost.y0 + ghost.y1) / 2, dir, Math.max(ghost.x1 - ghost.x0, ghost.y1 - ghost.y0) / 2 + 26, p => p);
  }
  if (isLine(kind)) {
    g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)';
    const label = placing.start ? `${cost} ${d.stone ? 'stone' : 'wood'}` : 'wall start'; g.strokeText(label, w.x, w.y - 24); g.fillStyle = '#ffe9a8'; g.fillText(label, w.x, w.y - 24);
  }
}
// a fat yellow arrow on the ground from the building's middle, pointing the way its front will face
function facingArrow(g, cx, cy, dir, len, proj) {
  const [vx, vy] = DIR_VEC[dir], px = -vy, py = vx, P = (a, s) => proj({ x: cx + vx * a + px * s, y: cy + vy * a + py * s });
  const pts = [P(len * 0.25, -5), P(len - 16, -5), P(len - 16, -13), P(len, 0), P(len - 16, 13), P(len - 16, 5), P(len * 0.25, 5)];
  g.save(); g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath();
  g.fillStyle = 'rgba(255,214,90,0.95)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(40,24,6,0.95)'; g.stroke(); g.restore();
}
function drawBuilding(g, b, t) {
  if (b.dead) {
    if (b.kind === 'farm' || b.kind === 'pit') return;
    if (b.kind === 'moat') { g.fillStyle = 'rgba(96,74,44,0.75)'; g.fillRect(b.x0 + 2, b.y0 + 2, 28, 28); return; }
    g.fillStyle = 'rgba(70,64,56,0.7)'; g.beginPath(); g.ellipse(b.x, b.y - 8, (b.x1 - b.x0) * 0.55, 10, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 4 * b.w; i++) { const a = i * 2.4, r = 4 + (i * 7 % (12 * b.w)); g.fillStyle = i % 2 ? '#8f897e' : '#6b4a28'; g.fillRect(b.x + Math.cos(a) * r - 4, b.y - 8 + Math.sin(a) * r * 0.4 - 3, 8, 5); }
    return;
  }
  const fk = b.flash > 0 ? b.flash * 0.5 : 0, P = c => fk ? mixHex(c, '#ffffff', fk) : c;
  if (b.dir === 1 && !b.mirrored) { g.save(); g.translate(b.x, 0); g.scale(-1, 1); g.translate(-b.x, 0); b.mirrored = true; drawBuilding(g, b, t); b.mirrored = false; g.restore(); return; }
  const unfinished = b.done === false && b.kind !== 'moat' && b.kind !== 'pit';
  if (unfinished) {
    const H = b.topH + 14, top = b.y - H * Math.max(0.08, b.progress);
    g.save(); g.beginPath(); g.rect(b.x0 - 40, top, b.x1 - b.x0 + 80, b.y - top + 30); g.clip();
  }
  if (b.kind === 'farm' || b.kind === 'wheatfarm') drawFarm(g, b, P);
  else if (b.kind === 'mill') drawMill(g, b, P, t);
  else if (b.kind === 'chapel') drawChapel(g, b, P);
  else if (b.kind === 'garden') drawGarden(g, b, P);
  else if (b.kind === 'stocks') drawStocks(g, b, P);
  else if (b.kind === 'hopfarm') drawHopFarm(g, b, P);
  else if (WORKSHOP[b.kind]) drawWorkshop(g, b, P);
  else if (b.kind === 'house') drawHouse(g, b, P, t);
  else if (b.kind === 'wall') drawWall(g, b, P);
  else if (b.kind === 'gate') drawGate(g, b, P);
  else if (b.kind === 'gtower') drawGuardTower(g, b, P, t);
  else if (b.kind === 'highwall') drawHighWall(g, b, P);
  else if (b.kind === 'stairs') drawStairs(g, b, P);
  else if (b.kind === 'stower') drawStoneTower(g, b, P, t);
  else if (b.kind === 'greattower') drawGreatTower(g, b, P, t);
  else if (b.kind === 'lookout') drawLookout(g, b, P, t);
  else if (b.kind === 'roundtower') drawRoundTower(g, b, P, t);
  else if (b.kind === 'quarry') drawQuarry(g, b, P);
  else if (b.kind === 'moat') drawMoat(g, b, P, t);
  else if (b.kind === 'pit') drawPit(g, b, P);
  else if (b.kind === 'woodhut') drawWoodHut(g, b, P);
  else if (b.kind === 'stockpile') drawStockpile(g, b, P);
  else if (b.kind === 'granary') drawGranary(g, b, P);
  else if (b.kind === 'market') drawMarket(g, b, P);
  if (unfinished) {
    g.restore();
    // scaffolding and stakes
    g.strokeStyle = '#7a5a34'; g.lineWidth = 2;
    const h = Math.max(10, b.topH * 0.85);
    for (const x of [b.x0 + 3, b.x1 - 3]) { g.beginPath(); g.moveTo(x, b.y); g.lineTo(x, b.y - h); g.stroke(); }
    g.lineWidth = 1.5; for (let yy = b.y - 14; yy > b.y - h; yy -= 18) { g.beginPath(); g.moveTo(b.x0 + 3, yy); g.lineTo(b.x1 - 3, yy); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(b.x - 20, b.y - h - 12, 40, 6);
    g.fillStyle = '#ffd27a'; g.fillRect(b.x - 19, b.y - h - 11, 38 * b.progress, 4);
  }
}
// flat-view drawings for the work buildings
function drawWoodHut(g, b, P) {
  const M = mats(), cx = b.x - 6, gy = b.y - 6;
  softShadow(g, cx + 18, gy + 3, 40, 11, 0.4);
  g.fillStyle = M.woodV; g.fillRect(cx - 22, gy - 28, 40, 28); lightFace(g, cx - 22, gy - 28, 40, 28);
  g.fillStyle = 'rgba(30,18,8,0.7)'; g.fillRect(cx - 4, gy - 18, 9, 18);
  const roof = () => { g.beginPath(); g.moveTo(cx - 28, gy - 26); g.lineTo(cx - 2, gy - 50); g.lineTo(cx + 24, gy - 26); g.closePath(); };
  fillPath(g, roof, M.thatch); fillPath(g, roof, 'rgba(0,0,0,0.12)'); roof(); g.strokeStyle = 'rgba(40,26,10,0.7)'; g.lineWidth = 0.9; g.stroke();
  for (let k = 0; k < 6; k++) { const x = cx + 26 + (k % 3) * 5, y = gy - 4 - Math.floor(k / 3) * 5; g.fillStyle = '#6b4a28'; g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c9a26a'; g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#7a5a34'; g.fillRect(cx + 22, gy + 2, 10, 5); g.strokeStyle = '#9aa2a8'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx + 27, gy + 2); g.lineTo(cx + 31, gy - 6); g.stroke();
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, cx - 28, gy - 50, 64, 56);
}
// the market: three stalls under striped awnings, their tables heaped with goods
function drawMarket(g, b, P) {
  const M = mats(), gy = b.y - 6;
  softShadow(g, b.x + 8, gy + 2, 52, 12, 0.35);
  const stalls = [[b.x - 30, '#b8402e'], [b.x + 2, '#2f63b0'], [b.x + 32, '#3f8a3a']];
  for (const [sx, col] of stalls) {
    g.fillStyle = '#4a3018'; g.fillRect(sx - 13, gy - 30, 2.4, 30); g.fillRect(sx + 11, gy - 30, 2.4, 30);
    g.fillStyle = M.woodH; g.fillRect(sx - 14, gy - 13, 28, 8); lightFace(g, sx - 14, gy - 13, 28, 8);
    // goods on the table
    for (let k = 0; k < 5; k++) { g.fillStyle = ['#c0392b', '#e0a040', '#c9b38a', '#7a5430', '#8fb04a'][(k + Math.round(sx)) % 5]; g.beginPath(); g.arc(sx - 9 + k * 4.5, gy - 14.5, 2.2, 0, Math.PI * 2); g.fill(); }
    // striped awning
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#f1e6cf' : col; g.beginPath(); g.moveTo(sx - 16 + k * 5.4, gy - 31); g.lineTo(sx - 16 + (k + 1) * 5.4, gy - 31); g.lineTo(sx - 15 + (k + 1) * 5.2, gy - 40); g.lineTo(sx - 15 + k * 5.2, gy - 40); g.closePath(); g.fill(); }
    g.strokeStyle = 'rgba(30,18,8,0.55)'; g.lineWidth = 0.8; g.strokeRect(sx - 16, gy - 40, 32.4, 9);
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#f1e6cf' : col; g.beginPath(); g.arc(sx - 13.3 + k * 5.4, gy - 31, 2.7, 0, Math.PI); g.fill(); }
  }
  g.fillStyle = '#7a5430'; g.beginPath(); g.ellipse(b.x - 44, gy - 3, 5, 6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4a3018'; g.fillRect(b.x - 49, gy - 5, 10, 1.2);
  g.fillStyle = '#d8c69a'; g.beginPath(); g.ellipse(b.x + 46, gy - 4, 5, 6, 0, 0, Math.PI * 2); g.fill();
}
function drawStockpile(g, b, P) {
  const M = mats(), x0 = b.x0 + 4, y0 = b.y0 + 10, w = b.x1 - b.x0 - 8, h = b.y1 - b.y0 - 14;
  softShadow(g, b.x + 6, b.y - 4, 38, 11, 0.35);
  g.fillStyle = M.woodH; g.fillRect(x0, y0, w, h); lightFace(g, x0, y0, w, h);
  // posts, rails and a lean-to roof so it reads as a raised timber store even when empty
  g.fillStyle = '#4a3018'; for (const px of [x0 - 1, x0 + w - 2]) g.fillRect(px, y0 - 26, 3, h + 26);
  g.fillStyle = M.woodH; g.beginPath(); g.moveTo(x0 - 4, y0 - 26); g.lineTo(x0 + w + 4, y0 - 26); g.lineTo(x0 + w + 2, y0 - 18); g.lineTo(x0 - 2, y0 - 18); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0 - 2, y0 - 18, w + 4, 2);
  g.fillStyle = 'rgba(40,24,10,0.5)'; for (const yy of [y0 + h * 0.33, y0 + h * 0.66]) g.fillRect(x0, yy, w, 1.4);
  const logs = Math.min(10, Math.ceil(res.wood / 20)); let li = 0;
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4 - r; k++) { if (li++ >= logs) continue; const x = x0 + 6 + k * 7 + r * 3.5, y = y0 + h - 6 - r * 5; g.fillStyle = '#6b4a28'; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c9a26a'; g.beginPath(); g.arc(x, y, 1.9, 0, Math.PI * 2); g.fill(); }
  const blocks = Math.min(6, Math.ceil(res.stone / 15));
  for (let i = 0; i < blocks; i++) { const bx = x0 + w - 24 + (i % 2) * 9, by = y0 + h - 12 - Math.floor(i / 2) * 6; g.fillStyle = M.stone; g.fillRect(bx, by, 8, 6); lightFace(g, bx, by, 8, 6); }
  const sacks = Math.min(4, Math.ceil(((res.wheat || 0) + (res.flour || 0) + (res.hops || 0) + (res.iron || 0)) / 8));
  for (let i = 0; i < sacks; i++) { g.fillStyle = i % 2 ? '#c9b38a' : '#a88a5a'; g.beginPath(); g.ellipse(x0 + w / 2 + i * 6 - 6, y0 + 6, 3.4, 4, 0, 0, Math.PI * 2); g.fill(); }
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, x0, y0, w, h);
}
function drawGranary(g, b, P) {
  const M = mats(), cx = b.x, gy = b.y - 6;
  softShadow(g, cx + 18, gy + 3, 46, 12, 0.42);
  g.fillStyle = M.stone; g.fillRect(cx - 26, gy - 6, 52, 6);
  g.fillStyle = M.woodV; g.fillRect(cx - 24, gy - 40, 48, 34); lightFace(g, cx - 24, gy - 40, 48, 34);
  g.fillStyle = '#3a2614'; g.fillRect(cx - 8, gy - 26, 16, 20);
  const roof = () => { g.beginPath(); g.moveTo(cx - 32, gy - 38); g.lineTo(cx, gy - 70); g.lineTo(cx + 32, gy - 38); g.closePath(); };
  fillPath(g, roof, M.thatch); roof(); g.strokeStyle = 'rgba(40,26,10,0.7)'; g.lineWidth = 0.9; g.stroke();
  for (const [x, y] of [[cx + 14, gy - 2], [cx + 22, gy - 3], [cx + 18, gy - 9]]) { g.fillStyle = '#d8c69a'; g.beginPath(); g.ellipse(x, y, 4.5, 3.6, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(80,60,30,0.6)'; g.lineWidth = 0.6; g.stroke(); }
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, cx - 32, gy - 70, 64, 70);
}
function drawMill(g, b, P, t) {
  const M = mats(), cx = b.x, gy = b.y - 6;
  softShadow(g, cx + 20, gy + 3, 40, 12, 0.42);
  g.fillStyle = M.stone; g.beginPath(); g.moveTo(cx - 20, gy); g.lineTo(cx - 13, gy - 72); g.lineTo(cx + 13, gy - 72); g.lineTo(cx + 20, gy); g.closePath(); g.fill();
  const lg = g.createLinearGradient(cx - 20, 0, cx + 20, 0); lg.addColorStop(0, 'rgba(255,236,196,0.18)'); lg.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = lg; g.fill();
  g.fillStyle = '#2e2014'; rr(g, cx - 5, gy - 18, 10, 18, 4); g.fill(); g.fillRect(cx - 3, gy - 50, 6, 8);
  g.fillStyle = M.thatch; g.beginPath(); g.moveTo(cx - 17, gy - 70); g.lineTo(cx, gy - 92); g.lineTo(cx + 17, gy - 70); g.closePath(); g.fill();
  const a = b.done ? t * 0.9 : 0;
  g.save(); g.translate(cx, gy - 74); g.rotate(a);
  for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.fillStyle = '#6b4a28'; g.fillRect(-1, 0, 2, 40); g.fillStyle = 'rgba(232,220,190,0.92)'; g.fillRect(1, 8, 8, 30); g.strokeStyle = '#6b4a28'; g.lineWidth = 0.6; for (let y = 12; y < 38; y += 6) { g.beginPath(); g.moveTo(1, y); g.lineTo(9, y); g.stroke(); } }
  g.restore(); g.fillStyle = '#3a2614'; g.beginPath(); g.arc(cx, gy - 74, 3, 0, Math.PI * 2); g.fill();
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, cx - 20, gy - 92, 40, 92);
}
function drawChapel(g, b, P) {
  const M = mats(), cx = b.x, gy = b.y - 6;
  softShadow(g, cx + 20, gy + 3, 46, 13, 0.42);
  g.fillStyle = M.stone; g.fillRect(cx - 24, gy - 40, 34, 40); lightFace(g, cx - 24, gy - 40, 34, 40);
  g.fillStyle = M.stoneDark; g.beginPath(); g.moveTo(cx - 28, gy - 38); g.lineTo(cx - 7, gy - 58); g.lineTo(cx + 14, gy - 38); g.closePath(); g.fill();
  g.fillStyle = M.stone; g.fillRect(cx + 8, gy - 70, 16, 70); lightFace(g, cx + 8, gy - 70, 16, 70);
  g.fillStyle = M.stoneDark; g.beginPath(); g.moveTo(cx + 6, gy - 70); g.lineTo(cx + 16, gy - 86); g.lineTo(cx + 26, gy - 70); g.closePath(); g.fill();
  g.fillStyle = '#2e2014'; g.beginPath(); g.moveTo(cx + 12, gy - 54); g.lineTo(cx + 12, gy - 62); g.arc(cx + 16, gy - 62, 4, Math.PI, 0); g.lineTo(cx + 20, gy - 54); g.closePath(); g.fill();
  g.fillStyle = '#c9a24a'; g.fillRect(cx + 15, gy - 98, 2.2, 13); g.fillRect(cx + 11.5, gy - 94, 9, 2.2);
  g.fillStyle = '#2e2014'; g.beginPath(); g.moveTo(cx - 13, gy); g.lineTo(cx - 13, gy - 14); g.arc(cx - 8, gy - 14, 5, Math.PI, 0); g.lineTo(cx - 3, gy); g.closePath(); g.fill();
  g.fillStyle = 'rgba(120,170,230,0.75)'; for (const x of [cx - 20, cx + 2]) { g.beginPath(); g.moveTo(x, gy - 22); g.lineTo(x, gy - 30); g.arc(x + 2, gy - 30, 2, Math.PI, 0); g.lineTo(x + 4, gy - 22); g.closePath(); g.fill(); }
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, cx - 28, gy - 98, 56, 98);
}
function drawGarden(g, b, P) {
  const x0 = b.x0 + 3, y0 = b.y0 + 3, w = b.x1 - b.x0 - 6, h = b.y1 - b.y0 - 6;
  g.fillStyle = '#5e8a3e'; g.fillRect(x0, y0, w, h);
  g.fillStyle = '#c9b38a'; g.fillRect(x0 + w / 2 - 4, y0, 8, h); g.fillRect(x0, y0 + h / 2 - 4, w, 8);
  g.fillStyle = '#2f5a24'; for (const [x, y] of [[x0, y0], [x0 + w - 6, y0], [x0, y0 + h - 6], [x0 + w - 6, y0 + h - 6]]) g.fillRect(x, y, 6, 6);
  const cols = ['#e86a8a', '#f2d24b', '#b78bd8', '#ffffff', '#e8865a'];
  for (let i = 0; i < 46; i++) { const qx = x0 + 4 + ((i * 37) % (w - 8)), qy = y0 + 4 + ((i * 53) % (h - 8)); if (Math.abs(qx - (x0 + w / 2)) < 6 || Math.abs(qy - (y0 + h / 2)) < 6) continue; g.fillStyle = cols[i % 5]; g.beginPath(); g.arc(qx, qy, 1.6, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#9b958a'; g.beginPath(); g.arc(x0 + w / 2, y0 + h / 2, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4f86a8'; g.beginPath(); g.arc(x0 + w / 2, y0 + h / 2, 5, 0, Math.PI * 2); g.fill();
}
function drawStocks(g, b, P) {
  const cx = b.x, gy = b.y - 4;
  softShadow(g, cx + 6, gy + 2, 16, 5, 0.35);
  g.fillStyle = '#5a3c20'; g.fillRect(cx - 11, gy - 22, 3, 22); g.fillRect(cx + 8, gy - 22, 3, 22);
  g.fillStyle = '#7a5430'; g.fillRect(cx - 13, gy - 20, 26, 7); g.strokeStyle = '#2e1e10'; g.lineWidth = 0.8; g.strokeRect(cx - 13, gy - 20, 26, 7);
  g.fillStyle = '#1e140a'; for (const x of [-7, 0, 7]) { g.beginPath(); g.arc(cx + x, gy - 16.5, 1.6, 0, Math.PI * 2); g.fill(); }
}
function drawHopFarm(g, b, P) {
  const M = mats(), x0 = b.x0 + 2, y0 = b.y0 + 2, w = b.x1 - b.x0 - 4, h = b.y1 - b.y0 - 4;
  g.fillStyle = M.soil; g.fillRect(x0, y0, w, h);
  const grown = b.done ? b.amount / b.max : 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const px = x0 + 8 + c * 15, py = y0 + 14 + r * 14;
    g.strokeStyle = '#6b4a28'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py - 14); g.stroke();
    if (grown > (r * 4 + c) / 16) { g.fillStyle = '#4f8a3a'; g.beginPath(); g.ellipse(px, py - 8, 3.4, 6.5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#b7d66a'; for (const [a, d] of [[-1.5, -11], [1.5, -7], [-1, -4]]) { g.beginPath(); g.arc(px + a, py + d, 1.4, 0, Math.PI * 2); g.fill(); } }
  }
  g.strokeStyle = 'rgba(80,60,30,0.6)'; g.lineWidth = 0.8; g.beginPath(); for (let r = 0; r < 4; r++) { g.moveTo(x0 + 8, y0 + r * 14); g.lineTo(x0 + 53, y0 + r * 14); } g.stroke();
}
function drawWorkshop(g, b, P) {
  const M = mats(), cx = b.x, gy = b.y - 6, k = b.kind;
  softShadow(g, cx + 18, gy + 3, 46, 12, 0.42);
  const stone = k === 'armory' || k === 'smithy';
  g.fillStyle = stone ? M.stone : M.plaster; g.fillRect(cx - 25, gy - 34, 50, 34); lightFace(g, cx - 25, gy - 34, 50, 34);
  if (!stone) { g.fillStyle = M.woodV; for (const x of [-25, -9, 7, 22]) g.fillRect(cx + x, gy - 34, 3, 34); g.fillRect(cx - 25, gy - 34, 50, 3); }
  g.fillStyle = '#2e2014'; g.fillRect(cx - 7, gy - 20, 14, 20);
  const roof = () => { g.beginPath(); g.moveTo(cx - 32, gy - 31); g.lineTo(cx, gy - 58); g.lineTo(cx + 32, gy - 31); g.closePath(); };
  fillPath(g, roof, k === 'armory' ? M.stoneDark : M.thatch); fillPath(g, roof, 'rgba(0,0,0,0.1)'); roof(); g.strokeStyle = 'rgba(40,26,10,0.7)'; g.lineWidth = 0.9; g.stroke();
  // a sign that shows the trade
  g.fillStyle = '#6b4a28'; g.fillRect(cx + 20, gy - 40, 2, 14); g.fillStyle = '#e8d8b0'; g.fillRect(cx + 22, gy - 40, 13, 10); g.strokeStyle = '#3a2614'; g.lineWidth = 0.8; g.strokeRect(cx + 22, gy - 40, 13, 10);
  g.strokeStyle = '#3a2614'; g.fillStyle = '#3a2614'; g.lineWidth = 1.3; const sx = cx + 28.5, sy = gy - 35;
  if (k === 'bakery') { g.beginPath(); g.ellipse(sx, sy, 5, 3, 0, 0, Math.PI * 2); g.fill(); }
  else if (k === 'brewery' || k === 'tavern') { g.beginPath(); g.rect(sx - 3, sy - 3, 5, 6); g.stroke(); g.beginPath(); g.arc(sx + 3, sy, 1.8, -1.4, 1.4); g.stroke(); }
  else if (k === 'bowyer') { g.beginPath(); g.arc(sx - 2, sy, 4.5, -1.2, 1.2); g.stroke(); g.beginPath(); g.moveTo(sx - 0.2, sy - 4.2); g.lineTo(sx - 0.2, sy + 4.2); g.stroke(); }
  else if (k === 'poleturner') { g.beginPath(); g.moveTo(sx - 5, sy + 3); g.lineTo(sx + 4, sy - 3); g.stroke(); g.beginPath(); g.moveTo(sx + 4, sy - 3); g.lineTo(sx + 1.5, sy - 3.4); g.lineTo(sx + 3.4, sy - 0.8); g.fill(); }
  else if (k === 'smithy') { g.fillRect(sx - 4, sy - 1, 8, 2.5); g.fillRect(sx - 1.5, sy + 1.5, 3, 2.5); }
  else if (k === 'armory') { g.beginPath(); g.moveTo(sx - 4, sy + 4); g.lineTo(sx + 4, sy - 4); g.moveTo(sx + 4, sy + 4); g.lineTo(sx - 4, sy - 4); g.stroke(); }
  else if (k === 'ironmine') { g.beginPath(); g.moveTo(sx - 4, sy + 3); g.lineTo(sx + 2, sy - 3); g.stroke(); g.beginPath(); g.arc(sx + 2, sy - 3, 2.5, 3.4, 5.6); g.stroke(); }
  if (k === 'brewery' || k === 'tavern') for (const [x, y] of [[cx - 30, gy - 4], [cx - 22, gy - 3]]) { g.fillStyle = '#7a5430'; g.beginPath(); g.ellipse(x, y, 4, 5, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#2b2824'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x - 4, y - 2); g.lineTo(x + 4, y - 2); g.moveTo(x - 4, y + 2); g.lineTo(x + 4, y + 2); g.stroke(); }
  if (k === 'smithy') { g.fillStyle = 'rgba(255,140,60,0.8)'; g.beginPath(); g.arc(cx - 15, gy - 10, 3, 0, Math.PI * 2); g.fill(); if (b.done && Math.random() < 0.05) spawn('smoke', cx - 12, gy - 60, b.y); }
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, cx - 32, gy - 58, 70, 58);
}
function drawFarm(g, b, P) {
  const M = mats(), x0 = b.x0 + 2, y0 = b.y0 + 2, w = b.x1 - b.x0 - 4, h = b.y1 - b.y0 - 4;
  g.fillStyle = M.soil; g.fillRect(x0, y0, w, h);
  const sg = g.createLinearGradient(x0, y0, x0 + w, y0 + h); sg.addColorStop(0, 'rgba(255,230,180,0.12)'); sg.addColorStop(1, 'rgba(0,0,0,0.18)'); g.fillStyle = sg; g.fillRect(x0, y0, w, h);
  const grown = b.done ? b.amount / b.max : 0, n = Math.round(grown * 7);
  for (let row = 0; row < 7; row++) for (let k = 0; k < 7; k++) {
    if (k >= n + (row % 2)) continue;
    const sx = x0 + 5 + k * 8.5, sy = y0 + 8 + row * 8;
    g.strokeStyle = P('#9a8a3a'); g.lineWidth = 1; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx - 0.5, sy - 3, sx - 1, sy - 6.5); g.moveTo(sx + 2, sy); g.quadraticCurveTo(sx + 2.4, sy - 3, sx + 3, sy - 5.5); g.moveTo(sx + 1, sy); g.lineTo(sx + 1, sy - 7); g.stroke();
    for (const [hx, hy] of [[sx - 1, sy - 7.5], [sx + 3, sy - 6.5], [sx + 1, sy - 8.5]]) {
      g.fillStyle = P('#8a6a24'); g.beginPath(); g.ellipse(hx + 0.3, hy + 0.3, 1.1, 2.1, 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = P('#e2c25a'); g.beginPath(); g.ellipse(hx, hy, 0.9, 1.9, 0.2, 0, Math.PI * 2); g.fill();
    }
  }
  // split-rail fence
  const posts = [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h], [x0 + w / 2, y0], [x0 + w / 2, y0 + h]];
  g.strokeStyle = '#6b4a28'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, y0 - 4); g.lineTo(x0 + w, y0 - 4); g.moveTo(x0, y0 + h - 4); g.lineTo(x0 + w, y0 + h - 4); g.stroke();
  for (const [px, py] of posts) { const p = () => { g.beginPath(); g.rect(px - 1.5, py - 8, 3, 8); }; fillPath(g, p, M.woodV); roundLog(g, p, px - 1.5, 3); }
}
function drawHouse(g, b, P, t) {
  const M = mats(), cx = b.x, gy = b.y - 6;
  softShadow(g, cx + 18, gy + 3, 48, 13, 0.42);
  // side wall and front wall of plaster
  const side = () => { g.beginPath(); g.moveTo(cx + 26, gy); g.lineTo(cx + 34, gy - 8); g.lineTo(cx + 34, gy - 44); g.lineTo(cx + 26, gy - 36); g.closePath(); };
  fillPath(g, side, M.plaster); fillPath(g, side, 'rgba(0,0,0,0.38)');
  g.fillStyle = M.plaster; g.fillRect(cx - 26, gy - 36, 52, 36); lightFace(g, cx - 26, gy - 36, 52, 36);
  g.fillStyle = M.stone; g.fillRect(cx - 27, gy - 5, 54, 5); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - 27, gy - 5, 54, 5);
  // timber framing
  const timber = (x, y, w, h) => { const p = () => { g.beginPath(); g.rect(x, y, w, h); }; fillPath(g, p, M.woodV); fillPath(g, p, 'rgba(40,22,8,0.35)'); p(); g.strokeStyle = 'rgba(20,10,4,0.6)'; g.lineWidth = 0.6; g.stroke(); };
  timber(cx - 26, gy - 36, 52, 3); timber(cx - 26, gy - 8, 52, 3);
  for (const x of [-26, -9, 7, 23]) timber(cx + x, gy - 36, 3, 31);
  seg(g, cx - 23, gy - 33, cx - 9, gy - 18, 2, '#4e341c'); seg(g, cx + 23, gy - 33, cx + 10, gy - 18, 2, '#4e341c');
  // door and window
  const door = () => { rr(g, cx - 6, gy - 22, 12, 17, 2); };
  fillPath(g, door, M.woodV); fillPath(g, door, 'rgba(0,0,0,0.3)'); door(); g.strokeStyle = 'rgba(20,10,4,0.7)'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = '#2b2824'; g.fillRect(cx - 6, gy - 18, 5, 1.2); g.fillRect(cx - 6, gy - 10, 5, 1.2); g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(cx + 3.5, gy - 13, 0.8, 0, Math.PI * 2); g.fill();
  const glow = b.done ? 0.55 + 0.1 * Math.sin(t * 3 + b.id) : 0.1;
  g.fillStyle = '#231a12'; g.fillRect(cx + 11, gy - 28, 9, 8); g.fillStyle = `rgba(255,190,90,${glow})`; g.fillRect(cx + 11.6, gy - 27.4, 7.8, 6.8);
  g.fillStyle = '#4e341c'; g.fillRect(cx + 15, gy - 28, 1.2, 8); g.fillRect(cx + 11, gy - 24.6, 9, 1.2); g.fillRect(cx + 10, gy - 20, 11, 1.6);
  // chimney
  g.fillStyle = M.stone; g.fillRect(cx + 14, gy - 78, 8, 20); lightFace(g, cx + 14, gy - 78, 8, 20); g.fillStyle = M.stoneDark; g.fillRect(cx + 13, gy - 80, 10, 3);
  // thatched roof
  const roof = () => { g.beginPath(); g.moveTo(cx - 35, gy - 32); g.lineTo(cx - 16, gy - 67); g.lineTo(cx + 22, gy - 67); g.lineTo(cx + 41, gy - 37); g.lineTo(cx + 35, gy - 32); g.closePath(); };
  fillPath(g, roof, M.thatch);
  const rg = g.createLinearGradient(cx - 30, gy - 66, cx + 40, gy - 32); rg.addColorStop(0, 'rgba(255,236,190,0.2)'); rg.addColorStop(0.55, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.3)'); fillPath(g, roof, rg);
  const gable = () => { g.beginPath(); g.moveTo(cx - 35, gy - 32); g.lineTo(cx - 16, gy - 67); g.lineTo(cx - 11, gy - 67); g.lineTo(cx - 26, gy - 32); g.closePath(); };
  fillPath(g, gable, 'rgba(0,0,0,0.22)');
  g.fillStyle = 'rgba(80,56,22,0.75)'; g.fillRect(cx - 17, gy - 68.5, 40, 2.4);
  g.strokeStyle = 'rgba(70,48,18,0.7)'; g.lineWidth = 0.8; g.beginPath(); for (let x = cx - 34; x < cx + 35; x += 3) { g.moveTo(x, gy - 32); g.lineTo(x + 1, gy - 29.5); } g.stroke();
  roof(); g.strokeStyle = 'rgba(40,26,10,0.65)'; g.lineWidth = 0.9; g.stroke();
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, cx - 35, gy - 80, 76, 80);
  if (b.done && Math.random() < 0.04) spawn('smoke', cx + 18, gy - 82);
}
function drawWall(g, b, P) {
  const M = mats(), x = b.x0, gy = b.y - 4, w = 32;
  softShadow(g, x + w / 2 + 6, gy + 2, 22, 6, 0.4);
  g.fillStyle = M.stoneDark; g.fillRect(x, gy - 34, w, 8); g.fillStyle = 'rgba(255,240,210,0.12)'; g.fillRect(x, gy - 34, w, 8);
  g.fillStyle = M.stone; g.fillRect(x, gy - 26, w, 26); lightFace(g, x, gy - 26, w, 26);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, gy - 26, w, 1.5);
  merlons(g, M, x + 2, gy - 40, 2, 16, 10, 7);
  if ((b.c * 7 + b.r * 3) % 4 === 0) mossAt(g, x, gy, w, b.c * 31 + b.r);
  if (b.team === 'enemy') {
    const p = () => { g.beginPath(); g.moveTo(x + 11, gy - 23); g.lineTo(x + 21, gy - 23); g.lineTo(x + 21, gy - 13); g.lineTo(x + 16, gy - 9); g.lineTo(x + 11, gy - 13); g.closePath(); };
    fillPath(g, p, P('#8a2622')); const sg = g.createLinearGradient(x + 11, 0, x + 21, 0); sg.addColorStop(0, 'rgba(255,255,255,0.15)'); sg.addColorStop(1, 'rgba(0,0,0,0.3)'); fillPath(g, p, sg);
    p(); g.strokeStyle = '#2c2622'; g.lineWidth = 0.9; g.stroke(); g.fillStyle = P('#2c2622'); g.fillRect(x + 15, gy - 20, 2, 7);
  }
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, x, gy - 40, w, 40);
}
function drawGate(g, b, P) {
  const M = mats(), x = b.x0, gy = b.y - 4, w = 32;
  if (b.dir % 2) {   // turned to sit in a north-south wall: seen from the side, a thick stone gatehouse with the closed gate edge-on
    softShadow(g, x + w / 2 + 6, gy + 2, 20, 6, 0.4);
    g.fillStyle = M.stone; g.fillRect(x + 4, gy - 42, w - 8, 42); lightFace(g, x + 4, gy - 42, w - 8, 42);
    g.fillStyle = M.stoneDark; g.fillRect(x + 2, gy - 46, w - 4, 5); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x + w / 2 - 2, gy - 32, 4, 32);
    g.fillStyle = M.woodV; g.fillRect(x + w / 2 - 1.5, gy - 30, 3, 30);
    g.fillStyle = P((b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic)); g.fillRect(x + 7, gy - 40, 6, 10); g.fillRect(x + w - 13, gy - 40, 6, 10);
    flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, x, gy - 46, w, 46); return;
  }
  softShadow(g, x + w / 2 + 6, gy + 2, 22, 6, 0.4);
  for (const px of [x, x + w - 7]) { g.fillStyle = M.stone; g.fillRect(px, gy - 40, 7, 40); lightFace(g, px, gy - 40, 7, 40); g.fillStyle = M.stoneDark; g.fillRect(px - 1, gy - 44, 9, 5); g.fillStyle = 'rgba(255,240,210,0.2)'; g.fillRect(px - 1, gy - 44, 9, 1.4); }
  const door = () => { g.beginPath(); g.rect(x + 7, gy - 30, w - 14, 30); };
  fillPath(g, door, M.woodV); const dg = g.createLinearGradient(x + 7, 0, x + w - 7, 0); dg.addColorStop(0, 'rgba(255,220,170,0.12)'); dg.addColorStop(1, 'rgba(0,0,0,0.32)'); fillPath(g, door, dg);
  g.fillStyle = '#2b2824'; for (const yy of [gy - 25, gy - 10]) { g.fillRect(x + 7, yy, w - 14, 2); for (let xx = x + 9; xx < x + w - 7; xx += 4) { g.fillStyle = '#6a655e'; g.fillRect(xx, yy + 0.5, 1, 1); g.fillStyle = '#2b2824'; } }
  door(); g.strokeStyle = 'rgba(20,10,4,0.7)'; g.lineWidth = 0.8; g.stroke();
  const ban = () => { g.beginPath(); g.moveTo(x + 9, gy - 40); g.lineTo(x + w - 9, gy - 40); g.lineTo(x + w - 9, gy - 31); g.lineTo(x + w / 2, gy - 29); g.lineTo(x + 9, gy - 31); g.closePath(); };
  fillPath(g, ban, P((b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic))); const bg = g.createLinearGradient(x + 9, 0, x + w - 9, 0); bg.addColorStop(0, 'rgba(255,255,255,0.15)'); bg.addColorStop(1, 'rgba(0,0,0,0.25)'); fillPath(g, ban, bg);
  ban(); g.strokeStyle = OUTLINE; g.lineWidth = 0.6; g.stroke();
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, x, gy - 44, w, 44);
}
function drawGuardTower(g, b, P, t) {
  const M = mats(), cx = b.x, gy = b.y - 4, w = 48, H = 92, D = 10, L = cx - w / 2, Rt = cx + w / 2, T = gy - H;
  softShadow(g, cx + 22, gy + 2, 48, 14, 0.44);
  const side = () => { g.beginPath(); g.moveTo(Rt, gy); g.lineTo(Rt + D, gy - 8); g.lineTo(Rt + D, T - 8); g.lineTo(Rt, T); g.closePath(); };
  fillPath(g, side, M.stone); fillPath(g, side, 'rgba(0,0,0,0.42)');
  const walk = () => { g.beginPath(); g.moveTo(L, T); g.lineTo(Rt, T); g.lineTo(Rt + D, T - 8); g.lineTo(L + D, T - 8); g.closePath(); };
  fillPath(g, walk, M.stoneDark); fillPath(g, walk, 'rgba(255,240,210,0.1)');
  merlons(g, M, L + D + 2, T - 15, 3, 13, 7, 7);
  if (b.done) drawLookoutArcher(g, P, cx + 4, T - 3, b.aim || 1, b.drawT, (b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic), '#c3cad1', null, '#c98d5e');
  g.fillStyle = M.stone; g.fillRect(L, T, w, H); lightFace(g, L, T, w, H);
  for (let yy = T, i = 0; yy < gy; yy += 12, i++) { g.fillStyle = 'rgba(255,248,230,0.10)'; g.fillRect(L, yy + 0.7, i % 2 ? 11 : 6, 10.6); }
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(L - 1, T + 3, w + 2, 2); g.fillStyle = 'rgba(255,240,210,0.25)'; g.fillRect(L - 1, T + 1.6, w + 2, 1.4);
  mossAt(g, L, gy, w, b.id * 13);
  g.strokeStyle = 'rgba(25,22,18,0.6)'; g.lineWidth = 1; g.strokeRect(L, T, w, H);
  merlons(g, M, L, T - 8, 4, 13, 9, 8);
  g.fillStyle = M.stone; g.fillRect(cx - 3.5, T + 24, 7, 17); g.fillStyle = '#16110c'; g.fillRect(cx - 1.5, T + 26, 3, 13);
  drawArchDoor(g, M, P, cx, gy, 8, 14);
  drawBanner(g, P, Rt + 4, T - 6, 28, 10, (b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic), t, null);
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, L, T - 8, w + D, H + 8);
}
function drawHighWall(g, b, P) {
  const M = mats(), x = b.x0, gy = b.y - 4, w = 32, H = 88;
  softShadow(g, x + w / 2 + 12, gy + 2, 28, 7, 0.45);
  g.fillStyle = M.stoneDark; g.fillRect(x - 1, gy - 9, w + 2, 9); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 1, gy - 9, w + 2, 1.5);
  g.fillStyle = M.stone; g.fillRect(x, gy - H, w, H - 9); lightFace(g, x, gy - H, w, H - 9);
  g.fillStyle = 'rgba(0,0,0,0.13)'; for (let yy = gy - H + 12; yy < gy - 9; yy += 12) g.fillRect(x, yy, w, 1);
  g.fillStyle = M.stoneDark; g.fillRect(x, gy - H - 8, w, 8); g.fillStyle = 'rgba(255,240,210,0.12)'; g.fillRect(x, gy - H - 8, w, 8);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, gy - H, w, 1.5);
  merlons(g, M, x + 2, gy - H - 14, 2, 16, 10, 7);
  if ((b.c + b.r) % 2 === 0) { g.fillStyle = '#16110c'; g.fillRect(x + 14.8, gy - H + 24, 2.4, 15); }
  if ((b.c * 7 + b.r * 3) % 4 === 0) mossAt(g, x, gy, w, b.c * 31 + b.r);
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, x, gy - H - 14, w, H + 14);
}
function drawStairs(g, b, P) {
  const M = mats(), x = b.x0, gy = b.y - 4, n = 8, sw = 32 / n, sh = 11;
  softShadow(g, x + 20, gy + 2, 24, 6, 0.4);
  for (let i = 0; i < n; i++) {
    const h = (i + 1) * sh, xx = x + i * sw;
    g.fillStyle = M.stone; g.fillRect(xx, gy - h, sw + 0.5, h); lightFace(g, xx, gy - h, sw + 0.5, h);
    g.fillStyle = 'rgba(255,240,210,0.3)'; g.fillRect(xx, gy - h, sw + 0.5, 1.6);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(xx + sw - 0.6, gy - h, 0.8, h);
  }
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, x, gy - n * sh, 32, n * sh);
}
function towerMerlon(g, M, x, y) {
  g.fillStyle = M.stone; g.fillRect(x, y, 8, 9); g.fillStyle = 'rgba(255,240,210,0.25)'; g.fillRect(x, y, 8, 1.5);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 6, y, 2, 9); g.strokeStyle = 'rgba(30,26,20,0.5)'; g.lineWidth = 0.6; g.strokeRect(x, y, 8, 9);
}
function drawStoneTower(g, b, P, t) {
  const M = mats(), cx = b.x, gy = b.y - 6, R = 30, H = 128, top = gy - H;
  softShadow(g, cx + 26, gy + 4, 54, 15, 0.46);
  const bodyPath = () => { g.beginPath(); g.moveTo(cx - R, top); g.lineTo(cx - R, gy); g.ellipse(cx, gy, R, 9, 0, Math.PI, 0, true); g.lineTo(cx + R, top); g.closePath(); };
  fillPath(g, bodyPath, M.stone);
  const sg = g.createLinearGradient(cx - R, 0, cx + R, 0); sg.addColorStop(0, 'rgba(0,0,0,0.22)'); sg.addColorStop(0.12, 'rgba(255,240,210,0.14)'); sg.addColorStop(0.35, 'rgba(255,240,210,0.22)'); sg.addColorStop(0.7, 'rgba(0,0,0,0.22)'); sg.addColorStop(1, 'rgba(0,0,0,0.62)');
  fillPath(g, bodyPath, sg);
  g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 1; for (let yy = top + 14; yy < gy; yy += 12) { g.beginPath(); g.ellipse(cx, yy, R, 9, 0, 0, Math.PI); g.stroke(); }
  g.fillStyle = M.stoneDark; g.beginPath(); g.ellipse(cx, top, R + 4, 11, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx, top + 1, R + 4, 11, 0, 0, Math.PI); g.lineTo(cx - R - 4, top + 4); g.fill();
  g.fillStyle = '#5d5850'; g.beginPath(); g.ellipse(cx, top - 1, R - 2, 8, 0, 0, Math.PI * 2); g.fill();
  for (let k = 0; k < 6; k++) { const a = Math.PI * (1.1 + k * 0.16); towerMerlon(g, M, cx + Math.cos(a) * (R + 1) - 4, top + Math.sin(a) * 10 - 9); }
  if (b.done) drawLookoutArcher(g, P, cx + 4, top - 2, b.aim || 1, b.drawT, (b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic), '#c3cad1', null, '#c98d5e');
  for (let k = 0; k < 7; k++) { const a = Math.PI * (0.04 + k * 0.153); towerMerlon(g, M, cx + Math.cos(a) * (R + 1) - 4, top + Math.sin(a) * 10 - 9); }
  g.fillStyle = '#16110c'; for (const [dx, yy] of [[-12, top + 34], [10, top + 62], [-4, top + 90]]) g.fillRect(cx + dx, yy, 2.6, 15);
  drawArchDoor(g, M, P, cx, gy + 8, 9, 17);
  drawBanner(g, P, cx + R + 2, top - 8, 30, 11, (b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic), t, null);
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, cx - R - 4, top - 10, 2 * R + 8, H + 20);
}
function drawGreatTower(g, b, P, t) {
  const M = mats(), cx = b.x, gy = b.y - 4, w = 88, H = 150, D = 16, L = cx - w / 2, Rt = cx + w / 2, top = gy - H;
  softShadow(g, cx + 34, gy + 4, 80, 20, 0.5);
  const side = () => { g.beginPath(); g.moveTo(Rt, gy); g.lineTo(Rt + D, gy - 12); g.lineTo(Rt + D, top - 12); g.lineTo(Rt, top); g.closePath(); };
  fillPath(g, side, M.stone); fillPath(g, side, 'rgba(0,0,0,0.42)');
  const walk = () => { g.beginPath(); g.moveTo(L, top); g.lineTo(Rt, top); g.lineTo(Rt + D, top - 12); g.lineTo(L + D, top - 12); g.closePath(); };
  fillPath(g, walk, M.stoneDark); fillPath(g, walk, 'rgba(255,240,210,0.1)');
  merlons(g, M, L + D + 2, top - 20, 6, 14, 8, 8);
  if (b.done) { drawLookoutArcher(g, P, cx - 16, top - 4, -(b.aim || 1), b.drawT, (b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic), '#c3cad1', null, '#c98d5e'); drawLookoutArcher(g, P, cx + 18, top - 4, b.aim || 1, b.drawT, (b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic), '#c3cad1', null, '#c98d5e'); }
  g.fillStyle = M.stone; g.fillRect(L, top, w, H); lightFace(g, L, top, w, H);
  g.fillStyle = 'rgba(0,0,0,0.12)'; for (let yy = top + 12; yy < gy; yy += 12) g.fillRect(L, yy, w, 1);
  g.fillStyle = M.stoneDark; g.fillRect(L - 2, gy - 12, w + 4, 12);
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(L - 1, top + 3, w + 2, 2);
  merlons(g, M, L + 1, top - 8, 7, 13.2, 8, 8);
  // corner turrets
  for (const tx of [L - 4, Rt - 12]) {
    g.fillStyle = M.stone; g.fillRect(tx, top - 26, 16, H + 14); lightFace(g, tx, top - 26, 16, H + 14);
    g.fillStyle = M.stoneDark; g.fillRect(tx - 2, top - 30, 20, 5);
    merlons(g, M, tx - 1, top - 37, 3, 7, 5, 7);
  }
  g.fillStyle = '#16110c'; for (const [dx, yy] of [[-22, top + 30], [20, top + 30], [-22, top + 74], [20, top + 74], [0, top + 52]]) g.fillRect(cx + dx, yy, 3, 16);
  drawArchDoor(g, M, P, cx, gy, 12, 22);
  drawBanner(g, P, Rt + 6, top - 18, 34, 12, (b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic), t, null);
  mossAt(g, L, gy, w, b.id * 13);
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, L - 6, top - 38, w + D + 12, H + 38);
}
function drawMoat(g, b, P, t) {
  const x = b.x0, y = b.y0, nb = (dc, dr) => structures.some(o => !o.dead && o.kind === 'moat' && o.c === b.c + dc && o.r === b.r + dr);
  const dug = b.done === false ? Math.max(0.1, b.progress) : 1;
  g.fillStyle = '#5e4a30'; g.fillRect(x, y, 32, 32);
  const wg = g.createLinearGradient(x, y, x, y + 32); wg.addColorStop(0, P('#2f5a72')); wg.addColorStop(1, P('#1f4256'));
  g.globalAlpha = dug; g.fillStyle = wg; g.fillRect(x + (nb(-1, 0) ? 0 : 4), y + (nb(0, -1) ? 0 : 4), 32 - (nb(-1, 0) ? 0 : 4) - (nb(1, 0) ? 0 : 4), 32 - (nb(0, -1) ? 0 : 4) - (nb(0, 1) ? 0 : 4));
  g.strokeStyle = 'rgba(200,225,240,0.35)'; g.lineWidth = 1;
  for (let k = 0; k < 2; k++) { const yy = y + 10 + k * 12 + Math.sin(t * 1.5 + b.c + k) * 2; g.beginPath(); g.moveTo(x + 6, yy); g.quadraticCurveTo(x + 16, yy - 3, x + 26, yy); g.stroke(); }
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(0,0,0,0.25)'; if (!nb(0, -1)) g.fillRect(x, y, 32, 4); if (!nb(-1, 0)) g.fillRect(x, y, 4, 32);
}
function drawPit(g, b, P) {
  const x = b.x0, y = b.y0, open = b.sprung > 0 || b.done === false;
  if (open) {
    g.fillStyle = '#2a1e12'; g.beginPath(); g.ellipse(x + 16, y + 18, 13, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = P('#c9b38a'); for (const [sx, sy] of [[9, 20], [14, 16], [19, 21], [23, 17], [16, 23]]) { g.beginPath(); g.moveTo(x + sx - 1.5, y + sy + 3); g.lineTo(x + sx, y + sy - 6); g.lineTo(x + sx + 1.5, y + sy + 3); g.closePath(); g.fill(); }
  } else {   // covered with branches: you can just make it out, the enemy cannot
    g.strokeStyle = 'rgba(110,84,48,0.6)'; g.lineWidth = 1.4;
    for (const [a, l] of [[0.3, 22], [2.1, 20], [1.2, 18], [-0.6, 21]]) { g.beginPath(); g.moveTo(x + 16 - Math.cos(a) * l / 2, y + 18 - Math.sin(a) * l / 4); g.lineTo(x + 16 + Math.cos(a) * l / 2, y + 18 + Math.sin(a) * l / 4); g.stroke(); }
    g.strokeStyle = 'rgba(255,230,150,0.35)'; g.setLineDash([3, 3]); g.strokeRect(x + 3, y + 5, 26, 24); g.setLineDash([]);
  }
  for (let i = 0; i < (b.charges || 0); i++) { g.fillStyle = 'rgba(255,230,150,0.7)'; g.fillRect(x + 6 + i * 5, y + 2, 3, 3); }
}
function drawLookout(g, b, P, t) {
  const M = mats(), cx = b.x, gy = b.y - 6, R = 13, H = 239, top = gy - H;
  softShadow(g, cx + 30, gy + 4, 40, 10, 0.4);
  g.fillStyle = M.stone; g.fillRect(cx - R, top, R * 2, H); lightFace(g, cx - R, top, R * 2, H);
  g.fillStyle = 'rgba(0,0,0,0.13)'; for (let yy = top + 12; yy < gy; yy += 12) g.fillRect(cx - R, yy, R * 2, 1);
  // the stair climbing round the shaft
  g.strokeStyle = '#6b4a28'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= 50; k++) { const yy = gy - k / 50 * (H - 10), xx = cx + Math.sin(k * 0.62) * (R + 3); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
  g.fillStyle = '#5a3c20'; g.fillRect(cx - R - 9, top - 6, R * 2 + 18, 7);
  g.fillStyle = '#6b4a28'; for (let k = 0; k < 6; k++) g.fillRect(cx - R - 8 + k * ((R * 2 + 12) / 5), top - 18, 3, 12);
  const roof = () => { g.beginPath(); g.moveTo(cx - R - 12, top - 18); g.lineTo(cx, top - 44); g.lineTo(cx + R + 12, top - 18); g.closePath(); }; fillPath(g, roof, M.thatch); roof(); g.strokeStyle = 'rgba(30,18,8,0.6)'; g.lineWidth = 1; g.stroke();
  if (b.done) drawLookoutArcher(g, P, cx + 2, top - 5, b.aim || 1, b.drawT, (b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic), '#c3cad1', null, '#c98d5e');
  drawArchDoor(g, M, P, cx, gy + 4, 7, 15);
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, cx - R - 12, top - 44, R * 2 + 24, H + 44);
}
function drawRoundTower(g, b, P, t) {
  const M = mats(), cx = b.x, gy = b.y - 6, R = 46, H = 134, top = gy - H;
  softShadow(g, cx + 34, gy + 4, 70, 18, 0.48);
  const body = () => { g.beginPath(); g.moveTo(cx - R, top); g.lineTo(cx - R, gy); g.ellipse(cx, gy, R, 12, 0, Math.PI, 0, true); g.lineTo(cx + R, top); g.closePath(); };
  fillPath(g, body, M.stone); const sg = g.createLinearGradient(cx - R, 0, cx + R, 0); sg.addColorStop(0, 'rgba(0,0,0,0.2)'); sg.addColorStop(0.35, 'rgba(255,240,210,0.2)'); sg.addColorStop(1, 'rgba(0,0,0,0.55)'); fillPath(g, body, sg);
  g.fillStyle = M.stoneDark; g.beginPath(); g.ellipse(cx, top, R + 5, 14, 0, 0, Math.PI * 2); g.fill();
  for (let k = 0; k < 11; k++) { const a = Math.PI * (0.02 + k * 0.096); towerMerlon(g, M, cx + Math.cos(a) * (R + 2) - 4, top + Math.sin(a) * 13 - 9); }
  if (b.engine) { g.fillStyle = '#6b4a28'; g.fillRect(cx - 14, top - 22, 28, 8); g.strokeStyle = '#4a3018'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 10, top - 18); g.lineTo(cx + (b.engine === 'trebuchet' ? 0 : 22), top - (b.engine === 'trebuchet' ? 52 : 26)); g.stroke(); }
  drawArchDoor(g, M, P, cx, gy + 10, 11, 20);
  drawBanner(g, P, cx + R + 4, top - 10, 34, 12, (b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic), t, null);
  flashOver(g, b.flash > 0 ? b.flash * 0.5 : 0, cx - R - 5, top - 24, R * 2 + 10, H + 34);
}
function drawQuarry(g, b, P) {
  const M = mats(), cx = b.x, gy = b.y - 6;
  softShadow(g, cx + 6, gy + 2, 34, 9, 0.35);
  g.fillStyle = '#4a4640'; g.beginPath(); g.ellipse(cx - 6, gy - 10, 20, 8, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx - 6, gy - 9, 15, 5, 0, 0, Math.PI * 2); g.fill();
  for (const [x, y, w, h] of [[cx + 8, gy - 12, 12, 8], [cx + 18, gy - 12, 10, 8], [cx + 12, gy - 20, 11, 8], [cx - 26, gy - 4, 10, 7]]) { g.fillStyle = M.stone; g.fillRect(x, y, w, h); lightFace(g, x, y, w, h); g.strokeStyle = 'rgba(30,26,20,0.5)'; g.lineWidth = 0.6; g.strokeRect(x, y, w, h); }
  g.strokeStyle = '#6b4a28'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(cx - 20, gy - 8); g.lineTo(cx - 6, gy - 46); g.lineTo(cx + 6, gy - 8); g.moveTo(cx - 6, gy - 46); g.lineTo(cx + 14, gy - 40); g.stroke();
  g.strokeStyle = '#c9b38a'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(cx + 14, gy - 40); g.lineTo(cx + 14, gy - 26); g.stroke();
  g.fillStyle = M.stone; g.fillRect(cx + 10, gy - 26, 8, 6);
}
document.querySelectorAll('.bb[data-b]').forEach(b => b.onclick = () => startPlacing(b.dataset.b));

