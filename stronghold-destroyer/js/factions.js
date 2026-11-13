'use strict';
// Stronghold Destroyer — the four factions' rules, for you and for the computer rivals.
// The numbers live in settings.js; this file only carries them out.

// The older tests ask for the game as it was before the factions (index.html?testArmy=1): the three old
// peoples on the front page, one enemy camp, nothing locked by stage. The real game never passes it.
const LEGACY = /[?&]testArmy=1/.test(location.search);
let FACKEY = null;   // your faction ('cyyoung', 'ticanologue', 'hekaranok', 'psychana'); null in the old game

// which faction a side plays: you, or a rival (set on its units and buildings as .fac)
const facOf = o => o ? (o.team === 'player' ? FACKEY : o.fac || null) : null;
const facRule = (key, name, dflt) => { const f = key && FACTIONS[key]; return f && f.rules[name] !== undefined ? f.rules[name] : dflt; };
const myRule = (name, dflt) => facRule(FACKEY, name, dflt);

// the faction as the old game's people settings (so everything that reads CIV keeps working)
function factionCiv(key) {
  const f = FACTIONS[key], r = f.rules;
  return Object.assign({}, FACTION_BASE, { key, fac: key, name: f.name, color: f.field, dark: f.trim, food: f.start.food, wood: f.start.wood,
    popMul: r.popMul || 1, sHp: r.hpMul || 1, sDmg: r.dmgMul || 1 });
}
// a unit made for a side that plays a faction: weaker people for the healers, far sight for Psychana
function applyFaction(u, key) {
  if (!key || isMachine(u)) return;
  u.fac = key;
  const hp = facRule(key, 'hpMul', 1), dm = facRule(key, 'dmgMul', 1), sight = facRule(key, 'sight', 0);
  if (u.team !== 'player' || u.type === 'civ') { if (hp !== 1) u.maxHp = u.hp = Math.round(u.hp * hp); if (dm !== 1) u.dmg *= dm; }   // your soldiers already get it through CIV
  if (sight) u.sight = sight;
}

// ---------- Cy Young: four and a half times the bread, and the surplus sold for gold ----------
const bakeryMulOf = site => site && site.kind === 'bakery' ? facRule(site.team === 'player' ? FACKEY : site.fac, 'bakeryMul', 1) : 1;
let sellT = 0;
function sellSurplus(dt) {
  const ev = myRule('sellEvery', 0); if (!ev) return;
  if ((sellT += dt) < ev) return; sellT = 0;
  const above = myRule('sellAbove', 200), lot = myRule('sellLot', 10), g = myRule('sellGold', 3);
  const lots = Math.floor((res.food - above) / lot); if (lots <= 0) return;
  spendFood(lots * lot); res.gold += lots * g;
  const k = playerKeep(); if (k) floatText(k.x, k.y0 - 40, `+${lots * g} gold: ${lots * lot} spare food sold`, '#f2d27a');
}

// ---------- Hekaranok: the wounded run home, heal, and walk back to exactly where they were ----------
const isFighter = u => !u.dead && !isMachine(u) && u.type !== 'civ' && u.type !== 'king' && !u.lord && !u.onWall && !u.inside;
function healHomeOf(u) {   // the House of Prayer (the abbey's stand-in) if one stands, else the keep or the camp
  let best = null, bd = 1e9;
  for (const s of structures) { if (s.dead || s.done === false || s.team !== u.team || (u.owner !== undefined && s.owner !== u.owner)) continue;
    if (s.kind !== 'chapel' && s.kind !== 'keep' && !s.campCenter) continue; const d = Math.hypot(s.x - u.x, s.y - u.y); if (d < bd) { bd = d; best = s; } }
  return best;
}
function walkTo(u, x, y) { u.order = 'move'; u.target = null; u.dest = { x, y }; u.stuckT = 0; u._pd = null; u.path = findPath(u.x, u.y, x, y); u.repath = 2; }
function sendToHeal(u, bell) {
  const home = healHomeOf(u); if (!home) return false;
  u.hk = { back: { x: u.x, y: u.y }, home, state: 'going', bell: !!bell };
  const ap = approachPoint(u, home); walkTo(u, ap.x, ap.y); if (u.team === 'player') u.cmdT = time;
  return true;
}
let healT = 0;
function updateHealers(dt) {
  if ((healT += dt) < 0.25) return; const step = healT; healT = 0;
  for (const u of units) {
    if (u.dead) { u.hk = null; continue; }
    const key = facOf(u); if (key !== 'hekaranok' || !isFighter(u) && !u.hk) continue;
    const r = FACTIONS.hekaranok.rules;
    if (!u.hk) { if (u.hp < u.maxHp * r.fleeBelow) sendToHeal(u); continue; }
    const h = u.hk;
    if (!h.home || h.home.dead) { u.hk = null; continue; }
    if (h.state === 'going') {
      if (edgeDist(u, h.home) < 46) { h.state = 'healing'; u.order = 'hold'; u.path = []; u.moving = false; }
      else if (u.order !== 'move' || !u.path.length) { const ap = approachPoint(u, h.home); walkTo(u, ap.x, ap.y); }
    } else if (h.state === 'healing') {
      u.order = 'hold'; u.moving = false;
      u.hp = Math.min(u.maxHp, u.hp + r.healPerSec * (h.home.kind === 'chapel' ? r.abbeyHealMul : 1) * step);
      if (u.hp >= u.maxHp * 0.98) { h.state = 'back'; walkTo(u, h.back.x, h.back.y); if (u.team === 'player') u.cmdT = time; }
    } else if (h.state === 'back') {
      if (Math.hypot(u.x - h.back.x, u.y - h.back.y) < 28 || u.order !== 'move') { u.hk = null; if (u.order === 'move' && Math.hypot(u.x - h.back.x, u.y - h.back.y) < 28) { u.order = 'idle'; u.path = []; } }
    }
  }
}
// the bell: every soldier comes home to heal, then walks back to the spot it left
function ringBell() {
  if (FACKEY !== 'hekaranok') return 0; let n = 0;
  for (const u of units) if (u.team === 'player' && isFighter(u) && !u.hk && sendToHeal(u, true)) n++;
  AudioSys.ui && AudioSys.ui('warhorn'); const k = playerKeep(); if (k) floatText(k.x, k.y0 - 60, `The bell rings: ${n} come home to heal`, '#9fe8a8');
  return n;
}

// ---------- Psychana: far sight, and small bands of berserkers that move unseen ----------
// A berserker (stand-in: a soldier wearing the berserker kit until the real unit comes in Phase 4B) in a band of
// fewer than 10 is hidden from every other side, unless a tower or palisade tower of that side, standing near its
// own castle, has it in range.
const TOWER_KINDS = { gtower: 1, lookout: 1, stower: 1, roundtower: 1, greattower: 1, tower: 1 };
let stealthT = 0;
function castleOf(side) { return side === 'player' ? playerKeep() : structures.find(s => s.campCenter && !s.dead && s.owner === side) || null; }
function updateStealth(dt) {
  if ((stealthT += dt) < 0.3) return; stealthT = 0;
  const band = units.filter(u => !u.dead && u.kit === 'berserker' && facOf(u) === 'psychana');
  for (const u of units) if (u.stealth) { u.stealth = false; u.spotted = false; }
  if (!band.length) return;
  const r = FACTIONS.psychana.rules;
  // the towers that can spot: near their own castle
  const spotters = structures.filter(s => !s.dead && s.done !== false && TOWER_KINDS[s.kind] && (() => { const c = castleOf(s.team === 'player' ? 'player' : s.owner); return c && Math.hypot(c.x - s.x, c.y - s.y) < r.castleRange; })());
  for (const u of band) {
    const mates = band.filter(o => o.team === u.team && Math.hypot(o.x - u.x, o.y - u.y) < 220).length;
    if (mates > r.stealthMax) continue;
    u.stealth = true;
    u.spotted = spotters.some(s => hostile(s.team, u.team) && Math.hypot(s.x - u.x, s.y - u.y) < r.spotRange);
  }
}
// hidden from this team: a stealthy berserker nobody's tower has spotted
const hiddenFrom = (o, team) => !!(o.stealth && !o.spotted && o.team !== team);

// ---------- once a frame ----------
function updateFactions(dt) { sellSurplus(dt); updateHealers(dt); updateStealth(dt); }

// ---------- emblems: drawn in code, the same way as the lion and the ember tower ----------
// A heater shield in the faction's field colour with its charge: a wheat sheaf, a pair of scales, a healing herb, an eye.
function drawEmblem(g, key, w, h, bare) {   // bare: the charge on a plain field (for cloth and shields in the world), no shield outline
  const f = FACTIONS[key]; if (!f) return;
  g.save(); if (!bare) g.clearRect(0, 0, w, h);
  const sh = bare ? () => { g.beginPath(); g.rect(0, 0, w, h); } : () => { g.beginPath(); g.moveTo(w * 0.1, h * 0.06); g.lineTo(w * 0.9, h * 0.06); g.lineTo(w * 0.9, h * 0.5); g.quadraticCurveTo(w * 0.88, h * 0.82, w * 0.5, h * 0.96); g.quadraticCurveTo(w * 0.12, h * 0.82, w * 0.1, h * 0.5); g.closePath(); };
  sh(); if (!bare) { g.fillStyle = f.field; g.fill(); g.lineWidth = Math.max(2, w * 0.05); g.strokeStyle = f.trim; g.stroke(); }
  sh(); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, w * 0.5, h);   // a soft sheen on one half
  g.strokeStyle = f.charge; g.fillStyle = f.charge; g.lineCap = 'round'; g.lineJoin = 'round';
  const cx = w * 0.5, cy = h * 0.5, s = w / 100;
  if (f.emblem === 'wheat') {   // a sheaf: stalks gathered by a band, ears at the top
    g.lineWidth = 3 * s;
    for (const a of [-0.42, -0.21, 0, 0.21, 0.42]) { g.beginPath(); g.moveTo(cx, cy + 30 * s); g.quadraticCurveTo(cx + a * 20 * s, cy, cx + a * 60 * s, cy - 22 * s); g.stroke();
      for (let k = 0; k < 4; k++) { const ex = cx + a * (60 - k * 9) * s, ey = cy - (22 - k * 7) * s; g.beginPath(); g.ellipse(ex, ey, 3.2 * s, 6 * s, a * 1.4, 0, Math.PI * 2); g.fill(); } }
    g.fillRect(cx - 12 * s, cy + 8 * s, 24 * s, 6 * s);
  } else if (f.emblem === 'scales') {   // a balance: post, beam and two pans
    g.lineWidth = 4 * s; g.beginPath(); g.moveTo(cx, cy - 30 * s); g.lineTo(cx, cy + 30 * s); g.moveTo(cx - 34 * s, cy - 18 * s); g.lineTo(cx + 34 * s, cy - 18 * s); g.moveTo(cx - 14 * s, cy + 30 * s); g.lineTo(cx + 14 * s, cy + 30 * s); g.stroke();
    g.lineWidth = 2 * s; for (const sx of [-1, 1]) { const px = cx + sx * 30 * s; g.beginPath(); g.moveTo(px, cy - 18 * s); g.lineTo(px - 12 * s, cy + 6 * s); g.moveTo(px, cy - 18 * s); g.lineTo(px + 12 * s, cy + 6 * s); g.stroke();
      g.beginPath(); g.arc(px, cy + 6 * s, 13 * s, 0, Math.PI); g.fill(); }
    g.beginPath(); g.arc(cx, cy - 32 * s, 5 * s, 0, Math.PI * 2); g.fill();
  } else if (f.emblem === 'herb') {   // a healing sprig: a stem with paired leaves, and a drop
    g.lineWidth = 3.5 * s; g.beginPath(); g.moveTo(cx, cy + 32 * s); g.quadraticCurveTo(cx - 6 * s, cy, cx + 2 * s, cy - 30 * s); g.stroke();
    for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) { const y = cy + (20 - k * 14) * s, x = cx - k * 1.5 * s; g.beginPath(); g.ellipse(x + sx * 12 * s, y - 4 * s, 11 * s, 5 * s, sx * -0.6, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.moveTo(cx + 26 * s, cy - 30 * s); g.quadraticCurveTo(cx + 36 * s, cy - 12 * s, cx + 26 * s, cy - 8 * s); g.quadraticCurveTo(cx + 16 * s, cy - 12 * s, cx + 26 * s, cy - 30 * s); g.fill();
  } else if (f.emblem === 'eye') {   // a watchful eye with rays
    g.lineWidth = 4 * s; g.beginPath(); g.moveTo(cx - 36 * s, cy); g.quadraticCurveTo(cx, cy - 30 * s, cx + 36 * s, cy); g.quadraticCurveTo(cx, cy + 30 * s, cx - 36 * s, cy); g.stroke();
    g.beginPath(); g.arc(cx, cy, 12 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = f.field; g.beginPath(); g.arc(cx, cy, 5 * s, 0, Math.PI * 2); g.fill();
    g.lineWidth = 2.5 * s; for (let k = 0; k < 7; k++) { const a = Math.PI * (1.15 + k * 0.117); g.beginPath(); g.moveTo(cx + Math.cos(a) * 28 * s, cy - 6 * s + Math.sin(a) * 28 * s); g.lineTo(cx + Math.cos(a) * 40 * s, cy - 6 * s + Math.sin(a) * 40 * s); g.stroke(); }
  }
  g.restore();
}

// ---------- the front page: the four factions side by side ----------
function startLine(f) {
  const s = f.start;
  return `Your king, on foot &middot; ${s.civilians} civilians &middot; a shack and a small wooden palisade &middot; ${s.food} food, ${s.wood} wood &middot; no soldiers`;
}
function buildFrontPage() {
  const box = document.getElementById('facCards'); if (!box) return;
  if (LEGACY) document.getElementById('oldCards').hidden = false;
  box.innerHTML = FACTION_ORDER.map(k => { const f = FACTIONS[k];
    return `<button class="fac" data-fac="${k}" style="--fc:${f.field};--ft:${f.trim}">
      <div class="fhead"><canvas class="femb" width="120" height="140" data-emb="${k}"></canvas><div><div class="fnm">${f.name}</div><div class="fep">${f.epithet}</div>
        <div class="fsw"><span style="background:${f.field}"></span><span style="background:${f.charge}"></span></div></div></div>
      <p class="fplay">${f.plays}</p>
      <div class="fhd good">STRENGTHS</div><ul>${f.strengths.map(x => `<li>${x}</li>`).join('')}</ul>
      <div class="fhd bad">WEAKNESS</div><p class="fweak">${f.weakness}</p>
      <div class="fhd">YOU START WITH</div><p class="fstart">${startLine(f)}</p>
      <div class="fgo">Play as ${f.name} &#9654;</div></button>`; }).join('');
  box.querySelectorAll('canvas[data-emb]').forEach(c => drawEmblem(c.getContext('2d'), c.dataset.emb, c.width, c.height));
}
