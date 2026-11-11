'use strict';
// Stronghold Destroyer — sound and music, made live in code.
// Loaded in order by index.html; all files share one global scope.

// ---------- sound and music: everything is synthesised live, no files ----------
const AudioSys = (() => {
  let ac = null, master, sfxBus, musicBus, ambBus, noiseBuf, lastCombat = -1e9, musicTimer = null;
  // Gerald: music and sound start very low, with the sound effects a little above the music
  let on = { sfx: true, music: true, musicVol: 0.15, sfxVol: 0.25, quiet: 1 };
  try { const s = JSON.parse(localStorage.getItem('sd-audio') || 'null'); if (s && typeof s.sfx === 'boolean') { on = Object.assign(on, s); if (!s.quiet) { on.musicVol = 0.15; on.sfxVol = 0.25; on.quiet = 1; } } } catch (e) {}
  const save = () => { try { localStorage.setItem('sd-audio', JSON.stringify(on)); } catch (e) {} };
  const last = {};
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function gainNode(v, dest) { const g = ac.createGain(); g.gain.value = v; g.connect(dest); return g; }
  function out(pan, dest) {
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; p.connect(dest); return p; }
    return dest;
  }
  function env(param, t, a, peak, dec) { param.setValueAtTime(0.0001, t); param.linearRampToValueAtTime(peak, t + a); param.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function tone(type, f, t, dur, vol, dest, o = {}) {
    const osc = ac.createOscillator(), g = ac.createGain(); osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    let node = osc;
    if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); node.connect(fl); node = fl; }
    node.connect(g); g.connect(dest); env(g.gain, t, o.a || 0.004, vol, dur);
    osc.start(t); osc.stop(t + (o.a || 0.004) + dur + 0.05);
    return osc;
  }
  function noise(t, dur, vol, dest, type, f, q, o = {}) {
    const src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; src.playbackRate.value = o.rate || 1; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q || 1;
    if (o.fTo) fl.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    src.connect(fl); fl.connect(g); g.connect(dest); env(g.gain, t, o.a || 0.002, vol, dur);
    src.start(t, Math.random() * 1.5); src.stop(t + (o.a || 0.002) + dur + 0.05);
  }
  const R = (a, b) => a + Math.random() * (b - a);
  // ----- sound effects -----
  const FX = {
    clash(t, d) { noise(t, 0.07, 0.45, d, 'bandpass', 3400, 2); for (const f of [1830, 2470, 3310]) tone('sine', f * R(0.94, 1.06), t, R(0.2, 0.32), 0.07, d); tone('triangle', 520 * R(0.9, 1.1), t, 0.06, 0.12, d); },
    stab(t, d) { noise(t, 0.09, 0.4, d, 'bandpass', 900, 1.5); tone('sine', 150, t, 0.1, 0.3, d, { to: 90 }); },
    woodHit(t, d) { noise(t, 0.08, 0.45, d, 'bandpass', 650, 3); tone('triangle', 230, t, 0.09, 0.3, d, { to: 150 }); },
    stoneHit(t, d) { noise(t, 0.12, 0.5, d, 'lowpass', 1400, 1); tone('sine', 95, t, 0.14, 0.35, d, { to: 60 }); },
    boom(t, d) { tone('sine', 75, t, 0.55, 0.9, d, { to: 38 }); noise(t, 0.45, 0.6, d, 'lowpass', 500, 1, { fTo: 120 }); tone('triangle', 140, t, 0.12, 0.3, d, { to: 70 }); },
    bow(t, d) { tone('triangle', 440, t, 0.13, 0.22, d, { to: 170 }); noise(t, 0.05, 0.1, d, 'highpass', 2500, 1); },
    thunk(t, d) { noise(t, 0.06, 0.35, d, 'bandpass', 420, 2); tone('sine', 190, t, 0.07, 0.22, d, { to: 120 }); },
    fall(t, d) { noise(t + 0.05, 0.28, 0.32, d, 'lowpass', 320, 1); tone('sine', 95, t + 0.05, 0.22, 0.3, d, { to: 48 }); },
    collapse(t, d) { noise(t, 1.4, 0.7, d, 'lowpass', 700, 1, { fTo: 150, a: 0.05 }); for (let i = 0; i < 6; i++) tone('sine', R(50, 90), t + i * R(0.08, 0.2), 0.3, 0.5, d, { to: 35 }); },
    chop(t, d) { tone('triangle', 330 * R(0.9, 1.1), t, 0.05, 0.28, d, { to: 220 }); noise(t, 0.04, 0.25, d, 'bandpass', 1300, 2); },
    hammer(t, d) { tone('sine', 1250 * R(0.95, 1.05), t, 0.09, 0.09, d); tone('triangle', 260, t, 0.05, 0.25, d, { to: 180 }); noise(t, 0.03, 0.2, d, 'bandpass', 2000, 2); },
    built(t, d) { tone('triangle', mtof(74), t, 0.35, 0.22, d); tone('triangle', mtof(81), t + 0.14, 0.5, 0.22, d); tone('sine', mtof(86), t + 0.28, 0.6, 0.12, d); },
    ready(t, d) { tone('sawtooth', mtof(57), t, 0.55, 0.16, d, { a: 0.05, lp: 1100 }); tone('sawtooth', mtof(64), t, 0.55, 0.1, d, { a: 0.05, lp: 1100 }); },
    bell(t, d) { for (const [f, v] of [[1320, 0.14], [1980, 0.07], [2640, 0.04]]) tone('sine', f, t, 1.3, v, d); },
    place(t, d) { tone('triangle', 200, t, 0.08, 0.3, d, { to: 140 }); noise(t, 0.05, 0.2, d, 'lowpass', 900, 1); },
    ack(t, d) { tone('sine', 520, t, 0.05, 0.12, d); tone('sine', 680, t + 0.06, 0.06, 0.12, d); },
    select(t, d) { tone('sine', 880, t, 0.04, 0.08, d); },
    warn(t, d) { tone('triangle', mtof(57), t, 0.18, 0.2, d); tone('triangle', mtof(53), t + 0.22, 0.3, 0.2, d); },
    cheer(t, d) { for (let i = 0; i < 26; i++) noise(t + R(0, 1.3), R(0.12, 0.3), R(0.14, 0.3), d, 'bandpass', R(700, 1600), 1.2, { a: 0.04 }); tone('sawtooth', mtof(62), t, 1.0, 0.1, d, { a: 0.2, lp: 900 }); },
    warhorn(t, d) {
      const horn = (f, st, len) => { const o = ac.createOscillator(), o2 = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), fl = ac.createBiquadFilter(), g = ac.createGain();
        o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.005; lfo.frequency.value = 5; lg.gain.value = 2.5; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
        fl.type = 'lowpass'; fl.frequency.setValueAtTime(300, st); fl.frequency.linearRampToValueAtTime(900, st + 0.4); o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(d);
        g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(0.22, st + 0.25); g.gain.setValueAtTime(0.22, st + len - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, st + len);
        for (const x of [o, o2, lfo]) { x.start(st); x.stop(st + len + 0.05); } };
      horn(mtof(50), t, 1.5); horn(mtof(57), t + 1.2, 1.4);
      for (let i = 0; i < 6; i++) { tone('sine', 85, t + 0.2 + i * 0.32, 0.25, 0.5, d, { to: 45 }); noise(t + 0.2 + i * 0.32, 0.1, 0.2, d, 'lowpass', 400, 1); }
    },
    victory(t, d) { [62, 66, 69, 74].forEach((m, i) => tone('triangle', mtof(m), t + i * 0.16, 0.6, 0.22, d)); for (const m of [62, 66, 69, 74]) tone('sawtooth', mtof(m), t + 0.7, 1.8, 0.07, d, { a: 0.1, lp: 1400 }); },
    crackle(t, d) { noise(t, R(0.008, 0.025), R(0.08, 0.2), d, 'highpass', R(2000, 4500), 1); if (Math.random() < 0.15) noise(t, 0.05, 0.12, d, 'bandpass', 600, 2); },
    step(t, d) { noise(t, 0.07, 0.14, d, 'lowpass', R(180, 280), 1); tone('sine', R(60, 80), t, 0.05, 0.08, d); },
    murmur(t, d) { for (let i = 0; i < 5; i++) noise(t + R(0, 0.8), R(0.15, 0.35), R(0.025, 0.05), d, 'bandpass', R(320, 900), 4, { a: 0.05 }); },
    triumph(t, d) { [69, 74, 78, 81].forEach((m, i) => tone('triangle', mtof(m), t + i * 0.11, 0.45, 0.18, d)); tone('sawtooth', mtof(62), t + 0.44, 1.0, 0.07, d, { a: 0.08, lp: 1300 }); tone('sawtooth', mtof(69), t + 0.44, 1.0, 0.05, d, { a: 0.08, lp: 1300 }); },
    defeat(t, d) { for (const m of [50, 53, 57]) tone('sawtooth', mtof(m), t, 2.8, 0.09, d, { a: 0.3, lp: 600, lpTo: 200 }); tone('sine', 55, t, 2.5, 0.3, d); }
  };
  const MIN_GAP = { clash: 0.05, stab: 0.05, woodHit: 0.08, stoneHit: 0.08, bow: 0.06, thunk: 0.06, fall: 0.1, chop: 0.12, hammer: 0.15, select: 0.08, ack: 0.1, cheer: 1, warhorn: 3, built: 0.3, ready: 0.4, bell: 0.5, warn: 2, boom: 0.15, collapse: 0.4, place: 0.1, crackle: 0.03, step: 0.08, murmur: 1, triumph: 2 };
  function play(name, x, y, vol = 1) {
    if (!ac || !on.sfx || !FX[name]) return;
    const now = ac.currentTime; if (last[name] && now - last[name] < (MIN_GAP[name] || 0.05)) return; last[name] = now;
    let pan = 0, v = vol;
    if (x !== undefined) {
      const sx = (x - cam.x) * cam.z, sy = (y - cam.y) * cam.z, m = 240;
      if (sx < -m || sx > vw + m || sy < -m || sy > vh + m) return;   // only what is near the screen
      const off = Math.max(0, -sx, sx - vw, -sy, sy - vh); v *= 1 - off / m * 0.8; pan = clamp(sx / vw * 2 - 1, -0.8, 0.8) ;
      v *= clamp(0.55 + cam.z * 0.4, 0.5, 1.1);
    }
    const g = gainNode(v, sfxBus); FX[name](now + 0.005, out(pan, g));
    setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 4000);
  }
  // ----- ambience: wind and birds -----
  function startAmbience() {
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 420; fl.Q.value = 0.6;
    const g = ac.createGain(); g.gain.value = 0.2;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg); lg.connect(fl.frequency);
    const lfo2 = ac.createOscillator(), lg2 = ac.createGain(); lfo2.frequency.value = 0.11; lg2.gain.value = 0.08; lfo2.connect(lg2); lg2.connect(g.gain);
    src.connect(fl); fl.connect(g); g.connect(ambBus); src.start(); lfo.start(); lfo2.start();
    const bird = () => {
      if (ac && on.sfx && !battle()) {
        const t = ac.currentTime + 0.05, d = out(R(-0.7, 0.7), gainNode(R(0.25, 0.55), ambBus)), n = 2 + Math.floor(Math.random() * 4), base = R(2400, 3600);
        for (let i = 0; i < n; i++) tone('sine', base * R(0.9, 1.1), t + i * R(0.09, 0.16), 0.07, 0.12, d, { to: base * R(1.1, 1.35) });
      }
      setTimeout(bird, R(2500, 8000));
    };
    setTimeout(bird, 3000);
  }
  // ----- music: a theme for each civilization, real plucked strings, hurdy-gurdy drone, stone-hall echo -----
  const THEMES = {
    title:   { scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 2, 4], [6, 1, 3], [3, 5, 0], [0, 2, 4]], calm: { steps: 6, bpm: 70 }, battle: { steps: 8, bpm: 112 } },
    legion:  { scale: [0, 2, 3, 5, 7, 8, 10], chords: [[0, 2, 4], [5, 0, 2], [6, 1, 3], [0, 2, 4], [3, 5, 0], [5, 0, 2], [4, 6, 1], [0, 2, 4]], calm: { steps: 8, bpm: 84, march: true }, battle: { steps: 8, bpm: 128 } },
    harvest: { scale: [0, 2, 4, 5, 7, 9, 10], chords: [[0, 2, 4], [6, 1, 3], [3, 5, 0], [0, 2, 4], [4, 6, 1], [3, 5, 0], [6, 1, 3], [0, 2, 4]], calm: { steps: 6, bpm: 104, jig: true }, battle: { steps: 8, bpm: 120 } },
    wardens: { scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 2, 4], [3, 5, 0], [6, 1, 3], [0, 2, 4], [4, 6, 1], [3, 5, 0], [2, 4, 6], [0, 2, 4]], calm: { steps: 6, bpm: 62, slow: true }, battle: { steps: 8, bpm: 100 }, bells: true }
  };
  let theme = THEMES.title, themeName = 'title';
  const deg = (d, oct) => 62 + 12 * (oct + Math.floor(d / 7)) + theme.scale[((d % 7) + 7) % 7];
  let step = 0, bar = 0, nextT = 0, mode = 'calm', motif = null, drone = null, melDeg = 2;
  const battle = () => performance.now() - lastCombat < 7000;
  // plucked string, modelled the way a real string vibrates (Karplus-Strong); cached per note
  const ksCache = {};
  function ksBuf(m, bright) {
    const key = m + ':' + bright; if (ksCache[key]) return ksCache[key];
    const sr = ac.sampleRate, N = Math.max(2, Math.round(sr / mtof(m) - 0.5)), len = Math.floor(sr * 2.4), b = ac.createBuffer(1, len, sr), d = b.getChannelData(0);
    const ring = new Float32Array(N); for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    for (let p = 0; p < (bright ? 1 : 3); p++) for (let i = 0; i < N; i++) ring[i] = 0.5 * (ring[i] + ring[(i + 1) % N]);
    const decay = 0.9968 - Math.max(0, m - 60) * 0.00035;
    for (let i = 0, idx = 0; i < len; i++) { const nx = (idx + 1) % N, v = ring[idx]; d[i] = v; ring[idx] = decay * 0.5 * (v + ring[nx]); idx = nx; }
    return ksCache[key] = b;
  }
  function pluck(m, t, vol, len = 1.6, bright = 0) {
    const src = ac.createBufferSource(), g = ac.createGain(), fl = ac.createBiquadFilter();
    src.buffer = ksBuf(m, bright); fl.type = 'lowpass'; fl.frequency.value = bright ? 5200 : 3200;
    src.connect(fl); fl.connect(g); g.connect(musicBus);
    g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + len * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.start(t); src.stop(t + len + 0.05);
  }
  function flute(m, t, len, vol) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = mtof(m); o2.frequency.value = mtof(m) * 2;
    lfo.frequency.value = 5.2; lg.gain.value = mtof(m) * 0.006; lfo.connect(lg); lg.connect(o.frequency);
    const g2 = ac.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(g); o.connect(g); g.connect(musicBus);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.15); g.gain.setValueAtTime(vol, t + len * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    for (const x of [o, o2, lfo]) { x.start(t); x.stop(t + len + 0.05); }
    noise(t, 0.1, vol * 0.3, musicBus, 'bandpass', mtof(m) * 2, 3);
  }
  function bell(m, t) { for (const [r, v, dcy] of [[1, 0.09, 3.2], [2.76, 0.035, 2.2], [5.4, 0.018, 1.3], [0.5, 0.05, 3.5]]) tone('sine', mtof(m) * r, t, dcy, v, musicBus); }
  function drum(t, v, low = true) { tone('sine', low ? 92 : 165, t, 0.26, v, musicBus, { to: low ? 46 : 92 }); noise(t, 0.07, v * 0.35, musicBus, 'lowpass', low ? 520 : 1400, 1); }
  function snare(t, v) { noise(t, 0.13, v, musicBus, 'bandpass', 1900, 0.8); tone('triangle', 215, t, 0.05, v * 0.6, musicBus, { to: 150 }); }
  function makeMotif(len) {
    const notes = []; let d = melDeg;
    for (let i = 0; i < len; i++) { d = clamp(d + [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(Math.random() * 8)], -1, 9); notes.push(d); }
    return notes;
  }
  function startDrone() { // hurdy-gurdy: buzzing bowed strings on the root and fifth
    const mk = (m, v, formant) => {
      const o = ac.createOscillator(), o2 = ac.createOscillator(), pk = ac.createBiquadFilter(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = mtof(m); o2.frequency.value = mtof(m) * 1.003;
      pk.type = 'peaking'; pk.frequency.value = formant; pk.gain.value = 9; pk.Q.value = 2.2; lp.type = 'lowpass'; lp.frequency.value = 1150;
      o.connect(pk); o2.connect(pk); pk.connect(lp); lp.connect(g); g.connect(musicBus);
      g.gain.value = 0; g.gain.linearRampToValueAtTime(v, ac.currentTime + 5); o.start(); o2.start(); return g;
    };
    drone = [mk(38, 0.034, 700), mk(45, 0.02, 950), mk(50, 0.0, 1400)];
  }
  function scheduleStep(t) {
    const md = mode === 'battle' ? theme.battle : theme.calm, steps = md.steps, beatLen = 60 / md.bpm / 2;
    const chord = theme.chords[bar % theme.chords.length], s = step;
    if (s === 0) {
      pluck(deg(chord[0], -2), t, 0.22, md.slow ? 3 : 2);                                     // bass string
      if (mode === 'calm' && bar % 4 === 0 && !md.jig) flute(deg(chord[2], 1), t + beatLen * 2, beatLen * (steps - 1.5), md.slow ? 0.075 : 0.06);
      if (theme.bells && mode === 'calm' && bar % 4 === 0) bell(deg(chord[0], 0), t);
      if (bar % 4 === 0) motif = makeMotif(steps);
    }
    if ((md.march || mode === 'battle') && s === 4) pluck(deg(chord[2], -2), t, 0.15, 1.2);
    const rhythm = mode === 'battle' ? [1, 0, 1, 1, 1, 0, 1, 1] : md.jig ? [1, 0, 1, 1, 0, 1] : md.march ? [1, 0, 1, 1, 1, 0, 1, 0] : md.slow ? [1, 0, 0, 1, 0, 1] : [1, 0, 1, 1, 1, 0];
    if (motif && rhythm[s] && Math.random() < (mode === 'battle' ? 0.9 : 0.82)) {
      let d = motif[s % motif.length] + (bar % 4 === 2 ? 1 : 0);
      if (s === 0 || (!md.march && s === steps - 2)) d = chord.reduce((best, c) => { const cand = c + 7 * Math.round((d - c) / 7); return Math.abs(cand - d) < Math.abs(best - d) ? cand : best; }, chord[0]);
      melDeg = d;
      pluck(deg(d, 0), t, mode === 'battle' ? 0.17 : 0.15, mode === 'battle' ? 0.6 : md.jig ? 0.7 : md.slow ? 2.4 : 1.6, md.jig ? 1 : 0);
      if (mode === 'calm' && s === 0 && Math.random() < 0.5) pluck(deg(d - 2, 0), t + 0.025, 0.08, 1.5);   // a third below
    }
    if (mode === 'battle') {
      if (s === 0 || s === 4) drum(t, 0.5); if (s === 2 || s === 6) snare(t, 0.12); if (s === 7) drum(t, 0.16, false);
      if (s % 2 === 1) noise(t, 0.03, 0.05, musicBus, 'highpass', 6000, 1);
    } else if (md.march) { if (s === 0 || s === 4) drum(t, 0.2); if (s === 2 || s === 6) snare(t, 0.07); if (s === 7 && bar % 2) snare(t, 0.04); }
    else if (md.jig) { if (s === 0) drum(t, 0.18); if (s === 3) drum(t, 0.1, false); }
    else if (s === 0) drum(t, md.slow ? 0.12 : 0.15);
    step++;
    if (step >= steps) {
      step = 0; bar++;
      const want = battle() ? 'battle' : 'calm';
      if (want !== mode) { mode = want; if (drone) drone[2].gain.linearRampToValueAtTime(mode === 'battle' ? 0.03 : 0, t + 1); }
    }
    return beatLen;
  }
  function setTheme(name) { if (!THEMES[name]) return; theme = THEMES[name]; themeName = name; bar = 0; step = 0; motif = null; }
  function startMusic() {
    startDrone(); nextT = ac.currentTime + 0.3;
    musicTimer = setInterval(() => { if (!ac) return; while (nextT < ac.currentTime + 0.25) nextT += scheduleStep(nextT); }, 60);
  }
  function stopMusic(fade = 2) { if (!ac) return; clearInterval(musicTimer); musicTimer = null; musicBus.gain.linearRampToValueAtTime(0, ac.currentTime + fade); }
  const MUSIC_BASE = 0.85, SFX_BASE = 0.9, AMB_BASE = 0.3;
  const musicLevel = () => on.music && (musicTimer || !ac) ? MUSIC_BASE * on.musicVol : 0;
  const sfxLevel = () => on.sfx ? SFX_BASE * on.sfxVol : 0, ambLevel = () => on.sfx ? AMB_BASE * on.sfxVol : 0;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ac = new AC(); } catch (e) { ac = null; return; }
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
    master = gainNode(0.9, comp);
    sfxBus = gainNode(sfxLevel(), master); musicBus = gainNode(on.music ? MUSIC_BASE * on.musicVol : 0, master); ambBus = gainNode(ambLevel(), master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // stone-hall echo: a generated reverb tail shared by music and sound
    const len = Math.floor(ac.sampleRate * 2.6), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45; d[i] = lp * Math.pow(1 - i / len, 3.4); } }
    const verb = ac.createConvolver(); verb.buffer = ir; verb.connect(gainNode(0.8, master));
    const ms = ac.createGain(); ms.gain.value = 0.34; musicBus.connect(ms); ms.connect(verb);
    const ss = ac.createGain(); ss.gain.value = 0.12; sfxBus.connect(ss); ss.connect(verb);
    startAmbience(); startMusic();
  }
  function applyLevels(fade = 0.25) {
    if (!ac) return; const t = ac.currentTime;
    musicBus.gain.linearRampToValueAtTime(musicLevel(), t + fade); sfxBus.gain.linearRampToValueAtTime(sfxLevel(), t + fade); ambBus.gain.linearRampToValueAtTime(ambLevel(), t + fade);
  }
  function setOn(kind, v) { on[kind] = v; save(); applyLevels(); }
  function setVol(kind, v) { on[kind === 'music' ? 'musicVol' : 'sfxVol'] = clamp(v, 0, 1); save(); applyLevels(0.1); }
  // the living world around the camera: campfire, marching feet, the murmur of town
  let crackleT = 0, stepT = 0, murmurT = 2;
  function ambientTick(dt, info) {
    if (!ac || !on.sfx) return;
    for (const f of info.fires) { crackleT -= dt; if (crackleT <= 0) { crackleT = R(0.04, 0.22); play('crackle', f.x, f.y); } }
    if (info.marching > 0) { stepT -= dt; if (stepT <= 0) { stepT = 1 / Math.min(9, 1.6 + info.marching * 1.2); play('step', info.mx, info.my); } }
    if (info.town) { murmurT -= dt; if (murmurT <= 0) { murmurT = R(1.5, 4); play('murmur', info.town.x, info.town.y); } }
  }
  let an = null;
  function debugLevel() { // test hook: measures the live output level
    if (!ac) return null;
    if (!an) { an = ac.createAnalyser(); an.fftSize = 2048; master.connect(an); }
    const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d);
    let pk = 0, sq = 0; for (const v of d) { pk = Math.max(pk, Math.abs(v)); sq += v * v; }
    return { peak: pk, rms: Math.sqrt(sq / d.length), state: ac.state, music: !!musicTimer, mode };
  }
  let rainG = null, rainF = null;
  function setRain(level, wind) {
    if (!ac || !noiseBuf) return;
    if (!rainG) { const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; rainF = ac.createBiquadFilter(); rainF.type = 'highpass'; rainF.frequency.value = 900; rainG = ac.createGain(); rainG.gain.value = 0; src.connect(rainF); rainF.connect(rainG); rainG.connect(ambBus); src.start(); }
    rainG.gain.setTargetAtTime(Math.min(1, level) * 0.55 + wind * 0.08, ac.currentTime, 0.8);
  }
  return { setRain, setTheme, theme: () => themeName, setVol, vol: k => on[k === 'music' ? 'musicVol' : 'sfxVol'], ambientTick, debugLevel, init, play, setOn, isOn: k => on[k], combat(x, y) { const sx = (x - cam.x) * cam.z, sy = (y - cam.y) * cam.z; if (sx > -200 && sx < vw + 200 && sy > -200 && sy < vh + 200) lastCombat = performance.now(); }, stopMusic, ui: n => play(n) };
})();
function refreshSoundButtons() {
  document.getElementById('btnMusic').textContent = 'Music: ' + (AudioSys.isOn('music') ? 'On' : 'Off');
  document.getElementById('btnSound').textContent = 'Sound: ' + (AudioSys.isOn('sfx') ? 'On' : 'Off');
}

