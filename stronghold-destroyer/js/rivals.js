'use strict';
// Stronghold Destroyer — raids and tower archers, the enemy camp, Lord Varek.
// Loaded in order by index.html; all files share one global scope.

// ---------- war systems: raids and the tower archer ----------
let raidTimer = 60, raidCount = 0;
const arrows = [], stuckArrows = [], stuckStones = [];
let enemyWallPlan = [], enemyWallT = 20;
function planEnemyWalls() {
  const tiles = [];
  // openings: the back door on the north road, and an east way out to the woods where their people gather
  const gap = ([c, r]) => (r === 7 && (c === 51 + EX || c === 52 + EX)) || (c === 57 + EX && (r === 13 || r === 14));
  for (let c = 45 + EX; c <= 57 + EX; c++) tiles.push([c, 7], [c, 19]);
  for (let r = 8; r <= 18; r++) tiles.push([45 + EX, r], [57 + EX, r]);
  for (let i = tiles.length - 1; i >= 0; i--) if (gap(tiles[i])) tiles.splice(i, 1);
  const cc = 51.5 + EX, cr = 13.5, angOff = ([c, r]) => { const a = Math.atan2(r - cr, c - cc); return Math.abs(Math.atan2(Math.sin(a - Math.PI * 0.85), Math.cos(a - Math.PI * 0.85))); };
  tiles.sort((p, q) => angOff(p) - angOff(q));   // the side facing you goes up first
  enemyWallPlan = tiles;
}
function buildEnemyWalls(n, instant) {
  let made = 0;
  while (made < n && enemyWallPlan.length) {
    const [c, r] = enemyWallPlan.shift();
    if (tileBlocked(c, r)) continue;
    const b = makeBuildingObj('wall', c, r);
    Object.assign(b, { team: 'enemy', name: 'Enemy Wall', maxHp: 400, hp: instant ? 400 : 40, done: !!instant, progress: instant ? 1 : 0, selfBuild: true, buildTime: 5 });
    setBlock(c, r, 1);
    for (const u of units) if (!u.dead && u.x > b.x0 - 6 && u.x < b.x1 + 6 && u.y > b.y0 - 6 && u.y < b.y1 + 6) { const f = nearestFree(Math.floor(u.x / TILE), Math.floor(u.y / TILE)); if (f) { u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; u.path = []; } }
    structures.push(b); made++;
  }
}
// raid routes: waypoints the raiders march through before they hunt your people
function raidRoutes() {
  const k = keep, hx = k.x, hy = k.y;
  return [
    { name: 'along the east road', start: [1905 + EXP, 520], way: [[2250, 610], [1600, 700], [1150, 860]] },
    { name: 'through the northern woods', start: [2440, 230], way: [[2100, 160], [1500, 190], [900, 280], [hx + 60, hy - 420], [hx + 40, hy - 200]] },
    { name: 'through the southern woods', start: [2790, 760], way: [[2700, 1250], [2100, 1500], [1400, 1560], [hx + 420, hy + 380], [hx + 160, hy + 160]] },
    { name: 'round the west, behind your castle', start: [2440, 230], way: [[1900, 140], [1100, 130], [300, 220], [180, hy - 240], [hx - 260, hy + 40]] }
  ];
}
let raidRouteI = 0, n2 = null;
// ---------- the enemy camp: its people gather, carry supplies home, and build up the camp ----------
const DIFFS = {
  easy:   { key: 'easy',   name: 'Easy',   pace: 0.65, raidEvery: 95, size: 0.75, first: 150 },
  medium: { key: 'medium', name: 'Medium', pace: 1.0,  raidEvery: 75, size: 1.0,  first: 90 },
  hard:   { key: 'hard',   name: 'Hard',   pace: 1.3,  raidEvery: 58, size: 1.35, first: 70 }
};
let DIFF = DIFFS.medium;
const ENEMY = { res: 40, built: 0, plan: [], placeT: 6 };
const enemyCamp = () => structures.find(s => s.kind === 'tower' && s.team === 'enemy' && !s.dead);
function planEnemyBase() {
  const E = EX;   // building plan, in order: tiles are inside or just outside the camp walls
  ENEMY.plan = [['woodhut', 46 + E, 15, 30], ['house', 46 + E, 9, 50], ['house', 54 + E, 9, 50], ['granary', 54 + E, 15, 40], ['gtower', 46 + E, 17, 110],
    ['house', 49 + E, 16, 50], ['gtower', 55 + E, 17, 110], ['house', 51 + E, 8, 50], ['stower', 55 + E, 12, 160], ['highwall', 44 + E, 13, 30], ['highwall', 44 + E, 14, 30]];
}
function placeEnemyBuilding(kind, c, r) {
  const d = BUILD[kind];
  for (let i = 0; i < d.w; i++) for (let j = 0; j < d.h; j++) if (tileBlocked(c + i, r + j)) return null;
  const b = makeBuildingObj(kind, c, r);
  Object.assign(b, { team: 'enemy', name: 'Enemy ' + d.name, hp: Math.round(b.maxHp * 0.1) });
  for (let i = 0; i < b.w; i++) for (let j = 0; j < b.h; j++) setBlock(c + i, r + j, 1);
  for (const u of units) if (!u.dead && u.x > b.x0 - 6 && u.x < b.x1 + 6 && u.y > b.y0 - 6 && u.y < b.y1 + 6) { const f = nearestFree(Math.floor(u.x / TILE), Math.floor(u.y / TILE)); if (f) { u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; u.path = []; } }
  structures.push(b); return b;
}
function updateEnemyBase(dt) {
  ENEMY.placeT -= dt;
  if (ENEMY.placeT <= 0 && ENEMY.plan.length && !structures.some(b => b.team === 'enemy' && b.done === false && !b.dead && !b.selfBuild)) {
    ENEMY.placeT = 4;
    const [kind, c, r, cost] = ENEMY.plan[0];
    if (ENEMY.res >= cost) { ENEMY.plan.shift(); ENEMY.res -= cost; placeEnemyBuilding(kind, c, r); }
  }
  // new houses bring new workers, up to a limit
  const houses = structures.filter(b => b.team === 'enemy' && b.kind === 'house' && b.done && !b.dead).length;
  const workers = units.filter(u => u.team === 'enemy' && u.type === 'civ' && !u.dead).length, camp = enemyCamp();
  if (camp && workers < 4 + houses * 2 && Math.random() < dt / 12) { const f = nearestFree(Math.floor((camp.x - 60) / TILE), Math.floor((camp.y + 30) / TILE)); if (f) makeUnit('enemy', 'civ', f.c * TILE + 16, f.r * TILE + 16); }
}
function enemyWorker(u, dt) {
  const camp = enemyCamp();
  if (!camp) { u.order = 'idle'; u.moving = false; u.path = []; return; }
  const walk = (x, y) => {
    // no real progress toward the goal for 6 seconds (stuck in a crowd or a gap): drop this job and choose again
    const d = Math.hypot(x - u.x, y - u.y), key = u.sub + ':' + (u.sub === 'toSite' && u.ejob ? u.ejob.id : u.sub === 'toNode' && u.enode ? Math.round(u.enode.x || 0) + ',' + Math.round(u.enode.y || 0) : '');
    if (u._wk !== key || d < u._wd - 6) { u._wk = key; u._wd = d; u._wt = 0; }
    else if ((u._wt += dt) > 6) { u._wt = 0; u._wd = d;
      if (u.sub === 'toSite' || u.sub === 'toNode') { u._wk = null; if (u.sub === 'toNode') u.ebad = u.enode; u.sub = null; u.ejob = null; u.path = []; u.moving = false; return; }
      u.path = []; u.repath = 0; }   // carrying home or fleeing: look for a fresh way
    if ((!u.path.length && !(u.noPathT > time)) || u.repath <= 0) { u.path = findPath(u.x, u.y, x, y); u.repath = 3; if (!u.path.length) u.noPathT = time + 2; } followPath(u, dt); };
  if (time - u.lastHurt < 3 && u.sub !== 'flee') { u.sub = 'flee'; u.path = []; u.order = 'move'; }
  if (u.sub === 'flee') { const ap = approachPoint(u, camp); if (Math.hypot(u.x - ap.x, u.y - ap.y) < 20 || time - u.lastHurt > 8) { u.sub = null; } else { walk(ap.x, ap.y); return; } }
  if (!u.sub) {
    const site = structures.find(b => b.team === 'enemy' && b.done === false && !b.dead && !b.selfBuild && !units.some(o => o !== u && !o.dead && o.ejob === b));
    if (site) { u.ejob = site; u.sub = 'toSite'; u.order = 'build'; u.path = []; }
    else {
      const wantFood = Math.random() < 0.4, list = wantFood ? bushes.filter(b => b.amount >= 10) : trees.filter(t => !t.gone && t.amount > 0);
      const on = new Map(); for (const o of units) if (o !== u && !o.dead && o.team === 'enemy' && o.enode && (o.sub === 'toNode' || o.sub === 'work')) on.set(o.enode, (on.get(o.enode) || 0) + 1);
      let best = null, bd = 900; for (const n of list) { const k = on.get(n) || 0; if (k >= 3 || n === u.ebad) continue; const c = nodeCenter(n), d = Math.hypot(c.x - camp.x, c.y - camp.y) + Math.random() * 140 + k * 90; if (d < bd) { bd = d; best = n; } }
      if (!best) { u.order = 'idle'; u.moving = false; return; }
      u.enode = best; u.task = { type: wantFood ? 'food' : 'wood', node: best }; u.sub = 'toNode'; u.order = 'gather'; u.path = [];
    }
  }
  if (u.sub === 'toSite') {
    const b = u.ejob; if (!b || b.dead || b.done) { u.sub = null; u.ejob = null; return; }
    if (edgeDist(u, b) <= 12 || stalled(u) && edgeDist(u, b) <= 56) { u.sub = 'work'; u.path = []; u.moving = false; } else { const ap = approachPoint(u, b); walk(ap.x, ap.y); }
    return;
  }
  if (u.sub === 'work' && u.order === 'build') {
    const b = u.ejob; if (!b || b.dead || b.done) { u.sub = null; u.ejob = null; u.order = 'idle'; return; }
    u.moving = false; u.facing = b.x >= u.x ? 1 : -1;
    if (u.attackAnim === 0) u.attackAnim = 0.001;
    b.progress = Math.min(1, b.progress + dt * ePace() / b.buildTime); b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.9 * dt * ePace() / b.buildTime);
    if (b.progress >= 1) { b.done = true; ENEMY.built++; u.sub = null; u.ejob = null; u.order = 'idle'; }
    return;
  }
  if (u.sub === 'toNode') {
    const n = u.enode; if (!n || n.gone || n.amount <= 0) { u.sub = null; return; }
    const c = nodeCenter(n);
    const dn = Math.hypot(c.x - u.x, c.y - u.y);
    if (dn <= nodeReach(n) + 6 || stalled(u) && dn <= nodeReach(n) + 28) { u.sub = 'work'; u.workT = 3.2 / ePace(); u.path = []; u.moving = false; }
    else {
      walk(c.x, c.y);
      // the route ends as close as the ground allows: work from there if it is next to the node, otherwise give it up and choose another
      if (!u.path.length) { if (dn <= nodeReach(n) + 24) { u.sub = 'work'; u.workT = 3.2 / ePace(); u.moving = false; } else { u.ebad = n; u.sub = null; } }
    }
    return;
  }
  if (u.sub === 'work') {
    const n = u.enode; u.moving = false; if (n) u.facing = nodeCenter(n).x >= u.x ? 1 : -1;
    if (u.attackAnim === 0) u.attackAnim = 0.001;
    u.workT -= dt;
    if (u.workT <= 0) {
      if (n && !n.gone) { n.amount -= 10; if (n.kind === 'tree' && n.amount <= 0) fellTree(n); }
      u.carry = 10; u.carryType = u.task && u.task.type === 'food' ? 'food' : 'wood'; u.sub = 'toCamp'; u.path = [];
    }
    return;
  }
  if (u.sub === 'toCamp') {
    const ap = approachPoint(u, camp);
    if (edgeDist(u, camp) <= 16 || Math.hypot(u.x - ap.x, u.y - ap.y) < 14 || stalled(u) && edgeDist(u, camp) <= 36) { ENEMY.res += u.carry; u.carry = 0; u.carryType = null; u.sub = null; u.task = null; }
    else walk(ap.x, ap.y);
  }
}
// ---------- the rival lord: Lord Varek of Ashmoor ----------
const LORD = { name: 'Lord Varek of Ashmoor', unit: null, said: {}, broken: false };
const ePace = () => DIFF.pace * (LORD.broken ? 0.6 : 1);
function lordSay(key, text, delay = 0) {
  if (LORD.said[key]) return; LORD.said[key] = true;
  setTimeout(() => { showBanner(`<b>${LORD.name}:</b> “${text}”`, 4.5); AudioSys.ui('warhorn'); }, delay);
}
function spawnLord() {
  const camp = enemyCamp(); if (!camp) return;
  const f = nearestFree(Math.floor((camp.x - 70) / TILE), Math.floor((camp.y + 70) / TILE)); if (!f) return;
  const u = makeUnit('enemy', 'sword', f.c * TILE + 16, f.r * TILE + 16);
  const hp = { easy: 520, medium: 760, hard: 1000 }[DIFF.key] || 760;
  Object.assign(u, { lord: true, name: LORD.name, hp, maxHp: hp, dmg: 30, speed: 66, radius: 13, pal: PAL.lord, look: { beard: true, longHair: true, w: 1.08, h: 1.0, s: 1.3 }, post: { x: u.x, y: u.y } });
  LORD.unit = u;
}
function lordNear(u, r = 170) { const L = LORD.unit; return L && !L.dead && L !== u && L.team === u.team && Math.hypot(L.x - u.x, L.y - u.y) < r; }
function updateLord() {
  const L = LORD.unit; if (!L || !started) return;
  if (!L.dead && L.hp < L.maxHp * 0.5) lordSay('hurt', 'You have drawn my blood. You will pay for every drop.');
  if (L.dead && !LORD.broken) {
    LORD.broken = true; raidTimer += 180;
    setTimeout(() => showBanner(`<b>${LORD.name} has fallen!</b> The enemy's spirit is broken: no raids for three minutes, and their camp works more slowly.`, 6), 300);
    AudioSys.ui('victory');
  }
}
function spawnRaid() {
  raidCount++;
  const routes = raidRoutes(), grow = Math.min(4, ENEMY.built);
  // the first raids come down the road; after that they come from every side in turn
  const route = raidCount <= 1 ? routes[0] : routes[(1 + raidRouteI++) % (DIFF.key === 'easy' ? 3 : 4)];
  const n = Math.max(1, Math.round(Math.min(3 + grow, 1 + raidCount * 0.7) * DIFF.size));
  for (let i = 0; i < n; i++) {
    const f = nearestFree(Math.floor((route.start[0] + RR(-30, 30)) / TILE), Math.floor((route.start[1] + RR(-30, 30)) / TILE));
    if (!f) continue;
    const kind = raidCount >= 6 && i === 0 ? 'knight' : raidCount >= 4 && i % 4 === 3 ? 'archer' : raidCount >= 5 && i % 5 === 2 ? 'maceman' : i % 2 ? 'spear' : 'sword';
    const u = makeUnit('enemy', kind, f.c * TILE + 16 + RR(-6, 6), f.r * TILE + 16);
    u.raider = true; u.order = 'raid'; u.repath = 0; u.route = route.way.map(([x, y]) => ({ x: x + RR(-30, 30), y: y + RR(-30, 30) }));
  }
  if (raidCount >= 5 && raidCount % 3 === 2) {   // later raids bring a catapult or a ballista along their route
    const kind = raidCount % 2 ? 'catapult' : 'ballista', f = nearestFree(Math.floor(route.start[0] / TILE), Math.floor(route.start[1] / TILE));
    if (f) { const m = makeUnit('enemy', kind, f.c * TILE + 16, f.r * TILE + 16); m.raider = true; m.order = 'raid'; m.route = route.way.map(([x, y]) => ({ x, y })); n2 = kind; }
  }
  const L = LORD.unit;
  if (L && !L.dead && !L.raider && raidCount >= 6 && raidCount % 4 === 2) {
    L.raider = true; L.order = 'raid'; L.repath = 0; L.path = []; L.route = route.way.map(([x, y]) => ({ x, y }));
    lordSay('lead' + raidCount, 'I ride with my men today. Your walls will not save you.', 300); LORD.said['lead' + raidCount] = true;
  }
  const withRam = raidCount >= 3 && raidCount % 2 === 1;
  if (withRam) { const f = nearestFree(Math.floor((1905 + EXP) / TILE), Math.floor(560 / TILE)); if (f) { const r = makeUnit('enemy', 'ram', f.c * TILE + 16, f.r * TILE + 16); r.raider = true; r.order = 'raid'; } }
  AudioSys.ui('warhorn');
  if (n2) { const machine = n2; setTimeout(() => showBanner(`The enemy brings a ${machine}! Guard your walls.`, 3.5), 4600); n2 = null; }
  raidPing = { x: route.way[route.way.length - 1][0], y: route.way[route.way.length - 1][1], t: 0, from: route.name };
  showBanner(withRam ? `Enemy raid with a battering ram! ${n} soldiers and a ram are coming ${route.name}.` : `Enemy raid! ${n} soldiers are coming ${route.name}.`, 4.5);
}
let raidPing = null;
function drawArrow(g, x, y, ang, alpha) {
  g.save(); g.globalAlpha = Math.max(0, alpha); g.translate(x, y); g.rotate(ang);
  g.strokeStyle = '#4a321a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-9, 0); g.lineTo(6, 0); g.stroke();
  g.fillStyle = '#cfd5da'; g.beginPath(); g.moveTo(9, 0); g.lineTo(5, -2); g.lineTo(5, 2); g.closePath(); g.fill();
  g.fillStyle = '#e8e2d2'; g.fillRect(-10, -1.6, 3, 1.2); g.fillRect(-10, 0.4, 3, 1.2);
  g.restore();
}
function updateTraps(dt) {
  for (const b of structures) {
    if (b.kind !== 'pit' || b.dead || b.done === false) continue;
    b.sprung = Math.max(0, b.sprung - dt); b.cool = Math.max(0, b.cool - dt);
    if (b.cool > 0 || b.charges <= 0) continue;
    for (const u of units) {
      if (u.dead || u.team === b.team || u.onWall || u.x < b.x0 + 2 || u.x > b.x1 - 2 || u.y < b.y0 + 2 || u.y > b.y1 + 4) continue;
      const dmg = isMachine(u) ? 120 : 60; u.hp -= dmg; u.flash = 1; u.lastHurt = time;
      for (let k = 0; k < 6; k++) spawn('blood', u.x, u.y - 10, u.y); for (let k = 0; k < 6; k++) spawn('chip', b.x, b.y - 10, b.y);
      AudioSys.play('stab', u.x, u.y); floatText(b.x, b.y - 40, 'Spike pit!', '#ff9d86');
      b.charges--; b.sprung = 2.5; b.cool = 1.2;
      if (u.hp <= 0) kill(u);
      if (b.charges <= 0) { b.dead = true; b.hp = 0; floatText(b.x, b.y - 24, 'Pit collapsed', '#e9dcbc'); }
      break;
    }
  }
}
function updateWar(dt) {
  updateTraps(dt); updateLord(); updateGuards(dt); updateHealth(dt);
  alertCooldown -= dt;
  for (const s of structures) {
    if (s.dead || s.done === false || !s.range) continue;
    if (s.kind === 'tower') { const was = raidTimer; raidTimer -= dt; if (raidCount === 0 && was > 60 && raidTimer <= 60) showBanner('One minute of peace left: the war is about to begin. Ready your defenses!', 4); if (raidTimer <= 0) { if (raidCount === 0) showBanner('The peace is over. The war has begun!', 4); spawnRaid(); raidTimer = DIFF.raidEvery; } enemyWallT -= dt; if (enemyWallT <= 0) { enemyWallT = 20 / ePace(); buildEnemyWalls(2, false); } updateEnemyBase(dt); }
    s.drawT = (s.drawT || 0) - dt;
    s.archerT = (s.archerT === undefined ? 2 : s.archerT) - dt;
    if (s.archerT <= 0) {
      let tgt = null, bd = s.range * weatherRange();
      for (const u of units) if (!u.dead && !u.inside && u.team !== s.team) { const d = Math.hypot(u.x - s.x, u.y - (s.y - 32)); if (d < bd) { bd = d; tgt = u; } }
      if (tgt) {
        s.aim = tgt.x > s.x + 6 ? 1 : -1; s.tx = tgt.x; s.ty = tgt.y; s.drawT = 0.3; s.archerT = s.fireRate;
        const x0 = s.x + 6 + s.aim * 8, y0 = s.y - s.archerY, x1 = tgt.x + RR(-7, 7), y1 = tgt.y - 16 + RR(-4, 4);
        fire({ x0, y0, x1, y1, t: 0, dur: Math.hypot(x1 - x0, y1 - y0) / 430 + 0.12, h: 26, target: tgt, from: s, dmg: s.arrowDmg });
        if (s.shots > 1) {   // a second archer on the great tower picks another foe
          let t2 = tgt, b2 = s.range; for (const u of units) if (!u.dead && u.team !== s.team && u !== tgt) { const d = Math.hypot(u.x - s.x, u.y - (s.y - 32)); if (d < b2) { b2 = d; t2 = u; } }
          const xa = s.x - 6 - s.aim * 8, xb = t2.x + RR(-7, 7), yb = t2.y - 16 + RR(-4, 4);
          fire({ x0: xa, y0, x1: xb, y1: yb, t: -0.15, dur: Math.hypot(xb - xa, yb - y0) / 430 + 0.12, h: 26, target: t2, from: s, dmg: s.arrowDmg });
        }
        AudioSys.play('bow', s.x, s.y - 100);
      } else s.archerT = 0.4;
    }
  }
  for (const s of structures) {
    if (s.dead || s.done === false || !s.engine || s.engineHold || s.team !== 'player') continue;
    s.engineT = (s.engineT === undefined ? 2 : s.engineT) - dt; if (s.engineT > 0) continue;
    const treb = s.engine === 'trebuchet', reach = (treb ? 720 : 460) * weatherRange(); let tgt = null, bd = reach;
    for (const e of enemiesOf(s.team)) { if (treb ? false : e.x0 !== undefined) continue; if (e.kind === 'unit' && e.type === 'civ') continue; const d = Math.hypot(e.x - s.x, e.y - s.y) + (treb && e.x0 !== undefined ? -120 : 0); if (d < bd) { bd = d; tgt = e; } }
    if (!tgt) { s.engineT = 0.6; continue; }
    const c = hitCenter(tgt), x0 = s.x, y0 = s.y - s.topH - 10, dist = Math.hypot(c.x - x0, c.y - y0);
    fire({ kind: treb ? 'stone' : 'bolt', x0, y0, x1: c.x + (treb && tgt.x0 === undefined ? RR(-20, 20) : 0), y1: c.y, t: 0, dur: dist / (treb ? 300 : 620) + (treb ? 0.6 : 0.08), h: treb ? Math.min(260, 80 + dist * 0.35) : 14, target: tgt, from: s, dmg: treb ? 150 : 46 });
    AudioSys.play(treb ? 'boom' : 'bow', s.x, s.y - 100); s.engineT = treb ? 9 : 3.4;
  }
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i]; a.t += dt;
    if (a.t < a.dur) continue;
    arrows.splice(i, 1);
    const t = a.target;
    if (a.kind === 'stone') {   // a catapult stone: crushes what it lands on and everyone close by
      const gy = t && t.x0 !== undefined ? t.y : a.y1 + 21;
      if (alive(t) && t.x0 !== undefined) { t.hp -= isWall(t) ? Math.round(a.dmg * 0.8) : a.dmg; t.flash = 1; t.wobble = 1; if (t.hp <= 0) kill(t); else reactToHit(t, a.from); }
      for (const o of units) { if (o.dead || o.team === (a.from && a.from.team) || o.onWall) continue; const d = Math.hypot(o.x - a.x1, o.y - gy); if (d < 34) { o.hp -= Math.round(a.dmg * 0.55 * (1 - d / 46) * armorMul(o, a.from)); o.flash = 1; o.lastHurt = time; if (o.hp <= 0) kill(o); } }
      for (let k = 0; k < 10; k++) spawn('chip', a.x1, a.y1, gy); for (let k = 0; k < 6; k++) spawn('dust', a.x1 + RR(-16, 16), gy - 4, gy);
      AudioSys.play('stoneHit', a.x1, a.y1); AudioSys.play('boom', a.x1, a.y1); stuckStones.push({ x: a.x1 + RR(-6, 6), y: gy + 2, t: 0 });
      continue;
    }
    if (a.kind === 'bolt' && alive(t) && (t.x0 !== undefined || Math.hypot(t.x - a.x1, t.y - 16 - a.y1) < 24)) {
      t.hp -= isWall(t) ? Math.max(1, Math.round(a.dmg * 0.25)) : t.x0 !== undefined ? Math.round(a.dmg * 0.5) : t.onWall ? Math.round(a.dmg * 0.7) : a.dmg; t.flash = 1; t.lastHurt = time;
      AudioSys.play('thunk', t.x, t.y - 16);
      if (t.x0 === undefined) for (let k = 0; k < 4; k++) spawn('blood', t.x, t.y - 18, t.y); else for (let k = 0; k < 4; k++) spawn('chip', a.x1, a.y1, t.y);
      if (t.hp <= 0) kill(t); else reactToHit(t, a.from);
      continue;
    }
    if (a.kind === 'bolt') { stuckArrows.push({ x: a.x1, y: a.y1 + 12, ang: Math.atan2(a.y1 - a.y0, a.x1 - a.x0) * 0.3 + 0.9, t: 0, bolt: true }); continue; }
    if (alive(t) && t.kind === 'moat') continue;
    if (alive(t) && (t.x0 !== undefined || Math.hypot(t.x - a.x1, t.y - 16 - a.y1) < 18)) {
      t.hp -= isWall(t) ? Math.max(1, Math.round(a.dmg * WALL_RESIST)) : Math.round((t.onWall ? a.dmg * 0.5 : a.dmg) * armorMul(t, a.from)); t.flash = 1; t.lastHurt = time;
      AudioSys.play('thunk', t.x, t.y - 16); AudioSys.combat(t.x, t.y);
      if (t.x0 !== undefined) for (let k = 0; k < 4; k++) spawn('chip', a.x1, a.y1, t.y);
      else for (let k = 0; k < 3; k++) spawn('blood', t.x, t.y - 18, t.y);
      if (t.hp <= 0) kill(t);
      else reactToHit(t, a.from);
    } else stuckArrows.push({ x: a.x1, y: a.y1 + 12, ang: Math.atan2(a.y1 - a.y0, a.x1 - a.x0) * 0.3 + 0.9, t: 0 });
  }
  for (let i = stuckArrows.length - 1; i >= 0; i--) { stuckArrows[i].t += dt; if (stuckArrows[i].t > 6) stuckArrows.splice(i, 1); }
  for (let i = stuckStones.length - 1; i >= 0; i--) { stuckStones[i].t += dt; if (stuckStones[i].t > 20) stuckStones.splice(i, 1); }
}

