// Phase 4D step D1: the trophy button sits just below Settings and is always there during a game. Tapping it opens a
// panel with what the next stage still needs (have / need / tick for people, happiness, food, stone, iron and buildings)
// and one plain sentence on what to do next. The panel pauses the game, never opens by itself, says so at the final
// stage, uses large high-contrast text, and fits on a phone and an iPad.
const { start } = require('./lib4b'); const { devices } = require('playwright');
const lum = c => { const m = c.match(/[\d.]+/g).map(Number), f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
async function look(p) {
  return p.evaluate(() => {
    const box = e => { if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && !e.hidden && r.width > 0 ? { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) } : null; };
    const pop = document.getElementById('trophyPop'), cell = pop.querySelector('.ttab td'), bg = (() => { let e = cell || pop; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; e = e.parentElement; } return 'rgb(0,0,0)'; })();
    return { btn: box(document.getElementById('btnTrophy')), gear: box(document.getElementById('btnMenu')), pop: box(pop), vw: innerWidth, vh: innerHeight,
      overflowX: pop.scrollWidth > pop.clientWidth + 1, cellFont: cell ? parseFloat(getComputedStyle(cell).fontSize) : 0, headFont: pop.querySelector('h3') ? parseFloat(getComputedStyle(pop.querySelector('h3')).fontSize) : 0,
      color: cell ? getComputedStyle(cell).color : '', bg, x: box(pop.querySelector('[data-close]')) };
  });
}
async function main() {
  // ---------- on a computer ----------
  { const { p, need, done, SP } = await start('cyyoung', { start: 0 });
    const L0 = await look(p);
    need(L0.btn && L0.gear, 'the trophy button and the Settings button are both on screen');
    if (L0.btn && L0.gear) { need(L0.btn.t >= L0.gear.b - 2 && L0.btn.t - L0.gear.b < 60, `the trophy sits just below Settings (gear bottom ${L0.gear.b}, trophy top ${L0.btn.t})`);
      need(L0.btn.l < L0.gear.r && L0.btn.r > L0.gear.l, `the trophy lines up under Settings (gear ${L0.gear.l}-${L0.gear.r}, trophy ${L0.btn.l}-${L0.btn.r})`);
      need(L0.btn.w >= 44 && L0.btn.h >= 44, 'the trophy button is at least 44 points'); }
    need(!L0.pop, 'the panel is closed at the start');
    // it never opens by itself, not even when the castle grows
    await p.evaluate(() => { T.run(60); T.stage(2); T.run(30); });
    need(!(await look(p)).pop, 'the panel does not open by itself when the castle grows');
    // opened: the rows are the game's own requirement list, with ticks where met
    await p.evaluate(() => { SD.res.food = 0; SD.res.stone = 9999; T.put('quarry'); T.run(1); });
    await p.click('#btnTrophy'); await p.waitForTimeout(100);
    const o = await p.evaluate(() => { const rows = needRows(stageN + 1, playerHave()), tr = [...document.querySelectorAll('#trophyPop .ttab tbody tr')];
      return { rows: rows.map(r => [r.what, String(r.have), String(r.need), r.ok]), shown: tr.map(t => { const td = t.querySelectorAll('td'); return [td[0].textContent, td[1].textContent, td[2].textContent, /✔/.test(td[3].textContent)]; }),
        head: document.querySelector('#trophyPop h3').textContent, next: (document.querySelector('#trophyPop .tdo') || {}).textContent || '', t0: time }; });
    need(JSON.stringify(o.rows) === JSON.stringify(o.shown), 'the table shows exactly what the next stage needs: ' + JSON.stringify(o.shown));
    need(o.shown.some(r => r[0] === 'Stone in store' || /Stone/.test(r[0])) && o.shown.find(r => /Stone/.test(r[0]))[3] === true, 'stone that is met has a tick');
    need(o.shown.find(r => /Food/.test(r[0])) && o.shown.find(r => /Food/.test(r[0]))[3] === false, 'food that is short has a cross');
    need(/STAGE 2 OF 5/.test(o.head), 'the title names the stage: ' + o.head);
    need(/^Next:\s+\S/.test(o.next) && o.next.split(/[.!?]\s/).length <= 3, 'one plain sentence on what to do next: ' + o.next);
    const Lo = await look(p); need(Lo.cellFont >= 18 && Lo.headFont >= 20, `large text (table ${Lo.cellFont}px, title ${Lo.headFont}px)`);
    need(Lo.color && contrast(Lo.color, Lo.bg) >= 7, `high contrast (${Lo.color} on ${Lo.bg}: ${Lo.color ? contrast(Lo.color, Lo.bg).toFixed(1) : '?'} to 1)`);
    // it pauses the game
    const paused = await p.evaluate(() => { T.run(0.5); const t0 = time; T.run(10);   /* (the game checks for open panels four times a second) */ return { moved: +(time - t0).toFixed(2), note: !document.getElementById('menuNote').hidden }; });
    need(paused.moved === 0, 'the game is paused while the panel is open (time moved ' + paused.moved + ' s)');
    await p.screenshot({ path: SP + '/tTrophy-desktop.png' });
    // the big X closes it and the game runs again; Escape closes it too
    await p.click('#trophyPop [data-close]'); await p.waitForTimeout(50);
    const run = await p.evaluate(() => { const t0 = time; T.run(5); return { open: !document.getElementById('trophyPop').hidden, moved: +(time - t0).toFixed(1) }; });
    need(!run.open && run.moved > 3, 'the X closes it and the game runs again (moved ' + run.moved + ' s)');
    await p.click('#btnTrophy'); await p.keyboard.press('Escape'); need(!(await look(p)).pop, 'Escape closes it');
    // tapping the trophy again closes it
    await p.click('#btnTrophy'); await p.click('#btnTrophy'); need(!(await look(p)).pop, 'tapping the trophy again closes it');
    // opening another panel closes it
    await p.click('#btnTrophy'); await p.click('#btnMenu'); need(!(await look(p)).pop, 'opening Settings closes the trophy panel');
    await p.evaluate(() => UI.closePops());
    // (4D sweep) a death lowers happiness by 3 at once: the reasons list and the trophy's advice name it, for two minutes
    const mourn = await p.evaluate(() => { const k = playerKeep(), u = makeUnit('player', 'spear', k.x, k.y + 90); T.run(0.2); const m0 = mood; kill(u); T.run(0.2);
      const adv = trophyAdvice([{ key: 'mood', what: 'Happiness', have: 10, need: 40, ok: false }]), now = moodReasons().includes('they mourn the people who died');
      T.run(125); return { drop: +(m0 - mood).toFixed(1), now, adv, later: moodReasons().includes('they mourn the people who died') }; });
    need(mourn.now && /mourn/.test(mourn.adv), 'after one of your people dies, the reasons and the trophy advice say they mourn: ' + mourn.adv);
    need(!mourn.later, 'two minutes later the mourning is gone from the reasons');
    // the final stage
    await p.evaluate(() => T.stage(5)); await p.click('#btnTrophy');
    const fin = await p.evaluate(() => ({ txt: document.getElementById('trophyPop').textContent, rows: document.querySelectorAll('#trophyPop .ttab tr').length }));
    need(/final stage/i.test(fin.txt) && /STAGE 5 OF 5/.test(fin.txt) && fin.rows === 0, 'at the last stage it says the final stage is reached: ' + fin.txt.slice(0, 120));
    await p.screenshot({ path: SP + '/tTrophy-final.png' });
    console.log('desktop', JSON.stringify({ btn: L0.btn, gear: L0.gear, cell: Lo.cellFont, head: Lo.headFont, contrast: contrast(Lo.color, Lo.bg).toFixed(1), next: o.next }));
    await done(); }
  // ---------- on a phone and an iPad (touch) ----------
  for (const devName of ['iPhone 13', 'iPhone 13 landscape', 'iPad (gen 7)', 'iPad (gen 7) landscape']) {
    const dev = devices[devName], { p, need, done, SP } = await start('cyyoung', { start: 0, viewport: dev.viewport, page: { ...dev } });
    await p.evaluate(() => { window.__step(4); updateHud(); });
    const L = await look(p); need(L.btn && L.btn.w >= 44 && L.btn.h >= 44, devName + ': the trophy button is there and at least 44 points');
    if (L.btn && L.gear) need(L.btn.t >= L.gear.b - 2 && L.btn.l < L.gear.r && L.btn.r > L.gear.l, `${devName}: just below Settings (gear ${JSON.stringify(L.gear)}, trophy ${JSON.stringify(L.btn)})`);
    await p.tap('#btnTrophy'); await p.waitForTimeout(150);
    const Lo = await look(p);
    need(Lo.pop && Lo.pop.l >= 0 && Lo.pop.r <= Lo.vw && Lo.pop.t >= 0 && Lo.pop.b <= Lo.vh, `${devName}: the panel fits on the screen ${JSON.stringify(Lo.pop)} in ${Lo.vw}x${Lo.vh}`);
    need(!Lo.overflowX, devName + ': nothing spills sideways');
    need(Lo.cellFont >= 17, `${devName}: large text (${Lo.cellFont}px)`);
    need(Lo.x && Lo.x.w >= 44 && Lo.x.h >= 44, devName + ': the X is at least 44 points');
    const paused = await p.evaluate(() => { T.run(0.5); const t0 = time; T.run(5); return +(time - t0).toFixed(2); }); need(paused === 0, devName + ': paused while open');
    await p.screenshot({ path: SP + `/tTrophy-${devName.replace(/\W+/g, '-')}.png` });
    await p.tap('#trophyPop [data-close]'); await p.waitForTimeout(100); need(!(await look(p)).pop, devName + ': tapping the X closes it');
    console.log(devName, JSON.stringify({ btn: L.btn, pop: Lo.pop, cell: Lo.cellFont }));
    await done();
  }
}
main();
