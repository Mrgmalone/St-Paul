'use strict';
// Stronghold Destroyer — Phase 4B, step B3: your citizens.
// Citizens grow in your houses (3 to 5 minutes each) and cannot be bought; the killed are replaced the same way, and every new
// citizen goes to work by himself. They stay near the castle. Every building gets one worker before any gets a second.
// The People tab (the face at the bottom left) lists them; a quick tap on a person shows his trade, holding him 1 to 2 seconds
// makes him speak and opens his card. Needs alerts are shown and the most urgent one is spoken, in the same voice the advisor uses.

// ---------- one voice for the whole game (alerts now, the Art of War advisor later) ----------
const VOICE = (() => {
  let on = true, lastAt = {}, speaking = false, speakUntil = 0, voice = null;
  try { on = localStorage.getItem('sd-voice') !== 'off'; } catch (e) {}
  const pickVoice = () => { try { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en[-_]GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || vs[0] || null; } catch (e) {} };
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
  // say a line aloud; a line already said within 'again' seconds is not repeated; a person may have his own pitch
  function say(text, opts = {}) {
    if (!on || typeof speechSynthesis === 'undefined') return false;
    const key = opts.key || text, now = performance.now() / 1000;
    if (lastAt[key] && now - lastAt[key] < (opts.again || 60)) return false;
    if (speaking && now < speakUntil && !opts.interrupt) return false;   // (if the browser never says a line ended, the voice frees itself)
    lastAt[key] = now;
    try {
      if (opts.interrupt) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.rate = opts.rate || 1; u.pitch = opts.pitch || 1; u.volume = 1;
      speaking = true; speakUntil = now + 2 + text.length * 0.08; u.onend = u.onerror = () => { speaking = false; };
      speechSynthesis.speak(u); VOICE.last = text; return true;
    } catch (e) { speaking = false; return false; }
  }
  return { say, get on() { return on; }, set on(v) { on = v; try { localStorage.setItem('sd-voice', v ? 'on' : 'off'); } catch (e) {} if (!v) try { speechSynthesis.cancel(); } catch (e) {} }, last: '' };
})();

// ---------- growing: citizens are born in your houses and grow up; they cannot be bought ----------
const GROW = { min: 180, max: 300, room: 0.85 };   // seconds: 3 to 5 minutes; families grow until the houses are 85% full (fuller counts as crowded)
const growing = [];   // { t, dur, home }
const NAMES = ['Ada', 'Bram', 'Cora', 'Dunstan', 'Edith', 'Fenn', 'Gilda', 'Hal', 'Isolde', 'Jory', 'Kit', 'Lune', 'Maud', 'Ned', 'Osric', 'Pell', 'Quill', 'Rowan', 'Sabine', 'Tam', 'Ulric', 'Vera', 'Wat', 'Yara', 'Alder', 'Bess', 'Colm', 'Dora', 'Elric', 'Fay', 'Godric', 'Hild', 'Ivo', 'Joan', 'Kenric', 'Lark', 'Mabel', 'Nell', 'Odo', 'Piers'];
let nameSeq = 0;
const nameOf = u => u.pname || (u.pname = NAMES[(nameSeq * 7) % NAMES.length] + (nameSeq >= NAMES.length ? ' ' + 'ABCDEFGHJKLMNOPRSTW'[Math.floor(nameSeq / NAMES.length) % 19] + '.' : '') + (nameSeq++, ''));
let growT = 0;
function updateGrowth(dt) {
  for (let i = growing.length - 1; i >= 0; i--) {
    const g = growing[i]; g.t += dt;
    if (g.t < g.dur) continue;
    growing.splice(i, 1);
    const h = g.home && !g.home.dead ? g.home : playerKeep(); if (!h) continue;
    const f = nearestFree(Math.floor(h.x / TILE), Math.floor((h.y1 !== undefined ? h.y1 : h.y) / TILE) + 1); if (!f) continue;
    const u = makeUnit('player', 'civ', f.c * TILE + 16, f.r * TILE + 16);
    floatText(u.x, u.y - 55, `${nameOf(u)} has grown up and goes to work`, '#9fe8a8');
  }
  growT -= dt; if (growT > 0) return; growT = 5;
  const people = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u) && !u.gift).length;
  const room = Math.floor(popCap() * GROW.room);
  if (people + growing.length >= room || res.food < 20 || starving) return;
  // each house (and the keep) raises one child at a time
  const homes = [playerKeep(), ...mineDone('house')].filter(Boolean);
  for (const h of homes) {
    if (people + growing.length >= room) break;
    if (growing.some(g => g.home === h)) continue;
    growing.push({ t: 0, dur: GROW.min + Math.random() * (GROW.max - GROW.min), home: h });
  }
}
// citizens cannot be bought: the keep's Civilian button says so
function civButton() { const b = document.querySelector('.tb[data-k="civ"]'); if (!b) return; const sm = b.querySelector('small'); if (sm && sm.textContent !== 'they grow in your houses') sm.textContent = 'they grow in your houses'; b.classList.add('locked'); }

// ---------- school: a few citizens study while the school teaches ----------
function updateSchooling() {
  const sc = mineDone('school')[0], want = schoolStudy && sc ? 3 : 0;
  let pupils = units.filter(u => u.inSchool && !u.dead);
  for (const u of pupils.slice(want)) { u.inSchool = false; u.order = 'idle'; }
  pupils = pupils.slice(0, want);
  while (pupils.length < want) {
    const u = units.find(v => v.team === 'player' && !v.dead && v.type === 'civ' && !v.job && !v.inSchool && !v.engineer && !(v.breakUntil > time) && v.order !== 'build');
    if (!u) break; u.inSchool = true; u.edu = Math.min(3, (u.edu || 0) + 1); pupils.push(u);
  }
  for (const u of pupils) if (edgeDist(u, sc) > 40 && u.order !== 'move') { const ap = approachPoint(u, sc); commandMove([u], ap.x, ap.y); u.cmdT = -99; }
}

// ---------- what a person thinks: happiness and why, worries, earnings and tax ----------
const JOB_OF = u => u.engineer ? 'Engineer' : u.inSchool ? 'In school' : u.job ? (JOB_NAME[u.job.kind] || u.job.name) : u.type === 'civ' ? (u.order === 'build' ? 'Builder' : u.order === 'gather' ? 'Gatherer' : 'No work') : KINDS[u.type].name;
function personMood(u) {
  const why = [], add = (n, t) => { why.push({ n, t }); };
  if (u.sick) add(-15, 'is ill');
  if (starving) add(-20, 'is hungry: there is no food');
  if (u.drunkUntil > time) add(5, 'had too much cheap ale');
  if (u.type === 'civ' && !u.job && !u.engineer && !u.inSchool && u.order === 'idle') add(-4, 'has no work');
  if (u.job) add(3, 'has steady work');
  if (u.type !== 'civ' && typeof wagesUnpaid !== 'undefined' && wagesUnpaid) add(-10, 'has not been paid');
  if ((u.vet || 0) > 0) add(Math.min(6, u.vet), 'is proud of the battles he survived');
  if (feastUntil > time) add(8, 'enjoyed the feast');
  if (u.hp < u.maxHp * 0.5) add(-6, 'is badly hurt');
  const town = moodReasons().slice(0, 3);
  const v = clamp(Math.round(mood + why.reduce((a, w) => a + w.n, 0)), 0, 100);
  return { v, why: why.map(w => (w.n > 0 ? '+ ' : '- ') + w.t), town };
}
function personConcerns(u) {
  const c = [];
  if (u.job) { const blk = indBlock(u.job); if (blk) c.push(blk); }
  if (u.job && isField(u.job.kind) && stageN >= 2 && !sentryOf(u.job)) c.push('our field has no sentry');
  if (u.job && groupsOn() && (u.job.kind === 'woodhut' || u.job.kind === 'quarry')) { const gs = groupsOf(u.job), g = gs.findIndex(l => l.includes(u)); if (g >= 0 && !escortOf(u.job, g)) c.push(`group ${GROUP_WORD[g] || g + 1} needs a soldier`); }
  if (bugsOn) c.push('bugs in the granary');
  if (u.sick) c.push('I feel ill');
  if (res.food < 40) c.push('food is running low');
  if (warNow) c.push('enemies are near');
  return c;
}
const MAKE_GOLD = { food: 1, wood: 1, stone: 1.5, iron: 3, hops: 1, wheat: 1, flour: 2, bread: 1.5, ale: 3, bow: 12, spear: 8, sword: 20, mace: 16, armor: 40, grapes: 1, apples: 1 };
function personMoney(u) {
  const taxMin = TAXES[tax].gold * taxStageMul() * 3;   // taxes: gold every 20 seconds per person
  if (u.type !== 'civ') return { earns: `${(kitOf(u) ? kitOf(u).wage : ECONOMY.wages[u.type]) || 0} gold a minute in wages`, tax: '' };
  let earn = 0;
  if (u.job) { const rc = recipeOf(u.job, u); if (rc) earn = (rc.n || 1) / rc.time * 60 * (MAKE_GOLD[rc.out] || 1); else earn = 20 * (MAKE_GOLD[FIELD_TYPE[u.job.kind] || 'wood'] || 1); }
  return { earns: earn ? `about ${Math.round(earn)} gold of work a minute` : 'nothing yet', tax: `${Math.round(taxMin * 10) / 10} gold a minute in tax` };
}
function sayLineFor(u) {
  const m = personMood(u), c = personConcerns(u), job = JOB_OF(u);
  const feel = m.v >= 70 ? 'I am happy' : m.v >= 40 ? 'I am getting by' : m.v >= 20 ? 'I am unhappy' : 'I am angry';
  const first = t => t.replace(/^is /, 'am ').replace(/^has /, 'have ');   // 'has no work' -> 'have no work'
  const because = m.why.length ? (m.why[0].startsWith('+') ? ' because I ' : ': I ') + first(m.why[0].slice(2)) : m.town.length ? ' because ' + m.town[0] : '';
  const who = job === 'No work' ? ' and I have no work yet' : job === 'In school' ? ' and I am at school' : `, ${/^[AEIOU]/.test(job) ? 'an' : 'a'} ${job.toLowerCase()}`;
  return `I am ${nameOf(u)}${who}. ${feel}${because}.${c.length ? ' My worry: ' + c[0] + '.' : ''}`;
}

// ---------- the person's card (holding a person), the trade icon (a quick tap) ----------
let cardOf = null, tapU = null, tapUntil = 0;
const iconKey = u => u.engineer ? 'b:engineerhut' : u.inSchool ? 'b:school' : u.job ? 'b:' + u.job.kind : u.type !== 'civ' ? 'u:' + u.type : u.order === 'build' ? 'b:house' : 'r:people';
function personHtml(u) {
  const m = personMood(u), c = personConcerns(u), $ = personMoney(u), col = m.v >= 70 ? '#9fe39a' : m.v >= 40 ? '#ffd98a' : m.v >= 20 ? '#ffb38a' : '#ff8a7a';
  const edu = u.type === 'civ' ? ['none', 'first level', 'second level', 'third level'][Math.min(3, u.edu || 0)] : `soldiers' lessons: ${['none', 'first', 'second', 'third', 'fourth', 'fifth'][Math.min(5, soldierLvl)]} level`;
  return `<button class="xbtn" data-card="close" aria-label="Close">&times;</button><h3>${nameOf(u).toUpperCase()}</h3>` +
    lnI('Work', JOB_OF(u)) + lnI('Happiness', `<span style="color:${col}">${m.v}</span>`) +
    `<div class="why">${m.why.concat(m.town.map(t => '- the town: ' + t)).slice(0, 5).map(t => `<div>${t}</div>`).join('') || '<div>nothing special</div>'}</div>` +
    lnI('Education', edu) + lnI('Worries', c.length ? c.slice(0, 2).join('; ') : 'none') + lnI('Earns', $.earns) + ($.tax ? lnI('Pays', $.tax) : '') +
    (isSoldier(u) ? lnI('Battles survived', `${u.vet || 0} \u2605`) + lnI('Enemies felled', u.kills || 0) + (u.type === 'knight' ? lnI('Horse', u.mounted ? `mounted (${Math.max(0, Math.round(u.horseHp))} strength left)` : 'on foot') : '') : '');
}
function showCard(u) {
  cardOf = u; const p = document.getElementById('personPop'); p.innerHTML = personHtml(u); p.hidden = false;
  p.classList.toggle('sheet', isPhone()); placeCard();
}
const isPhone = () => Math.min(window.innerWidth, window.innerHeight) < 600;
function placeCard() {
  const p = document.getElementById('personPop'), u = cardOf; if (!u || p.hidden) return;
  if (u.dead) { p.hidden = true; cardOf = null; return; }
  if (p.classList.contains('sheet')) { p.style.left = p.style.top = ''; return; }   // a phone: it slides up from the bottom
  const q = screenOf(u.x, u.y, 40 + (R3D.active ? elev3D(u) : elev2D(u))), w = p.offsetWidth || 320, h = p.offsetHeight || 300;
  let x = q.x + 40, y = q.y - h / 2; if (x + w > vw - 10) x = q.x - 40 - w;   // an iPad or computer: it floats beside the person
  p.style.left = clamp(x, 10, vw - w - 10) + 'px'; p.style.top = clamp(y, 64, vh - h - 10) + 'px';
}
function holdPerson(u) {
  showCard(u); VOICE.say(sayLineFor(u), { key: 'person' + u.id, again: 3, interrupt: true, pitch: 0.85 + ((u.id * 13) % 30) / 100 });
  speeches.push({ u, text: sayLineFor(u).split('. ')[0], t: 0 });
}
function tapIcon(u) {
  tapU = u; tapUntil = performance.now() + 2500;
  const el = document.getElementById('tapIcon'), c = el.querySelector('canvas'); c.dataset.icon = iconKey(u); delete c.dataset.done; UI.paintIcons(el);
  el.title = JOB_OF(u); el.hidden = false; const lb = el.querySelector('b');   /* a soldier gets a glance: who, stars, health */
  lb.textContent = isSoldier(u) ? `${u.name}${u.vet ? ' \u2605' + u.vet : ''} \u00b7 ${Math.round(u.hp / u.maxHp * 100)}%` : ''; lb.hidden = !isSoldier(u); placeTap();
}
function placeTap() {
  const el = document.getElementById('tapIcon'); if (el.hidden) return;
  if (!tapU || tapU.dead || performance.now() > tapUntil) { el.hidden = true; tapU = null; return; }
  const q = screenOf(tapU.x, tapU.y, 70 + (R3D.active ? elev3D(tapU) : elev2D(tapU))); el.style.left = q.x - 26 + 'px'; el.style.top = q.y - 56 + 'px';
}
// holding: a press that stays still on one of your people for a second
let HOLD = null;
function holdStart(p) {
  if (!IND() || !started) return false;
  const hit = pickScreen(p.x, p.y); if (!hit || hit.x0 !== undefined || hit.team !== 'player' || isMachine(hit)) return false;
  HOLD = { u: hit, x: p.x, y: p.y, fired: false }; HOLD.timer = setTimeout(() => { if (HOLD && HOLD.u === hit) { HOLD.fired = true; holdPerson(hit); } }, 1000);
  return true;
}
function holdMove(p) { if (HOLD && !HOLD.fired && Math.hypot(p.x - HOLD.x, p.y - HOLD.y) > 12) { clearTimeout(HOLD.timer); HOLD = null; } }
function holdEnd() { const f = !!(HOLD && HOLD.fired); if (HOLD) clearTimeout(HOLD.timer); HOLD = null; return f; }
let talkWrapped = false;
function wrapTalk() { if (talkWrapped || typeof talkTo !== 'function') return; talkWrapped = true; const t0 = talkTo; talkTo = u => { if (IND() && u && u.team === 'player') { tapIcon(u); return; } t0(u); }; }   // a quick tap: the trade icon only

// ---------- the People tab ----------
function peopleHtml() {
  const mine = units.filter(u => u.team === 'player' && !u.dead && !isMachine(u)), civs = mine.filter(u => u.type === 'civ'), sold = mine.filter(u => u.type !== 'civ' && u.type !== 'king');
  const jobs = {}; for (const u of civs) { const j = JOB_OF(u); jobs[j] = (jobs[j] || 0) + 1; }
  const grow = growing.slice().sort((a, b) => (a.dur - a.t) - (b.dur - b.t));
  let h = `<button class="xbtn" data-people="close" aria-label="Close">&times;</button><h3>YOUR PEOPLE</h3>` +
    lnI('Citizens', civs.length) + lnI('Soldiers', sold.length) + lnI('Room in your houses', `${mine.length} of ${popCap()}`) +
    lnI('Growing up', grow.length ? `${grow.length} (next in ${Math.max(1, Math.ceil((grow[0].dur - grow[0].t) / 60))} min)` : 'none (no room or no food)') +
    lnI('In school', civs.filter(u => u.inSchool).length);
  h += `<div class="sub">Work</div>` + Object.entries(jobs).sort((a, b) => b[1] - a[1]).map(([j, n]) => lnI(j, n)).join('');
  h += `<div class="sub">Everyone (tap a name to see them)</div><div class="plist">` + mine.slice(0, 200).map(u => { const m = personMood(u).v, c = personConcerns(u);
    return `<button class="prow" data-person="${u.id}"><b>${nameOf(u)}</b><span>${JOB_OF(u)}</span><span style="color:${m >= 70 ? '#9fe39a' : m >= 40 ? '#ffd98a' : '#ffb38a'}">${m}</span><small>${c[0] || ''}</small></button>`; }).join('') + '</div>';
  return h;
}
function showPeople() { const p = document.getElementById('peoplePop'); p.innerHTML = peopleHtml(); p.hidden = false; peopleT = 1; }
let peopleT = 0;
document.getElementById('peoplePop').addEventListener('click', e => {
  if (e.target.closest('[data-people="close"]')) { document.getElementById('peoplePop').hidden = true; return; }
  const r = e.target.closest('[data-person]'); if (!r) return;
  const u = units.find(v => v.id === +r.dataset.person); if (!u) return;
  document.getElementById('peoplePop').hidden = true; centerOn(u.x, u.y - 30); selectOnly([u]); showCard(u);
});
document.getElementById('personPop').addEventListener('click', e => { if (e.target.closest('[data-card="close"]')) { document.getElementById('personPop').hidden = true; cardOf = null; } });
document.getElementById('btnPeople').onclick = () => { if (!started) return; const p = document.getElementById('peoplePop'); if (p.hidden) showPeople(); else p.hidden = true; };

// ---------- needs alerts: every person and industry; the most urgent is spoken ----------
let alerts = [], alertT = 0;
function collectAlerts() {
  const A = [], add = (prio, text, at) => A.push({ prio, text, at });
  if (starving) add(10, 'There is no food. Your people are starving.');
  if (bugsOn) add(8, 'Bugs are spoiling the food in the granary. Rest some farms or sell food.');
  else if (res.food > foodCap() * 0.92) add(5, 'The granary is nearly full.');
  if (typeof wagesUnpaid !== 'undefined' && wagesUnpaid) add(7, 'Your soldiers have not been paid.');
  const sick = units.filter(u => u.team === 'player' && !u.dead && u.sick).length; if (sick >= 3) add(4, `${sick} of your people are ill.`);
  for (const b of structures.concat(farms)) {
    if (b.team !== 'player' || b.dead || b.done === false || b.asleep) continue;
    const nm = b.name;
    if (JOBS[b.kind] && staffOf(b) === 0) add(4, `The ${nm} has no workers.`, b);
    const blk = indBlock(b); if (blk) add(5, blk + '.', b);
    if ((isField(b.kind) || b.kind === 'farm') && stageN >= 2 && !sentryOf(b)) add(3, `The ${nm.toLowerCase()} needs a sentry.`, b);
    if (groupsOn() && (b.kind === 'woodhut' || b.kind === 'quarry')) groupsOf(b).forEach((l, g) => { if (!escortOf(b, g)) add(4, `Group ${GROUP_WORD[g] || g + 1} of the ${nm} needs a soldier.`, b); });
    if (b.kind === 'woodhut' && !nearestNode('wood', b.x, b.y, yardReach())) add(5, `The ${nm} has no trees near it.`, b);
  }
  for (const b of structures) if (b.fire > 0 && !b.dead && b.team === 'player') add(9, `Fire at the ${b.name}!`, b);
  for (const q of rebuildWaiting()) add(3, `The ${q.name} waits for supplies to be rebuilt.`);
  if (myPeople() >= popCap()) add(3, 'Your houses are full: build a house so more citizens can grow up.');
  return A.sort((a, b) => b.prio - a.prio);
}
function updateAlerts(dt) {
  alertT -= dt; if (alertT > 0) return; alertT = 5;
  alerts = collectAlerts();
  const el = document.getElementById('alertBar');
  el.innerHTML = alerts.slice(0, 3).map((a, i) => `<div class="al${a.prio >= 7 ? ' hot' : ''}${i ? ' sm' : ''}">${a.text}</div>`).join('');
  el.hidden = !alerts.length;
  const top = alerts[0]; if (top && top.prio >= 4) VOICE.say(top.text, { key: 'alert:' + top.text, again: 90 });   // only the most urgent is spoken
}

// ---------- each frame ----------
let citT = 0;
function updateCitizens(dt) {   // game time (stops when paused)
  if (!IND() || !started) return;
  wrapTalk(); updateGrowth(dt); updateAlerts(dt);
  citT -= dt; if (citT > 0) return; citT = 1;
  civButton(); updateSchooling();
}
function citizensFrame() {      // every drawn frame, paused or not: place the card and the tap icon, refresh the People list
  placeCard(); placeTap();
  if (cardOf && !document.getElementById('personPop').hidden && (peopleT -= 0.016) <= 0) { peopleT = 1; const p = document.getElementById('personPop'), h = personHtml(cardOf); if (p._h !== h) { p._h = h; p.innerHTML = h; } }
}
{ const b = document.getElementById('btnVoice'), show = () => { b.textContent = 'Voice: ' + (VOICE.on ? 'On' : 'Off'); }; b.onclick = () => { VOICE.on = !VOICE.on; show(); }; show(); }
