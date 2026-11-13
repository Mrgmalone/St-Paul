'use strict';
// Stronghold Destroyer — orders, how each unit thinks and moves, civilians.
// Loaded in order by index.html; all files share one global scope.

// ---------- commands ----------
function formationSlots(n, x, y) {
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), sp = 33, slots = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const rowCount = r === rows - 1 ? n - r * cols : cols;
    let sx = x + (c - (rowCount - 1) / 2) * sp, sy = y + (r - (rows - 1) / 2) * sp;
    sx = clamp(sx, 20, MW - 20); sy = clamp(sy, 20, MH - 20);
    if (circleBlocked(sx, sy, 9)) { const f = nearestFree(Math.floor(sx / TILE), Math.floor(sy / TILE)); if (f) { sx = f.c * TILE + 16; sy = f.r * TILE + 16; } }
    slots.push({ x: sx, y: sy });
  }
  return slots;
}
function commandMove(list, x, y) {
  if (!list.length) return;
  const slots = formationSlots(list.length, x, y), free = list.slice();
  // greedy: each slot takes the closest remaining unit
  for (const s of slots) {
    let bi = 0, bd = 1e12;
    free.forEach((u, i) => { const d = (u.x - s.x) ** 2 + (u.y - s.y) ** 2; if (d < bd) { bd = d; bi = i; } });
    const u = free.splice(bi, 1)[0];
    if (u.onWall) dismount(u);
    u.order = 'move'; u.target = null; u.dest = s; u.stuckT = 0; u.bestD = undefined; u.rerouted = false; u.progT = 0; if (u.type === 'civ') u.task = null;
    u.path = findPath(u.x, u.y, s.x, s.y);
  }
  markers.push({ x, y, t: 0, col: '120,255,140' });
}
function commandGather(list, node) {
  const type = node.kind === 'rock' ? 'stone' : node.kind === 'tree' ? 'wood' : node.kind === 'hopfarm' ? 'hops' : node.kind === 'wheatfarm' ? 'wheat' : 'food';
  for (const u of list) { u.order = 'gather'; u.task = { type, node }; u.sub = (u.carry > 0 && u.carryType !== type) ? 'toKeep' : 'toNode'; u.path = []; u.repath = 0; u.bad.clear(); }
  markers.push({ x: node.x, y: node.y, t: 0, col: '255,220,90' });
}
function commandBuild(list, b) {
  for (const u of list) { u.order = 'build'; u.buildTarget = b; u.task = null; u.sub = 'go'; u.path = []; u.repath = 0; }
  markers.push({ x: b.x, y: b.y - 6, t: 0, col: '255,220,90' });
}
function commandDeposit(list) {
  for (const u of list) { if (u.carry <= 0) continue; if (!u.task) u.task = { type: u.carryType, node: null }; u.order = 'gather'; u.sub = 'toKeep'; u.path = []; u.repath = 0; }
}
// archers can climb onto your walls and towers: farther shots, half damage from arrows, out of reach of blades
const WALL_INFO = { wall: { posts: 2, e2: 30, e3: 31.5, rng: 1.35 }, gtower: { posts: 4, e2: 92, e3: 96, rng: 1.35 }, highwall: { posts: 2, e2: 88, e3: 97, rng: 1.5 },
  stower: { posts: 5, e2: 128, e3: 141, rng: 1.55 }, lookout: { posts: 3, e2: 239, e3: 255, rng: 1.8 }, roundtower: { posts: 6, e2: 136, e3: 150, rng: 1.6 }, greattower: { posts: 8, e2: 150, e3: 166, rng: 1.65 }, keep: { posts: 1, e2: 112, e3: 60, rng: 1 } };
const WALL_POSTS = Object.fromEntries(Object.entries(WALL_INFO).map(([k, v]) => [k, v.posts]));
const elev2D = u => u.onWall ? WALL_INFO[u.onWall.kind].e2 : 0;
const elev3D = u => u.onWall ? WALL_INFO[u.onWall.kind].e3 : 0;
const rangeOf = u => (u.onWall ? u.range * WALL_INFO[u.onWall.kind].rng : u.range) * (u.range > 40 ? weatherRange() : 1);
// a high wall can only be climbed from stairs beside it, or from a tower joined to the same stretch of wall
function structAt(c, r) { for (const o of structures) if (!o.dead && o.team === 'player' && c >= o.c && c < o.c + o.w && r >= o.r && r < o.r + o.h) return o; return null; }
function wallAccess(b) {
  if (!b || b.kind !== 'highwall') return b;
  const seen = new Set([b.id]), q = [b];
  while (q.length) {
    const w = q.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const o = structAt(w.c + dc, w.r + dr); if (!o || seen.has(o.id)) continue; seen.add(o.id);
      if (o.done === false) continue;
      if (o.kind === 'stairs' || o.kind === 'stower' || o.kind === 'greattower' || o.kind === 'gtower') return o;
      if (o.kind === 'highwall' && q.length < 400) q.push(o);
    }
  }
  return null;
}
const canMount = b => b && !b.dead && b.team === 'player' && b.done !== false && WALL_POSTS[b.kind];
function postsFree(b) { return WALL_POSTS[b.kind] - units.filter(o => !o.dead && o.onWall === b).length; }
function commandMount(list, b) {
  if (b.kind === 'highwall' && !wallAccess(b)) { showBanner('Build Stairs beside this High Wall (Castle tab) so archers can climb it.', 3.5); return; }
  for (const u of list) { if (u.onWall) dismount(u); u.order = 'mount'; u.mountTarget = b; u.target = null; u.path = []; u.repath = 0; }
  markers.push({ x: b.x, y: b.y, t: 0, col: '120,200,255' });
}
function mountOn(u, b) {
  let post = canMount(b) && postsFree(b) > 0 ? b : null;
  if (!post || post.kind === 'keep') { post = null; let bd = 220; for (const o of structures) if (canMount(o) && o.kind !== 'keep' && postsFree(o) > 0 && wallAccess(o)) { const d = edgeDist(u, o); if (d < bd) { bd = d; post = o; } } }
  if (!post) { u.order = 'idle'; return; }
  const k = WALL_POSTS[post.kind] - postsFree(post), cx = (post.x0 + post.x1) / 2, cy = (post.y0 + post.y1) / 2;
  const off = post.kind === 'lookout' ? [[-8, -4], [8, -4], [0, 8]][k] : post.kind === 'roundtower' ? [Math.cos(k * 1.05) * 28, Math.sin(k * 1.05) * 18 + 2] : post.kind === 'gtower' ? [[-9, -6], [9, -6], [-9, 8], [9, 8]][k] : post.kind === 'stower' ? [Math.cos(k * 1.256 + 0.6) * 15, Math.sin(k * 1.256 + 0.6) * 9 + 2]
    : post.kind === 'greattower' ? [[-28, -22], [0, -22], [28, -22], [-28, 0], [28, 0], [-28, 22], [0, 22], [28, 22]][k] : [[-7, 2], [7, 2]][k];
  u.onWall = post; u.x = cx + off[0]; u.y = cy + off[1]; u.order = 'idle'; u.path = []; u.moving = false;
  floatText(u.x, u.y - 60, 'On the wall', '#9fd8ff');
}
function dismount(u) {
  if (!u.onWall) return;
  const f = nearestFree(Math.floor(u.x / TILE), Math.floor((u.y + 20) / TILE));
  u.onWall = null; if (f) { u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; }
}
function mountStep(u, dt) {
  const b = u.mountTarget;
  if (!canMount(b)) { u.order = 'idle'; return; }
  const via = wallAccess(b); if (!via) { u.order = 'idle'; return; }
  if (edgeDist(u, via) <= 10 || stalled(u) && edgeDist(u, via) <= 30) { mountOn(u, b); return; }
  // no headway toward the way up for 5 seconds (trees or buildings round its door): give up, and the tower is
  // left out of the automatic archer posting for half a minute
  { const d = edgeDist(u, via); if (u._mk !== b.id || d < u._md - 6) { u._mk = b.id; u._md = d; u._mt = 0; } else if ((u._mt += dt) > 5) { u._mk = null; b.noMountUntil = time + 30; u.order = 'idle'; u.path = []; u.moving = false; return; } }
  if (!u.path.length || u.repath <= 0) { const ap = approachPoint(u, via); u.path = findPath(u.x, u.y, ap.x, ap.y); u.repath = 1.5; }
  followPath(u, dt);
}
function commandAttack(list, t) {
  for (const u of list) { if (u.onWall && edgeDist(u, t) > rangeOf(u) + 2) dismount(u); u.order = 'attack'; u.target = t; u.path = []; u.repath = 0; }
  markers.push({ x: t.x, y: t.y, t: 0, col: '255,90,70', target: t });
}
function commandStop(list) { for (const u of list) { if (u.type === 'civ') { u.job = null; u.manualT = time; } u.order = 'idle'; u.target = null; u.path = []; u.moving = false; } }

// ---------- unit update ----------
// blocked by the crowd for a while: callers then accept 'close enough' to where they were going
const stalled = u => u.stT !== undefined && time - u.stT > 1.5;
function followPath(u, dt) {
  if (u.stT === undefined || Math.hypot(u.x - u.stX, u.y - u.stY) > 4) { u.stX = u.x; u.stY = u.y; u.stT = time; }
  if (!u.path.length) { u.moving = false; return; }
  const wp = u.path[0], dx = wp.x - u.x, dy = wp.y - u.y, d = Math.hypot(dx, dy), step = u.speed * dt * weatherSpeed() * (u.sick ? 0.72 : 1) * (1 - 0.18 * (u.fat || 0));
  if (d <= Math.max(step, 2.5)) {
    if (!circleBlocked(wp.x, wp.y, Math.min(7, u.radius * 0.8))) { u.x = wp.x; u.y = wp.y; }
    u.path.shift();
    if (!u.path.length) { u.moving = false; return; }
  } else {
    moveBy(u, dx / d * step, dy / d * step);
    if (Math.abs(dx) > 0.6) u.facing = dx > 0 ? 1 : -1;
    // pressed against a building (one put up after the way was planned, or a waypoint hard by a wall): find another way, or call it arrived
    if (u.fpT === undefined || u.fpW !== wp || d < u.fpD - 2) { if (u.fpW !== wp) u.fpN = 0; u.fpW = wp; u.fpD = d; u.fpT = time; }
    else if (time - u.fpT > 1.2) {
      u.fpT = time; u.fpN = (u.fpN || 0) + 1;
      const end = u.path[u.path.length - 1];
      if (u.path.length === 1 && d < 26) { u.path.shift(); u.moving = false; return; }
      if (u.fpN >= 3) u.path.shift();   // that point cannot be reached: skip it
      else { const np = findPath(u.x, u.y, end.x, end.y); if (np && np.length) u.path = np; else u.path.shift(); }
      if (!u.path.length) { u.moving = false; return; }
    }
  }
  u.moving = true;
  u.walkPhase += dt * u.speed * 0.17;
  if (Math.random() < dt * 3) spawn('dust', u.x + RR(-4, 4), u.y);
}
// newcomers walk in along the west road, at the first clear spot (never inside a tree)
function roadEntry() {
  curTeam = 'player';
  for (let dx = 0; dx < 200; dx += 8) for (const dy of [0, -12, 12, -24, 24, -36, 36]) { const x = 26 + dx, y = 1092 + dy; if (!circleBlocked(x, y, 10)) return { x, y }; }
  return { x: 60, y: 1092 };
}
function moveBy(u, mx, my) {
  curTeam = u.team;
  const r = Math.min(7, u.radius * 0.8), trapped = blockedAt(u.x, u.y);   // the same width the route planner allows, so a planned route always fits   // someone standing right inside a tree or a wall may always step out
  // someone whose edge already overlaps a wall or building (a wall raised beside them) may slide free, as long as the centre stays clear
  const edging = !trapped && circleBlocked(u.x, u.y, r);
  if (trapped || !circleBlocked(u.x + mx, u.y, r) || edging && !blockedAt(u.x + mx, u.y)) u.x += mx;
  if (trapped || !circleBlocked(u.x, u.y + my, r) || edging && !blockedAt(u.x, u.y + my)) u.y += my;
  u.x = clamp(u.x, 10, MW - 10); u.y = clamp(u.y, 10, MH - 10);
}
function aggro(u, r) {
  if (r > 0 && u.sight > r) r = u.sight;   // Psychana sees farther
  let best = null, bd = r;
  for (const o of nearUnits(u.x, u.y, r + 40)) { if (o.dead || o.inside || !hostile(u.team, o.team) || hiddenFrom(o, u.team) || (o.onWall && u.type !== 'archer')) continue; const d = edgeDist(u, o); if (d < bd) { bd = d; best = o; } }
  return best;
}
function sendHome(u) { u.order = 'return'; u.target = null; u.dest = u.post; u.stuckT = 0; u._pd = null; u.path = findPath(u.x, u.y, u.post.x, u.post.y); }
function attackStep(u, dt) {
  // breaking through a wall: every second, check whether a way to the real target has opened
  if (u.goal && isWall(u.target) && alive(u.goal)) {
    u.goalCheck = (u.goalCheck || 0) - dt;
    if (u.goalCheck <= 0) {
      u.goalCheck = 1;
      const ap = approachPoint(u, u.goal), pth = findPath(u.x, u.y, ap.x, ap.y), end = pth.length ? pth[pth.length - 1] : u;
      if (Math.hypot(end.x - ap.x, end.y - ap.y) <= 40) { u.target = u.goal; u.goal = null; u.path = pth; u.repath = 0.5; }
    }
  }
  const t = u.target, ed = edgeDist(u, t);
  if (u.onWall && ed > rangeOf(u) + 2) { u.order = 'idle'; u.target = null; u.path = []; return; }   // archers on a wall hold their post
  if (ed <= rangeOf(u) + 2) {
    u.path = []; u.moving = false;
    u.facing = t.x > u.x ? 1 : -1;
    if (u.atkTimer <= 0 && u.attackAnim === 0) { u.attackAnim = 0.001; u.atkTimer = u.cd; }
    u.combatT = 2.5;
  } else {
    if (u.repath <= 0 || !u.path.length) {
      const ap = approachPoint(u, t);
      u.path = findPath(u.x, u.y, ap.x, ap.y);
      u.repath = 0.5;
      if (!isWall(t)) { // walled off from the target: hammer the nearest wall of the other side instead
        const end = u.path.length ? u.path[u.path.length - 1] : u;
        if (Math.hypot(end.x - ap.x, end.y - ap.y) > 40) {
          let wb = null, wd = 200;
          for (const b of structures) if (!b.dead && hostile(b.team, u.team) && isWall(b) && !(b.kind === 'moat' && isMachine(u))) { const d = edgeDist(u, b); if (d < wd) { wd = d; wb = b; } }
          if (wb) { if (!u.goal) u.goal = t; u.target = wb; u.path = []; u.repath = 0; return; }
        }
      }
    }
    followPath(u, dt);
  }
}
const nearestFoeBuilding = (u, maxD) => { let best = null, bd = maxD; for (const b of structures) if (!b.dead && hostile(b.team, u.team) && b.done !== false && b.kind !== 'pit' && b.kind !== 'moat') { const d = edgeDist(u, b); if (d < bd) { bd = d; best = b; } } return best; };
function ramBrain(u) {
  if (u.order === 'attack' && (!alive(u.target) || u.target.x0 === undefined)) {
    const n = nearestFoeBuilding(u, u.team === 'player' ? 220 : 1e9);
    if (n) { u.target = n; u.repath = 0; } else { u.order = 'idle'; u.target = null; u.path = []; }
  }
  if (u.order === 'idle' || u.order === 'raid') {
    u.moving = false;
    const n = nearestFoeBuilding(u, u.team === 'player' ? 150 : 1e9);
    if (n) { u.order = 'attack'; u.target = n; u.repath = 0; }
  }
}
// catapults look for walls and buildings first; ballistas look for soldiers first
function siegeTarget(u, reach) {
  const wantB = u.type === 'catapult' || u.type === 'trebuchet';
  let b = null, bd = reach, m = null, md = reach;
  for (const e of enemiesOf(u.team)) { if (e.onWall && (u.type === 'catapult' || u.type === 'trebuchet')) continue; const d = edgeDist(u, e); if (e.x0 !== undefined) { if (e.done !== false && d < bd) { bd = d; b = e; } } else if (d < md) { md = d; m = e; } }
  return wantB ? (b || m) : (m || b);
}
function siegeBrain(u) {
  if (u.holdFire) { if (u.order === 'attack') { u.order = 'idle'; u.target = null; } u.moving = u.order === 'move'; return true; }
  if (u.order === 'attack' && !alive(u.target)) { u.target = null; u.order = u.raider ? 'raid' : 'idle'; u.path = []; }
  if (u.order === 'idle' || (u.order === 'raid' && !(u.route && u.route.length))) {
    const t = siegeTarget(u, u.team === 'player' ? u.range + 10 : u.range + 60);
    if (t) { u.order = 'attack'; u.target = t; u.repath = 0; u.moving = false; return true; }
    if (u.order === 'raid') { const k = playerKeep();
      // no headway toward your keep for 4 seconds (hemmed in by its own camp, say): a nudge and a fresh way; after two tries it stays and guards where it is
      if (k) { const ap = approachPoint(u, k), d = Math.hypot(ap.x - u.x, ap.y - u.y);
        if (u._sd === undefined || d < u._sd - 8) { u._sd = d; u._st = 0; }
        else if ((u._st += frameDt) > 4) { u._st = 0; u._sd = d; u._tries = (u._tries || 0) + 1;
          if (u._tries >= 2) { u.order = 'idle'; u.raider = false; u.path = []; u.moving = false; return true; }
          const a = Math.random() * Math.PI * 2; moveBy(u, Math.cos(a) * 9, Math.sin(a) * 9); u.path = []; u.repath = 0; } }
      if (k && (!u.path.length || u.repath <= 0)) { const ap = approachPoint(u, k); u.path = findPath(u.x, u.y, ap.x, ap.y); u.repath = 3; } return false; }
    u.moving = false; return true;
  }
  return false;
}
// the ox cart: waits at its quarry while the stone is cut, then hauls the load to your nearest store
function cartBrain(u, dt) {
  const q = u.home; u.order = 'cart';
  if (!q || q.dead) { u.moving = false; return; }
  const walk = (x, y) => { if ((!u.path.length && !(u.noPathT > time)) || u.repath <= 0) { u.path = findPath(u.x, u.y, x, y); u.repath = 3; if (!u.path.length) u.noPathT = time + 2; } followPath(u, dt); };
  if (u.sub === 'haul') {
    const drop = nearestDrop(u, 'stone'); if (!drop) { u.moving = false; return; }
    if (edgeDist(u, drop) <= 14) { q.produced = (q.produced || 0) + u.carry; res.stone += u.carry; floatText(u.x, u.y - 60, `+${u.carry} stone`, '#e0c088'); u.carry = 0; u.carryType = null; u.sub = 'back'; u.path = []; return; }
    const ap = approachPoint(u, drop); walk(ap.x, ap.y); return;
  }
  if (edgeDist(u, q) > 20) { const ap = approachPoint(u, q); walk(ap.x, ap.y); return; }
  u.moving = false; u.path = [];
  if ((q.stock || 0) >= 8) { const n = Math.min(q.stock, 24); q.stock -= n; u.carry = n; u.carryType = 'stone'; u.sub = 'haul'; u.path = []; }
}
function playerBrain(u) {
  if (u.type === 'oxcart') { cartBrain(u, frameDt); return; }
  if (u.type === 'ram') { ramBrain(u); return; }
  if (u.type === 'catapult' || u.type === 'ballista' || u.type === 'trebuchet') { siegeBrain(u); return; }
  if (u.type === 'king') { kingBrain(u); return; }
  if (u.guardOf && time - (u.cmdT || -99) >= 30 && guardPost(u)) return;
  if (u.order === 'attack' && !alive(u.target)) {
    const n = nearestEnemy(u, 170);
    if (n) { u.target = n; u.repath = 0; } else { u.order = 'idle'; u.target = null; u.path = []; }
  }
  if (u.order === 'idle') {
    u.moving = false;
    const n = nearestEnemy(u, Math.max(u.onWall ? 0 : 110, rangeOf(u) + 20));
    if (n) { u.order = 'attack'; u.target = n; u.repath = 0; }
  }
}
function enemyBrain(u, dt) {
  if (u.rogue) { rogueBrain(u, dt); return; }   // bandits: steal and run
  u.think -= dt;
  if (u.type === 'civ') { enemyWorker(u, dt); return; }
  if (u.type === 'ram') { ramBrain(u); return; }
  if ((u.type === 'catapult' || u.type === 'ballista' || u.type === 'trebuchet') && !(u.order === 'raid' && u.route && u.route.length)) { siegeBrain(u); return; }
  if (u.order === 'attack' && !alive(u.target)) {
    const n = aggro(u, 170);
    if (n) { u.target = n; u.repath = 0; }
    else if (u.raider) { u.order = 'raid'; u.target = null; u.path = []; u.repath = 0; }
    else sendHome(u);
  }
  // guards will not chase forever: past their leash they go back to their post
  if (!u.raider && u.order === 'attack' && Math.hypot(u.x - u.post.x, u.y - u.post.y) > 380) sendHome(u);
  if ((u.order === 'idle' || u.order === 'raid') && u.think <= 0) {
    u.think = 0.3;
    const n = aggro(u, u.raider ? 190 : 150);
    if (n) { u.order = 'attack'; u.target = n; u.repath = 0; alertAllies(u, n, 230); }
  }
  if (u.order === 'raid' && u.route && u.route.length) {
    const w = u.route[0];
    if (u.chopTree) {   // cutting a way through the woods
      u.moving = false; u.facing = u.chopTree.x >= u.x ? 1 : -1; if (u.attackAnim === 0 && !isMachine(u)) u.attackAnim = 0.001;
      u.chopT -= dt; if (u.chopT <= 0) { if (!u.chopTree.gone) fellTree(u.chopTree); u.chopTree = null; u.path = []; u.repath = 0; }
      return;
    }
    const movedSq = (u.x - (u.rlx || 0)) ** 2 + (u.y - (u.rly || 0)) ** 2; u.rlx = u.x; u.rly = u.y; u.rstuck = movedSq < 0.05 ? (u.rstuck || 0) + dt : 0;
    if (u.rstuck > (isMachine(u) ? 3 : 1.6) && u.type !== 'ram') { let best = null, bd = isMachine(u) ? 64 : 46; for (const t of trees) { if (t.gone) continue; const d = Math.hypot(t.x - u.x, t.y - u.y); if (d < bd && ((t.x - u.x) * (w.x - u.x) + (t.y - u.y) * (w.y - u.y)) > 0) { bd = d; best = t; } } if (best) { u.chopTree = best; u.chopT = 3.5; u.rstuck = 0; return; } }
    // jostling in a crowd keeps the 'standing still' timer above from ever running out, so also watch real headway
    // toward this way-point: 3 seconds with none, cut a tree in the way if there is one, otherwise go on to the next way-point
    { const d = Math.hypot(w.x - u.x, w.y - u.y); if (u._rw !== w || d < u._rd - 6) { u._rw = w; u._rd = d; u._rt = 0; }
      else if ((u._rt += dt) > 3) { u._rt = 0; u._rd = d; let best = null, bd = isMachine(u) ? 70 : 52; if (u.type !== 'ram') for (const t of trees) { if (t.gone) continue; const dd = Math.hypot(t.x - u.x, t.y - u.y); if (dd < bd && ((t.x - u.x) * (w.x - u.x) + (t.y - u.y) * (w.y - u.y)) > 0) { bd = dd; best = t; } }
        if (best) { u.chopTree = best; u.chopT = isMachine(u) ? 2.5 : 3.5; u.path = []; return; } u.route.shift(); u.path = []; u.repath = 0; return; } }
    if (Math.hypot(w.x - u.x, w.y - u.y) < 70) { u.route.shift(); u.path = []; u.repath = 0; }
    else if (u.repath <= 0 || !u.path.length) { u.path = findPath(u.x, u.y, w.x, w.y); u.repath = 4; if (!u.path.length) u.route.shift(); }
    return;
  }
  if (u.order === 'raid' && (u.repath <= 0 || !u.path.length)) {
    // raiders hunt the nearest of your people, or your keep
    let prey = null, bd = 1e9;
    for (const o of units) if (!o.dead && o.team === 'player' && !o.onWall) { const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < bd) { bd = d; prey = o; } }
    const k = playerKeep();
    if (k && edgeDist(u, k) < bd) { prey = k; bd = edgeDist(u, k); }
    if (prey && prey.kind === 'keep' && bd < 30) { u.order = 'attack'; u.target = k; u.repath = 0; }
    else if (prey) {
      const ap = prey.kind === 'keep' ? approachPoint(u, prey) : prey;
      u.path = findPath(u.x, u.y, ap.x, ap.y); u.repath = 2;
      const end = u.path.length ? u.path[u.path.length - 1] : u;
      if (Math.hypot(end.x - ap.x, end.y - ap.y) > 50) { // walled off: smash the nearest building in the way
        let wb = null, wd = 1e9;
        for (const b of structures) if (!b.dead && b.team === 'player' && b.kind !== 'keep' && b.kind !== 'pit' && !(b.kind === 'moat' && isMachine(u))) { const d = edgeDist(u, b); if (d < wd) { wd = d; wb = b; } }
        if (wb) { u.order = 'attack'; u.target = wb; u.repath = 0; }
      }
    }
  }
  // a raider battering the keep turns on soldiers who come at it
  if (u.order === 'attack' && u.target && u.target.x0 !== undefined && u.think <= 0) {
    u.think = 0.3; const n = aggro(u, 90); if (n) { u.target = n; u.repath = 0; }
  }
  if (u.order === 'idle') u.moving = false;
}
// ---------- civilians ----------
function isField(k) { return k === 'farm' || k === 'hopfarm' || k === 'wheatfarm'; }
// the gear a civilian carries: picked up when the job is given, carried there, used, and loaded for the walk home
function gearOf(u) {
  if (u.order === 'build') return 'build';
  const t = u.task ? u.task.type : u.carry > 0 ? u.carryType : null;
  if (u.order === 'craft' && u.job) return u.job.kind === 'quarry' || u.job.kind === 'ironmine' ? 'stone' : 'build';
  if (t === 'wood') return 'wood'; if (t === 'food') return 'food'; if (t === 'stone' || t === 'iron') return 'stone'; if (t === 'hops' || t === 'wheat') return 'grain';
  return null;
}
const nodeCenter = n => isField(n.kind) ? { x: (n.x0 + n.x1) / 2, y: (n.y0 + n.y1) / 2 } : n.kind === 'tree' ? { x: n.c * TILE + 16, y: n.r * TILE + 16 } : n.kind === 'rock' ? { x: Math.floor(n.x / TILE) * TILE + 16, y: Math.floor((n.y - 6) / TILE) * TILE + 16 } : { x: n.x, y: n.y };
const nodeReach = n => isField(n.kind) ? 30 : n.kind === 'tree' ? 33 : n.kind === 'rock' ? 30 : 24;
const nodeOk = (n, type) => n && !n.gone && n.done !== false && (type === 'wood' || type === 'stone' ? n.amount > 0 : n.amount >= 1);
function nearestNode(type, x, y, maxD, bad) {
  const list = type === 'stone' ? rocks.filter(r => !r.iron && !r.gone) : type === 'wood' ? trees : type === 'hops' ? farms.filter(f => f.kind === 'hopfarm' && f.team === 'player') : type === 'wheat' ? farms.filter(f => f.kind === 'wheatfarm' && f.team === 'player') : bushes.concat(farms.filter(f => f.kind === 'farm' && f.team === 'player'));   // your own fields, never a rival's
  let best = null, bd = maxD;
  for (const n of list) { if (!nodeOk(n, type) || (bad && bad.has(n)) || n.unreachT > time) continue; const c = nodeCenter(n), d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = n; } }
  return best;
}
function breakRock(r) {
  r.gone = true; r.amount = 0; setBlock(Math.floor(r.x / TILE), Math.floor((r.y - 6) / TILE), 0);
  for (let k = 0; k < 16; k++) spawn('chip', r.x + RR(-10, 10), r.y - RR(4, 18), r.y); floatText(r.x, r.y - 30, 'Rock quarried away', '#e9dcbc');
}
function fellTree(t) {
  t.gone = true; setBlock(t.c, t.r, 0);
  const i = trees.indexOf(t); if (i >= 0) trees.splice(i, 1);
  stumps.push({ x: t.x, y: t.y - 4, s: t.s });
  for (let k = 0; k < 14; k++) spawn('chip', t.x + RR(-10, 10), t.y - RR(5, 30), t.y);
}
const floats = [];
function floatText(x, y, text, col) { floats.push({ x, y, text, col, t: 0 }); }
function civBrain(u, dt) {
  if (u.order === 'craft') { craftBrain(u, dt); return; }
  const k = playerKeep();
  if (u.order === 'leave') {
    if (!u.path.length) { u.dead = true; u.deathT = 99; selection.delete(u); } else followPath(u, dt);
    return;
  }
  if (u.order === 'flee') {
    if (!k || !u.path.length || edgeDist(u, k) < 14) { u.path = []; if (u.task) { u.order = 'gather'; u.sub = u.carry > 0 ? 'toKeep' : 'toNode'; } else u.order = 'idle'; }
    else followPath(u, dt);
    return;
  }
  if (u.order === 'build') {
    let b = u.buildTarget;
    if (!b || b.dead || b.done) { b = u.buildTarget = nearestFoundation(u, 700); u.path = []; if (!b) { u.order = 'idle'; u.sub = null; u.moving = false; return; } }
    if (edgeDist(u, b) <= 12 || stalled(u) && edgeDist(u, b) <= 32) {
      u.sub = 'work'; u.path = []; u.moving = false; u.facing = b.x >= u.x ? 1 : -1;
      if (u.attackAnim === 0) { u.attackAnim = 0.001; AudioSys.play('hammer', u.x, u.y); }
      const dp = dt * workMul() * fatWork(u) / b.buildTime; b.progress = Math.min(1, b.progress + dp); b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.9 * dp);
      if (b.progress >= 1) finishBuilding(b);
    } else {
      u.sub = 'go';
      if (!u.path.length || u.repath <= 0) { const ap = approachPoint(u, b); u.path = findPath(u.x, u.y, ap.x, ap.y); u.repath = 3; }
      followPath(u, dt);
    }
    return;
  }
  if (u.order !== 'gather') { if (u.order === 'idle') u.moving = false; return; }
  const task = u.task;
  if (u.sub !== 'toKeep' && u.carry >= CIV.carry) { u.sub = 'toKeep'; u.path = []; }
  if (u.sub === 'toNode' || u.sub === 'work') {
    if (!nodeOk(task.node, task.type) && !(task.type === 'food' && task.node && u.sub === 'work')) {
      const n = u.job && isField(u.job.kind) && !u.job.dead ? u.job : nearestNode(task.type, u.job ? u.job.x : u.x, u.job ? u.job.y : u.y, u.job ? 460 : 500, u.bad);
      if (!n) { if (u.carry > 0) { u.sub = 'toKeep'; u.path = []; } else { u.order = 'idle'; u.task = null; u.moving = false; return; } }
      else if (n !== task.node) { task.node = n; u.sub = 'toNode'; u.path = []; }
    }
  }
  if (u.sub === 'toNode') {
    const c = nodeCenter(task.node), d = Math.hypot(c.x - u.x, c.y - u.y), reach = nodeReach(task.node);
    if (d <= reach || stalled(u) && d <= reach + 22) { u.sub = 'work'; u.path = []; u.moving = false; u.workT = 0; return; }
    if (!u.path.length || u.repath <= 0) {
      const a = Math.atan2(u.y - c.y, u.x - c.x), r = reach - 7;
      u.path = findPath(u.x, u.y, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); u.repath = 3;
      const end = u.path.length ? u.path[u.path.length - 1] : u;
      if (Math.hypot(end.x - c.x, end.y - c.y) > reach + 2) { u.bad.add(task.node); task.node.unreachT = time + 90; task.node = null; u.path = []; return; } /* cannot reach it: nobody tries it for a while */
    }
    followPath(u, dt);
  } else if (u.sub === 'work') {
    const c = nodeCenter(task.node); u.facing = c.x >= u.x ? 1 : -1; u.moving = false;
    if (task.node.amount < 1 && u.job && task.node === u.job) return;   // a farmer waits for the crop to grow back
    if (task.node.amount < 1) { // bush picked bare: try another, else take home what we have
      const n = nearestNode('food', u.x, u.y, 500, u.bad);
      if (n) { task.node = n; u.sub = 'toNode'; } else if (u.carry > 0) { u.sub = 'toKeep'; u.path = []; }
      return;
    }
    if (u.attackAnim === 0) { u.attackAnim = 0.001; if (task.type === 'wood') AudioSys.play('chop', u.x, u.y); else if (task.type === 'stone') AudioSys.play('stoneHit', u.x, u.y); }
    u.workT += dt;
    const rate = 1 / fatWork(u) * (task.type === 'stone' ? 0.9 : task.type === 'wood' ? 0.55 : task.type === 'hops' || task.type === 'wheat' ? 1.1 : 0.8) / (CIV.gather * workMul());
    if (u.workT >= rate) {
      u.workT -= rate; task.node.amount -= 1; u.carry++; u.carryType = task.type; if (task.type === 'food') u.carryKind = task.node.kind === 'bush' ? 'berries' : 'crops';
      if (task.type === 'wood' && task.node.amount <= 0) fellTree(task.node);
      if (task.type === 'stone' && task.node.amount <= 0) breakRock(task.node);
      if (task.type === 'stone' && Math.random() < 0.5) spawn('chip', task.node.x + RR(-6, 6), task.node.y - 12, task.node.y);
      if (u.carry >= CIV.carry) { u.sub = 'toKeep'; u.path = []; }
    }
  } else if (u.sub === 'toKeep') {
    const drop = nearestDrop(u, u.carryType || task.type);
    if (!drop) { u.order = 'idle'; u.task = null; return; }
    if (edgeDist(u, drop) <= 10 || stalled(u) && edgeDist(u, drop) <= 30) {
      if (u.carry > 0) { if (u.job) u.job.produced = (u.job.produced || 0) + u.carry; if (u.carryType === 'food') addFood(u.carryKind || 'crops', u.carry); else res[u.carryType] += u.carry; floatText(u.x, u.y - 50, `+${u.carry} ${u.carryType}`, u.carryType === 'food' ? '#ffb38a' : '#e0c088'); }
      u.carry = 0; u.sub = 'toNode'; u.path = []; u.bad.clear();
      return;
    }
    // no headway toward the store for 5 seconds (its way in is crowded or shut): close by, put the load down; otherwise a fresh way
    const dd = edgeDist(u, drop);
    if (u._kdrop !== drop || u._kd === undefined || dd < u._kd - 6) { u._kdrop = drop; u._kd = dd; u._kt = 0; }
    else if ((u._kt += dt) > 5) { u._kt = 0; u._kd = dd; if (dd < 120) { if (u.carry > 0) { if (u.carryType === 'food') addFood(u.carryKind || 'crops', u.carry); else res[u.carryType] += u.carry; } u.carry = 0; u.sub = 'toNode'; u.path = []; u.bad.clear(); return; } u.path = []; u.repath = 0; }
    if (!u.path.length || u.repath <= 0) { const ap = approachPoint(u, drop); u.path = findPath(u.x, u.y, ap.x, ap.y); u.repath = 3; }
    followPath(u, dt);
  }
}
// resting: people with nothing to do sit, kneel, squat or lie watching, and get up when trouble comes
function restPoseFor(u) {
  const r = (u.seed * 7.31) % 1;
  if (u.onWall || u.guardOf) return 'sit';   // on watch: they sit and look around
  if (u.type === 'civ') { u.stool = ((u.seed || 0) * 11.3) % 1 < 0.35; return 'sit'; }
  if (u.type === 'archer') return r < 0.4 ? 'prone' : 'crouch';
  return r < 0.4 ? 'sit' : r < 0.75 ? 'kneel' : 'crouch';
}
function updateRest(u, dt) {
  if (isMachine(u) || u.lord) { u.pose = null; u.poseK = 0; return; }
  u.alertT = (u.alertT || 0) - dt;
  if (u.alertT <= 0) { u.alertT = 0.4; u.danger = nearUnits(u.x, u.y, 300).some(e => !e.dead && hostile(e.team, u.team) && !hiddenFrom(e, u.team) && e.type !== 'civ' && Math.hypot(e.x - u.x, e.y - u.y) < 300); }
  const still = !u.moving && !(u.attackAnim > 0) && (u.order === 'idle' || u.order === 'hold' || (u.order === 'mount' && u.onWall)) && !u.danger && u.combatT <= 0 && time - u.lastHurt > 4;
  u.idleT = still ? (u.idleT || 0) + dt : 0;
  // two idle people standing close together talk: they face each other's way now and then, with a small gesture
  u.chatT = (u.chatT || 0) - dt;
  if (u.chatT <= 0) { u.chatT = 1 + Math.random() * 0.5; u.chatWith = null;
    if (still && u.team === 'player' && !u.inside) { let best = null, bd = 36; for (const o of nearUnits(u.x, u.y, 36)) { if (o === u || o.dead || o.inside || o.team !== u.team || o.moving || isMachine(o)) continue; const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < bd) { bd = d; best = o; } } u.chatWith = best; } }
  if (u.idleT > 2.5) { if (!u.pose) u.pose = restPoseFor(u); u.poseK = Math.min(1, (u.poseK || 0) + dt * 1.6); }
  else { u.poseK = Math.max(0, (u.poseK || 0) - dt * 4); if (u.poseK === 0) u.pose = null; }
  if (u.pose && u.idleT > 2.5 && u.idleT - dt <= 2.5) {   // face the fire if one is close, otherwise look out over the land
    let f = null, fd = 150; for (const fi of fires) { const d = Math.hypot(fi.x - u.x, fi.y - u.y); if (d < fd) { fd = d; f = fi; } }
    u.restFace = f ? Math.atan2(f.x - u.x, f.y - u.y) : null;
  }
}
// the King stays on top of the keep, protected, as the eyes of the realm, unless you bring him down and send him somewhere
const KING_SIGHT = 900;
function kingOnKeep(u, k) { if (u.onWall) dismount(u); u.onWall = k; u.x = k.x - 14; u.y = (k.y0 + k.y1) / 2 + 6; u.order = 'idle'; u.path = []; u.moving = false; u.target = null; }
function kingBrain(u) {
  const k = playerKeep();
  if (u.onWall === k && k) { u.order = 'idle'; u.moving = false; kingWatch(u, k); return; }
  if (u.order === 'attack' && !alive(u.target)) { u.order = 'idle'; u.target = null; u.path = []; }
  if (u.order === 'idle') {
    u.moving = false;
    const n = nearestEnemy(u, 130); if (n && n.x0 === undefined) { u.order = 'attack'; u.target = n; u.repath = 0; return; }
    // he goes back up when told to, or by himself once you have left him idle for a minute
    if (k && (!u.leftKeep || time - (u.cmdT || 0) > 60)) {
      if (edgeDist(u, k) < 30) { u.leftKeep = false; kingOnKeep(u, k); floatText(k.x, k.y - 150, 'The King watches from the keep', '#ffe9a8'); }
      else if (u.order !== 'move') { const ap = approachPoint(u, k); commandMove([u], ap.x, ap.y); u.order = 'move'; }
    }
  }
}
// from the roof he sees far beyond any archer's reach, and warns you who is coming and from where
function kingWatch(u, k) {
  u.watchT = (u.watchT || 0) - frameDt; if (u.watchT > 0) return; u.watchT = 1;
  const cy = (k.y0 + k.y1) / 2, seen = units.filter(e => !e.dead && hostile('player', e.team) && !hiddenFrom(e, 'player') && !e.inside && e.type !== 'civ' && Math.hypot(e.x - k.x, e.y - cy) < KING_SIGHT);
  for (const e of seen) e.seenByKing = time;
  const fresh = seen.filter(e => !e.kingWarned); if (!fresh.length || time - (u.warnT || -99) < 20) return;
  for (const e of seen) e.kingWarned = true; u.warnT = time;
  const mx = fresh.reduce((a, e) => a + e.x, 0) / fresh.length, my = fresh.reduce((a, e) => a + e.y, 0) / fresh.length, a = Math.atan2(my - cy, mx - k.x);
  const from = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  showBanner(`<b>The King sees ${fresh.length} ${fresh.length > 1 ? 'enemies' : 'enemy'}</b> coming from the ${from}, still far off. Ready your defences!`, 4);
  raidPing = { x: mx, y: my, t: 0, from: 'the ' + from }; AudioSys.ui('warn');
}
let guardT = 0;
const GUARD_TOWERS = { lookout: 1, roundtower: 1 };
let healthT = 0;
function updateHealth(dt) {
  healthT -= dt; if (healthT > 0) return; healthT = 1;
  const k = playerKeep(), people = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && u.type !== 'king');
  const crowd = people.length >= popCap() * 0.9, winter = WEATHER.season === 3;
  for (const u of people) {
    // weight follows the rations: generous rations fatten, lean ones slim
    u.fat = clamp((u.fat || 0) + (ration - 1) * (u.type === 'civ' ? 1 : 0.5) / 300 + (starving ? -1 / 150 : 0), 0, 1);
    if (!u.sick) {
      const risk = 0.00035 + (starving ? 0.004 : 0) + (crowd ? 0.0012 : 0) + (winter ? 0.0008 : 0) + WEATHER.rain * 0.0005 - (u.fat > 0.2 && u.fat < 0.6 ? 0.0002 : 0);
      const near = nearUnits(u.x, u.y, 34).some(o => o !== u && o.sick && !o.dead && o.team === u.team && Math.hypot(o.x - u.x, o.y - u.y) < 34);
      if (Math.random() < risk + (near ? 0.003 : 0)) { u.sick = 1; u.healT = 0; floatText(u.x, u.y - 55, 'Feeling ill...', '#c8e0a0'); }
      continue;
    }
    if (Math.random() < 0.08) floatText(u.x, u.y - 50, '*cough*', '#c8e0a0');
    u.sickT = (u.sickT || 0) + 1;
    // with no keep left to care for them, the sick get over it slowly on their own
    if (!k) { if (u.sickT >= 60) { u.sick = 0; u.sickT = 0; u.toHeal = false; floatText(u.x, u.y - 55, 'Feeling better!', '#9fe8a8'); } continue; }
    // if nobody notices for a while, they take themselves to the keep
    if (!u.toHeal && u.sickT >= 20) { u.toHeal = true; floatText(u.x, u.y - 55, 'I should go to the keep...', '#c8e0a0'); }
    // someone notices and sends them to the keep to be cared for
    if (k && !u.toHeal) { const helper = people.find(o => o !== u && !o.sick && Math.hypot(o.x - u.x, o.y - u.y) < 90); if (helper) { u.toHeal = true; speeches.push({ u: helper, text: 'You look ill! Go to the keep to be cared for.', t: 0 }); } }
    if (u.toHeal && k) {
      if (edgeDist(u, k) < 40 || (stalled(u) && edgeDist(u, k) < 110)) { u.path = []; u.moving = false; u.healT = (u.healT || 0) + 1; u.order = 'idle'; if (u.healT >= 18) { u.sick = 0; u.sickT = 0; u.toHeal = false; floatText(u.x, u.y - 55, 'Feeling better!', '#9fe8a8'); } }
      else if (u.order !== 'move') { const ap = approachPoint(u, k); u.task = null; commandMove([u], ap.x, ap.y); u.cmdT = time; }
    }
  }
}
function updateGuards(dt) {
  guardT -= dt; if (guardT > 0) return; guardT = 1;
  const free = u => !u.dead && u.team === 'player' && u.order === 'idle' && !(time - (u.cmdT || -99) < 30) && !u.onWall && !u.toHeal;
  const king = units.find(u => u.type === 'king' && u.team === 'player' && !u.dead);
  // up to five knights keep close by the king
  const knights = units.filter(u => u.type === 'knight' && u.team === 'player' && !u.dead);
  let kg = knights.filter(u => u.guardOf === king && king).length;
  for (const u of knights) { if (!king || kg >= 5) break; if (!u.guardOf && free(u)) { u.guardOf = king; kg++; floatText(u.x, u.y - 60, 'I guard the King!', '#9fe8a8'); } }
  // every lookout and round tower wants two at the door: knights, macemen or spearmen
  for (const t of structures) {
    if (t.dead || t.team !== 'player' || !GUARD_TOWERS[t.kind] || t.done === false) continue;
    let have = units.filter(u => !u.dead && u.guardOf === t).length;
    for (const u of units) { if (have >= 2) break; if ((u.type === 'knight' || u.type === 'maceman' || u.type === 'spear') && !u.guardOf && free(u)) { u.guardOf = t; have++; floatText(u.x, u.y - 60, 'I will guard the tower door', '#9fe8a8'); } }
    // and at least one archer on top
    if (!(t.noMountUntil > time) && units.filter(o => o.onWall === t && !o.dead).length === 0) { const a = units.find(o => o.type === 'archer' && o.team === 'player' && free(o)); if (a) { commandMount([a], t); a.cmdT = -99; } }
  }
  // guards walk back to their post when idle
  for (const u of units) {
    if (u.dead || !u.guardOf) continue;
    if (u.guardOf.dead) { u.guardOf = null; continue; }
    if (u.order !== 'idle' || u.toHeal) continue;
    const g = u.guardOf;
    if (g.type === 'king' && g.onWall) { const dk = g.onWall, gx2 = dk.x + (u.id % 5 - 2) * 18, gy2 = dk.y1 + 34; if (Math.hypot(u.x - gx2, u.y - gy2) > 40) commandMove([u], gx2, gy2); continue; }
    // (a second guard stands a body's width clear of the door guard who came with the tower)
    const gx = u.guardSpot ? u.guardSpot.x : g.x0 !== undefined ? g.x + (u.id % 2 ? -28 : 28) : g.x + (u.id % 5 - 2) * 18, gy = u.guardSpot ? u.guardSpot.y : g.kind === 'keep' ? g.y1 + 16 : g.x0 !== undefined ? g.y + 14 : g.y + 26;
    if (Math.hypot(u.x - gx, u.y - gy) > 56) commandMove([u], gx, gy);   // a little leeway, so a nudge does not send it walking back and forth
  }
}
function spawnKing() {
  const k = keep; const u = makeUnit('player', 'king', k.x + 10, k.y1 + 30); u.name = 'Your King'; kingOnKeep(u, k); return u;
}
const prints = [];
function stepPrint(u) {
  if (isMachine(u) || u.onWall) return; const st = Math.floor(u.walkPhase / Math.PI); if (st === u.lastStep) return; u.lastStep = st;
  const a = Math.atan2((u.path[0] ? u.path[0].y : u.y) - u.y, (u.path[0] ? u.path[0].x : u.x) - u.x), side = st % 2 ? 1 : -1;
  prints.push({ x: u.x - Math.sin(a) * side * 2.4, y: u.y + Math.cos(a) * side * 2.4, a, t: 0 }); if (prints.length > 600) prints.shift();
}
// workshops and places people go on their breaks: there they are indoors, out of sight
const INDOOR = { mill: 1, bakery: 1, brewery: 1, bowyer: 1, poleturner: 1, smithy: 1 };
function updateInside(u) {
  let t = null;
  if (u.team === 'player' && !isMachine(u)) {
    if (u.order === 'craft' && u.sub === 'work' && u.job && INDOOR[u.job.kind] && u.job.done !== false && edgeDist(u, u.job) <= 44) t = u.job;
    else if (u.breakUntil > time && u.breakAt && !u.breakAt.dead && (u.order === 'idle' && edgeDist(u, u.breakAt) <= 70 || u.order === 'move' && edgeDist(u, u.breakAt) <= 30)) { t = u.breakAt; u.order = 'idle'; }
    else if (u.toHeal && u.healT > 0 && keep && !keep.dead && u.order === 'idle' && edgeDist(u, keep) <= 44) t = keep;
  }
  if (t && t.dead) t = null;
  if (t === (u.inside || null)) return;
  u.inside = t; if (t) { u.moving = false; u.path = []; selection.delete(u); u.pose = null; u.poseK = 0; }
}
const insideOf = b => units.filter(u => !u.dead && u.inside === b);
// the safety net: someone with somewhere to go who has not moved for 15 seconds, and from whose spot there is truly no way home
// (boxed in by trees, shore and buildings), steps to the nearest square that has a way. Like the Fix button, done for you.
function unstickWatch(u, dt) {
  const k0 = u.team === 'player' ? playerKeep() : null;
  const going = (u.toHeal && !(k0 && edgeDist(u, k0) < 110)) || u.order === 'move' || (u.order === 'build' && u.sub === 'go') || u.order === 'return' || (u.order === 'gather' && u.sub && u.sub.startsWith('to'));   /* raiders have their own rules; builders at work and the sick beside the keep stand still on purpose */
  if (!going || u.onWall || u.inside || isMachine(u)) { u._uwT = 0; return; }
  if (u._uwx === undefined || Math.hypot(u.x - u._uwx, u.y - u._uwy) > 8) { u._uwx = u.x; u._uwy = u.y; u._uwT = 0; return; }
  if ((u._uwT += dt) < 20) return; u._uwT = 0;
  const home = u.team === 'player' ? playerKeep() : (rivalOf(u) && rivalOf(u).keep) || null; if (!home || Math.hypot(home.x - u.x, home.y - u.y) > 1200) return;
  const ap = approachPoint(u, home);   /* twenty seconds without a step: whatever the reason, step to the nearest open square from which a way truly reaches home */
  const arrives = (x, y) => { const p = findPath(x, y, ap.x, ap.y); const e = p.length ? p[p.length - 1] : { x, y }; return Math.hypot(e.x - ap.x, e.y - ap.y) < 48; };
  const c0 = Math.floor(u.x / TILE), r0 = Math.floor(u.y / TILE);
  for (let rad = 2; rad <= 10; rad++) for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr++) {
    if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue; const c = c0 + dc, r = r0 + dr, x = c * TILE + 16, y = r * TILE + 16;
    if (c < 1 || r < 1 || c >= COLS - 1 || r >= ROWS - 1 || tileBlocked(c, r) || riverTile[r * COLS + c] === 1 || circleBlocked(x, y, 8)) continue;
    if (!arrives(x, y)) continue;
    u.x = x; u.y = y; u.path = []; u.repath = 0; u._uwx = x; u._uwy = y; return;
  }
  /* shut in a pocket with no way out nearby: out to the open ground beside home, as the Fix button does */
  const f = nearestFree(Math.floor(ap.x / TILE), Math.floor(ap.y / TILE)); if (f) { u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; u.path = []; u.repath = 0; u._uwx = u.x; u._uwy = u.y; }
}
function updateUnit(u, dt) {
  if (u.dead) { u.deathT += dt; u.flash = Math.max(0, u.flash - dt * 5); return; }
  unstickWatch(u, dt);
  updateRest(u, dt); if (u.moving) stepPrint(u);
  curTeam = u.team;
  u.flash = Math.max(0, u.flash - dt * 5);
  u.atkTimer -= dt; u.combatT -= dt; u.repath -= dt;
  if (u.attackAnim > 0) {
    const prev = u.attackAnim; u.attackAnim += dt / u.animDur;
    if (prev < u.hitAt && u.attackAnim >= u.hitAt) doHit(u);
    if (u.attackAnim >= 1) u.attackAnim = 0;
  }
  if (u.dead) return;
  // once the wall in the way falls, go back to what they were sent to destroy
  if (u.order === 'attack' && !alive(u.target) && alive(u.goal)) { u.target = u.goal; u.goal = null; u.repath = 0; u.path = []; }
  if (u.order !== 'attack') u.goal = null;
  if (u.onWall && !canMount(u.onWall)) { dismount(u); }
  if (u.team !== 'player' && u.order === 'attack' && u.target && u.target.onWall && u.type !== 'archer') u.target = null;
  if (u.team === 'player') { if (u.type === 'civ') civBrain(u, dt); else playerBrain(u); } else enemyBrain(u, dt);

  if (u.order === 'move' || u.order === 'return') {
    followPath(u, dt);
    if (!u.dest) u.dest = { x: u.path.length ? u.path[u.path.length - 1].x : u.x, y: u.path.length ? u.path[u.path.length - 1].y : u.y };
    const d = Math.hypot(u.dest.x - u.x, u.dest.y - u.y);
    const movedSq = (u.x - u.lastX) ** 2 + (u.y - u.lastY) ** 2;
    u.stuckT = movedSq < 0.04 ? u.stuckT + dt : 0;
    // jiggling in a crowd resets the timer above, so also watch real progress toward the destination:
    // 3 seconds without getting 6 pixels closer, look for a new way; 3 more, stop where you are
    if (u._pd !== u.dest) { u._pd = u.dest; u.bestD = undefined; u.rerouted = false; u.progT = 0; }   // a new destination starts afresh
    if (u.bestD === undefined || d < u.bestD - 6) { u.bestD = d; u.progT = 0; } else u.progT = (u.progT || 0) + dt;
    if (u.progT > 3 && !u.rerouted) { u.rerouted = true; u.progT = 0; u.bestD = d; const pth = findPath(u.x, u.y, u.dest.x, u.dest.y); if (pth.length) u.path = pth; }
    if (!u.path.length || d < 3 || (u.stuckT > 0.6 && d < 45) || u.stuckT > 2.5 || (u.progT > 3 && u.rerouted)) { u.order = 'idle'; u.path = []; u.moving = false; u.bestD = undefined; u.rerouted = false; u.progT = 0; }
  } else if (u.order === 'attack') attackStep(u, dt);
  else if (u.order === 'mount') mountStep(u, dt);
  else if (u.order === 'raid') followPath(u, dt);

  // wounds slowly mend after 8 seconds out of harm's way
  if (u.hp < u.maxHp && time - u.lastHurt > 8 && !starving && !isMachine(u)) u.hp = Math.min(u.maxHp, u.hp + CIV.heal * dt);
  // Stone Wardens: the keep tends the wounded nearby, even mid-battle
  if (CIV.keepHeal && u.team === 'player' && !isMachine(u) && u.hp < u.maxHp && playerKeep() && edgeDist(u, keep) < 200) u.hp = Math.min(u.maxHp, u.hp + CIV.keepHeal * dt);
  updateInside(u);
  u.lastX = u.x; u.lastY = u.y;
}
function separate() {   // people standing on each other step apart; only neighbours are compared (the nearby grid)
  for (const a of units) {
    if (a.dead || a.onWall || a.inside) continue;
    for (const b of nearUnits(a.x, a.y, a.radius + 32)) {
    if (b.id <= a.id || b.dead || b.onWall || b.inside) continue;
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    const min = a.radius + b.radius;
    if (d >= min) continue;
    if (d < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy); }
    const push = (min - d), nx = dx / d, ny = dy / d;
    const aFixed = a.team !== 'player' && a.order === 'idle' && b.team !== a.team, bFixed = b.team !== 'player' && b.order === 'idle' && a.team !== b.team;   // guards hold their ground against foes, but make way for their own
    if (aFixed && bFixed) continue;
    // someone standing still holds their ground; the one walking gives way and steps around (no drifting crowds)
    const aStill = !a.moving && (a.order === 'idle' || a.order === 'hold'), bStill = !b.moving && (b.order === 'idle' || b.order === 'hold');
    // a guard standing at its post gives way only a little (3%), so passers-by do not slowly shove it away from the door
    const wa = aFixed ? 0 : bFixed ? 1 : aStill && !bStill ? (a.guardOf ? 0.03 : 0.12) : bStill && !aStill ? (b.guardOf ? 0.97 : 0.88) : 0.5, wb = 1 - wa;
    moveBy(a, -nx * push * wa, -ny * push * wa);
    moveBy(b, nx * push * wb, ny * push * wb);
    // someone walking into a person who stands still steps around them, instead of being pushed straight back forever
    slideAround(a, -nx, -ny, push, true); slideAround(b, nx, ny, push, true);
    }
  }
}
function slideAround(u, nx, ny, push, other) {
  if (!other || !u.moving || !u.path || !u.path.length || isMachine(u)) return;
  const wp = u.path[0], gx = wp.x - u.x, gy = wp.y - u.y, gl = Math.hypot(gx, gy); if (gl < 1) return;
  if ((gx * -nx + gy * -ny) / gl < 0.3) return;   // only when the other one is in the way ahead
  let tx = -ny, ty = nx; const side = tx * gx + ty * gy;
  if (Math.abs(side) < gl * 0.05 ? u.id % 2 : side < 0) { tx = -tx; ty = -ty; }
  const k = Math.min(1.6, push * 0.9 + 0.4); moveBy(u, tx * k, ty * k);
}

