'use strict';
// Stronghold Destroyer — Phase 4D, step D4 (bug sweep): fixes found by the sweep that belong to no one module.
// Panels never run off the screen: every open panel (a building's box, Settings with its saved games, the rivals,
// mood and goods lists, the trophy, People) is kept inside the game area, and scrolls inside itself when its
// contents are taller than the room left below its top. (Before, a tall box such as the market's ran far past the
// bottom of the screen, and the escort box could slide above the top.)
(() => {
  const fit = el => {
    if (el.hidden || el.offsetParent === null) return;
    if (el.id === 'loadPop' || el.classList.contains('sheet')) return;   // (these size themselves)
    const host = el.offsetParent, hr = host.getBoundingClientRect(), r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (cs.position === 'fixed') return;
    const top = Math.max(hr.top, 0) + 6;
    if (r.top < top - 1) { const t = parseFloat(cs.top) || 0; el.style.top = Math.round(t + (top - r.top)) + 'px'; }   // never above the game area
    const extra = cs.boxSizing === 'border-box' ? 0 : ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((a, k) => a + (parseFloat(cs[k]) || 0), 0);   // (max-height counts only the inside)
    const room = Math.floor(Math.min(innerHeight, hr.bottom) - Math.max(r.top, top) - 8 - extra);
    if (room > 140 && Math.abs((parseFloat(el.style.maxHeight) || 0) - room) > 2) { el.style.maxHeight = room + 'px'; el.style.overflowY = 'auto'; el.style.overscrollBehavior = 'contain'; }
  };
  const fitAll = () => { for (const el of document.querySelectorAll('.pop')) fit(el); };
  new MutationObserver(ms => { for (const m of ms) if (m.target.classList && m.target.classList.contains('pop') && !m.target.hidden) fit(m.target); }).observe(document.body, { attributes: true, attributeFilter: ['hidden'], subtree: true });
  addEventListener('resize', () => setTimeout(fitAll, 50));
  setInterval(fitAll, 400);   // (a box that grows while open, as the market's does)
  window.FIX4D = { fit, fitAll };
})();
