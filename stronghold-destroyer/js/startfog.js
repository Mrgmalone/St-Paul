'use strict';
// Stronghold Destroyer — Phase 4B, step B6: random starts, fog of war, and how far each soldier sees.
// Every game you begin at one of five places on the map (the west meadow, or one of the four rival sites), and the rivals
// take the other four. The land you have not yet seen lies under a dark fog; once one of your people or buildings has seen a
// place it stays uncovered. Longbowmen see twice as far as others; a tower with a ballista matches that; berserkers and the
// whole Psychana faction see like longbowmen. (Add ?start=0..4 to the address to choose the starting place, for testing.)

// ---------- a random start (decided as the page loads, before the land is made) ----------
const START_SITES = [[14, 26]].concat(RIVALS.sites.map(s => s.slice()));   // tiles of a keep's corner: the west meadow, then the four rival sites
let START_AT = 0;
(() => {
  if (LEGACY) return;   // the older tests keep the old map
  const q = new URLSearchParams(location.search).get('start');
  START_AT = q !== null && START_SITES[+q] ? +q : Math.floor(Math.random() * START_SITES.length);
  const [c, r] = START_SITES[START_AT];
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
