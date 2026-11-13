'use strict';
// Stronghold Destroyer — Phase 4D, step D2: saving and loading a game.
// A save keeps the whole game: where everyone started (the land is made from that), what you have seen through the fog,
// your faction and the rivals, every building and person (their jobs, stars, schooling, health, what they carry), your
// goods, the castle stage, patrols and guard posts, rally flags, moats and spikes, fires and repairs under way, the
// weather, the difficulty, and every timer. Saves are kept in this browser (IndexedDB, or local storage if that is not
// there), each with a name and the date and time; an autosave slot is written every few game-minutes and when the page
// is put away. A save can also be exported as a file and imported again (to keep it safe, or move it to another device).
// Loading starts the page afresh with the saved starting places, so the land comes out exactly as it was, and then puts
// everything back.
const SAVE = { ver: 1, format: 'stronghold-destroyer-save', autoEvery: 300, autoAt: 0, busy: false, lastMs: 0, lastKB: 0 };
// ---------- what is kept: the game's own variables, by name ----------
const SAVE_LETS = [
  'time', 'nextId', 'keep', 'won', 'stageN', 'stageCheckT', 'wageT', 'wagesUnpaid',
  'mood', 'ration', 'tax', 'goldT', 'settleT', 'leaveT', 'moodRate', 'aleBonus', 'aleCover', 'aleT', 'varietyBonus', 'relCover', 'relBonus',
  'crowdPen', 'fearGood', 'fearHard', 'fatBonus', 'sickPen', 'contentUntil', 'leftCount', 'returnT', 'fullGranary', 'starving', 'hungerT', 'jobT',
  'schoolLvl', 'schoolStudy', 'alePrice', 'taxTotal', 'feastUntil', 'doctorLvl', 'doctorStudy', 'warNow', 'indStage', 'indT', 'granaryOverT',
  'bugsOn', 'bugT', 'bugCalmT', 'oxFoodT', 'healers', 'soldierLvl', 'soldierStudy', 'solT', 'fireT', 'repT', 'rebuildQ',
  'raidTimer', 'raidCount', 'raidRouteI', 'enemyWallPlan', 'enemyWallT', 'nameSeq', 'growT', 'citT', 'sellT', 'healT', 'stealthT',
  'armyMarch', 'marchT', 'friendToldT', 'r4T', 'guardT', 'healthT', 'groupT'
];
const SAVE_CONSTS = { res: () => res, foodKinds: () => foodKinds, WEATHER: () => WEATHER, rally: () => rally, LORD: () => LORD };
const saveGet = {}, saveSet = {};
for (const n of SAVE_LETS) { try { saveGet[n] = new Function('return ' + n); saveSet[n] = new Function('v', n + ' = v'); saveGet[n](); } catch (e) { delete saveGet[n]; delete saveSet[n]; } }
const SAVE_SKIP_KEYS = { m3: 1 };   // (pictures the 3D view hangs on things; it makes them again)
const TREE_FIXED = { kind: 1, x: 1, y: 1, s: 1, pine: 1, seed: 1, tone: 1, c: 1, r: 1, k: 1 }, ROCK_FIXED = { kind: 1, x: 1, y: 1, s: 1, seed: 1, iron: 1, hid3: 1 }, BUSH_FIXED = { kind: 1, x: 1, y: 1, max: 1, seed: 1 };
// the trees are numbered once, before anything is cut down, so a save can name them
trees.forEach((t, i) => { t.k = i; });
// ---------- turning the game into plain data and back ----------
const isSkip = v => typeof v === 'function' || (v && typeof v === 'object' && (v.isObject3D || v.isMaterial || v.isTexture || v.isBufferGeometry || (typeof Node !== 'undefined' && v instanceof Node) || (typeof CanvasRenderingContext2D !== 'undefined' && v instanceof CanvasRenderingContext2D)));
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
function saveTags() {
  const tags = new Map();
  units.forEach((u, i) => tags.set(u, ['u', i])); structures.forEach((s, i) => tags.set(s, ['s', i])); farms.forEach((s, i) => tags.set(s, ['f', i]));
  REALM.rivals.forEach((R, i) => tags.set(R, ['R', i])); trees.forEach(t => tags.set(t, ['t', t.k])); rocks.forEach((r, i) => tags.set(r, ['r', i]));
  bushes.forEach((b, i) => tags.set(b, ['b', i])); fires.forEach((f, i) => tags.set(f, ['F', i]));
  for (const k in PAL) if (PAL[k] && typeof PAL[k] === 'object') tags.set(PAL[k], ['P', k]);
  if (typeof FEAST_BOX !== 'undefined') tags.set(FEAST_BOX, ['X', 0]);
  return tags;
}
function encodeGraph(root, tables, tags) {
  // pass 1: count how often each plain object is reached, so shared ones keep their sharing
  const count = new Map();
  const walk = v => {
    if (!v || typeof v !== 'object' || tags.has(v) || isSkip(v) || ArrayBuffer.isView(v)) return;
    const n = count.get(v); if (n) { count.set(v, n + 1); return; } count.set(v, 1);
    if (Array.isArray(v)) v.forEach(walk); else if (v instanceof Set) v.forEach(walk); else if (v instanceof Map) v.forEach((x, k) => { walk(k); walk(x); });
    else for (const k in v) if (!SAVE_SKIP_KEYS[k]) walk(v[k]);
  };
  const fields = o => { for (const k in o) if (!SAVE_SKIP_KEYS[k]) walk(o[k]); };
  for (const t of tables) for (const o of t) fields(o);
  walk(root);
  // pass 2: write it out
  const ids = new Map(); let nid = 1;
  const enc = v => {
    if (v === undefined) return undefined;
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : { $n: String(v) };
    if (isSkip(v)) return undefined;
    if (typeof v !== 'object') return undefined;
    const tg = tags.get(v); if (tg) return { $e: tg[0], k: tg[1] };
    if (ArrayBuffer.isView(v)) return { $T: v.constructor.name, d: b64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
    if (ids.has(v)) return { $r: ids.get(v) };
    const multi = (count.get(v) || 0) > 1, id = multi ? nid++ : 0; if (multi) ids.set(v, id);
    let out;
    if (Array.isArray(v)) { const a = v.map(x => { const e = enc(x); return e === undefined ? null : e; }); out = multi ? { $i: id, $A: a } : a; }
    else if (v instanceof Set) { out = { $S: [...v].map(enc) }; if (multi) out.$i = id; }
    else if (v instanceof Map) { out = { $M: [...v].map(([k, x]) => [enc(k), enc(x)]) }; if (multi) out.$i = id; }
    else { out = multi ? { $i: id } : {}; for (const k in v) { if (SAVE_SKIP_KEYS[k]) continue; const e = enc(v[k]); if (e !== undefined) out[k] = e; } }
    return out;
  };
  const encFields = o => { const out = {}; for (const k in o) { if (SAVE_SKIP_KEYS[k]) continue; const e = enc(o[k]); if (e !== undefined) out[k] = e; } return out; };
  const tablesOut = tables.map(t => t.map(encFields));
  return { tables: tablesOut, root: enc(root) };
}
function decodeGraph(data, resolve, shells) {
  const ids = new Map();
  const dec = v => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(dec);
    if (v.$n !== undefined) return Number(v.$n);
    if (v.$e !== undefined) return resolve(v.$e, v.k);
    if (v.$r !== undefined) return ids.get(v.$r);
    if (v.$T !== undefined) { const u8 = unb64(v.d), C = window[v.$T] || Uint8Array; return new C(u8.buffer, 0, u8.byteLength / (C.BYTES_PER_ELEMENT || 1)); }
    if (v.$A !== undefined) { const a = []; ids.set(v.$i, a); for (const x of v.$A) a.push(dec(x)); return a; }
    if (v.$S !== undefined) { const s = new Set(); if (v.$i) ids.set(v.$i, s); for (const x of v.$S) s.add(dec(x)); return s; }
    if (v.$M !== undefined) { const m = new Map(); if (v.$i) ids.set(v.$i, m); for (const [k, x] of v.$M) m.set(dec(k), dec(x)); return m; }
    const o = {}; if (v.$i) ids.set(v.$i, o);
    for (const k in v) if (k !== '$i') o[k] = dec(v[k]);
    return o;
  };
  data.tables.forEach((t, ti) => t.forEach((f, i) => { const sh = shells[ti][i]; for (const k in f) sh[k] = dec(f[k]); }));
  return dec(data.root);
}
// ---------- the whole game as one save ----------
function snapshotGame() {
  const t0 = performance.now(), tags = saveTags();
  const g = {}; for (const n in saveGet) g[n] = saveGet[n]();
  const c = {}; for (const n in SAVE_CONSTS) c[n] = SAVE_CONSTS[n]();
  const dyn = (o, fixed) => { const f = {}; for (const k in o) if (!fixed[k]) f[k] = o[k]; return f; };
  const root = {
    g, c, cam: { x: cam.x, y: cam.y, z: cam.z }, REALM: { on: REALM.on, rogueT: REALM.rogueT },
    trainQueue: trainQueue.slice(), growing: growing.slice(), stumps: stumps.map(s => ({ x: s.x, y: s.y, s: s.s })),
    trees: trees.map(t => [t.k, dyn(t, TREE_FIXED)]), rocks: rocks.map(r => dyn(r, ROCK_FIXED)), bushes: bushes.map(b => dyn(b, BUSH_FIXED)),
    blocked, gate, fog: FOG.seen, fogOn: FOG.on
  };
  const body = encodeGraph(root, [units, structures, farms, REALM.rivals], tags);
  const S = {
    format: SAVE.format, ver: SAVE.ver, fac: FACKEY, diff: DIFF.key, match: { rivals: MATCH.rivals, facs: MATCH.facs.slice(), friend: MATCH.friend, region: MATCH.region },
    sites: START_SITES.map(s => s.slice()), startAt: START_AT, random: START_RANDOM, rivalSites: RIVALS.sites.map(s => s.slice()), body
  };
  SAVE.lastMs = Math.round(performance.now() - t0);
  return S;
}
function saveMeta(S, name, id) {
  const R = REALM.rivals || [];
  return { id, name, when: Date.now(), fac: S.fac, facName: (FACTIONS[S.fac] || {}).name || S.fac, stage: stageN, stageName: (STAGES[stageN - 1] || {}).name || '',
    diff: S.diff, diffName: (DIFFS[S.diff] || {}).name || S.diff, rivals: R.length, minutes: Math.floor(time / 60), people: typeof myPeople === 'function' ? myPeople() : 0 };
}
// put the saved game back (the page has just been made with the saved starting places)
function restoreGame(S) {
  if (!S || S.format !== SAVE.format || !S.body) throw new Error('This is not a Stronghold Destroyer save.');
  DIFF = DIFFS[S.diff] || DIFF; Object.assign(MATCH, S.match || {});
  for (const n of ['banner']) { const e = document.getElementById(n); if (e) e.style.opacity = 0; }
  startGame(S.fac);   // the faction's own rules, sounds and look; everything it makes is replaced below
  // clear what a fresh start made
  units.length = 0; structures.length = 0; farms.length = 0; selection.clear();
  for (const a of [arrows, particles, floats, markers, stuckArrows, stuckStones]) if (a) a.length = 0;
  trainQueue.length = 0; growing.length = 0;
  try { if (R3D.available && R3D.resetModels) R3D.resetModels(); } catch (e) {}
  const B = S.body, treeByKey = new Map(); for (const t of trees) treeByKey.set(t.k, t);
  // everyone and everything, by its place in the saved lists
  const shells = B.tables.map(t => t.map(() => ({})));
  const resolve = (tag, k) => tag === 'u' ? shells[0][k] : tag === 's' ? shells[1][k] : tag === 'f' ? shells[2][k] : tag === 'R' ? shells[3][k]
    : tag === 't' ? (treeByKey.get(k) || null) : tag === 'r' ? (rocks[k] || null) : tag === 'b' ? (bushes[k] || null) : tag === 'F' ? (fires[k] || null)
    : tag === 'P' ? (PAL[k] || null) : tag === 'X' ? FEAST_BOX : null;
  const R = decodeGraph(B, resolve, shells);
  // the map: trees cut down, rocks quarried, bushes picked
  const alive = new Map(R.trees.map(([k, f]) => [k, f])); let missing = 0;
  for (let i = trees.length - 1; i >= 0; i--) { const t = trees[i]; if (!alive.has(t.k)) { t.gone = true; trees.splice(i, 1); } }
  for (const t of trees) Object.assign(t, alive.get(t.k));
  for (const [k] of alive) if (!treeByKey.has(k)) missing++;
  SAVE.treesMissing = missing;   // (trees the save has that this land did not make: always 0 when the land comes out the same)
  R.rocks.forEach((f, i) => { if (rocks[i]) Object.assign(rocks[i], f); });
  R.bushes.forEach((f, i) => { if (bushes[i]) Object.assign(bushes[i], f); });
  for (const u of shells[0]) units.push(u);
  for (const s of shells[1]) structures.push(s);
  for (const f of shells[2]) farms.push(f);
  REALM.rivals = shells[3]; REALM.on = R.REALM.on; REALM.rogueT = R.REALM.rogueT;
  for (const n in R.g) if (saveSet[n]) saveSet[n](R.g[n]);
  for (const n in R.c) { const o = SAVE_CONSTS[n] && SAVE_CONSTS[n](); if (!o) continue; if (n === 'rally') { for (const k in o) o[k] = null; } Object.assign(o, R.c[n]); }
  for (const q of R.trainQueue) trainQueue.push(q);
  for (const q of R.growing) growing.push(q);
  stumps.length = 0; for (const s of R.stumps) stumps.push(s);
  blocked.set(R.blocked); gate.set(R.gate);
  if (R.fog && FOG.seen && R.fog.length === FOG.seen.length) FOG.seen.set(R.fog); FOG.on = R.fogOn; FOG.dirty = true;
  if (typeof fogVer !== 'undefined') fogVer++;
  entryAt = null;
  // pictures and panels catch up
  palVer++; cam.z = R.cam.z; cam.x = R.cam.x; cam.y = R.cam.y;
  try { applyStageLocks(); } catch (e) {}
  try { UI.paintIcons(); UI.drawMini(); } catch (e) {}
  updateHud();
  return true;
}
// ---------- where saves are kept ----------
const SaveStore = (() => {
  let dbp = null, useLS = false;
  const open = () => dbp || (dbp = new Promise((ok, no) => {
    try { const r = indexedDB.open('sd-saves', 1); r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'id' }); if (!d.objectStoreNames.contains('data')) d.createObjectStore('data'); };
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); r.onblocked = () => no(new Error('blocked')); } catch (e) { no(e); }
  }));
  const tx = (stores, mode, fn) => open().then(db => new Promise((ok, no) => { const t = db.transaction(stores, mode), out = fn(...stores.map(s => t.objectStore(s))); t.oncomplete = () => ok(out && 'result' in out ? out.result : out); t.onerror = () => no(t.error); t.onabort = () => no(t.error || new Error('aborted')); }));
  const lsList = () => { try { return JSON.parse(localStorage.getItem('sd-save-list') || '[]') || []; } catch (e) { return []; } };
  const viaLS = () => useLS || typeof indexedDB === 'undefined';
  const fallback = fn => e => { useLS = true; return fn(); };
  return {
    where: () => viaLS() ? 'local storage' : 'IndexedDB',
    put(meta, S) {
      const lsPut = () => { const txt = JSON.stringify(S); localStorage.setItem('sd-save-' + meta.id, txt); const l = lsList().filter(m => m.id !== meta.id); l.push(meta); localStorage.setItem('sd-save-list', JSON.stringify(l)); return true; };
      if (viaLS()) return Promise.resolve().then(lsPut);
      return tx(['meta', 'data'], 'readwrite', (m, d) => { m.put(meta); d.put(S, meta.id); }).then(() => true, fallback(lsPut));
    },
    get(id) {
      const lsGet = () => { const t = localStorage.getItem('sd-save-' + id); return t ? JSON.parse(t) : null; };
      if (viaLS()) return Promise.resolve().then(lsGet);
      return tx(['data'], 'readonly', d => d.get(id)).then(v => v || lsGet(), fallback(lsGet));
    },
    list() {
      if (viaLS()) return Promise.resolve(lsList());
      return tx(['meta'], 'readonly', m => m.getAll()).then(v => (v || []).concat(lsList().filter(x => !(v || []).some(y => y.id === x.id))), fallback(lsList));
    },
    del(id) {
      const lsDel = () => { localStorage.removeItem('sd-save-' + id); localStorage.setItem('sd-save-list', JSON.stringify(lsList().filter(m => m.id !== id))); return true; };
      if (viaLS()) return Promise.resolve().then(lsDel);
      return tx(['meta', 'data'], 'readwrite', (m, d) => { m.delete(id); d.delete(id); }).then(() => { try { lsDel(); } catch (e) {} return true; }, fallback(lsDel));
    }
  };
})();
const canSave = () => started && !LEGACY && !!FACKEY && !won;
function saveGame(name, id) {
  if (!canSave()) return Promise.reject(new Error(won ? 'The game is over.' : 'Start a game first.'));
  const S = snapshotGame(), meta = saveMeta(S, name, id || ('s' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)));
  S.meta = meta; SAVE.lastKB = Math.round(JSON.stringify(S).length / 1024);
  return SaveStore.put(meta, S).then(() => meta);
}
function autoSave() { if (!canSave() || SAVE.busy) return Promise.resolve(null); SAVE.busy = true; SAVE.autoAt = time; return saveGame('Autosave', 'autosave').then(m => { SAVE.busy = false; refreshSaveList(); return m; }, e => { SAVE.busy = false; return null; }); }
// loading: the page is made again with the saved starting places, then the game is put back
function loadSave(id) {
  return SaveStore.get(id).then(S => {
    if (!S) throw new Error('That save could not be found.');
    try { sessionStorage.setItem('sd-load', JSON.stringify({ id, sites: S.sites, startAt: S.startAt, random: S.random })); } catch (e) { throw new Error('This browser would not keep the save open while the page reloads.'); }
    showBanner('Loading your saved game…', 6);
    setTimeout(() => { try { location.reload(); } catch (e) {} }, 60);
    return true;
  });
}
function finishPendingLoad() {
  let pend = null; try { pend = JSON.parse(sessionStorage.getItem('sd-load') || 'null'); } catch (e) {}
  if (!pend || !pend.id) return Promise.resolve(false);
  const cover = document.createElement('div'); cover.id = 'loadCover'; cover.textContent = 'Loading your saved game…'; document.body.appendChild(cover);
  return SaveStore.get(pend.id).then(S => {
    try { sessionStorage.removeItem('sd-load'); } catch (e) {}
    if (!S) throw new Error('That save could not be found.');
    restoreGame(S); cover.remove();
    showBanner(`Loaded <b>${(S.meta && S.meta.name) || 'your game'}</b>: stage ${stageN}, ${Math.floor(time / 60)} minutes in.`, 5);
    SAVE.autoAt = time; return true;
  }).catch(e => { cover.remove(); try { sessionStorage.removeItem('sd-load'); } catch (er) {} showBanner('The save could not be loaded: ' + (e && e.message || e), 6); return false; });
}
// ---------- export and import ----------
function exportSave(id) {
  return SaveStore.get(id).then(S => {
    if (!S) throw new Error('That save could not be found.');
    const nm = ((S.meta && S.meta.name) || 'save').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'save';
    const d = new Date((S.meta && S.meta.when) || Date.now()), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const filename = `Stronghold-${nm}-${stamp}.json`, text = JSON.stringify(S), blob = new Blob([text], { type: 'application/json' });
    const viaHost = (window.claude && typeof window.claude.use === 'function') ? Promise.resolve(window.claude.use('downloads')).catch(() => null) : Promise.resolve(null);
    return viaHost.then(dl => {
      if (dl && dl.save) return dl.save({ filename, data: blob }).then(() => filename, e => { if (e && e.code === 'declined') return null; throw new Error((e && e.message) || 'The file could not be saved.'); });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); return filename;
    });
  });
}
function importSaveText(text) {
  let S; try { S = JSON.parse(text); } catch (e) { return Promise.reject(new Error('That file is not a saved game.')); }
  if (!S || S.format !== SAVE.format || !S.body || !Array.isArray(S.sites)) return Promise.reject(new Error('That file is not a Stronghold Destroyer saved game.'));
  const old = S.meta || {}, meta = Object.assign({}, old, { id: 'i' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), name: (old.name || 'Imported game') + (/imported/i.test(old.name || '') ? '' : ' (imported)'), when: old.when || Date.now() });
  S.meta = meta; return SaveStore.put(meta, S).then(() => meta);
}
// ---------- the Saved games part of Settings ----------
const fmtWhen = t => { const d = new Date(t); try { return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return d.toString().slice(0, 21); } };
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let saveArm = { id: null, act: null, t: 0 };
function refreshSaveList() {
  const box = document.getElementById('saveList'); if (!box) return Promise.resolve();
  return SaveStore.list().then(list => {
    list.sort((a, b) => (a.id === 'autosave' ? -1 : b.id === 'autosave' ? 1 : b.when - a.when));
    box.innerHTML = list.length ? list.map(m => `<div class="saveRow" data-id="${escH(m.id)}"><div class="sInfo"><b>${escH(m.name)}</b><span>${escH(fmtWhen(m.when))}</span>`
      + `<span class="sSub">${escH(m.facName)} · Stage ${m.stage}${m.stageName ? ', the ' + escH(m.stageName) : ''} · ${escH(m.diffName)} · ${m.rivals} ${m.rivals === 1 ? 'rival' : 'rivals'} · ${m.minutes} min</span></div>`
      + `<div class="sBtns"><button data-sv="load">Load</button><button data-sv="export">Export</button><button data-sv="del">Delete</button></div></div>`).join('')
      : '<div class="saveNone">No saved games yet.</div>';
  }).catch(() => { box.innerHTML = '<div class="saveNone">Saved games are not available in this browser.</div>'; });
}
function saveNote(t, bad) { const n = document.getElementById('saveNote'); if (n) { n.textContent = t; n.classList.toggle('bad', !!bad); } }
(() => {
  if (LEGACY) return;
  const mp = document.getElementById('menuPop'); if (!mp) return;
  const sec = document.createElement('div'); sec.id = 'saveSec';
  sec.innerHTML = `<div class="saveHead">SAVED GAMES</div>
    <div class="row saveNew"><input id="saveName" type="text" maxlength="40" placeholder="Name this save" aria-label="Name for the new save"><button id="btnSaveNow">Save game</button></div>
    <div id="saveNote" role="status" aria-live="polite"></div>
    <div id="saveList"></div>
    <div class="row"><button id="btnImport">Import a save file</button><input id="saveFile" type="file" accept=".json,application/json" hidden></div>`;
  const quit = mp.querySelector('.quitRow'); if (quit) mp.insertBefore(sec, quit); else mp.appendChild(sec);
  const $ = id => document.getElementById(id);
  $('btnSaveNow').onclick = () => {
    const nm = ($('saveName').value || '').trim() || `${(FACTIONS[FACKEY] || {}).name || 'Game'}, stage ${stageN}`;
    saveNote('Saving…'); saveGame(nm).then(m => { $('saveName').value = ''; saveNote(`Saved "${m.name}".`); refreshSaveList(); }, e => saveNote((e && e.message) || 'The game could not be saved.', true));
  };
  $('saveName').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('btnSaveNow').click(); });
  $('btnImport').onclick = () => $('saveFile').click();
  $('saveFile').onchange = e => {
    const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader();
    rd.onload = () => importSaveText(String(rd.result)).then(m => { saveNote(`Imported "${m.name}". Tap Load to play it.`); refreshSaveList(); }, er => saveNote(er.message, true));
    rd.onerror = () => saveNote('That file could not be read.', true); rd.readAsText(f); e.target.value = '';
  };
  $('saveList').addEventListener('click', e => {
    const b = e.target.closest('button[data-sv]'), row = e.target.closest('.saveRow'); if (!b || !row) return;
    const id = row.dataset.id, act = b.dataset.sv, now = performance.now();
    const armed = saveArm.id === id && saveArm.act === act && now - saveArm.t < 5000;
    if (act === 'del') { if (!armed) { saveArm = { id, act, t: now }; b.textContent = 'Tap again'; return; } saveArm = { id: null }; SaveStore.del(id).then(() => { saveNote('Deleted.'); refreshSaveList(); }); return; }
    if (act === 'load') { if (started && !won && !armed) { saveArm = { id, act, t: now }; b.textContent = 'Tap again'; saveNote('Loading replaces the game you are playing. Tap again to load.'); return; }
      saveArm = { id: null }; saveNote('Loading…'); loadSave(id).catch(er => saveNote(er.message, true)); return; }
    if (act === 'export') { saveNote('Preparing the file…'); exportSave(id).then(fn => saveNote(fn ? `Exported as ${fn}.` : 'Export cancelled.'), er => saveNote(er.message, true)); }
  });
  // the list is read again each time Settings opens
  new MutationObserver(() => { if (!mp.hidden) { if (sec.parentNode !== mp) mp.insertBefore(sec, mp.querySelector('.quitRow')); saveNote(''); refreshSaveList(); $('btnSaveNow').disabled = !canSave(); $('saveName').disabled = !canSave(); } }).observe(mp, { attributes: true, attributeFilter: ['hidden'] });
  // the front page: load a saved game before starting a new one (its own panel, above the front page)
  const diff = document.getElementById('diff');
  if (diff) {
    const fp = document.createElement('div'); fp.id = 'loadPop'; fp.className = 'pop'; fp.hidden = true; fp.setAttribute('role', 'dialog'); fp.setAttribute('aria-label', 'Saved games');
    fp.innerHTML = '<button class="xbtn" id="loadPopX" aria-label="Close">&times;</button>'; document.body.appendChild(fp);
    const closeFp = () => { fp.hidden = true; };
    fp.addEventListener('click', e => { if (e.target.closest('#loadPopX')) closeFp(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !fp.hidden) closeFp(); });
    const fb = document.createElement('button'); fb.id = 'btnLoadFront'; fb.textContent = 'Load a saved game';
    fb.onclick = () => { fp.appendChild(sec); saveNote(''); $('btnSaveNow').disabled = $('saveName').disabled = true; fp.hidden = false; refreshSaveList(); };
    diff.insertAdjacentElement('beforebegin', fb);
  }
  // the autosave: every few game-minutes, and when the page is put away (closing the tab or switching apps on an iPad)
  setInterval(() => { if (canSave() && time - SAVE.autoAt >= SAVE.autoEvery) autoSave(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && canSave() && time - SAVE.autoAt > 20) autoSave(); });
  finishPendingLoad();
})();
