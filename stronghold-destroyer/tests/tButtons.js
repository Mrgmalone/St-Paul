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
  // a phone held sideways and upright: picture buttons scale down to 64 points, every tap target stays at least 44
  for (const [w, h] of [[844, 390], [390, 844]]) {
    await p.setViewportSize({ width: w, height: h }); await p.evaluate(() => { window.dispatchEvent(new Event('resize')); UI.showTab('town'); }); await p.waitForTimeout(400);
    const ph = await p.evaluate(() => { const ib = [...document.querySelectorAll('.pane.active .ib')].map(b => b.getBoundingClientRect()), side = document.getElementById('side').getBoundingClientRect();
      const tiny = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.closest('#pick') && !b.closest('.chip')).map(b => b.getBoundingClientRect()).filter(r => r.width && (r.width < 43.5 || r.height < 43.5)).length;
      return { n: ib.length, w: ib.length ? Math.round(ib[0].width) : 0, h: ib.length ? Math.round(ib[0].height) : 0, side: Math.round(side.width), tiny }; });
    console.log(`phone ${w}x${h}:`, JSON.stringify(ph)); if (!ph.n || Math.abs(ph.w - 64) > 3 || Math.abs(ph.h - 64) > 3 || ph.tiny || ph.side > 190) bad.push({ phone: [w, h], ph });
    await p.screenshot({ path: SP + (w > h ? '/buttons_phone.png' : '/buttons_phone_upright.png') });
  }
  if (bad.length) { console.log('bad', JSON.stringify(bad.slice(0, 8))); throw new Error('button rules broken'); }
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
