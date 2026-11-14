// Phase 4E: the diamond of troop controls at the bottom left, in place of the bar across the bottom. On a computer, an
// iPad and a phone (both ways up): it is there, inside the screen, clear of the trophy, the top bar, the map and the
// phone's tabs, with buttons at least 44 points; every button does its job (arrows move the chosen soldiers that way on
// the screen, Stop, Patrol, Guard, Add, the formations, Soldiers, Everyone, Citizens, Let go, Castle, People); a dimmed
// button says why; names show on hover or touch. The Stage chip is gone. On a phone the top bar shows pictures and
// numbers, and the bottom tabs show only the open tab's name.
const { start } = require('./lib4b'); const { devices } = require('playwright');
async function main() {
  for (const [name, dev] of [['computer', null], ['iPad (gen 7) landscape', devices['iPad (gen 7) landscape']], ['iPhone 13', devices['iPhone 13']], ['iPhone 13 landscape', devices['iPhone 13 landscape']]]) {
    const { p, need, done } = await start('cyyoung', dev ? { start: 0, viewport: dev.viewport, page: { ...dev } } : { start: 0 });
    const touch = !!dev && dev.hasTouch, press = sel => touch ? p.tap(sel) : p.click(sel);
    await p.evaluate(() => { const k = playerKeep(); window.__six = []; for (let i = 0; i < 6; i++) window.__six.push(makeUnit('player', 'spear', k.x + 70 + (i % 3) * 26, k.y + 130 + Math.floor(i / 3) * 26)); window.__step(4); updateHud(); });   /* (the six this check made: a gift from the trading friend may add others) */
    await p.waitForTimeout(300);
    // ---- where it is, and that it fits ----
    const L = await p.evaluate(() => {
      const box = e => { if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display === 'none' || cs.visibility === 'hidden' || e.hidden ? null : { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const D = document.getElementById('diamond'), g = D.querySelector('.dgrid'), gr = g.getBoundingClientRect(), G = g.offsetWidth;
      const cells = [...D.querySelectorAll('.dc')].map(b => ({ id: b.id, side: b.offsetWidth, dim: b.classList.contains('dim') }));
      const sats = [...D.querySelectorAll('.dsat')].filter(b => !b.hidden).map(b => ({ id: b.id, ...box(b) }));
      const cat = box(document.getElementById('catBar')), view = document.getElementById('view').getBoundingClientRect();
      return { D: box(D), cx: gr.left + gr.width / 2, cy: gr.top + gr.height / 2, R: G * Math.SQRT2 / 2, cells, sats, trophy: box(document.getElementById('btnTrophy')), top: box(document.getElementById('top')),
        mini: box(document.getElementById('mini') || document.getElementById('minimap')), cat, viewB: view.bottom, vw: innerWidth, vh: innerHeight,
        oldBar: getComputedStyle(document.getElementById('cmdbar')).display, stage: !!document.getElementById('cStage') };
    });
    need(L.D && L.D.l >= 0 && L.D.l < 24 && L.D.r <= L.vw && L.D.t >= 0, `${name}: the diamond is at the left, inside the screen ${JSON.stringify(L.D)}`);
    const floor = L.cat ? L.cat.t : L.viewB; need(L.D && floor - L.D.b >= 0 && floor - L.D.b < 24, `${name}: at the bottom (${L.D && Math.round(floor - L.D.b)} points above ${L.cat ? 'the tabs' : 'the bottom'})`);
    need(L.cells.length === 9 && L.cells.every(c => c.side >= 44), `${name}: nine diamond buttons, each at least 44 points (${L.cells.map(c => c.side).join(',')})`);
    need(L.sats.length >= 6 && L.sats.every(s => s.w >= 44 && s.h >= 44 && s.l >= 0 && s.r <= L.vw && s.b <= L.vh), `${name}: the buttons round the outside are at least 44 points and on the screen`);
    const clearOfDiamond = (b, pad = 2) => { if (!b) return true; const cx = (b.l + b.r) / 2, cy = (b.t + b.b) / 2, r = Math.min(b.w, b.h) / 2; const out = (Math.abs(cx - L.cx) + Math.abs(cy - L.cy) - L.R) / Math.SQRT2; return out >= r - pad; };
    const apart = (a, b) => !a || !b || a.r <= b.l + 1 || b.r <= a.l + 1 || a.b <= b.t + 1 || b.b <= a.t + 1;
    need(clearOfDiamond(L.trophy) && L.sats.every(s => apart(s, L.trophy)), `${name}: clear of the trophy`);
    need(!L.top || (L.D.t >= L.top.b - 1), `${name}: below the top bar`);
    need(!L.mini || (L.sats.every(s => apart(s, L.mini)) && clearOfDiamond(L.mini, 4)), `${name}: clear of the little map`);
    need(L.oldBar === 'none', `${name}: the old bar across the bottom is gone`); need(!L.stage, `${name}: the Stage chip is gone from the top bar`);
    // ---- the buttons at work ----
    const st = () => p.evaluate(() => { const l = selectedList().filter(u => window.__six.includes(u));   /* (the King may walk back into his keep, which lets him go) */ return { n: l.length, x: l.reduce((a, u) => a + u.x, 0) / (l.length || 1), y: l.reduce((a, u) => a + u.y, 0) / (l.length || 1), moving: l.filter(u => u.order === 'move').length,
      count: document.getElementById('dCount').hidden ? 0 : +document.getElementById('dCount').textContent, dim: document.getElementById('dMoveUp').classList.contains('dim') }; });
    await press('#btnClear'); let s0 = await st(); need(s0.n === 0 && s0.dim, `${name}: Let go lets go, and the arrows dim`);
    await press('#dMoveUp'); await p.waitForTimeout(80);
    need(await p.evaluate(() => /Choose soldiers first/.test(document.getElementById('banner').textContent)), `${name}: a dimmed arrow says to choose soldiers first`);
    await press('#btnSold'); await p.waitForTimeout(60); s0 = await st(); need(s0.n === 6 && s0.count >= 6 && !s0.dim, `${name}: the crossed swords choose the soldiers (${s0.n}, the number shows ${s0.count} with the King)`);
    const way = await p.evaluate(() => { const c = document.getElementById('game').getBoundingClientRect(), a = toWorld(c.width / 2, c.height / 2), b = toWorld(c.width / 2, c.height / 2 - 120); const d = Math.hypot(b.x - a.x, b.y - a.y); return { x: (b.x - a.x) / d, y: (b.y - a.y) / d }; });
    await press('#dMoveUp'); await p.evaluate(() => T.run(7)); const s1 = await st();
    const moved = (s1.x - s0.x) * way.x + (s1.y - s0.y) * way.y;
    need(s1.n === s0.n && moved > 100, `${name}: the up arrow walks them up the screen (${Math.round(moved)} points) and keeps them chosen`);
    await press('#dMoveRight'); await p.evaluate(() => T.run(0.6)); await press('#btnStop'); await p.evaluate(() => T.run(0.5)); const s2 = await st();
    need(s2.moving === 0, `${name}: Stop stops them (${s2.moving} still walking)`);
    await press('#btnPatrol'); need(await p.evaluate(() => orderMode === 'patrol'), `${name}: Patrol starts drawing a route`); await p.evaluate(() => cancelOrder());
    await press('#btnGuardA'); need(await p.evaluate(() => orderMode === 'guard'), `${name}: Guard waits for the place to hold`); await p.evaluate(() => cancelOrder());
    await press('#camAdd'); need(await p.evaluate(() => TOUCH.add && document.getElementById('camAdd').classList.contains('on')), `${name}: Add turns on add mode`); await press('#camAdd');
    // ---- the formations ----
    await p.evaluate(() => {   // on open ground (trees and rocks cleared, as woodcutters would), clear of the keep's buildings
      const k = playerKeep(), inSq = (x, y, c0, r0) => x >= c0 * TILE && x < (c0 + 16) * TILE && y >= r0 * TILE && y < (r0 + 16) * TILE; let spot = null;
      for (let rad = 14; rad < 80 && !spot; rad += 3) for (let a = 0; a < 16 && !spot; a++) { const c0 = Math.round(k.c + Math.cos(a / 16 * 6.283) * rad) - 8, r0 = Math.round(k.r + Math.sin(a / 16 * 6.283) * rad) - 8;
        if (c0 < 2 || r0 < 2 || c0 + 18 > COLS || r0 + 18 > ROWS) continue;
        if (structures.concat(farms).some(b => !b.dead && b.x1 > c0 * TILE && b.x0 < (c0 + 16) * TILE && b.y1 > r0 * TILE && b.y0 < (r0 + 16) * TILE)) continue;
        let wet = false; for (let c = c0; c < c0 + 16 && !wet; c++) for (let rr = r0; rr < r0 + 16 && !wet; rr++) if (riverTile[rr * COLS + c]) wet = true; if (wet) continue;
        for (const t of trees.slice()) if (!t.gone && inSq(t.x, t.y, c0, r0)) fellTree(t);
        for (const q of rocks) if (!q.gone && inSq(q.x, q.y, c0, r0)) { q.gone = true; setBlock(Math.floor(q.x / TILE), Math.floor(q.y / TILE), 0); }
        spot = { x: (c0 + 8) * TILE, y: (r0 + 8) * TILE }; }
      const l = window.__six.filter(u => !u.dead); l.forEach((u, i) => { u.x = spot.x + (i % 3) * 26 - 26; u.y = spot.y + Math.floor(i / 3) * 26; u.order = 'idle'; u.path = []; u.formed = null; u.march = null; });
      if (typeof centerOn === 'function') centerOn(spot.x, spot.y); else if (R3D.active && R3D.lookAt) R3D.lookAt(spot.x, spot.y); else { cam.x = spot.x - vw / cam.z / 2; cam.y = spot.y - vh / cam.z / 2; }
      selectOnly(l); window.__step(2); updateHud(); });
    await press('#dMarch'); const fan = await p.evaluate(() => ({ open: !document.getElementById('dFan').hidden, n: document.querySelectorAll('#dFan .dfm').length }));
    need(fan.open && fan.n === 7, `${name}: the middle button opens the seven formations (${fan.n})`);
    const fanBox = await p.evaluate(() => { const r = document.getElementById('dFan').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    need(fanBox.l >= 0 && fanBox.t >= 0 && fanBox.r <= L.vw && fanBox.b <= L.vh, `${name}: the formations fit on the screen ${JSON.stringify(fanBox)}`);
    await press('#dFan .dfm[data-f="line"]'); await p.evaluate(() => T.run(13));
    const ln = await p.evaluate(w => { const l = window.__six.filter(u => !u.dead), rx = -w.y, ry = w.x, cx = l.reduce((a, u) => a + u.x, 0) / l.length, cy = l.reduce((a, u) => a + u.y, 0) / l.length;
      const lat = l.map(u => (u.x - cx) * rx + (u.y - cy) * ry), fwd = l.map(u => (u.x - cx) * w.x + (u.y - cy) * w.y);
      return { who: l.filter(u => u.order !== 'idle' || (u.dest && Math.hypot(u.dest.x - u.x, u.dest.y - u.y) > 20)).map(u => ({ order: u.order, guard: u.guardOf ? u.guardOf.kind || u.guardOf.type : null, formed: u.formed, march: !!u.march, cmd: +(time - (u.cmdT || -99)).toFixed(1), d: u.dest ? Math.round(Math.hypot(u.dest.x - u.x, u.dest.y - u.y)) : null, path: u.path.length, stuck: +(u.stuckT || 0).toFixed(1), reslot: u.reslot })), walking: l.filter(u => u.order === 'move').length, off: l.map(u => u.dest ? Math.round(Math.hypot(u.dest.x - u.x, u.dest.y - u.y)) : -1), blocked: l.map(u => u.dest ? circleBlocked(u.dest.x, u.dest.y, 9) : null), f: formationNow, fan: !document.getElementById('dFan').hidden, across: Math.round(Math.max(...lat) - Math.min(...lat)), deep: Math.round(Math.max(...fwd) - Math.min(...fwd)), mark: !!document.querySelector('#dForm svg') }; }, way);
    need(ln.f === 'line' && !ln.fan && ln.mark, `${name}: choosing Line sets it, closes the fan, and the middle button shows it`);
    need(ln.across >= 120 && ln.deep <= 20, `${name}: the chosen soldiers form a line where they stand, across the screen (${ln.across} across, ${ln.deep} deep)`);
    await press('#dMarch'); await press('#dFan .dfm[data-f="free"]'); need(await p.evaluate(() => formationNow === 'free' && !document.querySelector('#dForm svg')), `${name}: Free goes back to no set shape`);
    // ---- choosing ----
    await press('#btnAll'); const all = await p.evaluate(() => ({ n: selectedList().length, civ: selectedList().filter(u => u.type === 'civ').length }));
    need(all.n > 6 && all.civ > 0, `${name}: Everyone chooses soldiers and citizens (${all.n})`);
    await press('#btnCiv'); need(await p.evaluate(() => selectedList().length > 0 && selectedList().every(u => u.type === 'civ')), `${name}: Citizens chooses the citizens`);
    await press('#camHome'); await press('#btnPeople'); await p.waitForTimeout(100);
    need(await p.evaluate(() => !document.getElementById('peoplePop').hidden), `${name}: People opens your people`); await p.evaluate(() => UI.closePops());
    // ---- names on hover or touch ----
    if (touch) await p.tap('#btnStop'); else await p.hover('#btnStop');
    await p.waitForTimeout(60); const lab = await p.evaluate(() => { const L = document.getElementById('ibLabel'); return L.hidden ? '' : L.textContent; });
    need(/Stop/.test(lab), `${name}: ${touch ? 'touching' : 'hovering over'} a button shows its name (${lab})`);
    if (name.startsWith('iPhone')) {
      const ph = await p.evaluate(() => { const vis = e => !!e && getComputedStyle(e).display !== 'none'; const t = e => [...e.childNodes].filter(n => n.nodeType === 3 || vis(n)).map(n => n.textContent).join('').trim();
        const cat = [...document.querySelectorAll('#catBar button')]; return { mood: t(document.getElementById('vMood')), people: t(document.getElementById('vPeople')), emblem: vis(document.querySelector('#cCiv canvas.emb')), facName: vis(document.querySelector('#cCiv b')),
          rivals: t(document.querySelector('#cRivals b')), catWords: cat.filter(b => !b.classList.contains('on') && vis(b.querySelector('span'))).length, words: [...document.querySelectorAll('#status .wd')].filter(vis).length }; });
      need(/^\d+$/.test(ph.mood) && /^\d+\/\d+$/.test(ph.people) && ph.emblem && !ph.facName && ph.words === 0 && !/Rivals/.test(ph.rivals), `${name}: the top bar shows pictures and numbers, no words ${JSON.stringify(ph)}`);
      need(ph.catWords === 0, `${name}: the bottom tabs show pictures only (the open one shows its name)`);
      await p.tap('#cMood'); await p.waitForTimeout(60); const ml = await p.evaluate(() => document.getElementById('ibLabel').hidden ? '' : document.getElementById('ibLabel').textContent);
      need(/Mood/.test(ml), `${name}: touching the face shows its name (${ml})`); await p.evaluate(() => UI.closePops());
    }
    console.log(name, JSON.stringify({ diamond: L.D, cells: L.cells[0].side, moved: Math.round(moved), line: ln }));
    await done();
  }
}
main();
