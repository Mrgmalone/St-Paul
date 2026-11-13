// long accelerated playthrough with invariant checks
const { chromium } = require('playwright');
const CIV = process.argv[2] || 'cyyoung', MINUTES = +(process.argv[3] || 20);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route('**/three.min.js', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack||'').split('\n').slice(1,3).join(' ')));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; });
  await p.goto(process.env.ARMY ? require('./env').GAME : require('./env').GAME_REAL + (process.env.RIVALS ? '?rivals=' + process.env.RIVALS : ''));   /* RIVALS=1..4 (Phase 4C: the game's own default is 3) */   // the real game (no starting army); ARMY=1 for the old start
  await p.evaluate(() => { const fs = window.__raf.splice(0); fs.forEach(f => f(0)); window.__now = 0; });
  if (process.env.DIFF) await p.evaluate(k => SD.setDiff(k), process.env.DIFF);   // DIFF=easy|medium|hard
  if (process.env.ARMY) await p.click(`.civ[data-civ="${CIV}"]`);   // the old peoples (older tests)
  else { const F = { legion: 'psychana', harvest: 'cyyoung', wardens: 'hekaranok' }[CIV] || CIV; await p.click(`.fac[data-fac="${F}"]`); await p.click(`.fac[data-fac="${F}"] .fgo`); }   // the four factions
  await p.evaluate(() => { window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); for (const u of units) if (u.order !== 'idle') u._busyT = time; if (i % 10 === 9) window.__track(); } };   // _busyT: any other order, even for a moment
    // circling: lots of walking in 10 seconds without getting anywhere; idle wandering: people with nothing to do moving about
    window.__tr = new Map();
    window.__track = () => {
      for (const u of units) {
        if (u.dead || u.inside || u.onWall) { window.__tr.delete(u); continue; }
        let t = window.__tr.get(u);
        if (!t) { window.__tr.set(u, { x: u.x, y: u.y, len: 0, x0: u.x, x1: u.x, y0: u.y, y1: u.y, t0: time, mv: 0, n: 0, fight: 0, idleLen: 0, cmd: u.cmdT }); continue; }
        const d = Math.hypot(u.x - t.x, u.y - t.y); t.len += d; t.x = u.x; t.y = u.y;
        t.x0 = Math.min(t.x0, u.x); t.x1 = Math.max(t.x1, u.x); t.y0 = Math.min(t.y0, u.y); t.y1 = Math.max(t.y1, u.y);
        t.n++; if (u.moving) t.mv++; if (u.combatT > 0 || u.attackAnim > 0 || (u.order === 'attack' && u.target && edgeDist(u, u.target) < 60)) t.fight++;
        const idle = u.order === 'idle' && !u.job && !(u.breakUntil > time) && !u.toHeal && (u.cmdT || -99) === t.cmd && !(u._busyT > time - 0.55);   // idle the whole time since the last look
        if (idle && t.prevIdle) t.idleLen += d;   // only movement while idle the whole time (a guard who chased a raider and just went idle again is not wandering)
        t.prevIdle = idle;
        if (time - t.t0 >= 10) {
          const span = Math.hypot(t.x1 - t.x0, t.y1 - t.y0);
          if (t.len > 160 && span < 60 && t.mv > t.n * 0.6 && t.fight < t.n * 0.2 && !isMachine(u)) window.__note('circling ' + u.type + ' ' + u.team + ' ' + u.order, { at: [Math.round(u.x), Math.round(u.y)], walked: Math.round(t.len), span: Math.round(span), sub: u.sub || '', t: Math.round(time) });
          if (t.idleLen > 40) window.__note('idle wandering ' + u.type + ' ' + u.team, { at: [Math.round(u.x), Math.round(u.y)], moved: Math.round(t.idleLen), t: Math.round(time), guard: !!u.guardOf });
          window.__tr.set(u, { x: u.x, y: u.y, len: 0, x0: u.x, x1: u.x, y0: u.y, y1: u.y, t0: time, mv: 0, n: 0, fight: 0, idleLen: 0, cmd: u.cmdT });
        }
      }
    };
    window.__issues = {}; window.__note = (k, v) => { const o = window.__issues[k] = window.__issues[k] || { n: 0, ex: [] }; o.n++; if (o.ex.length < 4) o.ex.push(v); };
    window.__hist = new Map(); window.__fp = 0; const fp0 = window.findPath; window.findPath = (...a) => { window.__fp++; return fp0(...a); };
    window.__check = () => {
      const N = window.__note;
      for (const u of units) {
        if (u.dead) continue;
        if (![u.x, u.y, u.hp].every(Number.isFinite)) N('NaN unit ' + u.type, [u.x, u.y, u.hp, u.order]);
        if (u.x < -60 || u.y < -60 || u.x > MW + 60 || u.y > MH + 60) N('off map ' + u.type + ' ' + u.team, [Math.round(u.x), Math.round(u.y), u.order]);
        if (u.hp > u.maxHp + 0.01) N('hp over max ' + u.type, [u.hp, u.maxHp]);
        if (u.guardOf && u.guardOf.dead) N('guard of dead', u.type);
        if (u.inside && (u.inside.dead || u.inside.done === false)) N('inside dead building', u.inside.kind);
        if (u.inside && selection.has(u)) N('selected while inside', u.type);
        if (u.order === 'attack' && !u.target) N('attack without target ' + u.type, u.team);
        if (u.look && !Number.isFinite(u.fat || 0)) N('fat NaN', u.fat);
        if (!isMachine(u) && !u.onWall) for (const s of structures) { if (s.dead || s.done === false || s.kind === 'moat' || s.kind === 'stairs' || s.kind === 'gate') continue; if (u.x > s.x0 + 4 && u.x < s.x1 - 4 && u.y > s.y0 + 4 && u.y < s.y1 - 4) { N('inside ' + s.kind + ' ' + u.type + ' ' + u.order, [Math.round(u.x), Math.round(u.y), u.team, u.owner, u.sub, u.job && u.job.kind, u.inside && u.inside.kind, s.id, s.team, s.rebuilt ? 'rebuilt' : '', s.owner, Math.round(time), u.id, u.hp | 0]); break; } }
        // stuck: wants to move but has not moved for 25s (not counted once the game is over: then nothing moves on purpose)
        if (won) { window.__hist.delete(u); continue; }
        const h = window.__hist.get(u) || { x: u.x, y: u.y, t: time, o: u.order };
        if (h.o !== u.order) { h.o = u.order; h.x = u.x; h.y = u.y; h.t = time; }   // a new order starts the clock afresh (a soldier who waited at home, then set out on a raid)
        if (Math.hypot(u.x - h.x, u.y - h.y) > 6) { h.x = u.x; h.y = u.y; h.t = time; }
        else if ((u.order === 'move' || u.order === 'return' || u.order === 'raid' || (u.order === 'build' && u.moving)) && time - h.t > 12) { { let ns = null, nd = 1e9; for (const s2 of structures) { if (s2.dead) continue; const d2 = edgeDist(u, s2); if (d2 < nd) { nd = d2; ns = s2; } } N('stuck ' + u.type + ' ' + u.team + ' ' + u.order, { at: [Math.round(u.x), Math.round(u.y)], t: Math.round(time), dest: u.dest ? [Math.round(u.dest.x), Math.round(u.dest.y)] : null, path: u.path.length, wp: u.path[0] ? [Math.round(u.path[0].x), Math.round(u.path[0].y)] : null, moving: u.moving, near: ns ? ns.kind + '/' + ns.team + ' d' + Math.round(nd) + (ns.done === false ? ' unbuilt' : '') : '', bt: u.buildTarget ? u.buildTarget.kind : u.ejob ? 'e:' + u.ejob.kind : '', sub: u.sub || '', route: u.route ? u.route.length : '', chop: !!u.chopTree, sick: u.sick, toHeal: u.toHeal, rest: u.rest || u.breakUntil > time ? 'rest' : '' }); } h.t = time; }
        window.__hist.set(u, h);
        if (u.sick && (u.sickSince ??= time) && time - u.sickSince > 150) { N('sick forever', { at: [Math.round(u.x), Math.round(u.y)], order: u.order, type: u.type, toHeal: u.toHeal, healT: u.healT, keepD: SD.keep() ? Math.round(edgeDist(u, SD.keep())) : -1, dest: u.dest ? [Math.round(u.dest.x), Math.round(u.dest.y)] : null, cmd: Math.round(time - (u.cmdT || 0)) }); u.sickSince = time; }
        if (!u.sick) u.sickSince = undefined;
      }
      for (const [k, v] of Object.entries(SD.res)) if (typeof v === 'number' && (!Number.isFinite(v) || v < -0.001)) N('res bad ' + k, v);
      if (!Number.isFinite(SD.mood())) N('mood NaN', SD.mood());
      for (const s of structures) if (!Number.isFinite(s.hp)) N('NaN struct', s.kind);
      if (floats.length > 200) N('floats leak', floats.length);
      if (speeches.length > 50) N('speeches leak', speeches.length);
      if (arrows.length > 400) N('arrows leak', arrows.length);
      if (typeof prints !== 'undefined' && prints.length > 600) N('prints over', prints.length);
      if (units.length > 400) N('units leak', units.length);
    };
  });
  const bot = async (min) => p.evaluate(([min, process_env_ARMY]) => {
    SD.res.wood += 150; SD.res.stone += 60; SD.res.gold += 40; SD.res.food += 60;
    const k = SD.keep(); if (!k) return 'no keep';
    const plan = [['house', -6, 6], ['house', -8, 6], ['woodhut', -10, 2], ['farm', 6, 8], ['house', -6, 9], ['lookout', 10, 4], ['quarry', -4, -8], ['gtower', 12, -4], ['house', -9, 9], ['roundtower', -12, 4], ['farm', 9, 10], ['smithy', 6, -4]];
    if (!process_env_ARMY) plan.splice(2, 0, ['granary', 8, -6], ['waterpot', -3, 5], ['alehouse', 9, 6], ['wheatfarm', -12, 10]);   /* the real game: a granary (or food spoils), a water pot, an alehouse, a wheat field */
    const it = plan[min % plan.length]; let msg = 'cannot place ' + it[0];
    try { outer: for (let rad = 0; rad < 14; rad++) for (let a = 0; a < 16; a++) { const c = k.c + it[1] + Math.round(Math.cos(a / 16 * 6.283) * rad), r = k.r + it[2] + Math.round(Math.sin(a / 16 * 6.283) * rad); if (SD.canPlace(it[0], c, r)) { SD.createBuilding(it[0], c, r); msg = 'placed ' + it[0]; break outer; } } } catch (e) { msg = 'place err ' + e.message; }
    try { for (const t of ['sword', 'archer', 'spear']) { SD.res[t === 'archer' ? 'bow' : t] = (SD.res[t === 'archer' ? 'bow' : t] || 0) + 1; SD.trainUnit(t); } } catch (e) { msg += ' train err ' + e.message; }
    if (min % 5 === 2) { const r = SD.rule(); try { document.querySelectorAll('#ration button, #tax button'); } catch (e) {} }
    return msg;
  }, [min, !!process.env.ARMY]);
  await p.evaluate(() => SD.setRaid(150));
  // the test player defends (every 5 seconds): idle soldiers go for the nearest enemy within 1,000 points of the keep
  await p.evaluate(() => { window.__fights = 0; window.__defend = () => { const k = SD.keep(); if (!k) return;
    const foes = units.filter(e => !e.dead && hostile('player', e.team) && e.type !== 'civ' && !hiddenFrom(e, 'player') && Math.hypot(e.x - k.x, e.y - k.y) < 1000); if (!foes.length) return;
    for (const s of units) { if (s.team !== 'player' || s.dead || s.type === 'civ' || s.type === 'king' || isMachine(s) || s.order !== 'idle' || s.onWall || s.guardOf) continue;
      const e = foes.reduce((a, b2) => Math.hypot(b2.x - s.x, b2.y - s.y) < Math.hypot(a.x - s.x, a.y - s.y) ? b2 : a); commandAttack([s], e); window.__fights++; } }; });
  const log = [];
  for (let m = 0; m < MINUTES; m++) {
    console.log(m + ': ' + await bot(m));
    for (let s = 0; s < 12; s++) { await p.evaluate(() => { window.__step(100); window.__check(); window.__defend(); }); }
    if (m % 5 === 4) console.log('   issues so far ' + JSON.stringify(await p.evaluate(() => Object.fromEntries(Object.entries(window.__issues).map(([k, v]) => [k, v.n]))))); if (m % 5 === 4) console.log('   mood ' + JSON.stringify(await p.evaluate(() => { try { return SD.moodReasons(); } catch (e) { return e.message; } }))); if (m % 5 === 4) console.log('   state ' + JSON.stringify(await p.evaluate(() => ({ t: Math.round(time), units: units.filter(u => !u.dead).length, mine: units.filter(u => !u.dead && u.team === 'player').length, foes: units.filter(u => !u.dead && u.team === 'enemy').length, mood: Math.round(SD.mood()), sick: units.filter(u => u.sick && !u.dead).length, fat: units.filter(u => (u.fat || 0) > 0.5 && !u.dead).length, gifts: units.filter(u => u.gift && !u.dead).length, inside: units.filter(u => u.inside && !u.dead).length, paths: window.__fp, won: won }))));
  }
  console.log(CIV, log.join('\n')); console.log('MOODWHY', JSON.stringify(await p.evaluate(() => { try { return SD.moodReasons(); } catch (e) { return e.message; } })), JSON.stringify(await p.evaluate(() => ({ rule: SD.rule(), res: SD.res, cap: popCap() }))));
  console.log('OUTCOME', JSON.stringify(await p.evaluate(() => ({ diff: DIFF.key, keep: SD.keep() ? Math.round(SD.keep().hp) + '/' + SD.keep().maxHp : 'lost', stage: stageN, people: myPeople(), soldiers: units.filter(u => u.team === 'player' && !u.dead && u.type !== 'civ' && !isMachine(u)).length, fights: window.__fights, won, rivals: REALM.rivals.map(R => (R.friend ? 'F' : '') + R.stage + (R.defeated ? 'x' : '') + ':' + rivalArmy(R).length) }))));
  console.log('ISSUES', JSON.stringify(await p.evaluate(() => window.__issues), null, 1));
  console.log('errors', errs.slice(0, 20), errs.length); await b.close(); })();
