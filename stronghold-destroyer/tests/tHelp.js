// The Help screen: opens from the ? button and the H key and pauses the game; a big X closes it. Live search finds the
// right article for each sample question (plain words, other words for the same thing, and misspellings); every topic
// card opens; every article has a picture, 3 to 6 lines, a "How do I" (most do) and related links; "What is this?" in
// a building box, a person's box and the panels opens the matching article; nothing spills off an iPad or phone screen.
const { start } = require('./lib4b'); const { devices } = require('playwright');
const QUESTIONS = [
  ['how do I get stone', 'quarry'], ['how do i get more wood', 'wood-yard'], ['how do I get iron', 'iron-mine'], ['my people are unhappy', 'mood'],
  ['how to make people happy', 'mood'], ['no ale', 'ale'], ['how do I save my game', 'saving'], ['load a saved game', 'saving'],
  ['export my save to the ipad', 'export-import'], ['what is the trophy', 'trophy'], ['how do I reach the next stage', 'stages'], ['stage requirements', 'stages'],
  ['how to train archers', ['archer', 'training']], ['knights on horses', 'knight'], ['cavalry', 'knight'], ['mounted knight', 'knight'],
  ['how do I put out a fire', 'fire'], ['repair a damaged building', 'repair'], ['fog of war', 'fog'], ['the map is dark', 'fog'],
  ['how do I win', 'winning'], ['game over', 'winning'], ['raid', 'raids'], ['enemy attack', 'raids'], ['trading friend', 'trading-friend'],
  ['bandits stealing my gold', 'bandits'], ['how to fill a moat', 'moat'], ['spike pit', 'spikes'], ['build a wall', ['placing', 'walls-gates']], ['gate', 'walls-gates'],
  ['taxes', 'taxes'], ['how to get more gold', 'taxes'], ['people starving', 'food'], ['granary bugs', 'granary'], ['scroll speed', 'scroll-zoom'],
  ['zoom in', 'scroll-zoom'], ['keyboard shortcuts', 'keys'], ['pause the game', 'pause'], ['flat view', 'views'], ['cy young', 'faction-cyyoung'],
  ['ticanologue', 'faction-ticanologue'], ['healers', 'faction-hekaranok'], ['invisible berserkers', ['berserker', 'faction-psychana']], ['add worker', 'workers'],
  ['no free civilian', 'workers'], ['people tab', 'people-tab'], ['tap and hold', 'tap-hold'], ['catapult', 'siege'], ['rally point', 'rally-flags'], ['patrol', 'patrol-guard'],
  ['quary', 'quarry'], ['knigt', 'knight'], ['granery', 'granary'], ['hapiness', 'mood'], ['turn off the voice', 'sound-voice'], ['whether', 'weather'],
  ['bread', 'bread'], ['how many rivals', 'match-setup'], ['school', 'school'], ['my soldiers chase enemies', 'patrol-guard'], ['people mourning', 'mood']
];
(async () => {
  const { p, need, done, SP } = await start('cyyoung', { start: 0 });
  // ---- opening, pausing, closing ----
  await p.click('#btnHelpTop'); await p.waitForTimeout(150);
  const o = await p.evaluate(() => { T.run(0.5); const t0 = time; T.run(5); return { open: !document.getElementById('help').classList.contains('hide'), moved: +(time - t0).toFixed(2), cards: document.querySelectorAll('.hlpCard').length, search: !!document.getElementById('hlpQ') }; });
  need(o.open && o.moved === 0, 'the ? button opens Help and the game is paused (time moved ' + o.moved + ')');
  need(o.cards === 14 && o.search, `14 topic cards and a search box (${o.cards})`);
  await p.screenshot({ path: SP + '/tHelp-home.png' });
  await p.click('#help .box > .xbtn'); await p.waitForTimeout(100);
  need(await p.evaluate(() => document.getElementById('help').classList.contains('hide')), 'the big X closes Help');
  await p.keyboard.press('h'); await p.waitForTimeout(100);
  need(await p.evaluate(() => !document.getElementById('help').classList.contains('hide')), 'the H key opens Help');
  // typing in the search box must not close Help (H is a key in the game)
  await p.click('#hlpQ'); await p.keyboard.type('how do I get stone', { delay: 10 }); await p.waitForTimeout(150);
  const live = await p.evaluate(() => ({ open: !document.getElementById('help').classList.contains('hide'), first: (document.querySelector('#hlpBody .hlpRow') || {}).dataset, rows: document.querySelectorAll('#hlpBody .hlpRow').length,
    hasPic: !!document.querySelector('#hlpBody .hlpRow img'), hasSummary: !!document.querySelector('#hlpBody .hlpRow small') }));
  need(live.open && live.first && live.first.art === 'quarry' && live.hasPic && live.hasSummary, 'results appear as you type, each with a title, a one-line summary and a small picture: ' + JSON.stringify(live));
  await p.screenshot({ path: SP + '/tHelp-search.png' });
  // ---- the sample questions ----
  const res = await p.evaluate(Q => Q.map(([q, want]) => { const r = HELPUI.search(q).map(a => a.id), ok = [].concat(want); const rank = r.findIndex(id => ok.includes(id)); return { q, want: ok.join('/'), rank: rank < 0 ? null : rank + 1, top: r.slice(0, 3) }; }), QUESTIONS);
  const missed = res.filter(r => !r.rank || r.rank > 3);
  need(res.length >= 40 && !missed.length, `${res.length} sample questions: the right article is in the top three for all (missed: ${JSON.stringify(missed)})`);
  console.log('SEARCH', JSON.stringify(res.map(r => `${r.q} -> ${r.top[0]}${r.rank === 1 ? '' : ' (#' + r.rank + ')'}`)));
  // ---- no match: say so and suggest nearby topics ----
  const none = await p.evaluate(() => { const q = document.getElementById('hlpQ'); q.value = 'zzqx unicorn'; q.dispatchEvent(new Event('input')); return { text: document.getElementById('hlpBody').textContent.slice(0, 80), rows: document.querySelectorAll('#hlpBody .hlpRow').length }; });
  need(/No article matches/.test(none.text) && none.rows >= 3, 'no match says so and suggests nearby topics: ' + none.text + ' (' + none.rows + ' suggestions)');
  // ---- every category opens, every article reads ----
  const cats = await p.evaluate(() => HELPUI.categories.map(c => { HELPUI.show({ kind: 'cat', id: c.id }); return [c.id, document.querySelectorAll('#hlpBody .hlpRow').length]; }));
  need(cats.every(([, n]) => n >= 1), 'every topic opens with its articles: ' + JSON.stringify(cats));
  const arts = await p.evaluate(() => HELPUI.articles.map(a => { HELPUI.show({ kind: 'art', id: a.id }); const el = document.querySelector('.hlpArt'); return { id: a.id, lines: el.querySelectorAll(':scope > p').length, how: !!el.querySelector('.hlpHow ol li'), pic: !!(el.querySelector('img.hlpBigPic') || {}).src, rel: el.querySelectorAll('.hlpRel .hlpLink').length, game: /^(b|u|r|w):/.test(a.pic) }; }));
  const badArt = arts.filter(a => a.lines < 1 || a.lines > 6 || !a.pic || (!a.rel && a.id !== 'glossary'));
  need(!badArt.length, `every article has a picture, 1 to 6 short lines and related links (${arts.length} articles; ${arts.filter(a => a.how).length} with How do I; problems: ${JSON.stringify(badArt)})`);
  console.log('DRAWN-ICON PICTURES', JSON.stringify(arts.filter(a => !a.game).map(a => a.id)));
  await p.evaluate(() => HELPUI.show({ kind: 'art', id: 'quarry' })); await p.screenshot({ path: SP + '/tHelp-article.png' });
  // ---- related link and back ----
  const nav = await p.evaluate(() => { document.querySelector('.hlpRel .hlpLink').click(); const a = document.querySelector('.hlpArt').dataset.id; document.querySelector('.hlpBack').click(); return [a, (document.querySelector('.hlpArt') || {}).dataset && document.querySelector('.hlpArt').dataset.id]; });
  need(nav[0] && nav[0] !== 'quarry' && nav[1] === 'quarry', 'a related link opens its article and Back returns: ' + JSON.stringify(nav));
  await p.evaluate(() => toggleHelp());
  // ---- "What is this?" ----
  const ctx = await p.evaluate(async () => {
    SD.res.wood = 9000; SD.res.stone = 9000; SD.res.gold = 9000; T.stage(3); const out = {};
    const open = id => { const a = document.querySelector(`#${id} .whatIs`); if (!a) return null; a.click(); const r = (document.querySelector('.hlpArt') || {}).dataset; const got = r && r.id; toggleHelp(); return got; };
    for (const [k, want] of [['granary', 'granary'], ['woodhut', 'wood-yard'], ['market', 'market'], ['church', 'healing'], ['alehouse', 'ale']]) {
      const b = T.put(k); if (!b) { out[k] = 'not placed'; continue; } if (k === 'market') showMarket(b); else if (STORE_KINDS[k]) showStore(b); else showSite(b); await new Promise(r => setTimeout(r, 30)); out[k] = [open('storePop'), want]; T.close(); }
    document.getElementById('moodPop').hidden = false; document.getElementById('moodPop').innerHTML = '<h3>MOOD</h3>'; await new Promise(r => setTimeout(r, 30)); out.mood = [open('moodPop'), 'mood']; document.getElementById('moodPop').hidden = true;
    document.getElementById('menuPop').hidden = false; await new Promise(r => setTimeout(r, 30)); out.settings = [open('menuPop'), 'settings']; document.getElementById('menuPop').hidden = true;
    openTrophy(); await new Promise(r => setTimeout(r, 30)); out.trophy = [open('trophyPop'), 'trophy']; closeTrophy();
    return out; });
  need(Object.values(ctx).every(v => Array.isArray(v) && v[0] === v[1]), '"What is this?" opens the matching article from building boxes and panels: ' + JSON.stringify(ctx));
  const person = await p.evaluate(async () => { const u = T.people(1, 'archer')[0]; T.run(1); if (typeof showCard === 'function') showCard(u); else { cardOf = u; const pp = document.getElementById('personPop'); pp.hidden = false; pp.innerHTML = '<h3>ARCHER</h3>'; } await new Promise(r => setTimeout(r, 40));
    const a = document.querySelector('#personPop .whatIs'); const id = a && a.dataset.help; if (a) a.click(); const got = (document.querySelector('.hlpArt') || {}).dataset; if (!document.getElementById('help').classList.contains('hide')) toggleHelp(); document.getElementById('personPop').hidden = true; return [id, got && got.id]; });
  need(person[0] === 'archer' && person[1] === 'archer', 'a person’s box links to his article: ' + JSON.stringify(person));
  console.log(JSON.stringify({ cats: cats.length, arts: arts.length, ctx, person }));
  await done();
  // ---- iPad and phone ----
  for (const devName of ['iPad (gen 7)', 'iPad (gen 7) landscape', 'iPhone 13', 'iPhone 13 landscape']) {
    const dev = devices[devName], s = await start('cyyoung', { start: 0, viewport: dev.viewport, page: { ...dev } });
    await s.p.tap('#btnHelpTop'); await s.p.waitForTimeout(150);
    const fit = async () => s.p.evaluate(() => { const b = document.querySelector('#help .box').getBoundingClientRect(), side = document.documentElement.scrollWidth > innerWidth + 1, body = document.getElementById('hlpBody'); return { inside: b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1, side, spill: body.scrollWidth > body.clientWidth + 2, font: (e => e ? parseFloat(getComputedStyle(e).fontSize) : 0)(document.querySelector('.hlpCard b') || document.querySelector('.hlpArt p')) }; });   /* (cards on the home page, the article's own lines on an article) */
    const f1 = await fit(); await s.p.tap('.hlpCard[data-cat="buildings"]'); await s.p.waitForTimeout(100); await s.p.tap('.hlpRow[data-art="quarry"]'); await s.p.waitForTimeout(100); const f2 = await fit();
    await s.p.screenshot({ path: SP + `/tHelp-${devName.replace(/\W+/g, '-')}.png` });
    s.need(f1.inside && !f1.side && !f1.spill && f2.inside && !f2.spill && f1.font >= 17 && f2.font >= 17, `${devName}: Help fits, nothing spills sideways, large text (${JSON.stringify([f1, f2])})`);
    const x = await s.p.$('#help .box > .xbtn'); const xb = x && await x.boundingBox(); s.need(xb && xb.width >= 44 && xb.height >= 44, devName + ': the X is at least 44 points');
    await s.p.tap('#help .box > .xbtn'); await s.p.waitForTimeout(100); s.need(await s.p.evaluate(() => document.getElementById('help').classList.contains('hide')), devName + ': tapping the X closes Help');
    await s.done();
  }
})();
