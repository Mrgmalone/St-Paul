'use strict';
// Stronghold Destroyer — Phase 4D, step D3: the flat (2D) view, back beside the 3D one (Settings: View, or the V key).
// It is the flat map drawn straight down on a canvas, as the game began: the same land, people and buildings, so every
// change of look shows in both views. Buildings that have their own 3D model but no flat drawing of their own are shown
// as a picture of that 3D model; everything else uses the flat drawings. The fog of war, rally flags, patrol routes,
// moats and spikes show here as in 3D.
const silCan = [document.createElement('canvas'), document.createElement('canvas')];
function hiddenBy(u) {
  const top = u.y - (isMachine(u) ? 62 : 46), hw = isMachine(u) ? 26 : 10, out = [];
  for (const b of structures) {
    if (b.dead || b.y <= u.y + 2 || isField(b.kind) || b.kind === 'garden' || b.kind === 'stocks' || b.kind === 'moat' || b.kind === 'pit') continue;
    const bt = b.y - (b.topH || 40) - (b.kind === 'highwall' || b.kind === 'wall' ? 6 : 14);
    if (u.x + hw > b.x0 - 2 && u.x - hw < b.x1 + 16 && u.y > bt + 8 && top < b.y - 4) out.push([b.x0 - 2, bt, b.x1 - b.x0 + 18, b.y - bt]);
  }
  return out.length ? out : null;
}
function drawHiddenOutlines(g, visible) {
  const S = cam.z * dpr, W = 112, H = 104; let n = 0;
  for (const u of units) {
    if (u.dead || u.onWall || !visible(u)) continue;
    const rects = hiddenBy(u); if (!rects || n++ > 40) continue;
    const [a, b] = silCan, cw = Math.ceil(W * S), ch = Math.ceil(H * S);
    if (a.width !== cw || a.height !== ch) { a.width = b.width = cw; a.height = b.height = ch; }
    const ga = a.getContext('2d'), gb = b.getContext('2d');
    ga.setTransform(1, 0, 0, 1, 0, 0); ga.clearRect(0, 0, cw, ch);
    ga.setTransform(S, 0, 0, S, (W / 2 - u.x) * S, (H - 12 - u.y) * S);
    (isMachine(u) ? drawMachine : drawPerson)(ga, u, time);
    ga.setTransform(1, 0, 0, 1, 0, 0); ga.globalCompositeOperation = 'source-in';
    const col = u.team === 'player' ? PAL.player.tunic : ENEMY_PLUME;
    gb.setTransform(1, 0, 0, 1, 0, 0); gb.clearRect(0, 0, cw, ch); gb.drawImage(a, 0, 0); gb.globalCompositeOperation = 'source-in'; gb.fillStyle = '#fff6d8'; gb.fillRect(0, 0, cw, ch); gb.globalCompositeOperation = 'source-over';
    ga.fillStyle = col; ga.fillRect(0, 0, cw, ch); ga.globalCompositeOperation = 'source-over';
    const x = u.x - W / 2, y = u.y - H + 12, o = 1.3 / cam.z;
    g.save(); g.beginPath(); for (const [rx, ry, rw, rh] of rects) g.rect(rx, ry, rw, rh); g.clip(); g.globalAlpha = 0.85;
    for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o]]) g.drawImage(b, x + dx, y + dy, W, H);
    g.globalAlpha = 0.6; g.drawImage(a, x, y, W, H); g.restore();
  }
}

const PIC2D = { school: 1, engineerhut: 1, apothecary: 1, stable: 1, alehouse: 1, church: 1, abbey: 1, orchard: 1, vineyard: 1, waterpot: 1, ironmine: 1,
  bakery: 1, brewery: 1, tavern: 1, smithy: 1, armory: 1, bowyer: 1, poleturner: 1 };
const picOf2D = kind => { const file = ARTFILES.get('art/buildings/' + kind + '.png', true); if (file) return file; if (!PIC2D[kind] || !R3D.available) return null; try { return R3D.isReady() ? R3D.iconOf('b:' + kind) : null; } catch (e) { return null; } };
function drawBuilding2D(g, b, t) {
  const pic = !b.dead && b.done !== false && picOf2D(b.kind);
  if (!pic) { drawBuilding(g, b, t); return; }
  // the picture of its 3D model, standing on the building's ground
  const w = (b.x1 - b.x0) * 1.55, h = w * pic.height / pic.width;
  g.save(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(b.x, b.y - 4, w * 0.42, (b.y1 - b.y0) * 0.32, 0, 0, Math.PI * 2); g.fill();
  if (b.flash > 0) g.filter = 'brightness(' + (1 + b.flash * 0.6) + ')';
  if (b.team !== 'player') { g.globalAlpha = 0.96; }
  g.drawImage(pic, b.x - w / 2, b.y1 - h * 0.86, w, h); g.restore();
  if (b.fire > 0) { g.save(); g.globalCompositeOperation = 'lighter'; drawFire(g, { x: b.x, y: b.y - 10, s: 1 }, t); g.restore(); }
}
// soldiers with no flat drawing of their own (the sheet's longbowman, crossbowman, flame trooper and berserker, and the
// mounted knight) are drawn as a picture of their 3D figure, which bobs as they walk, leans as they strike and falls
const CARD_KITS = { longbow: 1, crossbow: 1, flame: 1, berserker: 1, heavyspear: 1 };
const cardOf2D = u => (CARD_KITS[u.kit] || (u.type === 'knight' && u.kit !== 'foot'))   /* (a knight rides unless he is on foot, as in 3D) */ && R3D.available ? (() => { try { return R3D.isReady() ? R3D.unitCard(u) : null; } catch (e) { return null; } })() : null;
function drawUnit2D(g, u, t) {
  const c = cardOf2D(u); if (!c) { drawPerson(g, u, t); return; }
  const k = 1.15, W = c.span * k, px = W / c.size, y0 = u.y - elev2D(u), moving = u.moving && !u.dead;
  let alpha = 1; if (u.dead && u.deathT > 7) alpha = Math.max(0, 1 - (u.deathT - 7) / 3); if (alpha <= 0) return;
  g.save(); g.globalAlpha = alpha; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(u.x, y0 + 1, u.type === 'knight' ? 22 : 12, u.type === 'knight' ? 6 : 4, 0, 0, Math.PI * 2); g.fill();
  g.translate(u.x, y0 - (moving ? Math.abs(Math.sin(u.walkPhase)) * 2.4 : 0));
  if (u.dead) g.rotate(Math.min(1, u.deathT / 0.45) * Math.PI / 2 * (u.facing > 0 ? -1 : 1));
  else if (u.attackAnim > 0) g.rotate(Math.sin(u.attackAnim * Math.PI) * 0.16 * (u.facing || 1));
  if ((u.facing || 1) < 0) g.scale(-1, 1);
  g.drawImage(c.img, -W / 2, -c.foot * px, W, W);
  if (u.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(0.5, u.flash * 0.5) * alpha; g.drawImage(c.img, -W / 2, -c.foot * px, W, W); }
  g.restore();
}
// the fog: what you have never seen lies dark
const fog2D = { can: null, ver: -1 };
function drawFog2D(g) {
  if (!FOG.on || !FOG.seen) return;
  if (!fog2D.can) { fog2D.can = document.createElement('canvas'); fog2D.can.width = FOG.w; fog2D.can.height = FOG.h; }
  const sum = FOG.seen.reduce((a, v) => a + v, 0);
  if (sum !== fog2D.ver) {
    fog2D.ver = sum; const c = fog2D.can.getContext('2d'), im = c.createImageData(FOG.w, FOG.h);
    for (let i = 0; i < FOG.seen.length; i++) { im.data[i * 4 + 3] = FOG.seen[i] ? 0 : 225; }
    c.putImageData(im, 0, 0);
  }
  g.save(); g.imageSmoothingEnabled = true; g.drawImage(fog2D.can, 0, 0, FOG.w * FOG.cell, FOG.h * FOG.cell); g.restore();
}
const RALLY_COL2D = { army: ['rgba(255,207,90,0.85)', '#c8202a', 'A'], town: ['rgba(159,232,168,0.85)', '#2e8b4a', 'C'], siege: ['rgba(150,190,255,0.85)', '#3a5aa8', 'S'] };
function drawRally2D(g) {
  for (const which of ['army', 'town', 'siege']) {
    const r = rally[which]; if (!r) continue; const [ring, col, letter] = RALLY_COL2D[which];
    g.save(); g.strokeStyle = ring; g.lineWidth = 2.5; g.beginPath(); g.ellipse(r.x, r.y, 18 + Math.sin(time * 3), 7, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#3a2a18'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(r.x, r.y); g.lineTo(r.x, r.y - 46); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(r.x, r.y - 46); g.quadraticCurveTo(r.x + 12, r.y - 44 + Math.sin(time * 5) * 2, r.x + 24, r.y - 40); g.lineTo(r.x, r.y - 33); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.8; g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 9px Georgia, serif'; g.textAlign = 'center'; g.fillText(letter, r.x + 9, r.y - 37); g.restore();
  }
}
function drawPatrols2D(g) {   // the routes of the patrols you have selected
  const shown = new Set(); g.save(); g.setLineDash([8, 6]); g.lineWidth = 2.2; g.strokeStyle = 'rgba(255,230,140,0.85)';
  for (const u of selection) { const P = u.patrol; if (!P || !P.pts || shown.has(P.pts)) continue; shown.add(P.pts);
    g.beginPath(); P.pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); if (P.loop) g.closePath(); g.stroke(); }
  g.restore();
}
function render2D() {
  const g = ctx, z = cam.z * dpr;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#1a2a12'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
  g.imageSmoothingEnabled = true;
  g.drawImage(terrain, 0, 0);
  if (WEATHER.cover > 0.01) { g.fillStyle = `rgba(236,240,246,${0.42 * WEATHER.cover})`; g.fillRect(0, 0, MW, MH); }
  const vx0 = cam.x - 80, vy0 = cam.y - 60, vx1 = cam.x + vw / cam.z + 80, vy1 = cam.y + vh / cam.z + 200;
  const visible = o => o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1;

  // ground markers
  for (const m of markers) {
    const k = m.t / 0.7, x = m.target ? m.target.x : m.x, y = m.target ? m.target.y : m.y;
    g.strokeStyle = `rgba(${m.col},${1 - k})`; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(x, y, 18 * (1 - k * 0.6), 8 * (1 - k * 0.6), 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(x, y, 6, 3, 0, 0, Math.PI * 2); g.stroke();
  }
  // targets of selected units
  const targeted = new Set(); for (const u of selection) if (u.order === 'attack' && alive(u.target)) targeted.add(u.target);
  for (const t of targeted) { g.strokeStyle = 'rgba(255,80,60,0.85)'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.ellipse(t.x, t.y, t.kind === 'tower' ? 46 : 17, t.kind === 'tower' ? 18 : 7, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
  // selection rings
  for (const u of selection) {
    if (u.dead) continue;
    g.fillStyle = 'rgba(120,255,140,0.18)'; g.strokeStyle = 'rgba(130,255,150,0.95)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(u.x, u.y + 0.5, 17, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  if (hover && !hover.dead && hover.kind === 'unit' && !selection.has(hover)) {
    g.strokeStyle = hover.team === 'enemy' ? 'rgba(255,90,70,0.9)' : 'rgba(220,255,220,0.7)'; g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(hover.x, hover.y + 0.5, 17, 7, 0, 0, Math.PI * 2); g.stroke();
  }
  for (const st of stumps) if (visible(st)) drawStump(g, st);
  for (const fm of farms) if (!fogHides(fm, 'player')) drawBuilding2D(g, fm, time);
  for (const b of structures) if ((b.kind === 'moat' || b.kind === 'pit') && visible(b) && !fogHides(b, 'player')) drawBuilding(g, b, time);
  for (const f of prints) { if (!visible(f)) continue; g.save(); g.translate(f.x, f.y); g.rotate(f.a); g.globalAlpha = Math.max(0, 0.32 * (1 - f.t / 28)) + WEATHER.cover * 0.2; g.fillStyle = WEATHER.cover > 0.3 ? '#8a8f98' : '#2e3a1c'; g.beginPath(); g.ellipse(0, 0, 2.6, 1.3, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  // fallen soldiers lie on the ground layer
  for (const u of units) if (u.dead && visible(u) && !hiddenFrom(u, 'player')) (isMachine(u) ? drawMachine : drawUnit2D)(g, u, time);

  // depth-sorted scene
  const list = [];
  for (const t of trees) if (visible(t)) list.push(t);
  for (const r of rocks) if (visible(r)) list.push(r);
  for (const b of bushes) if (visible(b)) list.push(b);
  for (const s of structures) if (!fogHides(s, 'player')) list.push(s);
  for (const f of fires) list.push(f);
  for (const u of units) if (!u.dead && !u.inside && visible(u) && !hiddenFrom(u, 'player')) list.push(u);
  const lift = o => o.onWall ? (o.onWall.kind === 'keep' ? 130 : 44) : 0; list.sort((a, b) => (a.y + lift(a)) - (b.y + lift(b)));
  const mine = units.filter(u => u.team === 'player' && !u.dead);
  for (const o of list) {
    if (o.kind === 'tree') {
      const behind = mine.some(u => Math.abs(u.x - o.x) < 22 * o.s && u.y < o.y - 2 && u.y > o.y - 55 * o.s);
      drawTree(g, o, behind ? 0.5 : 1);
    } else if (o.kind === 'rock') drawRock(g, o);
    else if (o.kind === 'tower') drawTower(g, o, time);
    else if (o.kind === 'keep') drawKeep(g, o, time);
    else if (o.kind === 'moat' || o.kind === 'pit') continue;
    else if (BUILD[o.kind]) drawBuilding2D(g, o, time);
    else if (o.kind === 'bush') drawBush(g, o);
    else if (o.kind === 'fire') drawFire(g, o, time);
    else if (isMachine(o)) drawMachine(g, o, time);
    else drawUnit2D(g, o, time);
  }
  if (outlinesOn) drawHiddenOutlines(g, visible);
  drawRally2D(g); drawPatrols2D(g);
  if (placing && mouse.inside) drawPlacement(g);
  if (tearing && mouse.inside) drawTearHover(g, (x, y) => ({ x, y }));
  drawParticles(g);
  for (const a of arrows) {
    const k = a.t / a.dur, x = lerp(a.x0, a.x1, k), y = lerp(a.y0, a.y1, k) - a.h * 4 * k * (1 - k);
    const dx = (a.x1 - a.x0) / a.dur, dy = (a.y1 - a.y0) / a.dur - a.h * 4 * (1 - 2 * k) / a.dur, ang = Math.atan2(dy, dx);
    if (a.kind === 'stone') { if (a.t < 0) continue; g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(lerp(a.x0, a.x1, k), lerp(a.y0, a.y1, k) + 20, 5, 2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8f897e'; g.beginPath(); g.arc(x, y, 5.5, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(x - 1.5, y - 1.5, 2, 0, Math.PI * 2); g.fill(); continue; }
    if (a.kind === 'bolt') { g.save(); g.translate(x, y); g.rotate(ang); g.strokeStyle = '#3a2614'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-16, 0); g.lineTo(10, 0); g.stroke(); g.fillStyle = '#9aa1a8'; g.beginPath(); g.moveTo(15, 0); g.lineTo(9, -3); g.lineTo(9, 3); g.closePath(); g.fill(); g.restore(); continue; }
    drawArrow(g, x, y, ang, 1);
  }
  for (const a of stuckArrows) drawArrow(g, a.x, a.y, a.ang, Math.min(1, (6 - a.t) / 1.5));
  for (const st of stuckStones) { g.globalAlpha = Math.min(1, (20 - st.t) / 3); g.fillStyle = '#7d776c'; g.beginPath(); g.ellipse(st.x, st.y, 6, 3.6, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  drawAtmosphere(g);
  drawFog2D(g);

  // health bars
  for (const u of units) {
    if (u.dead || !visible(u)) continue;
    if (selection.has(u) || u.hp < u.maxHp || hover === u || u.lord) drawHealthBar(g, u.x, u.y - (u.lord ? 74 : 58) - elev2D(u), u.lord ? 44 : 28, u.hp / u.maxHp);
    if (u.lord) { g.save(); g.font = 'bold 13px "Source Sans 3", Georgia, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(u.name, u.x, u.y - 80 - elev2D(u)); g.fillStyle = '#ffd98a'; g.fillText(u.name, u.x, u.y - 80 - elev2D(u)); g.restore(); }
  }
  for (const s of structures.concat(farms)) if (s.asleep && !s.dead && visible(s)) { g.save(); g.font = 'bold 15px "Source Sans 3", Georgia, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText('Zz asleep', s.x, s.y - (s.topH || 20) - 30); g.fillStyle = '#cfe3ff'; g.fillText('Zz asleep', s.x, s.y - (s.topH || 20) - 30); g.restore(); }
  for (const s of structures) if (!s.dead && (s.hp < s.maxHp || hover === s)) drawHealthBar(g, s.x, s.y - s.topH - 24, Math.max(30, Math.min(84, s.x1 - s.x0 + 16)), s.hp / s.maxHp);
  g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)';
  for (const sp of speeches) if (!sp.u.inside) drawSpeech(g, sp.u.x, sp.u.y - (sp.u.lord || sp.u.type === 'king' ? 92 : 66) - elev2D(sp.u), sp.text);
  for (const fl of floats) { const a = 1 - fl.t / 1.6; g.globalAlpha = a; g.strokeText(fl.text, fl.x, fl.y - fl.t * 22); g.fillStyle = fl.col; g.fillText(fl.text, fl.x, fl.y - fl.t * 22); }
  g.globalAlpha = 1;

  drawWeatherFx(g);
  // selection box (screen space)
  if (drag && drag.box) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x = Math.min(drag.sx, drag.x), y = Math.min(drag.sy, drag.y), w = Math.abs(drag.x - drag.sx), h = Math.abs(drag.y - drag.sy);
    g.fillStyle = 'rgba(120,255,140,0.12)'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(140,255,160,0.95)'; g.lineWidth = 1.5; g.strokeRect(x + 0.5, y + 0.5, w, h);
  }
}
// ---------- Settings: View 3D or Flat (and the V key) ----------
function markView() { const b = document.getElementById('btnView'); if (b) { b.textContent = 'View: ' + (R3D.active ? '3D' : 'Flat'); b.setAttribute('aria-pressed', R3D.active ? 'true' : 'false'); } }
(() => {
  const mp = document.getElementById('menuPop'), anchor = document.getElementById('btnTrees'); if (!mp) return;
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = '<button id="btnView">View: 3D</button><span style="font-size:14px;color:#d9c9a3">3D or the flat map seen from above (V switches)</span>';
  if (anchor && anchor.closest('.row')) anchor.closest('.row').insertAdjacentElement('beforebegin', row); else mp.appendChild(row);
  document.getElementById('btnView').onclick = () => { if (!R3D.available) { showBanner('3D graphics are turned off in this browser, so only the flat view can be shown.', 4); return; } setView(!R3D.active); };
  window.addEventListener('keydown', e => { if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey && !(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) && R3D.available) setView(!R3D.active); });
})();
