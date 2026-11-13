'use strict';
// Stronghold Destroyer — Phase 4C, step C7: setting up a match on the front page.
// Before a game you choose: your faction (the cards), how many rivals (1 to 4; 3 unless you change it), each rival's
// faction or Random, the difficulty, whether one rival is a trading friend (only with 2 or more rivals), and where you
// start (Random unless you choose a part of the map). Your choices are remembered for next time.
// To win you defeat every rival who is not your trading friend, so the goal grows and shrinks with the number of rivals.
const MATCH = { rivals: 3, facs: ['random', 'random', 'random', 'random'], friend: true, region: 'random' };
(() => {
  const m = typeof matchPrefs === 'function' ? matchPrefs() : {};
  if (m.rivals >= 1 && m.rivals <= 4) MATCH.rivals = Math.round(m.rivals);
  if (Array.isArray(m.facs)) m.facs.slice(0, 4).forEach((f, i) => { if (f === 'random' || FACTIONS[f]) MATCH.facs[i] = f; });
  if (typeof m.friend === 'boolean') MATCH.friend = m.friend;
  if (m.region === 'random' || START_REGIONS.includes(m.region)) MATCH.region = m.region;
  // (tests: ?start=0..4 pins one of the old five places and keeps the old four rivals unless ?rivals= says otherwise)
  const q = new URLSearchParams(location.search); if (q.get('start') !== null && !q.get('rivals')) MATCH.rivals = 4;
})();
const matchEnemies = () => MATCH.rivals - (MATCH.friend && MATCH.rivals >= 2 ? 1 : 0);
function saveMatch() { try { localStorage.setItem('sd-match', JSON.stringify({ rivals: MATCH.rivals, facs: MATCH.facs, friend: MATCH.friend, region: MATCH.region })); return true; } catch (e) { return false; } }
function applyMatch() { RIVALS.count = MATCH.rivals; RIVALS.friend = MATCH.friend && MATCH.rivals >= 2; }
function winRuleText() {
  const n = REALM.on ? REALM.rivals.filter(R => !R.friend).length : matchEnemies(), fr = REALM.on ? REALM.rivals.some(R => R.friend) : MATCH.friend && MATCH.rivals >= 2;
  return `To win: defeat ${n === 1 ? 'your rival' : `all ${n} of your rivals`}${fr ? ' (your trading friend does not count)' : ''}.`;
}
// a rival's faction: the one you chose for it, or at random (different factions first)
function rivalFaction(i, taken) {
  const want = MATCH.facs[i]; if (FACTIONS[want]) return want;
  const pool = FACTION_ORDER.filter(f => !taken.includes(f) && !MATCH.facs.slice(0, MATCH.rivals).includes(f)), all = pool.length ? pool : FACTION_ORDER.filter(f => !taken.includes(f));
  const list = all.length ? all : FACTION_ORDER; return list[Math.floor(Math.random() * list.length)];
}
// ---------- the front page ----------
(() => {
  if (LEGACY) return;
  const diff = document.getElementById('diff'); if (!diff) return;
  const box = document.createElement('div'); box.id = 'match';
  const facOpts = sel => `<option value="random"${sel === 'random' ? ' selected' : ''}>Random</option>` + FACTION_ORDER.map(k => `<option value="${k}"${sel === k ? ' selected' : ''}>${FACTIONS[k].name}</option>`).join('');
  const regionName = { random: 'Random', west: 'West', north: 'North', east: 'East', south: 'South' };
  function render() {
    box.innerHTML = `
      <div class="mrow"><span class="ml">Rivals:</span>${[1, 2, 3, 4].map(n => `<button class="mbtn${MATCH.rivals === n ? ' on' : ''}" data-n="${n}" aria-pressed="${MATCH.rivals === n}">${n}</button>`).join('')}</div>
      <div class="mrow" id="mFacs"><span class="ml">Their factions:</span>${Array.from({ length: MATCH.rivals }, (_, i) => `<label class="msel">Rival ${i + 1}<select data-i="${i}">${facOpts(MATCH.facs[i])}</select></label>`).join('')}</div>
      <div class="mrow" id="mFriend"${MATCH.rivals < 2 ? ' hidden' : ''}><span class="ml">Trading friend:</span><button class="mbtn${MATCH.friend ? ' on' : ''}" data-f="1">Yes</button><button class="mbtn${MATCH.friend ? '' : ' on'}" data-f="0">No</button><small>one rival trades with you instead of fighting</small></div>
      <div class="mrow"><span class="ml">You start:</span>${['random'].concat(START_REGIONS).map(r => `<button class="mbtn${MATCH.region === r ? ' on' : ''}" data-r="${r}">${regionName[r]}</button>`).join('')}</div>
      <div class="mwin" id="mWin">${winRuleText()}</div>`;
  }
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.n) MATCH.rivals = +b.dataset.n;
    else if (b.dataset.f) MATCH.friend = b.dataset.f === '1';
    else if (b.dataset.r) {
      const r = b.dataset.r, before = MATCH.region; MATCH.region = r;
      // the land is made around your start when the page loads: a new part of the map needs a fresh page
      if (r !== 'random' && r !== before && START_REGION !== r) { const saved = saveMatch(); showBanner('Making the land for your new starting place…', 4); setTimeout(() => { if (saved) location.reload(); else location.search = '?region=' + r; }, 60); render(); return; }
    }
    saveMatch(); render();
  });
  box.addEventListener('change', e => { const s = e.target.closest('select[data-i]'); if (!s) return; MATCH.facs[+s.dataset.i] = s.value; saveMatch(); render(); });
  diff.insertAdjacentElement('afterend', box); render();
})();
