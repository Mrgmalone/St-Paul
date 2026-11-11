// Picture buttons: about 130 points square with a picture filling them, the name in a label on tap or hover,
// and every tap target in the interface at least 44 points.
const { chromium } = require('playwright'); const env = require('./env'); const SP = env.SP;
(async () => {
  const b = await chromium.launch(env.LAUNCH); const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await env.use3d(p, { drawMs: 0 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await p.goto(env.GAME); await p.waitForTimeout(600); await p.click('.civ[data-civ="wardens"]'); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.getElementById('banner').style.display = 'none'; SD.setRaid(9999); });
  const bad = [];
  for (const tab of ['town', 'castle', 'army', 'rule', 'industry']) {
    await p.evaluate(t => UI.showTab(t), tab); await p.waitForTimeout(300);
    const r = await p.evaluate(() => [...document.querySelectorAll('.pane.active .ib')].map(b => { const r = b.getBoundingClientRect(), c = b.querySelector('canvas'); let ink = 0;
      if (c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 20) ink++; }
      return { name: b.dataset.name, w: Math.round(r.width), h: Math.round(r.height), ink, label: getComputedStyle(b).fontSize }; }));
    for (const x of r) if (Math.abs(x.w - 130) > 3 || Math.abs(x.h - 130) > 3 || x.ink < 50 || x.label !== '0px') bad.push(x);
    console.log(tab, r.length, 'buttons', r.slice(0, 3).map(x => `${x.name} ${x.w}x${x.h}`).join(', '));
    if (tab === 'army') await p.screenshot({ path: SP + '/buttons_army.png' });
  }
  await p.evaluate(() => UI.showTab('town')); const first = await p.$('.pane.active .ib'); await first.hover(); await p.waitForTimeout(200);
  const lab = await p.evaluate(() => { const L = document.getElementById('ibLabel'); return { shown: !L.hidden, text: L.textContent }; });
  console.log('label on hover:', JSON.stringify(lab)); if (!lab.shown || !lab.text) bad.push({ label: lab });
  const small = await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.closest('#pick') && !b.closest('.chip')).map(b => { const r = b.getBoundingClientRect(); return { id: b.id || b.className || b.textContent.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; }).filter(x => x.w < 44 || x.h < 44));
  console.log('buttons smaller than 44:', JSON.stringify(small)); if (small.length) bad.push(...small);
  if (bad.length) { console.log('bad', JSON.stringify(bad.slice(0, 8))); throw new Error('button rules broken'); }
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
