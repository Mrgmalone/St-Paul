// The front page, on an iPad and on a phone, held both ways: the four factions side by side (one across on a phone), each with
// its name, emblem, one sentence, strengths, weakness and starting setup, all in large text; a tap selects, Play starts;
// the old peoples show only for the older tests.
const { chromium } = require('playwright'); const env = require('./env'); const SP = env.SP;
(async () => {
  const b = await chromium.launch(env.LAUNCH); const errs = [], fails = [];
  const need = (ok, what) => { if (!ok) fails.push(what); };
  for (const [name, w, h] of [['ipad', 1180, 820], ['ipad-upright', 820, 1180], ['phone', 390, 844], ['phone-sideways', 844, 390]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await env.use3d(p, { drawMs: 999999 });
    p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto(env.GAME_REAL); await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const cards = [...document.querySelectorAll('.fac')], text = [...document.querySelectorAll('.fac *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
      const ink = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 20) n++; return n; };
      return { n: cards.length, names: cards.map(c => c.querySelector('.fnm').textContent), whole: cards.every(c => c.querySelector('.fplay').textContent.length > 20 && c.querySelectorAll('li').length >= 1 && c.querySelector('.fweak').textContent.length > 10 && /civilians/.test(c.querySelector('.fstart').textContent)),
        emblems: cards.every(c => ink(c.querySelector('canvas')) > 100), minFont: Math.min(...text.map(e => parseFloat(getComputedStyle(e).fontSize))), old: !document.getElementById('oldCards').hidden,
        perRow: (() => { const t = cards.map(c => Math.round(c.getBoundingClientRect().top)); return t.filter(x => x === t[0]).length; })(), cardMinW: Math.min(...cards.map(c => c.getBoundingClientRect().width)) };
    });
    await p.click('.fac[data-fac="psychana"]'); await p.waitForTimeout(200);
    const go = await p.evaluate(() => { const g = document.querySelector('.fac.sel .fgo'); const q = g && g.getBoundingClientRect(); return q ? { w: Math.round(q.width), h: Math.round(q.height), started: typeof started !== 'undefined' && started } : null; });
    await p.screenshot({ path: `${SP}/front_${name}.png` });
    await p.click('.fac[data-fac="psychana"] .fgo'); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => ({ started, fac: FACKEY, hidden: getComputedStyle(document.getElementById('pick')).display === 'none' }));
    console.log(name, JSON.stringify(r), 'play', JSON.stringify(go), 'after', JSON.stringify(st));
    need(r.n === 4 && r.whole && r.emblems, `${name}: four whole faction cards with emblems`); need(r.minFont >= 15, `${name}: text at least 15 points`); need(!r.old, `${name}: old peoples hidden`);
    need(name === 'ipad' ? r.perRow === 4 : name === 'phone' ? r.perRow === 1 : r.perRow >= 1, `${name}: cards laid out for the screen`);
    need(go && go.h >= 44 && go.w >= 120 && !go.started, `${name}: the first tap selects, Play is a big target`); need(st.started && st.fac === 'psychana' && st.hidden, `${name}: Play starts the game`);
    await p.close();
  }
  { const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 999999 }); await p.goto(env.GAME); await p.waitForTimeout(800);
    const old = await p.evaluate(() => ({ shown: !document.getElementById('oldCards').hidden, n: document.querySelectorAll('.civ').length })); console.log('older tests', JSON.stringify(old));
    need(old.shown && old.n === 3, 'the older tests still get the three old peoples'); await p.close(); }
  console.log('fails', JSON.stringify(fails)); console.log('errors', errs.slice(0, 5)); await b.close();
  if (fails.length) process.exit(1);
})();
