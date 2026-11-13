'use strict';
// Stronghold Destroyer — Phase 4B, step B2: escorted work groups (from the Hold, stage 3).
// Workers who go out of the castle — the woodcutters of a yard (in groups of five) and each quarry's ox cart — go as a group,
// and each group wants one soldier with it: a swordsman, spearman or archer (never a flamethrower). The building's box shows
// which group still needs a soldier. The escort walks with the group and fights anyone who comes at it.
const ESCORT_KINDS = { sword: 1, spear: 1, archer: 1 };
const GROUP_SIZE = 5;
const groupsOn = () => IND() && stageN >= 3;
// the groups of a building, each a list of the people (or carts) that go out together
function groupsOf(site) {
  if (site.rival) return site.rival.stage >= 3 && !site.rival.defeated ? rivalGroups(site.rival) : [];   /* a rival's woodcutters */
  if (!groupsOn() || site.dead || site.done === false) return [];
  if (site.kind === 'woodhut') {
    const crew = units.filter(u => u.job === site && !u.dead && u.type === 'civ' && !u.ironWork).sort((a, b) => a.id - b.id), out = [];
    for (let i = 0; i < crew.length; i += GROUP_SIZE) out.push(crew.slice(i, i + GROUP_SIZE));
    return out;
  }
  if (site.kind === 'quarry') return oxenOf(site).sort((a, b) => a.id - b.id).map(o => [o]);
  return [];
}
const escortOf = (site, g) => units.find(u => !u.dead && u.escort && u.escort.site === site && u.escort.g === g);
const GROUP_WORD = ['one', 'two', 'three', 'four', 'five', 'six'];
// the middle of a group, counting only those who are out working (not inside the castle ground)
function groupCenter(list) {
  if (!list.length) return null;
  let x = 0, y = 0; for (const m of list) { x += m.x; y += m.y; }
  return { x: x / list.length, y: y / list.length };
}
function sendEscort(site, g) {
  const gs = groupsOf(site); if (!gs[g]) return;
  if (escortOf(site, g)) { showBanner(`Group ${GROUP_WORD[g] || g + 1} already has a soldier.`, 2); return; }
  const c = groupCenter(gs[g]);
  const s = units.filter(u => u.team === 'player' && !u.dead && ESCORT_KINDS[u.type] && !u.noGuard && !u.escort && !u.guardOf && !u.gift && !u.onWall && !u.raider && (u.order === 'idle' || u.order === 'move' && time - (u.cmdT || -99) > 30))
    .sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
  if (!s) { showBanner('No free swordsman, spearman or archer to send. Train one, or free one from the walls.', 3.5); return; }
  s.escort = { site, g }; s.cmdT = -99; s.escRe = 0;
  floatText(s.x, s.y - 55, `Escorting group ${GROUP_WORD[g] || g + 1}`, '#9fe8a8'); AudioSys.ui('select');
}
function autoEscorts() {   // a free soldier standing idle near home goes with a group that has none
  for (const site of mineDone('woodhut').concat(mineDone('quarry'))) {
    const gs = groupsOf(site);
    for (let g = 0; g < gs.length; g++) if (!escortOf(site, g)) {
      const s = units.find(u => u.team === 'player' && !u.dead && ESCORT_KINDS[u.type] && !u.noGuard && !u.escort && !u.guardOf && !u.gift && !u.onWall && !u.raider && u.order === 'idle' && time - (u.cmdT || -99) > 60 && !isManual(u));
      if (s) { s.escort = { site, g }; s.escRe = 0; floatText(s.x, s.y - 55, `Escorting group ${GROUP_WORD[g] || g + 1}`, '#9fe8a8'); }
    }
  }
}
// the escort's own mind: true when it has decided what to do this frame
function escortBrain(u) {
  const e = u.escort; if (!e) return false;
  if (u.order === 'attack' && !alive(u.target)) { u.order = 'idle'; u.target = null; u.path = []; }   /* the one he fought is gone */
  if (time - (u.cmdT || -99) < 30 && u.cmdT > 0) { u.escort = null; return false; }   // you gave it another order: it leaves the group
  const gs = groupsOf(e.site), list = gs[e.g];
  if ((e.site.rival ? false : !groupsOn()) || e.site.dead || !list || !list.length) { u.escort = null; return false; }
  const c = groupCenter(list);
  if (u.order === 'attack' && alive(u.target) && Math.hypot(u.target.x - c.x, u.target.y - c.y) < 340) return false;   // already fighting for them
  // anyone hostile close to the group: go for them
  let foe = null, fd = 230;
  for (const o of nearUnits(c.x, c.y, 230)) { if (o.dead || !hostile(u.team, o.team) || hiddenFrom(o, u.team)) continue; const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < fd) { fd = d; foe = o; } }
  if (foe) { u.order = 'attack'; u.target = foe; u.repath = 0; return true; }
  // otherwise keep close to the group
  const d = Math.hypot(u.x - c.x, u.y - c.y);
  if (d > 70) { u.escRe = (u.escRe || 0) - frameDt; if (u.escRe <= 0 || !u.path.length) { u.escRe = 2; u.order = 'move'; u.dest = { x: c.x + (u.id % 2 ? 30 : -30), y: c.y + 24 }; u.stuckT = 0; u.path = findPath(u.x, u.y, u.dest.x, u.dest.y); } return true; }
  if (u.order === 'move') { u.order = 'idle'; u.path = []; }
  u.moving = false; return true;
}
// the lines and buttons in the yard's and quarry's box
function groupsHtml(site) {
  const gs = groupsOf(site); if (!gs.length) return '';
  return gs.map((list, g) => { const s = escortOf(site, g), what = site.kind === 'quarry' ? 'the ox cart' : `${list.length} woodcutter${list.length > 1 ? 's' : ''}`;
    return lnI(`Group ${GROUP_WORD[g] || g + 1} (${what})`, s ? `escorted by a ${KINDS[s.type].name.toLowerCase()}` : '<span style="color:#ffb38a">needs a soldier</span>'); }).join('');
}
function groupsButtons(site) {
  if (!groupsOn() || (site.kind !== 'woodhut' && site.kind !== 'quarry')) return '';
  const n = groupsOf(site).length;
  return `<div class="row" style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">${Array.from({ length: n }, (_, g) => `<button class="sm" data-ind="escort:${g}">Escort group ${GROUP_WORD[g] || g + 1}</button>`).join('')}</div>`;
}
let groupT = 0;
function updateGroups(dt) {
  if (!groupsOn()) return;
  groupT -= dt; if (groupT > 0) return; groupT = 5;
  autoEscorts();
}
