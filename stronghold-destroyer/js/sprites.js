'use strict';
// Stronghold Destroyer — unit pictures from Gerald's sheet (sprites/atlas.js), recoloured per team, and the
// sheet's materials (sprites/materials.js). Loaded before the rest of the game.

// ---------- team colours ----------
// The sheet is painted blue and gold. Each team says what the blue cloth, the gold trim, bright steel and the pale
// shield emblem become. New peoples (Phase 5) only need a new entry here: no new art.
//   cloth:  { hue, sat (added), val (times) }   or   { gray: brightness }   for colourless cloth
//   trim:   null keeps the gold, or { hue, sat, val }
//   steel:  how much darker bright steel becomes (0 = as drawn)
//   emblem: { hue, sat, val } the lion or cross on shields and tabards
const TEAM_COLORS = {
  player: { cloth: { hue: 355, sat: 0.08, val: 1.22 }, trim: null, steel: 0, emblem: { hue: 44, sat: 0.72, val: 1.0 } },          // crimson and gold, gold lion
  enemy:  { cloth: { gray: 0.62 }, trim: { hue: 24, sat: 1.1, val: 0.95 }, steel: 0.38, emblem: { hue: 22, sat: 0.85, val: 0.9 } }  // Black Stone: blackened steel, charcoal, ember
};
const TEAM_KEY = u => (u.team === 'player' ? 'player' : 'enemy');

// which picture on the sheet each game unit uses, and how tall it stands (world pixels)
const ART_UNIT = {
  sword: 'swordsman', spear: 'spearman', archer: 'archer', knight: 'mounted-knight', catapult: 'catapult', trebuchet: 'trebuchet',
  maceman: 'heavy-spearman',   // stand-in: the sheet has no maceman; the heavy spearman is the armoured soldier closest to him
  king: 'swordsman',           // stand-in: the swordsman with a crown, drawn larger
  crossbow: 'crossbowman', berserker: 'berserker', flame: 'flame-trooper', heavyspear: 'heavy-spearman'   // on the sheet, not in the game yet
};
const ART_H = { swordsman: 52, spearman: 54, archer: 52, 'mounted-knight': 66, catapult: 50, trebuchet: 92, 'heavy-spearman': 54, crossbowman: 52, berserker: 52, 'flame-trooper': 52 };

const ATLAS = { ready: false, img: null, mask: null, frames: null, team: {}, sil: {} };
function hsv2rgb(h, s, v) {
  const c = v * s, hp = ((h % 360) + 360) % 360 / 60, x = c * (1 - Math.abs(hp % 2 - 1)), m = v - c;
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; if (d > 1e-6) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, mx > 0 ? d / mx : 0, mx];
}
// paint one team's copy of the atlas: only the masked pixels change, so the sheet's light and shade stay as drawn
function recolorAtlas(key) {
  const P = TEAM_COLORS[key] || TEAM_COLORS.player, W = ATLAS.img.width, H = ATLAS.img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(ATLAS.img, 0, 0); const im = g.getImageData(0, 0, W, H), d = im.data;
  const mc = document.createElement('canvas'); mc.width = W; mc.height = H * 2; const mg = mc.getContext('2d', { willReadFrequently: true });
  mg.drawImage(ATLAS.mask, 0, 0); const m = mg.getImageData(0, 0, W, H).data, em = mg.getImageData(0, H, W, H).data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const wc = m[i] / 255, wt = m[i + 1] / 255, ws = m[i + 2] / 255, we = em[i] / 255;
    if (wc + wt + ws + we === 0) continue;
    let r = d[i], gg = d[i + 1], b = d[i + 2]; const [h, s, v] = rgb2hsv(r, gg, b);
    if (wc > 0) { const C = P.cloth; let t; if (C.gray !== undefined) { const k = v * C.gray * 255; t = [k * 0.95, k * 0.96, k * 1.05]; } else t = hsv2rgb(C.hue, Math.min(0.92, s * 1.05 + C.sat), Math.min(1, v * C.val)); r += (t[0] - r) * wc; gg += (t[1] - gg) * wc; b += (t[2] - b) * wc; }
    if (wt > 0 && P.trim) { const t = hsv2rgb(P.trim.hue, Math.min(1, s * P.trim.sat), Math.min(1, v * P.trim.val)); r += (t[0] - r) * wt; gg += (t[1] - gg) * wt; b += (t[2] - b) * wt; }
    if (ws > 0 && P.steel) { const k = 1 - ws * P.steel; r *= k; gg *= k; b *= k; }
    if (we > 0 && P.emblem) { const t = hsv2rgb(P.emblem.hue, P.emblem.sat, Math.min(1, Math.max(v, 0.5) * P.emblem.val)); r += (t[0] - r) * we; gg += (t[1] - gg) * we; b += (t[2] - b) * we; }
    d[i] = r; d[i + 1] = gg; d[i + 2] = b;
  }
  g.putImageData(im, 0, 0); return c;
}
function teamAtlas(key) { return ATLAS.team[key] || (ATLAS.team[key] = recolorAtlas(key)); }
// a flat silhouette of the atlas in one colour, for people hidden behind walls
function silAtlas(key) {
  if (ATLAS.sil[key]) return ATLAS.sil[key];
  const c = document.createElement('canvas'); c.width = ATLAS.img.width; c.height = ATLAS.img.height; const g = c.getContext('2d');
  g.drawImage(ATLAS.img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = key === 'player' ? '#e0445a' : '#ff8a3a'; g.fillRect(0, 0, c.width, c.height);
  return (ATLAS.sil[key] = c);
}
function loadAtlas() {
  const A = window.UNIT_ATLAS; if (!A) return;
  const img = new Image(), mask = new Image(); let n = 0;
  const done = () => { if (++n < 2) return; ATLAS.img = img; ATLAS.mask = mask; ATLAS.frames = A.frames; try { teamAtlas('player'); teamAtlas('enemy'); ATLAS.ready = true; if (typeof UI !== 'undefined') UI.paintIcons(); } catch (e) { console.warn('atlas', e); } };
  img.onload = done; mask.onload = done; img.src = A.img; mask.src = A.mask;
}
loadAtlas();
const artOf = u => (ATLAS.ready && ART_UNIT[u.lord ? 'king' : u.type]) || null;

// ---------- materials from page 2 ----------
const MATS = { ready: false, world: false, img: {}, pat: {} };
// called once both the world is laid out and the materials have loaded, whichever comes last
function materialsArrived() { try { paintTerrainArt(); UI.paintIcons(); UI.rebuildMini(); } catch (e) { console.warn('terrain', e); } }
(function loadMaterials() {
  const M = window.MATERIALS; if (!M) return; const keys = Object.keys(M); let n = 0;
  for (const k of keys) { const im = new Image(); im.onload = () => { MATS.img[k] = im; if (++n === keys.length) { MATS.ready = true; if (MATS.world) materialsArrived(); } }; im.src = M[k]; }
})();
// a repeating fill of one material, scaled so a brick row is about 8 world pixels tall
function matPattern(g, key, scale = 0.5) {
  const id = key + '@' + scale; if (MATS.pat[id]) return MATS.pat[id];
  const im = MATS.img[key]; if (!im) return null;
  const p = g.createPattern(im, 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix().scale(scale)); return (MATS.pat[id] = p);
}
