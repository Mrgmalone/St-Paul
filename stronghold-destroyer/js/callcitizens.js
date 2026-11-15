'use strict';
// Stronghold Destroyer — Phase 4F: calling citizens, wars won and generals.
// The Citizen button in the Town list calls one more citizen from the countryside: he walks in along the road when his
// wait is over. The wait and the cost depend on happiness (the unhappier, the slower and dearer), on the wars you have
// won lately (each makes them quicker and cheaper) and on your generals (soldiers with 7 or more veteran stars; five-star generals at 10), who
// also make the houses raise their children sooner. The numbers live in settings.js (CITIZEN_CALL).

let warWins = [];        // game times of the wars won (a raid beaten off, a rival defeated)
let raidGroups = [];     // the rival raids under way: { rid, name, members, n, t }

const CC = () => CITIZEN_CALL;
// the soldiers who count as generals
const generalsNow = () => units.filter(u => u.team === 'player' && !u.dead && typeof isSoldier === 'function' && isSoldier(u) && (u.vet || 0) >= CC().general.stars);
const winsNow = () => warWins.filter(t => time - t < CC().win.lasts).length;
// what calling a citizen takes right now: the wait (seconds) and the cost, and why
function citizenTerms() {
  const C = CC(), m = Math.round(mood);
  const band = C.mood.find(b => m >= b[0]) || C.mood[C.mood.length - 1];
  const w = Math.min(C.win.max, winsNow()), g = Math.min(C.general.max, generalsNow().length);
  const tMul = Math.max(C.floor, band[1] * Math.pow(C.win.time, w) * Math.pow(C.general.time, g));
  const cMul = band[2] * Math.pow(C.win.cost, w) * Math.pow(C.general.cost, g);
  return { food: Math.round(C.base.food * cMul), gold: Math.round(C.base.gold * cMul), secs: Math.round(C.base.secs * tMul), mood: m, band, wins: w, generals: g, tMul, cMul };
}
// how much sooner the houses raise their children (wars won and generals; happiness already has its own effects)
function growBoost() { const C = CC(); return 1 / (Math.pow(C.win.time, Math.min(C.win.max, winsNow())) * Math.pow(C.general.time, Math.min(C.general.max, generalsNow().length))); }
const callsWaiting = () => trainQueue.filter(q => q.kind === 'civ' && q.called).length;
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

function requestCitizen() {
  const T = citizenTerms(), C = CC();
  if (!playerKeep()) return false;
  const pop = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && !u.gift).length + trainQueue.filter(q => !MACHINE[q.kind]).length + (typeof growing !== 'undefined' ? growing.length : 0);
  if (pop >= popCap()) { showBanner('Your houses are full: build a house before you call another citizen.', 3); return false; }
  if (callsWaiting() >= C.queue) { showBanner(`${C.queue} citizens are already on their way.`, 2.5); return false; }
  if (res.food < T.food || res.gold < T.gold) { showBanner(`Calling a citizen now costs ${T.food} food and ${T.gold} gold.`, 3); return false; }
  spendFood(T.food); res.gold -= T.gold;
  trainQueue.push({ kind: 'civ', t: 0, dur: T.secs, called: true });
  const why = T.band[0] < 50 ? ' Your people are unhappy, so word spreads slowly.' : T.band[0] >= 70 ? ' Your people are happy, so word spreads fast.' : '';
  showBanner(`A citizen is called: he arrives in about ${mmss(T.secs)}.${why}`, 3.5);
  AudioSys.ui && AudioSys.ui('click'); updateHud();
  return true;
}
// the called citizen walks in along the road to the castle
function arriveCitizen(k) {
  const e = typeof roadEntry === 'function' ? roadEntry() : { x: k.x, y: k.y1 + 40 };
  const u = makeUnit('player', 'civ', e.x, e.y);
  floatText(u.x, u.y - 55, `${typeof nameOf === 'function' ? nameOf(u) : 'A citizen'} answers your call`, '#9fe8a8');
  return u;
}

// ---------- wars won ----------
function noteRaid(R, members) { raidGroups.push({ rid: R.id, name: R.name, members: members.slice(), n: members.length, t: time }); }
function winWar(what) {
  warWins.push(time); warWins = warWins.filter(t => time - t < CC().win.lasts);
  showBanner(`<b>Victory!</b> ${what} Your people take heart: citizens come sooner and cost less for a while.`, 5);
  AudioSys.ui && AudioSys.ui('victory');
}
// once a second: a raid is over when none of its raiders is still on the attack; it is won when most of them fell and
// your keep still stands
function checkWars() {
  for (const g of raidGroups.slice()) {
    if (g.members.some(u => !u.dead && u.raider)) continue;
    raidGroups.splice(raidGroups.indexOf(g), 1);
    const fell = g.members.filter(u => u.dead).length;
    if (playerKeep() && fell >= Math.ceil(g.n * 0.6)) winWar(`${g.name}'s raid is beaten off (${fell} of ${g.n} fell).`);
  }
  if (typeof REALM !== 'undefined' && REALM.on) for (const R of REALM.rivals) if (R.defeated && !R.winNoted && !R.friend) { R.winNoted = true; winWar(`${R.name} is defeated.`); }
}

// ---------- the Citizen button (Town list) shows what calling one takes right now ----------
function callButton() {
  const b = document.querySelector('.tb[data-k="civ"]'); if (!b) return;
  b.classList.remove('locked');
  const T = citizenTerms(), sm = b.querySelector('small'), txt = `${T.food} food · ${T.gold} gold · ${mmss(T.secs)}`;
  if (sm && sm.textContent !== txt) sm.textContent = txt;
  const sub = `Calls one more from the countryside (houses still raise theirs). Happiness ${T.mood}` + (T.wins ? ` · ${T.wins} war${T.wins > 1 ? 's' : ''} won` : '') + (T.generals ? ` · ${T.generals} general${T.generals > 1 ? 's' : ''}` : '');
  if (b.dataset.sub !== sub) { b.dataset.sub = sub; b.setAttribute('aria-label', `Call a citizen: ${txt}. ${sub}`); }
}
window.CALL4F = { citizenTerms, requestCitizen, checkWars, growBoost, winWar, generalsNow, winsNow };
