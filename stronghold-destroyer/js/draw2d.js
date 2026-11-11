'use strict';
// Stronghold Destroyer — the flat view: people, building materials, scenery, trees, atmosphere.
// Loaded in order by index.html; all files share one global scope.

// ---------- drawing: people ----------
// Figures are drawn with real proportions: jointed legs and arms, a shaded face,
// mail and tabards for soldiers, cloaks, and a soft shadow on the ground.
const OUTLINE = 'rgba(22,15,10,0.6)';
const MAIL = '#8b9197';
function shade(c, k) { return k >= 0 ? mixHex(c, '#ffffff', k) : mixHex(c, '#000000', -k); }
function seg(g, x1, y1, x2, y2, w, col) {
  g.lineCap = 'round';
  g.strokeStyle = OUTLINE; g.lineWidth = w + 1; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}
function lookOf(u) {
  if (!u.look) u.look = { beard: Math.random() < 0.45, longHair: Math.random() < 0.35, w: 0.93 + Math.random() * 0.12, h: 0.96 + Math.random() * 0.08 };
  return u.look;
}
function drawLegPose(g, hx, hy, p, moving, pants, boot) {
  const thigh = moving ? Math.sin(p) * 0.55 : 0.04;
  const bend = moving ? Math.max(0, -Math.cos(p)) * 0.75 + 0.06 : 0.05;
  const kx = hx + Math.sin(thigh) * 6, ky = hy + Math.cos(thigh) * 6;
  const sa = thigh - bend, ax = kx + Math.sin(sa) * 6, ay = ky + Math.cos(sa) * 6;
  seg(g, hx, hy, kx, ky, 3.1, pants);
  seg(g, kx, ky, ax, ay, 2.7, pants);
  const bx = kx + (ax - kx) * 0.35, by = ky + (ay - ky) * 0.35;
  seg(g, bx, by, ax, ay, 2.9, boot);
  g.fillStyle = OUTLINE; g.beginPath(); g.ellipse(ax + 1.3, ay + 0.5, 2.6, 1.4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = boot; g.beginPath(); g.ellipse(ax + 1.3, ay + 0.4, 2.1, 1.0, 0, 0, Math.PI * 2); g.fill();
}
// upper arm + forearm from the shoulder; leaves the context at the hand, pointing along the forearm (+y)
function armFrame(g, sx, sy, ang, bend, sleeve, skin) {
  g.translate(sx, sy); g.rotate(-ang);
  seg(g, 0, 0, 0, 4.6, 2.9, sleeve);
  g.translate(0, 4.6); g.rotate(-bend);
  seg(g, 0, 0, 0, 2.4, 2.6, sleeve);
  seg(g, 0, 2.4, 0, 4.2, 2.2, skin);
  g.translate(0, 4.4);
  g.fillStyle = OUTLINE; g.beginPath(); g.arc(0, 0, 1.75, 0, Math.PI * 2); g.fill();
  g.fillStyle = skin; g.beginPath(); g.arc(0, 0, 1.3, 0, Math.PI * 2); g.fill();
}
function armTo(g, sx, sy, hx, hy, sleeve, skin) {
  const mx = (sx + hx) / 2, my = (sy + hy) / 2 + 1.6;
  seg(g, sx, sy, mx, my, 2.9, sleeve); seg(g, mx, my, hx, hy, 2.3, skin);
  g.fillStyle = OUTLINE; g.beginPath(); g.arc(hx, hy, 1.75, 0, Math.PI * 2); g.fill();
  g.fillStyle = skin; g.beginPath(); g.arc(hx, hy, 1.3, 0, Math.PI * 2); g.fill();
}
function drawTorso(g, u, P, hipY, sx, sy, lk) {
  const w = lk.w * (1 + (u.fat || 0) * 0.38), pal = u.pal, soldier = (swordish(u) || u.type === 'spear');
  const base = soldier ? MAIL : pal.tunic, bottom = soldier ? hipY + 1 : hipY + 3.8;
  const path = () => {
    g.beginPath(); g.moveTo(sx - 4.2 * w, sy + 0.8);
    g.quadraticCurveTo(sx - 4.6 * w, sy - 0.6, sx - 2.4 * w, sy - 0.9); g.lineTo(sx + 2.6 * w, sy - 0.9);
    g.quadraticCurveTo(sx + 4.8 * w, sy - 0.6, sx + 4.4 * w, sy + 0.8);
    g.lineTo(3.3 * w, hipY - 2.5); g.lineTo(4.1 * w, bottom); g.lineTo(-4.1 * w, bottom); g.lineTo(-3.3 * w, hipY - 2.5); g.closePath();
  };
  const gr = g.createLinearGradient(-4.5, 0, 4.5, 0);
  gr.addColorStop(0, P(shade(base, -0.3))); gr.addColorStop(0.55, P(base)); gr.addColorStop(1, P(shade(base, 0.2)));
  path(); g.fillStyle = gr; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.8; g.stroke();
  if (soldier) {
    // mail rings
    g.fillStyle = 'rgba(40,44,50,0.35)';
    for (let yy = sy + 0.6, row = 0; yy < hipY + 0.5; yy += 1.4, row++) for (let xx = -3.7; xx < 3.8; xx += 1.4) g.fillRect(xx + (row % 2 ? 0.7 : 0), yy, 0.6, 0.6);
    // tabard in the army's colours
    const tb = () => { g.beginPath(); g.moveTo(sx - 2.6 * w, sy - 0.3); g.lineTo(sx + 2.8 * w, sy - 0.3); g.lineTo(3.5 * w, hipY + 4.6); g.lineTo(-3.3 * w, hipY + 4.6); g.closePath(); };
    const tg = g.createLinearGradient(-3.5, 0, 3.5, 0);
    tg.addColorStop(0, P(shade(pal.tunic, -0.3))); tg.addColorStop(0.6, P(pal.tunic)); tg.addColorStop(1, P(shade(pal.tunic, 0.18)));
    tb(); g.fillStyle = tg; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.7; g.stroke();
    g.fillStyle = P(pal.trim); g.fillRect(-3.3 * w, hipY + 3.7, 6.8 * w, 0.8);
    g.beginPath(); g.moveTo(sx + 0.2, sy + 2.4); g.lineTo(sx + 1.6, sy + 4.1); g.lineTo(sx + 0.2, sy + 5.8); g.lineTo(sx - 1.2, sy + 4.1); g.closePath(); g.fill();
  } else if (u.type === 'archer') {
    // quilted padded coat
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.5;
    for (let yy = sy + 1.6; yy < bottom - 0.5; yy += 1.7) { g.beginPath(); g.moveTo(-3.6 * w, yy); g.lineTo(3.8 * w, yy); g.stroke(); }
  } else {
    // civilian: open collar
    g.fillStyle = P(shade(u.skin, -0.08)); g.beginPath(); g.moveTo(sx - 0.6, sy - 0.8); g.lineTo(sx + 1.6, sy - 0.8); g.lineTo(sx + 0.5, sy + 1.6); g.closePath(); g.fill();
  }
  // belt
  g.fillStyle = P(soldier ? '#4a3020' : u.type === 'civ' ? '#8a6a3a' : '#5a3a20'); g.fillRect(-3.7 * w, hipY - 2.9, 7.4 * w, 1.3);
  g.fillStyle = P('#c9a24a'); g.fillRect(1.0, hipY - 2.9, 1.2, 1.3);
}
function drawHead(g, u, P, hx, hy, lk) {
  const pal = u.pal, skin = u.skin, hair = u.hair || '#2a1a10', soldier = (swordish(u) || u.type === 'spear');
  if (!soldier) { // hair behind the head
    g.fillStyle = P(hair); g.beginPath(); g.ellipse(hx - 0.5, hy - 0.4, 3.4, 3.6, 0, 0, Math.PI * 2); g.fill();
    if (lk.longHair) seg(g, hx - 2.3, hy - 0.5, hx - 2.9, hy + 4.4, 2.4, P(hair));
  }
  g.fillStyle = OUTLINE; g.beginPath(); g.ellipse(hx, hy, 3.55, 3.95, 0, 0, Math.PI * 2); g.fill();
  const rg = g.createRadialGradient(hx + 0.9, hy - 1.2, 0.4, hx, hy, 4.2);
  rg.addColorStop(0, P(shade(skin, 0.18))); rg.addColorStop(0.6, P(skin)); rg.addColorStop(1, P(shade(skin, -0.28)));
  g.fillStyle = rg; g.beginPath(); g.ellipse(hx, hy, 3.05, 3.45, 0, 0, Math.PI * 2); g.fill();
  // nose, ear, eye, brow, mouth
  g.fillStyle = P(shade(skin, -0.12)); g.beginPath(); g.moveTo(hx + 2.7, hy - 0.7); g.lineTo(hx + 3.75, hy + 0.9); g.lineTo(hx + 2.7, hy + 1.15); g.closePath(); g.fill();
  g.fillStyle = P(shade(skin, -0.2)); g.beginPath(); g.ellipse(hx - 0.7, hy + 0.2, 0.75, 1.05, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2ede4'; g.beginPath(); g.ellipse(hx + 1.75, hy - 0.35, 0.68, 0.46, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#21160e'; g.beginPath(); g.arc(hx + 2.02, hy - 0.35, 0.37, 0, Math.PI * 2); g.fill();
  g.strokeStyle = P(hair); g.lineWidth = 0.55; g.beginPath(); g.moveTo(hx + 0.9, hy - 1.3); g.lineTo(hx + 2.7, hy - 1.15); g.stroke();
  g.strokeStyle = P(shade(skin, -0.4)); g.lineWidth = 0.4; g.beginPath(); g.moveTo(hx + 1.6, hy + 1.85); g.lineTo(hx + 2.6, hy + 1.75); g.stroke();
  if (lk.beard) {
    g.fillStyle = P(hair); g.beginPath(); g.moveTo(hx - 0.6, hy + 0.5);
    g.quadraticCurveTo(hx - 0.2, hy + 3.9, hx + 1.6, hy + 3.9); g.quadraticCurveTo(hx + 3.0, hy + 3.7, hx + 3.1, hy + 1.6);
    g.lineTo(hx + 2.7, hy + 2.3); g.quadraticCurveTo(hx + 1.6, hy + 1.4, hx + 0.6, hy + 1.6); g.closePath(); g.fill();
  }
  if (soldier) {
    // mail hood at the back of the neck, then a nasal helmet
    g.fillStyle = P(shade(MAIL, -0.1)); g.beginPath(); g.moveTo(hx - 3.6, hy - 0.6); g.lineTo(hx - 3.4, hy + 3.5);
    g.quadraticCurveTo(hx - 1.6, hy + 4.5, hx + 0.4, hy + 3.7); g.lineTo(hx + 0.3, hy + 0.2); g.closePath(); g.fill();
    const hm = pal.helmet, mg = g.createLinearGradient(hx - 3, hy - 5, hx + 3, hy);
    mg.addColorStop(0, P(shade(hm, 0.4))); mg.addColorStop(1, P(shade(hm, -0.25)));
    // a round bowl: a dome over the skull, a curved rim band and a rounded nose guard
    g.beginPath(); g.ellipse(hx + 0.05, hy - 0.6, 4.1, 4.7, 0, Math.PI, 0); g.quadraticCurveTo(hx + 0.05, hy + 0.5, hx - 4.05, hy - 0.6); g.closePath();
    g.fillStyle = mg; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(hx - 1.3, hy - 3.2, 1.3, 0.8, -0.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = P(pal.helmetDark); g.lineWidth = 0.9; g.beginPath(); g.ellipse(hx + 0.05, hy - 0.9, 4.05, 0.75, 0, 0, Math.PI); g.stroke();
    g.lineCap = 'round'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(hx + 3.3, hy - 0.8); g.lineTo(hx + 3.3, hy + 1.4); g.stroke();
    if (pal.plume) { g.strokeStyle = P(pal.plume); g.lineWidth = 1.1; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(hx + 0.2 - k * 0.6, hy - 5.2); g.quadraticCurveTo(hx - 2.5 - k, hy - 7.2 + k * 0.4, hx - 4.6 - k * 0.6, hy - 3.8 + k * 0.9); g.stroke(); } }
  } else if (u.type === 'archer') {
    const cap = '#6e4c2c';
    g.beginPath(); g.moveTo(hx - 3.7, hy - 0.7); g.quadraticCurveTo(hx - 3.2, hy - 4.8, hx + 0.6, hy - 4.6); g.quadraticCurveTo(hx + 3.9, hy - 3.9, hx + 3.7, hy - 1.1); g.closePath();
    g.fillStyle = P(cap); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.6; g.stroke();
    g.strokeStyle = P(pal.tunic); g.lineWidth = 0.9; g.beginPath(); g.moveTo(hx - 1.5, hy - 4.2); g.quadraticCurveTo(hx - 4, hy - 7, hx - 6, hy - 6.6); g.stroke(); // feather
  } else {
    // civilian cloth cap in the town's colour
    g.beginPath(); g.ellipse(hx - 0.1, hy - 2.6, 3.5, 2.3, 0, Math.PI, 0); g.closePath();
    g.fillStyle = P(u.team === 'enemy' ? ENEMY_COL : PAL.player.tunic); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.5; g.stroke();
    g.fillStyle = P(u.team === 'enemy' ? ENEMY_DARK : PAL.player.tunicDark); g.fillRect(hx - 3.6, hy - 2.8, 7.1, 0.9);
  }
}
function drawShield(g, u, P, x, y, kite) {
  const c = u.pal.shield, rim = u.pal.shieldRim;
  const gr = g.createLinearGradient(x - 3, y - 6, x + 3, y + 6); gr.addColorStop(0, P(shade(c, 0.25))); gr.addColorStop(1, P(shade(c, -0.32)));
  g.beginPath();
  if (kite) { g.moveTo(x - 3.3, y - 5.2); g.quadraticCurveTo(x, y - 6.5, x + 3.3, y - 5.2); g.quadraticCurveTo(x + 3.2, y + 1.6, x, y + 7.2); g.quadraticCurveTo(x - 3.2, y + 1.6, x - 3.3, y - 5.2); }
  else g.ellipse(x, y, 3.3, 5.0, 0, 0, Math.PI * 2);
  g.fillStyle = gr; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.4; g.stroke(); g.strokeStyle = P(rim); g.lineWidth = 0.7; g.stroke();
  g.fillStyle = P(rim);
  if (kite) { g.fillRect(x - 0.4, y - 5.3, 0.8, 11.5); g.fillRect(x - 2.9, y - 2.3, 5.8, 0.8); }
  g.fillStyle = P('#c9ced3'); g.beginPath(); g.arc(x, kite ? y - 1.9 : y, 1.0, 0, Math.PI * 2); g.fill();
}
function drawLoad(g, u, P) {
  if (u.carryType === 'stone' || u.carryType === 'iron') {   // pushing a wheelbarrow of stone
    g.fillStyle = P('#6b4a28'); g.beginPath(); g.moveTo(4, -14); g.lineTo(18, -14); g.lineTo(16, -8); g.lineTo(6, -8); g.closePath(); g.fill();
    g.fillStyle = P(u.carryType === 'iron' ? '#a0684a' : '#9a958c'); for (const [bx, by] of [[8, -16], [11.5, -16.5], [15, -16], [10, -18.5], [13.5, -18.8]]) { g.fillRect(bx - 1.6, by - 1.3, 3.2, 2.6); }
    g.strokeStyle = P('#4a3018'); g.lineWidth = 1.2; g.beginPath(); g.moveTo(5, -12); g.lineTo(-2, -10); g.stroke();
    g.fillStyle = P('#4a3018'); g.beginPath(); g.arc(17, -6, 2.6, 0, Math.PI * 2); g.fill();
    return;
  }
  if (u.carryType === 'hops' || u.carryType === 'wheat' || u.carryType === 'flour') { g.fillStyle = P('#c9b38a'); g.beginPath(); g.ellipse(-6, -24, 4, 5, 0.3, 0, Math.PI * 2); g.fill(); g.strokeStyle = P('#8a6a3a'); g.lineWidth = 0.7; g.stroke(); return; }
  if (u.carryType === 'food') { g.fillStyle = P('#8a6a3a'); rr(g, 2, -16, 8, 6, 2); g.fill(); g.fillStyle = P('#c0263a'); for (const [bx, by] of [[3.6, -16.4], [6, -17.2], [8.4, -16.4]]) { g.beginPath(); g.arc(bx, by, 1.5, 0, Math.PI * 2); g.fill(); } return; }
  if (u.carryType === 'wood') {
    for (let k = 0; k < 3; k++) { g.fillStyle = P(k % 2 ? '#6b4a28' : '#7d5830'); rr(g, -10, -23 + k * 3.4, 8, 3.2, 1.4); g.fill(); g.fillStyle = P('#c9a26a'); g.beginPath(); g.arc(-10, -21.4 + k * 3.4, 1.4, 0, Math.PI * 2); g.fill(); }
  } else {
    g.fillStyle = P('#8a6a3a'); rr(g, -11, -21, 7, 8, 2); g.fill();
    g.strokeStyle = P('#5e4626'); g.lineWidth = 0.8; g.beginPath(); g.moveTo(-11, -17); g.lineTo(-4, -17); g.stroke();
    g.fillStyle = P('#c0263a'); for (const [bx, by] of [[-9.5, -21.5], [-7.2, -22.4], [-5.2, -21.4]]) { g.beginPath(); g.arc(bx, by, 1.5, 0, Math.PI * 2); g.fill(); }
  }
}
function drawPerson(g, u, time) {
  const pal = u.pal, lk = lookOf(u);
  const fk = u.flash > 0 ? Math.min(1, u.flash * 1.4) * 0.8 : 0;
  const P = c => fk ? mixHex(c, '#ffffff', fk) : c;
  let alpha = 1;
  if (u.dead && u.deathT > 7) alpha = Math.max(0, 1 - (u.deathT - 7) / 3);
  if (alpha <= 0) return;
  g.save(); g.globalAlpha = alpha; g.translate(u.x, u.y - elev2D(u));
  // soft shadow
  g.save(); g.translate(u.dead ? -u.facing * 14 : 0, 1); g.scale(1, 0.36);
  const sr = u.dead ? 23 : 14, sg = g.createRadialGradient(0, 0, 0, 0, 0, sr);
  sg.addColorStop(0, 'rgba(0,0,0,0.42)'); sg.addColorStop(0.65, 'rgba(0,0,0,0.2)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg; g.beginPath(); g.arc(0, 0, sr, 0, Math.PI * 2); g.fill(); g.restore();
  const rk = u.poseK || 0, squash = u.pose === 'prone' ? 1 - 0.55 * rk : 1 - (u.pose === 'sit' ? 0.3 : u.pose === 'kneel' ? 0.18 : u.pose === 'crouch' ? 0.22 : 0) * rk;
  g.scale(u.facing * 1.35 * (lk.s || 1) * (u.pose === 'prone' ? 1 + 0.5 * rk : 1), 1.35 * lk.h * (lk.s || 1) * squash);
  if (u.dead) { let f = Math.min(1, u.deathT / 0.45); f = 1 - (1 - f) * (1 - f); g.rotate(-f * Math.PI / 2 * 0.94); }

  const moving = u.moving && !u.dead, ph = u.walkPhase;
  const bob = moving ? -Math.abs(Math.sin(ph)) * 0.9 : 0;   // standing still means still
  const hipY = -12 + bob, sx = moving ? 0.7 : 0, sy = hipY - 10.2;
  const soldier = (swordish(u) || u.type === 'spear');
  const sleeve = P(soldier ? MAIL : pal.tunic), skin = P(u.skin);
  const a = u.attackAnim;

  // cloak behind soldiers
  if (soldier) {
    const fl = moving ? Math.sin(ph * 0.5) * 1.1 - 1.4 : Math.sin(time * 1.3 + u.seed) * 0.4;
    g.fillStyle = P(shade(pal.tunicDark, -0.1)); g.beginPath(); g.moveTo(sx - 3.8, sy); g.lineTo(sx + 1.0, sy - 0.5);
    g.quadraticCurveTo(-1 + fl * 0.5, hipY, -0.5 + fl, hipY + 7); g.lineTo(-5.4 + fl, hipY + 6.4);
    g.quadraticCurveTo(-5.2 + fl * 0.4, hipY - 3, sx - 3.8, sy); g.closePath(); g.fill();
    g.strokeStyle = OUTLINE; g.lineWidth = 0.7; g.stroke();
  }
  // quiver on an archer's back
  if (u.type === 'archer') {
    g.save(); g.translate(sx - 4.5, sy + 2); g.rotate(-0.35);
    g.fillStyle = P('#6b4a28'); rr(g, -1.9, -2, 3.8, 10, 1); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.6; g.stroke();
    g.fillStyle = P('#e8e2d2'); g.fillRect(-1.6, -4.5, 0.8, 2.6); g.fillRect(0.3, -5, 0.8, 3.1); g.restore();
  }
  // back leg, back arm, front leg
  drawLegPose(g, -0.8, hipY, ph + Math.PI, moving, P(shade(pal.pants, -0.22)), P(shade(pal.boot, -0.2)));
  if (soldier) armTo(g, sx - 1.4, sy + 1.2, sx + 3.6, sy + 6.3, P(shade(MAIL, -0.2)), P(shade(u.skin, -0.2)));
  else if (!(u.type === 'archer' && (a > 0 || u.order === 'attack'))) {
    g.save(); armFrame(g, sx - 1.4, sy + 1.2, 0.3 - (moving ? Math.sin(ph) * 0.35 : 0), 0.3, P(shade(pal.tunic, -0.22)), P(shade(u.skin, -0.2))); g.restore();
  }
  drawLegPose(g, 0.8, hipY, ph, moving, P(pal.pants), P(pal.boot));
  if (u.type === 'civ' && u.carry > 0) { g.save(); g.translate(0, hipY + 12); drawLoad(g, u, P); g.restore(); }
  drawTorso(g, u, P, hipY, sx, sy, lk);
  seg(g, sx + 0.4, sy - 0.4, sx + 0.7, sy - 2, 2.2, skin);   // neck
  drawHead(g, u, P, sx + 0.9, sy - 4.6, lk);
  if (swordish(u)) drawShield(g, u, P, sx + 4.3, sy + 7, true);
  else if (u.type === 'spear') drawShield(g, u, P, sx + 4.3, sy + 6.6, false);

  // front arm and what it holds
  const shX = sx + 0.9, shY = sy + 1.1;
  if (u.type === 'civ') {
    const type = gearOf(u), working = u.sub === 'work' && (u.order === 'gather' || u.order === 'build' || u.order === 'craft');
    let ang;
    if ((type === 'wood' || type === 'build') && working && a > 0) ang = a < 0.5 ? lerp(0.5, -2.1, ease(a / 0.5)) : lerp(-2.1, 1.5, ease(Math.min(1, (a - 0.5) / 0.25)));
    else if (type === 'food' && working && a > 0) ang = 1.0 + Math.sin(a * Math.PI * 2) * 0.45;
    else ang = 0.35 + (moving ? Math.sin(ph) * 0.35 : 0);
    g.save(); armFrame(g, shX, shY, ang, 0.25, sleeve, skin);
    if (type === 'wood') {
      seg(g, 0, -2.2, 0, 10.3, 1.4, P('#6b4a28'));
      g.fillStyle = P('#b9c0c6'); g.beginPath(); g.moveTo(0.6, 5.8); g.lineTo(6, 4.2); g.lineTo(6.6, 10.4); g.lineTo(0.6, 9.4); g.closePath(); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.5; g.stroke();
    } else if (type === 'stone' && !(u.carry > 0 && !working)) {
      seg(g, 0, -2.2, 0, 10.3, 1.4, P('#6b4a28')); g.strokeStyle = P('#9aa1a8'); g.lineWidth = 1.6; g.beginPath(); g.moveTo(-4, 9.6); g.quadraticCurveTo(0, 8.2, 4.5, 9.8); g.stroke();
    } else if (type === 'grain' && !(u.carry > 0 && !working)) {
      seg(g, 0, -2.2, 0, 4, 1.2, P('#6b4a28')); g.strokeStyle = P('#c3cad1'); g.lineWidth = 1.1; g.beginPath(); g.arc(2.6, 5.4, 2.8, Math.PI * 0.9, Math.PI * 2.1); g.stroke();
    } else if (type === 'build') {
      seg(g, 0, -2.2, 0, 7.8, 1.4, P('#6b4a28'));
      g.fillStyle = P('#7d858c'); g.fillRect(-3, 6.3, 6.5, 3.4); g.strokeStyle = OUTLINE; g.lineWidth = 0.5; g.strokeRect(-3, 6.3, 6.5, 3.4);
    } else if (type === 'food' && !(u.carry > 0)) {
      g.fillStyle = P('#8a6a3a'); rr(g, -3.2, 0.3, 6.4, 5, 1.6); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.5; g.stroke();
      g.fillStyle = P('#c0263a'); g.beginPath(); g.arc(-1, 0.4, 1.2, 0, Math.PI * 2); g.arc(1.4, 0.2, 1.2, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  } else if (swordish(u)) {
    let ang;
    if (a > 0) {
      if (a < 0.42) ang = lerp(0.45, -2.35, ease(a / 0.42));
      else if (a < 0.68) ang = lerp(-2.35, 1.7, ease((a - 0.42) / 0.26));
      else ang = lerp(1.7, 0.45, ease((a - 0.68) / 0.32));
    } else ang = 0.42 + (moving ? Math.sin(ph) * 0.3 : 0);
    if (a > 0.45 && a < 0.72) {
      g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - Math.abs(a - 0.58) / 0.14)})`; g.lineWidth = 2;
      g.beginPath(); g.arc(shX, shY, 20, -Math.PI / 2 - 0.9, 0.2); g.stroke();
    }
    g.save(); armFrame(g, shX, shY, ang, a > 0 ? 0.12 : 0.4, sleeve, skin); g.rotate(-0.1);
    if (u.type === 'maceman') {   // a wooden haft with a flanged iron head, not a blade
      g.fillStyle = P('#6a4524'); g.fillRect(-0.75, -2.5, 1.5, 14.5);
      g.fillStyle = P('#3e2a16'); g.fillRect(-0.9, -2.5, 1.8, 2.2);
      const mg = g.createRadialGradient(-0.8, 12, 0.3, 0, 13, 3.2); mg.addColorStop(0, P('#e4e8eb')); mg.addColorStop(0.55, P('#8f979e')); mg.addColorStop(1, P('#4c535a'));
      g.fillStyle = mg; g.beginPath(); g.arc(0, 13, 2.7, 0, Math.PI * 2); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.5; g.stroke();
      g.fillStyle = P('#6f777e'); for (let k = 0; k < 4; k++) { const fa = k * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(Math.cos(fa) * 2.2, 13 + Math.sin(fa) * 2.2); g.lineTo(Math.cos(fa) * 4, 13 + Math.sin(fa) * 4); g.lineTo(Math.cos(fa + 0.5) * 2.4, 13 + Math.sin(fa + 0.5) * 2.4); g.closePath(); g.fill(); }
      g.restore();
    } else {
    g.fillStyle = P('#5a3a1e'); g.fillRect(-0.8, -2.5, 1.6, 2.6);
    g.fillStyle = P('#c9a24a'); g.fillRect(-3.2, 0, 6.4, 1.5);
    const bg = g.createLinearGradient(-1.1, 0, 1.1, 0); bg.addColorStop(0, P('#9aa3ab')); bg.addColorStop(0.5, P('#f2f5f7')); bg.addColorStop(1, P('#8a939b'));
    g.fillStyle = bg; g.beginPath(); g.moveTo(-1.1, 1.5); g.lineTo(1.1, 1.5); g.lineTo(0.7, 13.5); g.lineTo(0, 15.2); g.lineTo(-0.7, 13.5); g.closePath(); g.fill();
    g.strokeStyle = OUTLINE; g.lineWidth = 0.5; g.stroke();
    g.restore();
    }
  } else if (u.type === 'spear') {
    let thrust = 0;
    if (a > 0) thrust = a < 0.35 ? lerp(0, -5, ease(a / 0.35)) : a < 0.58 ? lerp(-5, 10, ease((a - 0.35) / 0.23)) : lerp(10, 0, ease((a - 0.58) / 0.42));
    const lowered = a > 0 || u.combatT > 0 || (u.order === 'attack' && !u.dead);
    if (lowered && !u.dead) {
      seg(g, -12 + thrust, sy + 7, 23 + thrust, sy + 2.5, 1.6, P('#7b5a34'));
      g.fillStyle = P('#d7dde2'); g.beginPath(); g.moveTo(22 + thrust, sy + 0.5); g.lineTo(30 + thrust, sy + 1.8); g.lineTo(22.4 + thrust, sy + 4.4); g.closePath(); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.5; g.stroke();
      armTo(g, shX, shY, 6 + thrust * 0.6, sy + 4.8, sleeve, skin);
    } else {
      seg(g, 7, 3, 7, -41, 1.6, P('#7b5a34'));
      g.fillStyle = P('#d7dde2'); g.beginPath(); g.moveTo(5.4, -40.5); g.lineTo(7, -49); g.lineTo(8.6, -40.5); g.closePath(); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.5; g.stroke();
      armTo(g, shX, shY, 7, sy + 5.6, sleeve, skin);
    }
  } else if (u.type === 'archer' && !u.dead) {
    const aiming = a > 0 || u.order === 'attack', pull = a > 0 && a < 0.55 ? ease(a / 0.55) * 5 : 0;
    if (aiming) {
      const hx = sx + 9, hy = sy + 3;
      armTo(g, sx - 1.2, sy + 1.4, hx - 4 - pull, hy, P(shade(pal.tunic, -0.15)), skin);   // drawing hand
      armTo(g, shX, shY, hx, hy, sleeve, skin);                                            // bow hand
      g.strokeStyle = OUTLINE; g.lineWidth = 2.6; g.beginPath(); g.arc(hx - 3, hy, 9, -1.15, 1.15); g.stroke();
      g.strokeStyle = P('#6b4422'); g.lineWidth = 1.7; g.beginPath(); g.arc(hx - 3, hy, 9, -1.15, 1.15); g.stroke();
      const ex = hx - 3 + 9 * Math.cos(1.15), ey = 9 * Math.sin(1.15);
      g.strokeStyle = 'rgba(235,230,215,0.9)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(ex, hy - ey); g.lineTo(ex - 4 - pull, hy); g.lineTo(ex, hy + ey); g.stroke();
      if (a > 0 && a < 0.55) { g.strokeStyle = '#4a321a'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(ex - 4 - pull, hy); g.lineTo(hx + 9, hy); g.stroke(); }
    } else {
      g.save(); armFrame(g, shX, shY, 0.35 + (moving ? Math.sin(ph) * 0.3 : 0), 0.3, sleeve, skin);
      g.strokeStyle = OUTLINE; g.lineWidth = 2.6; g.beginPath(); g.arc(-2, 0, 10, -1.2, 1.2); g.stroke();
      g.strokeStyle = P('#6b4422'); g.lineWidth = 1.7; g.beginPath(); g.arc(-2, 0, 10, -1.2, 1.2); g.stroke();
      g.restore();
    }
  }
  g.restore();
}

function drawRam(g, u, time) {
  let alpha = 1;
  if (u.dead && u.deathT > 7) alpha = Math.max(0, 1 - (u.deathT - 7) / 3);
  if (alpha <= 0) return;
  const fk = u.flash > 0 ? Math.min(1, u.flash * 1.4) * 0.7 : 0, P = c => fk ? mixHex(c, '#ffffff', fk) : c;
  g.save(); g.globalAlpha = alpha; g.translate(u.x, u.y);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 2, 26, 7, 0, 0, Math.PI * 2); g.fill();
  g.scale(u.facing, 1);
  if (u.dead) { // wrecked: scattered beams and a wheel
    for (const [x, y, a] of [[-14, -3, 0.3], [6, -1, -0.4], [-2, -7, 1.3], [16, -5, 0.1]]) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#5a3c20'; g.fillRect(-11, -2, 22, 4); g.restore(); }
    g.strokeStyle = '#3d2a17'; g.lineWidth = 2; g.beginPath(); g.ellipse(-4, 0, 6, 3, 0, 0, Math.PI * 2); g.stroke();
    g.restore(); return;
  }
  const a = u.attackAnim;
  const swing = a > 0 ? (a < 0.45 ? lerp(0, -7, ease(a / 0.45)) : a < 0.6 ? lerp(-7, 11, ease((a - 0.45) / 0.15)) : lerp(11, 0, ease((a - 0.6) / 0.4))) : 0;
  const team = u.team === 'player' ? PAL.player.tunic : ENEMY_COL;
  // the ram log poking out of the front, iron-capped with a pointed tip
  g.fillStyle = P('#5a3a1e'); g.fillRect(4 + swing, -22, 26, 7); g.fillStyle = P('#7a5a34'); g.fillRect(4 + swing, -22, 26, 2);
  g.fillStyle = P('#4d5359'); g.fillRect(28 + swing, -24, 6, 11); g.beginPath(); g.moveTo(34 + swing, -24); g.lineTo(39 + swing, -18.5); g.lineTo(34 + swing, -13); g.closePath(); g.fill();
  g.fillStyle = P('#80878e'); g.fillRect(28 + swing, -24, 6, 2.2);
  // chassis
  g.fillStyle = P('#4a3018'); g.fillRect(-25, -12, 50, 5); g.fillStyle = P('#6b4a28'); g.fillRect(-25, -12, 50, 1.6);
  // hide curtain down the side, with a ragged hem and stitched seams
  const cur = () => { g.beginPath(); g.moveTo(-23, -31); g.lineTo(23, -31); g.lineTo(23, -12); for (let x = 23; x >= -23; x -= 4) g.lineTo(x - 2, -11 + ((x * 7) % 3)); g.closePath(); };
  const cg = g.createLinearGradient(0, -31, 0, -11); cg.addColorStop(0, P('#7d5c3d')); cg.addColorStop(1, P('#5a402a'));
  fillPath(g, cur, cg);
  g.strokeStyle = 'rgba(30,18,8,0.55)'; g.lineWidth = 0.8; for (const x of [-12, 0, 12]) { g.beginPath(); g.moveTo(x, -31); g.lineTo(x + 0.6, -12); g.stroke(); }
  g.fillStyle = 'rgba(40,24,10,0.35)'; g.beginPath(); g.ellipse(-6, -21, 5, 3, 0.2, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(14, -24, 3.5, 2.2, -0.3, 0, Math.PI * 2); g.fill();
  // corner posts
  g.fillStyle = P('#5a3c20'); g.fillRect(-25, -32, 3.4, 22); g.fillRect(21.6, -32, 3.4, 22);
  // pitched roof of planks under wet hides
  const roof = () => { g.beginPath(); g.moveTo(-27, -30); g.lineTo(-21, -45); g.lineTo(21, -45); g.lineTo(27, -30); g.closePath(); };
  const rg = g.createLinearGradient(0, -45, 0, -30); rg.addColorStop(0, P('#9a7550')); rg.addColorStop(1, P('#6e5236'));
  fillPath(g, roof, rg);
  g.strokeStyle = 'rgba(40,25,12,0.45)'; g.lineWidth = 0.8; for (let k = -18; k <= 18; k += 6) { g.beginPath(); g.moveTo(k * 1.25, -30); g.lineTo(k, -45); g.stroke(); }
  g.fillStyle = P('#4a3018'); g.fillRect(-22, -46.5, 44, 2.4);
  roof(); g.strokeStyle = 'rgba(25,15,6,0.7)'; g.lineWidth = 1; g.stroke();
  // team pennant at the rear
  g.strokeStyle = '#3a2a18'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-16, -46); g.lineTo(-16, -60); g.stroke();
  g.fillStyle = P(team); g.beginPath(); g.moveTo(-16, -60); g.lineTo(-4, -57 + Math.sin(time * 6) * 1.2); g.lineTo(-16, -53); g.closePath(); g.fill();
  // three solid wheels with iron rims turn as it rolls
  for (const wx of [-16, 0, 16]) {
    g.fillStyle = P('#5a3c20'); g.beginPath(); g.arc(wx, -5, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = P('#3d4247'); g.lineWidth = 1.6; g.stroke();
    g.strokeStyle = P('#3a2614'); g.lineWidth = 1.1; g.beginPath();
    for (let k = 0; k < 2; k++) { const an = u.walkPhase * 0.6 + k * Math.PI / 2; g.moveTo(wx + Math.cos(an) * 5.4, -5 + Math.sin(an) * 5.4); g.lineTo(wx - Math.cos(an) * 5.4, -5 - Math.sin(an) * 5.4); }
    g.stroke(); g.fillStyle = P('#4d5359'); g.beginPath(); g.arc(wx, -5, 1.6, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
function drawOxCart(g, u, time) {
  let alpha = 1; if (u.dead && u.deathT > 7) alpha = Math.max(0, 1 - (u.deathT - 7) / 3); if (alpha <= 0) return;
  const fk = u.flash > 0 ? Math.min(1, u.flash * 1.4) * 0.7 : 0, P = c => fk ? mixHex(c, '#ffffff', fk) : c, ph = u.walkPhase || 0, mv = u.moving && !u.dead;
  g.save(); g.globalAlpha = alpha; g.translate(u.x, u.y); g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(0, 2, 34, 7, 0, 0, Math.PI * 2); g.fill(); g.scale(u.facing * 1.2, 1.2);
  // the ox
  g.fillStyle = P('#7a5a3a'); g.beginPath(); g.ellipse(14, -14, 11, 6.5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = P('#6a4a2e'); g.beginPath(); g.ellipse(26, -16, 4.6, 4, 0.3, 0, Math.PI * 2); g.fill();
  g.strokeStyle = P('#e8dcc0'); g.lineWidth = 1.2; g.beginPath(); g.moveTo(26, -19); g.quadraticCurveTo(29, -23, 31, -21); g.stroke();
  g.strokeStyle = P('#5a3c22'); g.lineWidth = 2; for (const [lx, o] of [[7, 0], [10, Math.PI], [18, Math.PI], [21, 0]]) { const sw = mv ? Math.sin(ph + o) * 2 : 0; g.beginPath(); g.moveTo(lx, -9); g.lineTo(lx + sw, -1); g.stroke(); }
  g.strokeStyle = P('#4a3018'); g.lineWidth = 1.5; g.beginPath(); g.moveTo(4, -15); g.lineTo(-6, -13); g.stroke();
  // the cart and its load of stone
  g.fillStyle = P('#6b4a28'); g.fillRect(-26, -20, 22, 9); g.fillStyle = P('#8a6a3a'); g.fillRect(-26, -20, 22, 2);
  if (u.carry > 0) { g.fillStyle = P('#9a958c'); for (let i = 0; i < Math.min(6, Math.ceil(u.carry / 4)); i++) g.fillRect(-24 + (i % 3) * 6.4, -25 - Math.floor(i / 3) * 4.5, 5.6, 4.6); }
  g.fillStyle = P('#4a3018'); g.beginPath(); g.arc(-15, -6, 6, 0, Math.PI * 2); g.fill(); g.strokeStyle = P('#8a6a48'); g.lineWidth = 1; g.beginPath(); const an = ph * 0.6; g.moveTo(-15 + Math.cos(an) * 5, -6 + Math.sin(an) * 5); g.lineTo(-15 - Math.cos(an) * 5, -6 - Math.sin(an) * 5); g.stroke();
  g.restore();
}
function drawMachine(g, u, time) { if (u.type === 'oxcart') { drawOxCart(g, u, time); return; } if (u.type === 'trebuchet') { g.save(); g.translate(u.x, u.y); g.scale(1.45, 1.45); g.translate(-u.x, -u.y); drawCatapult(g, u, time); g.restore(); return; } if (u.type === 'catapult') drawCatapult(g, u, time); else if (u.type === 'ballista') drawBallista(g, u, time); else drawRam(g, u, time); }
function machineArm(u) {   // catapult arm angle: 0 = cocked back, 1 = thrown upright
  const a = u.attackAnim; if (!(a > 0)) return 0;
  const k = a / u.animDur; return k < 0.5 ? 0 : k < 0.58 ? ease((k - 0.5) / 0.08) : 1 - ease((k - 0.58) / 0.42);
}
function drawCatapult(g, u, time) {
  let alpha = 1; if (u.dead && u.deathT > 7) alpha = Math.max(0, 1 - (u.deathT - 7) / 3); if (alpha <= 0) return;
  const fk = u.flash > 0 ? Math.min(1, u.flash * 1.4) * 0.7 : 0, P = c => fk ? mixHex(c, '#ffffff', fk) : c;
  g.save(); g.globalAlpha = alpha; g.translate(u.x, u.y);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 2, 28, 7, 0, 0, Math.PI * 2); g.fill();
  g.scale(u.facing * 1.25, 1.25);
  if (u.dead) { for (const [x, y, a] of [[-12, -3, 0.2], [8, -2, -0.5], [0, -6, 1.2]]) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#5a3c20'; g.fillRect(-12, -2, 24, 4); g.restore(); } g.restore(); return; }
  const team = u.team === 'player' ? PAL.player.tunic : ENEMY_COL;
  g.fillStyle = P('#4a3018'); g.fillRect(-24, -12, 48, 5); g.fillStyle = P('#6b4a28'); g.fillRect(-24, -12, 48, 1.6);
  // uprights and the crossbar the arm strikes
  g.fillStyle = P('#5a3c20'); g.beginPath(); g.moveTo(4, -10); g.lineTo(10, -40); g.lineTo(14, -40); g.lineTo(12, -10); g.closePath(); g.fill();
  g.fillRect(6, -42, 12, 4);
  // torsion bundle and throwing arm
  g.fillStyle = P('#b49464'); g.beginPath(); g.ellipse(-12, -14, 5, 4, 0, 0, Math.PI * 2); g.fill();
  const ang = lerp(-0.12, -1.38, machineArm(u));
  g.save(); g.translate(-12, -14); g.rotate(Math.PI + ang * -1);
  g.fillStyle = P('#6b4a28'); g.fillRect(0, -2, 34, 4);
  g.fillStyle = P('#3a2614'); g.beginPath(); g.ellipse(34, -2, 5.5, 3.6, 0, 0, Math.PI * 2); g.fill();
  if (!(u.attackAnim > 0) || u.attackAnim / u.animDur < 0.5) { g.fillStyle = P('#8f897e'); g.beginPath(); g.arc(34, -4, 3.4, 0, Math.PI * 2); g.fill(); }
  g.restore();
  g.strokeStyle = '#3a2a18'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-20, -12); g.lineTo(-20, -30); g.stroke();
  g.fillStyle = P(team); g.beginPath(); g.moveTo(-20, -30); g.lineTo(-10, -27.5 + Math.sin(time * 6)); g.lineTo(-20, -24.5); g.closePath(); g.fill();
  for (const wx of [-15, 15]) { g.fillStyle = P('#5a3c20'); g.beginPath(); g.arc(wx, -5, 6, 0, Math.PI * 2); g.fill(); g.strokeStyle = P('#3d4247'); g.lineWidth = 1.4; g.stroke();
    g.strokeStyle = P('#3a2614'); g.lineWidth = 1; g.beginPath(); const an = u.walkPhase * 0.6; g.moveTo(wx + Math.cos(an) * 5, -5 + Math.sin(an) * 5); g.lineTo(wx - Math.cos(an) * 5, -5 - Math.sin(an) * 5); g.stroke(); }
  g.restore();
}
function drawBallista(g, u, time) {
  let alpha = 1; if (u.dead && u.deathT > 7) alpha = Math.max(0, 1 - (u.deathT - 7) / 3); if (alpha <= 0) return;
  const fk = u.flash > 0 ? Math.min(1, u.flash * 1.4) * 0.7 : 0, P = c => fk ? mixHex(c, '#ffffff', fk) : c;
  g.save(); g.globalAlpha = alpha; g.translate(u.x, u.y);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 2, 24, 6, 0, 0, Math.PI * 2); g.fill();
  g.scale(u.facing * 1.25, 1.25);
  if (u.dead) { for (const [x, y, a] of [[-10, -3, 0.3], [8, -2, -0.4]]) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#5a3c20'; g.fillRect(-11, -2, 22, 4); g.restore(); } g.restore(); return; }
  const team = u.team === 'player' ? PAL.player.tunic : ENEMY_COL, fired = u.attackAnim > 0 && u.attackAnim / u.animDur > 0.45;
  g.fillStyle = P('#4a3018'); g.beginPath(); g.moveTo(-22, -6); g.lineTo(6, -10); g.lineTo(6, -6); g.lineTo(-22, -2); g.closePath(); g.fill();   // trail
  g.fillStyle = P('#5a3c20'); g.fillRect(-2, -26, 4, 18);   // stand
  g.save(); g.translate(0, -27); g.rotate(-0.06);
  g.fillStyle = P('#6b4a28'); g.fillRect(-18, -2.5, 36, 5); g.fillStyle = P('#8a6a3a'); g.fillRect(-18, -2.5, 36, 1.5);
  // bow arms and string
  g.strokeStyle = P('#4a3018'); g.lineWidth = 2.6; g.beginPath(); g.moveTo(14, 0); g.quadraticCurveTo(10, -12, 4, -17); g.moveTo(14, 0); g.quadraticCurveTo(10, 12, 4, 17); g.stroke();
  const sx = fired ? 11 : -6; g.strokeStyle = '#e8e0c8'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(4, -17); g.lineTo(sx, 0); g.lineTo(4, 17); g.stroke();
  if (!fired) { g.fillStyle = P('#3a2614'); g.fillRect(-6, -1.2, 26, 2.4); g.fillStyle = P('#80878e'); g.beginPath(); g.moveTo(20, -2.6); g.lineTo(25, 0); g.lineTo(20, 2.6); g.closePath(); g.fill(); }
  g.restore();
  g.strokeStyle = '#3a2a18'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-18, -4); g.lineTo(-18, -24); g.stroke();
  g.fillStyle = P(team); g.beginPath(); g.moveTo(-18, -24); g.lineTo(-9, -21.5 + Math.sin(time * 6)); g.lineTo(-18, -19); g.closePath(); g.fill();
  g.fillStyle = P('#5a3c20'); g.beginPath(); g.arc(2, -5, 5.5, 0, Math.PI * 2); g.fill(); g.strokeStyle = P('#3d4247'); g.lineWidth = 1.3; g.stroke();
  g.restore();
}
function drawBush(g, b) {
  const x = b.x, y = b.y;
  softShadow(g, x + 5, y + 1, 18, 6, 0.38);
  const cl = [[-7, -6, 6.5], [7, -6, 6.5], [0, -12, 7.5], [-4, -3, 5.5], [4, -3, 5.5], [-9, -10, 4.5], [9, -11, 4.5], [2, -16, 4.5]];
  g.fillStyle = '#1f3c18'; for (const [bx, by, br] of cl) { g.beginPath(); g.arc(x + bx + 0.8, y + by + 1, br + 1.2, 0, Math.PI * 2); g.fill(); }
  for (const [bx, by, br] of cl) {
    const l = clamp(0.5 - bx / 12 * 0.35 - (by + 8) / 10 * 0.45, 0, 1);
    g.fillStyle = mixHex('#2f5a24', '#6f9f45', l); g.beginPath(); g.arc(x + bx, y + by, br, 0, Math.PI * 2); g.fill();
    if (l > 0.5) { g.fillStyle = mixHex('#6f9f45', '#a2c86a', (l - 0.5) * 2); g.beginPath(); g.arc(x + bx - br * 0.3, y + by - br * 0.3, br * 0.42, 0, Math.PI * 2); g.fill(); }
  }
  const n = Math.ceil(b.amount / 12);
  for (let i = 0; i < n; i++) {
    const a = b.seed + i * 2.39996, r = 3 + (i * 7 % 9);
    const bx = x + Math.cos(a) * r * 1.2, by = y - 8 + Math.sin(a) * r * 0.7;
    g.fillStyle = '#5a0c18'; g.beginPath(); g.arc(bx + 0.3, by + 0.3, 1.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c41a34'; g.beginPath(); g.arc(bx, by, 1.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillRect(bx - 0.7, by - 0.9, 0.7, 0.7);
  }
}
function drawStump(g, t) {
  const s = t.s;
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(t.x + 2, t.y + 2, 7 * s, 3 * s, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4e341b'; g.fillRect(t.x - 4 * s, t.y - 4 * s, 8 * s, 5 * s);
  g.fillStyle = '#b08a58'; g.beginPath(); g.ellipse(t.x, t.y - 4 * s, 4 * s, 1.8 * s, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#7d5f38'; g.lineWidth = 0.6; g.beginPath(); g.ellipse(t.x, t.y - 4 * s, 2 * s, 0.9 * s, 0, 0, Math.PI * 2); g.stroke();
}
// ---------- building materials: seamless textures, lit from the upper left ----------
let MAT = null;
function mats() {
  if (MAT) return MAT;
  const mk = (w, h, paint) => {
    const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
    const g = c.getContext('2d'); g.scale(2, 2); paint(g, w, h);
    const p = ctx.createPattern(c, 'repeat'); p._canvas = c; try { p.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0])); } catch (e) {}
    return p;
  };
  const Rn = mulberry32(4242);
  const stone = (base, mortar) => (g, w, h) => {
    g.fillStyle = mortar; g.fillRect(0, 0, w, h);
    const rows = [[0, [17, 15, 16]], [9, [16, 17, 15]], [4, [15, 18, 15]]];
    rows.forEach(([off, ws], r) => {
      const y = r * 12; let x = -off, k = 0;
      while (x < w) {
        const bw = ws[k++ % ws.length], col = mixHex(base, Rn() < 0.5 ? '#000000' : '#ffffff', Rn() * 0.14);
        for (const sx of [x, x + w, x - w]) {
          g.fillStyle = col; rr(g, sx + 0.7, y + 0.7, bw - 1.4, 10.6, 1.6); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(sx + 1.2, y + 0.9, bw - 2.4, 1.2);
          g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(sx + 1.2, y + 9.8, bw - 2.4, 1.3); g.fillRect(sx + bw - 1.9, y + 1.5, 1, 9);
        }
        for (let n = 0; n < 6; n++) { g.fillStyle = Rn() < 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)'; g.fillRect(((x + Rn() * bw) % w + w) % w, y + 1.5 + Rn() * 8.5, 0.8, 0.8); }
        x += bw;
      }
    });
  };
  const stone2 = (base, mortar) => (g, w, h) => {
    g.fillStyle = mortar; g.fillRect(0, 0, w, h);
    const tints = ['#000000', '#ffffff', '#6a5a3a', '#4a5a6a', '#7a6a4a'];
    const rowsH = [11, 13, 10, 14, 12, 12];   // courses of different heights, adding up to the tile height
    let y = 0;
    rowsH.forEach((rh, r) => {
      const widths = []; let sum = 0; while (sum < w) { const bw = 11 + Math.floor(Rn() * 17); widths.push(bw); sum += bw; } widths[widths.length - 1] -= sum - w;
      let x = Math.floor(Rn() * 14);
      for (const bw of widths) {
        const col = mixHex(base, tints[Math.floor(Rn() * tints.length)], 0.05 + Rn() * 0.16), j = () => (Rn() - 0.5) * 1.2;
        for (const sx of [x, x - w, x + w]) {
          const x0 = sx + 0.8, y0 = y + 0.8, x1 = sx + bw - 0.8, y1 = y + rh - 0.8;
          g.beginPath(); g.moveTo(x0 + 1.2 + j(), y0 + j() * 0.5); g.lineTo(x1 - 1 + j(), y0 + j() * 0.5); g.lineTo(x1 + j() * 0.4, y0 + 1.6); g.lineTo(x1 + j() * 0.4, y1 - 1.4); g.lineTo(x1 - 1.4 + j(), y1 + j() * 0.4); g.lineTo(x0 + 1.4 + j(), y1 + j() * 0.4); g.lineTo(x0 + j() * 0.4, y1 - 1.6); g.lineTo(x0 + j() * 0.4, y0 + 1.4); g.closePath();
          const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, mixHex(col, '#ffffff', 0.12)); gr.addColorStop(0.55, col); gr.addColorStop(1, mixHex(col, '#000000', 0.22));
          g.fillStyle = gr; g.fill();
          g.strokeStyle = 'rgba(255,250,235,0.18)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x0 + 1.5, y0 + 0.6); g.lineTo(x1 - 1.5, y0 + 0.6); g.stroke();
        }
        // pits, grain, the odd crack and chip, damp and lichen on some faces
        for (let n = 0; n < 10; n++) { g.fillStyle = Rn() < 0.55 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.10)'; const px = ((x + 1 + Rn() * (bw - 2)) % w + w) % w; g.fillRect(px, y + 1.5 + Rn() * (rh - 3), 0.6 + Rn() * 0.9, 0.6 + Rn() * 0.7); }
        if (Rn() < 0.22) { g.strokeStyle = 'rgba(30,26,20,0.45)'; g.lineWidth = 0.5; const cx = ((x + 3 + Rn() * (bw - 6)) % w + w) % w; g.beginPath(); g.moveTo(cx, y + 1.5); g.lineTo(cx + (Rn() - 0.5) * 4, y + rh * 0.5); g.lineTo(cx + (Rn() - 0.5) * 5, y + rh - 1.5); g.stroke(); }
        if (Rn() < 0.18) { g.fillStyle = 'rgba(60,50,38,0.35)'; g.beginPath(); g.arc(((x + bw - 2) % w + w) % w, y + 2, 1.8, 0, Math.PI * 2); g.fill(); }
        if (Rn() < 0.12) { g.fillStyle = 'rgba(70,90,40,0.22)'; g.fillRect(((x + 1) % w + w) % w, y + rh * 0.55, bw * 0.6, rh * 0.4); }
        x += bw;
      }
      y += rh;
    });
    // soft overall weathering so no two tiles read as copies
    for (let n = 0; n < 26; n++) { const gx = Rn() * w, gy = Rn() * h, rr2 = 4 + Rn() * 10, gr = g.createRadialGradient(gx, gy, 0, gx, gy, rr2); gr.addColorStop(0, Rn() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,245,220,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(gx - rr2, gy - rr2, rr2 * 2, rr2 * 2); }
  };
  const wood = (vertical) => (g, w, h) => {
    const L = vertical ? h : w, n = 3, pw = (vertical ? w : h) / n;
    for (let i = 0; i < n; i++) {
      const col = mixHex('#7a5430', Rn() < 0.5 ? '#000000' : '#ffffff', Rn() * 0.16);
      g.fillStyle = col; vertical ? g.fillRect(i * pw, 0, pw, h) : g.fillRect(0, i * pw, w, pw);
      g.strokeStyle = 'rgba(40,24,10,0.35)'; g.lineWidth = 0.5;
      for (let k = 0; k < 4; k++) {
        const o = i * pw + 1.2 + k * (pw - 2.4) / 3, ph = Rn() * 6; g.beginPath();
        for (let t = 0; t <= L; t += 2) { const a = o + Math.sin(t / 7 + ph) * 0.6; vertical ? (t ? g.lineTo(a, t) : g.moveTo(a, t)) : (t ? g.lineTo(t, a) : g.moveTo(t, a)); }
        g.stroke();
      }
      if (Rn() < 0.7) { const kp = Rn() * (L - 8) + 4, ko = i * pw + pw / 2; g.fillStyle = 'rgba(40,22,8,0.55)'; g.beginPath(); vertical ? g.ellipse(ko, kp, 1.1, 1.8, 0, 0, Math.PI * 2) : g.ellipse(kp, ko, 1.8, 1.1, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(25,14,6,0.55)'; vertical ? g.fillRect(i * pw, 0, 0.8, h) : g.fillRect(0, i * pw, w, 0.8);
    }
  };
  MAT = {
    stone: mk(96, 72, stone2('#a8a193', '#5e584f')),
    stoneDark: mk(96, 72, stone2('#7e786d', '#45413b')),
    woodV: mk(24, 64, wood(true)),
    woodH: mk(64, 24, wood(false)),
    thatch: mk(32, 24, (g, w, h) => {
      g.fillStyle = '#a7843f'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const x = Rn() * w, y = Rn() * h, l = 3 + Rn() * 5;
        g.strokeStyle = Rn() < 0.5 ? 'rgba(220,190,120,0.7)' : 'rgba(110,80,34,0.65)'; g.lineWidth = 0.6;
        for (const ox of [0, w, -w]) for (const oy of [0, h, -h]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox - l * 0.35, y + oy + l); g.stroke(); }
      }
      g.fillStyle = 'rgba(80,56,22,0.35)'; for (let y = 7; y < h; y += 8) g.fillRect(0, y, w, 1.2);
    }),
    plaster: mk(40, 40, (g, w, h) => {
      g.fillStyle = '#ddcfa9'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) { const x = Rn() * w, y = Rn() * h, r = 3 + Rn() * 7; g.fillStyle = Rn() < 0.5 ? 'rgba(160,140,100,0.12)' : 'rgba(255,250,235,0.14)'; for (const ox of [0, w, -w]) for (const oy of [0, h, -h]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, Math.PI * 2); g.fill(); } }
      for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(90,70,40,0.18)'; g.fillRect(Rn() * w, Rn() * h, 0.7, 0.7); }
    }),
    soil: mk(32, 16, (g, w, h) => {
      g.fillStyle = '#6b5233'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { g.fillStyle = Rn() < 0.5 ? 'rgba(40,28,14,0.35)' : 'rgba(150,120,80,0.3)'; g.fillRect(Rn() * w, Rn() * h, 1, 1); }
      g.fillStyle = 'rgba(30,20,10,0.35)'; g.fillRect(0, 6, w, 2); g.fillStyle = 'rgba(160,130,90,0.25)'; g.fillRect(0, 5, w, 1); g.fillRect(0, 13, w, 1);
    })
  };
  return MAT;
}
// sunlight across a face, darker in shade, grime at the base
function lightFace(g, x, y, w, h, shadeSide) {
  const gr = g.createLinearGradient(x, y, x + w, y + h * 0.3);
  if (shadeSide) { gr.addColorStop(0, 'rgba(0,0,0,0.36)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)'); }
  else { gr.addColorStop(0, 'rgba(255,236,196,0.18)'); gr.addColorStop(0.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.18)'); }
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  const ah = Math.min(16, h * 0.4), ao = g.createLinearGradient(0, y + h - ah, 0, y + h);
  ao.addColorStop(0, 'rgba(30,24,16,0)'); ao.addColorStop(1, 'rgba(30,24,16,0.42)'); g.fillStyle = ao; g.fillRect(x, y + h - ah, w, ah);
}
function fillPath(g, path, style) { path(); g.fillStyle = style; g.fill(); }
function roundLog(g, path, x, w) { // makes a plank or post read as a round log
  const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, 'rgba(255,230,190,0.22)'); gr.addColorStop(0.45, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.42)');
  fillPath(g, path, gr); path(); g.strokeStyle = 'rgba(25,14,6,0.6)'; g.lineWidth = 0.8; g.stroke();
}
function merlons(g, M, x0, y, n, step, mw, mh) {
  for (let k = 0; k < n; k++) {
    const mx = x0 + k * step;
    g.fillStyle = M.stone; g.fillRect(mx, y, mw, mh);
    g.fillStyle = 'rgba(255,240,210,0.22)'; g.fillRect(mx, y, mw, 1.5);
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.fillRect(mx + mw - 2, y, 2, mh);
    g.strokeStyle = 'rgba(30,26,20,0.5)'; g.lineWidth = 0.6; g.strokeRect(mx, y, mw, mh);
  }
}
function flashOver(g, fk, x, y, w, h) { if (fk) { g.fillStyle = `rgba(255,255,255,${fk * 0.55})`; g.fillRect(x, y, w, h); } }
function mossAt(g, x, y, w, seed) {
  const Rm = mulberry32(seed);
  for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(${70 + Rm() * 30 | 0},${100 + Rm() * 30 | 0},46,0.45)`; g.beginPath(); g.ellipse(x + Rm() * w, y - Rm() * 4, 2 + Rm() * 4, 1.2 + Rm() * 1.6, 0, 0, Math.PI * 2); g.fill(); }
}
function drawLookoutArcher(g, P, ax, ay, dir, drawT, tunic, helmet, plume, skin) {
  g.fillStyle = P(tunic); rr(g, ax - 5, ay - 9, 10, 11, 2); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 0.6; g.stroke();
  g.fillStyle = P(skin); g.beginPath(); g.arc(ax, ay - 13, 4.2, 0, Math.PI * 2); g.fill(); g.strokeStyle = OUTLINE; g.stroke();
  const hg = g.createLinearGradient(ax - 4, ay - 19, ax + 4, ay - 13); hg.addColorStop(0, P(shade(helmet, 0.35))); hg.addColorStop(1, P(shade(helmet, -0.25)));
  g.fillStyle = hg; g.beginPath(); g.arc(ax, ay - 13.8, 4.9, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
  if (plume) { g.fillStyle = P(plume); g.beginPath(); g.ellipse(ax - 1, ay - 19.5, 1.7, 3, -0.5, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#21160e'; g.beginPath(); g.arc(ax + dir * 2, ay - 13, 0.5, 0, Math.PI * 2); g.fill();
  const bx = ax + dir * 4, pull = drawT > 0 ? 3 : 0;
  g.strokeStyle = OUTLINE; g.lineWidth = 2.5; g.beginPath();
  if (dir > 0) g.arc(bx, ay - 8, 8, -1.15, 1.15); else g.arc(bx, ay - 8, 8, Math.PI - 1.15, Math.PI + 1.15); g.stroke();
  g.strokeStyle = '#6b4422'; g.lineWidth = 1.6; g.beginPath();
  if (dir > 0) g.arc(bx, ay - 8, 8, -1.15, 1.15); else g.arc(bx, ay - 8, 8, Math.PI - 1.15, Math.PI + 1.15); g.stroke();
  const ex = bx + dir * 8 * Math.cos(1.15);
  g.strokeStyle = 'rgba(235,230,215,0.9)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(ex, ay - 15.3); g.lineTo(ex - dir * pull, ay - 8); g.lineTo(ex, ay - 0.7); g.stroke();
}
function drawBanner(g, P, x, y, len, h, col, t, stripe) {
  g.strokeStyle = '#2e2014'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - len); g.stroke();
  g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(x, y - len - 1, 1.4, 0, Math.PI * 2); g.fill();
  const top = y - len, wv = k => Math.sin(t * 5 + k * 0.7) * 1.8;
  const path = () => { g.beginPath(); g.moveTo(x, top); for (let k = 0; k <= 9; k++) g.lineTo(x + k * 2.8, top + wv(k)); for (let k = 9; k >= 0; k--) g.lineTo(x + k * 2.8, top + h + wv(k)); g.closePath(); };
  fillPath(g, path, P(col));
  const sg = g.createLinearGradient(x, 0, x + 26, 0); for (let k = 0; k <= 4; k++) sg.addColorStop(k / 4, k % 2 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.12)');
  fillPath(g, path, sg); path(); g.strokeStyle = OUTLINE; g.lineWidth = 0.6; g.stroke();
  if (stripe) { g.fillStyle = P(stripe); g.fillRect(x + 6, top + 2 + wv(2), 3, h - 4); }
}
function drawArchDoor(g, M, P, cx, gy, hw, hgt) {
  const door = () => { g.beginPath(); g.moveTo(cx - hw, gy); g.lineTo(cx - hw, gy - hgt); g.arc(cx, gy - hgt, hw, Math.PI, 0); g.lineTo(cx + hw, gy); g.closePath(); };
  fillPath(g, door, M.woodV); fillPath(g, door, 'rgba(20,12,6,0.32)');
  const dg = g.createLinearGradient(cx - hw, 0, cx + hw, 0); dg.addColorStop(0, 'rgba(255,220,170,0.14)'); dg.addColorStop(1, 'rgba(0,0,0,0.3)'); fillPath(g, door, dg);
  g.fillStyle = '#2b2824';
  for (const yy of [gy - hgt * 0.35, gy - hgt * 1.0]) { g.fillRect(cx - hw, yy, hw * 2, 1.8); for (let x = cx - hw + 2; x < cx + hw; x += 4) { g.fillStyle = '#5d5953'; g.fillRect(x, yy + 0.4, 1, 1); g.fillStyle = '#2b2824'; } }
  g.fillStyle = '#1b1712'; g.beginPath(); g.arc(cx + hw * 0.55, gy - hgt * 0.65, 1.1, 0, Math.PI * 2); g.fill();
  // stone arch
  for (let i = 0; i < 7; i++) {
    const a0 = Math.PI + i * Math.PI / 7, a1 = a0 + Math.PI / 7 - 0.04;
    g.beginPath(); g.arc(cx, gy - hgt, hw + 4, a0, a1); g.arc(cx, gy - hgt, hw, a1, a0, true); g.closePath();
    g.fillStyle = M.stone; g.fill(); g.fillStyle = i % 2 ? 'rgba(255,240,210,0.12)' : 'rgba(0,0,0,0.12)'; g.fill();
    g.strokeStyle = 'rgba(30,26,20,0.6)'; g.lineWidth = 0.6; g.stroke();
  }
  door(); g.strokeStyle = 'rgba(20,14,8,0.7)'; g.lineWidth = 0.8; g.stroke();
}
function drawKeep(g, s, t) {
  const M = mats(), cx = s.x, gy = s.y - 4, w = 90, H = 104, D = 14;
  softShadow(g, cx + 30, gy + 2, 82, 22, 0.45);
  if (s.dead) {
    g.fillStyle = 'rgba(60,56,50,0.75)'; g.beginPath(); g.ellipse(cx, gy - 14, 58, 24, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 22; i++) { const a = i * 2.4, r = 10 + (i * 13 % 40); g.fillStyle = M.stone; g.fillRect(cx + Math.cos(a) * r - 5, gy - 14 + Math.sin(a) * r * 0.4 - 4, 10, 7); g.fillStyle = i % 2 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)'; g.fillRect(cx + Math.cos(a) * r - 5, gy - 14 + Math.sin(a) * r * 0.4 - 4, 10, 7); }
    if (Math.random() < 0.15) spawn('smoke', cx + RR(-30, 30), gy - RR(5, 30));
    return;
  }
  const fk = s.flash > 0 ? s.flash * 0.5 : 0, P = c => fk ? mixHex(c, '#ffffff', fk) : c;
  const L = cx - w / 2, Rt = cx + w / 2, T = gy - H;
  const side = () => { g.beginPath(); g.moveTo(Rt, gy); g.lineTo(Rt + D, gy - 10); g.lineTo(Rt + D, T - 10); g.lineTo(Rt, T); g.closePath(); };
  fillPath(g, side, M.stone); fillPath(g, side, 'rgba(0,0,0,0.42)');
  const walk = () => { g.beginPath(); g.moveTo(L, T); g.lineTo(Rt, T); g.lineTo(Rt + D, T - 10); g.lineTo(L + D, T - 10); g.closePath(); };
  fillPath(g, walk, M.stoneDark); fillPath(g, walk, 'rgba(255,240,210,0.10)');
  merlons(g, M, L + D + 3, T - 17, 6, 14, 7, 7);
  drawLookoutArcher(g, P, cx + 8, T - 4, s.aim || 1, s.drawT, PAL.player.tunic, '#c3cad1', null, '#d9a57a');
  drawBanner(g, P, Rt + 6, T - 8, 38, 14, PAL.player.tunic, t, '#e0b84e');
  // front face
  g.fillStyle = M.stone; g.fillRect(L, T, w, H); lightFace(g, L, T, w, H);
  for (let yy = T, i = 0; yy < gy; yy += 12, i++) { g.fillStyle = 'rgba(255,248,230,0.10)'; g.fillRect(L, yy + 0.7, i % 2 ? 13 : 8, 10.6); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(Rt - (i % 2 ? 8 : 13), yy + 0.7, i % 2 ? 8 : 13, 10.6); }
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(L - 1, T + 3, w + 2, 2); g.fillStyle = 'rgba(255,240,210,0.25)'; g.fillRect(L - 1, T + 1.6, w + 2, 1.4);
  g.fillStyle = 'rgba(40,46,30,0.16)'; g.fillRect(L + 21, T + 44, 2, 22); g.fillRect(Rt - 22, T + 44, 2, 16);
  mossAt(g, L, gy, w, 7);
  g.strokeStyle = 'rgba(25,22,18,0.6)'; g.lineWidth = 1; g.strokeRect(L, T, w, H);
  merlons(g, M, L, T - 9, 7, 14, 8, 9);
  for (const sx of [L + 20, Rt - 23]) { g.fillStyle = M.stone; g.fillRect(sx - 2, T + 28, 7, 18); g.fillStyle = 'rgba(255,240,210,0.15)'; g.fillRect(sx - 2, T + 28, 7, 1.4); g.fillStyle = '#16110c'; g.fillRect(sx, T + 30, 3, 14); }
  drawArchDoor(g, M, P, cx, gy, 13, 24);
  flashOver(g, fk, L, T - 9, w + D, H + 9);
  const hpF = s.hp / s.maxHp;
  if (hpF < 0.6) { g.strokeStyle = 'rgba(30,25,20,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L + 12, T + 8); g.lineTo(L + 22, T + 26); g.lineTo(L + 16, T + 40); g.moveTo(Rt - 15, T + 50); g.lineTo(Rt - 8, T + 66); g.stroke(); }
  if (hpF < 0.35 && Math.random() < 0.4) spawn('fire', cx + RR(-40, 40), T + RR(0, 20));
  if (hpF < 0.35 && Math.random() < 0.2) spawn('smoke', cx + RR(-35, 35), T - RR(0, 20));
}

// ---------- drawing: scenery ----------
// ---------- trees: pre-drawn sprites lit from the upper left ----------
const SPR = 2;  // sprites are drawn at double resolution so they stay sharp when zoomed in
function makeOakSprite(seed, tone) {
  const c = document.createElement('canvas'); c.width = 100 * SPR; c.height = 120 * SPR;
  const g = c.getContext('2d'); g.scale(SPR, SPR); g.translate(50, 112);
  const Rn = mulberry32(seed);
  // trunk and roots
  const tg = g.createLinearGradient(-6, 0, 6, 0); tg.addColorStop(0, '#7a5634'); tg.addColorStop(0.45, '#5a3d22'); tg.addColorStop(1, '#2f1f10');
  g.fillStyle = tg; g.beginPath(); g.moveTo(-6, 1); g.quadraticCurveTo(-3.5, -14, -3.2, -36); g.lineTo(3.2, -36); g.quadraticCurveTo(3.5, -14, 6, 1); g.quadraticCurveTo(0, 3, -6, 1); g.fill();
  g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(-9, 0.5, -12, 2.5); g.lineTo(-3, 1.5); g.moveTo(5, 0); g.quadraticCurveTo(9, 0.5, 11, 2.5); g.lineTo(3, 1.5); g.fill();
  g.strokeStyle = 'rgba(30,18,8,0.45)'; g.lineWidth = 0.6;
  for (let k = 0; k < 6; k++) { const x = -2.5 + Rn() * 5; g.beginPath(); g.moveTo(x, -2); g.quadraticCurveTo(x + Rn() - 0.5, -16, x * 0.7, -32); g.stroke(); }
  g.strokeStyle = '#4e341c'; g.lineWidth = 2.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-1, -26); g.quadraticCurveTo(-9, -34, -16, -42); g.moveTo(1, -30); g.quadraticCurveTo(10, -38, 17, -46); g.moveTo(0, -34); g.lineTo(-2, -50); g.stroke();
  // shade the trunk under the canopy
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, -36, 12, 4, 0, 0, Math.PI * 2); g.fill();
  // leaf clumps
  const darkC = mixHex('#1f3f19', '#2c4f1b', tone), shadowC = mixHex('#2f5a24', '#3f6a25', tone), litC = mixHex('#6f9f45', '#89ae48', tone), hiC = mixHex('#a2c86a', '#bcd476', tone);
  const cx = 0, cy = -60, rx = 31, ry = 27, cl = [];
  for (let i = 0; i < 52; i++) { const a = Rn() * Math.PI * 2, r = Math.sqrt(Rn()); cl.push({ x: cx + Math.cos(a) * rx * r * 0.82, y: cy + Math.sin(a) * ry * r * 0.82, r: 6 + Rn() * 6.5 }); }
  for (const p of cl) p.l = clamp(0.5 - (p.x - cx) / rx * 0.35 - (p.y - cy) / ry * 0.45, 0, 1);
  g.fillStyle = darkC; for (const p of cl) { g.beginPath(); g.arc(p.x + 1, p.y + 1.5, p.r + 1.6, 0, Math.PI * 2); g.fill(); }
  cl.sort((p, q) => p.l - q.l);
  for (const p of cl) {
    g.fillStyle = mixHex(shadowC, litC, p.l); g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
    if (p.l > 0.5) { g.fillStyle = mixHex(litC, hiC, (p.l - 0.5) * 2); g.beginPath(); g.arc(p.x - p.r * 0.3, p.y - p.r * 0.32, p.r * 0.45, 0, Math.PI * 2); g.fill(); }
  }
  for (let i = 0; i < 170; i++) { const a = Rn() * Math.PI * 2, r = Math.sqrt(Rn()); const x = cx + Math.cos(a) * rx * r * 0.95, y = cy + Math.sin(a) * ry * r * 0.95;
    g.fillStyle = Rn() < 0.55 ? 'rgba(20,40,14,0.35)' : 'rgba(200,230,140,0.3)'; g.beginPath(); g.ellipse(x, y, 1.3, 0.8, Rn() * 3, 0, Math.PI * 2); g.fill(); }
  return c;
}
function makePineSprite(seed, tone) {
  const c = document.createElement('canvas'); c.width = 100 * SPR; c.height = 120 * SPR;
  const g = c.getContext('2d'); g.scale(SPR, SPR); g.translate(50, 112);
  const Rn = mulberry32(seed);
  const tg = g.createLinearGradient(-3, 0, 3, 0); tg.addColorStop(0, '#6e4a2a'); tg.addColorStop(1, '#2f1f10');
  g.fillStyle = tg; g.fillRect(-3, -20, 6, 21);
  const darkC = mixHex('#152e17', '#1c3a1c', tone), shadowC = mixHex('#1f4423', '#28502a', tone), litC = mixHex('#3f7840', '#4c8a46', tone), hiC = '#79ad62';
  for (let k = 0; k < 6; k++) {
    const base = -14 - k * 14, w = 31 - k * 4.6, top = base - 27;
    const tier = (grow) => {
      g.beginPath(); g.moveTo(0, top - grow);
      const steps = 5;
      for (let s = 1; s <= steps; s++) { const t = s / steps; g.lineTo(-w * t - grow - (s % 2 ? 2.5 : 0), top + (base - top) * t + (s % 2 ? -2 : 1)); }
      g.quadraticCurveTo(0, base + 4 + grow, w + grow, base);
      for (let s = steps; s >= 1; s--) { const t = s / steps; g.lineTo(w * t + grow + (s % 2 ? 2.5 : 0), top + (base - top) * t + (s % 2 ? -2 : 1)); }
      g.closePath();
    };
    tier(1.4); g.fillStyle = darkC; g.fill();
    const gr = g.createLinearGradient(-w, top, w, base); gr.addColorStop(0, litC); gr.addColorStop(0.55, shadowC); gr.addColorStop(1, darkC);
    tier(0); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(160,210,120,0.35)'; g.lineWidth = 0.6;
    for (let n = 0; n < 9; n++) { const t = Rn(), x = -w * t * 0.9, y = top + (base - top) * t; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y + 2.5); g.stroke(); }
    g.fillStyle = hiC; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(-1, top + 3); g.lineTo(-w * 0.45, base - 3); g.lineTo(-w * 0.15, base - 4); g.closePath(); g.fill(); g.globalAlpha = 1;
  }
  return c;
}
const oakSprites = [], pineSprites = [];
for (let i = 0; i < 8; i++) oakSprites.push(makeOakSprite(500 + i * 17, i / 7));
for (let i = 0; i < 6; i++) pineSprites.push(makePineSprite(900 + i * 13, i / 5));
function softShadow(g, x, y, rx, ry, a) {
  g.save(); g.translate(x, y); g.scale(1, ry / rx);
  const sg = g.createRadialGradient(0, 0, 0, 0, 0, rx); sg.addColorStop(0, `rgba(0,0,0,${a})`); sg.addColorStop(0.6, `rgba(0,0,0,${a * 0.55})`); sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
}
function drawTree(g, t, fade) {
  const k = t.s * (t.pine ? 0.62 : 0.66);
  softShadow(g, t.x + 16 * t.s, t.y + 1, 30 * t.s, 9 * t.s, 0.38);
  const spr = (t.pine ? pineSprites : oakSprites)[Math.floor(t.seed * 10) % (t.pine ? pineSprites.length : oakSprites.length)];
  g.globalAlpha = fade;
  g.drawImage(spr, t.x - 50 * k, t.y - 112 * k, 100 * k, 120 * k);
  g.globalAlpha = 1;
}
function drawIronRock(g, r) {
  const s = r.s, x = r.x, y = r.y;
  softShadow(g, x + 5, y + 1, 20 * s, 7 * s, 0.42);
  const shape = () => { g.beginPath(); g.moveTo(x - 14 * s, y); g.lineTo(x - 12 * s, y - 10 * s); g.lineTo(x - 3 * s, y - 17 * s); g.lineTo(x + 8 * s, y - 15 * s); g.lineTo(x + 14 * s, y - 6 * s); g.lineTo(x + 13 * s, y); g.closePath(); };
  const gr = g.createLinearGradient(x - 12 * s, y - 16 * s, x + 12 * s, y); gr.addColorStop(0, '#b77a4e'); gr.addColorStop(0.5, '#7e4f33'); gr.addColorStop(1, '#4a3020');
  shape(); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(30,18,10,0.7)'; g.lineWidth = 0.9; g.stroke();
  g.strokeStyle = 'rgba(230,140,70,0.75)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - 8 * s, y - 9 * s); g.lineTo(x - 2 * s, y - 5 * s); g.moveTo(x + 2 * s, y - 13 * s); g.lineTo(x + 7 * s, y - 7 * s); g.moveTo(x - 4 * s, y - 2 * s); g.lineTo(x + 4 * s, y - 3 * s); g.stroke();
  g.fillStyle = 'rgba(40,40,46,0.8)'; for (const [a, b] of [[-6, -12], [5, -10], [-1, -6]]) { g.beginPath(); g.arc(x + a * s, y + b * s, 1.4 * s, 0, Math.PI * 2); g.fill(); }
}
function drawRock(g, r) {
  if (r.gone) return;
  if (r.iron) { drawIronRock(g, r); return; }
  const s = r.s, x = r.x, y = r.y;
  softShadow(g, x + 5, y + 1, 18 * s, 6 * s, 0.4);
  const shape = () => { g.beginPath(); g.moveTo(x - 13 * s, y); g.lineTo(x - 11 * s, y - 9 * s); g.lineTo(x - 4 * s, y - 15 * s); g.lineTo(x + 6 * s, y - 14 * s); g.lineTo(x + 13 * s, y - 6 * s); g.lineTo(x + 12 * s, y); g.closePath(); };
  const gr = g.createLinearGradient(x - 12 * s, y - 15 * s, x + 12 * s, y);
  gr.addColorStop(0, '#b4b1a8'); gr.addColorStop(0.5, '#86837b'); gr.addColorStop(1, '#55534e');
  shape(); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(30,28,24,0.6)'; g.lineWidth = 0.9; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.moveTo(x - 11 * s, y - 9 * s); g.lineTo(x - 4 * s, y - 15 * s); g.lineTo(x + 6 * s, y - 14 * s); g.lineTo(x + 2 * s, y - 9 * s); g.lineTo(x - 5 * s, y - 7 * s); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(40,36,30,0.5)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x + 2 * s, y - 9 * s); g.lineTo(x + 4 * s, y - 4 * s); g.lineTo(x + 2.5 * s, y - 1 * s); g.moveTo(x - 5 * s, y - 7 * s); g.lineTo(x - 7 * s, y - 2 * s); g.stroke();
  g.fillStyle = 'rgba(92,124,56,0.6)'; g.beginPath(); g.ellipse(x - 7 * s, y - 2.5 * s, 4.5 * s, 2 * s, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(120,150,70,0.5)'; g.beginPath(); g.ellipse(x + 3 * s, y - 13 * s, 3 * s, 1.2 * s, 0, 0, Math.PI * 2); g.fill();
}
// ---------- atmosphere: drifting cloud shadows, warm sun, soft edges ----------
const clouds = Array.from({ length: 6 }, () => ({ x: Math.random() * MW, y: Math.random() * MH, r: 180 + Math.random() * 160, sp: 5 + Math.random() * 7 }));
function drawAtmosphere(g) {
  for (const c of clouds) {
    const x = ((c.x + time * c.sp) % (MW + 900)) - 450;
    const gr = g.createRadialGradient(x, c.y, 0, x, c.y, c.r);
    gr.addColorStop(0, 'rgba(10,22,34,0.15)'); gr.addColorStop(0.6, 'rgba(10,22,34,0.08)'); gr.addColorStop(1, 'rgba(10,22,34,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, c.y, c.r, c.r * 0.7, 0, 0, Math.PI * 2); g.fill();
  }
  g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,214,150,0.32)'; g.fillRect(0, 0, vw, vh);
  g.globalCompositeOperation = 'source-over';
  const sg = g.createLinearGradient(0, 0, vw, vh); sg.addColorStop(0, 'rgba(255,236,190,0.10)'); sg.addColorStop(0.5, 'rgba(255,236,190,0)'); sg.addColorStop(1, 'rgba(20,30,60,0.08)');
  g.fillStyle = sg; g.fillRect(0, 0, vw, vh);
  const vg = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.4, vw / 2, vh / 2, Math.hypot(vw, vh) * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)'); g.fillStyle = vg; g.fillRect(0, 0, vw, vh);
  g.restore();
}
function flame(g, x, y, w, h, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 1.1, y - h * 0.5, x, y - h); g.quadraticCurveTo(x + w * 1.1, y - h * 0.5, x + w, y); g.closePath(); g.fill(); }
function drawFire(g, f, t) {
  const x = f.x, y = f.y, fl = 0.85 + 0.12 * Math.sin(t * 13) + 0.07 * Math.sin(t * 31);
  g.save(); g.globalCompositeOperation = 'lighter';
  const grd = g.createRadialGradient(x, y - 6, 2, x, y - 6, 80 * fl);
  grd.addColorStop(0, 'rgba(255,160,60,0.32)'); grd.addColorStop(1, 'rgba(255,110,30,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(x, y - 6, 80 * fl, 0, Math.PI * 2); g.fill(); g.restore();
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; g.fillStyle = i % 2 ? '#77736c' : '#8c8880'; g.beginPath(); g.ellipse(x + Math.cos(a) * 11, y + Math.sin(a) * 5, 3.6, 2.6, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#4b311b'; g.save(); g.translate(x, y - 1); g.rotate(0.4); g.fillRect(-9, -1.6, 18, 3.2); g.rotate(-0.8); g.fillRect(-9, -1.6, 18, 3.2); g.restore();
  g.fillStyle = '#ff6a1a'; for (let i = 0; i < 7; i++) { const a = i * 2.4; g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 7 + i); g.beginPath(); g.arc(x + Math.cos(a) * 4, y - 1 + Math.sin(a) * 1.8, 1.4, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
  for (let i = 0; i < 5; i++) {   // separate tongues that lick up and sway at their own speed
    const ph = t * (6 + i * 1.7) + i * 1.9, ox = (i - 2) * 2.4 + Math.sin(ph * 0.7) * 1.4, hh = (14 + (i === 2 ? 9 : 0) + Math.sin(ph) * 4) * fl;
    flame(g, x + ox, y - 1, (4.2 - Math.abs(i - 2) * 0.6) * fl, hh, i % 2 ? '#e2541b' : '#f07a20');
  }
  flame(g, x - 1, y - 1, 4.6 * fl, 13 * fl * (0.9 + 0.1 * Math.sin(t * 17)), '#f59a24');
  flame(g, x, y - 1, 2.4, 8 * fl, '#fff0a0');
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffcf7a';
  for (let i = 0; i < 6; i++) { const k = ((t * 0.55 + i / 6) % 1), sx = x + Math.sin(i * 3.1 + t * 2) * (3 + k * 6), sy = y - 8 - k * 40; g.globalAlpha = 1 - k; g.fillRect(sx, sy, 1.3, 1.3); }
  g.restore();
}
function drawTower(g, s, t) {
  const M = mats(), cx = s.x, gy = s.y - 4;
  softShadow(g, cx + 22, gy + 1, 60, 18, 0.42);
  if (s.dead) {
    g.fillStyle = 'rgba(40,30,22,0.7)'; g.beginPath(); g.ellipse(cx, gy - 14, 44, 20, 0, 0, Math.PI * 2); g.fill();
    const logs = [[-20, -18, 0.3], [6, -12, -0.5], [-6, -26, 1.2], [18, -24, 0.1], [-28, -8, -0.2], [12, -4, 0.9]];
    for (const [lx, ly, la] of logs) { g.save(); g.translate(cx + lx, gy + ly); g.rotate(la); const p = () => { g.beginPath(); g.rect(-14, -2.5, 28, 5); }; fillPath(g, p, M.woodH); roundLog(g, p, -14, 28); g.fillStyle = '#1e140a'; g.fillRect(-14, -2.5, 28, 1.2); g.restore(); }
    if (Math.random() < 0.15) spawn('smoke', cx + RR(-25, 25), gy - RR(5, 25));
    return;
  }
  const fk = s.flash > 0 ? s.flash * 0.6 : 0, P = c => fk ? mixHex(c, '#ffffff', fk) : c;
  const wob = Math.sin(t * 40) * s.wobble * 1.6;
  g.save(); g.translate(cx, gy); g.rotate(wob * 0.01); g.translate(-cx, -gy);
  const post = (x, y, w, h, dark) => { const p = () => { g.beginPath(); g.rect(x, y, w, h); }; fillPath(g, p, M.woodV); if (dark) fillPath(g, p, 'rgba(0,0,0,0.35)'); roundLog(g, p, x, w); };
  post(cx - 22, gy - 96, 5, 74, true); post(cx + 17, gy - 96, 5, 74, true);
  post(cx - 30, gy - 96, 6, 96); post(cx + 24, gy - 96, 6, 96);
  const beam = (x1, y1, x2, y2) => { seg(g, x1, y1, x2, y2, 3, '#5e4024'); g.strokeStyle = 'rgba(255,230,190,0.2)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x1, y1 - 1); g.lineTo(x2, y2 - 1); g.stroke(); };
  beam(cx - 26, gy - 8, cx + 27, gy - 76); beam(cx + 27, gy - 8, cx - 26, gy - 76);
  seg(g, cx - 6, gy, cx - 6, gy - 90, 1.5, '#8a6a42'); seg(g, cx + 4, gy, cx + 4, gy - 90, 1.5, '#8a6a42');
  for (let k = 0; k < 9; k++) seg(g, cx - 6, gy - 6 - k * 10, cx + 4, gy - 6 - k * 10, 1.2, '#9a7a4e');
  const plat = () => { g.beginPath(); g.rect(cx - 36, gy - 102, 72, 11); };
  fillPath(g, plat, M.woodH); g.fillStyle = 'rgba(255,230,190,0.22)'; g.fillRect(cx - 36, gy - 102, 72, 2.5); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(cx - 36, gy - 93, 72, 2);
  plat(); g.strokeStyle = 'rgba(25,14,6,0.6)'; g.lineWidth = 0.8; g.stroke();
  drawLookoutArcher(g, P, cx + 6, gy - 122, s.aim || -1, s.drawT, ENEMY_COL, '#7a726b', ENEMY_PLUME, '#d9a57a');
  // palisade of sharpened logs
  for (let k = 0; k < 9; k++) {
    const lx = cx - 36 + k * 8;
    const p = () => { g.beginPath(); g.moveTo(lx, gy - 100); g.lineTo(lx, gy - 124); g.lineTo(lx + 4, gy - 130); g.lineTo(lx + 8, gy - 124); g.lineTo(lx + 8, gy - 100); g.closePath(); };
    fillPath(g, p, M.woodV); if (k % 2) fillPath(g, p, 'rgba(0,0,0,0.12)'); roundLog(g, p, lx, 8);
    g.fillStyle = 'rgba(230,200,150,0.5)'; g.beginPath(); g.moveTo(lx + 4, gy - 130); g.lineTo(lx + 2, gy - 126); g.lineTo(lx + 4.5, gy - 125); g.closePath(); g.fill();
  }
  g.fillStyle = '#2b2824'; g.fillRect(cx - 36, gy - 111, 72, 1.6);
  post(cx - 35, gy - 150, 4, 28, true); post(cx + 31, gy - 150, 4, 28, true);
  // thatched roof
  const RY = gy - 148;
  const roof = () => { g.beginPath(); g.moveTo(cx - 46, RY + 2); g.lineTo(cx, RY - 34); g.lineTo(cx + 46, RY + 2); g.closePath(); };
  fillPath(g, roof, M.thatch);
  const rg = g.createLinearGradient(cx - 40, RY - 30, cx + 40, RY); rg.addColorStop(0, 'rgba(255,236,190,0.18)'); rg.addColorStop(0.5, 'rgba(0,0,0,0.05)'); rg.addColorStop(1, 'rgba(0,0,0,0.42)'); fillPath(g, roof, rg);
  g.strokeStyle = 'rgba(70,48,18,0.7)'; g.lineWidth = 0.8; g.beginPath(); for (let x = cx - 46; x < cx + 46; x += 3) { g.moveTo(x, RY + 2); g.lineTo(x + 1.2, RY + 4.5); } g.stroke();
  roof(); g.strokeStyle = 'rgba(40,26,10,0.7)'; g.lineWidth = 0.9; g.stroke();
  drawBanner(g, P, cx, RY - 32, 26, 12, '#b8302a', t, null);
  flashOver(g, fk, cx - 36, gy - 150, 72, 150);
  const hpF = s.hp / s.maxHp;
  if (hpF < 0.65) { g.strokeStyle = 'rgba(25,15,8,0.8)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - 20, gy - 118); g.lineTo(cx - 12, gy - 108); g.lineTo(cx - 16, gy - 102); g.moveTo(cx + 14, gy - 120); g.lineTo(cx + 9, gy - 110); g.stroke(); }
  if (hpF < 0.4 && Math.random() < 0.5) spawn('fire', cx + RR(-30, 30), gy - RR(100, 125));
  if (hpF < 0.4 && Math.random() < 0.2) spawn('smoke', cx + RR(-25, 25), gy - RR(120, 150));
  g.restore();
}
function drawHealthBar(g, x, y, w, f) {
  g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
  g.fillStyle = f > 0.6 ? '#4fd65a' : f > 0.3 ? '#f2c230' : '#e8432f';
  g.fillRect(x - w / 2, y, w * f, 4);
}

