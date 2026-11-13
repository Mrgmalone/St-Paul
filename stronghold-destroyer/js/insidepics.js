'use strict';
// Stronghold Destroyer — the still picture of the inside of a building, shown behind the top of its box.
// Drawn in code (no picture files); it changes as the castle grows: timber walls early, stone from the Hold, richer later.
const INSIDE = (() => {
  const cache = new Map(), W = 480, H = 190;
  const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const circ = (g, c, x, y, r) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const ell = (g, c, x, y, rx, ry) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  function room(g, lvl, warm) {
    if (lvl >= 3) {   // stone walls
      rect(g, '#5d5850', 0, 0, W, H);
      for (let r = 0; r < 7; r++) for (let c = 0; c < 9; c++) rect(g, (r + c) % 3 ? '#6e685e' : '#635d54', c * 56 + (r % 2) * 28 - 20, r * 22, 52, 19);
    } else {          // timber planks
      rect(g, '#6b4a2c', 0, 0, W, H);
      for (let c = 0; c < 20; c++) rect(g, c % 2 ? '#734f2f' : '#654428', c * 24, 0, 22, H);
    }
    rect(g, lvl >= 4 ? '#3e2a1a' : '#4a3420', 0, 22, W, 9);   // the beam
    // a window with daylight, and the floor
    rect(g, '#2b2016', 360, 44, 70, 62); const sky = g.createLinearGradient(0, 48, 0, 102); sky.addColorStop(0, '#bfe0ff'); sky.addColorStop(1, '#f4e6b8'); g.fillStyle = sky; g.fillRect(364, 48, 62, 54);
    rect(g, '#2b2016', 393, 48, 4, 54); rect(g, '#2b2016', 364, 73, 62, 4);
    rect(g, lvl >= 3 ? '#4b463f' : '#3b2a1a', 0, 140, W, 50);
    for (let i = 0; i < 12; i++) rect(g, 'rgba(0,0,0,0.12)', i * 42, 140, 2, 50);
    if (warm) { const glow = g.createRadialGradient(120, 120, 10, 120, 120, 220); glow.addColorStop(0, 'rgba(255,190,110,0.35)'); glow.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H); }
  }
  const barrel = (g, x, y) => { rect(g, '#7a5430', x, y, 30, 38); rect(g, '#3a2a1a', x, y + 6, 30, 4); rect(g, '#3a2a1a', x, y + 28, 30, 4); };
  const logs = (g, x, y, n) => { for (let r = 0; r < n; r++) for (let k = 0; k < n - r; k++) { circ(g, '#8a6236', x + k * 22 + r * 11, y - r * 18, 10); circ(g, '#c9a46a', x + k * 22 + r * 11, y - r * 18, 6); } };
  const sack = (g, x, y) => { ell(g, '#d8c69a', x, y, 14, 18); rect(g, '#a88a5a', x - 4, y - 20, 8, 5); };
  const animal = (g, x, y, col, s) => { ell(g, col, x, y, 26 * s, 14 * s); ell(g, col, x + 28 * s, y - 8 * s, 10 * s, 8 * s); for (const dx of [-14, -4, 8, 16]) rect(g, col, x + dx * s, y + 8 * s, 4 * s, 14 * s); };
  const anvil = (g, x, y) => { rect(g, '#3d3f42', x, y, 40, 12); rect(g, '#3d3f42', x + 12, y + 12, 16, 16); rect(g, '#2a2b2d', x + 6, y + 28, 28, 6); };
  const forge = (g, x, y) => { rect(g, '#5a524a', x, y, 70, 50); const f = g.createRadialGradient(x + 35, y + 30, 2, x + 35, y + 30, 26); f.addColorStop(0, '#ffe08a'); f.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = f; g.fillRect(x + 5, y + 8, 60, 40); };
  const table = (g, x, y, w) => { rect(g, '#7a5430', x, y, w, 8); rect(g, '#5a3a20', x + 6, y + 8, 6, 30); rect(g, '#5a3a20', x + w - 12, y + 8, 6, 30); };
  const shelf = (g, x, y, w) => rect(g, '#5a3a20', x, y, w, 6);
  const PROPS = {
    woodhut: (g, l) => { logs(g, 40, 150, 4); rect(g, '#9a7a4a', 150, 118, 60, 8); rect(g, '#cfd5da', 186, 96, 4, 26); /* saw horse and axe */ if (l >= 3) { anvil(g, 260, 118); forge(g, 300, 90); } },
    quarry: (g) => { for (let i = 0; i < 5; i++) rect(g, i % 2 ? '#a8a296' : '#948e84', 30 + i * 46, 118 - (i % 2) * 20, 42, 34); animal(g, 330, 140, '#7a5a3a', 0.9); },
    farm: (g) => { animal(g, 60, 140, '#f2ece0', 1); animal(g, 180, 145, '#5a3a24', 0.9); animal(g, 280, 155, '#e8b0b0', 0.6); for (let i = 0; i < 3; i++) { ell(g, '#f0e8d8', 330 + i * 24, 166, 8, 6); circ(g, '#d33', 336 + i * 24, 160, 2.5); } },
    stable: (g) => { for (let i = 0; i < 3; i++) rect(g, '#5a3a20', 20 + i * 110, 90, 8, 60); animal(g, 80, 132, '#6b4226', 1.1); rect(g, '#c9a648', 250, 128, 60, 24); },
    wheatfarm: (g) => { for (let i = 0; i < 6; i++) { rect(g, '#d8b450', 30 + i * 40, 100, 10, 50); rect(g, '#c09030', 26 + i * 40, 96, 18, 10); } sack(g, 300, 150); },
    mill: (g) => { circ(g, '#8f897e', 130, 120, 48); circ(g, '#6e685e', 130, 120, 12); sack(g, 240, 150); sack(g, 272, 150); },
    bakery: (g) => { g.fillStyle = '#6e685e'; g.beginPath(); g.arc(110, 150, 70, Math.PI, 0); g.fill(); ell(g, '#ff9a3a', 110, 140, 26, 16); table(g, 210, 120, 120); for (let i = 0; i < 5; i++) ell(g, '#c8893a', 228 + i * 22, 116, 10, 6); },
    granary: (g) => { for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) sack(g, 40 + i * 40 + r * 20, 152 - r * 30); },
    alehouse: (g) => { barrel(g, 30, 110); barrel(g, 64, 110); table(g, 170, 120, 140); for (let i = 0; i < 3; i++) { rect(g, '#d9b04a', 190 + i * 40, 104, 14, 16); rect(g, '#fff6e0', 190 + i * 40, 102, 14, 4); } },
    market: (g) => { const cols = ['#b8402e', '#2f63b0', '#3f8a3a']; cols.forEach((c, i) => { for (let k = 0; k < 6; k++) rect(g, k % 2 ? '#f1e6cf' : c, 20 + i * 110 + k * 16, 70, 16, 14); table(g, 20 + i * 110, 124, 96); for (let k = 0; k < 4; k++) circ(g, ['#c0392b', '#e0a040', '#8fb04a', '#7a5430'][k], 34 + i * 110 + k * 20, 118, 7); }); },
    school: (g) => { rect(g, '#2a3a2a', 40, 50, 160, 70); g.fillStyle = '#e8e8d8'; g.font = 'bold 28px serif'; g.fillText('A B C  1 2 3', 52, 96); for (let i = 0; i < 3; i++) table(g, 40 + i * 100, 138, 70); },
    engineerhut: (g) => { g.strokeStyle = '#8a6236'; g.lineWidth = 6; g.beginPath(); g.arc(100, 110, 30, 0, Math.PI * 2); g.stroke(); rect(g, '#e8dcc0', 180, 60, 120, 70); g.strokeStyle = '#3a5a8a'; g.lineWidth = 2; g.strokeRect(194, 72, 92, 46); table(g, 170, 140, 150); },
    apothecary: (g) => { for (let r = 0; r < 3; r++) { shelf(g, 30, 60 + r * 34, 260); for (let i = 0; i < 9; i++) rect(g, ['#5aa36a', '#7a5ab0', '#c9a14a', '#4a8ab0'][(i + r) % 4], 40 + i * 28, 40 + r * 34, 12, 20); } for (let i = 0; i < 4; i++) rect(g, '#5f8a3a', 300 + i * 10, 30, 3, 30); },
    chapel: (g) => { rect(g, '#c9a14a', 170, 46, 8, 60); rect(g, '#c9a14a', 152, 62, 44, 8); for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) rect(g, '#6b4a2a', 60 + i * 180, 128 + r * 24, 120, 10); },
    smithy: (g) => { forge(g, 40, 80); anvil(g, 170, 120); for (let i = 0; i < 4; i++) rect(g, '#cfd5da', 260 + i * 14, 60, 4, 50); },
    bowyer: (g) => { for (let i = 0; i < 4; i++) { g.strokeStyle = '#6b4422'; g.lineWidth = 4; g.beginPath(); g.arc(70 + i * 60, 90, 30, -Math.PI / 2, Math.PI / 2); g.stroke(); } table(g, 40, 140, 240); for (let i = 0; i < 6; i++) rect(g, '#f0f0f0', 60 + i * 30, 132, 3, 10); },
    poleturner: (g) => { for (let i = 0; i < 6; i++) { rect(g, '#7b5a34', 40 + i * 36, 40, 5, 100); rect(g, '#cfd5da', 38 + i * 36, 32, 9, 14); } },
    armory: (g) => { rect(g, '#5a3a20', 30, 60, 260, 8); for (let i = 0; i < 7; i++) rect(g, '#dfe5ea', 44 + i * 36, 68, 6, 64); ell(g, '#9b1c22', 330, 110, 26, 34); },
    brewery: (g) => { barrel(g, 30, 110); barrel(g, 64, 110); barrel(g, 47, 72); rect(g, '#9a6a3a', 170, 90, 90, 60); },
    tavern: (g) => { PROPS.alehouse(g); barrel(g, 330, 110); },
    hopfarm: (g) => { for (let i = 0; i < 6; i++) { rect(g, '#6b5030', 30 + i * 46, 40, 4, 110); ell(g, '#4f8a3a', 32 + i * 46, 90, 12, 30); } },
    vineyard: (g) => { for (let i = 0; i < 6; i++) { rect(g, '#6b5030', 30 + i * 46, 60, 4, 90); for (let k = 0; k < 5; k++) circ(g, '#5e3a78', 30 + i * 46 + (k % 2 ? 6 : -4), 90 + k * 8, 6); } },
    orchard: (g) => { for (let i = 0; i < 3; i++) { rect(g, '#6b4a2a', 60 + i * 110, 90, 10, 60); circ(g, '#2f6a2a', 65 + i * 110, 80, 36); for (let k = 0; k < 5; k++) circ(g, '#c0392b', 50 + i * 110 + k * 8, 70 + (k % 2) * 16, 5); } },
    stockpile: (g) => { logs(g, 40, 150, 3); for (let i = 0; i < 4; i++) rect(g, '#948e84', 200 + i * 34, 120, 30, 30); sack(g, 360, 150); },
    keep: (g, l) => { table(g, 60, 120, 220); rect(g, '#9b1c22', 300, 40, 50, 80); rect(g, '#d9a93a', 318, 60, 14, 30); }
  };
  PROPS.church = PROPS.abbey = PROPS.chapel; PROPS.ironmine = PROPS.quarry;
  function pic(kind, lvl) {
    if (!PROPS[kind]) return null;
    const key = kind + ':' + lvl; if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    room(g, lvl, ['bakery', 'smithy', 'alehouse', 'tavern', 'keep', 'chapel', 'church', 'abbey'].includes(kind));
    if (!isField(kind)) PROPS[kind](g, lvl); else { rect(g, '#7aa04a', 0, 120, W, 70); PROPS[kind](g, lvl); }
    const url = c.toDataURL('image/jpeg', 0.8); cache.set(key, url); return url;
  }
  let shownKey = '';
  // each frame: show the picture for the building whose box is open (nothing for other boxes)
  function update() {
    const p = document.getElementById('storePop'); if (!p) return;
    const b = storeShown, open = !p.hidden && b && b.x0 !== undefined && b.team === 'player' && !b.dead;
    const lvl = open ? (b.kind === 'keep' ? (b.stage || 1) : clamp(stageN, 1, 5)) : 0, key = open && PROPS[b.kind] ? b.kind + ':' + lvl : '';
    if (key === shownKey) return; shownKey = key;
    if (!key) { p.classList.remove('pic'); p.style.backgroundImage = ''; return; }
    const url = pic(b.kind, lvl); if (!url) return;
    p.classList.add('pic');
    p.style.backgroundImage = `linear-gradient(to bottom, rgba(24,17,10,0.05) 0, rgba(24,17,10,0.3) 140px, rgba(24,17,10,0.96) 215px), url(${url})`;
  }
  // the pictures still to be made by an artist (these are simple drawn stand-ins)
  const ART_NEEDED = Object.keys(PROPS);
  return { update, pic, ART_NEEDED };
})();
