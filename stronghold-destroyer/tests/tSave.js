// Phase 4D step D2: saving and loading. For several games (each faction, every difficulty, 1 to 4 rivals, early and late
// stages) the check plays a while, saves from Settings, closes the page, opens the game again, loads the save from the
// front page, and compares the whole game before and after: time, stage, goods, every person and building, the rivals,
// the fog, the land (trees cut, rocks quarried), patrols, rally flags, moats, spikes, fires and repairs. The game must
// then carry on without errors. It also exports a save to a file, deletes it, imports the file and loads that, and checks
// the autosave slot and Delete.
const { chromium } = require('playwright'); const env = require('./env'); const fs = require('fs'), path = require('path');
const T_HELPERS = () => {
  window.T = {
    put(kind, near) { const k = SD.keep(), o = near || { c: k.c + 1, r: k.r + 1 };
      for (let rad = 3; rad < 40; rad++) for (let a = 0; a < 28; a++) { const c = o.c + Math.round(Math.cos(a / 28 * 6.283) * rad), r = o.r + Math.round(Math.sin(a / 28 * 6.283) * rad); if (canPlace(kind, c, r)) { const bb = createBuilding(kind, c, r); finishBuilding(bb); bb.hp = bb.maxHp; return bb; } }
      return null; },
    people(n, type = 'civ') { const k = SD.keep(), out = []; for (let i = 0; i < n; i++) { const f = nearestFree(k.c + 2 + (i % 5), k.r + 6 + Math.floor(i / 5)); out.push(makeUnit('player', type, f.c * TILE + 16, f.r * TILE + 16)); } return out; },
    stage(n) { stageN = n; window.__step(25); },
    run(secs) { window.__step(Math.round(secs * 20)); },
    close() { document.getElementById('storePop').hidden = true; storeShown = null; }
  };
  window.__fp = () => {
    const by = (arr, f) => { const o = {}; for (const x of arr) { const k = f(x); o[k] = (o[k] || 0) + 1; } return o; }, r2 = v => Math.round(v * 100) / 100;
    return { time: r2(time), stage: stageN, fac: FACKEY, diff: DIFF.key, mood: r2(mood), tax, ration, res: Object.fromEntries(Object.entries(res).map(([k, v]) => [k, r2(v)])), foodKinds: JSON.stringify(foodKinds),
      units: by(units, u => u.team + ':' + u.type + (u.dead ? ':dead' : '')), bld: by(structures.concat(farms), b => b.team + ':' + b.kind + (b.done === false ? ':todo' : '') + (b.dead ? ':dead' : '')),
      rivals: REALM.rivals.map(R => [R.fac, R.stage, R.friend, R.defeated, Math.round(R.res.gold), R.keep ? Math.round(R.keep.hp) : 0, R.lord ? R.lord.id : 0]),
      trees: trees.length, rocksGone: rocks.filter(r => r.gone).length, bushFood: Math.round(bushes.reduce((a, b) => a + b.amount, 0)), stumps: stumps.length,
      fog: FOG.seen ? FOG.seen.reduce((a, b) => a + b, 0) : 0, blocked: blocked.reduce((a, b) => a + b, 0), gate: gate.reduce((a, b) => a + b, 0),
      pos: units.reduce((a, u) => a + Math.round(u.x) * 3 + Math.round(u.y) * 7, 0), hp: units.reduce((a, u) => a + Math.round(u.hp), 0), bhp: structures.concat(farms).reduce((a, b) => a + Math.round(b.hp), 0),
      jobs: units.filter(u => u.job).map(u => u.id + '>' + u.job.id).join(','), homes: units.filter(u => u.home).length, vets: units.reduce((a, u) => a + (u.vet || 0) + (u.kills || 0), 0),
      names: units.filter(u => u.pname).map(u => u.pname).join(','), patrols: units.filter(u => u.patrol).map(u => u.id + ':' + u.patrol.pts.length).join(','),
      fire: structures.filter(b => b.fire > 0).map(b => b.id + ':' + r2(b.fire)).join(','), rebuild: rebuildQ.length, sites: JSON.stringify(START_SITES), keepHp: Math.round(keep.hp), keepId: keep.id,
      soldierLvl, schoolLvl, rally: JSON.stringify(rally), growing: growing.length, trainQ: trainQueue.length, weather: WEATHER.kind + WEATHER.season, raidTimer: r2(raidTimer),
      idsOk: (() => { const ids = units.map(u => u.id).concat(structures.map(b => b.id), farms.map(b => b.id)); return new Set(ids).size === ids.length && ids.every(i => i < nextId); })() };   /* (the next number is only ever above every one in use; drawing button pictures uses a few) */
  };
};
async function openGame(ctx, query, diff) {
  const p = await ctx.newPage(); await env.use3d(p, { drawMs: 999999 }); p.setDefaultTimeout(240000);
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await p.addInitScript(d => { window.__raf = []; window.requestAnimationFrame = f => { window.__raf.push(f); return 1; }; if (d) try { localStorage.setItem('sd-diff', d); } catch (e) {} }, diff || null);
  await p.goto(env.GAME_REAL + (query ? '?' + query : '')); await p.waitForTimeout(500);
  const prep = () => p.evaluate(T_HELPERS.toString().replace(/^\(\) => \{/, '').replace(/\}$/, '') + `;window.__now = window.__now || 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } };`);
  await prep();
  return { p, errs, prep };
}
const diffOf = (a, b) => Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map(k => `${k}: ${JSON.stringify(a[k]).slice(0, 160)} -> ${JSON.stringify(b[k]).slice(0, 160)}`);
async function main() {
  const b = await chromium.launch(env.LAUNCH), fails = [], errsAll = [];
  const need = (ok, what) => { if (!ok) fails.push(what); console.log(ok ? '  ok  ' : '  FAIL', what); };
  const CASES = [
    { fac: 'cyyoung', diff: 'easy', rivals: 1, stage: 1, mins: 3 },
    { fac: 'ticanologue', diff: 'medium', rivals: 2, stage: 3, mins: 6, extras: true, file: true },
    { fac: 'hekaranok', diff: 'hard', rivals: 3, stage: 4, mins: 5 },
    { fac: 'psychana', diff: 'medium', rivals: 4, stage: 5, mins: 5 }
  ];
  for (const C of CASES) {
    console.log(`== ${C.fac}, ${C.diff}, ${C.rivals} rival(s), stage ${C.stage}`);
    const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
    let { p, errs } = await openGame(ctx, 'rivals=' + C.rivals, C.diff);
    await p.click(`.fac[data-fac="${C.fac}"]`); await p.click(`.fac[data-fac="${C.fac}"] .fgo`);
    await p.evaluate(C => {
      window.__step(3); document.getElementById('banner').style.display = 'none';
      SD.res.wood = 4000; SD.res.stone = 3000; SD.res.gold = 3000; SD.res.iron = 500; T.stage(C.stage);
      for (const k of ['house', 'house', 'farm', 'woodhut', 'granary', 'quarry', 'tavern', 'alehouse', 'wheatfarm', 'market', 'school', 'stable', 'chapel']) T.put(k);
      T.people(4, 'spear'); T.people(3, 'archer');
      T.run(C.mins * 60);
      if (C.extras) {   // patrols, rally flags, a moat and spikes, a fire, a damaged building waiting for repair, schooling
        const sp = units.filter(u => u.team === 'player' && u.type === 'spear' && !u.dead).slice(0, 2), k = SD.keep();
        setPatrol(sp, [{ x: k.x + 200, y: k.y + 120 }, { x: k.x + 320, y: k.y + 160 }, { x: k.x + 260, y: k.y + 260 }]);
        rally.army = { x: k.x + 150, y: k.y + 220 }; rally.town = { x: k.x - 90, y: k.y + 160 };
        T.put('moat', { c: k.c + 9, r: k.r - 6 }); T.put('pit', { c: k.c - 6, r: k.r + 9 });
        const h = structures.find(b => b.team === 'player' && b.kind === 'house' && !b.dead); if (h) { h.fire = 0.4; }
        const g = structures.find(b => b.team === 'player' && b.kind === 'granary' && !b.dead); if (g) g.hp = Math.round(g.maxHp * 0.5);
        soldierLvl = 2; schoolLvl = 1;
        T.run(20);
      }
    }, C);
    const fp1 = await p.evaluate(() => window.__fp());
    // save from Settings, with a name
    const name = `Check ${C.fac} ${C.stage}`;
    await p.click('#btnMenu'); await p.fill('#saveName', name); await p.click('#btnSaveNow');
    await p.waitForFunction(() => /Saved/.test(document.getElementById('saveNote').textContent) || document.getElementById('saveNote').classList.contains('bad'), null, { timeout: 60000, polling: 250 });
    const sv = await p.evaluate(() => ({ note: document.getElementById('saveNote').textContent, ms: SAVE.lastMs, kb: SAVE.lastKB, where: SaveStore.where(), rows: [...document.querySelectorAll('.saveRow b')].map(x => x.textContent) }));
    need(/Saved/.test(sv.note) && sv.rows.includes(name), `saved "${name}" and it is in the list (${sv.ms} ms, ${sv.kb} KB, in ${sv.where})`);
    await p.screenshot({ path: env.SP + `/tSave-${C.fac}-list.png` });
    errsAll.push(...errs); await p.close();
    // open the game again, and load from the front page
    ({ p, errs } = await openGame(ctx, '', C.diff));
    await p.click('#btnLoadFront'); await p.waitForSelector('.saveRow');
    const listShown = await p.evaluate(() => [...document.querySelectorAll('.saveRow')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
    need(listShown.some(t => t.includes(name) && /\d{4}/.test(t)), 'the list shows the name and the date and time: ' + listShown.find(t => t.includes(name)));
    if (C.stage === 1) await p.screenshot({ path: env.SP + '/tSave-front.png' });
    await Promise.all([p.waitForNavigation(), p.click(`.saveRow:has(b:text-is("${name}")) [data-sv="load"]`)]);
    await p.waitForTimeout(400); await (async () => { const { prep } = { prep: () => p.evaluate(T_HELPERS.toString().replace(/^\(\) => \{/, '').replace(/\}$/, '') + `;window.__now = window.__now || 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } };`) }; await prep(); })();
    await p.waitForFunction(() => started && !document.getElementById('loadCover'), null, { timeout: 120000, polling: 250 });
    const fp2 = await p.evaluate(() => window.__fp());
    const d = diffOf(fp1, fp2); need(!d.length, 'everything is as it was: ' + (d.length ? d.join(' | ') : `${fp1.units && Object.values(fp1.units).reduce((a, b) => a + b, 0)} people, ${Object.values(fp1.bld).reduce((a, b) => a + b, 0)} buildings, ${fp1.rivals.length} rivals, stage ${fp1.stage}`));
    const miss = await p.evaluate(() => SAVE.treesMissing); need(miss === 0, 'the land came out the same (trees the save knew that the new land lacked: ' + miss + ')');
    // and the game carries on
    const on = await p.evaluate(() => { const t0 = time, p0 = units.reduce((a, u) => a + u.x + u.y, 0); T.run(60); return { moved: +(time - t0).toFixed(1), shifted: Math.round(Math.abs(units.reduce((a, u) => a + u.x + u.y, 0) - p0)), stage: stageN }; });
    need(on.moved > 55 && on.shifted > 0, `the loaded game runs on (time +${on.moved} s, people moving)`);
    await p.evaluate(() => { window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; }); await p.screenshot({ path: env.SP + `/tSave-${C.fac}-loaded.png` });
    if (C.file) {   // export to a file, delete the save, import the file, load it
      await p.click('#btnMenu'); await p.waitForSelector('.saveRow');
      const [dl] = await Promise.all([p.waitForEvent('download'), p.click(`.saveRow:has(b:text-is("${name}")) [data-sv="export"]`)]);
      const file = path.join(env.SP, 'tSave-export.json'); await dl.saveAs(file);
      const fj = JSON.parse(fs.readFileSync(file, 'utf8')); need(fj.format === 'stronghold-destroyer-save' && /^Stronghold-.*\.json$/.test(dl.suggestedFilename()), 'exported as a file: ' + dl.suggestedFilename() + ` (${Math.round(fs.statSync(file).size / 1024)} KB)`);
      const row = `.saveRow:has(b:text-is("${name}")) [data-sv="del"]`;
      await p.click(row); const armed = await p.textContent(row); await p.click(row); await p.waitForTimeout(300);
      const gone = await p.evaluate(n => ![...document.querySelectorAll('.saveRow b')].some(b => b.textContent === n), name);
      need(armed === 'Tap again' && gone, 'Delete asks for a second tap, then the save is gone');
      await p.setInputFiles('#saveFile', file); await p.waitForFunction(() => /Imported/.test(document.getElementById('saveNote').textContent), null, { timeout: 30000, polling: 250 });
      const imp = name + ' (imported)'; need(await p.evaluate(n => [...document.querySelectorAll('.saveRow b')].some(b => b.textContent === n), imp), 'the file is imported into the list as "' + imp + '"');
      const fpNow = await p.evaluate(() => window.__fp());
      await p.click(`.saveRow:has(b:text-is("${imp}")) [data-sv="load"]`); const arm2 = await p.textContent('#saveNote');
      need(/Tap again/.test(arm2), 'loading over a game in progress asks first: ' + arm2);
      await Promise.all([p.waitForNavigation(), p.click(`.saveRow:has(b:text-is("${imp}")) [data-sv="load"]`)]);
      await p.waitForTimeout(400); await p.evaluate(T_HELPERS.toString().replace(/^\(\) => \{/, '').replace(/\}$/, '') + `;window.__now = window.__now || 0; window.__step = n => { for (let i = 0; i < n; i++) { window.__now += 50; const fs = window.__raf.splice(0); for (const f of fs) f(window.__now); } };`);
      await p.waitForFunction(() => started && !document.getElementById('loadCover'), null, { timeout: 120000, polling: 250 });
      const fp3 = await p.evaluate(() => window.__fp()), d3 = diffOf(fp1, fp3);
      need(!d3.length, 'the imported file loads the same game: ' + (d3.join(' | ') || 'identical'));
      // the autosave slot
      await p.evaluate(() => { SAVE.autoAt = time - SAVE.autoEvery - 1; }); await p.waitForFunction(() => SaveStore.list().then(l => l.some(m => m.id === 'autosave')), null, { timeout: 20000, polling: 1000 }).catch(() => {});
      const auto = await p.evaluate(() => SaveStore.list().then(l => l.find(m => m.id === 'autosave')));
      need(auto && auto.name === 'Autosave', 'the autosave slot fills by itself every few game-minutes');
      await p.evaluate(() => UI.closePops());
      void fpNow;
    }
    errsAll.push(...errs); need(!errs.length, 'no errors: ' + JSON.stringify(errs.slice(0, 3)));
    await ctx.close();
  }
  console.log('fails', JSON.stringify(fails)); console.log('errors', JSON.stringify(errsAll.slice(0, 5)));
  await b.close(); process.exit(fails.length || errsAll.length ? 1 : 0);
}
main();
