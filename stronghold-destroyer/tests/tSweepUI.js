// Phase 4D step D4 (bug sweep): every button and panel, on a computer, an iPad and a phone.
// For each screen it opens every list of the side panel and taps each picture button, opens every building's box and
// taps each of its buttons, opens Settings, Help, the trophy, People, mood, goods and rivals; after each tap it checks
// for errors, that any open panel fits on the screen, and that the page never scrolls sideways. A button that changes
// nothing at all (no panel, no message, no choice made, nothing in the game) is listed as possibly dead.
const { start } = require('./lib4b'); const { devices } = require('playwright');
const SIZES = [['computer', { viewport: { width: 1180, height: 820 } }], ['iPad', { dev: 'iPad (gen 7)' }], ['iPad landscape', { dev: 'iPad (gen 7) landscape' }], ['phone', { dev: 'iPhone 13' }], ['phone landscape', { dev: 'iPhone 13 landscape' }]];
(async () => {
  const report = {}; let fails = 0;
  for (const [name, o] of SIZES) {
    const dev = o.dev ? devices[o.dev] : null;
    const { p, need, done, errs } = await start('ticanologue', { start: 0, viewport: dev ? dev.viewport : o.viewport, page: dev ? { ...dev } : {} });
    await p.evaluate(() => { const rb = R3D.rebuildModel; R3D.rebuildModel = o => { window.__rebuilt = (window.__rebuilt || 0) + 1; return rb(o); }; });   /* (the fix-a-glitch button rebuilds a 3D model: count it) */
    await p.evaluate(() => { SD.res.wood = 9000; SD.res.stone = 9000; SD.res.gold = 9000; SD.res.iron = 900; SD.res.food = 900; T.stage(4);
      window.__blds = ['house', 'woodhut', 'farm', 'quarry', 'granary', 'market', 'school', 'stable', 'apothecary', 'alehouse', 'tavern', 'smithy', 'armory', 'bowyer', 'poleturner', 'mill', 'bakery', 'church', 'engineerhut', 'stockpile', 'gtower', 'waterpot'].map(k => T.put(k)).filter(Boolean);
      T.people(6, 'spear'); T.people(4, 'archer'); T.people(20);   /* (free citizens, so Add worker has someone to add) */ T.run(3); window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; });
    const state = () => p.evaluate(() => JSON.stringify({ pops: [...document.querySelectorAll('.pop')].filter(e => !e.hidden && getComputedStyle(e).display !== 'none').map(e => e.id + ':' + e.textContent.length),
      help: !document.getElementById('help').classList.contains('hide'), placing: placing && placing.kind, order: typeof orderMode !== 'undefined' && orderMode, rally: settingRally, tearing, sel: selection.size,
      res: Object.values(SD.res).map(v => Math.round(v)).join(','), n: structures.length + units.length + trainQueue.length, banner: document.getElementById('banner').textContent.slice(0, 40) + document.getElementById('banner').style.opacity,
      label: !document.getElementById('ibLabel').hidden && document.getElementById('ibLabel').textContent, side: document.getElementById('side').className, tab: [...document.querySelectorAll('.tab.active')].map(t => t.dataset.tab).join(),
      jobs: units.map(u => u.job ? u.job.id : 0).join(''), floats: floats.length, box: storeShown ? JSON.stringify(Object.fromEntries(Object.entries(storeShown).filter(([k, v]) => v === null || typeof v !== 'object'))) : '',
      fix: window.__rebuilt || 0, tax, ration, paused, settings: [...document.querySelectorAll('#menuPop button')].map(b => b.textContent).join('|') }));
    const fit = () => p.evaluate(() => { const bad = []; if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('page scrolls sideways ' + document.documentElement.scrollWidth + '>' + innerWidth);
      for (const e of document.querySelectorAll('.pop, #help .box, #trophyPop, #peoplePop')) { if (e.hidden || getComputedStyle(e).display === 'none' || (e.closest('#help') && document.getElementById('help').classList.contains('hide'))) continue; const r = e.getBoundingClientRect(); if (r.width === 0) continue;
        if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) bad.push(`${e.id || e.className} off the screen ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)} in ${innerWidth}x${innerHeight}`);
        if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'auto') bad.push(`${e.id || e.className} spills sideways`); }
      return bad; });
    const tapped = [], dead = [], misfit = new Set(), tap = async (sel, label) => {
      const el = await p.$(sel); if (!el || !(await el.isVisible())) return;
      const before = await state(); const e0 = errs.length;
      try { if (dev) await el.tap({ timeout: 3000 }); else await el.click({ timeout: 3000 }); } catch (e) { tapped.push(label + ' (could not tap: ' + e.message.split('\n')[0].slice(0, 80) + ')'); return; }
      await p.waitForTimeout(60); await p.evaluate(() => { window.__step(2); });
      const after = await state(); tapped.push(label);
      if (after === before && errs.length === e0) dead.push(label);
      for (const b of await fit()) misfit.add(label + ': ' + b);
      if (errs.length > e0) misfit.add(label + ': ERROR ' + errs[errs.length - 1].slice(0, 120));
    };
    const reset = () => p.evaluate(() => { UI.closePops(); if (placing) cancelPlacing(); if (typeof orderMode !== 'undefined' && orderMode && window.cancelOrder) cancelOrder(); settingRally = null; tearing = false; if (!document.getElementById('help').classList.contains('hide')) toggleHelp(); window.__step(2); });
    // the side panel: every list, every picture button
    const cats = await p.evaluate(() => [...document.querySelectorAll(PHONE.onPhone() ? '#catBar button[data-cat]' : '.tab[data-tab]')].map(b => b.dataset.cat || b.dataset.tab));
    for (const c of cats) {
      const open = () => p.evaluate(c => { if (PHONE.onPhone()) PHONE.openSheet(c); else UI.showTab(c); }, c);
      await open(); const btns = await p.evaluate(c => [...document.querySelectorAll(`.pane[data-pane="${c}"] button`)].filter(b => b.offsetParent && !b.disabled).map((b, i) => { b.dataset.sw = c + i; return [c + i, (b.dataset.name || b.textContent || b.title || '').trim().slice(0, 30)]; }), c);
      for (const [id, label] of btns) { await open(); await tap(`[data-sw="${id}"]`, c + ': ' + label); await reset(); }
    }
    // every building's box and its buttons (not tear-down or sleep-all; each box is opened fresh)
    const kinds = await p.evaluate(() => window.__blds.map(b => b.kind));
    for (const k of kinds) {
      const openBox = () => p.evaluate(k => { const b = window.__blds.find(x => x.kind === k); selection.clear();   /* (the same choice a tap on the building makes) */
        if (b.kind === 'market') showMarket(b); else if (STORE_KINDS[b.kind]) showStore(b); else if (GUARD_TOWERS[b.kind]) showTower(b); else showSite(b); window.__step(1); }, k);
      await openBox();
      const btns = await p.evaluate(() => [...document.querySelectorAll('#storePop button')].filter(b => b.offsetParent && !b.disabled && !b.classList.contains('xbtn') && !/tear|demolish|delete/i.test(b.textContent)).map((b, i) => { b.dataset.sw = 'box' + i; return ['box' + i, b.textContent.trim().slice(0, 26)]; }));
      for (const b of await fit()) misfit.add(k + ' box: ' + b);
      for (const [id, label] of btns) { await openBox(); await tap(`#storePop [data-sw="${id}"]`, k + ' box: ' + label); await p.evaluate(() => { if (placing) cancelPlacing(); }); }
      await reset();
    }
    // the top bar and the panels it opens
    for (const [sel, label] of [['#btnMenu', 'Settings'], ['#btnHelpTop', 'Help'], ['#btnTrophy', 'Trophy'], ['#btnPeople', 'People'], ['#cMood', 'Mood'], ['#btnGoods,#cGoods', 'Goods'], ['#btnRivals,#cRivals', 'Rivals'], ['#taxDown', 'Tax down'], ['#taxUp', 'Tax up'], ['#btnPause', 'Pause'], ['#btnPause', 'Pause again']]) { await tap(sel, 'top: ' + label); if (!/Tax|Pause/.test(label)) await reset(); }
    // inside Settings: each switch, twice (back as it was)
    await p.evaluate(() => { document.getElementById('menuPop').hidden = false; });
    const sets = await p.evaluate(() => [...document.querySelectorAll('#menuPop button')].filter(b => b.offsetParent && !/Quit|Load|Delete|Export|Import|Save game/i.test(b.textContent) && !b.classList.contains('xbtn')).map((b, i) => { b.dataset.sw = 'set' + i; return ['set' + i, b.textContent.trim().slice(0, 26)]; }));
    for (const [id, label] of sets) { await tap(`#menuPop [data-sw="${id}"]`, 'Settings: ' + label); await p.evaluate(() => { document.getElementById('menuPop').hidden = false; }); if (!/View/.test(label)) await tap(`#menuPop [data-sw="${id}"]`, 'Settings: ' + label + ' (again)'); else await p.evaluate(() => setView(true)); await p.evaluate(() => { document.getElementById('menuPop').hidden = false; }); }
    await reset();
    report[name] = { tapped: tapped.length, possiblyDead: dead, problems: [...misfit], errors: errs.slice(0, 5) };
    console.log(name, JSON.stringify(report[name]));
    need(!misfit.size, name + ': every panel fits and nothing errs (' + [...misfit].slice(0, 6).join(' | ') + ')');
    await done().catch(() => {}); if (errs.length || misfit.size) fails++;
  }
  console.log('SWEEP', JSON.stringify(Object.fromEntries(Object.entries(report).map(([k, v]) => [k, { tapped: v.tapped, possiblyDead: v.possiblyDead.length, problems: v.problems.length }]))));
  console.log('fails', fails ? '["see above"]' : '[]'); console.log('errors []');
  process.exit(fails ? 1 : 0);
})();
