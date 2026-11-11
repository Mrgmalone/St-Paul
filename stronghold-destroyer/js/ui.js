'use strict';
// Stronghold Destroyer — interface: status chips, tabs, pictures, minimap, mood report, menu.
// Loaded in order by index.html; all files share one global scope.

// ---------- interface: status chips, tabs, pictures, minimap, mood report, menu ----------
const UI = (() => {
  const statusEl = document.getElementById('status'), $ = id => document.getElementById(id);
  let built = false, miniBase = null, miniBaseT = 0;
  // --- small pictures drawn with the game's own artwork ---
  function fakeUnit(type) {
    return { kind: 'unit', type, team: 'player', x: 0, y: 0, pal: type === 'civ' ? PAL.civ : PAL.player, skin: '#d9a57a', hair: '#4a2e18', seed: 1,
      facing: 1, walkPhase: 0, moving: false, attackAnim: 0, combatT: 0, order: 'idle', dead: false, deathT: 0, flash: 0, carry: 0, carryType: null,
      task: type === 'civ' ? { type: 'wood', node: null } : null, sub: null, look: { beard: true, longHair: false, w: 1, h: 1 }, radius: 11 };
  }
  function iconBuilding(g, name, w, h) { drawBuildingIcon(g, name, w, h); }
  function iconUnit(g, type, w, h) {
    const u = fakeUnit(type), name = ATLAS.ready && ART_UNIT[type], f = name && ATLAS.frames[name + '/front'];
    if (f) { const sc = Math.min((h - 4) / f.h, (w - 4) / f.w); g.drawImage(teamAtlas('player'), f.x, f.y, f.w, f.h, w / 2 - f.w * sc / 2, h - 2 - f.h * sc, f.w * sc, f.h * sc); if (type === 'king') drawCrown(g, w / 2, h - 2 - f.h * sc + 3, '#f2c84a'); return; }
    g.save(); g.translate(w / 2, h - 3);
    if (MACHINE[type]) { const sc = Math.min((w - 4) / 60, (h - 4) / 58); g.scale(sc, sc); u.animDur = 1; drawMachine(g, u, 0); }
    else { const sc = (h - 4) / 46; g.scale(sc, sc); drawPerson(g, u, 0); }
    g.restore();
  }
  function iconWeapon(g, name, w, h) {
    const ol = 'rgba(20,12,4,0.85)'; g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.translate(w / 2 - 4, h / 2 + 2); g.rotate(-0.7);
    if (name === 'sword') {
      g.fillStyle = '#dfe5ea'; g.strokeStyle = ol; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-2.4, -6); g.lineTo(-2.4, -26); g.lineTo(0, -30); g.lineTo(2.4, -26); g.lineTo(2.4, -6); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(120,130,140,0.8)'; g.beginPath(); g.moveTo(0, -8); g.lineTo(0, -26); g.stroke();
      g.fillStyle = '#c9a14a'; g.strokeStyle = ol; g.fillRect(-8, -7, 16, 3); g.strokeRect(-8, -7, 16, 3);
      g.fillStyle = '#6a4424'; g.fillRect(-1.8, -4, 3.6, 9); g.strokeRect(-1.8, -4, 3.6, 9);
      g.fillStyle = '#c9a14a'; g.beginPath(); g.arc(0, 7, 2.6, 0, Math.PI * 2); g.fill(); g.stroke();
    } else if (name === 'spear') {
      g.strokeStyle = ol; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 14); g.lineTo(0, -22); g.stroke();
      g.strokeStyle = '#8a6236'; g.lineWidth = 2.4; g.stroke();
      g.fillStyle = '#dfe5ea'; g.lineWidth = 1; g.beginPath(); g.moveTo(-3.6, -21); g.lineTo(0, -32); g.lineTo(3.6, -21); g.lineTo(0, -18); g.closePath(); g.fill(); g.stroke();
    } else {
      g.rotate(0.7); g.translate(-2, -8);
      g.strokeStyle = ol; g.lineWidth = 4.4; g.beginPath(); g.arc(-12, 0, 20, -1.05, 1.05); g.stroke();
      g.strokeStyle = '#9a6a34'; g.lineWidth = 2.8; g.stroke();
      const a = 1.05, x0 = -12 + 20 * Math.cos(a), y0 = 20 * Math.sin(a);
      g.strokeStyle = '#efe6d0'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x0, -y0); g.lineTo(x0, y0); g.stroke();
      g.strokeStyle = '#6a4424'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-10, 0); g.lineTo(14, 0); g.stroke();
      g.fillStyle = '#dfe5ea'; g.beginPath(); g.moveTo(14, -2.5); g.lineTo(19, 0); g.lineTo(14, 2.5); g.closePath(); g.fill();
    }
    g.restore();
    g.fillStyle = '#e8c04a'; g.strokeStyle = 'rgba(90,60,10,0.9)'; g.lineWidth = 1; g.beginPath(); g.arc(w - 11, h - 10, 6.5, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#9a7418'; g.font = 'bold 8px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('G', w - 11, h - 9.6);
  }
  function iconRes(g, name, w, h) {
    const s = Math.min(w, h) / 22; g.save(); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
    const ol = 'rgba(20,12,6,0.85)';
    if (name === 'food') {
      const gr = g.createLinearGradient(0, 6, 0, 18); gr.addColorStop(0, '#e3a75a'); gr.addColorStop(1, '#9a5f24');
      g.fillStyle = gr; g.beginPath(); g.ellipse(11, 13, 9, 5.5, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = ol; g.lineWidth = 1; g.stroke();
      g.strokeStyle = '#f6d9a0'; g.lineWidth = 1.2; for (const x of [7, 11, 15]) { g.beginPath(); g.moveTo(x - 1.5, 11); g.lineTo(x + 1.5, 15); g.stroke(); }
    } else if (name === 'wood') {
      for (const [y, x] of [[14, 3], [8, 6]]) { g.fillStyle = '#7d5830'; g.fillRect(x, y - 3, 13, 6); g.strokeStyle = ol; g.lineWidth = 1; g.strokeRect(x, y - 3, 13, 6);
        g.fillStyle = '#d6b27a'; g.beginPath(); g.ellipse(x + 13, y, 2, 3, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.strokeStyle = '#8a6a3a'; g.beginPath(); g.ellipse(x + 13, y, 0.8, 1.4, 0, 0, Math.PI * 2); g.stroke(); }
    } else if (name === 'stone') {
      for (const [x, y, w, h, c] of [[2, 11, 9, 7, '#9a958c'], [11, 11, 9, 7, '#8a857c'], [6, 4, 10, 7, '#b0aba2']]) { g.fillStyle = c; g.fillRect(x, y, w, h); g.strokeStyle = ol; g.lineWidth = 1; g.strokeRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 1, y + 1, w - 2, 1.2); }
    } else if (name === 'gold') {
      const gr = g.createRadialGradient(8, 8, 1, 11, 11, 9); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.5, '#e8b83a'); gr.addColorStop(1, '#9a6c12');
      g.fillStyle = gr; g.beginPath(); g.arc(11, 11, 8.5, 0, Math.PI * 2); g.fill(); g.strokeStyle = ol; g.lineWidth = 1; g.stroke();
      g.strokeStyle = 'rgba(120,80,10,0.8)'; g.beginPath(); g.arc(11, 11, 5.5, 0, Math.PI * 2); g.stroke();
    } else if (name === 'people') {
      for (const [x, c] of [[7.5, '#c9b38a'], [14.5, '#efe0bd']]) { g.fillStyle = c; g.beginPath(); g.arc(x, 7, 3.3, 0, Math.PI * 2); g.fill(); g.strokeStyle = ol; g.lineWidth = 0.9; g.stroke();
        g.beginPath(); g.moveTo(x - 5, 19); g.quadraticCurveTo(x - 5, 11, x, 11); g.quadraticCurveTo(x + 5, 11, x + 5, 19); g.closePath(); g.fill(); g.stroke(); }
    } else if (name === 'mood') {   // the face shows how your people feel
      const m = mood, band = m >= 70 ? 4 : m >= 50 ? 3 : m >= 35 ? 2 : m >= 20 ? 1 : 0;
      const cols = [['#ffb0a0', '#c0281e'], ['#ffd0a0', '#d9702e'], ['#fff0c0', '#cfa040'], ['#fff3c0', '#d9a63a'], ['#f4ffc0', '#8cc63a']][band];
      const gr = g.createRadialGradient(8, 8, 1, 11, 11, 9); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
      g.fillStyle = gr; g.beginPath(); g.arc(11, 11, 8.5, 0, Math.PI * 2); g.fill(); g.strokeStyle = ol; g.lineWidth = 1; g.stroke();
      g.fillStyle = ol; g.beginPath(); g.arc(8, 9, 1.2, 0, Math.PI * 2); g.arc(14, 9, 1.2, 0, Math.PI * 2); g.fill();
      g.lineWidth = 1.3; g.beginPath();
      if (band === 4) { g.arc(11, 11, 4.8, 0.15, Math.PI - 0.15); g.closePath(); g.fillStyle = '#7a2a1a'; g.fill(); g.stroke(); }
      else if (band === 3) { g.arc(11, 11.5, 4.2, 0.25, Math.PI - 0.25); g.stroke(); }
      else if (band === 2) { g.moveTo(7.4, 14.6); g.lineTo(14.6, 14.6); g.stroke(); }
      else if (band === 1) { g.arc(11, 18.2, 4.2, Math.PI + 0.5, -0.5); g.stroke(); }
      else { g.arc(11, 18.6, 4.4, Math.PI + 0.35, -0.35); g.stroke(); g.lineWidth = 1.6; g.beginPath(); g.moveTo(5.6, 5.8); g.lineTo(9.6, 7.8); g.moveTo(16.4, 5.8); g.lineTo(12.4, 7.8); g.stroke(); }
    } else if (name === 'foes') {
      for (const d of [1, -1]) { g.strokeStyle = '#d8dde2'; g.lineWidth = 2; g.beginPath(); g.moveTo(11 - d * 7, 4); g.lineTo(11 + d * 5, 16); g.stroke();
        g.strokeStyle = '#a8322f'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(11 + d * 3.5, 17.5); g.lineTo(11 + d * 7.5, 13.5); g.stroke(); }
    } else if (name === 'raid') {
      const gr = g.createLinearGradient(3, 0, 19, 0); gr.addColorStop(0, '#f2e6c8'); gr.addColorStop(1, '#a8834a');
      g.fillStyle = gr; g.beginPath(); g.moveTo(3, 15); g.quadraticCurveTo(9, 5, 19, 4); g.lineTo(19, 10); g.quadraticCurveTo(11, 11, 6, 18); g.closePath(); g.fill(); g.strokeStyle = ol; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#c9a24a'; g.fillRect(9, 7.5, 2, 6);
    } else if (name === 'goods') {
      const gr = g.createLinearGradient(4, 0, 18, 0); gr.addColorStop(0, '#a87a48'); gr.addColorStop(0.5, '#7a5430'); gr.addColorStop(1, '#4e341b');
      g.fillStyle = gr; g.beginPath(); g.ellipse(11, 11, 7, 8.5, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = ol; g.lineWidth = 1; g.stroke();
      g.strokeStyle = '#2b2824'; g.lineWidth = 1.4; for (const y of [6, 16]) { g.beginPath(); g.moveTo(5, y); g.lineTo(17, y); g.stroke(); }
    } else if (name === 'feast') {
      g.fillStyle = '#8a6a3a'; g.beginPath(); g.ellipse(10, 16, 9, 3, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = ol; g.lineWidth = 0.8; g.stroke();
      g.fillStyle = '#a5582a'; g.beginPath(); g.ellipse(9, 12.5, 5.5, 3.6, -0.3, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#efe6d0'; g.fillRect(13.5, 9.5, 3.5, 1.6);
      g.fillStyle = '#e0b84e'; g.beginPath(); g.moveTo(16, 4); g.lineTo(21, 4); g.lineTo(19.5, 9); g.lineTo(17.5, 9); g.closePath(); g.fill(); g.stroke(); g.fillRect(18, 9, 1, 4); g.fillRect(16.8, 13, 3.4, 1);
    }
    g.restore();
  }
  function paintIcon(c) {
    const id = c.dataset.icon, chip = !!c.closest('.chip');
    const w = chip ? 22 : 60, h = chip ? 22 : 46;
    c.width = w * 2; c.height = h * 2; const g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, w, h);
    const [kind, name] = id.split(':');
    try { if (kind === 'b') iconBuilding(g, name, w, h); else if (kind === 'u') iconUnit(g, name, w, h); else if (kind === 'w') iconWeapon(g, name, w, h); else iconRes(g, name, w, h); } catch (e) {}
  }
  const paintIcons = (root = document) => root.querySelectorAll('canvas[data-icon]').forEach(paintIcon);
  // --- status bar ---
  function buildStatus() {
    statusEl.innerHTML = `<span class="chip" id="cCiv"><b></b></span>
      <span class="chip" title="Food"><canvas data-icon="r:food"></canvas><b id="vFood"></b><small id="vEat"></small></span>
      <span class="chip" title="Wood"><canvas data-icon="r:wood"></canvas><b id="vWood"></b></span>
      <span class="chip" title="Stone"><canvas data-icon="r:stone"></canvas><b id="vStone"></b></span>
      <span class="chip" title="Gold"><canvas data-icon="r:gold"></canvas><b id="vGold"></b></span>
      <span class="chip" title="People"><canvas data-icon="r:people"></canvas><b id="vPeople"></b><small id="vIdle"></small></span>
      <button class="chip" id="cMood" title="Mood: click to see what raises or lowers it"><canvas data-icon="r:mood"></canvas><b id="vMood"></b><small id="vMoodR"></small></button>
      <span class="chip" title="Enemies left"><canvas data-icon="r:foes"></canvas><b id="vFoes"></b></span>
      <button class="chip" id="cGoods" title="Goods: click for the list"><canvas data-icon="r:goods"></canvas><b id="vGoods"></b></button>
      <span class="chip" title="Weather and wind"><b id="vWeather">☀ Clear</b><i id="vWind" style="display:inline-block;font-style:normal;color:#cfe3ff;transition:transform 1s">➤</i></span>
      <span class="chip" title="Next enemy raid"><canvas data-icon="r:raid"></canvas><b id="vRaid"></b></span>`;
    paintIcons(statusEl); built = true;
    $('cMood').onclick = () => toggle('moodPop');
    $('cGoods').onclick = () => { const p = $('goodsPop'); p.hidden = !p.hidden; if (!p.hidden) p.innerHTML = goodsReport(); };
  }
  let moodBand = -1;
  function setStatus(d) {
    if (!built) buildStatus();
    const civB = $('cCiv').firstElementChild; civB.textContent = d.civ; civB.style.color = d.civColor;
    $('vFood').textContent = d.food; $('vEat').textContent = `eating ${d.eat}/min`; $('vWood').textContent = d.wood; $('vStone').textContent = d.stone; $('vGold').textContent = d.gold;
    $('vPeople').textContent = `${d.pop} of ${d.cap}`; $('vIdle').textContent = d.idle ? `${d.idle} idle` : '';
    const mv = $('vMood'); mv.textContent = `${d.mood} ${d.moodName}`; mv.style.color = d.moodColor;
    { const band = d.mood >= 70 ? 4 : d.mood >= 50 ? 3 : d.mood >= 35 ? 2 : d.mood >= 20 ? 1 : 0; if (band !== moodBand) { moodBand = band; const c = document.querySelector('#cMood canvas'); if (c) paintIcon(c); } }
    $('vMoodR').textContent = `${d.moodRate > 0 ? '+' : ''}${d.moodRate}/min`;
    $('vFoes').textContent = d.foes; $('vRaid').textContent = d.raid; $('vGoods').textContent = 'Goods';
    if (!$('goodsPop').hidden) setBox($('goodsPop'), goodsReport());
    if (storeShown && !$('storePop').hidden) { if (storeShown.kind === 'unit') showMachine(storeShown); else if (GUARD_TOWERS[storeShown.kind]) showTower(storeShown); else if (HALLS[storeShown.kind]) showInside(storeShown); else if (storeShown.kind === 'market') showMarket(storeShown); else if (!JOBS[storeShown.kind] && !STORE_KINDS[storeShown.kind]) showBasic(storeShown); else (JOBS[storeShown.kind] ? showSite : showStore)(storeShown); }
    if (!$('moodPop').hidden) setBox($('moodPop'), moodReport());
  }
  function moodReport() {
    const r = RATIONS[ration], t = TAXES[tax];
    const ln = (label, v) => `<div class="ln"><span>${label}</span><b class="${v > 0 ? 'plus' : v < 0 ? 'minus' : ''}">${v > 0 ? '+' : ''}${v}/min</b></div>`;
    const total = Math.round(moodRate);
    return `<h3>MOOD ${Math.round(mood)} &middot; ${moodName().toUpperCase()}</h3>` +
      (starving ? ln('No food: starving', -20) : ln(`Rations: ${r.name}`, r.mood)) +
      ln(`Food variety: ${foodVariety()} kind${foodVariety() === 1 ? '' : 's'} (${Object.keys(foodKinds).filter(k => foodKinds[k] >= 1).map(k => FOOD_NAME[k]).join(', ') || 'none'})`, starving ? 0 : varietyBonus) +
      ln(`Taxes: ${t.name}`, t.mood) +
      ln(relBonus ? `Faith: houses of prayer serve ${Math.round(relCover * 100)}% of your people` : 'Faith: no house of prayer (build one in the Town list)', relBonus) +
      ln(crowdPen ? 'Crowding: houses are nearly full' : 'Crowding: room to spare', crowdPen) +
      (fullGranary ? ln('Full granary: plenty in store', fullGranary) : '') + (fatBonus ? ln('Well-fed and content (but the fat work slower)', fatBonus) : '') + (sickPen ? ln(`Sickness in town: ${-sickPen / 2} ill (they rest at the keep)`, sickPen) : '') + (time < contentUntil ? ln(`Content after a feast or new comfort: mood will not fall for ${Math.ceil(contentUntil - time)}s`, 0) : '') +
      ln(`Gardens: ${countOf('garden')} (people work ${countOf('garden') * 5}% slower)`, fearGood) +
      ln(`Stocks: ${countOf('stocks')} (people work ${countOf('stocks') * 8}% harder)`, fearHard) + ln(aleBonus ? `Ale: taverns serve ${Math.round(aleCover * 100)}% of your people` : 'Ale: none served (build a tavern and brewery)', aleBonus) +
      `<div class="ln" style="border-top:1px solid #6e5128;margin-top:4px;padding-top:4px"><span>Total</span><b class="${total > 0 ? 'plus' : total < 0 ? 'minus' : ''}">${total > 0 ? '+' : ''}${total}/min</b></div>` +
      `<p style="margin:8px 0 0;font-size:15px">Each of your people who dies costs 3 mood. A feast adds 25 and keeps spirits up for 3 minutes.</p>` +
      `<p style="margin:6px 0 0;font-size:15px"><b>Happy</b> (70 and up): work 15% faster, settlers arrive.<br><b>Unhappy</b> (below 40): work 20% slower.<br><b>Rebellious</b> (below 20): people leave.</p>` +
      `<p style="margin:6px 0 0;font-size:14px;color:#d9c9a3">Change rations and taxes in the Rule tab.</p>`;
  }
  function toggle(id) { const p = $(id); p.hidden = !p.hidden; if (id === 'moodPop' && !p.hidden) p.innerHTML = moodReport(); if (id === 'menuPop') $('btnMenu').setAttribute('aria-expanded', String(!p.hidden)); }
  function goodsReport() {
    const ln = (a, b) => `<div class="ln"><span>${a}</span><b>${b}</b></div>`;
    return '<h3>GOODS</h3>' + ln('Food: berries, crops, bread', `${Math.floor(foodKinds.berries)}, ${Math.floor(foodKinds.crops)}, ${Math.floor(foodKinds.bread)}`) + ln('Wheat', Math.floor(res.wheat)) + ln('Flour', Math.floor(res.flour)) + ln('Stone', Math.floor(res.stone)) + ln('Hops', Math.floor(res.hops)) + ln('Ale', Math.floor(res.ale)) + ln('Iron', Math.floor(res.iron)) + ln('Bows', res.bow) + ln('Spears', res.spear) + ln('Swords', res.sword) + '<p style="margin:8px 0 0;font-size:14px;color:#d9c9a3">Build workshops in the Industry tab (key 5). Weapons in the armory make soldiers cheap.</p>';
  }
  function closePops() { let any = false; for (const id of ['moodPop', 'menuPop', 'goodsPop', 'storePop']) if (!$(id).hidden) { $(id).hidden = true; any = true; } $('btnMenu').setAttribute('aria-expanded', 'false'); return any; }
  // --- tabs and hiding the panel ---
  // drop-down sections in the side panel: one opens at a time; clicking an open one closes it
  function showTab(name, toggleIfOpen) {
    const hdr = document.querySelector(`.tab[data-tab="${name}"]`), close = toggleIfOpen && hdr && hdr.classList.contains('active');
    document.querySelectorAll('.tab[data-tab]').forEach(t => { const on = !close && t.dataset.tab === name; t.classList.toggle('active', on); t.setAttribute('aria-expanded', on ? 'true' : 'false'); });
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', !close && p.dataset.pane === name));
    $('side').classList.remove('collapsed');
    if (!close && hdr) requestAnimationFrame(() => { const sc = $('sideScroll'), r = hdr.getBoundingClientRect(), rs = sc.getBoundingClientRect(); if (r.top < rs.top || r.top > rs.top + rs.height * 0.5) sc.scrollTop += r.top - rs.top - 8; });
  }
  function toggleHide() { $('side').classList.toggle('collapsed'); }
  document.querySelectorAll('.tab[data-tab]').forEach(t => t.onclick = () => showTab(t.dataset.tab, true));
  $('btnHide').onclick = toggleHide; $('btnShow').onclick = toggleHide;
  if (window.innerWidth <= 760) $('side').classList.add('collapsed');
  $('btnMenu').onclick = () => toggle('menuPop');
  $('btnHelpClose').onclick = () => toggleHelp();
  // --- selection summary ---
  function setSelection(sel) {
    $('selLabel').textContent = sel.length ? `${sel.length} selected` : 'Nothing selected';
    const counts = {}; for (const u of sel) counts[u.name] = (counts[u.name] || 0) + 1;
    const plural = n => n.endsWith('man') ? n.slice(0, -3) + 'men' : n + 's';
    let txt = Object.entries(counts).map(([n, c]) => `${c} ${c > 1 ? plural(n) : n}`).join(', ');
    if (sel.length === 1 && sel[0].type === 'civ' && sel[0].job && CRAFT[sel[0].job.kind] && Object.keys(CRAFT[sel[0].job.kind].inp).length) { const st = sel[0].job; txt += ` · ${st.name}: ${staffOf(st)} worker(s), uses ${Math.round(craftCost(st) * 100)}% of the usual material`; }
    if (sel.length === 1 && sel[0].type === 'civ') { const u = sel[0]; txt += u.job ? ` (${(JOB_NAME[u.job.kind] || 'worker').toLowerCase()})` + (u.carry > 0 ? `, carrying ${u.carry} ${u.carryType}` : '') : u.carry > 0 ? ` (carrying ${u.carry} ${u.carryType})` : u.order === 'gather' && u.task ? ` (gathering ${u.task.type})` : u.order === 'build' ? ' (building)' : ' (idle)'; }
    $('selSum').textContent = txt || 'Click a person or drag a box to select.';
    const f = sel.length ? sel.reduce((a, u) => a + u.hp / u.maxHp, 0) / sel.length : 0;
    const bar = $('selBar').firstElementChild; bar.style.width = (f * 100).toFixed(0) + '%'; bar.style.background = f > 0.6 ? '#4fd65a' : f > 0.3 ? '#f2c230' : '#e8432f';
  }
  // --- minimap ---
  const mini = $('mini');
  function buildMiniBase() {
    miniBase = document.createElement('canvas'); miniBase.width = 352; miniBase.height = 232;
    const g = miniBase.getContext('2d'), sx = 352 / MW, sy = 232 / MH;
    g.drawImage(terrain, 0, 0, 352, 232);
    g.fillStyle = 'rgba(16,40,14,0.9)'; for (const t of trees) { g.beginPath(); g.arc(t.x * sx, (t.y - 10) * sy, 2.2, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#8f8b82'; for (const r of rocks) g.fillRect(r.x * sx - 1, r.y * sy - 1, 2.5, 2.5);
    miniBaseT = trees.length;
  }
  function drawMini() {
    const r = mini.getBoundingClientRect(); if (!r.width) return;
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (mini.width !== W || mini.height !== H) { mini.width = W; mini.height = H; }
    if (!miniBase || miniBaseT !== trees.length) buildMiniBase();
    const g = mini.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true;
    g.drawImage(miniBase, 0, 0, W, H);
    const sx = W / MW, sy = H / MH;
    g.fillStyle = 'rgba(226,194,90,0.9)'; for (const f of farms) if (!f.dead) g.fillRect(f.x0 * sx, f.y0 * sy, (f.x1 - f.x0) * sx, (f.y1 - f.y0) * sy);
    for (const s of structures) {
      if (s.dead) continue;
      g.fillStyle = s.team === 'player' ? PAL.player.tunic : '#c8342c';
      g.fillRect(s.x0 * sx, s.y0 * sy, Math.max(2, (s.x1 - s.x0) * sx), Math.max(2, (s.y1 - s.y0) * sy));
      if (s.kind === 'keep' || s.kind === 'tower') { g.strokeStyle = '#fff3d6'; g.lineWidth = dpr; g.strokeRect(s.x0 * sx, s.y0 * sy, (s.x1 - s.x0) * sx, (s.y1 - s.y0) * sy); }
    }
    const d = Math.max(2, 2 * dpr);
    for (const u of units) {
      if (u.dead) continue;
      g.fillStyle = u.team !== 'player' ? '#ff5a4a' : u.type === 'civ' ? '#f2e2b8' : shade(PAL.player.tunic, 0.35);
      g.fillRect(u.x * sx - d / 2, u.y * sy - d / 2, d, d);
      if (u.lord) { g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(u.x * sx, u.y * sy, d * 1.6, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#3a0a08'; g.lineWidth = dpr; g.stroke(); }
    }
    if (raidPing && raidPing.t < 12) { raidPing.t += 1 / 30; const pr = (6 + (raidPing.t * 14) % 14) * dpr; g.strokeStyle = 'rgba(255,80,60,0.95)'; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(raidPing.x * sx, raidPing.y * sy, pr, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.5 * dpr;
    g.strokeRect(cam.x * sx, cam.y * sy, vw / cam.z * sx, vh / cam.z * sy);
  }
  let miniDrag = false;
  const miniMove = e => { const r = mini.getBoundingClientRect(); centerOn(clamp((e.clientX - r.left) / r.width, 0, 1) * MW, clamp((e.clientY - r.top) / r.height, 0, 1) * MH); };
  mini.addEventListener('pointerdown', e => { miniDrag = true; mini.setPointerCapture(e.pointerId); miniMove(e); e.preventDefault(); });
  mini.addEventListener('pointermove', e => { if (miniDrag) miniMove(e); });
  mini.addEventListener('pointerup', () => { miniDrag = false; });
  mini.addEventListener('pointercancel', () => { miniDrag = false; });
  return { setStatus, setSelection, paintIcons, showTab, toggleHide, closePops, drawMini, moodReport, rebuildMini: () => { miniBase = null; } };
})();

