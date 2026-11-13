'use strict';
// Stronghold Destroyer — Phase 4B, step B6: random starts, fog of war, and how far each soldier sees.
// Every game you begin at one of five places on the map (the west meadow, or one of the four rival sites), and the rivals
// take the other four. The land you have not yet seen lies under a dark fog; once one of your people or buildings has seen a
// place it stays uncovered. Longbowmen see twice as far as others; a tower with a ballista matches that; berserkers and the
// whole Psychana faction see like longbowmen. (Add ?start=0..4 to the address to choose the starting place, for testing.)

// ---------- a random start (decided as the page loads, before the land is made) ----------
const START_SITES = [[14, 26]].concat(RIVALS.sites.map(s => s.slice()));   // tiles of a keep's corner: the west meadow, then the four rival sites
let START_AT = 0, START_REGION = 'west', START_RANDOM = false;
// Phase 4C step C7: every game, you and each rival start somewhere new. The places are drawn at random beside the roads
// (so nobody starts shut in by forest), clear of the river and the mountains, with room between every camp. You may ask
// for a part of the map (west, north, east or south) on the front page; Random is the default.
const START_REGIONS = ['west', 'north', 'east', 'south'];
const regionOf = (x, y) => x < MW * 0.3 ? 'west' : x > MW * 0.7 ? 'east' : y < MH / 2 ? 'north' : 'south';
function matchPrefs() {
  let m = {}; try { m = JSON.parse(localStorage.getItem('sd-match') || '{}') || {}; } catch (e) { m = {}; }
  const q = new URLSearchParams(location.search); if (q.get('region')) m.region = q.get('region'); if (q.get('rivals')) m.rivals = +q.get('rivals');
  return m;
}
function randomCamps(region, n) {
  const RNo = makeNoise(808), riverX = y => 1236 + Math.sin(y / 250) * 95 + (RNo(y / 180, 3) - 0.5) * 120;   // (the same line the river is drawn along)
  const cands = [];
  for (const rd of ROADS) for (let k = 0; k < rd.length; k++) {   // anywhere along each road (not only at its drawn points), either side
    const t = 1 + Math.random() * (rd.length - 3), i = Math.floor(t), f = t - i, a = rd[i], b = rd[i + 1], ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
    const side = Math.random() < 0.5 ? -1 : 1, off = 130 + Math.random() * 110, x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
    cands.push({ x: x + Math.cos(ang) * off * side, y: y + Math.sin(ang) * off * side });
  }
  // never where you started in your last five games
  let recent = []; try { recent = JSON.parse(localStorage.getItem('sd-starts') || '[]') || []; } catch (e) { recent = []; }
  const ok = (p, mine) => p.x > 12 * TILE && p.x < MW - 12 * TILE && p.y > 9 * TILE && p.y < MH - 9 * TILE && Math.abs(p.x - riverX(p.y)) > (mine ? 380 : 290)
    && MOUNTAINS.every(M => Math.hypot(p.x - M.x, p.y - M.y) > M.len + 170);
  const good = cands.filter(p => ok(p, false)), mixed = () => { const a = good.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // Random: each part of the map is equally likely (the roads are not spread evenly, so pick the part first)
  const want = START_REGIONS.includes(region) ? region : START_REGIONS[Math.floor(Math.random() * START_REGIONS.length)];
  for (let tries = 0; tries < 500; tries++) {
    const relax = tries < 250 ? 1 : tries < 400 ? 0.9 : 0.8;
    const mine = good.filter(p => ok(p, true) && (tries >= 450 || regionOf(p.x, p.y) === want) && !recent.some(q => Math.hypot(p.x - q[0], p.y - q[1]) < 160));
    const P = mine[Math.floor(Math.random() * mine.length)]; if (!P) continue;
    const out = [P];
    for (const p of mixed()) { if (out.length >= n) break; if (Math.hypot(p.x - P.x, p.y - P.y) < 1150 * relax) continue; if (out.slice(1).some(o => Math.hypot(p.x - o.x, p.y - o.y) < 880 * relax)) continue; out.push(p); }
    if (out.length >= n) { try { localStorage.setItem('sd-starts', JSON.stringify([[Math.round(P.x), Math.round(P.y)]].concat(recent).slice(0, 5))); } catch (e) {} return out.map(p => [Math.round(p.x / TILE - 1.5), Math.round(p.y / TILE - 1.5)]); }
  }
  return null;
}
(() => {
  if (LEGACY) return;   // the older tests keep the old map
  const q = new URLSearchParams(location.search).get('start');
  let pend = null; try { pend = JSON.parse(sessionStorage.getItem('sd-load') || 'null'); } catch (e) { pend = null; }   /* (4D: a saved game being loaded brings back its own starting places) */
  if (pend && Array.isArray(pend.sites) && pend.sites.length >= 2) { START_SITES.length = 0; for (const s of pend.sites) START_SITES.push(s.slice()); START_AT = Math.min(pend.startAt || 0, START_SITES.length - 1); START_RANDOM = !!pend.random; }
  else if (q !== null && START_SITES[+q]) START_AT = +q;   // (tests: ?start=0..4 pins one of the five old places)
  else {
    const camps = randomCamps(matchPrefs().region || 'random', 5);
    if (camps) { START_RANDOM = true; START_AT = -1; START_SITES.length = 0; for (const s of camps) START_SITES.push(s); START_AT = 0; }
    else START_AT = Math.floor(Math.random() * START_SITES.length);
  }
  const [c, r] = START_SITES[START_AT];
  START_REGION = regionOf((c + 1.5) * TILE, (r + 1.5) * TILE);
  HOME.dx = (c - 3) * TILE; HOME.dy = (r - 29) * TILE;
  PLAYER_START.x = 270 + HOME.dx; PLAYER_START.y = 1070 + HOME.dy;
  // the rivals take the other four places
  const others = START_SITES.filter((s, i) => i !== START_AT);
  for (let i = 0; i < RIVALS.sites.length; i++) RIVALS.sites[i] = others[i];
})();
// newcomers walk in along the nearest road, from about 600 points out
let entryAt = null;
function roadEntryNear() {
  const k = playerKeep(); if (!k) return null;
  if (!entryAt) { let best = null, bd = 1e9; for (const rd of ROADS) for (const p of rd) { const d = Math.abs(Math.hypot(p.x - k.x, p.y - k.y) - 600); if (p.x > 20 && p.y > 20 && p.x < MW - 20 && p.y < MH - 20 && d < bd) { bd = d; best = p; } } entryAt = best; }
  if (!entryAt) return null;
  const f = nearestFree(Math.floor(entryAt.x / TILE), Math.floor(entryAt.y / TILE)); return f ? { x: f.c * TILE + 16, y: f.r * TILE + 16 } : null;
}

// ---------- the fog of war: what you have seen stays seen ----------
let fogVer = 0;
const FOG = { cell: 64, on: false, w: 0, h: 0, seen: null, dirty: false, t: 0 };
FOG.w = Math.ceil(MW / FOG.cell); FOG.h = Math.ceil(MH / FOG.cell); FOG.seen = new Uint8Array(FOG.w * FOG.h);
const SIGHT = { civ: 220, soldier: 320, archer: 360, building: 260, keep: 560, tower: 460 };
// how far one of your people or buildings sees
function sightOf(o) {
  const psy = FACKEY === 'psychana', longbow = SIGHT.archer * 2;
  if (o.x0 !== undefined) {
    if (o.kind === 'keep') return SIGHT.keep;
    if (o.engine === 'ballista' || o.engine === 'trebuchet') return longbow;   // a tower ballista sees as far as a longbowman
    if (o.range) return Math.max(SIGHT.tower, o.range + 40);
    return SIGHT.building;
  }
  if (o.kit === 'longbow' || o.kit === 'berserker' || (psy && o.type !== 'civ')) return longbow;
  return o.type === 'civ' ? (psy ? longbow * 0.75 : SIGHT.civ) : o.type === 'archer' ? SIGHT.archer : SIGHT.soldier;
}
function reveal(x, y, r) {
  const C = FOG.cell, c0 = Math.max(0, Math.floor((x - r) / C)), c1 = Math.min(FOG.w - 1, Math.floor((x + r) / C)), r0 = Math.max(0, Math.floor((y - r) / C)), r1 = Math.min(FOG.h - 1, Math.floor((y + r) / C));
  for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) {
    const k = j * FOG.w + i; if (FOG.seen[k]) continue;
    const cx = (i + 0.5) * C, cy = (j + 0.5) * C; if ((cx - x) ** 2 + (cy - y) ** 2 <= (r + C * 0.5) ** 2) { FOG.seen[k] = 1; FOG.dirty = true; }
  }
}
const fogSeen = (x, y) => !FOG.on || FOG.seen[clamp(Math.floor(y / FOG.cell), 0, FOG.h - 1) * FOG.w + clamp(Math.floor(x / FOG.cell), 0, FOG.w - 1)] === 1;
// anything of another side standing in the fog is not shown to you (nor its buildings)
const fogHides = (o, team) => FOG.on && team === 'player' && o.team !== 'player' && !(o.x0 !== undefined ? fogSeen((o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2) : fogSeen(o.x, o.y));
function updateFog(dt) {
  if (!FOG.on) return;
  FOG.t -= dt; if (FOG.t > 0) return; FOG.t = 0.5;
  for (const u of units) if (u.team === 'player' && !u.dead && !u.inside) reveal(u.x, u.y, sightOf(u));
  for (const b of structures) if (b.team === 'player' && !b.dead && b.done !== false) reveal(b.x, (b.y0 + b.y1) / 2, sightOf(b));
  if (FOG.dirty) { FOG.dirty = false; fogVer++; try { R3D.setFog(FOG.seen, FOG.w, FOG.h); } catch (e) {} }
}
function startFog() { if (LEGACY) return; FOG.on = true; FOG.seen.fill(0); FOG.t = 0; updateFog(1); }
const exploredShare = () => FOG.seen.reduce((a, v) => a + v, 0) / FOG.seen.length;
