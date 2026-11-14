'use strict';
// Stronghold Destroyer — the Help screen: search, category cards with pictures, short articles, and a "What is this?"
// link in every box. All the words live in ONE file, js/helpdata.js (HELP_DATA); this file only shows them.
// Opens with the ? button or the H key; reading it pauses the game (unless enemies are close); the big X closes it.
// Pictures: art/help/<article id>.png (or .jpg) when you add one (used with no code change); otherwise the game's own
// picture named in the article: b:<building>, u:<unit>, r:<goods>, w:<weapon> or i:<drawn icon>.
const HELP_ICONS = {
  start: '<path d="M8 40 L32 14 L56 40" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><rect x="16" y="38" width="32" height="18" fill="currentColor" opacity=".85"/><rect x="28" y="44" width="8" height="12" fill="#1c1b1a"/>',
  mouse: '<rect x="18" y="8" width="28" height="46" rx="14" fill="none" stroke="currentColor" stroke-width="4"/><path d="M32 8 V24 M18 24 H46" stroke="currentColor" stroke-width="3"/>',
  touch: '<path d="M26 54 V22 a5 5 0 0 1 10 0 V34 l10 3 a6 6 0 0 1 4 7 L46 56" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><circle cx="31" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="3"/>',
  keys: '<rect x="6" y="18" width="52" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="4"/>' + [0, 1, 2, 3].map(i => `<rect x="${12 + i * 11}" y="24" width="8" height="7" fill="currentColor"/>`).join('') + '<rect x="18" y="37" width="28" height="6" fill="currentColor"/>',
  trophy: '<path d="M18 8h28v12a14 14 0 0 1-28 0z" fill="#e8b830"/><path d="M18 12H10v4a10 10 0 0 0 10 10M46 12h8v4a10 10 0 0 1-10 10" fill="none" stroke="#e8b830" stroke-width="4"/><path d="M28 34h8v10h-8z" fill="#c9971f"/><path d="M20 44h24l2 8H18z" fill="#e8b830"/>',
  crown: '<path d="M8 46 L12 18 L24 32 L32 12 L40 32 L52 18 L56 46Z" fill="#e8b830" stroke="#8a6a1a" stroke-width="2"/><rect x="8" y="46" width="48" height="8" fill="#c9971f"/>',
  gear: '<path fill="currentColor" d="M27.5 4h9l1.3 6.9c1.6.5 3.2 1.4 4.5 2.4l6.7-2.4 4.5 7.8-5.3 4.5c.3 1.6.3 3.4 0 5l5.3 4.5-4.5 7.8-6.7-2.4c-1.3 1-2.9 1.9-4.5 2.4L36.5 47h-9l-1.3-6.9c-1.6-.5-3.2-1.4-4.5-2.4l-6.7 2.4-4.5-7.8 5.3-4.5c-.3-1.6-.3-3.4 0-5l-5.3-4.5 4.5-7.8 6.7 2.4c1.3-1 2.9-1.9 4.5-2.4zM32 17a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z" transform="translate(0 6)"/>',
  save: '<rect x="10" y="10" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><rect x="18" y="10" width="26" height="14" fill="currentColor"/><rect x="18" y="34" width="28" height="20" fill="none" stroke="currentColor" stroke-width="3"/>',
  fire: '<path d="M32 6 C40 18 50 24 46 40 C44 50 36 56 32 56 C24 56 16 50 16 40 C16 30 24 28 26 18 C30 26 34 26 32 6Z" fill="#ff8a2a"/><path d="M32 30 C36 36 40 40 38 46 C36 52 28 52 26 46 C24 40 30 38 32 30Z" fill="#ffe08a"/>',
  fog: '<circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="4"/><path d="M14 26 H50 M10 34 H54 M16 42 H48" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".6"/>',
  map: '<path d="M8 14 L24 8 L40 14 L56 8 V50 L40 56 L24 50 L8 56Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M24 8 V50 M40 14 V56" stroke="currentColor" stroke-width="3"/>',
  flag: '<path d="M18 8 V58" stroke="currentColor" stroke-width="4"/><path d="M18 10 C30 4 38 18 52 12 V32 C38 38 30 24 18 30Z" fill="#c8202a"/>',
  handshake: '<path d="M6 30 L18 20 L30 26 L40 20 L58 30 L46 42 L36 36 L28 44 L18 38Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>',
  mood: '<circle cx="32" cy="32" r="24" fill="#f2d27a" stroke="#8a6a1a" stroke-width="3"/><circle cx="24" cy="28" r="3" fill="#3a2414"/><circle cx="40" cy="28" r="3" fill="#3a2414"/><path d="M22 38 Q32 48 42 38" fill="none" stroke="#3a2414" stroke-width="3"/>',
  people: '<circle cx="22" cy="20" r="8" fill="currentColor"/><circle cx="42" cy="20" r="8" fill="currentColor"/><path d="M8 52 C8 36 36 36 36 52Z M28 52 C28 36 56 36 56 52Z" fill="currentColor" opacity=".85"/>',
  book: '<path d="M8 12 H28 a4 4 0 0 1 4 4 V54 a4 4 0 0 0-4-4 H8Z M56 12 H36 a4 4 0 0 0-4 4 V54 a4 4 0 0 1 4-4 H56Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>',
  moat: '<path d="M4 40 C12 34 20 46 28 40 C36 34 44 46 52 40 C56 37 58 38 60 40" fill="none" stroke="#4f86c8" stroke-width="5"/><rect x="4" y="16" width="56" height="10" fill="#8a8378"/>',
  spikes: [0, 1, 2, 3, 4].map(i => `<polygon points="${8 + i * 11},50 ${13 + i * 11},18 ${18 + i * 11},50" fill="#9aa2a8" stroke="#4e5459" stroke-width="2"/>`).join('') + '<rect x="4" y="50" width="56" height="6" fill="#6b4a2a"/>',
  sword: '<path d="M46 8 L56 8 L56 18 L28 46 L18 36Z" fill="#d5dbe1" stroke="#6d7378" stroke-width="2"/><path d="M14 34 L30 50 M10 46 L18 54" stroke="#8a6a1a" stroke-width="6" stroke-linecap="round"/>',
  coins: '<ellipse cx="26" cy="40" rx="16" ry="7" fill="#c9971f"/><ellipse cx="26" cy="34" rx="16" ry="7" fill="#e8b830"/><ellipse cx="40" cy="26" rx="16" ry="7" fill="#c9971f"/><ellipse cx="40" cy="20" rx="16" ry="7" fill="#e8b830"/>',
  raid: '<path d="M10 54 L40 24 M30 14 L50 34" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M54 54 L24 24 M34 14 L14 34" stroke="#c8202a" stroke-width="6" stroke-linecap="round"/>',
  search: '<circle cx="26" cy="26" r="16" fill="none" stroke="currentColor" stroke-width="5"/><path d="M38 38 L56 56" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>'
};
const HELPUI_OPEN = { want: null };   // (an article a "What is this?" link asked for)
const HELPUI = (() => {
  const H = typeof HELP_DATA !== 'undefined' ? HELP_DATA : null, box = document.querySelector('#help .box');   /* (a top-level const is not a window property) */
  if (!H || !box) { console.error('Help: the help data or the help box is missing'); return null; }
  const byId = new Map(H.articles.map(a => [a.id, a])), catOf = new Map(H.categories.map(c => [c.id, c]));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // ---------- words from the game's own numbers ({cost:house}, {name:knight}, {stagetable}) ----------
  const costText = k => { const d = BUILD[k]; if (!d) return ''; const parts = ['wood', 'stone', 'gold'].filter(r => d[r]).map(r => `${d[r]} ${r}`); return parts.length ? parts.join(', ') : 'nothing'; };
  function stageTable() {
    const rows = STAGES.slice(1).map(st => { const q = st.need, b = Object.entries(q.buildings || {}).map(([k, v]) => `${v} ${(typeof NEED_LABEL !== 'undefined' && NEED_LABEL[k]) || (BUILD[k] ? BUILD[k].name : k)}`).join(', ');
      return `<tr><td><b>${st.n}. ${st.name}</b></td><td>${q.people} people, happiness ${q.mood}, food ${q.food}${q.stone ? ', stone ' + q.stone : ''}${q.iron ? ', iron ' + q.iron : ''}</td><td>${b}</td></tr>`; }).join('');
    return `<table class="hlpTab"><tr><th>Stage</th><th>Needs (Easy)</th><th>Buildings</th></tr>${rows}</table><p class="hlpSm">Medium and Hard ask more of these, more at each stage. The trophy shows your own numbers.</p>`;
  }
  const fill = s => String(s).replace(/\{cost:(\w+)\}/g, (m, k) => costText(k)).replace(/\{name:(\w+)\}/g, (m, k) => (BUILD[k] && BUILD[k].name) || (KINDS[k] && KINDS[k].name) || k)
    .replace(/\{stagetable\}/g, () => stageTable());
  // ---------- pictures ----------
  const picCache = new Map();
  function gamePic(name) {
    if (picCache.has(name)) return picCache.get(name);
    let url = '';
    const [kind, what] = name.split(':');
    try {
      if (kind === 'i') url = HELP_ICONS[what] ? `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" color="#e8c87a">${HELP_ICONS[what]}</svg>`)}` : '';
      else if ((kind === 'b' || kind === 'u') && R3D.available && R3D.isReady()) { const c = R3D.iconOf(kind + ':' + what); if (c) url = c.toDataURL('image/png'); }
      else if (kind === 'r' || kind === 'w') { const d = document.createElement('div'); d.className = 'ib'; const c = document.createElement('canvas'); c.dataset.icon = name; d.appendChild(c); d.style.cssText = 'position:absolute;left:-9999px'; document.body.appendChild(d); UI.paintIcons(d); url = c.toDataURL('image/png'); d.remove(); }
    } catch (e) { url = ''; }
    let stand = false;   /* (a drawn stand-in while the 3D pictures are not ready yet: not kept, so the real one shows next time) */
    if (!url && kind !== 'i') { url = gamePic('i:' + (kind === 'u' ? 'people' : kind === 'b' ? 'start' : 'book')); stand = true; }
    if (url && !stand) picCache.set(name, url);
    return url;
  }
  // an <img> for an article or category: Gerald's own picture if there is one (art/help/<id>.png), else the game's
  function pic(id, name, cls) {
    const file = ARTFILES.get('art/help/' + id + '.png', false, () => { for (const im of document.querySelectorAll(`img[data-hpic="${id}"]`)) im.src = 'art/help/' + id + '.png'; });
    const src = file ? 'art/help/' + id + '.png' : gamePic(name || 'i:book');
    return `<img class="${cls || 'hlpPic'}" data-hpic="${esc(id)}" src="${src}" alt="">`;
  }
  // ---------- search ----------
  const STOP = new Set('a an the of to in on at for and or is are am be do does did i me my we our you your it its how what why when where which who can could should would will shall get got make made use using there their this that these those with from by as about any some please tell show help want need'.split(' '));
  const norm = s => String(s).toLowerCase().replace(/<[^>]+>/g, ' ').replace(/\{[^}]+\}/g, ' ').replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const stem = w => w.length > 4 ? w.replace(/(ies)$/, 'y').replace(/(ing|ers|er|es|s|ed)$/, '') : w;
  function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
  const INDEX = H.articles.map(a => {
    const w = new Map(), add = (text, weight) => { for (const t of norm(text).split(' ')) { if (!t || STOP.has(t)) continue; const k = stem(t); w.set(k, Math.max(w.get(k) || 0, weight)); } };
    add(a.title, 6); for (const s of a.words || []) add(s, 5); add(a.summary, 2); for (const l of a.text || []) add(l, 1); if (a.how) { add(a.how.q, 3); for (const s of a.how.steps) add(s, 1); }
    add((catOf.get(a.cat) || {}).title || '', 1);
    return { a, w, phrases: (a.words || []).concat([a.title]).map(norm).filter(p => p.includes(' ')) };
  });
  function search(q) {
    const nq = norm(q), toks = nq.split(' ').filter(t => t && !STOP.has(t)).map(stem); if (!toks.length) return [];
    const out = [];
    for (const it of INDEX) {
      let score = 0, hit = 0;
      for (const t of toks) {
        let best = it.w.get(t) || 0;
        if (!best) for (const [k, wt] of it.w) {
          if (t.length >= 3 && (k.startsWith(t) || (t.length >= 5 && t.startsWith(k) && k.length >= 4))) best = Math.max(best, wt * 0.7);
          else if (t.length >= 4 && k.length >= 4 && lev(t, k) <= (t.length >= 7 ? 2 : 1)) best = Math.max(best, wt * 0.6);   // a slip of the finger
        }
        if (best) { hit++; score += best; }
      }
      for (const ph of it.phrases) if (nq.includes(ph)) score += 8;
      if (hit) out.push({ a: it.a, score: score * (0.5 + 0.5 * hit / toks.length) });
    }
    return out.sort((x, y) => y.score - x.score).filter((r, i, arr) => r.score >= Math.max(3, arr[0].score * 0.35)).slice(0, 8).map(r => r.a);
  }
  // topics near a search that found nothing: the closest titles and categories by spelling
  function nearby(q) {
    const toks = norm(q).split(' ').filter(t => t.length > 2 && !STOP.has(t));
    const sc = a => Math.min(...toks.map(t => Math.min(...norm(a.title + ' ' + (a.words || []).join(' ')).split(' ').map(w => lev(t, w)))), 9);
    return H.articles.map(a => [a, toks.length ? sc(a) : 9]).sort((x, y) => x[1] - y[1]).slice(0, 4).map(x => x[0]);
  }
  // ---------- the screens ----------
  let view = { kind: 'home' }, last = [];
  const body = () => document.getElementById('hlpBody');
  const row = a => `<button class="hlpRow" data-art="${esc(a.id)}">${pic(a.id, a.pic)}<span><b>${esc(a.title)}</b><small>${esc(a.summary)}</small></span></button>`;
  function show(v, push = true) {
    if (push && view) last.push(view); view = v; const B = body(); if (!B) return;
    const back = last.length ? '<button class="hlpBack" data-back="1">&#8249; Back</button>' : '';
    if (v.kind === 'home') { last = [];
      B.innerHTML = `<p class="hlpLead">Type a question above, or pick a topic.</p><div class="hlpCards">${H.categories.map(c => `<button class="hlpCard" data-cat="${esc(c.id)}">${pic('cat-' + c.id, c.pic, 'hlpCardPic')}<b>${esc(c.title)}</b><small>${esc(c.blurb)}</small></button>`).join('')}</div>`; }
    else if (v.kind === 'cat') { const c = catOf.get(v.id), list = H.articles.filter(a => a.cat === v.id);
      B.innerHTML = `${back}<h4 class="hlpH">${pic('cat-' + c.id, c.pic, 'hlpHPic')}${esc(c.title)}</h4><div class="hlpList">${list.map(row).join('')}</div>`; }
    else if (v.kind === 'art') { const a = byId.get(v.id); if (!a) return show({ kind: 'home' }, false); const c = catOf.get(a.cat);
      B.innerHTML = `${back}<article class="hlpArt" data-id="${esc(a.id)}"><h4 class="hlpH">${esc(a.title)}</h4>${pic(a.id, a.pic, 'hlpBigPic')}
        ${(a.text || []).map(l => `<p>${fill(l)}</p>`).join('')}
        ${a.how ? `<div class="hlpHow"><b>${esc(a.how.q)}</b><ol>${a.how.steps.map(s => `<li>${fill(s)}</li>`).join('')}</ol></div>` : ''}
        ${(a.related || []).length ? `<div class="hlpRel"><b>Related:</b> ${a.related.filter(id => byId.has(id)).map(id => `<button class="hlpLink" data-art="${esc(id)}">${esc(byId.get(id).title)}</button>`).join('')}</div>` : ''}
        ${c ? `<div class="hlpIn">In <button class="hlpLink" data-cat="${esc(c.id)}">${esc(c.title)}</button></div>` : ''}</article>`;
      B.scrollTop = 0; }
    else if (v.kind === 'search') { const res = search(v.q);
      B.innerHTML = res.length ? `<p class="hlpLead">${res.length === 1 ? 'One article' : res.length + ' articles'} for “${esc(v.q)}”:</p><div class="hlpList">${res.map(row).join('')}</div>`
        : `<p class="hlpLead">No article matches “${esc(v.q)}”.</p><p>Try one of these nearby topics, or fewer words:</p><div class="hlpList">${nearby(v.q).map(row).join('')}</div>`; }
  }
  // ---------- build it inside the old help box ----------
  const closeBtn = document.getElementById('btnHelpClose');
  box.classList.add('hlpBox'); box.innerHTML = `<div class="hlpTop"><h3>HELP</h3><div class="hlpSearch">${'<img class="hlpSIcon" alt="" src="' + gamePic('i:search') + '">'}<input id="hlpQ" type="search" autocomplete="off" placeholder="Search: how do I get stone?" aria-label="Search the help"><button id="hlpClear" aria-label="Clear the search">Clear</button></div></div><div id="hlpBody" aria-live="polite"></div>`;
  if (closeBtn) { closeBtn.classList.add('hlpCloseBtn'); box.appendChild(closeBtn); }
  const q = document.getElementById('hlpQ');
  q.addEventListener('input', () => { const t = q.value.trim(); if (t.length >= 2) { if (view.kind !== 'search') last.push(view); view = { kind: 'search', q: t }; show(view, false); } else if (!t && view.kind === 'search') show({ kind: 'home' }, false); });
  q.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { if (q.value) { q.value = ''; show({ kind: 'home' }, false); } else toggleHelp(); } if (e.key === 'Enter') { const first = body().querySelector('.hlpRow'); if (first) first.click(); } });
  document.getElementById('hlpClear').onclick = () => { q.value = ''; show({ kind: 'home' }, false); q.focus(); };
  box.addEventListener('click', e => {
    const t = e.target.closest('[data-art],[data-cat],[data-back]'); if (!t || !box.contains(t)) return;
    if (t.dataset.back) { const v = last.pop() || { kind: 'home' }; show(v, false); return; }
    if (t.dataset.art) show({ kind: 'art', id: t.dataset.art }); else if (t.dataset.cat) show({ kind: 'cat', id: t.dataset.cat });
  });
  show({ kind: 'home' }, false);
  // opening: fresh at the topics (unless a "What is this?" link asked for an article)
  const helpEl = document.getElementById('help');
  new MutationObserver(() => { if (!helpEl.classList.contains('hide') && !HELPUI_OPEN.want) { q.value = ''; show({ kind: 'home' }, false); } HELPUI_OPEN.want = null; }).observe(helpEl, { attributes: true, attributeFilter: ['class'] });
  function openArticle(id) { HELPUI_OPEN.want = id; if (helpEl.classList.contains('hide')) toggleHelp(); q.value = ''; last = []; show({ kind: byId.has(id) ? 'art' : catOf.has(id) ? 'cat' : 'home', id }, false); }
  // ---------- "What is this?" in every box ----------
  const ctxOf = el => {
    const M = H.context || {};
    if (el.id === 'storePop') { const b = storeShown; if (!b) return null; return (M.buildings || {})[b.kind] || (b.kind === 'feastbox' ? 'feast' : 'buildings'); }
    if (el.id === 'personPop') { const u = typeof cardOf !== 'undefined' && cardOf; if (!u) return 'citizens'; const key = u.kit && u.kit !== 'foot' ? u.kit : u.type; return (M.units || {})[key] || (u.type === 'civ' ? 'citizens' : 'units'); }
    return (M.panels || {})[el.id] || null;
  };
  function addLink(el) {
    if (el.hidden || el.id === 'loadPop') return; const id = ctxOf(el); if (!id) return;
    let a = el.querySelector(':scope > .whatIs');
    if (!a) { a = document.createElement('button'); a.className = 'whatIs'; a.type = 'button'; a.textContent = 'What is this?'; a.setAttribute('aria-label', 'What is this? Opens the help article'); const h = el.querySelector(':scope > h3'); if (h) h.insertAdjacentElement('afterend', a); else el.prepend(a); }
    a.dataset.help = id;
  }
  document.addEventListener('click', e => { const a = e.target.closest('.whatIs'); if (!a) return; e.stopPropagation(); openArticle(a.dataset.help); }, true);
  const watch = el => { const mo = new MutationObserver(() => { mo.disconnect(); addLink(el); mo.observe(el, { childList: true, attributes: true, attributeFilter: ['hidden'] }); }); mo.observe(el, { childList: true, attributes: true, attributeFilter: ['hidden'] }); addLink(el); };
  const watchAll = () => { for (const el of document.querySelectorAll('.pop')) if (!el.dataset.hw) { el.dataset.hw = '1'; watch(el); } };
  watchAll(); setInterval(watchAll, 2000);   // (panels made later, such as the trophy's)
  return { search, show, openArticle, articles: H.articles, categories: H.categories, ctxOf };
})();
