'use strict';
// Stronghold Destroyer — Phase 4D, step D1: the trophy.
// A trophy button sits just below the Settings gear, always there. Tapping it opens a panel with what the next castle stage
// still needs: for each requirement (people, happiness, food, stone, iron, and the buildings that must stand) what you have,
// what you need, and a tick when it is met, plus one plain sentence on what to do next. At the last stage it says so.
// Like the other panels it pauses the game while you read it (unless enemies are close), and it only ever opens when tapped.
const TROPHY_SVG = '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M9 4h14v6a7 7 0 0 1-14 0z" fill="#e8b830" stroke="#5a3d08" stroke-width="1.4"/>'
  + '<path d="M9 6H5v2a5 5 0 0 0 5 5M23 6h4v2a5 5 0 0 1-5 5" fill="none" stroke="#e8b830" stroke-width="2.2"/><path d="M14 17h4v5h-4z" fill="#c9971f"/>'
  + '<path d="M10 22h12l1 4H9z" fill="#e8b830" stroke="#5a3d08" stroke-width="1.2"/><path d="M12 6.5v4" stroke="#fff3c4" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></svg>';
let trophyOpen = false;
// which tab holds a building's button (for the advice sentence)
const tabOfBuilding = k => { const b = document.querySelector(`.bb[data-b="${k === 'farmAny' ? 'farm' : k}"]`), p = b && b.closest('.pane'); return p ? p.dataset.pane[0].toUpperCase() + p.dataset.pane.slice(1) : ''; };
function trophyAdvice(rows) {
  const miss = rows.filter(r => !r.ok); if (!miss.length) return 'Everything is ready: your castle grows into the next stage in a moment.';
  const order = r => r.kind ? 0 : { people: 1, food: 2, stone: 3, iron: 4, mood: 5 }[r.key] || 6;
  const r = miss.slice().sort((a, b) => order(a) - order(b))[0], short = r.need - r.have;
  if (r.kind) { const tab = tabOfBuilding(r.kind), name = r.kind === 'farmAny' ? 'farm or wheat field' : (BUILD[r.kind] ? BUILD[r.kind].name : r.what).toLowerCase();
    return `Build ${short === 1 ? 'a' : short} ${name}${short === 1 ? '' : 's'}${tab ? ` (the ${tab} list)` : ''}; ${r.kind === 'farmAny' || r.kind === 'woodhut' || r.kind === 'quarry' ? 'a worker comes by itself' : short === 1 ? 'your builders put it up' : 'your builders put them up'}.`; }
  if (r.key === 'people') { const full = myPeople() + growing.length >= Math.floor(popCap() * GROW.room);
    return full ? 'Build another house: your houses are full, and each house raises a new citizen every few minutes.' : `Wait for ${short} more ${short === 1 ? 'citizen' : 'citizens'} to grow up, or build more houses: each house raises one every few minutes.`; }
  if (r.key === 'food' && typeof foodCap === 'function' && r.need > foodCap() - 10) return `Build another granary: yours hold only ${foodCap()} food, and this stage needs ${r.need} stored.`;
  if (r.key === 'food') return `Store ${short} more food: put citizens on farms and berry bushes, and keep a granary so it does not spoil.`;
  if (r.key === 'stone') return `Get ${short} more stone: build a quarry beside the grey rocks (the Industry list) and keep workers there.`;
  if (r.key === 'iron') return `Get ${short} more iron: build an iron mine on the red iron ground (the Industry list).`;
  if (r.key === 'mood') {   // name the worst complaint and how to fix it
    const fix = { 'they mourn the people who died': 'they mourn the people who died (each death takes 3 from happiness): guard the town with more soldiers, towers and walls, and the mourning passes',
      'there is no food: they are starving': 'they are starving: put more citizens on farms and berry bushes', 'rations are lean': 'rations are lean: set them to Normal (the Rule list)',
      'the soldiers are unpaid': 'the soldiers are unpaid: raise gold (taxes, the market) or train fewer soldiers', 'taxes are high': 'taxes are high: lower them with the down arrow at the top',
      'the houses are crowded': 'the houses are crowded: build another house', 'the stocks frighten them': 'the stocks frighten them: take the stocks down',
      'they eat only one kind of food': 'they eat only one kind of food: add berries (citizens gather bushes), farm crops or bread from a bakery',
      'there is no ale': 'there is no ale: build an alehouse and a wheat field, since the alehouse brews its ale from wheat',
      'there is no house of healing or prayer': 'there is no house of healing or prayer: build a chapel or an apothecary', 'there is no house of prayer': 'there is no house of prayer: build a chapel',
      'bugs are spoiling the food in the granary': 'bugs are spoiling the food: build another granary or sell some food', 'the ale is dear': 'the ale is dear: lower the ale price in the alehouse box',
      'they pay taxes': 'they pay taxes: lower taxes with the down arrow at the top for a while' };
    // (4D) no ale although an alehouse stands: say why (the mill grinds the same wheat)
    if (typeof mineDone === 'function' && mineDone('alehouse').length) fix['there is no ale'] = mineDone('mill').length
      ? 'there is no ale: your mill grinds the same wheat the alehouse brews from, so build another wheat field (or a hop farm and a brewery)'
      : 'there is no ale: the alehouse brews from wheat, so build a wheat field and keep workers on it';
    const why = (typeof moodReasons === 'function' ? moodReasons() : []).find(w => fix[w]);
    return `Make your people happier (${r.have} of ${r.need}). The main complaint: ${why ? fix[why] : 'build an alehouse with a wheat field, and a chapel'}.`;
  }
  return 'Keep building up your town.';
}
function trophyHtml() {
  const last = stageN >= STAGES.length, cur = STAGES[stageN - 1];
  let h = `<button class="xbtn" data-close="trophyPop" aria-label="Close">&times;</button><h3>STAGE ${stageN} OF ${STAGES.length}: THE ${cur.name.toUpperCase()}</h3>`;
  if (last) return h + `<div class="tfinal">&#127942; You have reached the final stage, the <b>${cur.name}</b>. Your castle is at its greatest.</div>`;
  const next = STAGES[stageN], rows = needRows(stageN + 1, playerHave());
  h += `<div class="tnext">To reach stage ${next.n}, the <b>${next.name}</b>:</div><table class="ttab"><thead><tr><th>What</th><th>You have</th><th>You need</th><th>Done</th></tr></thead><tbody>`
    + rows.map(r => `<tr class="${r.ok ? 'ok' : 'no'}"><td>${r.what}</td><td>${r.have}</td><td>${r.need}</td><td class="tk" aria-label="${r.ok ? 'met' : 'not yet'}">${r.ok ? '&#10004;' : '&#10008;'}</td></tr>`).join('') + '</tbody></table>'
    + `<p class="tdo"><b>Next:</b> ${trophyAdvice(rows)}</p><p class="tsm">When every line has a tick, your castle grows by itself.</p>`;
  return h;
}
function openTrophy() { const p = document.getElementById('trophyPop'); UI.closePops(); try { if (window.PHONE && PHONE.onPhone()) PHONE.closeSheet(); } catch (e) {} p.innerHTML = trophyHtml(); p.hidden = false; trophyOpen = true; document.getElementById('btnTrophy').setAttribute('aria-expanded', 'true'); }
function closeTrophy() { const p = document.getElementById('trophyPop'); if (p) p.hidden = true; trophyOpen = false; const b = document.getElementById('btnTrophy'); if (b) b.setAttribute('aria-expanded', 'false'); }
(() => {
  const view = document.getElementById('view');
  const b = document.createElement('button'); b.id = 'btnTrophy'; b.title = 'Your next castle stage: what it still needs'; b.setAttribute('aria-label', 'Trophy: what the next stage needs'); b.setAttribute('aria-expanded', 'false'); b.innerHTML = TROPHY_SVG;
  const p = document.createElement('div'); p.id = 'trophyPop'; p.className = 'pop'; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'What the next stage needs');
  view.appendChild(b); view.appendChild(p);
  b.onclick = e => { e.stopPropagation(); if (trophyOpen && !p.hidden) closeTrophy(); else openTrophy(); };
  p.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeTrophy(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && trophyOpen) closeTrophy(); });
  // while it is open (the game may still run when enemies are close), keep its numbers current
  setInterval(() => { if (trophyOpen && !p.hidden && started) { const sc = p.scrollTop; p.innerHTML = trophyHtml(); p.scrollTop = sc; } }, 1000);
  const hide = () => { const h = !started || LEGACY || !FACKEY; if (b.hidden !== h) b.hidden = h; }; hide(); setInterval(hide, 500);
  { const _uh = updateHud; updateHud = function () { _uh.apply(this, arguments); hide(); }; }   /* (shown the moment a game starts) */
})();
