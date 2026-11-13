'use strict';
// Stronghold Destroyer — Phase 4C, step C6: phones and tablets.
//  - Phones (a side under about 600 points wide, or under 500 tall): the five categories sit in a bar along the bottom;
//    tapping one opens its picture buttons upward over the map; choosing something that needs the map (a building to
//    place, a wall, a rally flag, tearing down, a patrol) folds the panel away at once, so you can drag it into place.
//    Tapping the open category again (or the Close button) folds it too. Tablets and computers keep the side panel.
//  - The top bar: a gear for Settings (in place of "Menu") and a ? for Help; Quit is inside Settings.
//  - Taxes: a small Tax control in the top bar with down and up arrows.
//  - Hints: the Art of War advisor stays on (there is no switch to turn it off), one short tip at a time, in a compact
//    panel and spoken (speech follows the Voice setting, which also covers the alerts).
const PHONE_MQ = window.matchMedia ? window.matchMedia('(max-width:600px), (max-height:500px)') : { matches: false, addEventListener() {} };
const onPhone = () => !!PHONE_MQ.matches;
const CATS = [
  ['town', 'Town', '<path d="M4 13 L12 5 L20 13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M6.5 12 V20 H17.5 V12" fill="currentColor" opacity=".85"/><rect x="10.3" y="15" width="3.4" height="5" fill="#1c1b1a"/>'],
  ['castle', 'Castle', '<path d="M4 21 V8 H6.5 V5 H9 V8 H11 V5 H13 V8 H15 V5 H17.5 V8 H20 V21 Z" fill="currentColor" opacity=".85"/><path d="M10 21 V16 A2 2 0 0 1 14 16 V21" fill="#1c1b1a"/>'],
  ['army', 'Army', '<path d="M5 19 L17 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M15 4 L20 4 L20 9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 16 L8 20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M14 13 L19 11 L19 16 C19 18.5 17 20 15.5 21 C14 20 12 18.5 12 16 Z" fill="currentColor" opacity=".7"/>'],
  ['rule', 'Rule', '<path d="M4 9 L8 13 L12 6 L16 13 L20 9 L18.5 18 H5.5 Z" fill="currentColor" opacity=".9"/><rect x="5.5" y="19" width="13" height="2.2" fill="currentColor"/>'],
  ['industry', 'Industry', '<path d="M14 4 L20 10 L17.5 12.5 L11.5 6.5 Z" fill="currentColor"/><path d="M13 9.5 L4.5 18 L6 19.5 L14.5 11" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="7" cy="7" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>']
];
let sheetCat = null, scrollPick = CONTROLS.scrollDefault;
try { const s = localStorage.getItem('sd-scroll'); if (s && CONTROLS.scroll[s]) scrollPick = s; } catch (e) {}
const scrollMul = () => CONTROLS.scroll[scrollPick] || 1;   // the player's scroll speed (Settings: Slow, Medium, Fast)
(() => {
  const $ = id => document.getElementById(id), side = $('side'), main = $('main');
  // ---------- the bottom bar ----------
  const bar = document.createElement('div'); bar.id = 'catBar'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Commands');
  bar.innerHTML = CATS.map(([k, name, svg]) => `<button data-cat="${k}" role="tab" aria-selected="false" title="${name}"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">${svg}</svg><span>${name}</span></button>`).join('');
  main.appendChild(bar);
  const headSpan = document.querySelector('#sideHead span');
  function syncBar() {
    const open = onPhone() && !side.classList.contains('collapsed');
    if (!open) sheetCat = null;
    bar.querySelectorAll('button').forEach(b => { const on = open && b.dataset.cat === sheetCat; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    if (headSpan) headSpan.textContent = onPhone() && sheetCat ? (CATS.find(c => c[0] === sheetCat) || [, 'COMMANDS'])[1].toUpperCase() : 'COMMANDS';
    const hd = $('btnHide'), want = onPhone() ? '\u25BE Close' : '\u25B8 Hide'; if (hd.textContent !== want) hd.textContent = want;
    const cb = $('cmdbar'); if (cb) cb.classList.toggle('none', !selection.size);
  }
  function openSheet(cat) { sheetCat = cat; UI.showTab(cat); side.classList.remove('collapsed'); syncBar(); try { document.getElementById('sideScroll').scrollTop = 0; } catch (e) {} }
  function closeSheet() { side.classList.add('collapsed'); sheetCat = null; syncBar(); }
  bar.addEventListener('click', e => { const b = e.target.closest('button[data-cat]'); if (!b) return; if (sheetCat === b.dataset.cat && !side.classList.contains('collapsed')) closeSheet(); else openSheet(b.dataset.cat); });
  // a choice that needs the map folds the panel away (checked just after the button has done its work)
  side.addEventListener('click', () => { if (!onPhone()) return; setTimeout(() => { if (placing || settingRally || tearing || (typeof orderMode !== 'undefined' && orderMode)) closeSheet(); }, 0); }, true);
  $('btnHide').onclick = () => { if (onPhone()) closeSheet(); else UI.toggleHide(); };
  // opening Settings, Help or People on a phone folds the sheet away first
  for (const id of ['btnMenu', 'btnPeople']) { const el = $(id); if (el) el.addEventListener('click', () => { if (onPhone()) closeSheet(); }, true); }
  function applyMode() {
    document.body.classList.toggle('phone', onPhone());
    if (onPhone()) { if (!sheetCat) side.classList.add('collapsed'); }
    syncBar();
  }
  try { PHONE_MQ.addEventListener('change', applyMode); } catch (e) { try { PHONE_MQ.addListener(applyMode); } catch (e2) {} }
  applyMode();
  window.PHONE = { openSheet, closeSheet, syncBar, onPhone };
  // ---------- Settings (gear) and Help (?) ----------
  const mb = $('btnMenu');
  mb.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M10.3 2h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 2.9-2 1.7c.1.6.1 1.3 0 1.9l2 1.7-1.7 2.9-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-2.9 2-1.7c-.1-.6-.1-1.3 0-1.9l-2-1.7 1.7-2.9 2.5.9c.5-.4 1.1-.7 1.7-.9zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/></svg><span class="lbl"> Settings</span>';
  mb.title = 'Settings: sound, music, voice, weather, outlines, quit'; mb.setAttribute('aria-label', 'Settings');
  const hb = document.createElement('button'); hb.id = 'btnHelpTop'; hb.title = 'Help and controls (H)'; hb.setAttribute('aria-label', 'Help'); hb.innerHTML = '<b aria-hidden="true">?</b>';
  mb.insertAdjacentElement('afterend', hb); hb.onclick = () => { UI.closePops(); if (onPhone()) closeSheet(); toggleHelp(); };
  const mp = $('menuPop'), h3 = mp.querySelector('h3'); if (h3) h3.textContent = 'SETTINGS';
  // scroll speed: the player's own choice, remembered
  const srow = document.createElement('div'); srow.className = 'row scrollRow';
  srow.innerHTML = '<span class="sl">Scroll speed</span>' + Object.keys(CONTROLS.scroll).map(k => `<button class="sbtn" data-s="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('') + '<span style="font-size:14px;color:#d9c9a3">the arrow keys and the edges of the game</span>';
  mp.appendChild(srow);
  const markScroll = () => srow.querySelectorAll('.sbtn').forEach(b => { const on = b.dataset.s === scrollPick; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  srow.addEventListener('click', e => { const b = e.target.closest('.sbtn'); if (!b) return; scrollPick = b.dataset.s; try { localStorage.setItem('sd-scroll', scrollPick); } catch (er) {} markScroll(); });
  markScroll();
  const qrow = document.createElement('div'); qrow.className = 'row quitRow';
  qrow.innerHTML = '<button id="btnQuit">Quit this game</button><span id="quitNote" style="font-size:14px;color:#d9c9a3">back to the start screen</span>';
  mp.appendChild(qrow);
  let quitArm = 0;
  $('btnQuit').onclick = () => {
    if (!started) { mp.hidden = true; return; }
    if (performance.now() - quitArm < 5000) { window.SD_QUIT(); return; }
    quitArm = performance.now(); $('btnQuit').textContent = 'Tap again to quit'; $('quitNote').textContent = 'your game will end';
    setTimeout(() => { if (performance.now() - quitArm >= 4900) { $('btnQuit').textContent = 'Quit this game'; $('quitNote').textContent = 'back to the start screen'; } }, 5000);
  };
  window.SD_QUIT = () => { try { location.reload(); } catch (e) {} };
})();
// ---------- taxes: down and up ----------
function setTax(n) {
  n = Math.max(0, Math.min(TAXES.length - 1, n)); if (n === tax) return;
  const t0 = tax; tax = n; if (tax < t0) cheer(6, 60, 'Lower taxes! Your people are glad');
  updateHud();
}
function taxChip() {
  if (LEGACY || !started) return;
  const st = document.getElementById('status'); if (!st) return;
  let c = document.getElementById('cTax');
  if (!c) {
    const mood = document.getElementById('cMood'); if (!mood) return;
    c = document.createElement('span'); c.className = 'chip'; c.id = 'cTax'; c.title = 'Taxes: lower them to cheer your people, raise them for more gold';
    c.innerHTML = '<button id="taxDown" aria-label="Lower taxes">&#9660;</button><b id="vTax"></b><button id="taxUp" aria-label="Raise taxes">&#9650;</button>';
    mood.insertAdjacentElement('afterend', c);
    document.getElementById('taxDown').onclick = e => { e.stopPropagation(); setTax(tax - 1); };
    document.getElementById('taxUp').onclick = e => { e.stopPropagation(); setTax(tax + 1); };
  }
  const v = document.getElementById('vTax'), txt = 'Tax ' + TAXES[tax].name; if (v.textContent !== txt) v.textContent = txt;
  document.getElementById('taxDown').disabled = tax <= 0; document.getElementById('taxUp').disabled = tax >= TAXES.length - 1;
}
{ const _uh = updateHud; updateHud = function () { _uh.apply(this, arguments); taxChip(); if (window.PHONE) PHONE.syncBar(); }; }
