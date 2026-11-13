// Phase 4C step C6: phones get the five categories in a bar along the bottom; a category opens upward as a sheet of
// picture buttons and folds away by itself once a choice needs the map (so the building can be dragged into place);
// a gear (Settings) replaces Menu, a ? opens Help, Quit is inside Settings; taxes have down and up arrows; the advisor's
// hints are compact and always on. Tablets keep the side panel.
const { start } = require('./lib4b'); const { devices } = require('playwright');
async function phone(devName, land) {
  const dev = devices[devName], { p, need, done, SP } = await start('cyyoung', { start: 0, viewport: dev.viewport, page: { ...dev } });
  const cdp = await p.context().newCDPSession(p);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 ? { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height) } : null; }, sel);
  await p.evaluate(() => { ADVISOR.at = -99; window.__step(4); updateHud(); });
  const s0 = { bar: await vis('#catBar'), side: await vis('#side'), show: await vis('#btnShow'), phone: await p.evaluate(() => document.body.classList.contains('phone')) };
  // a category opens upward, just above the bar
  await p.tap('#catBar [data-cat="town"]'); await p.waitForTimeout(350);
  const s1 = { side: await vis('#side'), bar: await vis('#catBar'), panes: await p.evaluate(() => [...document.querySelectorAll('.pane')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.dataset.pane)), tabsShown: await p.evaluate(() => [...document.querySelectorAll('.tab[data-tab]')].filter(t => getComputedStyle(t).display !== 'none').length), on: await p.evaluate(() => (document.querySelector('#catBar .on') || {}).dataset) };
  // choosing a building folds the sheet away; a finger then drags the house into place
  await p.evaluate(() => { SD.res.wood = 5000; window.__step(2); updateHud(); });
  await p.tap('#side .bb[data-b="house"]'); await p.waitForTimeout(100);
  const s2 = { placing: await p.evaluate(() => placing && placing.kind), side: await vis('#side') };
  const tgt = await p.evaluate(() => { const k = SD.keep(), cr = document.getElementById('game').getBoundingClientRect(); for (let rad = 4; rad < 14; rad++) { const f = nearestFree(k.c + rad, k.r + 5); if (f && canPlace('house', f.c, f.r)) { SD.centerOn(f.c * TILE + 32, f.r * TILE + 32); window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; const s = screenOf(f.c * TILE + 32, f.r * TILE + 32, 0), x = s.x + cr.left, y = s.y + cr.top, onMap = (a, b) => document.elementFromPoint(a, b) === document.getElementById('game'); if (onMap(x, y) && onMap(x + 40, y - 30)) return { x, y, h0: structures.filter(b => b.kind === 'house').length }; } }   /* (the finger must land on open map, not on a bar) */ return null; });
  await touch('touchStart', tgt.x + 40, tgt.y - 30); await touch('touchMove', tgt.x + 20, tgt.y - 15); await touch('touchMove', tgt.x, tgt.y); await touch('touchEnd');
  const s3 = await p.evaluate(h0 => ({ houses: structures.filter(b => b.kind === 'house').length - h0, placing: !!placing }), tgt.h0);
  // the same category tapped again folds it
  await p.waitForTimeout(450);   /* (a person's next tap comes a moment after the finger lifts; a tap at once after a quick drag only stops the browser's fling) */
  await p.tap('#catBar [data-cat="army"]'); await p.waitForTimeout(300); const a1 = await vis('#side'); await p.tap('#catBar [data-cat="army"]'); await p.waitForTimeout(100); const a2 = await vis('#side');
  // Settings, Help and Quit
  const gear = await p.evaluate(() => { const b = document.getElementById('btnMenu'); return { svg: !!b.querySelector('svg'), label: b.getAttribute('aria-label'), menuWord: /Menu/.test(b.textContent) }; });
  await p.tap('#catBar [data-cat="town"]'); await p.waitForTimeout(300);
  await p.tap('#btnMenu'); await p.waitForTimeout(150);
  const st = await p.evaluate(() => { const m = document.getElementById('menuPop'), q = document.getElementById('btnQuit'); return { open: !m.hidden, title: m.querySelector('h3').textContent, quitInside: !!q && m.contains(q), sheetClosed: document.getElementById('side').classList.contains('collapsed') }; });
  await p.screenshot({ path: SP + `/tPhone-${land ? 'land' : 'port'}-settings.png` });
  await p.evaluate(() => { window.__quit = 0; window.SD_QUIT = () => { window.__quit++; }; });
  await p.tap('#btnQuit'); const q1 = await p.evaluate(() => ({ n: window.__quit, txt: document.getElementById('btnQuit').textContent })); await p.tap('#btnQuit'); const q2 = await p.evaluate(() => window.__quit);
  await p.evaluate(() => UI.closePops());
  await p.tap('#btnHelpTop'); const help = await p.evaluate(() => !document.getElementById('help').classList.contains('hide')); await p.evaluate(() => toggleHelp());
  // taxes down and up
  const t0 = await p.evaluate(() => tax); await p.tap('#taxUp'); const t1 = await p.evaluate(() => tax); await p.tap('#taxDown'); await p.tap('#taxDown'); const t2 = await p.evaluate(() => ({ tax, label: document.getElementById('vTax').textContent, downOff: document.getElementById('taxDown').disabled }));
  // hints: compact, always on (no switch anywhere to turn them off)
  const hint = await p.evaluate(() => { const t = document.getElementById('tips'), r = t.getBoundingClientRect(); return { text: t.textContent.trim().length, h: Math.round(r.height), offSwitch: [...document.querySelectorAll('button')].some(b => /(tips|hints|advisor|art of war)/i.test(b.textContent) && /off/i.test(b.textContent)) }; });
  const cmd = await p.evaluate(() => { selection.clear(); updateHud(); const r = document.getElementById('cmdbar').getBoundingClientRect(); return { h: Math.round(r.height), none: document.getElementById('cmdbar').classList.contains('none') }; });
  await p.evaluate(() => { PHONE.openSheet('castle'); }); await p.waitForTimeout(350);
  await p.evaluate(() => { window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; }); await p.screenshot({ path: SP + `/tPhone-${land ? 'land' : 'port'}-sheet.png` });
  const fit = { side: await vis('#side'), bar: await vis('#catBar'), vh: await p.evaluate(() => innerHeight) };
  console.log(devName, JSON.stringify({ s0, s1, s2, s3, a1: !!a1, a2: !!a2, gear, st, q1, q2, help, t0, t1, t2, hint, cmd, fit }));
  need(s0.phone && s0.bar && !s0.side && !s0.show, 'phone: the category bar is along the bottom and the panel starts folded away');
  need(s1.side && s1.side.bottom <= s1.bar.top + 2 && s1.panes.join() === 'town' && s1.tabsShown === 0 && s1.on && s1.on.cat === 'town', 'phone: a category opens upward just above the bar, showing only its own buttons');
  need(s2.placing === 'house' && !s2.side, 'phone: choosing a building folds the panel away at once');
  need(s3.houses === 1 && !s3.placing, 'phone: then a finger drags the house into place');
  need(a1 && !a2, 'phone: tapping the open category again folds it');
  need(gear.svg && gear.label === 'Settings' && !gear.menuWord, 'a gear for Settings in place of "Menu"');
  need(st.open && st.title === 'SETTINGS' && st.quitInside && st.sheetClosed, 'Settings opens (above the sheet, which folds) and holds Quit');
  need(q1.n === 0 && /again/.test(q1.txt) && q2 === 1, 'Quit asks for a second tap, then quits');
  need(help, 'the ? opens Help');
  need(t1 === Math.min(2, t0 + 1) && t2.tax === Math.max(0, t1 - 2) && /Tax/.test(t2.label) && t2.downOff === (t2.tax === 0), 'taxes go down and up with the arrows');
  need(hint.text > 10 && hint.h < 70 && !hint.offSwitch, 'hints: compact, shown, and no switch to turn them off');
  need(cmd.none && cmd.h < 80, 'with nobody chosen the selection bar is one slim row');
  need(fit.side && fit.side.top >= 0 && fit.side.bottom <= fit.bar.top + 2 && fit.bar.bottom <= fit.vh + 1, 'the open sheet fits between the top and the bar');
  await done();
}
async function tablet() {
  const dev = devices['iPad (gen 7) landscape'], { p, need, done } = await start('cyyoung', { start: 0, viewport: dev.viewport, page: { ...dev } });
  const r = await p.evaluate(() => { updateHud(); const s = document.getElementById('side'), r = s.getBoundingClientRect(); return { phone: document.body.classList.contains('phone'), bar: getComputedStyle(document.getElementById('catBar')).display, sideW: Math.round(r.width), sideRight: Math.round(r.right), vw: innerWidth, tabs: [...document.querySelectorAll('.tab[data-tab]')].filter(t => getComputedStyle(t).display !== 'none').length, tax: !!document.getElementById('cTax'), help: !!document.getElementById('btnHelpTop') }; });
  console.log('iPad', JSON.stringify(r));
  need(!r.phone && r.bar === 'none' && r.sideW > 200 && r.sideRight >= r.vw - 2 && r.tabs === 5, 'tablet: the side panel stays as it was');
  need(r.tax && r.help, 'tablet: tax arrows and the ? are there too');
  await done();
}
(async () => { await phone("iPhone 13", false); if (process.env.ONE) return; await phone("iPhone 13 landscape", true); await tablet(); })();
