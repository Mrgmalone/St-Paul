'use strict';
// Stronghold Destroyer — Phase 4B, step B8: the Art of War advisor.
// Always on, in the top corner: one short, plain tip at a time, chosen from what is happening in your game, shown and spoken
// (in the same voice as the alerts; urgent alerts always come first). Tips are plain advice in the spirit of the old
// art of war, in our own words: no long quotations.
const ADVICE = [
  // [when it applies, the tip, how important]
  [() => !mineDone('granary').length && res.food > 100, 'Build a granary. Food with nowhere to go will spoil.', 6],
  [() => bugsOn, 'Too much food spoils. Sell some, or rest a farm.', 8],
  [() => stageN >= 2 && mineDone('waterpot').length === 0, 'Put a water pot near your buildings before fire comes.', 5],
  [() => warNow, 'The enemy is near. Fight from your walls, not in the open.', 9],
  [() => warNow && units.some(u => u.team === 'player' && u.type === 'civ' && !u.dead && Math.hypot(u.x - playerKeep().x, u.y - playerKeep().y) > 700), 'Bring your workers home while the enemy is near.', 8],
  [() => !units.some(u => u.team === 'player' && !u.dead && isSoldier(u) && u.type !== 'king'), 'You have no soldiers. Train a few spearmen before the first raid.', 7],
  [() => REALM.on && REALM.rivals.some(R => !R.friend && !R.defeated && R.keep && !fogSeen(R.keep.x, R.keep.y)), 'Know your enemy. Send a scout to find his castle.', 4],
  [() => REALM.on && REALM.rivals.some(R => !R.friend && !R.defeated && R.keep && fogSeen(R.keep.x, R.keep.y)), "His farms feed his army. Raid them and he grows slower.", 4],
  [() => stageN >= 3 && countOf('school') === 0, 'A school makes every builder and soldier better. Build one before the Stronghold.', 5],
  [() => stageN >= 3 && groupsOn() && mineDone('woodhut').some(b => groupsOf(b).some((l, g) => !escortOf(b, g))), 'Workers in the forest need a guard. Send a soldier with each group.', 5],
  [() => mood < 40, 'Unhappy people work slowly and leave. Look at what upsets them.', 7],
  [() => res.gold < 20 && units.some(u => u.team === 'player' && isSoldier(u) && u.type !== 'king'), 'Keep gold for wages. Unpaid soldiers anger your people.', 6],
  [() => mineDone('market').length > 0, 'Your market is your richest building. Guard it well.', 3],
  [() => stageN >= 2 && mineDone('lookout').length === 0, 'A lookout tower sees raiders coming from far away.', 4],
  [() => myPeople() >= popCap(), 'Your houses are full. Build a house so more citizens can grow up.', 5],
  [() => units.some(u => u.team === 'player' && u.vet >= 3 && !u.dead), 'Veterans fight better. Keep them alive: pull the wounded back.', 3],
  [() => stageN >= 4 && horsesAll() === 0, 'Knights need horses. A stable in your farm breeds them.', 4],
  [() => true, 'Strike where he is weak, and when his army is away.', 1],
  [() => true, 'Walls first, then towers. A strong castle wins slowly but surely.', 1],
  [() => true, 'Do not fight every battle. Win the ones that matter.', 1]
];
const ADVISOR = { every: 40, shown: '', at: -99, last: {} };
function pickAdvice() {
  let best = null, bs = -1;
  for (const [when, tip, imp] of ADVICE) {
    let ok = false; try { ok = !!when(); } catch (e) { ok = false; }
    if (!ok) continue;
    const since = time - (ADVISOR.last[tip] === undefined ? -999 : ADVISOR.last[tip]), score = imp * Math.min(1, since / 300) + Math.random() * 0.5;   // fresh and important first; a tip rests a while after it is given
    if (score > bs) { bs = score; best = tip; }
  }
  return best;
}
function updateAdvisor(dt) {
  if (!IND() || !started) return;
  const el = document.getElementById('tips'); if (!el) return;
  if (time - ADVISOR.at < ADVISOR.every && ADVISOR.shown) return;
  const tip = pickAdvice(); if (!tip) return;
  ADVISOR.at = time; ADVISOR.last[tip] = time; ADVISOR.shown = tip;
  el.innerHTML = `<div class="advTitle">The Art of War</div><div class="advTip">${tip}</div>`; el.classList.add('adv');
  const urgent = alerts && alerts[0] && alerts[0].prio >= 7;   // an urgent alert speaks first; the tip waits its turn
  if (!urgent) VOICE.say(tip, { key: 'tip:' + tip, again: 240 });
}
