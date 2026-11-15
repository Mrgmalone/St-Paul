// Master Guide version 3, step 1 of 2: pictures and numbers from the game itself.
// Takes photographs of the real game (the front page, a town at the second stage, every box and panel, the Citizen
// button, the banners, the flat view, the fog, the table's corners, a phone), draws every person, engine, building,
// good and weapon with the game's own pictures, and reads the live numbers (costs, stages, what each stage needs on
// each difficulty, what calling a citizen costs). Everything goes into tests/.work/guide3 for step 2,
// tools/master_guide.js, which writes design/Stronghold-Destroyer-Master-Guide-v3.pdf.
// usage, from the stronghold-destroyer folder:   node tools/guide3_shots.js
const { chromium, devices } = require('playwright'); const env = require('../tests/env'); const path = require('path'), fs = require('fs');
const OUT = path.join(env.SP, 'guide3'); fs.mkdirSync(OUT, { recursive: true });
const JPG = { type: 'jpeg', quality: 82 };
const shots = {}, fails = [];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;   // retake only these pictures (the others, and the numbers, are kept)
const save = (name, buf, kind = 'jpg') => { const f = name + '.' + kind; fs.writeFileSync(path.join(OUT, f), buf); shots[name] = f; };
const tryShot = async (name, fn) => { if (ONLY && !ONLY.includes(name)) return; try { await fn(); } catch (e) { fails.push(name + ': ' + e.message.split('\n')[0]); console.log('  failed', name, e.message.split('\n')[0]); } };

// the real game, time stepped by hand, every frame drawn so the pictures are current
async function game(ctxOpts, fac = 'cyyoung', diff) {
  const b = await chromium.launch(env.LAUNCH);
  const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage(); await env.use3d(p, { drawMs: 0 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
  await p.goto(env.GAME_REAL + '?start=0'); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__now = 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } }; window.__step(2); });
  return { b, p, errs, async begin() {
    if (diff) await p.click(`.dbtn[data-d="${diff}"]`);
    await p.click(`.fac[data-fac="${fac}"]`); await p.click(`.fac[data-fac="${fac}"] .fgo`); await p.waitForTimeout(200);
    await p.evaluate(() => { window.__step(4); SD.setRaid(99999); REALM.rogueT = 1e9; for (const R of REALM.rivals) { R.raidT = 1e9; R.scoutT = 1e9; } document.getElementById('banner').style.display = 'none';
      window.T = {
        put(kind, near) { const k = SD.keep(), o = near || { c: k.c + 1, r: k.r + 1 };
          for (let rad = 3; rad < 40; rad++) for (let a = 0; a < 28; a++) { const c = o.c + Math.round(Math.cos(a / 28 * 6.283) * rad), r = o.r + Math.round(Math.sin(a / 28 * 6.283) * rad); if (canPlace(kind, c, r)) { const bb = createBuilding(kind, c, r, 'player'); if (bb) { bb.done = true; bb.progress = 1; bb.hp = bb.maxHp; } return bb; } }
          return null; },
        people(n, type = 'civ') { const k = SD.keep(), out = []; for (let i = 0; i < n; i++) { const f = nearestFree(k.c + 2 + (i % 5), k.r + 6 + Math.floor(i / 5)); out.push(makeUnit('player', type, f.c * TILE + 16, f.r * TILE + 16)); } return out; },
        run(secs) { const d = window.__drawMs; window.__drawMs = 1e12; window.__step(Math.round(secs * 20)); window.__drawMs = d; },   /* (time runs on without drawing; pictures draw afresh) */
        quiet() { speeches.length = 0; floats.length = 0; },
        hideBits(ids) { for (const id of ids) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; } },
        showBits(ids) { for (const id of ids) { const e = document.getElementById(id); if (e) e.style.visibility = ''; } }
      }; }); } };
}
const rectOf = (p, sel, pad = 10) => p.evaluate(([s, pd]) => { const e = typeof s === 'string' ? document.querySelector(s) : null; if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.max(0, r.left - pd), y: Math.max(0, r.top - pd), width: Math.min(innerWidth - Math.max(0, r.left - pd), r.width + pd * 2), height: Math.min(innerHeight - Math.max(0, r.top - pd), r.height + pd * 2) }; }, [sel, pad]);
const clipShot = async (p, name, sel, pad = 10, kind = 'jpg') => { const c = await rectOf(p, sel, pad); if (!c || c.width < 4 || c.height < 4) throw new Error('nothing to photograph at ' + sel); save(name, await p.screenshot({ clip: c, ...(kind === 'jpg' ? JPG : {}) }), kind); return c; };

// a town at the Homestead: houses, fields, workshops, a quarry, soldiers on guard
async function buildTown(p, stage = 2) {
  await p.evaluate(stage => {
    SD.res.wood = 9000; SD.res.stone = 3000; SD.res.gold = 3000; SD.res.food = 900; SD.res.iron = 400;
    for (let s = 1; s < stage; s++) { growCastle(); window.__step(6); }
    const k = SD.keep(), at = (dc, dr) => ({ c: k.c + dc, r: k.r + dr });
    for (const [kind, dc, dr] of [['house', -6, 6], ['house', -2, 7], ['house', 2, 7], ['house', 6, 6], ['granary', 8, 1], ['stockpile', 9, -3], ['alehouse', -8, 1], ['poleturner', -9, -3], ['bowyer', -10, 3],
      ['farm', 0, 14], ['wheatfarm', -10, 12], ['woodhut', -14, -8], ['woodhut', 12, -9], ['chapel', 11, 6], ['waterpot', 4, 10], ['gtower', -7, -7], ['gtower', 7, -7], ['tavern', -4, 11]])
      T.put(kind, at(dc, dr));
    if (stage >= 2) { const rock = rocks.find(q => !q.gone && Math.hypot(q.x - k.x, q.y - k.y) < 1500); if (rock) T.put('quarry', { c: Math.floor(rock.x / TILE), r: Math.floor(rock.y / TILE) }); }
    if (stage >= 3) for (const kind of ['market', 'school', 'smithy', 'church']) T.put(kind, at(14, 10));
    T.people(12); const sold = T.people(4, 'spear').concat(T.people(3, 'archer'));
    sold.forEach((u, i) => { u.x = k.x - 80 + i * 26; u.y = k.y + 230; });
    window.__guideSold = sold; T.run(25); T.quiet(); updateHud();
  }, stage);
}

(async () => {
  // ================= 1. the front page and the match setup (an iPad, landscape) =================
  const IPAD = { ...devices['iPad (gen 7) landscape'], deviceScaleFactor: 1.5 };
  let G = await game(IPAD); let { p } = G;
  await tryShot('front', async () => { save('front', await p.screenshot(JPG)); });
  await tryShot('frontFull', async () => { save('frontFull', await p.screenshot({ fullPage: true, ...JPG })); });
  await tryShot('setup', async () => {   // the match setup: the part of the front page with the rivals, difficulty and start
    const sel = await p.evaluate(() => { const cand = ['#matchSet', '#match', '.match', '#setup', '.setup', '#diffRow', '.diff']; for (const s of cand) if (document.querySelector(s)) return s; return null; });
    if (sel) { await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); await p.waitForTimeout(150); await clipShot(p, 'setup', sel, 12); }
  });
  // the faction emblems, drawn by the game
  const emblems = await p.evaluate(() => FACTION_ORDER.map(k => { const c = document.createElement('canvas'); c.width = 200; c.height = 230; drawEmblem(c.getContext('2d'), k, 200, 230); const F = FACTIONS[k];
    return { k, name: F.name, epithet: F.epithet || '', plays: F.plays || '', strengths: F.strengths || [], weakness: F.weakness || '', start: F.start || {}, pic: c.toDataURL('image/png') }; }));
  await G.begin();
  // the peace banner as the game shows it
  const peaceNow = await p.evaluate(() => ({ diff: DIFF.key, first: RIVALS.raid.first, rogue: ROGUES.first }));
  await buildTown(p, 2);

  // ================= 2. the main screen, with its parts numbered by the guide =================
  await tryShot('main', async () => {
    await p.evaluate(() => { const k = SD.keep(); cam.z = 1.05; SD.centerOn(k.x, k.y + 120); ADVISOR.at = -999; ADVISOR.shown = ''; T.run(1); T.quiet(); window.__step(2); });
    save('main', await p.screenshot(JPG));
    shots.mainParts = await p.evaluate(() => { const at = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); if (!r.width) return null; return { id, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
      return { vw: innerWidth, vh: innerHeight, parts: ['btnMenu', 'top', 'btnTrophy', 'tips', 'side', 'diamond', 'mini', 'cMood', 'btnPeople'].map(at).filter(Boolean) }; });
  });
  // the troop diamond with six soldiers chosen; each button's place, for the guide's numbers
  await tryShot('diamond', async () => {
    await p.evaluate(() => { UI.closePops(); const k = SD.keep(); cam.z = 1.05; SD.centerOn(k.x, k.y + 120); selectOnly(window.__guideSold.slice(0, 6)); window.__step(2); updateHud(); T.quiet(); window.__step(1); });
    const parts = await p.evaluate(() => {
      const order = ['dMoveUp', 'dMoveRight', 'dMoveDown', 'dMoveLeft', 'dMarch', 'btnPatrol', 'btnGuardA', 'camAdd', 'btnStop', 'btnPeople', 'btnSold', 'camHome', 'btnClear', 'btnAll', 'btnCiv'];
      const rs = order.map(id => { const e = document.getElementById(id); return e ? { id, e, r: e.getBoundingClientRect() } : null; }).filter(o => o && o.r.width);
      const x0 = Math.min(...rs.map(o => o.r.left)) - 16, y0 = Math.min(...rs.map(o => o.r.top)) - 16, x1 = Math.max(...rs.map(o => o.r.right)) + 16, y1 = Math.max(...rs.map(o => o.r.bottom)) + 16;
      const clip = { x: Math.max(0, x0), y: Math.max(0, y0), width: x1 - Math.max(0, x0), height: Math.min(innerHeight, y1) - Math.max(0, y0) };
      return { clip, items: rs.map(o => { const sat = o.e.classList.contains('dsat'), off = sat ? 0.36 : 0.3; return { id: o.id, name: o.e.dataset.dname || o.id, x: (o.r.left + o.r.width * off - clip.x) / clip.width, y: (o.r.top + o.r.height * off - clip.y) / clip.height }; }) }; });
    save('diamond', await p.screenshot({ clip: parts.clip }), 'png'); shots.diamondParts = parts; await p.evaluate(() => { selection.clear(); window.__step(1); }); });
  // the 3D and the flat view of the same place
  await tryShot('view3d', async () => { await p.evaluate(() => { T.hideBits(['tips', 'alertBar']); const k = SD.keep(); cam.z = 1.5; SD.centerOn(k.x, k.y + 60); T.quiet(); window.__step(2); });
    const c = await p.evaluate(() => { const g = document.getElementById('game').getBoundingClientRect(); return { x: g.left + g.width / 2 - 300, y: g.top + g.height / 2 - 200, width: 600, height: 400 }; });
    save('view3d', await p.screenshot({ clip: c, ...JPG }));
    await p.evaluate(() => { setView(false); window.__step(3); }); save('viewFlat', await p.screenshot({ clip: c, ...JPG })); await p.evaluate(() => { setView(true); window.__step(3); }); });
  // the fog of war, seen from far out
  await tryShot('fog', async () => { await p.evaluate(() => { const k = SD.keep(); cam.z = 0.45; SD.centerOn(k.x + 900, k.y); T.quiet(); window.__step(3); }); save('fog', await p.screenshot(JPG)); });
  // the table, the brass bar, the water band and a globe in two corners
  await tryShot('corner', async () => { await p.evaluate(() => { cam.z = 0.45; SD.centerOn(0, 0); window.__step(4); }); save('cornerNW', await p.screenshot(JPG));
    await p.evaluate(() => { SD.centerOn(COLS * TILE, ROWS * TILE); window.__step(4); }); save('cornerSE', await p.screenshot(JPG));
    shots.globes = await p.evaluate(() => typeof FRAME !== 'undefined' ? JSON.parse(JSON.stringify(FRAME.globes || FRAME.corners || null)) : null); });
  await p.evaluate(() => { const k = SD.keep(); cam.z = 1.2; SD.centerOn(k.x, k.y + 100); T.showBits(['tips', 'alertBar']); window.__step(3); });

  // ================= 3. the boxes: trophy, mood, People, a person, a general, buildings =================
  await tryShot('trophy', async () => { await p.evaluate(() => { UI.closePops(); openTrophy(); }); await p.waitForTimeout(150); await clipShot(p, 'trophy', '#trophyPop', 8); await p.evaluate(() => UI.closePops()); });
  await tryShot('mood', async () => { await p.evaluate(() => { UI.closePops(); document.getElementById('cMood').click(); }); await p.waitForTimeout(150); await clipShot(p, 'mood', '#moodPop', 8); await p.evaluate(() => UI.closePops()); });
  await tryShot('people', async () => { await p.evaluate(() => { UI.closePops(); showPeople(); }); await p.waitForTimeout(150); await clipShot(p, 'people', '#peoplePop', 8); await p.evaluate(() => { document.getElementById('peoplePop').hidden = true; }); });
  await tryShot('card', async () => {
    await p.evaluate(() => { UI.closePops(); const c = units.find(u => u.team === 'player' && u.type === 'civ' && !u.dead && u.job); SD.centerOn(c.x, c.y); window.__step(2); showCard(c || units.find(u => u.team === 'player' && u.type === 'civ')); });
    await p.waitForTimeout(150); await clipShot(p, 'card', '#personPop', 8);
    await p.evaluate(() => { UI.closePops(); const s = window.__guideSold[0]; s.vet = 12; s.wars = 12; SD.centerOn(s.x, s.y); window.__step(2); showCard(s); });
    await p.waitForTimeout(150); await clipShot(p, 'general', '#personPop', 8); await p.evaluate(() => UI.closePops()); });
  for (const kind of ['quarry', 'farm', 'woodhut', 'alehouse', 'house']) await tryShot('site-' + kind, async () => {
    await p.evaluate(kind => { UI.closePops(); const b = structures.concat(farms).find(b => b.kind === kind && b.team === 'player' && !b.dead); if (!b) throw new Error('no ' + kind); SD.centerOn((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); window.__step(2); showSite(b); }, kind);
    await p.waitForTimeout(200); await clipShot(p, 'site-' + kind, '#storePop', 8); await p.evaluate(() => { UI.closePops(); T.quiet(); }); });

  // ================= 4. the Citizen button, calling one, the banners =================
  await tryShot('townList', async () => { await p.evaluate(() => { UI.closePops(); UI.showTab('town'); const b = document.querySelector('.tb[data-k="civ"]'), sc = document.getElementById('sideScroll'); callButton(); window.__step(2);
      sc.scrollTop += b.getBoundingClientRect().top - sc.getBoundingClientRect().top - sc.clientHeight / 2 + b.getBoundingClientRect().height / 2; window.__step(1); }); await p.waitForTimeout(150);
    await p.evaluate(() => { document.querySelector('.tb[data-k="civ"]').dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' })); }); await p.waitForTimeout(150);   /* (its name and cost show when the mouse rests on it, or a finger touches it) */
    const c = await p.evaluate(() => { const b = document.querySelector('.tb[data-k="civ"]').getBoundingClientRect(), s = document.getElementById('side').getBoundingClientRect(), L = document.getElementById('ibLabel'), l = L && !L.hidden ? L.getBoundingClientRect() : b;
      const x0 = Math.max(0, Math.min(s.left, l.left) - 10), y0 = Math.max(0, Math.min(b.top - 150, l.top - 10)), x1 = Math.min(innerWidth, Math.max(s.right, l.right + 10)), y1 = Math.min(innerHeight, Math.max(b.bottom + 60, l.bottom + 10)); return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }; });
    save('townList', await p.screenshot({ clip: c, ...JPG })); await clipShot(p, 'citizenBtn', '.tb[data-k="civ"]', 6, 'png'); });
  const bannerShot = async (name, fn) => tryShot(name, async () => { await p.evaluate(() => T.hideBits(['alertBar', 'tips'])); await p.evaluate(fn); await p.evaluate(() => { const b = document.getElementById('banner'); b.style.display = ''; window.__step(3); }); await p.waitForTimeout(120); await clipShot(p, name, '#banner', 8, 'png');
    await p.evaluate(() => { const b = document.getElementById('banner'); b.style.display = 'none'; b.classList.remove('shown'); T.showBits(['alertBar', 'tips']); }); });
  await bannerShot('bannerCall', () => { mood = 60; SD.res.food = 900; SD.res.gold = 900; trainQueue.length = 0; requestCitizen(); });
  await bannerShot('bannerWin', () => { CALL4F.winWar('Ashmoor\'s raid is beaten off (5 of 6 fell).'); });
  await tryShot('arrive', async () => { await p.evaluate(() => { const before = new Set(units.map(u => u.id)); T.run(0.2); const q = trainQueue.find(q => q.called); if (q) q.t = q.dur - 0.5; T.run(1.2);
      const u = units.find(u => !before.has(u.id) && u.type === 'civ') || units.filter(u => u.type === 'civ').pop(); T.hideBits(['diamond', 'btnTrophy', 'tips', 'alertBar', 'mini']); document.querySelectorAll('.dsat').forEach(e => e.style.visibility = 'hidden');
      cam.z = 1.8; SD.centerOn(u.x, u.y - 20); window.__step(3); });
    const c = await p.evaluate(() => { const g = document.getElementById('game').getBoundingClientRect(); return { x: g.left + g.width / 2 - 260, y: g.top + g.height / 2 - 170, width: 520, height: 340 }; }); save('arrive', await p.screenshot({ clip: c, ...JPG }));
    await p.evaluate(() => { T.quiet(); warWins = []; T.showBits(['diamond', 'btnTrophy', 'tips', 'alertBar', 'mini']); document.querySelectorAll('.dsat').forEach(e => e.style.visibility = ''); }); });

  // ================= 5. Help and Settings =================
  await tryShot('helpHome', async () => { await p.evaluate(() => UI.closePops()); await p.click('#btnHelpTop'); await p.waitForTimeout(300); await clipShot(p, 'helpDrop', '#help .box', 6);   /* (as it opens from the ?: the Topics drop-down) */
    await p.evaluate(() => HELPUI.closeDrop()); await clipShot(p, 'helpHome', '#help .box', 6);
    await p.evaluate(() => HELPUI.openArticle('g-11-calling-more-citizens')); await p.waitForTimeout(250); await clipShot(p, 'helpGuide', '#help .box', 6);
    await p.evaluate(() => HELPUI.openArticle('call-citizens')); await p.waitForTimeout(250); await clipShot(p, 'helpArticle', '#help .box', 6);
    await p.fill('#hlpQ', 'stone'); await p.waitForTimeout(350); await clipShot(p, 'helpSearch', '#help .box', 6); await p.evaluate(() => { document.getElementById('hlpQ').value = ''; toggleHelp(); }); });
  await tryShot('settings', async () => { await p.evaluate(() => { UI.closePops(); document.getElementById('btnMenu').click(); }); await p.waitForTimeout(200);
    await p.evaluate(() => { const n = document.getElementById('saveName'); if (n) n.value = 'My Homestead'; }); await clipShot(p, 'settings', '#menuPop', 6); await p.evaluate(() => UI.closePops()); });
  await tryShot('saves', async () => { await p.evaluate(() => saveGame('My Homestead')); await p.waitForTimeout(400); await p.evaluate(() => { UI.closePops(); document.getElementById('btnMenu').click(); });
    await p.waitForTimeout(250); await p.evaluate(() => { refreshSaveList(); document.getElementById('saveSec').scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(400); await clipShot(p, 'saves', '#saveSec', 8); await p.evaluate(() => UI.closePops()); });

  // ================= 6. a small battle (sparks, no blood) =================
  await tryShot('battle', async () => { await p.evaluate(() => { const l = window.__guideSold, k = SD.keep(); const x = k.x - 40, y = k.y + 330; const foes = [];
      for (let i = 0; i < 5; i++) { const u = makeUnit('enemy', i % 2 ? 'sword' : 'spear', x - 60 + i * 30, y + 70); u.owner = (REALM.rivals.find(R => !R.friend) || {}).id; foes.push(u); }
      for (const u of l) { u.x = x - 80 + Math.random() * 160; u.y = y - 10; } T.run(2.4); T.quiet(); SD.centerOn(x, y + 30); cam.z = 1.7; window.__step(1); });
    const c = await p.evaluate(() => { const g = document.getElementById('game').getBoundingClientRect(); return { x: g.left + g.width / 2 - 280, y: g.top + g.height / 2 - 180, width: 560, height: 360 }; }); save('battle', await p.screenshot({ clip: c, ...JPG })); });

  if (ONLY) { const old = JSON.parse(fs.readFileSync(path.join(OUT, 'data.json'), 'utf8')); Object.assign(old.shots, shots);
    if (ONLY.some(n => ['phone', 'phoneTown'].includes(n))) { const errsIpad = G.errs.slice(); await G.b.close(); G = await game({ ...devices['iPhone 13'], deviceScaleFactor: 2 }); p = G.p; await G.begin(); await buildTown(p, 2); await phoneShots(p); Object.assign(old.shots, shots); }
    fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify(old)); console.log('retaken', Object.keys(shots), 'failed', fails); await G.b.close(); return; }
  // ================= 7. the pictures of every person, engine, building, good and weapon; the numbers =================
  const data = await p.evaluate(() => {
    const pic = key => { try { const c = R3D.iconOf(key); return c ? c.toDataURL('image/png') : ''; } catch (e) { return ''; } };
    const uiPic = id => { const d = document.createElement('div'); d.className = 'ib'; const c = document.createElement('canvas'); c.dataset.icon = id; d.appendChild(c); document.body.appendChild(d); UI.paintIcons(d); const u = c.toDataURL('image/png'); d.remove(); return u; };
    const unitKeys = ['civ', 'king', 'spear', 'archer', 'archer.longbow', 'archer.crossbow', 'sword', 'maceman', 'maceman.berserker', 'archer.flame', 'knight.foot', 'knight', 'ram', 'catapult', 'ballista', 'trebuchet', 'oxcart', 'engineer'];
    const units = Object.fromEntries(unitKeys.map(k => [k, pic('u:' + k)]));
    const blds = Object.fromEntries(Object.keys(BUILD).map(k => [k, pic('b:' + k)]));
    const goods = Object.fromEntries(['food', 'wood', 'stone', 'iron', 'gold', 'wheat', 'flour', 'bread', 'hops', 'ale', 'grapes', 'apples', 'leather'].map(k => [k, uiPic('r:' + k)]));
    const weapons = Object.fromEntries(['sword', 'spear', 'bow', 'mace', 'armor'].map(k => [k, uiPic('w:' + k)]));
    const cost = o => ['wood', 'stone', 'gold', 'iron'].filter(k => o && o[k]).map(k => o[k] + ' ' + k).join(', ') || 'free';
    const costs = Object.fromEntries(Object.entries(BUILD).map(([k, o]) => [k, { name: o.name, cost: cost(o), stage: stageOfItem(k, false) }]));
    const unitStage = t => { const [type, kit] = t.split('.'); if (kit && SOLDIERS.kits[kit]) return SOLDIERS.kits[kit].stage; if (t === 'knight') return 4; return stageOfItem(type, true); };
    const ustage = Object.fromEntries(unitKeys.map(k => [k, unitStage(k)]));
    // what each stage asks, on each difficulty (the trophy shows these live)
    const was = SD.diff().key, needs = {};
    for (const d of ['easy', 'medium', 'hard']) { SD.setDiff(d); needs[d] = {}; for (let n = 2; n <= 5; n++) needs[d][n] = needRows(n, playerHave()).map(r => ({ what: r.what, need: r.need })); }
    SD.setDiff(was);
    // what calling a citizen takes, by happiness, wars won and generals
    const m0 = mood, w0 = warWins.slice(); const call = {};
    for (const m of [90, 75, 60, 45, 30, 15]) { mood = m; warWins = []; const t = citizenTerms(); call[m] = { food: t.food, gold: t.gold, secs: t.secs }; }
    mood = 60; const wins = {}; for (let w = 0; w <= 3; w++) { warWins = Array(w).fill(time); const t = citizenTerms(); wins[w] = { food: t.food, gold: t.gold, secs: t.secs, boost: +growBoost().toFixed(2) }; }
    warWins = w0; mood = m0;
    const stages = STAGES.map(s => ({ n: s.n, name: s.name, units: s.unlock.units, buildings: s.unlock.buildings }));
    const kits = Object.fromEntries(Object.entries(SOLDIERS.kits).map(([k, v]) => [k, { name: v.name, stage: v.stage, needs: v.needs, gold: v.gold, iron: v.iron, leather: v.leather, only: v.only }]));
    return { units, blds, goods, weapons, costs, ustage, needs, call, wins, stages, kits, CITIZEN_CALL, moat: MOAT_FILLERS, towerEngine: SOLDIERS.towerEngine || null,
      peace: { raid: RIVALS.raid.first, rogue: ROGUES.first }, helpCount: (window.HELP_DATA || (typeof HELP_DATA !== 'undefined' ? HELP_DATA : { articles: [] })).articles.length };
  });
  // the keep has no stand-alone model: photograph it in the game
  await tryShot('keep', async () => { await p.evaluate(() => { const k = SD.keep(); cam.z = 2.2; SD.centerOn(k.x, k.y - 30); T.hideBits(['tips', 'alertBar', 'btnTrophy', 'side', 'diamond', 'mini', 'top']); T.quiet(); window.__step(3); });
    const kp = await p.evaluate(() => { const k = SD.keep(), s = SD.scr(k.x, (k.y0 + k.y1) / 2, 60), r = document.getElementById('game').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top }; });
    save('keep', await p.screenshot({ clip: { x: Math.max(0, kp.x - 190), y: Math.max(0, kp.y - 220), width: 380, height: 380 }, ...JPG }));
    await p.evaluate(() => T.showBits(['tips', 'alertBar', 'btnTrophy', 'side', 'diamond', 'mini', 'top'])); });

  // ================= 8. the Hold (stage 3): the market and school boxes =================
  await tryShot('hold', async () => { await p.evaluate(() => { SD.res.stone += 2000; SD.res.iron += 300; growCastle(); window.__step(8); const k = SD.keep(); for (const kind of ['market', 'school', 'smithy']) T.put(kind, { c: k.c + 14, r: k.r + 10 }); T.run(3); T.quiet(); updateHud(); }); });
  for (const kind of ['market', 'school', 'smithy']) await tryShot('site-' + kind, async () => {
    await p.evaluate(kind => { UI.closePops(); const b = structures.find(b => b.kind === kind && b.team === 'player' && !b.dead); if (!b) throw new Error('no ' + kind); SD.centerOn((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); window.__step(2); showSite(b); }, kind);
    await p.waitForTimeout(200); await clipShot(p, 'site-' + kind, '#storePop', 8); await p.evaluate(() => UI.closePops()); });
  await tryShot('town3', async () => { await p.evaluate(() => { UI.closePops(); T.hideBits(['tips', 'alertBar']); const k = SD.keep(); cam.z = 0.95; SD.centerOn(k.x, k.y + 140); T.quiet(); window.__step(3); }); save('town3', await p.screenshot(JPG)); await p.evaluate(() => T.showBits(['tips', 'alertBar'])); });
  const errsIpad = G.errs.slice(); await G.b.close();

  // ================= 9. a phone: the town, and the Town list open from the bottom =================
  G = await game({ ...devices['iPhone 13'], deviceScaleFactor: 2 }); p = G.p; await G.begin(); await buildTown(p, 2); await phoneShots(p);
  const errsPhone = G.errs.slice(); await G.b.close();

  fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify({ shots, emblems, peaceNow, data, fails, errs: errsIpad.concat(errsPhone).slice(0, 10) }));
  console.log('pictures', Object.keys(shots).length, 'failed', fails.length, fails); console.log('page errors', errsIpad.concat(errsPhone).slice(0, 5));
})();

async function phoneShots(p) {
  await tryShot('phone', async () => { await p.evaluate(() => { const k = SD.keep(); SD.centerOn(k.x, k.y + 140); T.quiet(); window.__step(3); }); save('phone', await p.screenshot(JPG)); });
  await tryShot('phoneTown', async () => { await p.evaluate(() => { PHONE.openSheet('town'); callButton(); window.__step(3); const b = document.querySelector('.tb[data-k="civ"]'), sc = document.getElementById('sideScroll'); sc.scrollTop += b.getBoundingClientRect().top - sc.getBoundingClientRect().top - 20; window.__step(2); }); await p.waitForTimeout(200); save('phoneTown', await p.screenshot(JPG)); });
}
