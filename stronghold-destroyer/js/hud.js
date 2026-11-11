'use strict';
// Stronghold Destroyer — speech bubbles, tower and machine panels, pause, and the note when people leave.

const speeches = [];
function sayLine(u) {
  const t = u.type, b = u.buildTarget, j = u.job;
  if (u.sick) return u.toHeal ? 'I feel ill... going to the keep to be cared for.' : 'I feel ill...';
  if (t === 'civ') {
    if (u.fat > 0.55 && u.order === 'idle') return 'Ah, that was a fine meal. Do I have to work?';
    if (u.breakUntil > time) return 'Just a short rest, sir. Back to it soon.';
    if (u.order === 'build' && b) return `I'm building the ${b.name}.`;
    if (u.order === 'craft' && j) return `I am busy at the ${j.name}.`;
    if (u.carry > 0 && u.sub === 'toKeep') return `Taking ${u.carry} ${u.carryType} to the store.`;
    if (u.order === 'gather' && u.task) return { wood: "I'm cutting wood.", food: "I'm gathering food.", stone: "I'm quarrying stone.", wheat: "I'm harvesting wheat.", hops: "I'm picking hops." }[u.task.type] || "I'm gathering.";
    return 'How can I help, sir?';
  }
  if (isMachine(u)) return u.holdFire ? 'Holding fire, my lord.' : u.order === 'attack' ? 'Loosing at the enemy!' : 'Loaded and ready to fire.';
  if (t === 'king') return 'My people need walls, bread and brave men.';
  if (u.guardOf && u.guardOf.type === 'king') return 'I guard the King with my life.';
  if (u.gift && u.guardOf) return `I came with the ${u.guardOf.kind === 'keep' ? 'keep' : u.guardOf.name}. No one gets past this door.`;
  if (u.guardOf) return `Guarding the door of the ${u.guardOf.name}.`;
  if (t === 'archer') return u.onWall ? 'Watching from up here. Arrows ready!' : u.order === 'attack' ? 'Loosing arrows!' : 'Arrows ready, waiting on them.';
  if (u.order === 'attack') return t === 'knight' ? 'For the King!' : 'Into them!';
  if (u.order === 'move') return 'On my way!';
  return t === 'knight' ? 'Ready, my lord.' : 'Awaiting orders, sir.';
}
function talkTo(u) {
  if (!u || u.team !== 'player') return;
  for (let i = speeches.length - 1; i >= 0; i--) if (speeches[i].u === u) speeches.splice(i, 1);
  speeches.push({ u, text: sayLine(u), t: 0 });
  if (u.type === 'catapult' || u.type === 'ballista' || u.type === 'trebuchet') showMachine(u);
}
function drawSpeech(g, x, y, text) {
  g.save(); g.font = 'bold 14px "Source Sans 3", Georgia, sans-serif'; const w = g.measureText(text).width + 16;
  g.fillStyle = 'rgba(255,250,236,0.95)'; g.strokeStyle = 'rgba(60,40,20,0.8)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(x - w / 2 + 8, y - 30); g.lineTo(x + w / 2 - 8, y - 30); g.quadraticCurveTo(x + w / 2, y - 30, x + w / 2, y - 22); g.lineTo(x + w / 2, y - 14); g.quadraticCurveTo(x + w / 2, y - 6, x + w / 2 - 8, y - 6); g.lineTo(x + 6, y - 6); g.lineTo(x, y); g.lineTo(x - 2, y - 6); g.lineTo(x - w / 2 + 8, y - 6); g.quadraticCurveTo(x - w / 2, y - 6, x - w / 2, y - 14); g.lineTo(x - w / 2, y - 22); g.quadraticCurveTo(x - w / 2, y - 30, x - w / 2 + 8, y - 30); g.closePath();
  g.fill(); g.stroke(); g.fillStyle = '#2a1a0c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - 18); g.restore();
}
function showMachine(u) {
  storeShown = u; const p = document.getElementById('storePop');
  const key = 'm' + u.id + (u.holdFire ? 'h' : '');
  if (p.dataset.site !== key) { p.innerHTML = `<h3>${u.name.toUpperCase()}</h3>${fixRow}<div class="ln"><span>Status</span><b>${u.holdFire ? 'Holding fire' : 'Firing at will'}</b></div><div class="row" style="display:flex;gap:6px;margin-top:8px"><button class="sm" data-mach="stop">Stop</button><button class="sm" data-mach="go">Continue</button></div>`; p.dataset.site = key; }
  p.hidden = false;
}
function showTower(b) {
  storeShown = b; const p = document.getElementById('storePop'), ln = (a, v) => `<div class="ln"><span>${a}</span><b>${v}</b></div>`;
  const top = units.filter(o => o.onWall === b && !o.dead).length, door = units.filter(o => o.guardOf === b && !o.dead).length;
  let html = `<h3>${b.name.toUpperCase()}</h3>` + ln('Archers on top', `${top} of ${WALL_POSTS[b.kind]}`) + ln('Guards at the door', `${door} of 2`);
  if (b.kind === 'roundtower') {
    html += ln('Engine', b.engine ? (b.engine === 'trebuchet' ? 'Trebuchet' : 'Ballista') + (b.engineHold ? ' (holding fire)' : ' (firing)') : 'none');
    html += `<div class="row" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">` + (b.engine ? `<button class="sm" data-tw="stop">Stop</button><button class="sm" data-tw="go">Continue</button>` : `<button class="sm" data-tw="ballista">Mount Ballista (110 wood, 50 gold)</button><button class="sm" data-tw="trebuchet">Mount Trebuchet (200 wood, 40 stone, 80 gold)</button>`) + `</div>`;
  }
  html += fixRow + '<div style="font-size:13px;color:#d9c9a3;margin-top:6px">Idle archers climb up by themselves; idle knights, macemen and spearmen guard the door. Esc closes.</div>';
  const key = 'tw' + b.id + (b.engine || '') + (b.engineHold ? 'h' : '') + top + '/' + door;
  if (p.dataset.site !== key) { p.innerHTML = html; p.dataset.site = key; } p.hidden = false;
}
document.getElementById('storePop').addEventListener('click', e => {
  const m = e.target.closest('[data-mach]'); if (m && storeShown && storeShown.kind === 'unit') { storeShown.holdFire = m.dataset.mach === 'stop'; if (storeShown.holdFire) { storeShown.order = 'idle'; storeShown.target = null; } talkTo(storeShown); AudioSys.ui('select'); return; }
  const t = e.target.closest('[data-tw]'); if (!t || !storeShown || storeShown.kind !== 'roundtower') return;
  const b = storeShown, a = t.dataset.tw;
  if (a === 'stop' || a === 'go') b.engineHold = a === 'stop';
  else { const cost = a === 'ballista' ? { wood: 110, gold: 50 } : { wood: 200, stone: 40, gold: 80 }; if (!afford(cost)) { showBanner(`Not enough ${lacking(cost)} to mount a ${a}.`, 2.5); return; } pay(cost); b.engine = a; b.engineHold = false; floatText(b.x, b.y - b.topH - 20, `${a === 'ballista' ? 'Ballista' : 'Trebuchet'} mounted`, '#9fe8a8'); }
  AudioSys.ui('select'); showTower(b); updateHud();
});
let paused = false, leftNoteT = 0, menuPause = false, menuT = 0;
function showLeftNote(reasons) {
  const el = document.getElementById('leftNote'); el.hidden = false; leftNoteT = 14;
  el.dataset.why = reasons.length ? 'They left because ' + reasons.slice(0, 4).join(', ') + '. Fix these to win them back; when mood rises, people who left return.' : 'Mood is very low. Open the mood report to see why.';
  document.getElementById('leftText').innerHTML = '<b>An unhappy citizen has left your town.</b>';
}
document.getElementById('leftWhy').onclick = () => { const el = document.getElementById('leftNote'); document.getElementById('leftText').innerHTML = '<b>An unhappy citizen has left your town.</b><span class="why2">' + el.dataset.why + '</span>'; leftNoteT = 20; const mp = document.getElementById('moodPop'); if (mp.hidden) document.getElementById('cMood').click(); };
document.getElementById('leftClose').onclick = () => { document.getElementById('leftNote').hidden = true; };
// every box that pops up gets a big X to close it, and keeps it even when its contents are redrawn
(function closeButtons() {
  const $ = id => document.getElementById(id);
  const closers = {
    storePop: () => { $('storePop').hidden = true; storeShown = null; },
    menuPop: () => { $('menuPop').hidden = true; $('btnMenu').setAttribute('aria-expanded', 'false'); },
    moodPop: () => { $('moodPop').hidden = true; },
    goodsPop: () => { $('goodsPop').hidden = true; },
    banner: () => { clearTimeout(bannerTimer); $('banner').style.opacity = 0; $('banner').classList.remove('shown'); },
    help: () => $('btnHelpClose').click(),
    win: () => { $('win').style.display = 'none'; }
  };
  for (const [id, close] of Object.entries(closers)) {
    const el = id === 'help' || id === 'win' ? $(id).querySelector('.box') : $(id);
    const add = () => { if (el.querySelector(':scope > .xbtn')) return; const x = document.createElement('button'); x.className = 'xbtn'; x.type = 'button'; x.dataset.close = id; x.setAttribute('aria-label', 'Close'); x.title = 'Close'; x.innerHTML = '&times;'; el.prepend(x); };
    add(); new MutationObserver(add).observe(el, { childList: true });
  }
  // the box closes the moment the X is pressed, even if the box redraws itself in between
  const hit = e => { const x = e.target.closest && e.target.closest('.xbtn[data-close]'); if (!x) return; e.stopPropagation(); e.preventDefault(); if (e.type === 'click' && e.detail > 0) return; closers[x.dataset.close](); try { AudioSys.ui('select'); } catch (er) {} };
  document.addEventListener('pointerdown', hit, true); document.addEventListener('click', hit, true);
})();
function enemiesClose() {
  const k = playerKeep(), mine = units.filter(u => u.team === 'player' && !u.dead);
  return units.some(e => !e.dead && e.team === 'enemy' && e.type !== 'civ' && ((k && Math.hypot(e.x - k.x, e.y - k.y) < 760) || mine.some(m => Math.hypot(e.x - m.x, e.y - m.y) < 380) || structures.some(b => b.team === 'player' && !b.dead && Math.hypot(e.x - b.x, e.y - b.y) < 420)));
}
function setPaused(want) {
  if (!started || won) return;
  if (want && enemiesClose()) { showBanner('Enemies are close by: you must fight! You can pause once they are gone.', 3); return; }
  paused = want; document.body.classList.toggle('paused', paused);
  document.getElementById('pauseNote').hidden = !paused; document.getElementById('btnPause').classList.toggle('on', paused);
  document.getElementById('btnPause').innerHTML = paused ? '&#9654;<span class="lbl"> Resume</span>' : '&#10074;&#10074;<span class="lbl"> Pause</span>';
  AudioSys.ui('select');
}
document.getElementById('btnPause').onclick = () => setPaused(!paused);
document.getElementById('btnResume').onclick = () => setPaused(false);
let zoomAnim = null; const camVel = { x: 0, y: 0 };

