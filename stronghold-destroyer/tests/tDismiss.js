// Phase 4E: boxes that are in the way go away. One tap (or click) on a hint, a banner, an alert or the Art of War advice
// puts it away (a new tip comes back later). A double tap (or double click) on any box, away from its buttons, closes it:
// the mood box, the trophy, Settings and Help. One tap on a box does not close it, and its buttons still work.
const { start } = require('./lib4b'); const { devices } = require('playwright');
async function main() {
  for (const [name, dev] of [['computer', null], ['iPhone 13', devices['iPhone 13']], ['iPad (gen 7)', devices['iPad (gen 7)']]]) {
    const { p, need, done } = await start('cyyoung', dev ? { start: 0, viewport: dev.viewport, page: { ...dev } } : { start: 0 });
    p.setDefaultTimeout(20000);   /* (a click that cannot happen fails here instead of waiting) */
    const touch = !!dev, one = async sel => { if (touch) await p.tap(sel); else await p.click(sel); await p.waitForTimeout(450); };
    const two = async sel => { if (touch) { await p.tap(sel); await p.waitForTimeout(90); await p.tap(sel); } else await p.dblclick(sel); await p.waitForTimeout(120); };
    const shown = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return false; const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; }, sel);
    // ---- the Art of War advice ----
    await p.evaluate(() => { ADVISOR.at = -999; ADVISOR.shown = ''; T.run(1); });
    need(await shown('#tips.adv'), `${name}: the Art of War advice is showing`);
    await one('#tips'); need(!(await shown('#tips')), `${name}: one tap puts the Art of War advice away`);
    await p.evaluate(() => { ADVISOR.shown = 'A new tip for the test'; document.getElementById('tips').innerHTML = '<div class="advTitle">The Art of War</div><div class="advTip">A new tip for the test</div>'; });
    await p.waitForTimeout(700); need(await shown('#tips'), `${name}: the next piece of advice comes back`);
    // ---- a banner (a hint or an instruction) ----
    await p.evaluate(() => { document.getElementById('banner').style.display = '';   /* (the test setup hides banners for clean screenshots) */ showBanner('A hint for the test: tap me', 30); }); await p.waitForTimeout(50);
    need(await shown('#banner'), `${name}: the hint is showing`);
    await one('#banner'); need(await p.evaluate(() => { const b = document.getElementById('banner'); return !b.classList.contains('shown') && b.style.opacity === '0'; }), `${name}: one tap puts the hint away (it fades out)`);
    // ---- an alert ----
    await p.evaluate(() => { const a = document.getElementById('alertBar'); a.hidden = false; a.textContent = 'An alert for the test'; });
    await one('#alertBar'); need(!(await shown('#alertBar')), `${name}: one tap puts the alert away`);
    // ---- the mood box: one tap keeps it, two close it ----
    await p.evaluate(() => { UI.closePops(); document.getElementById('cMood').click(); }); await p.waitForTimeout(100);
    need(await shown('#moodPop'), `${name}: the mood box is open`);
    const textOf = async id => { const h = await p.evaluate(i => { const e = document.getElementById(i), t = [...e.querySelectorAll('*')].find(x => x.children.length === 0 && x.textContent.trim().length > 8 && !x.closest('button')); if (!t) return null; t.id = t.id || 't4e-' + i; return '#' + t.id; }, id); return h || '#' + id; };
    const mt = await textOf('moodPop');
    await one(mt); need(await shown('#moodPop'), `${name}: one tap on the mood box does not close it`);
    await two(mt); need(!(await shown('#moodPop')), `${name}: a double tap on the mood box closes it`);
    // ---- the trophy: buttons still work, a double tap closes it, and the game runs again ----
    await p.evaluate(() => { UI.closePops(); }); await one('#btnTrophy'); need(await shown('#trophyPop'), `${name}: the trophy is open`);
    await two('#trophyPop h3'); need(!(await shown('#trophyPop')), `${name}: a double tap on the trophy closes it`);
    await p.waitForTimeout(400); const ran = await p.evaluate(() => { const t0 = time; T.run(2); return +(time - t0).toFixed(1); }); need(ran > 1, `${name}: the game runs again after (${ran} s)`);
    await one('#btnTrophy'); await one('#trophyPop [data-close]'); need(!(await shown('#trophyPop')), `${name}: the trophy's X still closes it`);
    // ---- Settings ----
    await one('#btnMenu'); need(await shown('#menuPop'), `${name}: Settings is open`);
    const st = await textOf('menuPop'); await two(st); need(!(await shown('#menuPop')), `${name}: a double tap on Settings (away from its buttons) closes it`);
    // ---- Help ----
    await p.evaluate(() => { UI.closePops(); HELPUI.openArticle('quarry'); }); await p.waitForTimeout(150);
    need(await p.evaluate(() => !document.getElementById('help').classList.contains('hide')), `${name}: Help is open`);
    await one('.hlpArt > p'); need(await p.evaluate(() => !document.getElementById('help').classList.contains('hide')), `${name}: one tap on Help's text does not close it`);
    await two('.hlpArt > p'); need(await p.evaluate(() => document.getElementById('help').classList.contains('hide')), `${name}: a double tap on Help's text closes it`);
    await done();
  }
}
main();
