'use strict';
// Stronghold Destroyer — Phase 4E: Gerald's layout changes.
//  1. The troop controls are a diamond at the bottom left (no more bar across the bottom): four arrows round the edge
//     move the chosen soldiers that way; Patrol, Guard, Add and Stop between them; in the middle, two walking soldiers
//     that open the formations. Round the outside: People, choose all soldiers, back to the castle, let go; and beside
//     it: choose everyone, choose the citizens (and Hekaranok's bell).
//  2. One tap on a hint, a banner, an alert or the Art of War advice puts it away. A double tap (or double click) on any
//     box, away from its buttons, closes it.
//  3. On a phone the buttons show their picture only; the name shows when you touch one (or hover with a mouse).
// The diamond is made from the game's own buttons (same names, same jobs), moved out of the old bottom bar.

(function () {
  const $ = id => document.getElementById(id);
  const view = $('view'); if (!view) return;
  const svg = (inner, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
  const S = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  const ICON = {
    up: svg(`<path d="M12 4 L20 14 H15 V20 H9 V14 H4 Z" fill="currentColor"/>`),
    patrol: svg(`<path d="M4 18 C8 6, 14 20, 20 6" ${S} stroke-dasharray="3 2.4"/><path d="M16.5 5 L20.5 5 L19.6 9" ${S}/>`),
    guard: svg(`<path d="M12 2 L20 5 V11 C20 16 16 20 12 22 C8 20 4 16 4 11 V5 Z" fill="currentColor" opacity=".9"/><path d="M12 6 V18 M7 11 H17" stroke="#1c140b" stroke-width="1.8"/>`),
    add: svg(`<circle cx="9" cy="7" r="3.4" fill="currentColor"/><path d="M2.5 20 C3 14 6 12 9 12 C12 12 15 14 15.5 20 Z" fill="currentColor"/><path d="M19 7 V15 M15 11 H23" ${S} stroke-width="2.8"/>`),
    stop: svg(`<path d="M8 2 H16 L22 8 V16 L16 22 H8 L2 16 V8 Z" fill="#c8402e" stroke="#ffd7c9" stroke-width="1.3"/><rect x="6.5" y="10.3" width="11" height="3.4" rx="1" fill="#fff"/>`),
    march: svg(`<g fill="currentColor"><circle cx="8" cy="4.2" r="2.2"/><path d="M6.4 7 H9.4 L10.6 12.5 L13 15 L11.8 16.2 L9 13.6 L8.6 16 L10.4 21.5 L8.6 22 L6.4 16.4 L5 21.8 L3.2 21.3 L5.2 13.6 Z"/><circle cx="17" cy="4.2" r="2.2"/><path d="M15.4 7 H18.4 L19.6 12.5 L22 15 L20.8 16.2 L18 13.6 L17.6 16 L19.4 21.5 L17.6 22 L15.4 16.4 L14 21.8 L12.2 21.3 L14.2 13.6 Z"/></g><path d="M11.2 2.5 L11.2 12 M20.2 2.5 L20.2 12" stroke="currentColor" stroke-width="1.2"/>`),
    swords: svg(`<path d="M4 4 L14 14 M20 4 L10 14" ${S} stroke-width="2.6"/><path d="M12.5 16.5 L16 13 M11.5 16.5 L8 13 M15 18 L18 21 M9 18 L6 21" ${S}/>`),
    all: svg(`<g fill="currentColor"><circle cx="6" cy="8" r="2.6"/><circle cx="12" cy="6" r="3"/><circle cx="18" cy="8" r="2.6"/><path d="M1.5 19 C2 14 4 12.5 6 12.5 C8 12.5 9 13.5 9.5 15 L9 19 Z M7 20 C7.5 14 9.5 11.5 12 11.5 C14.5 11.5 16.5 14 17 20 Z M14.5 15 C15 13.5 16 12.5 18 12.5 C20 12.5 22 14 22.5 19 L15 19 Z"/></g>`),
    civ: svg(`<g fill="currentColor"><path d="M6.5 7.5 C7 3.5 17 3.5 17.5 7.5 Z"/><rect x="4" y="7" width="16" height="1.8" rx=".9"/><circle cx="12" cy="11.5" r="3"/><path d="M5 22 C5.5 16.5 8.5 14.8 12 14.8 C15.5 14.8 18.5 16.5 19 22 Z"/></g>`),
    clear: svg(`<path d="M6 6 L18 18 M18 6 L6 18" ${S} stroke-width="3"/>`),
    home: svg(`<path d="M3 21 V9 H6 V6 H9 V9 H11 V5 H13 V9 H15 V6 H18 V9 H21 V21 H14 V16 C14 14.6 13 13.6 12 13.6 C11 13.6 10 14.6 10 16 V21 Z" fill="currentColor"/>`),
    bell: svg(`<path d="M12 3 C8 3 6.5 6 6.5 10 V14 L4.5 17 H19.5 L17.5 14 V10 C17.5 6 16 3 12 3 Z" fill="currentColor"/><circle cx="12" cy="19.5" r="2" fill="currentColor"/>`)
  };
  const dots = pts => svg(pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="currentColor"/>`).join(''));
  const FICON = {
    free: dots([[7, 7], [12, 7], [17, 7], [7, 12], [12, 12], [17, 12], [7, 17], [12, 17], [17, 17]]),
    line: dots([[3, 12], [7.5, 12], [12, 12], [16.5, 12], [21, 12]]),
    column: dots([[9.5, 3.5], [14.5, 3.5], [9.5, 9], [14.5, 9], [9.5, 14.5], [14.5, 14.5], [9.5, 20], [14.5, 20]]),
    wedge: dots([[12, 4], [9, 9], [15, 9], [6, 14], [12, 14], [18, 14], [3, 19], [9, 19], [15, 19], [21, 19]]),
    square: dots([[4, 4], [12, 4], [20, 4], [4, 12], [20, 12], [4, 20], [12, 20], [20, 20]]),
    circle: dots([0, 1, 2, 3, 4, 5, 6, 7].map(i => [12 + Math.cos(i * Math.PI / 4) * 8, 12 + Math.sin(i * Math.PI / 4) * 8])),
    loose: dots([[4, 5], [13, 3.5], [20, 7], [7, 13], [16, 12], [3, 20], [11, 20.5], [20, 18]])
  };

  // ---------- the names: shown when a button is touched (or hovered with a mouse) ----------
  const L = $('ibLabel');
  function showName(b, text, sub) {
    if (!L || !text) return;
    const r = b.getBoundingClientRect();
    L.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    L.style.left = Math.max(70, Math.min(innerWidth - 70, r.left + r.width / 2)) + 'px'; L.style.top = Math.max(40, r.top - 6) + 'px'; L.hidden = false;
    clearTimeout(showName.t); showName.t = setTimeout(() => { L.hidden = true; }, 1600);
  }
  function named(b, name, sub) {
    b.dataset.dname = name; if (sub) b.dataset.dsub = sub; b.setAttribute('aria-label', name); b.removeAttribute('title');
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showName(b, b.dataset.dname, b.dataset.dsub); });
    b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && L) L.hidden = true; });
    b.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') showName(b, b.dataset.dname, b.dataset.dsub); });
  }

  // ---------- 1. the diamond ----------
  const D = document.createElement('div'); D.id = 'diamond'; D.hidden = true; D.setAttribute('role', 'group'); D.setAttribute('aria-label', 'Troop controls');
  D.innerHTML = `<div class="dgrid"></div><div class="dside"></div><div id="dFan" hidden role="menu" aria-label="Formations"></div><div id="dInfo" hidden></div>`;
  view.appendChild(D);
  const grid = D.querySelector('.dgrid'), side = D.querySelector('.dside'), fan = $('dFan'), info = $('dInfo');
  const take = (id, html) => { const b = $(id) || document.createElement('button'); if (!b.id) b.id = id; b.className = ''; if (html !== undefined) b.innerHTML = html; b.hidden = false; return b; };
  // the grid is turned a quarter round to stand as a diamond: [row 0] top point, upper right, right point;
  // [row 1] upper left, middle, lower right; [row 2] left point, lower left, bottom point
  const cell = (b, icon, name, sub, cls) => { b.classList.add('dc'); if (cls) b.classList.add(cls); if (icon) b.innerHTML = `<span class="ic">${icon}</span>`; named(b, name, sub); grid.appendChild(b); return b; };
  const arrow = (dir, deg, name) => { const b = document.createElement('button'); b.id = 'dMove' + dir; const ic = ICON.up.replace('<svg ', `<svg style="transform:rotate(${deg}deg)" `); return cell(b, ic, name, 'The chosen soldiers walk a short way this way', 'arrow'); };
  const up = arrow('Up', 0, 'Move up'), right = arrow('Right', 90, 'Move right'), down = arrow('Down', 180, 'Move down'), left = arrow('Left', 270, 'Move left');
  const patrol = take('btnPatrol'), guard = take('btnGuardA'), add = take('camAdd'), stop = take('btnStop');
  const march = document.createElement('button'); march.id = 'dMarch';
  cell(guard, ICON.guard, 'Guard', 'Then tap the place they should hold'); cell(patrol, ICON.patrol, 'Patrol', 'Then draw the route with your finger or the mouse');
  cell(add, ICON.add, 'Add', 'Tap more soldiers to add them to the group; soldiers you train join its formation (tap Add again to stop)'); cell(stop, ICON.stop, 'Stop', 'Stop where they are', 'stop');
  cell(march, '', 'Formation', 'Choose a shape, then send them anywhere', 'mid');
  march.innerHTML = `<span class="ic">${ICON.march}</span><b id="dCount" hidden></b><i id="dForm"></i>`;
  [up, guard, right, patrol, march, stop, left, add, down].forEach(b => grid.appendChild(b));
  // round the outside: the corners of the diamond's square, and a short column beside it
  const sat = (id, icon, name, sub, pos) => { const b = take(id, icon ? `<span class="ic">${icon}</span>` : undefined); b.classList.add('dsat', pos); named(b, name, sub); (pos === 'col' ? side : D).appendChild(b); return b; };
  const people = $('btnPeople'); if (people) { people.querySelectorAll('span').forEach(s => s.remove()); [...people.childNodes].forEach(n => { if (n.nodeType === 3) n.remove(); }); people.className = ''; people.classList.add('dsat', 'tl'); named(people, 'People', 'Your people: who they are, their work and their worries'); D.appendChild(people); }
  sat('btnSold', ICON.swords, 'Soldiers', 'Choose all your soldiers', 'tr');
  sat('camHome', ICON.home, 'Castle', 'Back to your castle (Space)', 'bl');
  sat('btnClear', ICON.clear, 'Let go', 'Let go of the chosen people', 'br');
  sat('btnAll', ICON.all, 'Everyone', 'Choose everyone', 'col');
  sat('btnCiv', ICON.civ, 'Citizens', 'Choose all your citizens', 'col');
  { const bell = $('btnBell'); if (bell) { const was = bell.hidden; sat('btnBell', ICON.bell, 'Ring the bell', 'Every soldier comes home to heal, then walks back', 'col'); bell.hidden = was; } }
  // the old bottom bar keeps only what nothing else shows (the chosen count and their names live in the diamond now)
  const box = $('selbox'); if (box) info.appendChild(box);
  const old = $('cmdbar'); if (old) old.classList.add('gone4e');

  // the formations, fanned out above the diamond
  fan.innerHTML = FORMATION_ORDER.map(k => `<button class="dfm" data-f="${k}" role="menuitemradio"><span class="ic">${FICON[k]}</span></button>`).join('');
  fan.querySelectorAll('.dfm').forEach(b => named(b, FORMATIONS[b.dataset.f].name, FORMATIONS[b.dataset.f].tip));
  const chosenSoldiers = () => selectedList().filter(u => u.type !== 'oxcart' && !u.dead);
  function setFormation(k) {
    formationNow = k; fan.querySelectorAll('.dfm').forEach(b => { const on = b.dataset.f === k; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    $('dForm').innerHTML = k === 'free' ? '' : FICON[k];
  }
  setFormation(typeof formationNow === 'string' ? formationNow : 'free');
  march.onclick = () => { fan.hidden = !fan.hidden; march.classList.toggle('open', !fan.hidden); };
  fan.addEventListener('click', e => {
    const b = e.target.closest('.dfm'); if (!b) return;
    setFormation(b.dataset.f); fan.hidden = true; march.classList.remove('open');
    // chosen soldiers take the shape where they stand, facing the way they look; then send them anywhere
    const l = chosenSoldiers();
    if (l.length > 1) { const cx = l.reduce((a, u) => a + u.x, 0) / l.length, cy = l.reduce((a, u) => a + u.y, 0) / l.length;
      commandMarch(l, cx, cy, formationNow, screenWay(0, -1));   /* facing up the screen */
      showBanner(`${FORMATIONS[formationNow].name}: tap where they should march`, 3); }
    else showBanner(`${FORMATIONS[formationNow].name}: your soldiers will march in this shape`, 3);
    AudioSys.ui && AudioSys.ui('click');
  });
  // a way on the screen (up, right ...) as a way on the ground, whichever way the view is turned
  function screenWay(dx, dy) {
    const c = document.getElementById('game').getBoundingClientRect(), mx = c.width / 2, my = c.height / 2;
    const a = toWorld(mx, my), b = toWorld(mx + dx * 120, my + dy * 120); if (!a || !b) return { x: dx, y: dy };
    const vx = b.x - a.x, vy = b.y - a.y, d = Math.hypot(vx, vy) || 1; return { x: vx / d, y: vy / d };
  }
  // the arrows: a short march that way
  const STEP = 5 * TILE;
  function nudge(dx, dy) {
    const l = chosenSoldiers(); if (!l.length) { needSoldiers(); return; }
    const w = screenWay(dx, dy), vx = w.x, vy = w.y;
    const cx = l.reduce((s, u) => s + u.x, 0) / l.length, cy = l.reduce((s, u) => s + u.y, 0) / l.length;
    for (const u of l) { u.cmdT = time; if (typeof clearDuty === 'function') clearDuty(u); }
    commandMarch(l, clamp(cx + vx * STEP, 40, MW - 40), clamp(cy + vy * STEP, 40, MH - 40));
    if (l.length === 1) { l[0].faceAng = Math.atan2(vx, vy); }
    AudioSys.ui && AudioSys.ui('ack');
  }
  function needSoldiers() { showBanner('Choose soldiers first: tap one, or the crossed swords beside the diamond for all of them.', 3); }
  up.onclick = () => nudge(0, -1); down.onclick = () => nudge(0, 1); left.onclick = () => nudge(-1, 0); right.onclick = () => nudge(1, 0);
  // Add works with the mouse too (click more soldiers to add them); soldiers trained while it is on join the group (4G)
  add.classList.toggle('on', !!TOUCH.add);

  // dimmed while nobody is chosen; the number chosen on the middle button
  let lastN = -1, lastKey = '';
  function sync() {
    const live = typeof started !== 'undefined' && started && !won;
    if (D.hidden === live) D.hidden = !live;
    if (!live) { fan.hidden = true; return; }
    const l = chosenSoldiers(), n = l.length;
    if (n !== lastN) {
      lastN = n; D.classList.toggle('none', !n);
      const c = $('dCount'); c.hidden = !n; c.textContent = n > 99 ? '99+' : n;
      for (const b of [up, down, left, right, patrol, guard, stop]) b.classList.toggle('dim', !n);
    }
    const key = (TOUCH.add ? 1 : 0) + ':' + (orderMode || '');
    if (key !== lastKey) { lastKey = key; add.classList.toggle('on', !!TOUCH.add); patrol.classList.toggle('on', orderMode === 'patrol'); guard.classList.toggle('on', orderMode === 'guard'); }
  }
  setInterval(sync, 200); { const _uh = updateHud; updateHud = function () { _uh.apply(this, arguments); sync(); }; }
  // a dimmed button says why instead of doing nothing
  for (const b of [up, down, left, right, patrol, guard, stop]) b.addEventListener('click', e => { if (!chosenSoldiers().length) { e.stopImmediatePropagation(); needSoldiers(); } }, true);   /* (who is chosen now, not the last look) */
  // the diamond looks again as soon as the choice changes
  for (const id of ['btnSold', 'btnAll', 'btnCiv', 'btnClear']) { const b = $(id); if (b) b.addEventListener('click', () => setTimeout(sync, 0)); }
  { const canvas = $('game'); if (canvas) for (const ev of ['pointerup', 'click']) canvas.addEventListener(ev, () => setTimeout(sync, 0)); }
  // the chosen soldiers' names: touch the number
  march.addEventListener('pointerdown', () => { const lab = $('selLabel'), sum = $('selSum'); if (lastN > 0 && lab) setTimeout(() => showName(march, lab.textContent, sum ? sum.textContent : ''), 0); });

  // ---------- 2. put hints away with a tap; close any box with a double tap ----------
  const HINTS = ['tips', 'banner', 'alertBar', 'leftNote', 'menuNote'];
  function putAway(el) {
    if (el.id === 'banner') { el.style.opacity = 0; el.classList.remove('shown'); if (typeof bannerTimer !== 'undefined') clearTimeout(bannerTimer); return; }
    if (el.id === 'tips') { el.classList.add('gone4e'); el.dataset.tip = (typeof ADVISOR !== 'undefined' && ADVISOR.shown) || ''; return; }
    el.hidden = true;
  }
  for (const id of HINTS) { const el = $(id); if (!el) continue;
    el.classList.add('tapaway');
    el.addEventListener('click', e => { if (e.target.closest('button,a,input,select,textarea') && !e.target.closest('.xbtn')) return; e.stopPropagation(); putAway(el); });
  }
  // a new tip from the Art of War comes back after one was put away
  setInterval(() => { const t = $('tips'); if (t && t.classList.contains('gone4e') && typeof ADVISOR !== 'undefined' && ADVISOR.shown && ADVISOR.shown !== t.dataset.tip) t.classList.remove('gone4e'); }, 500);
  // any box: a double tap or double click away from its buttons closes it
  const BOXES = '.pop, #help .box, #trophyPop, #storePop, #menuPop, #goodsPop, #moodPop, #peoplePop, #personPop, #rivalsPop, #stagePop, #loadPop';
  const isControl = t => !!t.closest('button, a, input, select, textarea, label, [role=button], [role=menuitem], .bb, .hlpRow, .hlpCard, .hlpLink');
  function closeBox(el) {
    if (el.matches('#help .box') || el.closest('#help')) { if (typeof toggleHelp === 'function' && !$('help').classList.contains('hide')) toggleHelp(); return; }
    const x = el.querySelector(':scope > .xbtn, :scope > [data-close], .xbtn, [data-close]');
    if (x) { x.click(); if (el.hidden || getComputedStyle(el).display === 'none') return; }
    el.hidden = true;
  }
  let lastTap = null;
  document.addEventListener('pointerup', e => {
    const el = e.target.closest && e.target.closest(BOXES); if (!el || isControl(e.target)) { if (!el) lastTap = null; return; }
    const now = performance.now();
    if (lastTap && lastTap.el === el && now - lastTap.t < 380 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 36) { lastTap = null; closeBox(el); return; }
    lastTap = { el, t: now, x: e.clientX, y: e.clientY };
  }, true);

  // ---------- 3. on a phone: pictures, and the names only when touched ----------
  document.addEventListener('pointerdown', e => {
    if (!document.body.classList.contains('phone')) return;
    const ch = e.target.closest && e.target.closest('#status .chip, #catBar button'); if (!ch) return;
    const name = ch.id === 'cCiv' ? ch.title : (ch.querySelector('span') && ch.closest('#catBar') ? ch.querySelector('span').textContent : (ch.getAttribute('title') || ch.getAttribute('aria-label') || '').split(':')[0]);
    let val = ''; if (ch.id === 'cMood') val = ($('vMood') || {}).textContent || ''; else if (ch.id === 'cTax') val = ($('vTax') || {}).textContent || '';
    showName(ch, name, val && val !== name ? val.replace(/[●○]/g, '') : '');
  }, true);

  window.UI4E = { diamond: D, setFormation, nudge, sync, closeBox, putAway, ICON, FICON };
})();
