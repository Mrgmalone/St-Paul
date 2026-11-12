'use strict';
// Stronghold Destroyer — the ground repainted in the sheet's grass, meadow flowers, dirt road and river water.

// ---------- the ground, repainted with the sheet's grass, meadow, dirt road and river water ----------
// Runs once the materials have loaded. It uses its own dice, so the world itself (trees, rocks, start) never changes.
function paintTerrainArt() {
  if (!MATS.ready) return;
  const g = terrain.getContext('2d'), R = mulberry32(4242), RS = (a, b) => a + (b - a) * R();
  const pat = (k, s) => { const p = g.createPattern(MATS.img[k], 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix().scale(s)); return p; };
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  // 1. grass everywhere, with gentle light and dark drifts so it never looks tiled
  g.fillStyle = pat('grass', 0.55); g.fillRect(0, 0, MW, MH);
  const N = makeNoise(91), low = document.createElement('canvas'), LW = MW >> 4, LH = MH >> 4; low.width = LW; low.height = LH;
  const lg = low.getContext('2d'), im = lg.createImageData(LW, LH);
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const v = N(x / 14, y / 14) * 0.7 + N(x / 5 + 30, y / 5) * 0.3, o = (y * LW + x) * 4; if (v > 0.5) { im.data[o] = 255; im.data[o + 1] = 236; im.data[o + 2] = 170; im.data[o + 3] = (v - 0.5) * 120; } else { im.data[o] = 10; im.data[o + 1] = 24; im.data[o + 2] = 8; im.data[o + 3] = (0.5 - v) * 170; } }
  lg.putImageData(im, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(low, 0, 0, MW, MH);
  // 2. meadow flowers in patches, away from roads and camps
  const M = makeNoise(17);
  g.save(); g.beginPath();
  for (let i = 0; i < 160 * AF; i++) { const x = RS(0, MW), y = RS(0, MH); if (roadDist(x, y) < 60 || Math.hypot(x - CAMP.x, y - CAMP.y) < 260 || M(x / 300, y / 300) < 0.5) continue; g.moveTo(x + 60, y); g.ellipse(x, y, RS(30, 70), RS(22, 50), RS(0, 3), 0, Math.PI * 2); }
  g.clip(); g.globalAlpha = 0.85; g.fillStyle = pat('meadow', 0.5); g.fillRect(0, 0, MW, MH); g.restore();
  // 3. the camp clearing and the dirt roads
  g.save(); g.beginPath(); g.ellipse(CAMP.x - 30, CAMP.y + 20, 210, 150, 0, 0, Math.PI * 2); g.clip(); g.globalAlpha = 0.8; g.fillStyle = pat('dirt', 0.7); g.fillRect(0, 0, MW, MH); g.restore();
  for (const road of ROADS) {
    const path = () => { g.beginPath(); road.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    path(); g.strokeStyle = 'rgba(52,40,22,0.35)'; g.lineWidth = 58; g.stroke();
    path(); g.strokeStyle = pat('dirt', 0.6); g.lineWidth = 46; g.stroke();
    for (const off of [-9, 9]) { g.save(); g.translate(off * 0.35, off * 0.35); path(); g.strokeStyle = 'rgba(70,50,28,0.35)'; g.lineWidth = 3; g.stroke(); g.restore(); }
  }
  // the river: muddy banks and the sheet's water (the 3D view lays moving water and the stone bridges over this)
  if (RIVER.length) { const path = () => { g.beginPath(); RIVER.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); }; g.lineCap = 'butt'; g.lineJoin = 'round';
    path(); g.strokeStyle = 'rgba(84,70,44,0.8)'; g.lineWidth = RIVER_HALF * 2 + 26; g.stroke();
    path(); g.strokeStyle = pat('water', 0.6); g.lineWidth = RIVER_HALF * 2 + 6; g.stroke();
    path(); g.strokeStyle = 'rgba(10,40,70,0.25)'; g.lineWidth = RIVER_HALF * 2 + 6; g.stroke();
    for (const B of BRIDGES) { g.save(); g.translate(B.x, B.y); g.rotate(B.ang); g.fillStyle = '#8d8a83'; g.fillRect(-RIVER_HALF - 22, -59, RIVER_HALF * 2 + 44, 118); g.restore(); } }
  // 4. the pond: river water with a muddy, reedy shore
  if (pond) {
    g.save(); g.translate(pond.x, pond.y);
    g.fillStyle = 'rgba(84,70,44,0.75)'; g.beginPath(); g.ellipse(0, 0, pond.rx * 1.12, pond.ry * 1.12, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(0, 0, pond.rx, pond.ry, 0, 0, Math.PI * 2); g.fillStyle = pat('water', 0.6); g.fill();
    const wg = g.createRadialGradient(0, 0, 4, 0, 0, pond.rx); wg.addColorStop(0, 'rgba(10,40,70,0.25)'); wg.addColorStop(1, 'rgba(30,60,40,0.2)'); g.fillStyle = wg; g.fill();
    g.restore();
  }
  // 5. iron ground: rusty red and black earth round every iron deposit
  for (const r of rocks.filter(q => q.iron)) { const gr = g.createRadialGradient(r.x, r.y - 6, 4, r.x, r.y - 6, 70); gr.addColorStop(0, 'rgba(70,24,14,0.85)'); gr.addColorStop(0.5, 'rgba(120,48,24,0.5)'); gr.addColorStop(1, 'rgba(120,48,24,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(r.x, r.y - 6, 70, 52, 0, 0, Math.PI * 2); g.fill(); }
  // 6. rock and snow where the mountains rise, and hill shading (light from the north-west)
  const sc = document.createElement('canvas'); sc.width = EW; sc.height = EH; const sg = sc.getContext('2d'), si = sg.createImageData(EW, EH), sd = si.data;
  const rc = document.createElement('canvas'); rc.width = EW; rc.height = EH; const rg = rc.getContext('2d'), ri = rg.createImageData(EW, EH), rd = ri.data, RN = makeNoise(5);
  for (let j = 0; j < EH; j++) for (let i = 0; i < EW; i++) {
    const x = (i - 1) * EG, y = (j - 1) * EG, sh = clamp(((elevAt(x - EG, y - EG) - elevAt(x + EG, y + EG)) * 0.05), -0.75, 0.75), o = (j * EW + i) * 4;
    if (sh > 0) { sd[o] = 255; sd[o + 1] = 240; sd[o + 2] = 200; sd[o + 3] = sh * 95; } else { sd[o] = 12; sd[o + 1] = 16; sd[o + 2] = 10; sd[o + 3] = -sh * 230; }
    const m = mountAt(x, y), rk = clamp((m - 16) / 30, 0, 1), sn = clamp((m - 128) / 18, 0, 1), nv = RN(x / 40, y / 40), nv2 = RN(x / 13 + 9, y / 13);
    const base = [96 + nv * 30 + nv2 * 14, 92 + nv * 24 + nv2 * 12, 86 + nv * 18 + nv2 * 8];
    rd[o] = lerp(base[0], 236, sn); rd[o + 1] = lerp(base[1], 240, sn); rd[o + 2] = lerp(base[2], 246, sn); rd[o + 3] = rk * 235;
  }
  rg.putImageData(ri, 0, 0); sg.putImageData(si, 0, 0);
  g.drawImage(rc, -EG * 1.5, -EG * 1.5, EW * EG, EH * EG);
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.5; g.fillStyle = pat('brick_gray', 0.9);
  g.beginPath(); for (let n = 0; n < 2500; n++) { const x = RS(0, MW), y = RS(0, MH); if (mountAt(x, y) > 34) { g.moveTo(x + 20, y); g.ellipse(x, y, 20, 14, 0, 0, Math.PI * 2); } } g.fill(); g.restore();
  g.drawImage(sc, -EG * 1.5, -EG * 1.5, EW * EG, EH * EG);
  g.restore();
}
