'use strict';
// Stronghold Destroyer — Phase 4D, step D3: pictures from files, used in place of the drawn stand-ins when they are there.
// Put a picture in the right folder with the right name (design/IMAGE-PROMPTS.md lists them) and the game uses it the
// next time the page loads, with no change to the code:
//   art/buildings/<kind>.png   a building's outside (buttons, the flat view, Help) — on flat magenta, cut out here
//   art/units/<type>.png       a soldier or person (buttons, Help) — on flat magenta, cut out here
//   art/inside/<kind>.jpg      the picture at the top of a building's box
//   art/ui/people-face.png     the face on the People button
// A picture that is not there is simply not used (the drawn stand-in stays).
const ARTFILES = (() => {
  const cache = new Map();
  // flat magenta (#FF00FF) around a picture becomes see-through, with a soft edge
  function keyOut(img) {
    const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    try { const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) { const r = a[i], gg = a[i + 1], b = a[i + 2], m = Math.min(r, b) - gg;   // how magenta it is
        if (m > 90 && r > 150 && b > 150) a[i + 3] = 0; else if (m > 40 && r > 110 && b > 110) { a[i + 3] = Math.round(a[i + 3] * (90 - m) / 50); a[i] = a[i + 2] = gg + (Math.max(r, b) - gg) * 0.4; } }
      g.putImageData(d, 0, 0); } catch (e) {}   // (a picture from another site cannot be read: it is used as it is)
    return c;
  }
  // get(path, cutOut, whenReady): the picture if it has loaded, otherwise null (and whenReady is called once it has)
  function get(path, cutOut, whenReady) {
    let e = cache.get(path);
    if (!e) {
      e = { ready: false, failed: false, pic: null, url: path, wait: [] }; cache.set(path, e);
      const im = new Image();
      im.onload = () => { e.pic = cutOut ? keyOut(im) : im; e.ready = true; const w = e.wait; e.wait = []; for (const f of w) try { f(e.pic); } catch (er) {} };
      im.onerror = () => { e.failed = true; e.wait = []; };
      im.src = path;
    }
    if (e.ready) return e.pic;
    if (whenReady && !e.failed && !e.wait.includes(whenReady)) e.wait.push(whenReady);
    return null;
  }
  const have = path => { const e = cache.get(path); return !!(e && e.ready); };
  const list = () => [...cache.entries()].filter(([, e]) => e.ready).map(([p]) => p);
  return { get, have, list, keyOut };
})();
