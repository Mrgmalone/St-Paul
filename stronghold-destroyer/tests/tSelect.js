// Gerald's selection rules (real game): no Fix button floating over people; one click or tap on a person selects them and shows
// who they are and what they are doing; a click or tap on the ground (or a target) sends them and lets them go at once; a
// double click or double tap opens their box. Checked with a mouse and with a finger.
const { start } = require('./lib4b');
(async () => {
  for (const mode of ['mouse', 'touch']) {
    const { p, b, need, fails, errs, SP } = await start('cyyoung', mode === 'touch' ? { viewport: { width: 1024, height: 768 }, page: { hasTouch: true, isMobile: true, deviceScaleFactor: 1 } } : {});
    // a person standing alone where a tap lands on him
    const at = await p.evaluate(() => { const k = SD.keep(), u = units.find(v => v.team === 'player' && v.type === 'civ' && !v.dead); paused = true;
      let q = null; for (let i = 0; i < 40; i++) { const f = nearestFree(k.c + 1 + (i % 8) * 2 - 6, k.r + 7 + Math.floor(i / 8) * 2); if (!f) continue; u.x = f.c * TILE + 16; u.y = f.r * TILE + 16; u.path = []; u.order = 'idle';
        SD.cam.z = 1.2; SD.centerOn(u.x, u.y); window.__drawMs = 0; window.__step(2); window.__drawMs = 999999; q = screenOf(u.x, u.y, 20 + elev3D(u)); if (pickScreen(q.x, q.y) === u) break; }
      window.__who = u; const cr = document.getElementById('game').getBoundingClientRect(), g = screenOf(u.x + 120, u.y + 40, 0);
      return { x: q.x + cr.left, y: q.y + cr.top, gx: g.x + cr.left, gy: g.y + cr.top }; });
    const tap = async (x, y) => { if (mode === 'touch') await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };
    await tap(at.x, at.y); await p.waitForTimeout(450); await p.evaluate(() => { window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; });
    const one = await p.evaluate(() => ({ sel: selection.has(window.__who), label: document.querySelector('#tapIcon b').textContent, fixShown: !document.getElementById('btnFix').hidden, card: !document.getElementById('personPop').hidden }));
    await tap(at.gx, at.gy); await p.waitForTimeout(450);
    const sent = await p.evaluate(() => ({ order: window.__who.order, dest: !!window.__who.dest, selected: selection.size }));
    // a second tap on the ground does nothing to him now
    await p.evaluate(() => { window.__who.order = 'idle'; window.__who.path = []; }); await tap(at.gx + 60, at.gy); await p.waitForTimeout(450);
    const after = await p.evaluate(() => ({ order: window.__who.order }));
    // double click / double tap opens his box
    await p.evaluate(() => { const u = window.__who, k = SD.keep(); window.__drawMs = 0; window.__step(1); window.__drawMs = 999999; });
    if (mode === 'touch') { await p.touchscreen.tap(at.x, at.y); await p.waitForTimeout(120); await p.touchscreen.tap(at.x, at.y); } else await p.mouse.dblclick(at.x, at.y);
    await p.waitForTimeout(450);
    const dbl = await p.evaluate(() => ({ card: !document.getElementById('personPop').hidden, who: cardOf === window.__who }));
    console.log(mode, JSON.stringify({ one, sent, after, dbl }));
    need(one.sel && /·/.test(one.label) && !one.fixShown && !one.card, `${mode}: one click selects and shows who and what, no Fix button`);
    need(sent.order === 'move' && sent.dest && sent.selected === 0, `${mode}: a click on the ground sends him and lets him go`);
    need(after.order === 'idle', `${mode}: the next click on the ground does not move him again`);
    need(dbl.card && dbl.who, `${mode}: a double click opens his box`);
    await p.screenshot({ path: SP + `/select-${mode}.png` });
    console.log('fails', JSON.stringify(fails)); console.log('errors', errs.slice(0, 3)); await b.close();
    if (fails.length || errs.length) process.exit(1);
  }
})();
