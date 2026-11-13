'use strict';
// Stronghold Destroyer — canvas, camera, mouse and keyboard, touch, the status bar.
// Loaded in order by index.html; all files share one global scope.

// ---------- canvas, camera, input ----------
const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
let vw = 800, vh = 600, dpr = 1;
const cam = { x: 0, y: 0, z: 1 };
function minZoom() { return Math.max(vw / MW, vh / MH); }
let resized = false;
function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ocx = cam.x + vw / cam.z / 2, ocy = cam.y + vh / cam.z / 2;   // keep the same spot in the middle when the panel opens or closes
  vw = Math.max(200, r.width); vh = Math.max(150, r.height);
  canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  let a3 = false; try { a3 = R3D.active; } catch (e) {}
  if (!a3) cam.z = clamp(cam.z, minZoom(), 2.4);
  if (resized) { cam.x = ocx - vw / cam.z / 2; cam.y = ocy - vh / cam.z / 2; } resized = true;
  clampCam();
}
function clampCam() {
  let a3 = false; try { a3 = R3D.active; } catch (e) {}
  if (a3) { const hw = vw / cam.z / 2, hh = vh / cam.z / 2, cx = clamp(cam.x + hw, -120, MW + 120), cy = clamp(cam.y + hh, -120, MH + 120); cam.x = cx - hw; cam.y = cy - hh; return; }
  cam.x = clamp(cam.x, 0, Math.max(0, MW - vw / cam.z)); cam.y = clamp(cam.y, 0, Math.max(0, MH - vh / cam.z));
}
const toWorld = (sx, sy) => (typeof R3D !== 'undefined' && R3D.active) ? R3D.groundAt(sx, sy) : ({ x: sx / cam.z + cam.x, y: sy / cam.z + cam.y });
const screenOf = (x, y, h = 0) => (typeof R3D !== 'undefined' && R3D.active) ? R3D.project(x, h, y) : { x: (x - cam.x) * cam.z, y: (y - h - cam.y) * cam.z, ok: true };
function pickScreen(sx, sy) { if (R3D.active) return R3D.pick(sx, sy); const w = toWorld(sx, sy); return pickAt(w.x, w.y); }
function pickResourceScreen(sx, sy) { if (R3D.active) return R3D.pickResource(sx, sy); const w = toWorld(sx, sy); return pickResource(w.x, w.y); }
function centerOn(x, y) { cam.x = x - vw / cam.z / 2; cam.y = y - vh / cam.z / 2; clampCam(); }

function pickAt(wx, wy, radius = 19) {
  let best = null, bd = radius;
  for (const u of units) { if (u.dead || u.inside) continue; const d = Math.hypot(u.x - wx, (u.y - 21 - elev2D(u)) - wy); if (d < bd + 4) { if (d < bd || !best) { bd = d; best = u; } } }
  if (best) return best;
  for (const s of structures) { if (s.dead) continue; const hw = (s.x1 - s.x0) / 2 + 6, top = s.topH; if (wx > s.x - hw && wx < s.x + hw && wy > s.y - top && wy < s.y + 2) return s; }
  return null;
}
const selectedList = () => [...selection].filter(alive);
function selectOnly(list) { selection = new Set(list.filter(u => u.kind === 'unit' && u.team === 'player' && !u.dead && !u.inside && u.type !== 'oxcart')); }
const isMine = h => h && h.kind === 'unit' && h.team === 'player';
function pickResource(wx, wy) {
  for (const b of bushes) if (Math.hypot(wx - b.x, wy - (b.y - 7)) < 17) return b;
  for (const fm of farms) if (wx > fm.x0 && wx < fm.x1 && wy > fm.y0 && wy < fm.y1) return fm;
  for (const t of trees) if (Math.abs(wx - t.x) < 15 * t.s && wy < t.y + 6 && wy > t.y - 50 * t.s) return t;
  for (const r of rocks) if (!r.iron && !r.gone && Math.hypot(wx - r.x, wy - (r.y - 8)) < 16 * r.s) return r;
  return null;
}
const STORE_KINDS = { stockpile: 1, granary: 1, armory: 1, keep: 1 };
let storeShown = null;
const OUTPUT = { woodhut: 'wood', farm: 'food (crops)', wheatfarm: 'wheat', hopfarm: 'hops', quarry: 'stone' };
// little pictures of the people inside a building
function figureSvg(u) {
  const lk = u.look || {}, fat = u.fat || 0, bw = 8 + fat * 5, cx = 9, tun = u.sick ? '#8fa874' : lk.female && u.type === 'civ' ? '#9a5a6a' : (u.pal && u.pal.tunic) || '#8a7550';
  const role = u.sick ? 'ill, being cared for' : u.breakAt ? 'on a break' : u.job ? (JOB_NAME[u.job.kind] || 'worker') : u.type;
  const body = lk.female && u.type === 'civ' ? `<path d="M${cx - bw / 2} 12 L${cx + bw / 2} 12 L${cx + bw / 2 + 2} 27 L${cx - bw / 2 - 2} 27 Z" fill="${tun}"/>` : `<rect x="${cx - bw / 2}" y="12" width="${bw}" height="10" rx="3" fill="${tun}"/><rect x="${cx - 3}" y="21" width="2.4" height="7" fill="#4a3a28"/><rect x="${cx + 0.6}" y="21" width="2.4" height="7" fill="#4a3a28"/>`;
  return `<svg width="34" height="56" viewBox="0 0 18 30" role="img" aria-label="${role}"><title>${role}</title>${body}<circle cx="${cx}" cy="7" r="4.6" fill="${u.sick ? '#b9c99a' : u.skin || '#d9a57a'}"/><path d="M${cx - 4.6} 6 Q${cx} 0.5 ${cx + 4.6} 6" fill="${(u.hair) || '#4a2e18'}"/></svg>`;
}
function insideHtml(b, label) {
  const list = insideOf(b), ln = (a, v) => `<div class="ln"><span>${a}</span><b>${v}</b></div>`;
  return ln(label || 'Inside now', list.length ? `${list.length} ${list.length > 1 ? 'people' : 'person'}` : 'no one') + (list.length ? `<div style="display:flex;flex-wrap:wrap;gap:2px;margin:4px 0 2px">${list.map(figureSvg).join('')}</div>` : '');
}
const HALLS = { house: 'Rest at home on a break.', tavern: 'People drink ale here on their breaks.', chapel: 'People pray here on their breaks.' };
function showInside(b) {
  storeShown = b; const p = document.getElementById('storePop'); if (b.dead) { p.hidden = true; storeShown = null; return; }
  setBox(p, `<h3>${b.name.toUpperCase()}</h3>` + (b.done === false ? '<div class="ln"><span>Status</span><b>Being built</b></div>' : insideHtml(b)) + fixRow + `<div style="font-size:13px;color:#d9c9a3;margin-top:6px">${HALLS[b.kind] || ''} Click the ground or press Esc to close.</div>`);
  p.dataset.site = ''; p.hidden = false;
}
function showSite(b) {
  storeShown = b; const p = document.getElementById('storePop'); if (b.dead) { p.hidden = true; storeShown = null; return; }
  const n = staffOf(b), mx = maxStaff(b.kind), rc = recipeOf(b), ln = (a, v) => `<div class="ln"><span>${a}</span><b>${v}</b></div>`;
  const status = b.done === false ? 'Being built' : b.asleep ? 'Asleep (Z to wake)' : n ? `Working: ${n} ${n > 1 ? 'people' : 'person'}` : 'No workers yet';
  let html = ln('Status', status) + ln('Workers', `${n} of ${mx}`);
  if (rc) {
    const per = (rc.n || 1) / rc.time * 60, inp = Object.entries(rc.inp).map(([k, v]) => `${+(v * craftCost(b)).toFixed(1)} ${k}`).join(' + ');
    html += ln('Makes', rc.out + (inp ? ` from ${inp}` : '')) + ln('Rate', n ? `up to ${Math.round(per * n * workMul())} ${rc.out} a minute${n > 1 ? ` (${n}x)` : ''}` : 'none (no workers)');
    if (Object.keys(rc.inp).length) html += ln('Skill', `uses ${Math.round(craftCost(b) * 100)}% of the usual material`);
    if (b.kind === 'quarry') html += ln('Cut stone waiting for the cart', b.stock || 0);
  } else if (OUTPUT[b.kind]) html += ln('Makes', OUTPUT[b.kind]) + ln('Speed', n > 1 ? `${n}x one worker` : 'one worker');
  html += ln('Made so far', Math.floor(b.produced || 0)) + indSiteHtml(b);
  if (INDOOR[b.kind] && b.done !== false) html += insideHtml(b, 'Working inside');
  // the buttons are built once per building; only the figures above them refresh, so a click is never lost
  if (p.dataset.site !== String(b.id) || !document.getElementById('siteInfo')) {
    p.innerHTML = `<h3>${b.name.toUpperCase()}</h3><div id="siteInfo"></div>${fixRow}<div class="row" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="sm" data-site="add">+ Add worker</button><button class="sm" data-site="remove">&minus; Remove worker</button><button class="sm" data-site="sleep" id="siteSleep"></button></div>` + indSiteButtons(b) + (b.kind === 'smithy' ? `<div class="row" style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;align-items:center"><b style="color:#ffd98a;font-size:14px">Make:</b><button class="sm" data-site="make:sword">Swords</button><button class="sm" data-site="make:mace">Maces</button><button class="sm" data-site="make:armor">Knight armor</button></div>` : '') +
      '<div style="font-size:13px;color:#d9c9a3;margin-top:6px">Workers you remove (or free by sleeping a building) go gathering, and can be called up as soldiers when your houses are full. Esc closes.</div>';
    p.dataset.site = String(b.id);
  }
  if (b.kind === 'smithy') document.querySelectorAll('#storePop [data-site^="make:"]').forEach(x => x.classList.toggle('on', x.dataset.site === 'make:' + (b.make || 'sword')));
  document.getElementById('siteInfo').innerHTML = html; document.getElementById('siteSleep').textContent = b.asleep ? 'Wake (Z)' : 'Sleep (Z)'; p.hidden = false;
}
function siteAction(b, act) {
  if (!b || b.dead) return;
  if (act.startsWith('make:')) { b.make = act.slice(5); for (const u of units) if (u.job === b) u.crafting = null; floatText(b.x, b.y - b.topH - 20, `Now making ${b.make === 'armor' ? 'knight armor' : b.make + 's'}`, '#9fe8a8'); AudioSys.ui('select'); showSite(b); return; }
  if (act === 'sleep') {
    b.asleep = !b.asleep;
    if (b.asleep) for (const u of units) if (u.job === b) { u.job = null; u.order = 'idle'; u.task = null; u.crafting = null; }
    floatText(b.x, b.y - b.topH - 20, b.asleep ? `${b.name} is asleep` : `${b.name} wakes up`, '#e9dcbc');
  } else if (act === 'add') {
    if (b.done === false) { showBanner('Finish building it first.', 2); return; }
    if (staffOf(b) >= maxStaff(b.kind)) { showBanner(`${b.name} already has ${maxStaff(b.kind)} workers, its most.`, 2.5); return; }
    const free = units.filter(u => u.team === 'player' && !u.dead && u.type === 'civ' && !u.job && !(u.breakUntil > time)).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0];
    if (!free) { showBanner('No free civilian: train one at the keep, or put another building to sleep.', 3); return; }
    b.asleep = false; free.job = b; free.manualT = -99; free.order = 'idle'; free.task = null; startJob(free);
    floatText(b.x, b.y - b.topH - 20, `${b.name}: ${staffOf(b)} workers`, '#9fe8a8');
  } else if (act === 'remove') {
    const w = units.filter(u => u.job === b && !u.dead).pop(); if (!w) return;
    w.job = null; w.order = 'idle'; w.task = null; w.crafting = null; floatText(w.x, w.y - 50, 'Freed to gather', '#e9dcbc');
  }
  AudioSys.ui('select'); showSite(b);
}
document.getElementById('storePop').addEventListener('click', e => { const t = e.target.closest('[data-site]'); if (t && storeShown) siteAction(storeShown, t.dataset.site); });
function showStore(b) {
  storeShown = b; if (b.dead) { document.getElementById('storePop').hidden = true; storeShown = null; return; }
  const p = document.getElementById('storePop'), ln = (a, v) => `<div class="ln"><span>${a}</span><b>${v}</b></div>`, F = Math.floor;
  let html = `<h3>${b.name.toUpperCase()}</h3>`;
  if (b.kind === 'stockpile' || b.kind === 'keep') html += ln('Wood', F(res.wood)) + ln('Stone', F(res.stone)) + ln('Iron', F(res.iron)) + ln('Hops', F(res.hops)) + ln('Wheat', F(res.wheat)) + ln('Flour', F(res.flour));
  if (b.kind === 'granary' || b.kind === 'keep') html += granaryHtml() + ln('Berries', F(foodKinds.berries)) + ln('Crops', F(foodKinds.crops)) + ln('Bread', F(foodKinds.bread)) + ln('Ale', F(res.ale));
  if (b.kind === 'armory' || b.kind === 'keep') html += ln('Swords', res.sword) + ln('Maces', res.mace) + ln('Spears', res.spear) + ln('Bows', res.bow) + ln('Knight armor', res.armor);
  const q = structures.filter(o => o.kind === 'quarry' && o.team === 'player' && !o.dead && o.stock);
  if ((b.kind === 'stockpile' || b.kind === 'keep') && q.length) html += ln('Cut stone waiting at quarries', q.reduce((a, o) => a + o.stock, 0));
  if (b.kind === 'keep') html += insideHtml(b, 'Being cared for inside');
  html += granaryButtons(b) + fixRow;
  html += '<div style="font-size:13px;color:#d9c9a3;margin-top:6px">All your stores share one supply: these are your totals. Click the ground or press Esc to close.</div>';
  setBox(p, html); p.dataset.site = ''; p.hidden = false;
}
function onScreenPlayers() { return units.filter(u => u.team === 'player' && !u.dead && !u.inside && u.x > cam.x && u.x < cam.x + vw / cam.z && u.y > cam.y && u.y < cam.y + vh / cam.z); }

// in the real game, a command given ends the selection: send someone somewhere and they are let go at once
function issueAt(sx, sy) { const ok = issueAt0(sx, sy); if (ok && IND()) { selection.clear(); try { UI.setSelection(selectedList()); } catch (e) {} } return ok; }
function issueAt0(sx, sy) {
  const sel = selectedList().filter(u => u.type !== 'oxcart'); if (!sel.length) return false;
  for (const u of sel) { u.cmdT = time; if (u.guardOf && u.type !== 'knight') u.guardOf = null; if (u.type === 'king') u.leftKeep = true; }
  AudioSys.ui('ack');
  for (const u of sel) if (u.type === 'civ') { u.job = null; u.manualT = time; }
  const w = toWorld(sx, sy), hit = pickScreen(sx, sy);
  const civs = sel.filter(u => u.type === 'civ'), sold = sel.filter(u => u.type !== 'civ');
  if (hit && hit.team === 'enemy') {
    const rams = sold.filter(u => u.type === 'ram'), fighters = sold.filter(u => u.type !== 'ram');
    if (hit.x0 !== undefined) { if (sold.length) commandAttack(sold, hit); }
    else { if (fighters.length) commandAttack(fighters, hit); if (rams.length) commandMove(rams, w.x, w.y); }
    if (civs.length) commandMove(civs, w.x, w.y);
    return true;
  }
  if (hit && hit.team === 'player' && hit.done === false && civs.length) { commandBuild(civs, hit); if (sold.length) commandMove(sold, w.x, w.y); return true; }
  if (canMount(hit) && sold.some(u => u.type === 'archer')) { const arch = sold.filter(u => u.type === 'archer'); commandMount(arch, hit); const rest = sold.filter(u => u.type !== 'archer'); if (rest.length) commandMove(rest, w.x, w.y + 40); return true; }
  if (hit && hit.team === 'player' && hit.done && JOBS[hit.kind] && civs.length) {
    let added = 0;
    if (hit.asleep) { hit.asleep = false; floatText(hit.x, hit.y - hit.topH - 24, `${hit.name} wakes up`, '#9fe8a8'); }
    for (const u of civs) { if (staffOf(hit) >= maxStaff(hit.kind) && u.job !== hit) break; u.job = hit; u.manualT = -99; u.order = 'idle'; startJob(u); added++; }
    floatText(hit.x, hit.y - hit.topH - 10, added ? `${hit.name}: ${staffOf(hit)} worker${staffOf(hit) > 1 ? 's' : ''}${staffOf(hit) > 1 ? ` (${staffOf(hit)}x output)` : ''}` : `${hit.name} already has ${maxStaff(hit.kind)} workers`, '#9fe8a8');
    if (sold.length) commandMove(sold, w.x, w.y); return true;
  }
  { const kg = sold.find(u => u.type === 'king'); if (hit && hit.kind === 'keep' && hit.team === 'player' && kg) { kg.leftKeep = false; kg.cmdT = -999; if (kg.onWall !== hit) { const ap = approachPoint(kg, hit); commandMove([kg], ap.x, ap.y); } floatText(hit.x, hit.y - 150, 'The King returns to the keep', '#ffe9a8'); const rest = sold.filter(u => u !== kg); if (!civs.length && !rest.length) return true; sold.splice(sold.indexOf(kg), 1); } }
  if (hit && hit.kind === 'keep' && hit.team === 'player' && civs.length) { commandDeposit(civs); if (sold.length) commandMove(sold, w.x, w.y); return true; }
  const node = hit ? null : pickResourceScreen(sx, sy);
  if (node && isField(node.kind) && !node.done && civs.length) { commandBuild(civs, node); if (sold.length) commandMove(sold, w.x, w.y); return true; }
  if (node && civs.length) { commandGather(civs, node); if (sold.length) commandMove(sold, w.x, w.y); return true; }
  commandMove(sel, w.x, w.y);
  return true;
}

const pointers = new Map();
let drag = null, pinch = null, mouse = { x: -1, y: -1, inside: false }, hover = null, lastClick = { t: 0, x: 0, y: 0 }, orbit = null;
const edge = { x: -1, y: -1, on: false, held: 0, touchUntil: 0 };
// edge scrolling is for a real mouse only: touch screens can send stray 'mouse' positions (often the corner), which must not drag the view
window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && performance.now() > edge.touchUntil && (e.movementX || e.movementY || edge.on)) { edge.x = e.clientX; edge.y = e.clientY; edge.on = true; } });
window.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { edge.on = false; edge.touchUntil = performance.now() + 1500; } }, true);
window.addEventListener('blur', () => { edge.on = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) edge.on = false; });
function localPos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  const p = localPos(e); canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, p);
  if (e.pointerType === 'mouse') {
    if (settingRally && e.button === 0) { setRallyAt(p.x, p.y); return; }
    if (settingRally && e.button === 2) { settingRally = null; rallyButtons(); showBanner('Rally point unchanged.', 1.5); return; }
    if (e.button === 0) { drag = { sx: p.x, sy: p.y, x: p.x, y: p.y, box: false, shift: e.shiftKey, touch: false }; if (!placing && !tearing) holdStart(p); }
    else if (e.button === 2) { if (tearing) { tearing = false; tearButton(); } else if (placing) cancelPlacing(); else issueAt(p.x, p.y); }
    else if (e.button === 1) { pinch = { mid: true, x: p.x, y: p.y, cx: cam.x, cy: cam.y }; e.preventDefault(); }
  } else touchDown(p);
});
// ---------- touch (iPad, phone): tap to select, tap to command, one finger scrolls, two fingers zoom and turn ----------
const TOUCH = { mode: null, sx: 0, sy: 0, lx: 0, ly: 0, t0: 0, vx: 0, vy: 0, lt: 0, hold: null, lastTap: null, add: false };
const fling = { x: 0, y: 0 };
function twoInfo() { const [a, b] = [...pointers.values()]; return { d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
function panBy(x0, y0, x1, y1) {   // move the view so the ground under the finger follows the finger
  const w0 = toWorld(x0, y0), w1 = toWorld(x1, y1); if (!w0 || !w1) return { x: 0, y: 0 };
  const dx = w1.x - w0.x, dy = w1.y - w0.y; cam.x -= dx; cam.y -= dy; clampCam(); return { x: dx, y: dy };
}
function touchDown(p) {
  document.body.classList.add('touch'); fling.x = fling.y = 0; clearTimeout(TOUCH.hold);
  if (pointers.size === 1) {
    Object.assign(TOUCH, { mode: 'press', sx: p.x, sy: p.y, lx: p.x, ly: p.y, t0: performance.now(), lt: performance.now(), vx: 0, vy: 0 });
    if (!holdStart(p)) TOUCH.hold = setTimeout(() => { if (TOUCH.mode === 'press') { TOUCH.mode = 'box'; drag = { sx: TOUCH.sx, sy: TOUCH.sy, x: TOUCH.lx, y: TOUCH.ly, box: true, shift: TOUCH.add, touch: true }; markers.push(Object.assign(toWorld(TOUCH.sx, TOUCH.sy) || { x: 0, y: 0 }, { t: 0, col: '140,255,160' })); } }, 420);
  } else if (pointers.size === 2) { drag = null; TOUCH.mode = 'two'; Object.assign(TOUCH, twoInfo()); TOUCH.z0 = cam.z; TOUCH.d0 = TOUCH.d; }
}
function touchMove(p) {
  holdMove(p);
  if (TOUCH.mode === 'press' && Math.hypot(p.x - TOUCH.sx, p.y - TOUCH.sy) > 12) { TOUCH.mode = 'pan'; clearTimeout(TOUCH.hold); }
  if (TOUCH.mode === 'pan') {
    const now = performance.now(), d = panBy(TOUCH.lx, TOUCH.ly, p.x, p.y), dt = Math.max(1, now - TOUCH.lt) / 1000;
    TOUCH.vx = TOUCH.vx * 0.6 + (-d.x / dt) * 0.4; TOUCH.vy = TOUCH.vy * 0.6 + (-d.y / dt) * 0.4; TOUCH.lx = p.x; TOUCH.ly = p.y; TOUCH.lt = now;
  } else if (TOUCH.mode === 'box') { TOUCH.lx = p.x; TOUCH.ly = p.y; if (drag) { drag.x = p.x; drag.y = p.y; } }
  else if (TOUCH.mode === 'two' && pointers.size >= 2) {
    const t = twoInfo();
    const nz = clamp(TOUCH.z0 * t.d / TOUCH.d0, R3D.active ? 0.45 : minZoom(), 2.4);
    if (R3D.active) { const cx = cam.x + vw / cam.z / 2, cy = cam.y + vh / cam.z / 2; cam.z = nz; centerOn(cx, cy); }
    else { const w = toWorld(t.mx, t.my); cam.z = nz; cam.x = w.x - t.mx / cam.z; cam.y = w.y - t.my / cam.z; clampCam(); }
    panBy(TOUCH.mx, TOUCH.my, t.mx, t.my);
    TOUCH.ang = t.ang; TOUCH.mx = t.mx; TOUCH.my = t.my;
  }
}
function touchUp(p) {
  clearTimeout(TOUCH.hold);
  const mode = TOUCH.mode;
  if (pointers.size > 0) { holdEnd(); if (mode === 'two') TOUCH.mode = 'after'; return; }
  TOUCH.mode = null;
  if (holdEnd()) return;   /* held a person: his card is open */
  if (mode === 'pan') { if (performance.now() - TOUCH.lt < 160) { fling.x = clamp(TOUCH.vx, -2400, 2400); fling.y = clamp(TOUCH.vy, -2400, 2400); } return; }
  if (mode === 'box') {
    const bx0 = Math.min(TOUCH.sx, p.x) - 10, bx1 = Math.max(TOUCH.sx, p.x) + 10, by0 = Math.min(TOUCH.sy, p.y) - 12, by1 = Math.max(TOUCH.sy, p.y) + 12;
    const inBox = units.filter(u => { if (u.team !== 'player' || u.dead || u.inside) return false; const q = screenOf(u.x, u.y, 20 + (R3D.active ? elev3D(u) : elev2D(u))); return q.x > bx0 && q.x < bx1 && q.y > by0 && q.y < by1; });
    if (TOUCH.add) inBox.forEach(u => selection.add(u)); else selectOnly(inBox);
    drag = null; return;
  }
  if (mode === 'press') touchTap(p);
}
function touchTap(p) {
  if (settingRally) { setRallyAt(p.x, p.y); return; }
  if (tearing) { tearAt(p.x, p.y); return; }
  if (placing) { placeAt(p.x, p.y, false); return; }
  const hit = pickScreen(p.x, p.y), now = performance.now(), last = TOUCH.lastTap;
  TOUCH.lastTap = { t: now, x: p.x, y: p.y, hit };
  if (isMine(hit)) {
    if (IND() && last && last.hit === hit && now - last.t < 380 && Math.hypot(p.x - last.x, p.y - last.y) < 40) { selectOnly([hit]); showCard(hit); return; }   /* a double tap opens the person's box */
    if (last && last.hit && now - last.t < 380 && Math.hypot(p.x - last.x, p.y - last.y) < 40 && last.hit.type === hit.type) { selectOnly(onScreenPlayers().filter(u => u.type === hit.type || (hit.type !== 'civ' && u.type !== 'civ' && !isMachine(u) && !isMachine(hit)))); return; }
    if (TOUCH.add) { if (selection.has(hit)) selection.delete(hit); else selection.add(hit); return; }
    selectOnly([hit]); talkTo(hit); return;
  }
  if (hit && hit.team === 'player' && IND_BOX[hit.kind] && !selection.size) { showIndBox(hit); return; }
  if (hit && hit.team === 'player' && STORE_KINDS[hit.kind] && hit.done !== false && !selection.size) { showStore(hit); return; }
  if (hit && hit.team === 'player' && JOBS[hit.kind] && !selection.size) { showSite(hit); return; }
  if (hit && hit.team === 'player' && GUARD_TOWERS[hit.kind] && hit.done !== false && !selection.size) { showTower(hit); return; }
  if (hit && hit.team === 'player' && HALLS[hit.kind] && !selection.size) { showInside(hit); return; }
  if (hit && hit.team === 'player' && hit.kind === 'market' && !selection.size) { showMarket(hit); return; }
  if (hit && hit.team === 'player' && hit.x0 !== undefined && !selection.size) { showBasic(hit); return; }
  if (selection.size) { issueAt(p.x, p.y); return; }
  document.getElementById('storePop').hidden = true; storeShown = null;
}
document.getElementById('camAdd').onclick = () => { TOUCH.add = !TOUCH.add; document.getElementById('camAdd').classList.toggle('on', TOUCH.add); showBanner(TOUCH.add ? 'Add mode: tap people to add them to (or take them out of) your group.' : 'Add mode off: tapping a person selects just that person.', 2.5); };
canvas.addEventListener('pointermove', e => {
  const p = localPos(e);
  if (e.pointerType !== 'mouse') { if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p); touchMove(p); return; }
  if (e.pointerType === 'mouse') { mouse.x = p.x; mouse.y = p.y; mouse.inside = true; holdMove(p); }
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
  if (pinch && pinch.mid) { cam.x = pinch.cx - (p.x - pinch.x) / cam.z; cam.y = pinch.cy - (p.y - pinch.y) / cam.z; clampCam(); return; }
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (R3D.active) { const cx = cam.x + vw / cam.z / 2, cy = cam.y + vh / cam.z / 2; cam.z = clamp(pinch.z * d / Math.max(10, pinch.d), 0.45, 2.4); centerOn(cx, cy); return; }
    cam.z = clamp(pinch.z * d / Math.max(10, pinch.d), minZoom(), 2.4);
    cam.x = pinch.wm.x - mx / cam.z; cam.y = pinch.wm.y - my / cam.z; clampCam(); return;
  }
  if (drag) { drag.x = p.x; drag.y = p.y; if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) drag.box = true; }
});
function endPointer(e) {
  const p = localPos(e);
  if (e.pointerType !== 'mouse') { pointers.delete(e.pointerId); touchUp(p); pinch = null; return; }
  if (orbit) { orbit = null; pointers.delete(e.pointerId); return; }
  if (holdEnd()) { drag = null; pointers.delete(e.pointerId); return; }   /* held a person: his card is open */
  if (drag && pointers.has(e.pointerId) && tearing && !drag.box) { tearAt(p.x, p.y); drag = null; pointers.delete(e.pointerId); return; }
  if (drag && pointers.has(e.pointerId) && placing && !drag.box) { placeAt(p.x, p.y, drag.shift && !drag.touch); drag = null; pointers.delete(e.pointerId); return; }
  if (drag && pointers.has(e.pointerId)) {
    if (drag.box) {
      const bx0 = Math.min(drag.sx, p.x) - 8, bx1 = Math.max(drag.sx, p.x) + 8, by0 = Math.min(drag.sy, p.y) - 10, by1 = Math.max(drag.sy, p.y) + 10;
      const inBox = units.filter(u => { if (u.team !== 'player' || u.dead || u.inside) return false; const q = screenOf(u.x, u.y, 20 + (R3D.active ? elev3D(u) : elev2D(u))); return q.x > bx0 && q.x < bx1 && q.y > by0 && q.y < by1; });
      if (drag.shift && !drag.touch) inBox.forEach(u => selection.add(u)); else selectOnly(inBox);
    } else {
      const hit = pickScreen(p.x, p.y);
      if (drag.touch) {
        if (isMine(hit)) { if (selection.has(hit)) selection.delete(hit); else selection.add(hit); }
        else issueAt(p.x, p.y);
      } else {
        const now = performance.now();
        if (IND() && selection.size && !isMine(hit)) issueAt(p.x, p.y);   /* real game: with someone chosen, a click sends them (and lets them go) */
        else if (IND() && isMine(hit) && now - lastClick.t < 320 && Math.hypot(p.x - lastClick.x, p.y - lastClick.y) < 10) { selectOnly([hit]); showCard(hit); }   /* a double click opens the person's box */
        else if (isMine(hit) && now - lastClick.t < 320 && Math.hypot(p.x - lastClick.x, p.y - lastClick.y) < 10) selectOnly(onScreenPlayers());
        else if (isMine(hit)) { if (drag.shift) { selection.has(hit) ? selection.delete(hit) : selection.add(hit); } else { selectOnly([hit]); talkTo(hit); } }
        else if (hit && hit.team === 'player' && IND_BOX[hit.kind]) showIndBox(hit);
        else if (hit && hit.team === 'player' && STORE_KINDS[hit.kind] && hit.done !== false) showStore(hit);
        else if (hit && hit.team === 'player' && JOBS[hit.kind]) showSite(hit);
        else if (hit && hit.team === 'player' && GUARD_TOWERS[hit.kind] && hit.done !== false) showTower(hit);
        else if (hit && hit.team === 'player' && HALLS[hit.kind]) showInside(hit);
        else if (hit && hit.team === 'player' && hit.kind === 'market') showMarket(hit);
        else if (hit && hit.team === 'player' && hit.x0 !== undefined) showBasic(hit);
        else if (!hit && pickResource(toWorld(p.x, p.y).x, toWorld(p.x, p.y).y) && isField((pickResource(toWorld(p.x, p.y).x, toWorld(p.x, p.y).y) || {}).kind) && !selection.size) showSite(pickResource(toWorld(p.x, p.y).x, toWorld(p.x, p.y).y));
        else if (!drag.shift) { selection.clear(); document.getElementById('storePop').hidden = true; storeShown = null; }
        lastClick = { t: now, x: p.x, y: p.y };
      }
    }
    drag = null;
  }
  pointers.delete(e.pointerId);
  if (pinch && (pinch.mid || pointers.size < 2)) pinch = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); drag = null; pinch = null; clearTimeout(TOUCH.hold); TOUCH.mode = null; });
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') mouse.inside = false; });
canvas.addEventListener('wheel', e => {
  e.preventDefault(); const p = localPos(e), w = toWorld(p.x, p.y);
  const base = zoomAnim ? zoomAnim.z : cam.z, dz = clamp(e.deltaY, -120, 120);
  zoomAnim = { z: clamp(base * Math.exp(-dz * 0.0018), R3D.active ? 0.45 : minZoom(), 2.4), sx: p.x, sy: p.y };
}, { passive: false });
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'Escape' && settingRally) { settingRally = null; rallyButtons(); return; }
  if (e.key === 'Escape') { if (!document.getElementById('help').classList.contains('hide')) toggleHelp(); else if (UI.closePops()) {} else if (tearing) { tearing = false; tearButton(); } else if (placing) cancelPlacing(); else selection.clear(); }
  if (['1', '2', '3', '4', '5'].includes(e.key)) UI.showTab(['town', 'castle', 'army', 'rule', 'industry'][+e.key - 1]);
  if (e.key === 'Tab') { e.preventDefault(); UI.toggleHide(); }
  if (e.key === 'h' || e.key === 'H') toggleHelp();
  if (e.key === 'p' || e.key === 'P') setPaused(!paused);
  if ((e.key === 'z' || e.key === 'Z') && storeShown && JOBS[storeShown.kind]) siteAction(storeShown, 'sleep');
  if (placing && !isLine(placing.kind) && ['r', 'R', 't', 'T'].includes(e.key)) turnPlacing();
  if (e.key === ' ' && started) { e.preventDefault(); goHome(); }
  if (e.key === 'm' || e.key === 'M') { const anyOn = AudioSys.isOn('music') || AudioSys.isOn('sfx'); AudioSys.setOn('music', !anyOn); AudioSys.setOn('sfx', !anyOn); refreshSoundButtons(); }
  if (e.key === 's' || e.key === 'S') commandStop(selectedList());
  if (e.key.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });
document.getElementById('btnAll').onclick = () => selectOnly(units);
document.getElementById('btnSold').onclick = () => selectOnly(units.filter(u => u.type !== 'civ' && u.type !== 'oxcart'));
document.getElementById('btnCiv').onclick = () => selectOnly(units.filter(u => u.type === 'civ'));
document.querySelectorAll('.tb').forEach(b => { b.onclick = () => trainUnit(b.dataset.k); b.oncontextmenu = e => { e.preventDefault(); cancelTrain(b.dataset.k); }; });
// rings that empty as each one is made, a count of how many are waiting, and the seconds left
function updateTrainButtons() {
  document.querySelectorAll('.tb').forEach(b => {
    const k = b.dataset.k, list = trainQueue.filter(q => q.kind === k), head = list[0];
    b.classList.toggle('queued', list.length > 0); b.classList.toggle('training', !!head);
    if (head) { b.style.setProperty('--p', Math.max(0, 1 - head.t / head.dur).toFixed(3)); b.querySelector('.secs').textContent = Math.ceil(head.dur - head.t) + 's'; }
    b.querySelector('.cnt').textContent = list.length;
  });
}
document.querySelectorAll('.wb').forEach(b => b.onclick = () => buyWeapon(b.dataset.w));
function toggleHelp() { document.getElementById('help').classList.toggle('hide'); }
document.getElementById('btnHelp').onclick = toggleHelp;
document.getElementById('btnClear').onclick = () => selection.clear();
document.getElementById('btnStop').onclick = () => commandStop(selectedList());
document.getElementById('again').onclick = () => location.reload();

// ---------- HUD ----------

let hudT = 0, won = false, alertCooldown = 0, bannerTimer = null;
function showBanner(html, secs) {
  const b = document.getElementById('banner'); b.innerHTML = html; b.style.opacity = 1; b.classList.add('shown');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { b.style.opacity = 0; b.classList.remove('shown'); }, secs * 1000);
}
function endGame(title, text) {
  won = true;
  AudioSys.stopMusic(1.5); AudioSys.ui(title === 'VICTORY' ? 'victory' : 'defeat');
  setTimeout(() => { document.getElementById('endTitle').textContent = title; document.getElementById('endText').textContent = text; document.getElementById('win').style.display = 'flex'; }, 1500);
}
function updateHud() {
  { const tb = document.getElementById('btnTurn'), on = !!(placing && !isLine(placing.kind) && started); if (tb.hidden === on) tb.hidden = !on; if (on) { const t = 'faces ' + DIR_NAME[placing.dir || 0]; const el = document.getElementById('turnDir'); if (el.textContent !== t) el.textContent = t; } }
  if (!started) return;
  const mine = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && !u.gift).length;
  const pop = mine + trainQueue.filter(q => !MACHINE[q.kind]).length;
  const foes = enemiesOf('player').filter(e => !isWall(e)).length;
  const towerUp = structures.some(s => !s.dead);
  const raid = towerUp ? `Next raid in <b>${Math.floor(raidTimer / 60)}:${String(Math.floor(raidTimer % 60)).padStart(2, '0')}</b>` : '<b>Raids stopped</b>';
  UI.setStatus({ civ: CIV.name, civColor: CIV.color === '#2f63b0' ? '#8fb6ff' : CIV.color === '#3f8a3a' ? '#9fe39a' : '#c4adff',
    food: Math.floor(res.food), eat: Math.round(mine * 60 * RATIONS[ration].eat / CIV.eatEvery), wood: Math.floor(res.wood), stone: Math.floor(res.stone), gold: Math.floor(res.gold),
    pop, cap: popCap(), idle: idleCount(), mood: Math.round(mood), moodName: moodName(), moodColor: mood >= 70 ? '#9fe39a' : mood >= 40 ? '#ffd98a' : mood >= 20 ? '#ffb38a' : '#ff8a7a',
    moodRate: Math.round(moodRate), foes, raid: REALM.on ? (() => { const t = Math.min(...REALM.rivals.filter(R => !R.friend && !R.defeated).map(R => R.raidT), 9999); return t > 9000 ? 'none' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; })() : towerUp ? (raidCount === 0 ? 'Peace ' : '') + `${Math.floor(raidTimer / 60)}:${String(Math.floor(raidTimer % 60)).padStart(2, '0')}` : 'stopped' });
  document.querySelectorAll('.tb').forEach(b => { const w = whyNotTrain(b.dataset.k); b.classList.toggle('off', !!w); const el = b.querySelector('.why'); if (el) el.textContent = w; });
  document.querySelectorAll('.wb').forEach(b => { const w = !hasArmory() ? 'build an armory' : res.gold < weaponPrice(b.dataset.w) ? `need ${weaponPrice(b.dataset.w) - Math.floor(res.gold)} more gold` : ''; { const sm = b.querySelector('small'), t = weaponPrice(b.dataset.w) + ' gold'; if (sm && sm.textContent !== t) sm.textContent = t; } b.classList.toggle('off', !!w); const el = b.querySelector('.why'); if (el) el.textContent = w; });
  const ar = document.getElementById('armoryInfo'); const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`; if (ar) ar.textContent = `Weapons: ${pl(res.sword, 'sword')}, ${pl(res.mace, 'mace')}, ${pl(res.spear, 'spear')}, ${pl(res.bow, 'bow')}, ${res.armor} armor` + (hasArmory() ? '' : ' · build an Armory to buy more');
  document.querySelectorAll('.rb').forEach(b => b.classList.toggle('on', b.dataset.r !== undefined ? +b.dataset.r === ration : +b.dataset.t === tax));
  document.getElementById('feast').classList.toggle('off', res.gold < 50);
  document.querySelectorAll('.bb[data-b]').forEach(b => { const kb = b.dataset.b, d = BUILD[kb], lim = (kb === 'garden' || kb === 'stocks') && countOf(kb) >= 3; b.classList.toggle('off', !afford(d) || lim); const why = b.querySelector('.why'); if (why) { const l = lacking(d), need = l === 'wood' ? d.wood - Math.floor(res.wood) : l === 'stone' ? d.stone - Math.floor(res.stone) : (d.gold || 0) - Math.floor(res.gold); why.textContent = lim ? 'limit of 3 reached' : afford(d) ? '' : `need ${need} more ${l}`; } b.classList.toggle('on', !!placing && placing.kind === b.dataset.b); });
  document.getElementById('queue').textContent = trainQueue.length ? `In training: ${trainQueue.length} (right-click a button to cancel one)` : '';
  const sel = selectedList();
  UI.setSelection(sel);
  if (!won && REALM.on && REALM.rivals.length && REALM.rivals.every(R => R.friend || R.defeated)) endGame('VICTORY', 'Every rival who stood against you has fallen.');
  else if (!won && !REALM.on && foes === 0) endGame('VICTORY', 'The enemy camp has been destroyed.');
  else if (!won && !playerKeep()) endGame('DEFEAT', 'Your keep has fallen.');
  else if (!won && mine === 0 && !trainQueue.length && res.food < 40) endGame('DEFEAT', 'Your people are gone.');
}

