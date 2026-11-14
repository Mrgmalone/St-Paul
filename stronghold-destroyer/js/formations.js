'use strict';
// Stronghold Destroyer — Phase 4E: formations and marching together.
// Gerald: "a very important upgrade to the way the troops move". Choose a formation in the diamond (the two walking
// soldiers in its middle), then send the soldiers anywhere: they take that shape there, whatever their number (3 or 30),
// walk at the pace of the slowest so they arrive together (one who falls behind may hurry to catch up), and stand
// facing the way they marched. With no formation chosen ("Free") they gather in the old block, still marching together.
// The shapes and spacing live here; the diamond (diamond.js) only chooses one.

const FORMATIONS = {
  free:   { name: 'Free',   tip: 'No set shape: a neat block, the old way' },
  line:   { name: 'Line',   tip: 'Side by side, facing the enemy: the most weapons at the front' },
  column: { name: 'Column', tip: 'Two abreast, one behind the other: best through gates, woods and narrow ground' },
  wedge:  { name: 'Wedge',  tip: 'An arrowhead: one at the point, the rest fanning back: to break through' },
  square: { name: 'Square', tip: 'A hollow square facing every way: when you could be attacked from all sides' },
  circle: { name: 'Circle', tip: 'A ring round a point: to guard something in the middle' },
  loose:  { name: 'Loose',  tip: 'Spread wide apart: fewer hit at once by catapults and arrows' }
};
const FORMATION_ORDER = ['free', 'line', 'column', 'wedge', 'square', 'circle', 'loose'];
const FORMATION_GAP = 30;            // points between neighbours (a soldier is about 18 across)
const MARCH_CATCHUP = 60;           // a soldier this far behind the group may walk at his own full pace to catch up
let formationNow = 'free';           // the formation chosen in the diamond (saved with the game)

// the places of a formation of n, as (lateral, forward) offsets round its middle: lateral to the right of the way they
// face, forward toward it. Front rows come first.
function formationOffsets(kind, n, gap = FORMATION_GAP) {
  const out = [];
  if (n <= 0) return out;
  if (kind === 'line') {
    const per = Math.min(n, 12), rows = Math.ceil(n / per);
    for (let i = 0; i < n; i++) { const r = Math.floor(i / per), inRow = r === rows - 1 ? n - r * per : per, c = i % per;
      out.push({ l: (c - (inRow - 1) / 2) * gap, f: ((rows - 1) / 2 - r) * gap }); }
  } else if (kind === 'column') {
    const w = n <= 3 ? 1 : n <= 24 ? 2 : 3, rows = Math.ceil(n / w);
    for (let i = 0; i < n; i++) { const r = Math.floor(i / w), inRow = r === rows - 1 ? n - r * w : w, c = i % w;
      out.push({ l: (c - (inRow - 1) / 2) * gap, f: ((rows - 1) / 2 - r) * gap }); }
  } else if (kind === 'wedge') {
    let r = 0, placed = 0; const rows = []; while (placed < n) { const k = Math.min(r + 1, n - placed); rows.push(k); placed += k; r++; }
    const depth = rows.length;
    rows.forEach((k, ri) => { for (let c = 0; c < k; c++) out.push({ l: (c - (k - 1) / 2) * gap, f: ((depth - 1) / 2 - ri) * gap * 0.9 }); });
  } else if (kind === 'square') {
    if (n <= 4) { const s = gap / 2; [[-s, s], [s, s], [-s, -s], [s, -s]].slice(0, n).forEach(([l, f]) => out.push({ l, f })); }
    else {
      let side = 2; while (4 * (side - 1) < n) side++;          // the smallest hollow square that holds them all
      const per = 4 * (side - 1), half = (side - 1) / 2 * gap, pts = [];
      for (let i = 0; i < per; i++) { const e = Math.floor(i / (side - 1)), t = (i % (side - 1)) * gap - half;
        pts.push(e === 0 ? { l: t, f: half } : e === 1 ? { l: half, f: -t } : e === 2 ? { l: -t, f: -half } : { l: -half, f: t }); }
      for (let i = 0; i < n; i++) out.push(pts[Math.floor(i * per / n)]);   // spread evenly round the sides
    }
  } else if (kind === 'circle') {
    const R = Math.max(gap * 0.9, n * gap / (2 * Math.PI));
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; out.push({ l: Math.cos(a) * R, f: -Math.sin(a) * R }); }
  } else if (kind === 'loose') {
    const cols = Math.ceil(Math.sqrt(n * 1.5)), rows = Math.ceil(n / cols), g = gap * 1.9;
    for (let i = 0; i < n; i++) { const r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols, c = i % cols;
      out.push({ l: (c - (inRow - 1) / 2) * g + (r % 2 ? g * 0.35 : 0), f: ((rows - 1) / 2 - r) * g }); }
  } else {   // free: the old square block
    const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), g = 33;
    for (let i = 0; i < n; i++) { const r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols, c = i % cols;
      out.push({ l: (c - (inRow - 1) / 2) * g, f: ((rows - 1) / 2 - r) * g }); }
  }
  return out;
}
// who stands in front: those who fight hand to hand, then the bowmen, then the engines (in line, column and wedge)
const FRONT_RANK = u => isMachine(u) ? 3 : (u.type === 'archer' || u.type === 'ballista') ? 2 : u.type === 'civ' ? 2.5 : 1;

// send a group to (x, y) in the chosen formation, marching together. Returns the march.
let marchSeq = 0;
function commandMarch(list, x, y, kind = formationNow, face = null) {   // face: {x, y}, the way to stand (else the way they go)
  list = list.filter(u => u && !u.dead && u.kind === 'unit'); if (!list.length) return null;
  if (list.length === 1) { commandMove(list, x, y); list[0].march = null; return null; }
  const cx = list.reduce((a, u) => a + u.x, 0) / list.length, cy = list.reduce((a, u) => a + u.y, 0) / list.length;
  let fx = x - cx, fy = y - cy; const fd = Math.hypot(fx, fy);
  if (face) { const n = Math.hypot(face.x, face.y) || 1; fx = face.x / n; fy = face.y / n; }
  else if (fd < 1) { fx = 0; fy = -1; } else { fx /= fd; fy /= fd; }      // facing the way they go
  const rx = -fy, ry = fx;                                            // to their right
  let offs = null;
  if (kind === 'line') {   // a line with bowmen (or engines) in it: the fighters' line in front, the bowmen's line behind
    const ranks = [...new Set(list.map(FRONT_RANK))].sort((a, b) => a - b);
    if (ranks.length > 1) {
      const blocks = ranks.map(r => formationOffsets('line', list.filter(u => FRONT_RANK(u) === r).length));
      const depth = b => Math.max(...b.map(o => o.f)) - Math.min(...b.map(o => o.f));
      let top = (blocks.reduce((a, b) => a + depth(b), 0) + FORMATION_GAP * (blocks.length - 1)) / 2; offs = [];
      for (const b of blocks) { const mx = Math.max(...b.map(o => o.f)); for (const o of b) offs.push({ l: o.l, f: top - (mx - o.f) }); top -= depth(b) + FORMATION_GAP; }
    }
  }
  if (!offs) offs = formationOffsets(kind, list.length);
  // places on the ground: a place in the water, a wall or a building moves to the nearest point that is free and not
  // already another's place (before, it jumped to the middle of the nearest free square, and two could share it)
  const taken = [];
  const okAt = (px, py) => !circleBlocked(px, py, 9) && !taken.some(t => (t.x - px) ** 2 + (t.y - py) ** 2 < 22 * 22);
  const slots = offs.map(o => { let sx = clamp(x + rx * o.l + fx * o.f, 20, MW - 20), sy = clamp(y + ry * o.l + fy * o.f, 20, MH - 20);
    if (!okAt(sx, sy)) { let found = null;
      for (let rad = 10; rad <= 160 && !found; rad += 10) for (let i = 0; i < 16 && !found; i++) { const a = i / 16 * Math.PI * 2, px = clamp(sx + Math.cos(a) * rad, 20, MW - 20), py = clamp(sy + Math.sin(a) * rad, 20, MH - 20); if (okAt(px, py)) found = { x: px, y: py }; }
      if (!found) { const f = nearestFree(Math.floor(sx / TILE), Math.floor(sy / TILE)); if (f) found = { x: f.c * TILE + 16, y: f.r * TILE + 16 }; }
      if (found) { sx = found.x; sy = found.y; } }
    taken.push({ x: sx, y: sy }); return { x: sx, y: sy, l: o.l, f: o.f }; });
  // who goes where: rank by rank from the front (fighters first) and, within a rank, the one already nearest that side,
  // so nobody crosses through the group to get to his place
  const shaped = kind === 'line' || kind === 'column' || kind === 'wedge';
  const order = slots.map((s, i) => i).sort((a, b) => slots[b].f - slots[a].f || slots[a].l - slots[b].l);
  const rel = u => ({ l: (u.x - cx) * rx + (u.y - cy) * ry, f: (u.x - cx) * fx + (u.y - cy) * fy });
  const march = { id: ++marchSeq, kind, members: list, heading: Math.atan2(fx, fy), fx, fy, speed: 1e9, t: 0, at: { x, y }, done: 0 };
  for (const u of list) if (!isMachine(u)) march.speed = Math.min(march.speed, u.speed * (u.speedMul || 1));
  if (march.speed === 1e9) march.speed = Math.min(...list.map(u => u.speed));
  const assign = (u, s) => {
    if (u.onWall) dismount(u);
    u.order = 'move'; u.target = null; u.dest = { x: s.x, y: s.y }; u.stuckT = 0; u.bestD = undefined; u.rerouted = false; u.progT = 0; u.autoFrom = null;
    if (u.type === 'civ') u.task = null;
    u.path = findPath(u.x, u.y, s.x, s.y); u.march = march; u.faceAng = march.heading; u.reslot = 0; u.formed = null;
    if (u.team === 'player') u.cmdT = time;   /* your order: no automatic duty takes them for the next 30 seconds */
  };
  if (shaped) {
    // row by row from the front: the soldiers already furthest forward take the front row (fighters before bowmen),
    // and within a row each takes the place on his own side, so nobody walks through the others to reach his place
    const rows = new Map(); for (const si of order) { const key = Math.round(slots[si].f); if (!rows.has(key)) rows.set(key, []); rows.get(key).push(si); }
    const pool = list.slice().sort((a, b) => FRONT_RANK(a) - FRONT_RANK(b) || rel(b).f - rel(a).f);
    for (const row of rows.values()) {
      const us = pool.splice(0, row.length).sort((a, b) => rel(a).l - rel(b).l), ss = row.slice().sort((a, b) => slots[a].l - slots[b].l);
      us.forEach((u, i) => assign(u, slots[ss[i]]));
    }
  } else {   // the nearest free soldier to each place, front places first
    const free = list.slice();
    for (const si of order) { const s = slots[si]; let pickI = 0, bd = 1e12; free.forEach((u, i) => { const d = (u.x - s.x) ** 2 + (u.y - s.y) ** 2; if (d < bd) { bd = d; pickI = i; } }); assign(free.splice(pickI, 1)[0], s); }
  }
  markers.push({ x, y, t: 0, col: '120,255,140' });
  return march;
}
// for 12 seconds after a formation is reached, one standing off his place (the others were in the way) steps into it
// as soon as nobody stands there; checked every 1.2 seconds, so a settled formation costs nothing
function keepFormation(u) {
  if (!u.formed || u.order !== 'idle' || !u.dest || time > (u.formT || 0) + 12 || time < (u.formTry || 0) + 1.2) return;
  u.formTry = time; const d = Math.hypot(u.dest.x - u.x, u.dest.y - u.y); if (d <= 10) return;
  if (circleBlocked(u.dest.x, u.dest.y, 8) || nearUnits(u.dest.x, u.dest.y, 20).some(o => o !== u && !o.dead && Math.hypot(o.x - u.dest.x, o.y - u.dest.y) < 15)) return;
  u.order = 'move'; u.path = [{ x: u.dest.x, y: u.dest.y }]; u.stuckT = 0; u.bestD = undefined; u.rerouted = false; u.progT = 0;
}
// once a second for each march: who has fallen behind may hurry (called from followPath, so no extra loop)
function marchPace(u) {
  const M = u.march; if (!M || u.order !== 'move') return u.speed;
  if (time - M.t > 0.5) {
    M.t = time; const live = M.members.filter(o => !o.dead && o.march === M && o.order === 'move');
    if (!live.length) return u.speed;
    const left = live.map(o => Math.hypot(o.dest.x - o.x, o.dest.y - o.y)).sort((a, b) => a - b), mid = left[Math.floor(left.length / 2)];
    for (const o of live) o.marchFast = Math.hypot(o.dest.x - o.x, o.dest.y - o.y) > mid + MARCH_CATCHUP;
  }
  return u.marchFast || isMachine(u) ? u.speed : Math.min(u.speed, M.speed / (u.speedMul || 1));
}
// arrived: one pushed off his place by the others walks the last steps (up to three tries); then he stands facing the
// way they marched, and one in a chosen formation stays in it (not taken for tower-door duty) until given a new order.
// Returns true while he is still stepping into place.
function marchArrived(u) {
  const M = u.march; if (!M) return false;
  if (u.dest && Math.hypot(u.dest.x - u.x, u.dest.y - u.y) > 10 && (u.reslot || 0) < 3 && !circleBlocked(u.dest.x, u.dest.y, 8)) {
    u.reslot = (u.reslot || 0) + 1; u.order = 'move'; u.path = findPath(u.x, u.y, u.dest.x, u.dest.y); if (!u.path.length) u.path = [{ x: u.dest.x, y: u.dest.y }];
    u.stuckT = 0; u.bestD = undefined; u.rerouted = false; u.progT = 0; return true;
  }
  u.reslot = 0; u.faceAng = M.heading; if (Math.abs(M.fx) > 0.2) u.facing = M.fx > 0 ? 1 : -1;
  u.march = null; u.marchFast = false; if (M.kind !== 'free') { u.formed = M.kind; u.formT = time; }
  // the last one in: anyone the others knocked out of place on their way through takes one step back to it
  M.done = (M.done || 0) + 1;
  if (M.done >= M.members.filter(o => !o.dead).length) for (const o of M.members) {
    if (o.dead || o.order !== 'idle' || o.march || !o.dest || o.faceAng !== M.heading || Math.hypot(o.dest.x - o.x, o.dest.y - o.y) <= 10 || circleBlocked(o.dest.x, o.dest.y, 8)) continue;
    o.order = 'move'; o.path = [{ x: o.dest.x, y: o.dest.y }]; o.stuckT = 0; o.bestD = undefined; o.rerouted = false; o.progT = 0;
  }
  return false;
}
