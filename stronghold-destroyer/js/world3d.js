'use strict';
// Stronghold Destroyer — the 3D world (three.js).
// Loaded in order by index.html; all files share one global scope.

// ---------- 3D world (three.js): lit terrain, models, shadows, rotating camera ----------
// The simulation stays in flat map coordinates (x across, y down the map). The 3D view maps
// map x -> X, map y -> Z, and adds height on Y. If 3D cannot start, the 2D view is used.
const R3D = (() => {
  const T = window.THREE;
  const available = !!T && (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  let active = false, ready = false, renderer, scene, camera, sun, fill, sky, clouds3, glCanvas, groundMesh;
  // one fixed camera: looking down at 40 degrees above the ground, turned 45 degrees so buildings show two faces,
  // as the sheet draws them. Only zoom changes. (40 degrees keeps the unit pictures, drawn from a little above, natural.)
  const CAM_YAW = Math.PI / 4, CAM_PITCH = 40 * Math.PI / 180;
  const yaw = CAM_YAW, pitch = CAM_PITCH;
  const hN = available ? makeNoise(77) : null;
  const heightAt = (x, z) => { let h = elevAt(x, z); if (pond) { const d = Math.hypot((x - pond.x) / pond.rx, (z - pond.y) / pond.ry); if (d < 1.25) h -= 9 * (1 - ease(clamp((d - 0.55) / 0.7, 0, 1))); } return h; };
  const C = hex => new T.Color(hex).convertSRGBToLinear();
  const matCache = {};
  const texCache = {};
  function genTex(name, size, paint, rep = 1) {
    if (texCache[name]) return texCache[name];
    const c = document.createElement('canvas'); c.width = c.height = size; paint(c.getContext('2d'), size, mulberry32(size * 7 + name.length));
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.encoding = T.sRGBEncoding; return texCache[name] = t;
  }
  // heraldry from Gerald's sheets: a gold lion rampant on crimson for his army; an ember tower on charcoal for the Black Stone foe
  const emblemTex = (team, bg) => genTex('emblem-' + team + (bg || ''), 128, (g, n) => {
    g.fillStyle = bg || (team === 'enemy' ? ENEMY_COL : ARMY.crimson); g.fillRect(0, 0, n, n);
    for (let x = 0; x < n; x++) { const f = Math.sin(x / n * Math.PI * 7) * 0.5 + Math.sin(x / n * Math.PI * 17 + 1) * 0.2; g.fillStyle = f > 0 ? `rgba(255,220,200,${f * 0.09})` : `rgba(0,0,0,${-f * 0.22})`; g.fillRect(x, 0, 1, n); }   // folds
    for (let y = 0; y < n; y += 2) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, y, n, 1); } for (let x = 0; x < n; x += 2) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(x, 0, 1, n); }   // weave
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * n, Math.random() * n, 2, 1); }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, n - 5, n, 5); g.fillStyle = 'rgba(217,169,58,0.8)'; g.fillRect(0, n - 9, n, 2);   // a dark hem with a gold stripe
    if (team === 'enemy') drawTowerEmblem(g, n / 2, n / 2, n * 0.8, ENEMY_TRIM); else drawLion(g, n / 2, n * 0.52, n * 0.86, ARMY.gold);
  }, 1);
  // brushed, scratched steel; a crimson weave with soft fold shading; grained leather - painted here, no files needed
  const steelTex = () => genTex('steel', 256, (g, n, R) => { const gr = g.createLinearGradient(0, 0, 0, n); gr.addColorStop(0, '#f4f6f8'); gr.addColorStop(0.5, '#d8dde2'); gr.addColorStop(1, '#eef1f4'); g.fillStyle = gr; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 900; i++) { const y = R() * n, l = 20 + R() * 90, x = R() * n; g.strokeStyle = `rgba(${R() < 0.5 ? '255,255,255' : '90,96,104'},${0.05 + R() * 0.1})`; g.lineWidth = 0.6 + R() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (R() - 0.5) * 3); g.stroke(); }
    for (let i = 0; i < 70; i++) { const x = R() * n, y = R() * n, a = R() * 6.28, l = 4 + R() * 16; g.strokeStyle = `rgba(60,64,70,${0.25 + R() * 0.3})`; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(80,70,60,${0.05 + R() * 0.08})`; g.beginPath(); g.arc(R() * n, R() * n, 3 + R() * 10, 0, 6.28); g.fill(); } }, 1);
  const leatherTex = () => genTex('leather', 128, (g, n, R) => { g.fillStyle = '#d9d0c4'; g.fillRect(0, 0, n, n); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${R() * 0.12})`; g.fillRect(R() * n, R() * n, 1 + R() * 2, 1); }
    for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(60,40,20,${0.12 + R() * 0.15})`; g.lineWidth = 0.8; g.beginPath(); const x = R() * n, y = R() * n; g.moveTo(x, y); g.quadraticCurveTo(x + R() * 20 - 10, y + R() * 20 - 10, x + R() * 30 - 15, y + R() * 30 - 15); g.stroke(); } }, 2);
  const fabricTex = () => genTex('fabric', 64, (g, n, R) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y += 2) { g.fillStyle = `rgba(0,0,0,${0.05 + R() * 0.05})`; g.fillRect(0, y, n, 1); }
    for (let x = 0; x < n; x += 2) { g.fillStyle = `rgba(0,0,0,${0.04 + R() * 0.04})`; g.fillRect(x, 0, 1, n); }
    for (let i = 0; i < 160; i++) { g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'; g.fillRect(R() * n, R() * n, 2, 1); } }, 2);
  const mailTex = () => genTex('mail', 64, (g, n) => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, n, n);
    for (let y = 0, row = 0; y < n; y += 4, row++) for (let x = (row % 2) * 2; x < n; x += 4) { g.strokeStyle = '#e8e8e8'; g.lineWidth = 1; g.beginPath(); g.arc(x + 1, y + 1, 1.6, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#4a4a4a'; g.fillRect(x + 0.6, y + 0.6, 0.9, 0.9); } }, 3);
  const leafTex = () => genTex('leaf', 128, (g, n, R) => { g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 700; i++) { const x = R() * n, y = R() * n, r = 2 + R() * 4; g.fillStyle = R() < 0.5 ? 'rgba(40,40,40,0.5)' : 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x, y, r, r * 0.6, R() * 3, 0, Math.PI * 2); g.fill(); } }, 1);
  const waterNormal = () => genTex('waterN', 128, (g, n, R) => { const img = g.createImageData(n, n), d = img.data, wn = makeNoise(5);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const h = (u, v) => wn(u / 9, v / 9) + 0.5 * wn(u / 4 + 20, v / 4); const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1), i = (y * n + x) * 4;
      d[i] = 128 + dx * 160; d[i + 1] = 128 + dy * 160; d[i + 2] = 255; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); }, 6);
  let envCube = null, gmatRef = null;
  function std(hex, o = {}) { const m = new T.MeshStandardMaterial(Object.assign({ color: C(hex), roughness: 0.85, metalness: 0 }, o)); if (envCube && (o.metalness || 0) >= 0.45) { m.envMap = envCube; m.envMapIntensity = 0.85; } return m; }
  function texMat(name, rx, ry, tint, o = {}) {
    const key = name + rx.toFixed(2) + ry.toFixed(2) + (tint || '');
    if (matCache[key]) return matCache[key];
    const M = mats(), tex = new T.CanvasTexture(M[name]._canvas);
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(rx, ry); tex.encoding = T.sRGBEncoding; tex.anisotropy = 8;
    return matCache[key] = new T.MeshStandardMaterial(Object.assign({ map: tex, bumpMap: tex, bumpScale: name === 'plaster' ? 0.4 : 1.1, color: tint ? C(tint) : 0xffffff, roughness: 0.92 }, o));
  }
  const stoneM = (w, h) => texMat('stone', Math.max(0.25, w / 72), Math.max(0.25, h / 54));
  const woodVM = (w, h) => texMat('woodV', Math.max(1, w / 24), Math.max(1, h / 64));
  const woodHM = (w, h) => texMat('woodH', Math.max(1, w / 64), Math.max(1, h / 24));
  const thatchM = (w, h) => texMat('thatch', Math.max(1, w / 32), Math.max(1, h / 24));
  const plasterM = (w, h) => texMat('plaster', Math.max(1, w / 40), Math.max(1, h / 40));
  function mesh(geo, mat, x = 0, y = 0, z = 0, cast = true) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; return m; }
  const box = (w, h, d, mat, x, y, z) => mesh(new T.BoxGeometry(w, h, d), mat, x, y, z);
  const cyl = (rt, rb, h, mat, x, y, z, seg = 10) => mesh(new T.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
  const sph = (r, mat, x, y, z, seg = 12) => mesh(new T.SphereGeometry(r, seg, Math.max(6, seg * 0.7 | 0)), mat, x, y, z);
  // merge several geometries (with transforms and colours) into one, for instanced scenery
  function merge(parts) {
    const pos = [], nor = [], col = [], uvs = [];
    for (const { geo, m, color } of parts) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m);
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      const uv = g.attributes.uv ? g.attributes.uv.array : null; for (let i = 0, j = 0; i < p.length; i += 3, j += 2) uvs.push(uv ? uv[j] * 3 : 0, uv ? uv[j + 1] * 3 : 0);
      for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); const c = typeof color === 'function' ? color(p[i], p[i + 1], p[i + 2]) : color; col.push(c.r, c.g, c.b); }
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new T.Float32BufferAttribute(col, 3)); out.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    return out;
  }
  const M4 = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(sx, sy, sz));

  // ---------- setup ----------
  function init() {
    glCanvas = document.createElement('canvas'); glCanvas.id = 'gl';
    glCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    const view = document.getElementById('view'); view.insertBefore(glCanvas, view.firstChild);
    renderer = new T.WebGLRenderer({ canvas: glCanvas, antialias: true });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    scene = new T.Scene(); scene.background = C('#b7c6cc'); scene.fog = new T.Fog(C('#b7c6cc'), 1100, 3200);
    loadGlbModels();
    camera = new T.PerspectiveCamera(38, 1, 10, 7000);
    scene.add(new T.HemisphereLight(C('#d6e6ff'), C('#4d5a2c'), 0.62));
    try {   // a small painted sky for metal to reflect: helmets, mail, blades and iron catch the light
      const face = (top, bottom, mid) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
        gr.addColorStop(0, top); if (mid) gr.addColorStop(0.5, mid); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; };
      const side = () => face('#6f97cf', '#5a6a38', '#e4e6dc');
      envCube = new T.CubeTexture([side(), side(), face('#5f8fd0', '#7fa6da'), face('#55633a', '#4a5732'), side(), side()]);
      envCube.encoding = T.sRGBEncoding; envCube.needsUpdate = true;
    } catch (e) { envCube = null; }
    sun = new T.DirectionalLight(C('#fff0d2'), 1.75); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -760, right: 760, top: 760, bottom: -760, near: 10, far: 3400 });
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
    scene.add(sun); scene.add(sun.target);
    fill = new T.DirectionalLight(C('#a9bfe0'), 0.38); scene.add(fill); scene.add(fill.target);
    sky = new T.Mesh(new T.SphereGeometry(6000, 32, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color('#4f86c9') }, mid: { value: new T.Color('#bcd3e3') }, bot: { value: new T.Color('#b7c6cc') } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vW; void main(){ float h = normalize(vW - cameraPosition).y; vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h, 0.0, 1.0), 0.55)) : bot; gl_FragColor = vec4(c, 1.0); }' }));
    sky.renderOrder = -1; scene.add(sky);
    buildGround(); buildScenery(); buildFx(); buildWater(); buildGrass();
    ready = true;
  }
  function buildGround() {
    const geo = new T.PlaneGeometry(MW + 1400, MH + 1400, 300, 190); geo.rotateX(-Math.PI / 2); geo.translate(MW / 2, 0, MH / 2);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, heightAt(x, z)); uv.setXY(i, x / MW, 1 - z / MH); }
    geo.computeVertexNormals();
    const tex = new T.CanvasTexture(terrain); tex.encoding = T.sRGBEncoding; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    // a fine repeating layer of grass and soil grain keeps the ground crisp when you zoom in or tilt low
    const det = document.createElement('canvas'); det.width = det.height = 256;
    { const g = det.getContext('2d'), R = mulberry32(4242); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { const x = R() * 256, y = R() * 256, l = 2 + R() * 5, a = -1.9 + R() * 0.8, v = R() < 0.5 ? 40 + R() * 40 : 150 + R() * 70;
        g.strokeStyle = `rgba(${v},${v},${v},0.55)`; g.lineWidth = 0.7 + R() * 0.6;
        for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); } }
      for (let i = 0; i < 900; i++) { const x = R() * 256, y = R() * 256, v = R() < 0.5 ? 60 : 175; g.fillStyle = `rgba(${v},${v},${v},0.35)`; g.fillRect(x, y, 1.4, 1.4); } }
    const detTex = new T.CanvasTexture(det); detTex.wrapS = detTex.wrapT = T.RepeatWrapping; detTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const gmat = new T.MeshStandardMaterial({ map: tex, roughness: 0.97 });
    gmatRef = gmat;
    gmat.onBeforeCompile = sh => {
      gmat.userData.sh = sh; sh.uniforms.snowAmt = { value: 0 };
      sh.uniforms.detailMap = { value: detTex }; sh.uniforms.detailRep = { value: new T.Vector2(MW / 26, MH / 26) };
      sh.fragmentShader = 'uniform sampler2D detailMap; uniform vec2 detailRep; uniform float snowAmt;\n' + sh.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\n  { float d1 = texture2D(detailMap, vUv * detailRep).r, d2 = texture2D(detailMap, vUv * detailRep * 0.27 + 0.31).r; diffuseColor.rgb *= mix(0.84, 1.16, d1 * 0.65 + d2 * 0.35); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.97), snowAmt * clamp(0.45 + 0.5 * d2, 0.0, 0.92)); }');
    };
    groundMesh = mesh(geo, gmat, 0, 0, 0, false);
    scene.add(groundMesh);
    const outer = mesh(new T.PlaneGeometry(24000, 24000), std('#3f6a2c', { roughness: 1 }), MW / 2, -40, MH / 2, false); outer.rotation.x = -Math.PI / 2; scene.add(outer);
    // cloud shadows drifting over the land
    const ct = genTex('clouds', 256, (g, n, R) => { g.fillStyle = '#000'; g.fillRect(0, 0, n, n); const cn = makeNoise(9); const img = g.getImageData(0, 0, n, n), d = img.data;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = cn(x / 40, y / 40) * 0.6 + cn(x / 16 + 7, y / 16) * 0.4, a = clamp((v - 0.5) * 3.2, 0, 1) * 255, i = (y * n + x) * 4; d[i] = d[i + 1] = d[i + 2] = a; d[i + 3] = 255; }
      g.putImageData(img, 0, 0); }, 2);
    ct.encoding = T.LinearEncoding;
    clouds3 = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x0b1824, transparent: true, opacity: 0.3, alphaMap: ct, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    clouds3.renderOrder = 1; scene.add(clouds3);
  }
  // ---------- water and grass ----------
  let water = null, grass = null, grassPos = [], windU = { value: 0 }, windAmt = { value: 0.3 }, windDir = { value: T ? new T.Vector2(1, 0) : null };   // (no 3D library: the flat view still runs)
  function swayLeaves(mat, lift) {   // tree crowns bend with the wind: more at the top, each tree in its own rhythm
    mat.onBeforeCompile = sh => { sh.uniforms.uWind = windU; sh.uniforms.uWindAmt = windAmt; sh.uniforms.uWindDir = windDir;
      sh.vertexShader = 'uniform float uWind; uniform float uWindAmt; uniform vec2 uWindDir;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  { float ph = instanceMatrix[3].x * 0.031 + instanceMatrix[3].z * 0.027; float hgt = max(0.0, position.y - ' + lift.toFixed(1) + ') / 40.0; float gust = sin(uWind * 0.55 - dot(instanceMatrix[3].xz, uWindDir) * 0.0045) * 0.5 + 0.5; float g = (sin(uWind * 1.3 + ph) * 0.6 + sin(uWind * 3.1 + ph * 2.0) * 0.25 + 0.35) * (0.45 + gust * 1.1); float flutter = sin(uWind * 7.0 + position.x * 0.4 + position.z * 0.3 + ph) * 0.35;\n    transformed.x += (uWindDir.x * g + flutter * 0.45) * hgt * hgt * uWindAmt * 9.0; transformed.z += (uWindDir.y * g + flutter * 0.45) * hgt * hgt * uWindAmt * 9.0; transformed.y -= g * hgt * hgt * uWindAmt * 0.8; }'); };
  }
  function buildWater() {
    if (!pond) return;
    const geo = new T.CircleGeometry(1, 56); geo.rotateX(-Math.PI / 2);
    const mat = new T.MeshPhongMaterial({ color: C('#1f4c6e'), specular: C('#9db8c8'), shininess: 85, emissive: C('#0d2638'), transparent: true, opacity: 0.92, normalMap: waterNormal(), normalScale: new T.Vector2(0.55, 0.55) });
    water = new T.Mesh(geo, mat); water.scale.set(pond.rx * 1.02, 1, pond.ry * 1.02); water.position.set(pond.x, heightAt(pond.x + pond.rx * 0.9, pond.y) - 2.2, pond.y); water.receiveShadow = true;
    scene.add(water);
  }
  function buildGrass() {
    const pos = [], col = [], Rg = mulberry32(31);
    for (let b = 0; b < 5; b++) {
      const a = b / 5 * Math.PI * 2 + Rg(), lean = 0.3 + Rg() * 0.4, h = 3.2 + Rg() * 2.6, w = 0.75, cx = Math.cos(a), sz = Math.sin(a);
      const base = [[-w * sz, 0, w * cx], [w * sz, 0, -w * cx]], tip = [cx * lean * h * 0.5, h, sz * lean * h * 0.5];
      const dark = C('#5c8a3c'), lit = C('#c6e08a');
      pos.push(...base[0], ...base[1], ...tip, ...base[1], ...base[0], ...tip);   // both faces, so each side is lit from above
      for (let q = 0; q < 2; q++) col.push(dark.r, dark.g, dark.b, dark.r, dark.g, dark.b, lit.r, lit.g, lit.b);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    const nrm = geo.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
    const mat = new T.MeshStandardMaterial({ vertexColors: true, side: T.FrontSide, roughness: 1 });
    mat.onBeforeCompile = sh => { sh.uniforms.uWind = windU; sh.uniforms.uWindAmt = windAmt; sh.uniforms.uWindDir = windDir; sh.vertexShader = 'uniform float uWind; uniform float uWindAmt; uniform vec2 uWindDir;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  float ph = instanceMatrix[3].x * 0.05 + instanceMatrix[3].z * 0.037;\n  transformed.x += (sin(uWind * 1.6 + ph) * 0.5 + uWindDir.x * 0.7) * position.y * 0.16 * uWindAmt * 2.2;\n  transformed.z += (cos(uWind * 1.2 + ph) * 0.5 + uWindDir.y * 0.7) * position.y * 0.12 * uWindAmt * 2.2;'); };
    const N = 9000; grass = new T.InstancedMesh(geo, mat, N); grass.receiveShadow = true; grass.castShadow = false;
    let k = 0, tries = 0;
    while (k < N && tries++ < N * 4) {
      const x = Rg() * MW, z = Rg() * MH;
      if (blockedAt(x, z) || roadDist(x, z) < 22 || Math.hypot(x - CAMP.x, z - CAMP.y) < 150 || mountAt(x, z) > 18) continue;
      if (pond && Math.hypot((x - pond.x) / pond.rx, (z - pond.y) / pond.ry) < 1.05) continue;
      const s = 0.6 + Rg() * 0.6;
      grass.setMatrixAt(k, M4(x, heightAt(x, z) - 0.2, z, s, s * (0.8 + Rg() * 0.4), s, Rg() * 6.28));
      grass.setColorAt(k, new T.Color().setHSL(0.23 + Rg() * 0.06, 0.35, 0.55 + Rg() * 0.12).multiplyScalar(1.25));
      grassPos.push([x, z]); k++;
    }
    grass.count = k; if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    scene.add(grass);
  }
  function hideGrass(x0, z0, x1, z1) {
    if (!grass) return; const zero = new T.Matrix4().makeScale(0, 0, 0); let hit = false;
    grassPos.forEach(([x, z], i) => { if (x > x0 - 2 && x < x1 + 2 && z > z0 - 2 && z < z1 + 2) { grass.setMatrixAt(i, zero); hit = true; } });
    if (hit) grass.instanceMatrix.needsUpdate = true;
  }
  function syncWater(dt) {
    if (leafDecid) { const se = WEATHER.season, tgt = [[1.0, 1.08, 0.86], [0.92, 1.0, 0.86], [1.75, 0.78, 0.28], [0.82, 0.72, 0.6]][se]; const c = leafDecid.color, kk = Math.min(1, dt * 0.35); c.r += (tgt[0] - c.r) * kk; c.g += (tgt[1] - c.g) * kk; c.b += (tgt[2] - c.b) * kk; }
    windU.value = time; windAmt.value = 0.38 + WEATHER.wind * 1.2 + WEATHER.rain * 0.2; windDir.value.set(Math.cos(WEATHER.ang), Math.sin(WEATHER.ang));
    if (clouds3) { const t = clouds3.material.alphaMap; t.offset.x = time * 0.0022; t.offset.y = time * 0.0012; }
    if (water) { const t = water.material.normalMap; t.offset.x = time * 0.012; t.offset.y = time * 0.008; }
  }
  // ---------- scenery: instanced trees and rocks, bushes, campfire ----------
  let setTreeDetail = null, treeDetailWant = true; try { treeDetailWant = localStorage.getItem('sd-trees') !== 'simple'; } catch (e) {}
  let oakMesh, oakTrunks, pineMesh, pineTrunks, birchMesh, birchTrunks, leafDecid, rockMesh, treeList = [];
  const bushModels = new Map(), stumpSeen = new Set();
  function buildScenery() {
    const lightCol = (base, top) => (x, y, z) => { const t = clamp(0.35 + y / 70 - x / 120 - z / 160, 0, 1); return new T.Color().copy(C(base)).lerp(C(top), t); };
    const oakParts = [], R = mulberry32(99);
    const blobs = [[0, 46, 0, 15], [-11, 40, 4, 11], [11, 41, -3, 11.5], [3, 40, 11, 10.5], [-2, 42, -11, 11], [0, 57, 0, 11], [-8, 53, 6, 8.5], [8, 54, -5, 8.5], [5, 50, 8, 8], [-12, 47, -6, 8], [12, 48, 6, 8], [-5, 36, 10, 7.5], [6, 36, -10, 7.5], [0, 63, 2, 7]];
    for (const [x, y, z, r] of blobs) { const geo = new T.IcosahedronGeometry(r, 1); const pp = geo.attributes.position; for (let i = 0; i < pp.count; i++) { const k = 1 + (R() - 0.5) * 0.18; pp.setXYZ(i, pp.getX(i) * k, pp.getY(i) * k, pp.getZ(i) * k); } oakParts.push({ geo, m: M4(x, y, z), color: lightCol('#24461c', '#8cb655') }); }
    // ---- leaf-card crowns: a dark core with hundreds of see-through leaf clusters, lit as one soft volume ----
    function leafCardTexture() {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), Rl = mulberry32(2024);
      g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 6, 256);   // a solid strip the crown's core samples
      for (let i = 0; i < 70; i++) {
        const a = Rl() * Math.PI * 2, rr = Math.sqrt(Rl()) * 92, x = 128 + Math.cos(a) * rr, y = 128 + Math.sin(a) * rr, ang = a + (Rl() - 0.5) * 1.4, L = 15 + Rl() * 12, W = L * (0.38 + Rl() * 0.14);
        const v = 140 + Rl() * 110 | 0; g.save(); g.translate(x, y); g.rotate(ang);
        g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.moveTo(-L / 2, 0); g.quadraticCurveTo(0, -W, L / 2, 0); g.quadraticCurveTo(0, W, -L / 2, 0); g.fill();
        g.strokeStyle = `rgba(40,40,40,0.22)`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-L * 0.4, 0); g.lineTo(L * 0.4, 0); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(-L * 0.1, -W * 0.25, L * 0.25, W * 0.25, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      // bleed leaf colour into the clear pixels so the edges never fringe dark as the texture shrinks with distance
      const img = g.getImageData(0, 0, 256, 256), d = img.data;
      for (let pass = 0; pass < 4; pass++) for (let y = 1; y < 255; y++) for (let x = 7; x < 255; x++) { const i = (y * 256 + x) * 4; if (d[i + 3] > 0) continue; for (const o of [-4, 4, -1024, 1024]) { const j = i + o; if (d[j + 3] > 0) { d[i] = d[j]; d[i + 1] = d[j + 1]; d[i + 2] = d[j + 2]; d[i + 3] = 1; break; } } }
      g.putImageData(img, 0, 0);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
    }
    function cardCrown(blobs, colorFn, seed, perBlob, size, centerY) {
      const Rc = mulberry32(seed), pos = [], nor = [], col = [], uv = [];
      const push = (p, n, c, u, v) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b); uv.push(u, v); };
      const ctr = new T.Vector3(0, centerY, 0);
      for (const [bx, by, bz, br] of blobs) {
        // core: a small dark blob that fills the gaps between leaf clusters
        const core = new T.IcosahedronGeometry(br * 0.72, 0).toNonIndexed(), cp = core.attributes.position;
        for (let i = 0; i < cp.count; i++) { const p = new T.Vector3(cp.getX(i) + bx, cp.getY(i) + by, cp.getZ(i) + bz), n = p.clone().sub(ctr).normalize(); const c = colorFn(p.x, p.y, p.z).multiplyScalar(0.62); push(p, n, c, 0.012, 0.5); }
        for (let k = 0; k < perBlob; k++) {
          const d = new T.Vector3(Rc() - 0.5, Rc() - 0.35, Rc() - 0.5).normalize(), c0 = new T.Vector3(bx, by, bz).addScaledVector(d, br * (0.7 + Rc() * 0.45));
          const nrm = d.clone().add(new T.Vector3(Rc() - 0.5, Rc() - 0.5, Rc() - 0.5).multiplyScalar(0.9)).normalize();
          const up = Math.abs(nrm.y) > 0.9 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0), ax = new T.Vector3().crossVectors(up, nrm).normalize(), ay = new T.Vector3().crossVectors(nrm, ax);
          const rot = Rc() * Math.PI * 2, ca = Math.cos(rot), sa = Math.sin(rot), sz = size * (0.75 + Rc() * 0.6);
          const X = ax.clone().multiplyScalar(ca).addScaledVector(ay, sa).multiplyScalar(sz), Y = ay.clone().multiplyScalar(ca).addScaledVector(ax, -sa).multiplyScalar(sz);
          const corner = (sx, sy) => c0.clone().addScaledVector(X, sx).addScaledVector(Y, sy);
          const lit = c0.clone().sub(ctr).normalize().lerp(nrm, 0.35).normalize(), c = colorFn(c0.x, c0.y, c0.z).multiplyScalar(0.85 + Rc() * 0.3);
          const q = [[-1, -1, 0.06, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, -1, 0.06, 0], [1, 1, 1, 1], [-1, 1, 0.06, 1]];   // cards never touch the core's solid strip at the left edge
          for (const [sx, sy, u, v] of q) push(corner(sx, sy), lit, c, u, v);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      g.computeBoundingSphere(); return g;
    }
    const cardTex = leafCardTexture();
    const cardMat = new T.MeshStandardMaterial({ vertexColors: true, map: cardTex, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.82 }); swayLeaves(cardMat, 28);
    { const sway = cardMat.onBeforeCompile; cardMat.extensions = { derivatives: true };
      cardMat.onBeforeCompile = sh => { sway(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n  #ifdef USE_UV\n  if (vUv.x > 0.045) { vec3 fn = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition))); if (abs(dot(fn, normalize(vViewPosition))) < 0.28) discard; }\n  #endif'); }; }
    const cardDepth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: cardTex, alphaTest: 0.5 });
    const oakBlobGeo = merge(oakParts);
    const oakGeo = cardCrown(blobs, lightCol('#24461c', '#8cb655'), 99, 11, 8.6, 47);
    const birchParts = [], Rb2 = mulberry32(512);
    for (const [x, y, z, r] of [[0, 52, 0, 9], [-6, 46, 3, 7], [6, 47, -2, 7], [2, 58, 4, 7], [-3, 63, -2, 6.5], [0, 69, 1, 5.5], [4, 41, 5, 6], [-5, 40, -5, 6], [3, 55, -6, 6]]) {
      const geo = new T.IcosahedronGeometry(r, 1), pp = geo.attributes.position; for (let i = 0; i < pp.count; i++) { const k = 1 + (Rb2() - 0.5) * 0.25; pp.setXYZ(i, pp.getX(i) * k * 0.85, pp.getY(i) * k * 1.25, pp.getZ(i) * k * 0.85); }
      birchParts.push({ geo, m: M4(x, y, z), color: lightCol('#3f6a24', '#a8c860') });
    }
    const birchBlobGeo = merge(birchParts);
    const birchGeo = cardCrown([[0, 52, 0, 9], [-6, 46, 3, 7], [6, 47, -2, 7], [2, 58, 4, 7], [-3, 63, -2, 6.5], [0, 69, 1, 5.5], [4, 41, 5, 6], [-5, 40, -5, 6], [3, 55, -6, 6]], lightCol('#3f6a24', '#a8c860'), 512, 10, 6.0, 54);
    const pineParts = [];
    for (let k = 0; k < 6; k++) {
      const geo = new T.ConeGeometry(17 - k * 2.5, 19, 14, 2, true), pp = geo.attributes.position, Rp = mulberry32(300 + k);
      for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); if (y < 0) { const a = Math.atan2(pp.getZ(i), pp.getX(i)), jag = 1 + (Math.sin(a * 7 + k) * 0.5 + 0.5) * 0.22; pp.setXYZ(i, pp.getX(i) * jag, y - (jag - 1) * 9, pp.getZ(i) * jag); } else pp.setXYZ(i, pp.getX(i) * (0.9 + Rp() * 0.2), y, pp.getZ(i) * (0.9 + Rp() * 0.2)); }
      pineParts.push({ geo, m: M4(0, 16 + k * 9.5, 0, 1, 1, 1, k * 0.7), color: lightCol('#13301a', '#4a8546') });
    }
    pineParts.push({ geo: new T.ConeGeometry(2.2, 8, 8), m: M4(0, 72, 0), color: lightCol('#1c3d1f', '#4a8546') });
    const pineGeo = merge(pineParts);
    // ---- needle-frond pines: rings of drooping see-through branches around a slim dark core ----
    function needleTexture() {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), Rn2 = mulberry32(77);
      g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, 16, 256);   // solid strip for the core
      for (let f = 0; f < 3; f++) {   // three twigs per frond, spreading from the base (left) to the tip (right)
        const y0 = 128 + (f - 1) * 26, spread = (f - 1) * 0.16;
        // a soft filled body so the frond stays solid when seen from afar
        g.fillStyle = '#8a8a8a'; g.beginPath(); g.moveTo(22, 128); g.quadraticCurveTo(120, y0 - 18, 240, 128 + spread * 240); g.quadraticCurveTo(120, y0 + 18, 22, 128); g.fill();
        g.strokeStyle = '#4a4030'; g.lineWidth = 2.6 - f * 0.2; g.beginPath(); g.moveTo(22, 128); g.quadraticCurveTo(120, y0, 246, 128 + spread * 240); g.stroke();
        for (let t = 0.06; t < 0.98; t += 0.018) {
          const x = 16 + t * 230, y = 128 + (y0 - 128) * 4 * t * (1 - t) * 0.9 + spread * 240 * t * t, len = 16 * (1 - t * 0.55) + Rn2() * 5;
          for (const sd of [-1, 1]) { const a = sd * (0.75 + Rn2() * 0.35) + 0.25, v = 140 + Rn2() * 100 | 0; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke(); }
        }
      }
      const img = g.getImageData(0, 0, 256, 256), d = img.data;   // bleed colour into clear pixels so edges never fringe dark
      for (let pass = 0; pass < 3; pass++) for (let y = 1; y < 255; y++) for (let x = 7; x < 255; x++) { const i = (y * 256 + x) * 4; if (d[i + 3] > 0) continue; for (const o of [-4, 4, -1024, 1024]) { const j = i + o; if (d[j + 3] > 0) { d[i] = d[j]; d[i + 1] = d[j + 1]; d[i + 2] = d[j + 2]; d[i + 3] = 1; break; } } }
      g.putImageData(img, 0, 0);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
    }
    function pineFronds() {
      const Rp2 = mulberry32(4040), pos = [], nor = [], col = [], uv = [];
      const push = (p, n, c, u, v) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b); uv.push(u, v); };
      const colAt = lightCol('#24502c', '#78b064');
      // the slim core
      const core = merge([0, 1, 2, 3, 4, 5].map(k => ({ geo: new T.ConeGeometry((17 - k * 2.5) * 0.4, 19, 8), m: M4(0, 16 + k * 9.5, 0), color: lightCol('#1c3d20', '#3f7442') })));
      const cp = core.attributes.position, cn = core.attributes.normal, cc = core.attributes.color;
      for (let i = 0; i < cp.count; i++) push(new T.Vector3(cp.getX(i), cp.getY(i), cp.getZ(i)), new T.Vector3(cn.getX(i), cn.getY(i), cn.getZ(i)), new T.Color(cc.getX(i), cc.getY(i), cc.getZ(i)), 0.03, 0.5);
      for (let k = 0; k < 7; k++) {
        const yb = 12 + k * 8.6, len = 19 - k * 2.3, n = 9 - Math.floor(k / 2), off = Rp2() * 6.3;
        for (let b = 0; b < n; b++) {
          const a = off + b / n * Math.PI * 2 + (Rp2() - 0.5) * 0.3, dir = new T.Vector3(Math.cos(a), 0, Math.sin(a)), side = new T.Vector3(-dir.z, 0, dir.x);
          const L = len * (0.85 + Rp2() * 0.3), W = L * 0.42, droop = L * (0.32 + Rp2() * 0.12);
          const base = new T.Vector3(0, yb + 6, 0).addScaledVector(dir, 1.5), tip = base.clone().addScaledVector(dir, L).add(new T.Vector3(0, -droop, 0));
          for (const tilt of [0.0, 0.55]) {   // two cards per branch, one flat and one tipped up, for depth
            const sv = side.clone().multiplyScalar(W * 0.5).add(new T.Vector3(0, W * 0.5 * tilt, 0));
            const q = [[base.clone().sub(sv), 0.08, 0], [tip.clone().sub(sv), 1, 0], [tip.clone().add(sv), 1, 1], [base.clone().sub(sv), 0.08, 0], [tip.clone().add(sv), 1, 1], [base.clone().add(sv), 0.08, 1]];
            const lit = dir.clone().add(new T.Vector3(0, 0.8, 0)).normalize(), c = colAt(tip.x, tip.y, tip.z).multiplyScalar(0.8 + Rp2() * 0.35);
            for (const [p2, u, v] of q) push(p2, lit, c, u, v);
          }
        }
      }
      const tip = [new T.Vector3(0, 82, 0), new T.Vector3(-2.2, 70, 0), new T.Vector3(2.2, 70, 0)];   // the leader at the very top
      for (const p2 of tip) push(p2, new T.Vector3(0, 1, 0), colAt(0, 80, 0), 0.03, 0.5);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      g.computeBoundingSphere(); return g;
    }
    const pineCardGeo = pineFronds(), needleTex = needleTexture();
    const needleMat = new T.MeshStandardMaterial({ vertexColors: true, map: needleTex, alphaTest: 0.4, side: T.DoubleSide, roughness: 0.88 }); needleMat.color.setRGB(1.9, 1.9, 1.75); swayLeaves(needleMat, 20);
    { const sway = needleMat.onBeforeCompile; needleMat.extensions = { derivatives: true };
      needleMat.onBeforeCompile = sh => { sway(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n  #ifdef USE_UV\n  if (vUv.x > 0.07) { vec3 fn = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition))); if (abs(dot(fn, normalize(vViewPosition))) < 0.2) discard; }\n  #endif'); }; }
    const needleDepth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: needleTex, alphaTest: 0.4 });
    const leafMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: false, side: T.DoubleSide, map: leafTex(), bumpMap: leafTex(), bumpScale: 1.6 }); swayLeaves(leafMat, 28);
    const barkMat = woodVM(8, 36);
    const border = [], Rb = mulberry32(4711);
    for (let x = -420; x < MW + 420; x += 58) for (let z = -420; z < MH + 420; z += 58) {
      const out = x < -8 || x > MW + 8 || z < -8 || z > MH + 8; if (!out || Rb() < 0.2) continue;
      const px = x + (Rb() - 0.5) * 26, pz = z + (Rb() - 0.5) * 26;
      border.push({ x: px, c: (px - 16) / TILE, r: (pz - 16) / TILE, s: 0.9 + Rb() * 0.5, pine: Rb() < 0.4, seed: Rb() * 10, tone: Rb() });
    }
    const isBirch = t => !t.pine && ((t.seed * 13.7) % 1) < 0.32;
    const oaks = trees.filter(t => !t.pine && !isBirch(t)), pines = trees.filter(t => t.pine), birches = trees.filter(isBirch);
    {
      const lowOak = merge([[0, 44, 0, 16], [-10, 40, 5, 12], [10, 41, -4, 12], [0, 56, 0, 12], [3, 40, 11, 10]].map(([x, y, z, r]) => ({ geo: new T.IcosahedronGeometry(r, 0), m: M4(x, y, z), color: lightCol('#24461c', '#7aa64a') })).map(p => (p.geo = new T.IcosahedronGeometry(p.geo.parameters.radius, 1), p)));
      const lowPine = merge([0, 1, 2, 3].map(k => ({ geo: new T.ConeGeometry(16 - k * 3, 20, 7), m: M4(0, 18 + k * 11, 0), color: lightCol('#13301a', '#447e42') })));
      const bm = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: leafTex(), bumpMap: leafTex(), bumpScale: 1.2 }); swayLeaves(bm, 18);
      const bo = border.filter(t => !t.pine), bp = border.filter(t => t.pine);
      const mo = new T.InstancedMesh(lowOak, bm, bo.length), mp = new T.InstancedMesh(lowPine, bm, bp.length);
      bo.forEach((t, i) => { const z = t.r * TILE + 16; mo.setMatrixAt(i, M4(t.x, heightAt(t.x, z), z, t.s, t.s, t.s, t.seed)); });
      bp.forEach((t, i) => { const z = t.r * TILE + 16; mp.setMatrixAt(i, M4(t.x, heightAt(t.x, z), z, t.s, t.s, t.s, t.seed)); });
      for (const m of [mo, mp]) { m.castShadow = false; m.receiveShadow = true; scene.add(m); }
    }
    oakMesh = new T.InstancedMesh(oakGeo, leafMat, oaks.length); oakTrunks = new T.InstancedMesh(new T.CylinderGeometry(2.4, 3.8, 36, 8), barkMat, oaks.length);
    leafDecid = cardMat; oakMesh.material = cardMat; oakMesh.customDepthMaterial = cardDepth;
    const simpleMat = leafMat.clone(); swayLeaves(simpleMat, 28);
    setTreeDetail = detailed => {   // detailed leaf crowns, or the older solid ones for slower computers
      oakMesh.geometry = detailed ? oakGeo : oakBlobGeo; birchMesh.geometry = detailed ? birchGeo : birchBlobGeo;
      if (pineMesh) { pineMesh.geometry = detailed ? pineCardGeo : pineGeo; pineMesh.material = detailed ? needleMat : leafMat; pineMesh.customDepthMaterial = detailed ? needleDepth : undefined; }
      const mt = detailed ? cardMat : simpleMat; oakMesh.material = birchMesh.material = mt; simpleMat.color.copy(cardMat.color); leafDecid = mt;
      oakMesh.customDepthMaterial = birchMesh.customDepthMaterial = detailed ? cardDepth : undefined;
    };
    if (treeDetailWant === false) setTreeDetail(false);
    birchMesh = new T.InstancedMesh(birchGeo, leafDecid, birches.length); birchMesh.customDepthMaterial = cardDepth; birchTrunks = new T.InstancedMesh(new T.CylinderGeometry(1.3, 2.1, 46, 8), std('#e6e2d6', { roughness: 0.8, map: barkMat.map }), birches.length);
    pineMesh = new T.InstancedMesh(treeDetailWant !== false ? pineCardGeo : pineGeo, treeDetailWant !== false ? needleMat : leafMat, pines.length); if (treeDetailWant !== false) pineMesh.customDepthMaterial = needleDepth; pineTrunks = new T.InstancedMesh(new T.CylinderGeometry(1.8, 2.6, 22, 7), barkMat, pines.length);
    const place = (list, crown, trunk, trunkY) => list.forEach((t, i) => {
      const x = t.c * TILE + 16 + (t.x - (t.c * TILE + 16)), z = t.r * TILE + 16, y = heightAt(x, z), s = t.s * 1.05, ry = t.seed * 2.1;
      const v1 = (t.seed * 3.31) % 1, v2 = (t.seed * 7.77) % 1;
      crown.setMatrixAt(i, new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler((v1 - 0.5) * 0.12, ry, (v2 - 0.5) * 0.12)), new T.Vector3(s * (0.85 + v1 * 0.3), s * (0.85 + (t.seed % 1) * 0.4), s * (0.85 + v2 * 0.3))));
      trunk.setMatrixAt(i, M4(x, y + trunkY * s, z, s, s, s));
      crown.setColorAt(i, new T.Color().setHSL(0.25 + (t.tone - 0.5) * 0.09, 0.22 + v2 * 0.14, 0.46 + t.tone * 0.16).multiplyScalar(1.7));
      treeList.push({ t, crown, trunk, i });
    });
    place(oaks, oakMesh, oakTrunks, 18); place(pines, pineMesh, pineTrunks, 11); place(birches, birchMesh, birchTrunks, 23);
    for (const m of [oakMesh, oakTrunks, pineMesh, pineTrunks, birchMesh, birchTrunks]) { m.castShadow = true; m.receiveShadow = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m); }
    // rocks
    const rg = new T.IcosahedronGeometry(1, 0); const rp = rg.attributes.position;
    for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i), k = 0.8 + ((Math.sin(x * 12.9 + y * 78.2 + z * 37.7) * 43758.5) % 1 + 1) % 1 * 0.4; rp.setXYZ(i, x * k, y * k, z * k); }
    rg.computeVertexNormals();
    rockMesh = new T.InstancedMesh(rg, std('#8d8a83', { roughness: 0.95, flatShading: true }), rocks.length);
    { const spots = [], Rm = mulberry32(909); for (let n = 0; n < 9000 && spots.length < 700; n++) { const x = Rm() * MW, z = Rm() * MH, m = mountAt(x, z); if (m > 26 && Rm() < 0.6) spots.push([x, z, m]); }
      spots.length = Math.min(spots.length, 420);
      const bg = new T.DodecahedronGeometry(1, 1); { const P = bg.attributes.position, Rj = mulberry32(31); for (let i = 0; i < P.count; i++) { const f = 0.82 + Rj() * 0.3; P.setXYZ(i, P.getX(i) * f, P.getY(i) * f, P.getZ(i) * f); } bg.computeVertexNormals(); }
      const bmesh = new T.InstancedMesh(bg, std('#9a9181', { roughness: 0.96, flatShading: true }), spots.length);
      spots.forEach(([x, z, m], i) => { const sz = 5 + Rm() * 12 + m * 0.05; bmesh.setMatrixAt(i, new T.Matrix4().compose(new T.Vector3(x, heightAt(x, z) - sz * 0.3, z), new T.Quaternion().setFromEuler(new T.Euler(Rm() * 3, Rm() * 3, Rm() * 3)), new T.Vector3(sz, sz * (0.55 + Rm() * 0.4), sz * (0.8 + Rm() * 0.4)))); bmesh.setColorAt(i, new T.Color().setHSL(0.08 + Rm() * 0.05, 0.1, 0.62 + Rm() * 0.22)); });
      bmesh.castShadow = true; bmesh.receiveShadow = true; scene.add(bmesh); }
    rocks.forEach((r, i) => { const z = r.y - 6, y = heightAt(r.x, z); rockMesh.setMatrixAt(i, new T.Matrix4().compose(new T.Vector3(r.x, y + 3 * r.s, z), new T.Quaternion().setFromEuler(new T.Euler(r.seed, r.seed * 3, r.seed * 0.5)), new T.Vector3(13 * r.s, 9 * r.s, 11 * r.s))); });
    rocks.forEach((r, i) => rockMesh.setColorAt(i, r.iron ? new T.Color('#c27a4a') : new T.Color('#ffffff'))); if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true;
    rockMesh.castShadow = true; rockMesh.receiveShadow = true; scene.add(rockMesh);
    // campfire
    for (const f of fires) {
      const g = new T.Group(), y = heightAt(f.x, f.y); g.position.set(f.x, y, f.y);
      const stone = std('#7c776f', { flatShading: true });
      const stoneR = std('#8a847a', { roughness: 0.95 }), soot = std('#3a332c', { roughness: 1 });
      for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2 + (i % 3) * 0.05, sg = new T.IcosahedronGeometry(3, 2), pp = sg.attributes.position; for (let v = 0; v < pp.count; v++) { const k = 0.85 + Math.sin(pp.getX(v) * 2.1 + i) * 0.08 + Math.cos(pp.getZ(v) * 1.7 + i * 2) * 0.07; pp.setXYZ(v, pp.getX(v) * k, pp.getY(v) * k * 0.7, pp.getZ(v) * k); } sg.computeVertexNormals();
        const st = mesh(sg, i % 2 ? stoneR : stone, Math.cos(a) * 11.5, 1.6, Math.sin(a) * 11.5); st.rotation.set(i, i * 2, 0); st.scale.setScalar(0.9 + (i % 4) * 0.08); g.add(st); }
      { const ash = mesh(new T.CircleGeometry(9, 20), soot, 0, 0.3, 0, false); ash.rotation.x = -Math.PI / 2; g.add(ash); }
      const logM = woodHM(10, 4);
      const char = std('#140d08', { roughness: 1, emissive: C('#ff3a08'), emissiveIntensity: 0.12 });
      for (const a of [0, 1.25, 2.5, 3.75, 5.0]) { const l = new T.Group(); l.add(cyl(1.4, 1.7, 16, logM, 0, 0, 0, 8)); l.add(cyl(1.42, 1.42, 4, char, 0, 6.5, 0, 8)); l.position.set(Math.cos(a) * 4.6, 5.2, Math.sin(a) * 4.6); l.rotation.set(-Math.sin(a) * 0.62, 0, Math.cos(a) * 0.62); g.add(l); }   // a tipi of logs, burnt at the top
      // living flames: crossed sheets drawn by a shader with rising, swirling noise; white-hot at the base, orange, then deep red at the licking tips
      const flameU = { uT: { value: 0 }, uSeed: { value: Math.random() * 50 }, uWind: { value: 0 } };
      const flameM = new T.ShaderMaterial({ uniforms: flameU, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
        vertexShader: 'varying vec2 vUv; uniform float uT; uniform float uWind; void main(){ vUv = uv; vec3 p = position; p.x += sin(uT * 3.0 + p.y * 0.25) * p.y * 0.05 + uWind * p.y * p.y * 0.004; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
        fragmentShader: [
          'varying vec2 vUv; uniform float uT; uniform float uSeed;',
          'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
          'float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }',
          'float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n(p); p *= 2.03; a *= 0.5; } return v; }',
          'void main(){',
          '  vec2 uv = vUv; float y = uv.y;',
          '  vec2 q = vec2(uv.x * 3.0 + uSeed, y * 2.2 - uT * 2.6);',
          '  float turb = fbm(q) * 0.9 + fbm(q * 2.3 + vec2(uT * 0.7, -uT * 1.3)) * 0.5;',
          '  float x = (uv.x - 0.5) * 2.0 + (turb - 0.6) * 0.55 * y;',
          '  float width = mix(0.95, 0.0, pow(y, 0.85));',
          '  float body = smoothstep(width, width * 0.25, abs(x)) * smoothstep(0.0, 0.08, y);',
          '  float flick = smoothstep(0.15, 0.85, turb + (1.0 - y) * 0.75 - 0.35);',
          '  float a = body * flick;',
          '  vec3 hot = vec3(1.0, 0.95, 0.75), mid = vec3(1.0, 0.55, 0.12), tip = vec3(0.75, 0.12, 0.03);',
          '  vec3 col = mix(hot, mid, smoothstep(0.05, 0.45, y + abs(x) * 0.4));',
          '  col = mix(col, tip, smoothstep(0.45, 0.95, y + (1.0 - flick) * 0.3));',
          '  gl_FragColor = vec4(col * a * 1.6, a);',
          '}'].join('\n') });
      const flames = new T.Group(); flames.position.y = 2.5;
      for (let k = 0; k < 4; k++) { const pl = new T.Mesh(new T.PlaneGeometry(17, 30, 1, 6), flameM); pl.geometry.translate(0, 15, 0); pl.rotation.y = k * Math.PI / 4; flames.add(pl); }
      const small = flames.clone(); small.scale.set(0.55, 0.62, 0.55); small.position.set(4, 2, 3); small.rotation.y = 0.4; g.add(small);
      g.add(flames);
      // glowing embers under the flames, and charred ends on the logs
      const emberM = new T.MeshStandardMaterial({ color: C('#2a1208'), emissive: C('#ff5a10'), emissiveIntensity: 1.4, roughness: 1 });
      for (let i = 0; i < 14; i++) { const a = i * 2.39, r = 2 + (i % 4) * 1.6; g.add(mesh(new T.DodecahedronGeometry(1.1 + (i % 3) * 0.4, 0), emberM, Math.cos(a) * r, 1.2, Math.sin(a) * r, false)); }
      // sparks that drift up on the heat
      const NS = 26, sGeo = new T.BufferGeometry(), sp = new Float32Array(NS * 3), life = [];
      for (let i = 0; i < NS; i++) life.push({ t: Math.random() * 2, x: 0, y: 0, z: 0, vx: 0, vz: 0 });
      sGeo.setAttribute('position', new T.BufferAttribute(sp, 3));
      const sparks = new T.Points(sGeo, new T.PointsMaterial({ color: C('#ffcf7a'), size: 1.7, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })); sparks.frustumCulled = false; g.add(sparks);
      const light = new T.PointLight(C('#ff9a48'), 1.6, 260, 2); light.position.set(0, 16, 0); g.add(light);
      // a warm glow on the ground
      const gc = document.createElement('canvas'); gc.width = gc.height = 128; { const gg = gc.getContext('2d'), gr = gg.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,160,70,1)'); gr.addColorStop(0.35, 'rgba(255,110,40,0.45)'); gr.addColorStop(1, 'rgba(255,90,30,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 128, 128); }
      const glow = mesh(new T.PlaneGeometry(110, 110), new T.MeshBasicMaterial({ map: new T.CanvasTexture(gc), color: C('#ffffff'), transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false }), 0, 0.6, 0, false); glow.rotation.x = -Math.PI / 2; g.add(glow);
      f.m3 = { g, flameU, flames, small, light, sparks, life, glow }; scene.add(g);
    }
  }
  function bushModel(b) {
    const g = new T.Group(), y = heightAt(b.x, b.y); g.position.set(b.x, y, b.y);
    const leaf = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const parts = [[-6, 6, 2, 6.5], [6, 6, -2, 6.5], [0, 11, 0, 7.5], [-3, 4, 6, 5.5], [4, 4, 5, 5.5], [0, 7, -6, 6]];
    const geo = merge(parts.map(([x, yy, z, r]) => ({ geo: new T.IcosahedronGeometry(r, 1), m: M4(x, yy, z), color: (px, py, pz) => new T.Color().copy(C('#2d5824')).lerp(C('#7aa64a'), clamp(0.3 + py / 22 - px / 30, 0, 1)) })));
    g.add(mesh(geo, leaf));
    const berries = new T.InstancedMesh(new T.SphereGeometry(1.4, 8, 6), new T.MeshStandardMaterial({ color: C('#c41a34'), roughness: 0.35 }), 14);
    for (let i = 0; i < 14; i++) { const a = b.seed + i * 2.39996, r = 5 + (i * 7 % 6); berries.setMatrixAt(i, M4(Math.cos(a) * r, 7 + (i % 4) * 2.2, Math.sin(a) * r + 2)); }
    berries.castShadow = true; g.add(berries);
    scene.add(g);
    return { g, berries, shown: -1 };
  }
  // ---------- buildings ----------
  function addMerlons(g, x0, z0, w, d, y, step, mw, mh) {
    const m = stoneM(mw, mh);
    for (let x = x0 + mw / 2; x <= x0 + w - mw / 2 + 0.1; x += step) { g.add(box(mw, mh, mw, m, x, y + mh / 2, z0 + mw / 2)); g.add(box(mw, mh, mw, m, x, y + mh / 2, z0 + d - mw / 2)); }
    for (let z = z0 + mw / 2 + step; z <= z0 + d - mw / 2 - step + 0.1; z += step) { g.add(box(mw, mh, mw, m, x0 + mw / 2, y + mh / 2, z)); g.add(box(mw, mh, mw, m, x0 + w - mw / 2, y + mh / 2, z)); }
  }
  function flag(col, w = 26, h = 14) {
    const geo = new T.PlaneGeometry(w, h, 8, 1); geo.translate(w / 2, -h / 2, 0);
    const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: C(col), side: T.DoubleSide, roughness: 0.8 })); m.castShadow = true; m.userData.wave = true; return m;
  }
  function pole(g, x, y, z, len, col) {
    g.add(cyl(1.1, 1.1, len, std('#3a2a18'), x, y + len / 2, z, 6));
    const f = flag(col); f.position.set(x, y + len, z); g.add(f); return f;
  }
  function door(g, x, y, z, w, h, faceZ = 1) {
    g.add(box(w, h, 2, woodVM(w, h), x, y + h / 2, z + faceZ));
    for (const yy of [h * 0.3, h * 0.75]) g.add(box(w + 0.4, 1.4, 2.4, std('#2b2824', { metalness: 0.6, roughness: 0.5 }), x, y + yy, z + faceZ));
  }
  function towerArcher(team, scale = 0.9) {
    const fu = { kind: 'unit', type: 'archer', team, pal: PAL[team], skin: '#d9a57a', hair: '#3a2414', seed: 1, look: { beard: true, longHair: false, w: 1, h: 1 }, order: 'attack' };
    const m = personModel(fu); m.root.scale.setScalar(scale); m.root.userData.archer = m; return m;
  }
  function buildingModel(b) {
    const teamCol = b.team === 'enemy' ? ENEMY_COL : PAL.player.tunic, teamSide = b.team === 'enemy' ? 'enemy' : 'player';
    const g = new T.Group(), cx = (b.x0 + b.x1) / 2, cz = (b.y0 + b.y1) / 2, gy = heightAt(cx, cz);
    g.position.set(cx, gy - 1, cz);
    const inner = new T.Group(); g.add(inner);
    const info = { g, inner, flags: [], archer: null, mats: [], kind: b.kind };
    const add = o => { inner.add(o); return o; };
    if (glbBuilding(b, info)) { /* Gerald's model for this building */ }
    else if (b.kind === 'keep') {
      add(box(90, 104, 90, stoneM(90, 104), 0, 52, 0));
      add(box(94, 4, 94, stoneM(94, 4), 0, 104, 0));
      addMerlons(inner, -47, -47, 94, 94, 106, 13.5, 8, 9);
      door(inner, 0, 0, 45, 26, 30);
      for (const x of [-25, 25]) add(box(3, 14, 1, std('#16110c'), x, 70, 45.6));
      info.flags.push(pole(inner, 40, 106, -40, 42, teamCol));
      info.archer = towerArcher(teamSide); info.archer.root.position.set(8, 106, 30); add(info.archer.root);
    } else if (b.kind === 'tower') {
      const wood = woodVM(6, 100);
      for (const [x, z] of [[-28, -28], [28, -28], [-28, 28], [28, 28]]) add(cyl(3.2, 3.6, 100, wood, x, 50, z, 8));
      for (const s of [-1, 1]) { const br = box(2.6, 92, 2.6, woodVM(3, 90), 0, 48, 28.5); br.rotation.z = s * 0.68; add(br); const b2 = box(2.6, 92, 2.6, woodVM(3, 90), -28.5, 48, 0); b2.rotation.x = s * 0.68; add(b2); }
      for (const x of [-5, 5]) add(cyl(1, 1, 96, wood, x, 48, 31, 5));
      for (let k = 0; k < 9; k++) add(box(10, 1.2, 1.2, wood, 0, 8 + k * 10, 31));
      add(box(74, 8, 74, woodHM(74, 8), 0, 100, 0));
      const logM = woodVM(8, 26), tipM = woodVM(8, 8);
      for (let k = 0; k < 9; k++) {
        const o = -32 + k * 8;
        for (const [x, z] of [[o, 33], [o, -33], [33, o], [-33, o]]) { add(cyl(3.6, 3.6, 24, logM, x, 116, z, 7)); add(mesh(new T.ConeGeometry(3.6, 7, 7), tipM, x, 131.5, z)); }
      }
      for (const [x, z] of [[-31, -31], [31, -31], [-31, 31], [31, 31]]) add(cyl(2, 2, 30, wood, x, 140, z, 6));
      const roof = mesh(new T.ConeGeometry(58, 38, 4, 1), thatchM(60, 40), 0, 174, 0); roof.rotation.y = Math.PI / 4; add(roof);
      info.flags.push(pole(inner, 0, 190, 0, 26, '#b8302a'));
      info.archer = towerArcher('enemy'); info.archer.root.position.set(6, 104, 14); add(info.archer.root);
    } else if (b.kind === 'house') {
      add(box(52, 5, 46, stoneM(52, 5), 0, 2.5, 0));
      add(box(50, 34, 42, plasterM(50, 34), 0, 22, 0));
      const tim = woodVM(3, 34), beamM = woodHM(50, 3);
      for (const x of [-24, -8.5, 8.5, 24]) { add(box(3, 34, 1.2, tim, x, 22, 21.3)); add(box(3, 34, 1.2, tim, x, 22, -21.3)); }
      for (const y of [6, 38]) { add(box(51, 3, 1.4, beamM, 0, y, 21.3)); add(box(51, 3, 1.4, beamM, 0, y, -21.3)); }
      for (const z of [-20, 0, 20]) { add(box(1.2, 34, 3, tim, 25.3, 22, z)); add(box(1.2, 34, 3, tim, -25.3, 22, z)); }
      door(inner, -6, 5, 21, 11, 17);
      const glow = new T.MeshStandardMaterial({ color: C('#2a1a0e'), emissive: C('#ffb050'), emissiveIntensity: 0.9 });
      add(box(8, 7, 1, glow, 13, 27, 21.6)); add(box(1, 7, 8, glow, 25.6, 27, 5));
      // gable ends in plaster, then a steep thatched roof with overhanging eaves and a ridge beam
      const gs = new T.Shape(); gs.moveTo(-21, 0); gs.lineTo(21, 0); gs.lineTo(0, 24); gs.closePath();
      for (const x of [-25, 25]) { const ge = new T.ExtrudeGeometry(gs, { depth: 1, bevelEnabled: false }); ge.rotateY(Math.PI / 2); add(mesh(ge, plasterM(42, 24), x - 0.5, 39, 0)); }
      for (const side of [-1, 1]) {
        const slope = box(60, 2.4, 33, thatchM(60, 34), 0, 0, 0);
        slope.position.set(0, 39 + 12.5, side * 12.2); slope.rotation.x = side * 0.86; add(slope);
        const eave = box(61, 1.6, 2, std('#6e5228'), 0, 0, 0); eave.position.set(0, 39 + 1.2, side * 24.6); eave.rotation.x = side * 0.86; add(eave);
      }
      add(cyl(1.8, 1.8, 62, woodHM(62, 4), 0, 64.5, 0, 8)).rotation.z = Math.PI / 2;
      add(box(8, 30, 8, stoneM(8, 30), 14, 62, -9)); add(box(9.5, 2, 9.5, texMat('stoneDark', 1, 1), 14, 77, -9));
      info.chimney = { x: cx + 14, z: cz - 9, y: gy + 80 };
    } else if (b.kind === 'wall') {
      add(box(32, 30, 32, stoneM(32, 30), 0, 15, 0));
      add(box(32, 1.5, 22, texMat('stoneDark', 1, 1), 0, 30.4, 0));
      const enemy = b.team === 'enemy', nb = (dc, dr) => structures.some(o => !o.dead && (o.kind === 'wall' || o.kind === 'gate') && o.c === b.c + dc && o.r === b.r + dr && o.team === b.team);
      const mm = stoneM(9, 8);
      if (!nb(0, 1)) for (const x of [-9.5, 6.5]) add(box(9, 8, 6, mm, x, 34, 13));
      if (!nb(0, -1)) for (const x of [-9.5, 6.5]) add(box(9, 8, 6, mm, x, 34, -13));
      if (!nb(1, 0)) for (const z of [-9.5, 6.5]) add(box(6, 8, 9, mm, 13, 34, z));
      if (!nb(-1, 0)) for (const z of [-9.5, 6.5]) add(box(6, 8, 9, mm, -13, 34, z));
      if (enemy) { if (!nb(0, 1)) add(box(9, 12, 1, std('#8a2622'), 0, 16, 16.4)); else if (!nb(1, 0)) add(box(1, 12, 9, std('#8a2622'), 16.4, 16, 0)); }
    } else if (b.kind === 'gate') {
      for (const x of [-12, 12]) add(box(8, 42, 30, stoneM(8, 42), x, 21, 0));
      add(box(32, 7, 30, stoneM(32, 7), 0, 45, 0));
      door(inner, 0, 0, 0, 16, 32, 0);
      const ban = box(14, 9, 0.8, std(teamCol), 0, 38, 15.6); add(ban); info.teamMat = ban.material;
    } else if (b.kind === 'gtower') {
      add(box(48, 92, 48, stoneM(48, 92), 0, 46, 0));
      add(box(52, 4, 52, stoneM(52, 4), 0, 93, 0));
      addMerlons(inner, -26, -26, 52, 52, 95, 12, 8, 8);
      door(inner, 0, 0, 24, 15, 20);
      add(box(3, 13, 1, std('#16110c'), 0, 60, 24.6));
      info.flags.push(pole(inner, 22, 95, -22, 30, teamCol));
      info.archer = towerArcher(teamSide, 0.85); info.archer.root.position.set(4, 95, 12); add(info.archer.root);
    } else if (b.kind === 'highwall') {
      // as tall as the keep: a sloped plinth, the wall, a walkway, and battlements wherever the wall ends
      add(box(34, 10, 34, texMat('stoneDark', 1, 1), 0, 5, 0));
      add(box(32, 88, 32, stoneM(32, 88), 0, 54, 0));
      add(box(33, 3, 26, texMat('stoneDark', 1, 1), 0, 97.5, 0));
      const nb = (dc, dr) => structures.some(o => !o.dead && (o.kind === 'highwall' || o.kind === 'stower' || o.kind === 'greattower') && dc + b.c >= o.c && dc + b.c < o.c + o.w && dr + b.r >= o.r && dr + b.r < o.r + o.h && o.team === b.team);
      const mm = stoneM(9, 9);
      if (!nb(0, 1)) for (const x of [-9.5, 6.5]) add(box(9, 9, 6, mm, x, 103.5, 13));
      if (!nb(0, -1)) for (const x of [-9.5, 6.5]) add(box(9, 9, 6, mm, x, 103.5, -13));
      if (!nb(1, 0)) for (const z of [-9.5, 6.5]) add(box(6, 9, 9, mm, 13, 103.5, z));
      if (!nb(-1, 0)) for (const z of [-9.5, 6.5]) add(box(6, 9, 9, mm, -13, 103.5, z));
      if ((b.c + b.r) % 2 === 0) { add(box(2.4, 14, 1, std('#16110c'), 0, 68, 16.3)); add(box(2.4, 14, 1, std('#16110c'), 0, 68, -16.3)); }
    } else if (b.kind === 'stairs') {
      // stone steps rising toward the high wall beside them
      let dir = [0, -1]; for (const d of [[0, -1], [1, 0], [-1, 0], [0, 1]]) if (structures.some(o => !o.dead && o.kind === 'highwall' && o.c === b.c + d[0] && o.r === b.r + d[1])) { dir = d; break; }
      const st = new T.Group(); st.rotation.y = Math.atan2(dir[0], dir[1]); inner.add(st);
      const n = 9, sm = stoneM(28, 12);
      for (let i = 0; i < n; i++) { const h = (i + 1) * 10.7; const s1 = box(28, h, 32 / n + 0.2, sm, 0, h / 2, -16 + (i + 0.5) * 32 / n); st.add(s1); }
      st.add(box(2, 98, 32, texMat('stoneDark', 1, 1), -14.5, 49, 0)); st.add(box(2, 98, 32, texMat('stoneDark', 1, 1), 14.5, 49, 0));
    } else if (b.kind === 'stower') {
      // round stone tower: battered base, tall drum, corbelled parapet with merlons all round
      add(cyl(33, 36, 14, texMat('stoneDark', 2, 1), 0, 7, 0, 22));
      add(cyl(29, 31, 136, stoneM(180, 136), 0, 75, 0, 24));
      add(cyl(34, 30, 8, texMat('stoneDark', 2, 1), 0, 145, 0, 24));
      add(cyl(33.5, 33.5, 3, stoneM(60, 3), 0, 150, 0, 24));
      const mm = stoneM(8, 10);
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, mb = box(8, 10, 5, mm, Math.sin(a) * 31, 156.5, Math.cos(a) * 31); mb.rotation.y = a; add(mb); }
      door(inner, 0, 0, 30, 15, 22);
      for (const [a, y] of [[0.3, 60], [2.4, 80], [4.2, 100], [-0.4, 118]]) { const sl = box(3, 15, 1.5, std('#16110c'), Math.sin(a) * 31, y, Math.cos(a) * 31); sl.rotation.y = a; add(sl); }
      info.flags.push(pole(inner, -18, 151, -18, 32, teamCol));
      info.archer = towerArcher(teamSide, 0.9); info.archer.root.position.set(6, 151, 14); add(info.archer.root);
    } else if (b.kind === 'lookout') {
      // a tall slim stone shaft, a timber stair winding round it, and a roofed platform at the top
      add(cyl(15, 17, 12, texMat('stoneDark', 1, 1), 0, 6, 0, 14));
      add(cyl(12, 14, 243, stoneM(80, 243), 0, 127.5, 0, 16));
      const sm = woodHM(10, 2);
      for (let k = 0; k < 54; k++) { const a = k * 0.62, y = 6 + k * 4.4, st = box(9, 1.4, 4, sm, Math.sin(a) * 16, y, Math.cos(a) * 16); st.rotation.y = a; add(st); }
      add(cyl(24, 24, 3, woodHM(40, 3), 0, 250, 0, 16));
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; add(cyl(0.9, 0.9, 12, woodVM(2, 12), Math.sin(a) * 22, 257, Math.cos(a) * 22, 5)); }
      add(mesh(new T.ConeGeometry(28, 22, 12), thatchM(60, 24), 0, 274, 0));
      door(inner, 0, 0, 13, 10, 16);
      info.archer = towerArcher(teamSide, 0.9); info.archer.root.position.set(6, 251, 10); add(info.archer.root);
    } else if (b.kind === 'roundtower') {
      add(cyl(46, 50, 16, texMat('stoneDark', 2, 1), 0, 8, 0, 28));
      add(cyl(42, 44, 132, stoneM(260, 132), 0, 82, 0, 28));
      add(cyl(47, 42, 8, texMat('stoneDark', 2, 1), 0, 150, 0, 28));
      const mm = stoneM(8, 10); for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, mb = box(9, 10, 6, mm, Math.sin(a) * 45, 159, Math.cos(a) * 45); mb.rotation.y = a; add(mb); }
      door(inner, 0, 0, 44, 20, 28);
      for (const [a, y] of [[0.4, 60], [2.5, 90], [4.4, 110], [-0.6, 128]]) { const sl = box(3.4, 16, 1.5, std('#16110c'), Math.sin(a) * 43, y, Math.cos(a) * 43); sl.rotation.y = a; add(sl); }
      info.flags.push(pole(inner, -30, 154, -30, 36, teamCol));
      if (b.engine) { const em = (b.engine === 'trebuchet' ? trebuchetModel : ballistaModel)({ team: b.team, facing: 1, type: b.engine, pal: PAL[b.team] }); em.root.position.set(0, 154, 0); em.root.scale.multiplyScalar(b.engine === 'trebuchet' ? 0.8 : 1.1); add(em.root); info.engineModel = em; }
    } else if (b.kind === 'greattower') {
      // great tower: taller than the keep, with four corner turrets
      add(box(96, 14, 96, texMat('stoneDark', 2, 1), 0, 7, 0));
      add(box(90, 156, 90, stoneM(90, 156), 0, 84, 0));
      add(box(96, 6, 96, texMat('stoneDark', 2, 1), 0, 163, 0));
      addMerlons(inner, -48, -48, 96, 96, 166, 13.5, 8, 10);
      for (const [x, z] of [[-45, -45], [45, -45], [-45, 45], [45, 45]]) {
        add(cyl(11, 12, 186, stoneM(60, 186), x, 93, z, 16));
        add(cyl(13, 11, 6, texMat('stoneDark', 1, 1), x, 189, z, 16));
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; add(box(5, 7, 5, stoneM(5, 7), x + Math.sin(a) * 11, 195, z + Math.cos(a) * 11)); }
      }
      door(inner, 0, 0, 45, 24, 32);
      for (const x of [-22, 22]) for (const y of [60, 110]) add(box(3.4, 16, 1, std('#16110c'), x, y, 45.6));
      info.flags.push(pole(inner, 0, 169, 0, 40, teamCol));
      info.archer = towerArcher(teamSide, 0.95); info.archer.root.position.set(14, 169, 30); add(info.archer.root);
      const a2 = towerArcher(teamSide, 0.95); a2.root.position.set(-20, 169, 30); a2.root.rotation.y = -0.4; add(a2.root);
    } else if (b.kind === 'moat') {
      const nb = (dc, dr) => structures.some(o => !o.dead && o.kind === 'moat' && o.c === b.c + dc && o.r === b.r + dr);
      const water = new T.MeshStandardMaterial({ color: C('#24506a'), roughness: 0.12, metalness: 0.2, envMap: envCube || null, envMapIntensity: 1.1, transparent: true, opacity: 0.92 });
      const wm = box(32, 1.6, 32, water, 0, 0.6, 0); wm.castShadow = false; add(wm);
      const bank = std('#5e4a30', { roughness: 1 }), edge = stoneM(32, 4);
      if (!nb(0, -1)) add(box(32, 3, 3, edge, 0, 1, -15)); if (!nb(0, 1)) add(box(32, 3, 3, edge, 0, 1, 15));
      if (!nb(-1, 0)) add(box(3, 3, 32, edge, -15, 1, 0)); if (!nb(1, 0)) add(box(3, 3, 32, edge, 15, 1, 0));
      add(box(30, 0.6, 30, bank, 0, -0.2, 0));
    } else if (b.kind === 'pit') {
      const hole = cyl(12, 10, 1, std('#2a1e12', { roughness: 1 }), 0, 0.4, 2, 16); add(hole); info.pitHole = hole;
      const stakes = new T.Group(); for (const [x, z] of [[-6, -2], [-1, -6], [5, -1], [1, 5], [-5, 6], [7, 6]]) stakes.add(mesh(new T.ConeGeometry(1.1, 9, 5), std('#c9b38a'), x, 4.5, z + 2)); add(stakes); info.pitStakes = stakes;
      const cover = new T.Group(); for (const [a, l] of [[0.3, 26], [2.1, 24], [1.2, 22], [-0.6, 25], [0.9, 20]]) { const st = cyl(0.7, 0.7, l, std('#6b4a28'), 0, 1.2, 2, 5); st.rotation.set(Math.PI / 2, 0, a); cover.add(st); } add(cover); info.pitCover = cover;
    } else if (b.kind === 'quarry') {
      add(box(36, 1.5, 30, std('#4a4640', { roughness: 1 }), -6, 0.8, 0));
      for (const [x, y, z, w, h, d] of [[14, 4, -10, 12, 8, 10], [24, 4, -6, 10, 8, 10], [18, 12, -8, 11, 8, 10], [16, 4, 12, 12, 8, 9], [-24, 3.5, 18, 9, 7, 8]]) add(box(w, h, d, stoneM(w, h), x, y, z));
      const post = woodVM(3, 50);
      for (const s of [-1, 1]) { const p1 = cyl(1.4, 1.6, 50, post, s * 10, 23, -2, 6); p1.rotation.z = s * 0.38; add(p1); }
      const beam = cyl(1.2, 1.2, 26, woodHM(26, 3), 6, 45, -2, 6); beam.rotation.z = Math.PI / 2 - 0.2; add(beam);
      add(cyl(0.3, 0.3, 16, std('#c9b38a'), 18, 36, -2, 4)); add(box(8, 6, 8, stoneM(8, 6), 18, 26, -2));
      add(box(10, 3, 6, woodHM(10, 3), -22, 1.5, -14));
    } else if (b.kind === 'woodhut') {
      add(box(40, 26, 32, woodVM(40, 26), -6, 13, -4));
      door(inner, -6, 0, 12, 9, 17);
      const shape = new T.Shape(); shape.moveTo(-22, 0); shape.lineTo(22, 0); shape.lineTo(0, 20); shape.closePath();
      const rg = new T.ExtrudeGeometry(shape, { depth: 46, bevelEnabled: false }); rg.translate(0, 0, -23); rg.rotateY(Math.PI / 2);
      add(mesh(rg, thatchM(46, 24), -6, 26, -4));
      const logM = woodHM(14, 4);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) { const l = cyl(2.6, 2.6, 16, logM, 22, 2.8 + r * 4.6, -6 + k * 5.4 + r * 2.7, 8); l.rotation.x = Math.PI / 2; add(l); }
      add(cyl(4.5, 5, 6, woodVM(8, 6), 20, 3, 16, 10));
      const axe = new T.Group(); axe.add(cyl(0.6, 0.6, 12, std('#7b5a34'), 0, 6, 0, 5)); axe.add(box(0.8, 4, 4.5, std('#c3cad1', { metalness: 0.8, roughness: 0.3 }), 0, 0.8, 2)); axe.position.set(20, 6, 16); axe.rotation.z = 0.5; add(axe);
    } else if (b.kind === 'stockpile') {
      add(box(56, 3, 52, woodHM(56, 4), 0, 1.5, 0));
      for (const [x, z] of [[-27, -25], [27, -25], [-27, 25], [27, 25]]) add(cyl(1.4, 1.4, 12, woodVM(3, 12), x, 6, z, 6));
      const logM = woodHM(20, 4);
      for (const [x, z] of [[-27, -25], [27, -25]]) add(cyl(1.6, 1.6, 30, woodVM(3, 30), x, 15, z, 6));
      const lean = box(60, 1.6, 22, woodHM(60, 22), 0, 31, -16); lean.rotation.x = 0.32; add(lean);
      for (const z of [-20, 4, 22]) add(box(54, 2, 2, woodHM(54, 2), 0, 3.6, z));
      add(box(2, 8, 50, woodVM(2, 8), -20, 6, 0)); add(box(2, 8, 50, woodVM(2, 8), 6, 6, 0));
      info.stockLogs = []; info.stockStones = []; info.stockSacks = [];
      for (let r = 0; r < 4; r++) for (let k = 0; k < 5 - r; k++) { const l = cyl(2.7, 2.7, 24, logM, -12, 5.6 + r * 4.7, -12 + k * 5.6 + r * 2.8, 8); l.rotation.z = Math.PI / 2; add(l); info.stockLogs.push(l); }
      for (let i = 0; i < 6; i++) { const st = add(box(8, 6, 8, stoneM(8, 6), 14 + (i % 2) * 9, 6 + Math.floor(i / 2) * 6.2, -10 + (i % 3) * 9)); info.stockStones.push(st); }
      for (let i = 0; i < 4; i++) { const sk = sph(4, std(i % 2 ? '#c9b38a' : '#a88a5a', { roughness: 1 }), 10 + i * 6, 5.5, 18, 10); sk.scale.set(1, 1.2, 0.9); add(sk); info.stockSacks.push(sk); }
    } else if (b.kind === 'market') {
      add(box(90, 2, 58, texMat('stoneDark', 2, 1), 0, 1, 0));
      const stripe = col => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const q = c.getContext('2d'); for (let k = 0; k < 8; k++) { q.fillStyle = k % 2 ? '#f1e6cf' : col; q.fillRect(k * 8, 0, 8, 8); } const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshStandardMaterial({ map: t, roughness: 0.9, side: T.DoubleSide }); };
      const goodsCol = ['#c0392b', '#e0a040', '#c9b38a', '#7a5430', '#8fb04a', '#d8c69a'];
      [[-29, '#b8402e'], [0, '#2f63b0'], [29, '#3f8a3a']].forEach(([x, col], i) => {
        for (const [px, pz] of [[-11, -9], [11, -9], [-11, 9], [11, 9]]) add(cyl(0.9, 0.9, pz < 0 ? 30 : 24, woodVM(2, 30), x + px, pz < 0 ? 15 : 12, pz, 6));
        add(box(25, 2, 13, woodHM(25, 13), x, 11, 2)); add(box(25, 9, 1.2, woodVM(25, 9), x, 6, 8.5));
        for (let k = 0; k < 7; k++) { const gm = std(goodsCol[(k + i * 2) % 6], { roughness: 0.8 }); const o = (k % 3 === 2) ? box(4, 2.6, 3.2, gm, x - 9 + k * 3, 13.3, 2 + (k % 2) * 3) : sph(1.7, gm, x - 9 + k * 3, 13.6, 1 + (k % 2) * 4, 8); add(o); }
        const aw = box(28, 0.6, 22, stripe(col), x, 27, 0); aw.rotation.x = -0.27; add(aw);
      });
      for (const [x, z] of [[-41, 16], [41, 14], [38, 20]]) add(cyl(3.6, 3.2, 8, woodVM(6, 8), x, 4, z, 10));
    } else if (b.kind === 'granary') {
      add(box(54, 4, 46, stoneM(54, 4), 0, 2, 0));
      add(box(48, 34, 40, woodVM(48, 34), 0, 21, 0));
      add(box(16, 22, 1.6, std('#3a2614'), 0, 15, 20.6));
      const gs = new T.Shape(); gs.moveTo(-26, 0); gs.lineTo(26, 0); gs.lineTo(0, 28); gs.closePath();
      const rg = new T.ExtrudeGeometry(gs, { depth: 58, bevelEnabled: false }); rg.translate(0, 0, -29); rg.rotateY(Math.PI / 2);
      add(mesh(rg, thatchM(58, 30), 0, 38, 0));
      const sack = std('#d8c69a', { roughness: 1 });
      for (const [x, y, z] of [[16, 4, 26], [22, 4, 25], [19, 9, 26]]) { const sk = sph(4, sack, x, y, z, 10); sk.scale.set(1, 0.85, 0.9); add(sk); }
    } else if (WORKSHOP[b.kind] && b.kind !== 'ironmine') {
      const k = b.kind, stone = k === 'armory' || k === 'smithy';
      add(box(54, 4, 48, stoneM(54, 4), 0, 2, 0));
      add(box(48, 32, 40, stone ? stoneM(48, 32) : plasterM(48, 32), 0, 20, 0));
      if (!stone) { const tim = woodVM(3, 32); for (const x of [-22.5, -7, 7, 22.5]) { add(box(3, 32, 1.2, tim, x, 20, 20.3)); add(box(3, 32, 1.2, tim, x, 20, -20.3)); } }
      door(inner, -8, 4, 20, 12, 18);
      const gs = new T.Shape(); gs.moveTo(-25, 0); gs.lineTo(25, 0); gs.lineTo(0, 24); gs.closePath();
      const rg = new T.ExtrudeGeometry(gs, { depth: 56, bevelEnabled: false }); rg.translate(0, 0, -28); rg.rotateY(Math.PI / 2);
      add(mesh(rg, k === 'armory' ? texMat('stoneDark', 2, 1) : thatchM(56, 28), 0, 36, 0));
      // a hanging sign and the tools of the trade
      add(cyl(0.8, 0.8, 16, std('#3a2a18'), 26, 30, 21, 5)); const sign = box(10, 8, 1, std('#e8d8b0'), 26, 30, 25); add(sign);
      const barrel = (x, z) => { add(cyl(4.5, 4.5, 9, woodVM(8, 9), x, 4.5, z, 12)); add(cyl(4.7, 4.7, 0.8, std('#2b2824', { metalness: 0.5 }), x, 2, z, 12)); add(cyl(4.7, 4.7, 0.8, std('#2b2824', { metalness: 0.5 }), x, 7, z, 12)); };
      if (k === 'bakery') { const ov = mesh(new T.SphereGeometry(8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), stoneM(16, 8), -30, 0, 14); add(ov); add(box(5, 4, 1, std('#1a120c'), -30, 2.5, 22)); add(box(5, 22, 5, stoneM(5, 22), 16, 46, -8)); }
      if (k === 'brewery' || k === 'tavern') { barrel(-30, 18); barrel(-30, 8); barrel(-22, 26); }
      if (k === 'tavern') { add(box(14, 1.4, 6, woodHM(14, 2), 14, 7, 30)); add(cyl(1, 1, 7, woodVM(2, 7), 8, 3.5, 30, 5)); add(cyl(1, 1, 7, woodVM(2, 7), 20, 3.5, 30, 5)); }
      if (k === 'smithy') { add(box(8, 5, 5, std('#3d3f42', { metalness: 0.7, roughness: 0.4 }), 20, 6, 28)); add(box(4, 3, 4, std('#3d3f42', { metalness: 0.7 }), 20, 3, 28)); add(mesh(new T.SphereGeometry(4, 10, 6), new T.MeshStandardMaterial({ color: C('#ff7a2a'), emissive: C('#ff5a10'), emissiveIntensity: 1.5 }), -16, 6, 24)); }
      if (k === 'bowyer') for (let i = 0; i < 3; i++) { const bw = mesh(new T.TorusGeometry(7, 0.5, 5, 14, Math.PI), std('#6b4422'), -30, 12 + i * 2, 4 + i * 6); bw.rotation.y = Math.PI / 2; add(bw); }
      if (k === 'poleturner') for (let i = 0; i < 4; i++) { const sp = cyl(0.6, 0.6, 30, std('#7b5a34'), -30 + i * 2, 15, 12, 5); sp.rotation.z = 0.15; add(sp); }
      if (k === 'armory') { add(box(20, 14, 2, woodHM(20, 14), 18, 7, 25)); for (let i = 0; i < 4; i++) { const sw = box(0.8, 12, 0.4, std('#e3e8ec', { metalness: 0.85, roughness: 0.25 }), 11 + i * 4.5, 8, 26.5); add(sw); } }
    } else if (b.kind === 'mill') {
      add(cyl(15, 21, 74, stoneM(110, 74), 0, 37, 0, 18));
      add(mesh(new T.ConeGeometry(19, 24, 18), thatchM(60, 24), 0, 86, 0));
      door(inner, 0, 0, 19, 10, 18);
      const hub = new T.Group(); hub.position.set(0, 74, 22); inner.add(hub); info.sails = hub;
      const axle = cyl(2.5, 2.5, 6, woodHM(6, 6), 0, 0, -2, 10); axle.rotation.x = Math.PI / 2; hub.add(axle);
      for (let k = 0; k < 4; k++) { const arm = new T.Group(); arm.rotation.z = k * Math.PI / 2; hub.add(arm); arm.add(box(2, 44, 1.6, woodVM(2, 44), 0, 23, 0)); const sail = box(10, 34, 0.5, std('#e8dcc0', { roughness: 1, side: T.DoubleSide }), 6, 26, 0.6); arm.add(sail); }
    } else if (b.kind === 'chapel') {
      add(box(54, 4, 46, stoneM(54, 4), 0, 2, 0));
      add(box(34, 36, 40, stoneM(34, 36), -8, 22, 0));
      const gs = new T.Shape(); gs.moveTo(-19, 0); gs.lineTo(19, 0); gs.lineTo(0, 18); gs.closePath();
      const rg = new T.ExtrudeGeometry(gs, { depth: 44, bevelEnabled: false }); rg.translate(0, 0, -22); add(mesh(rg, texMat('stoneDark', 2, 1), -8, 40, 0));
      add(box(16, 68, 16, stoneM(16, 68), 16, 34, 10));
      add(mesh(new T.ConeGeometry(12, 20, 4), texMat('stoneDark', 1, 1), 16, 78, 10)).rotation.y = Math.PI / 4;
      add(box(6, 9, 1, std('#2e2014'), 16, 58, 18.3));
      const gold = std('#d8b04a', { metalness: 0.8, roughness: 0.3 }); add(box(1.8, 14, 1.8, gold, 16, 95, 10)); add(box(9, 1.8, 1.8, gold, 16, 98, 10));
      door(inner, -8, 0, 20, 11, 18);
      const glass = new T.MeshStandardMaterial({ color: C('#6f9ee0'), emissive: C('#3a6ab0'), emissiveIntensity: 0.6 });
      for (const z of [-10, 10]) add(box(1, 10, 4, glass, -25.5, 24, z));
    } else if (b.kind === 'garden') {
      add(box(60, 2.4, 60, std('#6a9a44', { roughness: 0.9 }), 0, 1.2, 0));
      for (const [w, d] of [[9, 60], [60, 9]]) add(box(w, 2.8, d, std('#cdb88e', { roughness: 0.95 }), 0, 1.4, 0));
      const hedge = std('#2f5a24', { roughness: 0.95 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(box(24, 6, 4, hedge, sx * 17, 4, sz * 28)); add(box(4, 6, 24, hedge, sx * 28, 4, sz * 17)); add(box(6, 9, 6, hedge, sx * 14, 5, sz * 14)); }
      add(cyl(8, 9, 4, stoneM(16, 4), 0, 2, 0, 16)); add(cyl(6.5, 6.5, 0.6, std('#4f86a8', { roughness: 0.2 }), 0, 4.1, 0, 16)); add(cyl(1.2, 1.6, 8, stoneM(3, 8), 0, 6, 0, 8));
      const flowers = ['#e86a8a', '#f2d24b', '#b78bd8', '#ffffff'];
      for (let i = 0; i < 40; i++) { const qx = -26 + ((i * 37) % 52), qz = -26 + ((i * 53) % 52); if (Math.abs(qx) < 7 || Math.abs(qz) < 7) continue; add(mesh(new T.SphereGeometry(1.6, 6, 4), std(flowers[i % 4]), qx, 3.4, qz)); }
    } else if (b.kind === 'stocks') {
      const wd = woodVM(3, 20);
      for (const x of [-10, 10]) add(box(3, 20, 3, wd, x, 10, 0));
      add(box(26, 6, 4, woodHM(26, 6), 0, 15, 0));
    } else if (b.kind === 'ironmine') {
      // timber headframe over the shaft, a cart of ore
      for (const [x, z] of [[-18, -14], [18, -14], [-18, 14], [18, 14]]) { const p = cyl(2.4, 2.8, 46, woodVM(5, 46), x * 0.8, 23, z * 0.8, 8); p.rotation.set(-z * 0.006, 0, x * 0.006); add(p); }
      add(box(38, 3, 3, woodHM(38, 3), 0, 45, 0)); add(cyl(6, 6, 3, woodHM(12, 3), 0, 45, 0, 16)).rotation.x = Math.PI / 2;
      add(box(26, 1, 22, std('#1a120c'), 0, 0.6, 0));
      add(box(14, 7, 10, woodHM(14, 7), 22, 7, 18)); for (const x of [16, 28]) { const wh = cyl(3, 3, 1.6, std('#3a2a18'), x, 3, 23.5, 10); wh.rotation.x = Math.PI / 2; add(wh); }
      for (let i = 0; i < 5; i++) add(mesh(new T.IcosahedronGeometry(2.5, 0), std('#8a5434', { flatShading: true }), 18 + (i % 3) * 3.5, 11.5, 15 + Math.floor(i / 3) * 4));
    } else if (b.kind === 'hopfarm') {
      const soil = mesh(new T.PlaneGeometry(60, 60), texMat('soil', 2, 4), 0, 0.6, 0, false); soil.rotation.x = -Math.PI / 2; add(soil);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) add(cyl(0.7, 0.7, 26, woodVM(2, 26), -22 + c * 14.6, 13, -22 + r * 14.6, 5));
      for (let r = 0; r < 4; r++) add(box(46, 0.6, 0.6, std('#6b5030'), 0, 25, -22 + r * 14.6));
      const n = 7 * 7 * 3, vines = new T.InstancedMesh(new T.ConeGeometry(2.4, 14, 6), std('#4f8a3a', { roughness: 0.85 }), n);
      vines.castShadow = true; info.wheat = vines; info.wheatN = n; add(vines);
    } else if (b.kind === 'farm' || b.kind === 'wheatfarm') {
      const soil = mesh(new T.PlaneGeometry(60, 60), texMat('soil', 2, 4), 0, 0.6, 0, false); soil.rotation.x = -Math.PI / 2; add(soil);
      const n = 7 * 7 * 3, wheat = new T.InstancedMesh(new T.CylinderGeometry(0.35, 0.7, 11, 4), std('#d8b450', { roughness: 0.8 }), n);
      wheat.castShadow = true; info.wheat = wheat; info.wheatN = n; add(wheat);
      const post = woodVM(3, 9);
      for (const [x, z] of [[-30, -30], [30, -30], [-30, 30], [30, 30], [0, -30], [0, 30]]) add(cyl(1.4, 1.4, 9, post, x, 4.5, z, 6));
      for (const z of [-30, 30]) { add(box(60, 1.3, 1.3, woodHM(60, 2), 0, 7, z)); add(box(60, 1.3, 1.3, woodHM(60, 2), 0, 4, z)); }
    }
    // scaffolding shown while a building goes up
    if (b.done === false && b.kind !== 'moat' && b.kind !== 'pit') {
      const sc = new T.Group(), pm = std('#7a5a34');
      const hw = (b.x1 - b.x0) / 2 + 2, hd = (b.y1 - b.y0) / 2 + 2, H = Math.max(14, (b.topH || 40) * 0.9);
      for (const [x, z] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) sc.add(cyl(1, 1, H, pm, x, H / 2, z, 5));
      for (let y = 12; y < H; y += 16) { sc.add(box(hw * 2, 1, 1, pm, 0, y, hd)); sc.add(box(hw * 2, 1, 1, pm, 0, y, -hd)); }
      g.add(sc); info.scaffold = sc;
    }
    inner.traverse(o => { if (o.isMesh && o.material && !info.mats.includes(o.material) && o.material.emissive) info.mats.push(o.material); });
    scene.add(g);
    return info;
  }
  function rubble(b) {
    const g = new T.Group(), cx = (b.x0 + b.x1) / 2, cz = (b.y0 + b.y1) / 2; g.position.set(cx, heightAt(cx, cz), cz);
    const R = mulberry32(b.id * 7 + 3), w = b.x1 - b.x0, sm = stoneM(10, 8), wm = woodHM(20, 4);
    for (let i = 0; i < Math.min(18, 4 + w / 5); i++) {
      const wood = b.kind === 'tower' || (b.kind === 'house' && R() < 0.5);
      const o = wood ? cyl(2, 2, 20 + R() * 14, wm, 0, 0, 0, 6) : box(8 + R() * 8, 5 + R() * 4, 7 + R() * 6, sm, 0, 0, 0);
      o.position.set((R() - 0.5) * w * 0.9, 2 + R() * 4, (R() - 0.5) * w * 0.8); o.rotation.set(R() * 3, R() * 3, wood ? Math.PI / 2 + R() : R() * 3); g.add(o);
    }
    scene.add(g); return g;
  }
  // ---------- people and rams ----------
  const mailM = () => std('#8b9197', { metalness: 0.55, roughness: 0.45 });
  // smooth, rounded body parts made by spinning a profile (no boxy limbs)
  function capsule(rTop, rBot, len, mat, seg = 12) {
    seg = Math.max(seg, 16); const pts = [];
    for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i / 5) * Math.PI / 2; pts.push(new T.Vector2(Math.max(0.001, Math.cos(a) * rBot), -len + Math.sin(a) * rBot)); }
    for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; pts.push(new T.Vector2(Math.max(0.001, Math.cos(a) * rTop), Math.sin(a) * rTop)); }
    return mesh(new T.LatheGeometry(pts, seg), mat);
  }
  function lathe(profile, mat, seg = 16, open = false) {
    const g = new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(Math.max(0.001, r), y)), seg);
    const o = mesh(g, mat); if (open) o.material.side = T.DoubleSide; return o;
  }
  // join a group's same-material parts into one mesh each, so a person costs far fewer draw calls
  function compact(g) {
    for (const c of [...g.children]) if (!c.isMesh && c.children && c.children.length) compact(c);
    const by = new Map();
    for (const o of g.children) if (o.isMesh && !o.userData.keep && !Array.isArray(o.material)) { const k = o.material.uuid; if (!by.has(k)) by.set(k, []); by.get(k).push(o); }
    for (const list of by.values()) {
      if (list.length < 2) continue;
      const pos = [], nor = [], uv = []; let cast = false;
      for (const o of list) {
        o.updateMatrix(); const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()); geo.applyMatrix4(o.matrix);
        const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv;
        for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); }
        cast = cast || o.castShadow; g.remove(o); o.geometry.dispose(); geo.dispose();
      }
      const mg = new T.BufferGeometry();
      mg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); mg.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); mg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      mg.computeBoundingSphere(); const mm = new T.Mesh(mg, list[0].material); mm.castShadow = cast; mm.receiveShadow = true; g.add(mm);
    }
  }
  // ---- Gerald's 3D models (.glb): when a model for a unit or building is present it replaces the built-in figure ----
  // models/models.json lists the files. A base file holds the mesh (and may hold its moves); extra moves can come in
  // separate files named <name>-walk.glb, <name>-attack.glb and so on. Enemy versions are <name>-enemy.glb.
  const GLB = {}, GLB_ACTIONS = ['idle', 'walk', 'run', 'attack', 'die', 'work'];
  const UNIT_MODEL = { sword: 'swordsman', spear: 'spearman', archer: 'archer', maceman: 'armored-soldier', knight: 'knight', king: 'king', crossbow: 'crossbowman' };
  const clipKey = n => { n = (n || '').toLowerCase(); return /idle|stand|breath/.test(n) ? 'idle' : /run|sprint|charge/.test(n) ? 'run' : /walk|move/.test(n) ? 'walk' : /die|death|dead|fall/.test(n) ? 'die' : /work|chop|hammer|gather|build|dig|harvest/.test(n) ? 'work' : /attack|slash|thrust|stab|swing|fire|shoot|strike|combo/.test(n) ? 'attack' : null; };
  function civModelName(u) {
    const lk = u.look || {}, j = u.job && u.job.kind;
    const role = u.order === 'build' ? 'builder' : j === 'mill' ? 'miller' : j === 'brewery' || j === 'tavern' ? 'brewer' : j && isField(j) ? 'farmer' : u.task && u.task.type === 'food' ? 'gatherer' : null;
    return [role, lk.female ? 'citizen-female' : 'citizen-male'];
  }
  function glbEntry(u) {
    if (isMachine(u) || u.lord) return null;
    const names = u.type === 'civ' ? civModelName(u) : [UNIT_MODEL[u.type]];
    for (const n of names) { if (!n) continue; if (u.team === 'enemy' && GLB[n + '-enemy']) return { e: GLB[n + '-enemy'], key: n + '-enemy' }; if (GLB[n]) return { e: GLB[n], key: n, tint: u.team === 'enemy' }; }
    return null;
  }
  function registerGlb(name, gltf) {
    const sc = gltf.scene; sc.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(sc), size = bb.getSize(new T.Vector3());
    const prev = GLB[name]; GLB[name] = { scene: sc, clips: (prev ? prev.clips : []).concat(gltf.animations || []), h: Math.max(0.001, size.y), w: Math.max(0.001, size.x), d: Math.max(0.001, size.z), minY: bb.min.y, cx: (bb.min.x + bb.max.x) / 2, cz: (bb.min.z + bb.max.z) / 2 };
    // anything already standing is rebuilt with the new model
    for (const [id, md] of unitModels) { scene.remove(md.root); unitModels.delete(id); }
    for (const [id, md] of bModels) { scene.remove(md.g); if (md.rubble) scene.remove(md.rubble); bModels.delete(id); }
  }
  function addGlbClips(name, gltf, act) { const e = GLB[name]; if (!e) return; for (const c of gltf.animations || []) { if (act && !clipKey(c.name)) c.name = act; e.clips.push(c); } for (const [id, md] of unitModels) if (md.glbKey === name) { scene.remove(md.root); unitModels.delete(id); } }
  function loadGlbModels() {
    if (!T.GLTFLoader || !T.SkeletonUtils) return;
    fetch('models/models.json').then(r => r.ok ? r.json() : null).then(list => {
      if (!list || !Array.isArray(list.files)) return;
      const loader = new T.GLTFLoader(), files = list.files.filter(f => /\.glb$/i.test(f));
      const isAct = f => GLB_ACTIONS.some(a => f.toLowerCase().endsWith('-' + a + '.glb'));
      for (const f of files.filter(f => !isAct(f))) { const name = f.replace(/\.glb$/i, '').toLowerCase();
        loader.load('models/' + f, g => { registerGlb(name, g); for (const af of files.filter(x => isAct(x) && x.toLowerCase().startsWith(name + '-') && !x.toLowerCase().startsWith(name + '-enemy'))) { const act = af.toLowerCase().slice(name.length + 1, -4); loader.load('models/' + af, g2 => addGlbClips(name, g2, act), undefined, () => {}); } }, undefined, () => {}); }
    }).catch(() => {});
  }
  function glbUnitModel(u, ent) {
    const e = ent.e, root = new T.Group(), body = new T.Group(); root.add(body);
    const obj = T.SkeletonUtils.clone(e.scene), H = u.type === 'king' ? 46 : u.type === 'knight' ? 45 : 43, s = H / e.h;
    obj.scale.setScalar(s); obj.position.set(-e.cx * s, -e.minY * s, -e.cz * s);
    const mats = [], tint = ent.tint ? new T.Color('#55565e') : null;
    obj.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const one = m => { const c = m.clone(); if (tint && c.color) c.color.multiply(tint); if (!c.emissive) c.emissive = new T.Color(0, 0, 0); mats.push(c); return c; };
      o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); });
    body.add(obj);
    const mixer = new T.AnimationMixer(obj), acts = {};
    for (const c of e.clips) { const k = clipKey(c.name); if (k && !acts[k]) acts[k] = mixer.clipAction(c); }
    if (!Object.keys(acts).length && e.clips[0]) acts.idle = mixer.clipAction(e.clips[0]);
    return { root, body, mats, glb: true, glbKey: ent.key, mixer, acts, cur: null, m: {}, heading: u.facing < 0 ? -Math.PI / 2 : Math.PI / 2 };
  }
  function animateGlb(u, md, dt) {
    const A = md.acts; let want = u.dead ? 'die' : u.attackAnim > 0 ? 'attack' : (u.type === 'civ' && u.sub === 'work') ? (A.work ? 'work' : 'attack') : u.moving ? ((u.order === 'attack' || u.order === 'raid' || u.order === 'flee') && A.run ? 'run' : 'walk') : 'idle';
    if (!A[want]) want = want === 'run' && A.walk ? 'walk' : want === 'work' && A.attack ? 'attack' : A.idle ? 'idle' : null;
    const fresh = want === 'attack' && u.attackAnim > 0 && u.attackAnim < (md.lastAtk || 1) && md.cur === 'attack';
    if (want && (md.cur !== want || fresh)) {
      const a = A[want]; a.enabled = true; a.reset(); a.setEffectiveWeight(1);
      if (want === 'die' || want === 'attack') { a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = want === 'die'; } else a.setLoop(T.LoopRepeat, Infinity);
      if (want === 'attack' && u.animDur) a.setEffectiveTimeScale(Math.max(0.3, a.getClip().duration / u.animDur));
      a.play(); if (md.cur && md.cur !== want && A[md.cur]) A[md.cur].crossFadeTo(a, 0.18, false); md.cur = want;
    }
    md.lastAtk = u.attackAnim || 1;
    if (A.walk && md.cur === 'walk') A.walk.setEffectiveTimeScale(Math.max(0.4, u.speed / 40 * (u.sick ? 0.72 : 1)));
    md.mixer.update(Number.isFinite(dt) ? Math.min(dt, 0.1) : 0);   // one bad time step would leave the model nowhere
  }
  function glbBuilding(b, info) {   // a building model, fitted to its plot
    const name = b.kind, e = (b.team === 'enemy' && GLB[name + '-enemy']) || GLB[name]; if (!e) return false;
    const obj = e.scene.clone(true), fw = (b.dir || 0) % 2 ? b.y1 - b.y0 : b.x1 - b.x0, fd = (b.dir || 0) % 2 ? b.x1 - b.x0 : b.y1 - b.y0, s = Math.min(fw / e.w, fd / e.d) * 0.98;
    obj.scale.setScalar(s); obj.position.set(-e.cx * s, -e.minY * s, -e.cz * s);
    obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    info.inner.add(obj); return true;
  }
  function spriteUnitModel(u, sp) {
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const pivot = new T.Group(); body.add(pivot);
    const H = (u.type === 'king' ? 47 : u.type === 'knight' ? 46 : 44) * 1.12, cw = sp.img.width / sp.n, W = H * cw / sp.img.height;
    const tex = new T.Texture(sp.img); tex.encoding = T.sRGBEncoding; tex.needsUpdate = true; tex.repeat.set(1 / sp.n, 1); tex.anisotropy = 4;
    const mat = new T.MeshBasicMaterial({ map: tex, alphaTest: 0.45, side: T.DoubleSide, toneMapped: false });
    const geo = new T.PlaneGeometry(W, H); geo.translate(0, H / 2 - 1.5, 0);
    const card = new T.Mesh(geo, mat); pivot.add(card);
    const sh = new T.Mesh(new T.CircleGeometry(W * 0.36, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.4; sh.scale.set(1, 0.55, 1); root.add(sh);
    return { root, body, pivot, card, tex, sp, sprite: true, mats: [mat], m: {}, heading: u.facing < 0 ? -Math.PI / 2 : Math.PI / 2, spVer: ART.ver };
  }
  function animateSprite(u, md, dt) {
    const cp = camera.position, camDir = Math.atan2(cp.x - u.x, cp.z - u.y);
    let rel = md.heading - camDir; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const [idx, flip] = spriteView(md.sp, rel), n = md.sp.n;
    md.tex.repeat.x = (flip ? -1 : 1) / n; md.tex.offset.x = (flip ? idx + 1 : idx) / n;
    md.pivot.rotation.y = camDir - md.heading;   // the card always faces the viewer
    const mv = u.moving && !u.dead, ph = u.walkPhase || 0;
    md.card.position.y = mv ? Math.abs(Math.sin(ph)) * 1.6 : Math.sin(time * 1.6 + (u.seed || 0)) * 0.15;
    md.card.rotation.z = mv ? Math.sin(ph) * 0.045 : 0;
    md.card.rotation.x = u.attackAnim > 0 ? -Math.sin(u.attackAnim * Math.PI) * 0.22 : 0;
  }
  function personModel(u) {
    const P = u.pal, soldier = (swordish(u) || u.type === 'spear'), lk = u.look || { beard: false, longHair: false, w: 1, h: 1 };
    const m = {
      skin: std(u.skin, { roughness: 0.62 }), pants: std(P.pants, { map: fabricTex() }), boot: std(P.boot, { roughness: 0.55 }),
      cloth: std(P.tunic, { map: fabricTex(), bumpMap: fabricTex(), bumpScale: 0.25 }), dark: std(P.tunicDark, { map: fabricTex() }),
      skirt: new T.MeshStandardMaterial({ color: C(P.tunic), map: fabricTex(), roughness: 0.85, side: T.DoubleSide }),
      mail: std('#8b9197', { metalness: 0.6, roughness: 0.4, map: mailTex(), bumpMap: mailTex(), bumpScale: 0.35 }),
      mailSkirt: new T.MeshStandardMaterial({ color: C('#8b9197'), metalness: 0.6, roughness: 0.42, map: mailTex(), side: T.DoubleSide }),
      helm: std(P.helmet || '#c3cad1', { metalness: 0.75, roughness: 0.3 }),
      wood: std('#7b5a34'), steel: std('#e6eaee', { metalness: 0.9, roughness: 0.2 }), hair: std(u.hair || '#3a2414', { roughness: 0.9 }), gold: std('#c9a24a', { metalness: 0.7, roughness: 0.38 }),
      belt: std('#4a3020', { roughness: 0.6 }), glove: std('#5a3e24', { roughness: 0.6 }), eyeW: std('#eee8dc', { roughness: 0.4 }), eye: std('#2a1c12', { roughness: 0.3 }), lip: std('#9a5a4a'),
      rim: std(P.shieldRim || '#d9b04a', { metalness: 0.5, roughness: 0.45 }), shieldF: std(P.shield || P.tunic, { roughness: 0.7 }), string: std('#e8e0c8')
    };
    // Gerald's sheets: polished plate over mail, gold edging, crimson cloth with the gold lion (blackened steel and an ember tower for the foe)
    const team = u.team === 'enemy' ? 'enemy' : 'player';
    m.lion = new T.MeshStandardMaterial({ map: emblemTex(team), roughness: 0.88, side: T.DoubleSide });
    m.trimG = std(team === 'enemy' ? ENEMY_TRIM : ARMY.gold, { metalness: 0.75, roughness: 0.32 });
    if (soldier) {
      m.plate = std(team === 'enemy' ? '#5d6168' : '#d5dbe1', { metalness: 0.92, roughness: team === 'enemy' ? 0.36 : 0.24, map: steelTex(), bumpMap: steelTex(), bumpScale: 0.12 });
      m.mail = std('#8b9197', { metalness: 0.6, roughness: 0.4, map: mailTex(), bumpMap: mailTex(), bumpScale: 0.35 }); m.mail.map = mailTex().clone(); m.mail.map.needsUpdate = true; m.mail.map.repeat.set(3, 3); m.mail.bumpMap = m.mail.map;
      m.belt = std('#5a3a20', { roughness: 0.6, map: leatherTex() });
      m.pants = m.plate; m.boot = m.plate; m.glove = m.plate;
      if (u.type === 'sword' && team === 'player') lk.beard = true;   // the swordsman: bare-headed and bearded
    }
    const shieldFace = (rx, ry, ox, oy) => { const t = emblemTex(team).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.repeat.set(rx, ry); t.offset.set(ox, oy); return new T.MeshStandardMaterial({ map: t, roughness: 0.7 }); };
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const sleeve = soldier ? m.mail : m.cloth, gloved = soldier || u.type === 'archer';
    // legs: thigh, knee, shin and a shaped boot
    const legs = [];
    for (const side of [-1, 1]) {
      const hip = new T.Group(); hip.position.set(side * 2.1, 19.2, 0); body.add(hip);
      hip.add(capsule(2.25, 1.75, 9.6, m.pants, 12));
      const knee = new T.Group(); knee.position.set(0, -9.6, 0); hip.add(knee);
      const shin = capsule(1.85, 1.35, 8.4, m.boot, 12); knee.add(shin);
      const foot = sph(1.5, m.boot, 0, -8.9, 1.3, 12); foot.scale.set(1.05, 0.62, 2.0); knee.add(foot);
      knee.add(cyl(2.0, 1.95, 1.0, m.belt, 0, -2.6, 0, 12));   // boot cuff
      if (soldier) { const pk = sph(1.55, m.plate, 0, 0.1, 0.95, 10); pk.scale.set(1, 0.85, 0.75); knee.add(pk); }   // knee cop
      const sole = box(2.9, 0.5, 4.6, std('#2a1e14', { roughness: 0.7 }), 0, -9.85, 1.2); knee.add(sole);
      legs.push({ hip, knee, side });
    }
    // torso: hips, waist, chest and sloping shoulders in one smooth shape, deeper at the chest than the back
    const torso = lathe([[0, 15.6], [4.3, 16.2], [4.6, 18], [4.15, 20.5], [4.5, 23.5], [5.2, 27], [5.35, 29.6], [4.9, 31.3], [3.4, 32.6], [1.7, 33.4], [0, 33.6]], soldier ? m.mail : m.cloth, 24);
    torso.scale.set(1, 1, 0.7); body.add(torso); torso.userData.keep = true;
    // rounded shoulders: a sloping trapezius from the neck to each shoulder, so the outline is never square
    for (const side of [-1, 1]) { const tr = capsule(1.7, 1.5, 3.6, soldier ? m.mail : m.cloth, 12); tr.position.set(side * 1.7, 33.4, -0.3); tr.rotation.z = side * 1.25; body.add(tr); }
    // a belly that grows when they eat well
    const belly = sph(4.3, soldier ? m.mail : m.cloth, 0, 21.8, 1.6, 16); belly.scale.set(1, 0.9, 0.9); body.add(belly); belly.userData.keep = true;
    if (lk.female) for (const side of [-1, 1]) { const ch = sph(1.55, m.cloth, side * 1.75, 27.6, 3.1, 10); ch.scale.set(1, 0.9, 0.75); body.add(ch); }
    // tunic skirt or mail skirt flaring over the thighs
    const sk = lathe(lk.female && !soldier ? [[4.75, 20.2], [5.1, 17], [5.8, 11], [6.6, 4.5], [6.9, 2.6]] : [[4.75, 20.2], [5.0, 18], [5.5, 15], [5.9, 12.2]], soldier ? m.mailSkirt : m.skirt, 22, true); sk.scale.set(1, 1, 0.78); sk.geometry.translate(0, -20.2, 0); sk.position.y = 20.2; body.add(sk); sk.userData.keep = true; const cloth = [sk];
    if (soldier) {
      // surcoat in the team colour, front and back, with a belt and a gold badge
      const bp = lathe([[4.7, 31.6], [5.5, 29], [5.5, 25.4], [4.95, 22]], m.plate, 24, true); bp.scale.set(1.04, 1, 0.8); body.add(bp);
      for (const y of [31.5, 22]) { const tr = mesh(new T.TorusGeometry(y > 30 ? 4.75 : 4.98, 0.22, 6, 26), m.trimG, 0, y, 0); tr.rotation.x = Math.PI / 2; tr.scale.set(1.04, 0.8, 1); body.add(tr); }
      const ridge = box(0.35, 8.5, 0.5, m.plate, 0, 26.6, 4.3); ridge.rotation.x = 0.06; body.add(ridge);
      const sc = lathe([[4.95, 22.2], [5.3, 19], [5.75, 15.5], [6.05, 13.2]], m.skirt, 22, true); sc.scale.set(1.01, 1, 0.75); body.add(sc);
      if (u.type === 'sword' || u.type === 'king') { const md = cyl(1.55, 1.55, 0.4, m.trimG, 0, 27.6, 4.35, 16); md.rotation.x = Math.PI / 2; body.add(md); const mi = cyl(1.15, 1.15, 0.45, [m.trimG, m.lion, m.trimG], 0, 27.6, 4.45, 16); mi.rotation.x = Math.PI / 2; body.add(mi); }
      else { const tb = mesh(new T.CylinderGeometry(6.0, 6.7, 15.5, 12, 1, true, -0.72, 1.44), m.lion, 0, 20.4, 0); tb.scale.set(1.0, 1, 0.86); body.add(tb); tb.userData.keep = true;
        const tbk = mesh(new T.CylinderGeometry(5.75, 6.25, 15.5, 12, 1, true, Math.PI - 0.72, 1.44), m.skirt, 0, 20.4, 0); tbk.scale.set(1.02, 1, 0.8); body.add(tbk); }
    }
    if (u.type === 'archer') { m.skirt = std('#5a3e26', { map: fabricTex(), roughness: 0.75, side: T.DoubleSide }); const lb = cyl(1.2, 1.2, 0.4, [m.trimG, m.lion, m.trimG], -1.6, 28, 3.9, 14); lb.rotation.x = Math.PI / 2; body.add(lb); const jk = lathe([[5.0, 30.5], [5.4, 27.5], [4.7, 22.5], [5.2, 17.5], [5.8, 14.2]], m.skirt, 22, true); jk.scale.set(1.02, 1, 0.74); body.add(jk); }
    const belt = cyl(4.75, 4.75, 1.4, m.belt, 0, 20.3, 0, 18); belt.scale.set(1, 1, 0.74); body.add(belt); body.add(box(1.6, 1.6, 0.6, m.gold, 0.6, 20.3, 3.55));
    { const pouch = sph(1.3, m.belt, 3.9, 18.6, 1.6, 10); pouch.scale.set(0.8, 1, 0.55); body.add(pouch); }
    if (!soldier) { const hem = lathe([[5.95, 12.6], [5.9, 12.0]], std(u.type === 'civ' ? (u.team === 'enemy' ? ENEMY_COL : PAL.player.tunic) : P.tunicDark, { side: T.DoubleSide }), 22, true); hem.scale.set(1, 1, 0.78); body.add(hem); }
    // neck and head with jaw, nose, eyes, brows, ears and mouth
    const neck = capsule(1.45, 1.6, 2.6, m.skin, 10); neck.position.set(0, 35.6, 0.15); body.add(neck);
    const head = new T.Group(); head.position.set(0, 38.4, 0.25); body.add(head);
    const skull = sph(2.85, m.skin, 0, 0.35, 0, 22); skull.scale.set(0.93, 1.1, 1.02); head.add(skull);
    const jaw = sph(2.3, m.skin, 0, -1.25, 0.55, 14); jaw.scale.set(0.92, 0.85, 1.0); head.add(jaw);
    const nose = mesh(new T.ConeGeometry(0.55, 1.6, 8), m.skin, 0, -0.1, 2.85); nose.rotation.x = Math.PI / 2 + 0.35; head.add(nose);
    for (const side of [-1, 1]) {
      const ew = sph(0.36, std('#cfc6b6', { roughness: 0.5 }), side * 0.95, 0.55, 2.4, 8); ew.scale.set(1, 0.6, 0.45); head.add(ew);
      head.add(sph(0.22, m.eye, side * 0.95, 0.55, 2.56, 6));
      const brow = box(1.3, 0.32, 0.45, m.hair, side * 1.0, 1.25, 2.5); brow.rotation.z = -side * 0.14; head.add(brow); brow.userData.keep = true; (m.brows = m.brows || []).push({ brow, side });
      const ear = sph(0.75, m.skin, side * 2.6, 0.1, 0.1, 8); ear.scale.set(0.45, 1, 0.75); head.add(ear);
    }
    const mouth = box(1.25, 0.25, 0.3, m.lip, 0, -1.55, 2.55); head.add(mouth); mouth.userData.keep = true;
    // faces show feeling: a smile when content, a frown when unhappy
    const smile = mesh(new T.TorusGeometry(0.72, 0.15, 4, 10, Math.PI), m.lip, 0, -1.2, 2.55); smile.rotation.z = Math.PI; head.add(smile); smile.userData.keep = true;
    const frown = mesh(new T.TorusGeometry(0.72, 0.15, 4, 10, Math.PI), m.lip, 0, -1.95, 2.55); head.add(frown); frown.userData.keep = true;
    m.mouths = { mouth, smile, frown };
    const lower = sph(0.55, m.lip, 0, -1.72, 2.4, 8); lower.scale.set(1.1, 0.4, 0.45); head.add(lower);
    for (const side of [-1, 1]) {
      const lid = sph(0.56, m.skin, side * 0.95, 0.78, 2.32, 8); lid.scale.set(1.05, 0.42, 0.55); head.add(lid);
      const cheek = sph(0.9, m.skin, side * 1.5, -0.6, 1.95, 8); cheek.scale.set(0.9, 0.7, 0.6); head.add(cheek);
      if (u.type === 'civ' || u.type === 'archer') { const tm = box(0.55, 1.6, 1.2, m.hair, side * 2.62, 0.4, 0.5); head.add(tm); }
    }
    const chin = sph(0.8, m.skin, 0, -2.45, 1.65, 8); chin.scale.set(1.15, 0.7, 0.8); head.add(chin);
    if (lk.beard && !lk.female) { const bd = mesh(new T.SphereGeometry(2.42, 16, 10, -Math.PI * 0.62, Math.PI * 1.24, Math.PI * 0.42, Math.PI * 0.5), m.hair, 0, -0.9, 0.35); bd.scale.set(0.98, 1.05, 1.06); head.add(bd); const ch2 = sph(1.05, m.hair, 0, -2.85, 1.85, 10); ch2.scale.set(1.2, 1.15, 0.8); head.add(ch2);
      for (const sd of [-1, 1]) { const ms = capsule(0.32, 0.26, 1.3, m.hair, 6); ms.position.set(sd * 0.75, -1.05, 2.55); ms.rotation.z = sd * 1.25; head.add(ms); const sb = sph(0.9, m.hair, sd * 2.0, -0.9, 0.9, 8); sb.scale.set(0.6, 1.2, 0.9); head.add(sb); } }
    if (soldier) {
      const t = u.type, bare = (t === 'sword' && team === 'player') || t === 'king' || t === 'knight';
      if (t === 'spear') {   // a rounded open-faced kettle helm with a flared brim and a gold band
        head.add(lathe([[3.85, 0.55], [3.35, 1.15], [3.1, 2.4], [2.55, 3.75], [1.4, 4.65], [0, 4.95]], m.plate, 22));
        const band = mesh(new T.TorusGeometry(3.14, 0.2, 6, 22), m.trimG, 0, 1.45, 0); band.rotation.x = Math.PI / 2; head.add(band);
        for (const sd of [-1, 1]) head.add(box(0.45, 2.8, 2.3, m.plate, sd * 2.95, -0.7, 0.55));
      } else if (!bare) {    // a closed, rounded armet with a visor slit and a crest ridge
        head.add(lathe([[2.7, -3.1], [3.2, -1.6], [3.4, 0.4], [3.25, 2.1], [2.75, 3.4], [1.8, 4.3], [0.8, 4.75], [0, 4.85]], m.plate, 22));
        const slit = mesh(new T.TorusGeometry(3.43, 0.22, 4, 14, Math.PI * 0.62), std('#141010'), 0, 0.85, 0.05); slit.rotation.set(Math.PI / 2, 0, Math.PI * 0.19); head.add(slit);
        const crest = mesh(new T.TorusGeometry(3.3, 0.3, 6, 16, Math.PI), m.trimG, 0, 0.6, 0); crest.rotation.y = Math.PI / 2; head.add(crest);
      }
      if (P.plume && !bare) { const pl = sph(1.0, std(P.plume), 0, 5.2, -1.2, 8); pl.scale.set(0.8, 1.4, 3.2); head.add(pl); }
      const gorget = lathe([[1.75, 36.3], [2.05, 35.6], [2.9, 34.6], [3.7, 33.9]], m.mailSkirt, 18, true); gorget.scale.set(1, 1, 0.85); body.add(gorget);
      // the great cape, crimson with the gold lion, hanging from the shoulders so it swings and blows from the top
      if (t !== 'king') { const cg = new T.PlaneGeometry(12.4, 23.5, 12, 12); cg.translate(0, -11.75, 0); { const ps = cg.attributes.position; for (let i = 0; i < ps.count; i++) { const x = ps.getX(i), y = ps.getY(i), dn = -y / 23.5; ps.setZ(i, Math.sin(x * 1.15 + 0.4) * 0.55 * dn + (1 - Math.cos(x / 6.2 * Math.PI / 2)) * 1.6 + (dn < 0.12 ? (0.12 - dn) * 22 * (1 - Math.abs(x) / 6.2 * 0.4) : 0)); ps.setX(i, x * (1 + dn * 0.22)); } cg.computeVertexNormals(); } const cloak = mesh(cg, m.lion, 0, 34.0, -3.6); body.add(cloak); m.cloak = cloak; m.cloakM = cloak.material; }
    } else if (u.type === 'archer') {
      // hood falling to the shoulders
      const hood = lathe([[3.2, -1.0], [3.3, 1.0], [2.9, 2.8], [1.8, 4.0], [0, 4.4]], std('#5e4a2c', { roughness: 0.95, side: T.DoubleSide }), 16); hood.scale.set(1, 1, 1.05); hood.position.z = -0.3; head.add(hood); m.hood = hood.material;
      const cowl = lathe([[3.3, -0.8], [3.8, -2.6], [5.2, -4.6]], m.hood, 16, true); cowl.scale.set(1, 1, 0.8); cowl.position.z = -0.35; head.add(cowl);
      const fe = box(0.35, 5, 0.3, m.cloth, -2.0, 4.2, -1.6); fe.rotation.z = 0.7; head.add(fe);
      const cgA = new T.PlaneGeometry(9.6, 19, 2, 6); cgA.translate(0, -9.5, 0); const cape = mesh(cgA, m.lion, 0, 33, -4.1); body.add(cape); m.cloak = cape; m.cloakM = cape.material;
    } else {
      const hairCap = mesh(new T.SphereGeometry(3.0, 16, 8, 0, Math.PI * 2, 0, Math.PI / 1.75), m.hair, 0, 0.5, -0.25); hairCap.scale.set(0.95, 1.05, 1.05); head.add(hairCap);
      const cap = mesh(new T.SphereGeometry(3.15, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2.7), std(u.team === 'enemy' ? ENEMY_COL : PAL.player.tunic), 0, 1.25, -0.1); head.add(cap); m.cap = cap.material;
      if (lk.longHair) { const lh = sph(2.6, m.hair, 0, -1.6, -1.9, 10); lh.scale.set(1.05, 1.3, 0.6); head.add(lh); }
      if (lk.female) { cap.visible = false; const scarf = mesh(new T.SphereGeometry(3.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 1.9), std(['#c8b68a', '#8a3a30', '#5a6a8a'][lk.hairStyle || 0], { map: fabricTex() }), 0, 0.6, -0.3); head.add(scarf); }
    }
    // arms: shoulder ball, upper arm, elbow, forearm, and a hand with a thumb
    // a lock of hair or a braid that swings and blows in the wind
    let tail = null;
    if (lk.longHair && u.type !== 'knight') { tail = new T.Group(); tail.position.set(0, -0.6, -2.7); head.add(tail); const tl = capsule(1.0, 0.55, lk.female ? 6.5 : 3.6, m.hair, 8); tail.add(tl); tl.userData.keep = true; tail.userData.keep = true; }
    const arms = [];
    for (const side of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(side * (lk.female ? 4.75 : soldier ? 5.55 : 5.15), 31.2, 0); body.add(sh);
      sh.add(sph(1.95, sleeve, 0, 0, 0, 12));
      sh.add(capsule(1.75, 1.4, 6.9, sleeve, 12));
      if (soldier) { for (let k = 0; k < 3; k++) { const pd = mesh(new T.SphereGeometry(2.6 - k * 0.22, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.plate, side * 0.3, 0.6 - k * 1.15, 0); pd.scale.set(1.05, 0.72, 1.12); sh.add(pd); }
        const pr = mesh(new T.TorusGeometry(2.55, 0.16, 5, 18), m.trimG, side * 0.3, 0.6, 0); pr.rotation.x = Math.PI / 2; pr.scale.set(1.05, 1.12, 1); sh.add(pr); }
      const el = new T.Group(); el.position.set(0, -6.9, 0); sh.add(el);
      el.add(capsule(1.4, 1.1, 6.3, soldier ? m.plate : u.type === 'archer' ? m.skirt : m.skin, 12));
      if (soldier) { const ec = sph(1.45, m.plate, 0, 0.1, -0.2, 10); ec.scale.set(1, 0.9, 1.05); el.add(ec); }   // elbow cop
      if (gloved) { const cuff = capsule(1.3, 1.25, 1.8, m.glove, 10); cuff.position.set(0, -4.8, 0); el.add(cuff); }   // glove cuff
      const hand = new T.Group(); hand.position.set(0, -6.6, 0); el.add(hand);
      const palm = sph(1.15, gloved ? m.glove : m.skin, 0, -0.5, 0.25, 10); palm.scale.set(0.78, 1.15, 1.0); hand.add(palm);
      const thumb = capsule(0.38, 0.34, 1.0, gloved ? m.glove : m.skin, 6); thumb.position.set(-side * 0.65, -0.1, 0.85); thumb.rotation.x = -0.9; hand.add(thumb);
      for (let f = 0; f < 4; f++) { const fg = capsule(0.24, 0.21, 1.05, gloved ? m.glove : m.skin, 6); fg.position.set((f - 1.5) * 0.36, -1.5, 0.55); fg.rotation.x = -0.6 - f * 0.05; hand.add(fg); }
      arms.push({ sh, el, hand, side });
    }
    const R = arms[1], L = arms[0], tools = {};
    // a grip keeps a held item level with the body whatever the arm is doing (set each frame)
    const grip = (arm) => { const g = new T.Group(); g.position.set(0, -0.6, 0.3); arm.hand.add(g); return g; };
    if (swordish(u)) {
      // sword in the right fist, pointing forward from the knuckles
      const sw = new T.Group(); sw.rotation.x = Math.PI / 2 - 0.25; sw.position.set(0, -0.6, 0.3); R.hand.add(sw);
      const bs = new T.Shape(); bs.moveTo(-0.72, 0); bs.lineTo(0.72, 0); bs.lineTo(0.5, 16.2); bs.lineTo(0, 18.4); bs.lineTo(-0.5, 16.2); bs.closePath();
      const blade = mesh(new T.ExtrudeGeometry(bs, { depth: 0.22, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.1, bevelSegments: 1 }), m.steel, 0, 1.6, -0.11); sw.add(blade);
      sw.add(box(5.2, 0.7, 0.9, m.gold, 0, 1.3, 0));
      sw.add(cyl(0.42, 0.42, 2.6, m.belt, 0, -0.2, 0, 8)); sw.add(sph(0.75, m.gold, 0, -1.7, 0, 8));
      tools.sword = sw;
      if (u.type === 'maceman') {   // a mace: a short haft and a flanged iron head
        sw.clear(); sw.add(cyl(0.5, 0.55, 9, m.wood, 0, 3, 0, 7)); const hd = sph(1.9, std('#4d5359', { metalness: 0.7, roughness: 0.4 }), 0, 8.4, 0, 10); sw.add(hd);
        for (let f = 0; f < 6; f++) { const fl = box(0.5, 2.6, 1.4, std('#5d636a', { metalness: 0.7, roughness: 0.4 }), Math.cos(f) * 1.7, 8.4, Math.sin(f) * 1.7); fl.rotation.y = -f; sw.add(fl); }
      }
      if (u.type === 'knight') {   // plate: a closed great helm, a breastplate, steel arms
        const plate = std('#cfd6dc', { metalness: 0.85, roughness: 0.28 });
        const gh = lathe([[3.05, -2.6], [3.35, -1.2], [3.4, 0.6], [3.25, 2.0], [2.8, 3.2], [2.0, 4.1], [1.0, 4.6], [0, 4.75]], plate, 20); gh.position.set(0, 0, 0.1); head.add(gh);   // a rounded great helm
        const slit = mesh(new T.TorusGeometry(3.42, 0.24, 4, 14, Math.PI * 0.62), std('#16110c'), 0, 0.85, 0.1); slit.rotation.set(Math.PI / 2, 0, Math.PI * 0.19); head.add(slit);
      }
      if (u.type === 'king') {   // a gold crown and a fur-trimmed royal cloak
        const crown = cyl(3.1, 3.0, 1.6, m.gold, 0, 3.2, 0, 16); head.add(crown);
        for (let f = 0; f < 6; f++) { const a = f / 6 * Math.PI * 2; head.add(mesh(new T.ConeGeometry(0.55, 1.8, 5), m.gold, Math.sin(a) * 3, 4.8, Math.cos(a) * 3)); }
        const cape = mesh(new T.PlaneGeometry(11, 24, 1, 4), new T.MeshStandardMaterial({ color: C('#6a1e7a'), side: T.DoubleSide, roughness: 0.8, map: fabricTex() }), 0, 21, -5); body.add(cape); m.cloak = cape;
        body.add(cyl(5.4, 5.4, 1.6, std('#efe6d8', { roughness: 1 }), 0, 32, -1, 14));
      }
      // kite shield on the left arm, painted in the team colour with a rim and a stripe
      const sg = grip(L); tools.shieldGrip = sg;
      const ks = (s) => { const sh = new T.Shape(); sh.moveTo(-4.8 * s, 6.2 * s); sh.quadraticCurveTo(0, 7.6 * s, 4.8 * s, 6.2 * s); sh.quadraticCurveTo(5 * s, 0, 0, -10 * s); sh.quadraticCurveTo(-5 * s, 0, -4.8 * s, 6.2 * s); return sh; };
      const shield = new T.Group(); shield.position.set(-1.2, 0.5, 2.0); sg.add(shield);
      shield.add(mesh(new T.ExtrudeGeometry(ks(1.08), { depth: 0.6, bevelEnabled: false }), m.rim, 0, 0, -0.1));
      shield.add(mesh(new T.ExtrudeGeometry(ks(1), { depth: 0.6, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.2, bevelSegments: 1 }), [shieldFace(1 / 10.4, 1 / 18.4, 0.5, 10.4 / 18.4), m.shieldF], 0, 0, 0.15));
    } else if (u.type === 'spear') {
      const sg = grip(R); tools.spearGrip = sg;
      const spear = new T.Group(); sg.add(spear); tools.spear = spear;
      spear.add(cyl(0.5, 0.58, 62, m.wood, 0, 6, 0, 8));
      const lh = sph(1.0, m.steel, 0, 39.5, 0, 10); lh.scale.set(1.1, 4.2, 0.35); spear.add(lh);
      spear.add(cyl(0.7, 0.62, 1.6, m.belt, 0, 36.4, 0, 8));
      // round shield on the left arm
      const lg = grip(L); tools.shieldGrip = lg;
      const shield = new T.Group(); shield.position.set(-1.2, 0.4, 2.0); lg.add(shield);
      const face = cyl(5.8, 5.8, 0.8, [m.shieldF, m.lion, m.shieldF], 0, 0, 0, 24); face.rotation.x = Math.PI / 2; face.rotation.y = Math.PI; shield.add(face);
      const rim = mesh(new T.TorusGeometry(5.8, 0.45, 6, 24), m.rim, 0, 0, 0.3); shield.add(rim);
    } else if (u.type === 'archer') {
      // longbow in the left hand with a real string, quiver of arrows on the back
      const bg = grip(L); tools.bowGrip = bg;
      const bow = new T.Group(); bow.position.set(0, 0.2, 0.4); bg.add(bow); tools.bow = bow;
      const arc = new T.Group(); arc.rotation.y = -Math.PI / 2; arc.position.z = -10; bow.add(arc);
      const limb = mesh(new T.TorusGeometry(10, 0.48, 6, 22, Math.PI * 0.72), m.wood, 0, 0, 0); limb.rotation.z = -Math.PI * 0.36; arc.add(limb);
      const tipY = 10 * Math.sin(Math.PI * 0.36), tipX = 10 * Math.cos(Math.PI * 0.36);
      const sGeo = new T.BufferGeometry(); sGeo.setAttribute('position', new T.Float32BufferAttribute([tipX, tipY, 0, tipX, 0, 0, tipX, -tipY, 0], 3));
      const str = new T.Line(sGeo, new T.LineBasicMaterial({ color: 0xe8e0c8 })); arc.add(str); tools.string = sGeo; tools.tipX = tipX;
      const quiver = new T.Group(); quiver.position.set(-1.8, 27, -4.2); quiver.rotation.z = 0.35; body.add(quiver);
      quiver.add(cyl(1.5, 1.3, 11, m.belt, 0, 0, 0, 10));
      for (let i = 0; i < 5; i++) { const ax = (i % 3 - 1) * 0.6, az = (i < 3 ? -0.3 : 0.4); quiver.add(cyl(0.12, 0.12, 4, m.wood, ax, 7, az, 4)); const fl = box(0.08, 1.8, 0.9, m.eyeW, ax, 8.6, az); quiver.add(fl); }
      const strap = cyl(5.5, 5.5, 0.6, m.belt, 0, 27.6, 0, 18); strap.rotation.z = -0.75; strap.scale.set(1, 1, 0.72); body.add(strap);
    } else if (u.type === 'civ') {
      const axe = new T.Group(); axe.add(cyl(0.45, 0.5, 13, m.wood, 0, -4, 0, 7)); const ah = box(0.6, 3.6, 4.4, m.steel, 0, -9.6, 2.2); axe.add(ah); R.hand.add(axe); tools.axe = axe;
      const hammer = new T.Group(); hammer.add(cyl(0.45, 0.45, 10, m.wood, 0, -3, 0, 7)); hammer.add(box(2.0, 2.2, 4.6, std('#5d636a', { metalness: 0.7, roughness: 0.4 }), 0, -8, 0)); R.hand.add(hammer); tools.hammer = hammer;
      const basket = cyl(3.2, 2.5, 4.2, std('#8a6a3a', { roughness: 0.95 }), 0, -2.2, 1.5, 14); R.hand.add(basket); tools.basket = basket;
      // logs carried on the right shoulder, running front to back
      const logs = new T.Group(); for (let k = 0; k < 3; k++) { const l = cyl(1.25, 1.25, 16, woodHM(16, 3), 4.6 + (k - 1) * 1.6, 33.6 + (k === 1 ? 1.8 : 0), 0, 10); l.rotation.x = Math.PI / 2; logs.add(l); } body.add(logs); tools.logs = logs;
      // a grain sack over the shoulder for wheat and hops; a pack for workshop goods
      const sack = sph(3.2, std('#c9b38a', { roughness: 1 }), -4.2, 32.5, -2.5, 12); sack.scale.set(1, 1.25, 0.9); body.add(sack); tools.sack = sack;
      const pack = cyl(2.8, 2.3, 6, std('#8a6a3a', { roughness: 0.95 }), 0, 27, -5, 12); body.add(pack); tools.pack = pack;
      // berries fill the basket in the hand
      const berries = new T.Group(); for (const [bx, bz] of [[-1, 1], [1, 2], [0, 0.6], [1.3, 0.4], [-1.1, 2.2]]) berries.add(sph(1.05, std('#c41a34', { roughness: 0.35 }), bx, 0.3, bz, 8)); R.hand.add(berries); tools.berries = berries;
      // a pickaxe for rock, a sickle for the fields
      const pick = new T.Group(); pick.add(cyl(0.45, 0.5, 13, m.wood, 0, -4, 0, 7)); { const hd = box(0.7, 0.9, 7.5, m.steel, 0, -10, 0.6); pick.add(hd); } R.hand.add(pick); tools.pick = pick;
      const sickle = new T.Group(); sickle.add(cyl(0.4, 0.4, 5, m.wood, 0, -2, 0, 6)); { const bl = mesh(new T.TorusGeometry(2.6, 0.32, 4, 12, Math.PI * 1.1), m.steel, 0, -6.4, 1.8); bl.rotation.y = Math.PI / 2; sickle.add(bl); } R.hand.add(sickle); tools.sickle = sickle;
      // a wheelbarrow pushed in front, full of stone when loaded
      const barrow = new T.Group(); barrow.position.set(0, 0, 9);
      { const tray = box(9, 3.6, 10, woodHM(10, 4), 0, 10.5, 2); barrow.add(tray); const wh = cyl(3, 3, 1.4, woodHM(6, 3), 0, 3, 8, 12); wh.rotation.z = Math.PI / 2; barrow.add(wh); tools.barrowWheel = wh;
        for (const sx of [-3.5, 3.5]) { const h = box(0.8, 0.8, 11, m.wood, sx, 12.5, -5); h.rotation.x = -0.25; barrow.add(h); const leg = box(0.7, 6, 0.7, m.wood, sx, 6.5, -1); barrow.add(leg); }
        const load = new T.Group(); for (const [x, z] of [[-2, 0.5], [2, 1], [0, 3.4], [-1.6, 4], [1.8, 4.2], [0, 1.6]]) load.add(box(2.6 + (x * 7 % 1), 2.2, 2.6, stoneM(3, 3), x, 13.4 + (z % 1), z)); barrow.add(load); tools.stones = load; }
      body.add(barrow); tools.barrow = barrow;
    }
    if (soldier) {   // the plate details of Gerald's sheets: faulds, tassets, cuisses, knee fans, ridged greaves, sabatons, rerebraces, couters, flared gauntlets
      const P2 = m.plate, G2 = m.trimG;
      for (let k = 0; k < 3; k++) { const fd = lathe([[5.02 + k * 0.14, 22.1 - k * 1.2], [5.2 + k * 0.14, 20.95 - k * 1.2]], P2, 26, true); fd.scale.set(1.04, 1, 0.8); body.add(fd); }
      { const fg = mesh(new T.TorusGeometry(5.5, 0.16, 5, 26), G2, 0, 18.55, 0); fg.rotation.x = Math.PI / 2; fg.scale.set(1.04, 0.8, 1); body.add(fg); }
      for (const sd of [-1, 1]) {
        const ts = mesh(new T.CylinderGeometry(5.75, 6.35, 5.4, 8, 1, true, sd > 0 ? 0.3 : -1.1, 0.8), P2, 0, 15.9, 0); ts.scale.set(1.03, 1, 0.84); body.add(ts);
        const tg = mesh(new T.CylinderGeometry(6.38, 6.38, 0.4, 8, 1, true, sd > 0 ? 0.3 : -1.1, 0.8), G2, 0, 13.3, 0); tg.scale.set(1.03, 1, 0.84); body.add(tg);
      }
      for (const { hip, knee, side } of legs) {
        hip.add(lathe([[2.6, 0.2], [2.62, -2.6], [2.42, -6.0], [2.2, -8.3]], P2, 16, true));
        const ce = mesh(new T.TorusGeometry(2.22, 0.13, 5, 16), G2, 0, -8.2, 0); ce.rotation.x = Math.PI / 2; hip.add(ce);
        const fan = sph(1.3, P2, side * 1.3, 0.15, 0.45, 10); fan.scale.set(0.42, 0.95, 0.85); knee.add(fan);
        knee.add(box(0.32, 6.0, 0.45, P2, 0, -4.4, 1.72));
        for (let k = 0; k < 3; k++) { const lm = sph(1.12 - k * 0.1, P2, 0, -8.5 + k * 0.08, 1.15 + k * 0.85, 10); lm.scale.set(1.0, 0.45, 0.62); knee.add(lm); }
      }
      for (const { sh, el, side } of arms) {
        const rb = capsule(1.98, 1.78, 2.8, P2, 12); rb.position.y = -4.6; sh.add(rb);
        const cf = sph(1.2, P2, side * 1.0, 0.15, -0.35, 10); cf.scale.set(0.38, 1.0, 1.1); el.add(cf);
        el.add(mesh(new T.CylinderGeometry(1.6, 1.22, 2.0, 14, 1, true), P2, 0, -5.4, 0));
        const gr = mesh(new T.TorusGeometry(1.56, 0.12, 4, 14), G2, 0, -4.45, 0); gr.rotation.x = Math.PI / 2; el.add(gr);
      }
      if (u.look && u.look.s === undefined) u.look.s = 1.05;   // a taller, heroic build
    }
    root.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingSphere(); o.castShadow = o.geometry.boundingSphere.radius > 1.9; } });
    if (u.type === 'civ' || u.type === 'archer') {   // a little stool that appears when they sit
      const stool = new T.Group(), sm = std('#7a5634', { roughness: 0.9 }); stool.add(cyl(4.2, 4.2, 1.2, sm, 0, 9.4, -2.4, 12)); for (const [x, z] of [[-2.6, -4.6], [2.6, -4.6], [0, 0.2]]) stool.add(cyl(0.5, 0.5, 9, sm, x, 4.6, z, 5));
      stool.visible = false; root.add(stool); tools.stool = stool;
    }
    for (const k of ['basket', 'pack', 'berries', 'sack', 'logs', 'pick', 'sickle', 'barrow', 'stool']) if (tools[k]) { tools[k].userData.keep = true; tools[k].traverse(o => o.userData.keep = true); }
    if (m.cloak) m.cloak.userData.keep = true;
    compact(root);
    const allMats = []; root.traverse(o => { if (o.isMesh && o.material && o.material.emissive && !allMats.includes(o.material)) allMats.push(o.material); });
    return { root, body, legs, arms, tools, head, mats: allMats, m, cloth, torso, belly, tail, sm: { fR: 0, bR: 0.2, fL: 0, bL: 0.2, tw: 0 }, heading: u.facing > 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  function machineCrew(u, spots, body) {
    const crew = [];
    for (const [x, z, ry] of spots) {
      const fu = { kind: 'unit', type: 'civ', team: u.team, pal: u.team === 'enemy' ? PAL.ecv : PAL.civ, skin: ['#d9a57a', '#a8744e', '#e2b48c'][crew.length % 3], hair: '#3a2414', seed: crew.length, look: { beard: crew.length !== 1, longHair: false, w: 1, h: 1 } };
      const p = personModel(fu); p.root.scale.setScalar(0.82); p.root.position.set(x, 0, z); p.root.rotation.y = ry || 0; body.add(p.root); crew.push(p);
    }
    return crew;
  }
  function wheel(x, y, z, r, iron) {
    const w = new T.Group(); w.position.set(x, y, z);
    const disc = cyl(r, r, 2.6, woodHM(12, 4), 0, 0, 0, 16); disc.rotation.z = Math.PI / 2; w.add(disc);
    const rim = mesh(new T.TorusGeometry(r, 0.6, 6, 20), iron, 0, 0, 0); rim.rotation.y = Math.PI / 2; w.add(rim);
    for (let k = 0; k < 2; k++) { const sp = box(2.8, r * 1.9, 0.5, std('#3e2a18'), 0, 0, 0); sp.rotation.x = k * Math.PI / 2; w.add(sp); }
    return w;
  }
  function oxcartModel(u) {
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const hide = std('#7a5a3a', { roughness: 0.9 }), dark = std('#5a3c24', { roughness: 0.9 }), horn = std('#e8dcc0', { roughness: 0.5 }), iron = std('#4d5359', { metalness: 0.7, roughness: 0.45 });
    // the ox: a heavy body, neck, head with horns, four legs that step
    const ox = new T.Group(); ox.position.set(0, 0, 22); body.add(ox);
    const torso = sph(9, hide, 0, 17, 0, 16); torso.scale.set(0.95, 0.9, 1.65); ox.add(torso);
    const hump = sph(5, hide, 0, 24, 8, 12); hump.scale.set(1, 0.8, 1.2); ox.add(hump);
    const head = new T.Group(); head.position.set(0, 20, 17); ox.add(head);
    const skull = sph(4.2, dark, 0, 0, 2, 12); skull.scale.set(0.9, 0.85, 1.4); head.add(skull);
    const muzzle = sph(2.6, std('#3e2a1a'), 0, -1.5, 6.6, 10); muzzle.scale.set(1.1, 0.8, 0.9); head.add(muzzle);
    for (const sx of [-1, 1]) { const h = cyl(0.5, 1.0, 6, horn, sx * 4.2, 2.4, 1, 6); h.rotation.z = sx * 1.1; h.rotation.x = -0.3; head.add(h); const ear = sph(1.2, dark, sx * 3.6, 0.6, -0.5, 8); ear.scale.set(1.4, 0.5, 0.9); head.add(ear); }
    const legs = []; for (const [x, z] of [[-4.2, 9], [4.2, 9], [-4.2, -9], [4.2, -9]]) { const lg = new T.Group(); lg.position.set(x, 12, z); lg.add(capsule(1.8, 1.4, 11, dark, 10)); ox.add(lg); legs.push(lg); }
    const tail = cyl(0.4, 0.3, 9, dark, 0, 15, -14, 5); tail.rotation.x = 0.4; ox.add(tail);
    // yoke and pole
    ox.add(box(16, 1.6, 1.6, woodHM(16, 2), 0, 25, 13)); const pole = box(1.4, 1.4, 22, woodHM(22, 2), 0, 14, -4); body.add(pole);
    // the cart: bed, sides, two big wheels, and a load of stone
    body.add(box(18, 2.2, 22, woodHM(22, 4), 0, 11, -18)); for (const sx of [-1, 1]) body.add(box(1.2, 5, 22, woodHM(22, 5), sx * 8.6, 14, -18)); body.add(box(18, 5, 1.2, woodHM(18, 5), 0, 14, -29));
    const wheels = []; for (const sx of [-1, 1]) { const w = new T.Group(); w.position.set(sx * 10.5, 8, -18); const d = cyl(8, 8, 1.8, woodHM(14, 4), 0, 0, 0, 18); d.rotation.z = Math.PI / 2; w.add(d); const rim = mesh(new T.TorusGeometry(8, 0.6, 6, 22), iron, 0, 0, 0); rim.rotation.y = Math.PI / 2; w.add(rim); for (let k = 0; k < 3; k++) { const sp = box(1.9, 15, 0.8, std('#3e2a18'), 0, 0, 0); sp.rotation.x = k * Math.PI / 3; w.add(sp); } body.add(w); wheels.push(w); }
    const load = new T.Group(); for (let i = 0; i < 8; i++) load.add(box(5 + (i % 3), 4, 5, stoneM(5, 4), -5 + (i % 3) * 5, 15 + Math.floor(i / 3) * 3.6, -24 + (i % 2) * 8)); body.add(load);
    const driver = personModel({ kind: 'unit', type: 'civ', team: 'player', pal: PAL.civ, skin: '#c98d5e', hair: '#3a2414', seed: 4, look: { beard: true, longHair: false, w: 1, h: 1 } }); driver.root.scale.setScalar(0.85); driver.root.position.set(-12, 0, 4); body.add(driver.root);
    root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const mats = []; root.traverse(o => { if (o.isMesh && o.material.emissive && !mats.includes(o.material)) mats.push(o.material); });
    return { root, body, wheels, crew: [driver], oxLegs: legs, load, mats, heading: u.facing > 0 ? Math.PI / 2 : -Math.PI / 2, ram: true, machine: 'oxcart' };
  }
  function trebuchetModel(u) {   // a counterweight engine: a tall A-frame, a long arm and a heavy box of stones
    const md = catapultModel(u); md.root.scale.setScalar(1.5);
    const cw = box(10, 9, 10, woodHM(10, 9), 0, -4, -6); md.arm.add(cw);
    for (const x of [-12, 12]) { const up = box(3, 52, 3, woodVM(3, 52), x, 30, -4); md.body.add(up); }
    md.body.add(box(28, 3, 3, woodHM(28, 3), 0, 55, -4));
    md.machine = 'trebuchet'; return md;
  }
  function catapultModel(u) {
    // a wheeled throwing engine: timber bed, two uprights with a padded crossbar, twisted-rope bundle and a long arm with a sling bowl
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const beamM = woodHM(48, 5), postM = woodVM(4, 30), iron = std('#4d5359', { metalness: 0.75, roughness: 0.42 });
    for (const x of [-10, 10]) body.add(box(4, 4.2, 54, beamM, x, 9, 0));
    for (const z of [-22, -6, 10, 24]) body.add(box(24, 3.2, 3.4, beamM, 0, 9.5, z));
    const wheels = []; for (const z of [-17, 17]) for (const x of [-13.5, 13.5]) { const w = wheel(x, 7, z, 7, iron); body.add(w); wheels.push(w); }
    for (const x of [-10, 10]) { const up = box(3.4, 34, 3.4, postM, x, 26, 8); up.rotation.x = -0.18; body.add(up); const br = box(2.4, 24, 2.4, postM, x, 20, 16); br.rotation.x = 0.62; body.add(br); }
    body.add(box(24, 4, 4.4, beamM, 0, 41, 5)); body.add(box(12, 4.6, 5, std('#8a6a48', { roughness: 1 }), 0, 41, 2.6));
    const bundle = cyl(3.8, 3.8, 18, std('#b49464', { roughness: 1 }), 0, 13, -12, 12); bundle.rotation.z = Math.PI / 2; body.add(bundle);
    for (const x of [-9, 9]) { const ring = cyl(4.4, 4.4, 1.6, iron, x, 13, -12, 12); ring.rotation.z = Math.PI / 2; body.add(ring); }
    const arm = new T.Group(); arm.position.set(0, 13, -12); body.add(arm);
    arm.add(box(3, 3, 40, woodHM(40, 4), 0, 0, 20));
    const bowl = mesh(new T.SphereGeometry(5, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), woodVM(6, 6), 0, 1.5, 40); bowl.rotation.x = Math.PI; arm.add(bowl);
    const stone = sph(3.6, std('#8f897e', { roughness: 0.95 }), 0, 4, 40, 10); arm.add(stone);
    const f = flag(u.team === 'player' ? PAL.player.tunic : ENEMY_COL, 12, 7); f.position.set(-10, 40, -24); body.add(f); body.add(cyl(0.7, 0.7, 30, std('#3a2a18'), -10, 25, -24, 5));
    const crew = machineCrew(u, [[-17, -14, 0], [17, -6, 0]], body);
    root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const mats = []; root.traverse(o => { if (o.isMesh && o.material.emissive && !mats.includes(o.material)) mats.push(o.material); });
    return { root, body, wheels, crew, arm, stone, flag: f, mats, heading: u.facing > 0 ? Math.PI / 2 : -Math.PI / 2, ram: true, machine: 'catapult' };
  }
  function ballistaModel(u) {
    // a giant crossbow on a two-wheeled carriage with a trail, bow arms, a real string and a bolt
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const beamM = woodHM(40, 5), iron = std('#4d5359', { metalness: 0.75, roughness: 0.42 });
    const wheels = []; for (const x of [-13, 13]) { const w = wheel(x, 7.5, 4, 7.5, iron); body.add(w); wheels.push(w); }
    { const axle = cyl(1.2, 1.2, 28, iron, 0, 7.5, 4, 8); axle.rotation.z = Math.PI / 2; body.add(axle); }
    const trail = box(4, 3.4, 30, beamM, 0, 6, -12); trail.rotation.x = -0.25; body.add(trail);
    body.add(box(4, 18, 4, woodVM(4, 18), 0, 16, 4));
    const bow = new T.Group(); bow.position.set(0, 26, 2); body.add(bow);
    bow.add(box(4, 3.6, 40, beamM, 0, 0, 2));
    bow.add(box(16, 5, 5, woodHM(16, 5), 0, 0, 16));
    for (const sx of [-1, 1]) { const limb = box(18, 2.4, 2.4, woodHM(18, 3), sx * 13, 0, 13); limb.rotation.y = sx * 0.42; bow.add(limb); }
    const sGeo = new T.BufferGeometry(); sGeo.setAttribute('position', new T.Float32BufferAttribute([-20.5, 0, 6, 0, 0, 2, 20.5, 0, 6], 3));
    const str = new T.Line(sGeo, new T.LineBasicMaterial({ color: 0xe8e0c8 })); bow.add(str);
    const bolt = new T.Group(); { const shaft = cyl(0.7, 0.7, 34, woodHM(30, 2), 0, 2.4, 12, 6); shaft.rotation.x = Math.PI / 2; bolt.add(shaft); }
    const tip = mesh(new T.ConeGeometry(1.6, 5, 6), iron, 0, 2.4, 31); tip.rotation.x = Math.PI / 2; bolt.add(tip); bow.add(bolt);
    const f = flag(u.team === 'player' ? PAL.player.tunic : ENEMY_COL, 12, 7); f.position.set(0, 44, -22); body.add(f); body.add(cyl(0.7, 0.7, 34, std('#3a2a18'), 0, 27, -22, 5));
    const crew = machineCrew(u, [[-14, -10, 0], [12, -14, 0]], body);
    root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const mats = []; root.traverse(o => { if (o.isMesh && o.material.emissive && !mats.includes(o.material)) mats.push(o.material); });
    return { root, body, wheels, crew, bow, bolt, string: sGeo, flag: f, mats, heading: u.facing > 0 ? Math.PI / 2 : -Math.PI / 2, ram: true, machine: 'ballista' };
  }
  function ramModel(u) {
    // a covered siege ram: timber chassis on six wheels, plank roof under sagging wet hides,
    // hide curtains down the sides, the ram log hung on chains with an iron head, and a crew inside
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const beamM = woodHM(48, 5), postM = woodVM(4, 30), plankM = woodHM(30, 30), iron = std('#4d5359', { metalness: 0.75, roughness: 0.42 });
    const hideM = new T.MeshStandardMaterial({ color: C('#7a5a3c'), roughness: 0.95, side: T.DoubleSide, map: fabricTex() });
    const hideDark = new T.MeshStandardMaterial({ color: C('#5e432c'), roughness: 0.95, side: T.DoubleSide, map: fabricTex() });
    // chassis
    for (const x of [-11.5, 11.5]) body.add(box(4.2, 4.2, 50, beamM, x, 8, 0));
    for (const z of [-22, -8, 8, 22]) body.add(box(27, 3.4, 3.4, beamM, 0, 8.5, z));
    // wheels: solid plank discs with an iron rim and hub
    const wheels = [];
    for (const z of [-17, 0, 17]) for (const x of [-15.2, 15.2]) {
      const w = new T.Group(); w.position.set(x, 7, z);
      const disc = cyl(6.6, 6.6, 3, woodHM(12, 4), 0, 0, 0, 18); disc.rotation.z = Math.PI / 2; w.add(disc);
      const rim = mesh(new T.TorusGeometry(6.6, 0.75, 6, 22), iron, 0, 0, 0); rim.rotation.y = Math.PI / 2; w.add(rim);
      const hub = cyl(1.6, 1.6, 4.2, iron, 0, 0, 0, 10); hub.rotation.z = Math.PI / 2; w.add(hub);
      for (let k = 0; k < 2; k++) { const pl = box(3.2, 12.6, 0.5, std('#3e2a18'), 0, 0, 0); pl.rotation.x = k * Math.PI / 2; w.add(pl); }
      body.add(w); wheels.push(w);
    }
    // posts and a ridge beam
    for (const z of [-22, -7, 7, 22]) for (const x of [-11.5, 11.5]) body.add(box(3, 24, 3, postM, x, 21, z));
    for (const x of [-11.5, 11.5]) body.add(box(3, 3, 50, beamM, x, 33, 0));
    body.add(box(3, 3, 54, beamM, 0, 47, 0));
    // roof planks, then wet hides draped over them, sagging between the rafters
    for (const s of [-1, 1]) {
      const roof = box(18.4, 1.4, 54, plankM, 0, 0, 0); roof.position.set(s * 6.6, 40.4, 0); roof.rotation.z = -s * 0.86; body.add(roof);
      const geo = new T.PlaneGeometry(21, 58, 6, 16), P = geo.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); const sag = Math.sin((y / 58 + 0.5) * Math.PI * 3.5) * 0.6 + Math.sin(x * 0.6 + y * 0.3) * 0.25; P.setZ(i, Math.abs(sag)); }
      geo.computeVertexNormals();
      const hide = mesh(geo, s > 0 ? hideM : hideDark); hide.rotation.set(-Math.PI / 2, 0, 0);
      const hg = new T.Group(); hg.add(hide); hg.position.set(s * 7.0, 41.6, 0); hg.rotation.z = -s * 0.86; body.add(hg);
      // side curtain of hides from the eave down
      const cg = new T.PlaneGeometry(52, 20, 14, 4), CP = cg.attributes.position;
      for (let i = 0; i < CP.count; i++) { const x = CP.getX(i), y = CP.getY(i); CP.setZ(i, Math.sin(x * 0.42) * 0.9 * (0.5 - y / 20)); if (y < -8) CP.setY(i, y + Math.sin(x * 1.3) * 1.2); }
      cg.computeVertexNormals();
      const cur = mesh(cg, hideDark, s * 13.6, 22, 0); cur.rotation.y = Math.PI / 2; body.add(cur);
    }
    // the ram: a long log on chains, iron-capped head with a pointed tip, iron bands along it
    const log = new T.Group();
    const trunk = cyl(3.2, 3.6, 60, woodHM(60, 7), 0, 0, 0, 14); trunk.rotation.x = Math.PI / 2; log.add(trunk);
    const cap = cyl(4.4, 4.0, 8, iron, 0, 0, 30, 14); cap.rotation.x = Math.PI / 2; log.add(cap);
    const tip = mesh(new T.ConeGeometry(4.4, 6, 14), iron, 0, 0, 37); tip.rotation.x = Math.PI / 2; log.add(tip);
    for (const z of [-18, -2, 14]) { const band = mesh(new T.TorusGeometry(3.6, 0.55, 6, 16), iron, 0, 0, z); log.add(band); }
    for (const z of [-12, 12]) for (let k = 0; k < 4; k++) log.add(cyl(0.35, 0.35, 3.2, iron, 0, 4.8 + k * 3.1, z, 5));
    log.position.set(0, 22, 4); body.add(log);
    // crew inside, pushing
    const crew = [];
    for (const [x, z] of [[-6, -12], [6, -6], [-5, 6]]) {
      const fu = { kind: 'unit', type: 'civ', team: u.team, pal: PAL[u.team], skin: ['#d9a57a', '#a8744e', '#e2b48c'][crew.length], hair: '#3a2414', seed: crew.length, look: { beard: crew.length !== 1, longHair: false, w: 1, h: 1 } };
      const p = personModel(fu); p.root.scale.setScalar(0.78); p.root.position.set(x, 1, z); body.add(p.root); crew.push(p);
    }
    const f = flag(u.team === 'player' ? PAL.player.tunic : ENEMY_COL, 13, 8); f.position.set(0, 66, -20); body.add(f);
    body.add(cyl(0.8, 0.8, 18, std('#3a2a18'), 0, 57, -20, 5));
    root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const mats = []; root.traverse(o => { if (o.isMesh && o.material.emissive && !mats.includes(o.material)) mats.push(o.material); });
    return { root, body, log, wheels, crew, flag: f, mats, heading: u.facing > 0 ? Math.PI / 2 : -Math.PI / 2, ram: true };
  }
  // ---------- outlines of people hidden behind walls and buildings ----------
  // Each unit carries a simple body-shaped proxy drawn in its team colour only where something solid
  // stands in front of it (depth test 'greater'). The proxy is pulled toward the camera a little so a
  // person never outlines itself or its own shield.
  const ghostGeos = {}, ghostMats = {};
  function ghostGeometry(type) {
    if (ghostGeos[type]) return ghostGeos[type];
    const W = new T.Color(1, 1, 1), parts = [], P = (geo, m) => parts.push({ geo, m, color: W });
    const rot = (rx, rz, x, y, z) => new T.Matrix4().makeRotationFromEuler(new T.Euler(rx, 0, rz)).setPosition(x, y, z);
    if (type === 'catapult' || type === 'ballista' || type === 'oxcart' || type === 'trebuchet') { P(new T.BoxGeometry(28, 16, 50), M4(0, 10, 0)); P(new T.BoxGeometry(22, 30, 6), M4(0, 26, 6)); }
    else if (type === 'ram') { P(new T.BoxGeometry(30, 32, 52), M4(0, 22, 0)); P(new T.CylinderGeometry(2, 22, 16, 4), M4(0, 46, 0, 1, 1, 1.7, Math.PI / 4)); P(new T.CylinderGeometry(3.6, 3.6, 18, 8), rot(Math.PI / 2, 0, 0, 22, 32)); }
    else {
      P(new T.CylinderGeometry(5.0, 4.3, 15, 12), M4(0, 25.5, 0, 1, 1, 0.7));          // chest and belly
      P(new T.CylinderGeometry(4.6, 5.4, 6, 12), M4(0, 16.5, 0, 1, 1, 0.75));          // hips and tunic skirt
      P(new T.SphereGeometry(3.0, 12, 10), M4(0, 38.6, 0.2, 0.95, 1.1, 1));             // head
      P(new T.CylinderGeometry(1.5, 1.6, 3, 8), M4(0, 35, 0));                          // neck
      for (const sx of [-1, 1]) {
        P(new T.SphereGeometry(2.1, 8, 6), M4(sx * 5.2, 31.2, 0));                       // shoulder
        P(new T.CylinderGeometry(1.7, 1.2, 13.5, 8), rot(0, sx * 0.12, sx * 6.0, 24.6, 0.6));   // arm
        P(new T.CylinderGeometry(2.2, 1.5, 19, 8), M4(sx * 2.2, 9.6, 0));                // leg
        P(new T.SphereGeometry(1.6, 8, 6), M4(sx * 2.2, 0.6, 1.4, 1, 0.6, 1.8));         // foot
      }
      if (type === 'sword') { P(new T.CylinderGeometry(5.4, 5.4, 1, 14), rot(Math.PI / 2, 0, -5.4, 25, 4.5)); P(new T.BoxGeometry(1.2, 15, 0.6), rot(0.5, 0, 6.6, 22, 6)); }
      if (type === 'spear') { P(new T.CylinderGeometry(5.6, 5.6, 1, 14), rot(Math.PI / 2, 0, -5.6, 25, 4.5)); P(new T.CylinderGeometry(0.6, 0.6, 62, 6), M4(6.8, 30, 2)); P(new T.ConeGeometry(1.4, 7, 6), M4(6.8, 64, 2)); }
      if (type === 'archer') { P(new T.TorusGeometry(10, 0.7, 4, 16, Math.PI * 0.72), rot(0, -Math.PI * 0.36, -6, 24, 7)); P(new T.CylinderGeometry(1.6, 1.4, 11, 8), rot(0, 0.35, -1.8, 27, -4.4)); }
    }
    const g = merge(parts); g.computeBoundingSphere(); return ghostGeos[type] = g;
  }
  function ghostMat(team) {
    const col = team === 'player' ? PAL.player.tunic : ENEMY_PLUME, key = team + col;
    if (ghostMats[key]) return ghostMats[key];
    const c = new T.Color(col).lerp(new T.Color(1, 1, 1), 0.25);
    return ghostMats[key] = new T.ShaderMaterial({
      uniforms: { col: { value: c }, pull: { value: 9 } },
      vertexShader: 'uniform float pull; varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 toCam = normalize(-mv.xyz); mv.xyz += toCam * pull; vN = normalize(normalMatrix * normal); vV = toCam; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 col; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = 0.52 + 0.4 * f * f; gl_FragColor = vec4(col * (0.85 + 0.55 * f), a); }',
      transparent: true, depthWrite: false, depthFunc: T.GreaterDepth
    });
  }
  function addGhost(md, u) { const gm = new T.Mesh(ghostGeometry(u.type), ghostMat(u.team)); gm.renderOrder = 10; gm.castShadow = false; gm.receiveShadow = false; gm.frustumCulled = true; md.root.add(gm); md.ghost = gm; }
  // is a wall or building between the camera and this unit? (outlines are for things hidden by structures, not by each other)
  function behindStructure(u) {
    const ox = camera.position.x, oy = camera.position.y, oz = camera.position.z, ty = heightAt(u.x, u.y) + elev3D(u) + 20;
    const dx = u.x - ox, dy = ty - oy, dz = u.y - oz;
    for (const b of structures) {
      if (b.dead || isField(b.kind) || b.kind === 'garden' || b.kind === 'stocks' || b.kind === 'stairs' || b.kind === 'moat' || b.kind === 'pit') continue;
      const gy = heightAt(b.x, (b.y0 + b.y1) / 2) - 2, x0 = b.x0 - 1, x1 = b.x1 + 1, z0 = b.y0 - 1, z1 = b.y1 + 1, y0 = gy, y1 = gy + (b.topH || 40) * 0.88;
      let t0 = 0, t1 = 0.97;
      for (const [o, d, lo, hi] of [[ox, dx, x0, x1], [oy, dy, y0, y1], [oz, dz, z0, z1]]) {
        if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { t0 = 2; break; } continue; }
        let ta = (lo - o) / d, tb = (hi - o) / d; if (ta > tb) [ta, tb] = [tb, ta];
        if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) break;
      }
      if (t0 <= t1) return true;
    }
    return false;
  }
  const rallyModels = {};
  function syncRally() {
    for (const which of ['army', 'town']) {
      const r = rally[which]; let md = rallyModels[which];
      if (!r) { if (md) md.g.visible = false; continue; }
      if (!md) {
        const g = new T.Group(), col = which === 'army' ? ENEMY_PLUME : PAL.player.tunic;
        const f = pole(g, 0, 0, 0, 46, col); g.add(cyl(5, 6, 2, std('#6b6359'), 0, 1, 0, 10));
        const ring = mesh(new T.RingGeometry(16, 19, 32), new T.MeshBasicMaterial({ color: C(which === 'army' ? '#ffcf5a' : '#9fe8a8'), transparent: true, opacity: 0.75, side: T.DoubleSide, depthWrite: false }), 0, 1.5, 0, false); ring.rotation.x = -Math.PI / 2; g.add(ring);
        scene.add(g); md = rallyModels[which] = { g, f, ring };
      }
      md.g.visible = true; md.g.position.set(r.x, heightAt(r.x, r.y), r.y);
      const p = md.f.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(time * 5 + x * 0.25) * Math.min(3, x * 0.15)); } p.needsUpdate = true;
      md.ring.scale.setScalar(1 + Math.sin(time * 3) * 0.06);
    }
  }
  const unitModels = new Map();
  const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
  const angDiff = (b, a) => ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  // an idle person's slow look about: turn the head to a new spot every few seconds, ease there, hold still
  const lookAbout = sd => { const T0 = (time + sd * 7.3) / 3.4, k = Math.floor(T0), f = T0 - k, at = n => Math.sin(n * 12.9898 + sd * 78.233) * 0.62;
    const e = Math.min(1, f / 0.28), sm = e * e * (3 - 2 * e); return at(k - 1) + (at(k) - at(k - 1)) * sm; };
  function animatePerson(u, md, dt) {
    const moving = u.moving && !u.dead, ph = u.walkPhase, a = u.attackAnim;
    const sd = u.seed || 0, run = moving && (u.order === 'attack' || u.order === 'raid') ? 1.25 : 1;
    for (const l of md.legs) {
      const p = ph + (l.side > 0 ? 0 : Math.PI), sw = Math.sin(p);
      // thigh swings through; the knee bends hard as the foot passes under, and stays a little soft on landing
      l.hip.rotation.x = moving ? -sw * 0.58 * run : (l.side > 0 ? 0.03 : -0.02);   // standing still: the legs do not shift
      l.knee.rotation.x = moving ? Math.max(0, Math.cos(p) + 0.25) * 0.95 * run + 0.06 : (l.side > 0 ? 0.08 : 0.05);
      l.hip.rotation.z = 0;
    }
    // the body rises and falls with each step, sways over the planted foot, and the chest turns against the hips
    const breath = Math.sin(time * 1.6 + sd * 3);
    // standing still, only the head moves: it looks slowly about, or turns to whoever they are talking with
    md.body.position.y = moving ? Math.abs(Math.sin(ph)) * 1.25 * run - 0.3 : 0;
    md.body.position.x = moving ? Math.sin(ph) * 0.45 : 0;
    md.body.rotation.z = moving ? Math.sin(ph) * 0.035 : 0;
    if (md.torso) md.torso.scale.y = 1;
    md.head.rotation.z = moving ? -Math.sin(ph) * 0.03 : 0;
    if (!u.pose) md.head.rotation.y = moving || a > 0 ? 0 : u.chatWith ? Math.max(-0.7, Math.min(0.7, angDiff(Math.atan2(u.chatWith.x - u.x, u.chatWith.y - u.y), md.heading))) : lookAbout(sd);
    // arm angles: positive swings the arm forward and up; elbows bend forward
    const L = md.arms[0], R = md.arms[1];
    // arms swing against the legs; the elbow bends more as the arm comes forward and opens as it swings back
    const swing = moving ? Math.sin(ph) * 0.48 * run : 0;
    let fR = 0.08 - swing, bR = 0.22 + (moving ? Math.max(0, -Math.sin(ph)) * 0.55 : 0.08), fL = 0.08 + swing, bL = 0.22 + (moving ? Math.max(0, Math.sin(ph)) * 0.55 : 0.08);
    if (!moving && !(a > 0) && u.chatWith && !u.pose) { const g2 = (time * 0.21 + sd) % 1; if (g2 < 0.12) { fR = 0.55 + Math.sin(g2 * 50) * 0.18; bR = 1.15; } }   // talking: now and then a small open-hand gesture
    if (swordish(u)) {
      fL = 0.8; bL = 1.0;
      if (a > 0) fR = a < 0.42 ? lerp(0.45, -2.35, ease(a / 0.42)) : a < 0.68 ? lerp(-2.35, 1.6, ease((a - 0.42) / 0.26)) : lerp(1.6, 0.45, ease((a - 0.68) / 0.32));
      else fR = 0.35 + (moving ? -Math.sin(ph) * 0.25 : 0);
      bR = a > 0 ? 0.1 : 0.45;
    } else if (u.type === 'spear') {
      fL = 0.8; bL = 1.0;
      let thrust = 0;
      if (a > 0) thrust = a < 0.35 ? lerp(0, -5, ease(a / 0.35)) : a < 0.58 ? lerp(-5, 10, ease((a - 0.35) / 0.23)) : lerp(10, 0, ease((a - 0.58) / 0.42));
      const lowered = a > 0 || u.combatT > 0 || u.order === 'attack', sp = md.tools.spear;
      if (lowered) { fR = 1.05 + thrust * 0.03; bR = 0.55 - thrust * 0.03; md.spearTilt = Math.PI / 2 - 0.08; sp.position.y = -6 + thrust * 0.5; }
      else { fR = 0.25; bR = 0.95; md.spearTilt = 0; sp.position.y = 6; }
    } else if (u.type === 'archer') {
      if (a > 0 || u.order === 'attack') { fL = 1.55; bL = 0; fR = 1.45; bR = 1.2 - (a > 0 && a < 0.55 ? ease(a / 0.55) * 0.6 : 0); }
    } else if (u.type === 'civ') {
      const type = gearOf(u), working = u.sub === 'work' && (u.order === 'gather' || u.order === 'build' || u.order === 'craft');
      const loaded = u.carry > 0, pushing = type === 'stone' && loaded && !working;
      if ((type === 'wood' || type === 'build' || type === 'stone') && working && a > 0) { fR = a < 0.5 ? lerp(0.5, -2.1, ease(a / 0.5)) : lerp(-2.1, 1.5, ease(Math.min(1, (a - 0.5) / 0.25))); bR = 0.2; }
      else if (type === 'food' && working && a > 0) fR = 1.0 + Math.sin(a * Math.PI * 2) * 0.45;
      else if (pushing) { fR = 0.55; bR = 0.15; fL = 0.55; bL = 0.15; }
      else if (type === 'wood' && loaded && !working) { fR = 2.6; bR = 1.9; }   // hand steadying the logs on the shoulder
      else if (type === 'grain' && working && a > 0) fR = 0.9 + Math.sin(a * Math.PI * 2) * 0.5;
      const t = md.tools;
      t.axe.visible = type === 'wood' && !(loaded && !working); t.hammer.visible = type === 'build'; t.basket.visible = type === 'food';
      t.pick.visible = type === 'stone' && !pushing; t.sickle.visible = type === 'grain' && !(loaded && !working);
      t.barrow.visible = type === 'stone'; t.stones.visible = loaded && (u.carryType === 'stone' || u.carryType === 'iron'); t.barrowWheel.rotation.x = (u.walkPhase || 0) * 0.8;
      if (type === 'stone' && working) t.barrow.position.set(-9, 0, 4); else t.barrow.position.set(0, 0, 9);
      t.logs.visible = loaded && u.carryType === 'wood'; t.sack.visible = loaded && (u.carryType === 'hops' || u.carryType === 'wheat' || u.carryType === 'flour');
      t.pack.visible = loaded && !['wood', 'food', 'hops', 'wheat', 'flour', 'stone', 'iron'].includes(u.carryType); t.berries.visible = loaded && u.carryType === 'food';
    }
    // resting poses, blended in and out
    const k = u.poseK || 0, pose = u.pose;
    let lean = 0, drop = 0;
    if (k > 0 && pose) {
      const legs = md.legs, Lg = legs[0], Rg = legs[1], kk = ease(k);
      const mixL = (o, v) => o + (v - o) * kk;
      if (pose === 'sit' && u.stool) { for (const g of legs) { g.hip.rotation.x = mixL(g.hip.rotation.x, -1.6); g.knee.rotation.x = mixL(g.knee.rotation.x, 1.6); g.hip.rotation.z = mixL(0, g.side * 0.18); } drop = 10; lean = -0.05;
        fR = mixL(fR, 0.3); bR = mixL(bR, 1.35); fL = mixL(fL, 0.3); bL = mixL(bL, 1.35); }
      else if (pose === 'sit') { for (const g of legs) { g.hip.rotation.x = mixL(g.hip.rotation.x, -1.5); g.knee.rotation.x = mixL(g.knee.rotation.x, 2.65); g.hip.rotation.z = mixL(0, g.side * 1.05); } drop = 18.6; lean = 0.06; fR = mixL(fR, 0.42); bR = mixL(bR, 1.2); fL = mixL(fL, 0.42); bL = mixL(bL, 1.2); }
      else if (pose === 'kneel') { Lg.hip.rotation.x = mixL(Lg.hip.rotation.x, -1.5); Lg.knee.rotation.x = mixL(Lg.knee.rotation.x, 1.55); Rg.hip.rotation.x = mixL(Rg.hip.rotation.x, 0.15); Rg.knee.rotation.x = mixL(Rg.knee.rotation.x, 1.6); drop = 8.6; lean = 0.08; fL = mixL(fL, 0.9); bL = mixL(bL, 0.7); }
      else if (pose === 'crouch') { for (const g of legs) { g.hip.rotation.x = mixL(g.hip.rotation.x, -1.25); g.knee.rotation.x = mixL(g.knee.rotation.x, 2.2); g.hip.rotation.z = mixL(0, g.side * 0.2); } drop = 9.5; lean = 0.32; fL = mixL(fL, 0.9); bL = mixL(bL, 0.8); fR = mixL(fR, 0.6); bR = mixL(bR, 0.9); }
      else if (pose === 'prone') { for (const g of legs) { g.hip.rotation.x = mixL(g.hip.rotation.x, 0); g.knee.rotation.x = mixL(g.knee.rotation.x, 0.15); } fL = mixL(fL, 2.7); bL = mixL(bL, 0.3); fR = mixL(fR, 2.5); bR = mixL(bR, 0.5); }
      md.body.position.y -= drop * kk;
      md.body.rotation.x = pose === 'prone' ? Math.PI / 2 * kk : lean * kk;
      md.body.position.z = pose === 'prone' ? -6 * kk : 0;
      if (pose === 'prone') md.body.position.y = 3.2 * kk + md.body.position.y * (1 - kk);
      md.head.rotation.y = Math.sin(time * 0.45 + (u.seed || 0) * 3) * 0.55 * kk;   // looking out over the land, or chatting to the next man
      md.head.rotation.x = pose === 'prone' ? -1.2 * kk : 0;
    } else { md.body.rotation.x = 0; md.body.position.z = 0; md.head.rotation.x = 0; for (const g of md.legs) g.hip.rotation.z = 0; }
    if (md.tools.stool) md.tools.stool.visible = pose === 'sit' && !!u.stool && k > 0.5;
    // seated people fold their arms, or rest their hands on their knees
    let fold = 0;
    if (k > 0.5 && (pose === 'sit' || pose === 'kneel') && !(a > 0)) { if ((sd * 7.7) % 1 < 0.55) { fR = 0.72; bR = 2.05; fL = 0.66; bL = 2.15; fold = 1; } else { fR = 0.5; bR = 0.55; fL = 0.5; bL = 0.55; } }
    // joints ease toward their targets, so nothing snaps: arms follow through like real limbs
    const S = md.sm || (md.sm = { fR, bR, fL, bL, tw: 0 }), e2 = Math.min(1, dt * 11);
    S.fR += (fR - S.fR) * e2; S.bR += (bR - S.bR) * e2; S.fL += (fL - S.fL) * e2; S.bL += (bL - S.bL) * e2; S.tw += ((fold ? 1 : 0) - S.tw) * e2;
    fR = S.fR; bR = S.bR; fL = S.fL; bL = S.bL;
    R.sh.rotation.z = -S.tw * 0.42; L.sh.rotation.z = S.tw * 0.42;
    R.sh.rotation.x = -fR; R.el.rotation.x = -bR; L.sh.rotation.x = -fL; L.el.rotation.x = -bL;
    // weight: a fat belly and a wider middle, or a thin frame
    const fat = u.fat || 0;
    if (md.belly) { md.belly.visible = fat > 0.12; const bs = 0.5 + fat * 0.75; md.belly.scale.set(bs * 1.05, bs * 0.95, bs * 1.1); md.belly.position.z = 1.2 + fat * 2.6; }
    if (md.torso) { md.torso.scale.x = 0.94 + fat * 0.3; md.torso.scale.z = 0.66 + fat * 0.3; }
    // the face: smiles when the town is content, frowns when it is not; brows knit in anger or in battle
    if (md.m.mouths) { const mm = md.m.mouths, angry = mood < 35 || u.combatT > 0 || u.sick, glad = !angry && mood >= 60; mm.smile.visible = glad; mm.frown.visible = angry; mm.mouth.visible = !glad && !angry;
      for (const b of md.m.brows || []) b.brow.rotation.z = -b.side * (angry ? -0.32 : 0.14); }
    // the sick look pale and green
    if (md.m.skin && md.m.skinBase === undefined) md.m.skinBase = md.m.skin.color.clone();
    if (md.m.skin) { const target = u.sick ? 1 : 0; md.m.sickK = (md.m.sickK || 0) + (target - (md.m.sickK || 0)) * Math.min(1, dt * 2); md.m.skin.color.copy(md.m.skinBase).lerp(new T.Color(0.42, 0.52, 0.3), md.m.sickK * 0.55); }
    // hair blows in the wind, swings as they move, and whips about in battle
    if (md.tail) { const wnd = (typeof WEATHER !== 'undefined' ? WEATHER.wind : 0.2) * (u.combatT > 0 ? 1.6 : 1); md.tail.rotation.x = 0.35 + (moving ? 0.25 + Math.sin(ph * 2) * 0.12 : 0) + Math.sin(time * 3.1 + sd) * 0.06 * (1 + wnd * 2); md.tail.rotation.z = Math.sin(time * 2.3 + sd) * 0.12 * (0.4 + wnd); }
    // clothing moves: the skirt and surcoat swing with each step and stir in the wind, even when seated
    const wind = (typeof WEATHER !== 'undefined' ? WEATHER.wind : 0.2) * (u.combatT > 0 || a > 0 ? 1.8 : 1), sway = Math.sin(time * 2.3 + (u.seed || 0) * 5) * (0.02 + wind * 0.06) + Math.sin(time * 5.1 + (u.seed || 0)) * wind * 0.025;
    for (const cm of md.cloth || []) { cm.rotation.x = (moving ? Math.sin(ph) * 0.07 : 0) + sway + (k > 0 && pose === 'sit' ? -0.35 * k : 0); cm.rotation.z = (moving ? Math.cos(ph) * 0.05 : 0) + sway * 0.6; }
    const tl = md.tools;
    if (tl.shieldGrip) tl.shieldGrip.rotation.x = fL + bL;   // shield stays upright, facing forward
    if (tl.spearGrip) tl.spearGrip.rotation.x = fR + bR + (md.spearTilt || 0);
    if (tl.bowGrip) {
      tl.bowGrip.rotation.x = fL + bL;
      const drawn = u.type === 'archer' && (a > 0 || u.order === 'attack') ? (a > 0 && a < 0.55 ? ease(a / 0.55) : a > 0 ? Math.max(0, 1 - (a - 0.55) * 6) : 0.15) : 0;
      const pz = tl.tipX - drawn * 7; const ps = tl.string.attributes.position; ps.setX(1, pz); ps.needsUpdate = true;
    }
    if (md.m.cloak) md.m.cloak.rotation.x = 0.12 + (moving ? 0.25 + Math.sin(ph * 0.5) * 0.08 : Math.sin(time * 1.3 + u.seed) * (0.04 + 0.08 * (typeof WEATHER !== 'undefined' ? WEATHER.wind : 0.2))) + ((u.poseK || 0) > 0 && u.pose !== 'prone' ? 0.5 * u.poseK : 0);
  }
  function syncUnits(dt) {
    const seen = new Set();
    for (const u of units) {
      let md = unitModels.get(u.id);
      if (!md) { md = u.type === 'ram' ? ramModel(u) : u.type === 'oxcart' ? oxcartModel(u) : u.type === 'trebuchet' ? trebuchetModel(u) : u.type === 'catapult' ? catapultModel(u) : u.type === 'ballista' ? ballistaModel(u) : (() => { const ent = glbEntry(u); if (ent) return glbUnitModel(u, ent); const sp = art3d ? spriteOf(u) : null; return sp ? spriteUnitModel(u, sp) : personModel(u); })(); addGhost(md, u); unitModels.set(u.id, md); scene.add(md.root); }
      else if (!u.dead && (md.sprite ? !art3d : (!md.glb && !md.machine && !md.ram && art3d && md.spVer !== ART.ver && spriteOf(u)))) { scene.remove(md.root); unitModels.delete(u.id); continue; }
      else if (md.glb && u.type === 'civ' && !u.dead) { const ent = glbEntry(u); if (ent && ent.key !== md.glbKey) { scene.remove(md.root); unitModels.delete(u.id); continue; } }
      if (md.ghost) md.ghost.visible = !u.dead && !u.onWall && !u.inside && outlinesOn && behindStructure(u);
      seen.add(u.id);
      const y = heightAt(u.x, u.y);
      md.root.position.set(u.x, y + elev3D(u), u.y); md.root.visible = !u.inside;
      // face the way they move, or their target when fighting
      let want = null;
      if (u.target && alive(u.target) && (u.attackAnim > 0 || u.order === 'attack') && !u.moving) want = Math.atan2(u.target.x - u.x, u.target.y - u.y);
      else if (u.moving && md.px !== undefined) { const dx = u.x - md.px, dz = u.y - md.pz; if (dx * dx + dz * dz > 0.01) want = Math.atan2(dx, dz); }
      else if (u.type === 'civ' && u.sub === 'work' && u.task && u.task.node) { const c = nodeCenter(u.task.node); want = Math.atan2(c.x - u.x, c.y - u.y); }
      if (want === null && u.pose && u.restFace !== null && u.restFace !== undefined) want = u.restFace;
      if (want !== null) md.heading = angLerp(md.heading, want, Math.min(1, dt * (u.pose ? 3 : 10)));
      md.px = u.x; md.pz = u.y;
      md.root.rotation.y = md.heading;
      const sc = u.look ? (u.look.h || 1) * (u.look.s || 1) : 1; if (!md.ram) md.root.scale.set(sc, sc, sc);
      if (md.ram) {
        const a = u.attackAnim;
        if (md.oxLegs) { md.oxLegs.forEach((l, i) => l.rotation.x = u.moving ? Math.sin(u.walkPhase * 1.2 + (i % 3 ? Math.PI : 0)) * 0.45 : 0); md.load.visible = u.carry > 0; }
        if (md.arm) { const k = machineArm(u); md.arm.rotation.x = lerp(-0.32, -1.7, k); md.stone.visible = !(a > 0 && a / u.animDur >= 0.52); }
        if (md.bolt) { const fired = a > 0 && a / u.animDur >= 0.45; md.bolt.visible = !fired; const ps = md.string.attributes.position; ps.setZ(1, fired ? 9 : 2); ps.needsUpdate = true;
          if (u.target && alive(u.target)) { const tx = u.target.x, tz = u.target.y0 !== undefined ? (u.target.y0 + u.target.y1) / 2 : u.target.y; md.bow.rotation.x = -Math.min(0.25, Math.hypot(tx - u.x, tz - u.y) / 3000); } }
        if (md.log) md.log.position.z = 4 + (a > 0 ? (a < 0.45 ? lerp(0, -7, ease(a / 0.45)) : a < 0.6 ? lerp(-7, 11, ease((a - 0.45) / 0.15)) : lerp(11, 0, ease((a - 0.6) / 0.4))) : 0);
        for (const w of md.wheels) w.rotation.x = u.walkPhase * 0.6;
        if (md.crew) for (const c of md.crew) animatePerson({ type: 'civ', moving: u.moving && !u.dead, walkPhase: u.walkPhase, attackAnim: 0, order: 'idle', seed: 1 }, c, dt);
      } else if (md.glb) animateGlb(u, md, dt); else if (md.sprite) animateSprite(u, md, dt); else animatePerson(u, md, dt);
      // hit flash, falling, fading
      const fk = u.flash > 0 ? Math.min(1, u.flash * 1.4) * 0.6 : 0;
      for (const mt of md.mats) if (mt.emissive) { mt.emissive.setRGB(fk, fk, fk); }
      if (u.dead) {
        let f = Math.min(1, u.deathT / 0.45); f = 1 - (1 - f) * (1 - f);
        if (!(md.glb && md.acts.die)) { md.body.rotation.x = -f * Math.PI / 2 * 0.94; md.body.position.y = f * 2; }
        const al = u.deathT > 7 ? Math.max(0, 1 - (u.deathT - 7) / 3) : 1;
        if (al < 1) for (const mt of md.mats) { mt.transparent = true; mt.opacity = al; }
      }
    }
    for (const [id, md] of unitModels) if (!seen.has(id)) { scene.remove(md.root); unitModels.delete(id); }
  }
  const bModels = new Map(), joined = new Set();
  function syncBuildings(dt) {
    const all = structures.concat(farms), seen = new Set();
    for (const b of all) {
      seen.add(b.id);
      let md = bModels.get(b.id);
      if (md && (md.engine || null) !== (b.engine || null) && !b.dead) { scene.remove(md.g); bModels.delete(b.id); md = null; }
      if (md && md.palVer !== palVer && !b.dead) { scene.remove(md.g); if (md.rubble) scene.remove(md.rubble); bModels.delete(b.id); md = null; }
      if (!md) {
        md = buildingModel(b); md.palVer = palVer; md.engine = b.engine || null; bModels.set(b.id, md);
        md.inner.rotation.y = [0, -Math.PI / 2, Math.PI, Math.PI / 2][b.dir || 0]; md.baseY = md.g.position.y;
        if (['wall', 'gate', 'highwall', 'stairs', 'moat'].includes(b.kind) && !joined.has(b.id) && joined.add(b.id)) for (const o of structures) if (o !== b && (o.kind === 'wall' || o.kind === 'highwall' || o.kind === 'stairs' || o.kind === 'moat') && Math.abs(o.c - b.c) + Math.abs(o.r - b.r) === 1) { const om = bModels.get(o.id); if (om && !om.rubble) { scene.remove(om.g); bModels.delete(o.id); } }
        if (isField(b.kind) || b.kind === 'house') hideGrass(b.x0, b.y0, b.x1, b.y1);
      }
      if (b.dead) { if (!md.rubble) { md.g.visible = false; md.rubble = (b.kind === 'farm' || b.kind === 'moat' || b.kind === 'pit') ? null : rubble(b); } if (Math.random() < 0.05) spawn('smoke', b.x + RR(-25, 25), b.y - RR(5, 25), b.y); continue; }
      if (b.dropT) { const k = 1 - (performance.now() - b.dropT) / 380; md.g.position.y = md.baseY + Math.max(0, k) * k * 18; if (k <= 0) { b.dropT = 0; md.g.position.y = md.baseY; } }
      const prog = b.done === false ? Math.max(0.06, b.progress) : 1;
      md.inner.scale.y = prog;
      if (md.scaffold) md.scaffold.visible = b.done === false;
      const fk = b.flash > 0 ? b.flash * 0.45 : 0;
      for (const mt of md.mats) mt.emissive.setRGB(fk, fk, fk);
      md.inner.rotation.z = Math.sin(time * 40) * (b.wobble || 0) * 0.01;
      if (md.sails && b.done) md.sails.rotation.z = time * 0.9;
      if (md.stockLogs) { const nl = Math.ceil(res.wood / 20), ns = Math.ceil(res.stone / 15), nk = Math.ceil(((res.wheat || 0) + (res.flour || 0) + (res.hops || 0) + (res.iron || 0)) / 8);
        md.stockLogs.forEach((l, i) => l.visible = i < nl); md.stockStones.forEach((l, i) => l.visible = i < ns); md.stockSacks.forEach((l, i) => l.visible = i < nk); }
      if (md.pitCover) { const open = b.sprung > 0 || b.done === false; md.pitCover.visible = !open; md.pitStakes.visible = open; }
      for (const f of md.flags) { const p = f.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(time * 5 + x * 0.25) * Math.min(3, x * 0.15)); } p.needsUpdate = true; }
      if (md.archer) {
        const a = md.archer; animatePerson({ type: 'archer', moving: false, walkPhase: 0, attackAnim: b.drawT > 0 ? 0.3 : 0, order: 'attack', seed: 1 }, a, dt);
        if (b.tx !== undefined) a.root.rotation.y = angLerp(a.root.rotation.y, Math.atan2(b.tx - b.x, b.ty - (b.y0 + b.y1) / 2), Math.min(1, dt * 6));
        a.root.visible = b.done !== false;
      }
      if (md.wheat) {
        const n = Math.round((b.done ? b.amount / b.max : 0) * md.wheatN);
        if (n !== md.shownWheat) {
          md.shownWheat = n; const R = mulberry32(b.id); let k = 0;
          for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) for (let j = 0; j < 3; j++, k++) {
            const x = -25 + c * 8.3 + (R() - 0.5) * 3, z = -25 + r * 8.3 + (R() - 0.5) * 3, show = k < n;
            const mtx = new T.Matrix4().compose(new T.Vector3(x, 5.5, z), new T.Quaternion().setFromEuler(new T.Euler((R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3)), new T.Vector3(show ? 1 : 0, show ? 1 : 0, show ? 1 : 0));
            md.wheat.setMatrixAt(k, mtx);
          }
          md.wheat.instanceMatrix.needsUpdate = true;
        }
      }
      // smoke and fire from damage, chimney smoke from houses
      const hp = b.hp / b.maxHp;
      if ((b.kind === 'tower' || b.kind === 'keep' || b.kind === 'gtower') && hp < 0.4) {
        const top = b.kind === 'tower' ? 120 : b.kind === 'keep' ? 100 : 88;
        if (Math.random() < 0.5) spawn('fire', b.x + RR(-30, 30), b.y - top + RR(-10, 10), b.y);
        if (Math.random() < 0.2) spawn('smoke', b.x + RR(-25, 25), b.y - top - RR(10, 30), b.y);
      }
      if (md.chimney && b.done && Math.random() < 0.04) spawn('smoke', md.chimney.x, md.chimney.z - 70, md.chimney.z);
    }
    for (const [id, md] of bModels) if (!seen.has(id)) { scene.remove(md.g); if (md.rubble) scene.remove(md.rubble); bModels.delete(id); }
  }
  let footMesh = null;
  function syncPrints() {
    if (!footMesh) { const fg = new T.CircleGeometry(1, 10); fg.rotateX(-Math.PI / 2); footMesh = new T.InstancedMesh(fg, new T.MeshBasicMaterial({ color: 0x1e2812, transparent: true, opacity: 0.3, depthWrite: false }), 600); footMesh.frustumCulled = false; footMesh.renderOrder = 1; scene.add(footMesh); }
    const life = WEATHER.cover > 0.3 ? 60 : 28, n = Math.min(600, prints.length), M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), Sc = new T.Vector3();
    footMesh.material.color.set(WEATHER.cover > 0.3 ? 0x6e7480 : 0x1e2812); footMesh.material.opacity = WEATHER.cover > 0.3 ? 0.42 : 0.3;
    for (let i = 0; i < n; i++) { const f = prints[prints.length - n + i], k = Math.max(0, 1 - f.t / life); V.set(f.x, heightAt(f.x, f.y) + 0.35, f.y); Q.setFromAxisAngle(new T.Vector3(0, 1, 0), -f.a); Sc.set(2.6 * k, 1, 1.3 * k); M.compose(V, Q, Sc); footMesh.setMatrixAt(i, M); }
    footMesh.count = n; footMesh.instanceMatrix.needsUpdate = true;
  }
  function syncScenery() {
    syncPrints();
    rocks.forEach((r, i) => { if (r.gone && !r.hid3) { r.hid3 = true; rockMesh.setMatrixAt(i, new T.Matrix4().makeScale(0, 0, 0)); rockMesh.instanceMatrix.needsUpdate = true; } });
    for (const tl of treeList) if (tl.t.gone && !tl.hidden) { tl.hidden = true; const z = new T.Matrix4().makeScale(0, 0, 0); tl.crown.setMatrixAt(tl.i, z); tl.trunk.setMatrixAt(tl.i, z); tl.crown.instanceMatrix.needsUpdate = tl.trunk.instanceMatrix.needsUpdate = true; }
    for (const st of stumps) if (!stumpSeen.has(st)) { stumpSeen.add(st); const s = cyl(3.2 * st.s, 3.8 * st.s, 5, woodVM(6, 5), st.x, heightAt(st.x, st.y) + 2.5, st.y + 4, 8); scene.add(s); }
    for (const b of bushes) {
      let md = bushModels.get(b); if (!md) { md = bushModel(b); bushModels.set(b, md); }
      const n = Math.ceil(b.amount / 11); if (n !== md.shown) { md.shown = n; md.berries.count = Math.min(14, n); }
    }
    for (const f of fires) if (f.m3) {
      const m = f.m3, fl = 0.85 + 0.12 * Math.sin(time * 13) + 0.07 * Math.sin(time * 31) + 0.05 * Math.sin(time * 4.7);
      m.flameU.uT.value = time; m.flameU.uWind.value = Math.cos(WEATHER.ang) * WEATHER.wind * (1 - 0.6 * WEATHER.rain);
      m.flames.scale.set(1, 0.9 + 0.18 * Math.sin(time * 9.1) * Math.sin(time * 3.3), 1); m.light.intensity = (1.25 + 0.55 * fl) * (1 - 0.35 * WEATHER.rain); m.glow.material.opacity = 0.12 + 0.06 * fl;
      const P = m.sparks.geometry.attributes.position, dt3 = 1 / 60;
      m.life.forEach((q, i) => { q.t -= dt3; if (q.t <= 0) { q.t = 0.9 + Math.random() * 1.6; q.x = (Math.random() - 0.5) * 6; q.y = 4; q.z = (Math.random() - 0.5) * 6; q.vx = (Math.random() - 0.5) * 6 + Math.cos(WEATHER.ang) * WEATHER.wind * 10; q.vz = (Math.random() - 0.5) * 6; }
        q.x += q.vx * dt3 + Math.sin(time * 6 + i) * 0.08; q.z += q.vz * dt3; q.y += (22 + i % 5 * 3) * dt3; P.setXYZ(i, q.x, q.y, q.z); });
      P.needsUpdate = true;
    }
  }
  // ---------- arrows and particles ----------
  let arrowPool = [], pts = [], stonePool = [];
  function buildFx() {
    const vs = 'attribute float size; attribute vec4 rgba; varying vec4 vC; void main(){ vC = rgba; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * (700.0 / -mv.z); gl_Position = projectionMatrix * mv; }';
    const fs = 'varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard; gl_FragColor = vec4(vC.rgb, vC.a * (1.0 - r * 4.0)); }';
    for (const additive of [false, true]) {
      const N = 1600, geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 3), 3)); geo.setAttribute('rgba', new T.BufferAttribute(new Float32Array(N * 4), 4)); geo.setAttribute('size', new T.BufferAttribute(new Float32Array(N), 1));
      const mat = new T.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending });
      const p = new T.Points(geo, mat); p.frustumCulled = false; scene.add(p); pts.push({ p, geo, N });
    }
  }
  const PCOL = { spark: [1, 0.85, 0.5], blood: [0.47, 0.06, 0.05], chip: [0.48, 0.34, 0.19], dust: [0.59, 0.51, 0.37], smoke: [0.3, 0.29, 0.27], fire: [1, 0.55, 0.15] };
  function syncFx() {
    const counts = [0, 0];
    for (const q of particles) {
      const add = q.type === 'spark' || q.type === 'fire', set = pts[add ? 1 : 0], k = counts[add ? 1 : 0];
      if (k >= set.N) continue;
      const t = q.life / q.max, a = 1 - t, h = Math.max(0.5, q.gy - q.y);
      set.geo.attributes.position.setXYZ(k, q.x, heightAt(q.x, q.gy) + h, q.gy);
      const c = PCOL[q.type] || [1, 1, 1];
      const alpha = q.type === 'smoke' ? a * 0.45 : q.type === 'dust' ? a * 0.35 : a * 0.9;
      set.geo.attributes.rgba.setXYZW(k, c[0], c[1], c[2], alpha);
      const sz = q.type === 'smoke' ? q.size * (1 + t * 1.6) * 2 : q.type === 'dust' ? q.size * (1 + t) * 2 : q.type === 'fire' ? q.size * 1.6 : q.size * 1.3;
      set.geo.attributes.size.setX(k, sz);
      counts[add ? 1 : 0]++;
    }
    pts.forEach((s, i) => { s.geo.setDrawRange(0, counts[i]); for (const n of ['position', 'rgba', 'size']) s.geo.attributes[n].needsUpdate = true; });
    // arrows in flight and stuck in the ground
    const list = [];
    const stones = [];
    for (const a of arrows) {
      if (a.t < 0) continue;
      const k = a.t / a.dur, from = a.from, to = a.target;
      const sx = from.x0 !== undefined ? from.x + 6 : from.x, sz = from.x0 !== undefined ? (from.y0 + from.y1) / 2 : from.y, sh = from.x0 !== undefined ? (from.archerY || 110) - 4 : 30;
      const ex = a.x1, ez = to && to.y !== undefined ? to.y : a.y1 + 16, eh = to && to.x0 !== undefined ? 30 : 20;
      const x = lerp(sx, ex, k), z = lerp(sz, ez, k), hgt = lerp(sh, eh, k) + a.h * 1.4 * 4 * k * (1 - k);
      const k2 = Math.min(1, k + 0.02), x2 = lerp(sx, ex, k2), z2 = lerp(sz, ez, k2), h2 = lerp(sh, eh, k2) + a.h * 1.4 * 4 * k2 * (1 - k2);
      if (a.kind === 'stone') { stones.push([x, heightAt(x, z) + (from.x0 !== undefined ? hgt : lerp(44, eh, k) + a.h * 4 * k * (1 - k)), z]); continue; }
      list.push([x, heightAt(x, z) + hgt, z, x2, heightAt(x2, z2) + h2, z2, a.kind === 'bolt']);
    }
    while (stonePool.length < stones.length + stuckStones.length) { const m = sph(5, std('#8f897e', { roughness: 0.95 }), 0, 0, 0, 10); scene.add(m); stonePool.push(m); }
    stonePool.forEach((m, i) => { if (i < stones.length) { m.visible = true; m.position.set(...stones[i]); m.scale.setScalar(1); } else if (i < stones.length + stuckStones.length) { const st = stuckStones[i - stones.length]; m.visible = true; m.position.set(st.x, heightAt(st.x, st.y) + 2, st.y); m.scale.set(1.2, 0.6, 1); } else m.visible = false; });
    for (const s of stuckArrows) { const z = s.y; list.push([s.x, heightAt(s.x, z) + 4, z, s.x + 2, heightAt(s.x, z) - 2, z + 2]); }
    while (arrowPool.length < list.length) {
      const g = new T.Group(); const shaft = cyl(0.35, 0.35, 16, std('#5a3a1e'), 0, 0, 0, 4); shaft.rotation.x = Math.PI / 2; g.add(shaft);
      const tip = mesh(new T.ConeGeometry(0.8, 2.6, 5), std('#cfd5da', { metalness: 0.7 }), 0, 0, 9); tip.rotation.x = Math.PI / 2; g.add(tip);
      scene.add(g); arrowPool.push(g);
    }
    arrowPool.forEach((g, i) => { if (i < list.length) { const [x, y, z, x2, y2, z2, big] = list[i]; g.visible = true; g.position.set(x, y, z); g.lookAt(x2, y2, z2); g.scale.setScalar(big ? 2.2 : 1); } else g.visible = false; });
  }
  // ---------- camera ----------
  function camCenter() { return { x: cam.x + vw / cam.z / 2, z: cam.y + vh / cam.z / 2 }; }
  function placeCamera(dt) {
    const PITCH = pitch;
    const c = camCenter(), D = 820 / cam.z, ty = heightAt(c.x, c.z);
    camera.position.set(c.x + Math.sin(yaw) * Math.cos(PITCH) * D, ty + Math.sin(PITCH) * D, c.z + Math.cos(yaw) * Math.cos(PITCH) * D);
    camera.lookAt(c.x, ty, c.z);
    camera.aspect = vw / vh; camera.fov = vw < 600 ? 46 : 38; camera.updateProjectionMatrix();
    sun.position.set(c.x - 520, ty + 900, c.z - 380); sun.target.position.set(c.x, ty, c.z); sun.target.updateMatrixWorld();
    fill.position.set(c.x + 600, ty + 420, c.z + 500); fill.target.position.set(c.x, ty, c.z); fill.target.updateMatrixWorld();
    sky.position.copy(camera.position);
    const s = Math.max(500, D * 0.95); Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s }); sun.shadow.camera.updateProjectionMatrix();
    const wet = WEATHER.rain, sn = WEATHER.snow; scene.fog.near = D * (1.1 - 0.5 * wet - 0.3 * sn); scene.fog.far = D * (3.2 - 1.5 * wet - 1.0 * sn);
    scene.fog.color.setRGB(0.718 - 0.2 * wet + 0.12 * sn, 0.776 - 0.2 * wet + 0.1 * sn, 0.8 - 0.15 * wet + 0.1 * sn); scene.background = scene.fog.color;
    sun.intensity = 1.75 * (1 - 0.5 * wet - 0.25 * sn); if (gmatRef && gmatRef.userData.sh) gmatRef.userData.sh.uniforms.snowAmt.value = WEATHER.cover;
  }
  const ray = available ? new T.Raycaster() : null, v2 = available ? new T.Vector2() : null, plane = available ? new T.Plane(new T.Vector3(0, 1, 0), 0) : null, hit = available ? new T.Vector3() : null;
  function groundAt(sx, sy) {
    v2.set(sx / vw * 2 - 1, -(sy / vh) * 2 + 1); ray.setFromCamera(v2, camera);
    const c = camCenter(); plane.constant = -heightAt(c.x, c.z);
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, y: hit.z } : { x: c.x, y: c.z };
  }
  const pv = available ? new T.Vector3() : null;
  function project(x, h, z) { pv.set(x, heightAt(x, z) + h, z).project(camera); return { x: (pv.x + 1) / 2 * vw, y: (1 - pv.y) / 2 * vh, ok: pv.z < 1 }; }
  // what is under a screen point: people first (by their projected body), then buildings
  function pick(sx, sy) {
    let best = null, bd = 26;
    for (const u of units) { if (u.dead || u.inside) continue; const p = project(u.x, (isMachine(u) ? 18 : 22) + elev3D(u), u.y); if (!p.ok) continue; const d = Math.hypot(p.x - sx, p.y - sy) * Math.min(1.6, Math.max(0.7, 1 / cam.z)); if (d < bd) { bd = d; best = u; } }
    if (best) return best;
    for (const s of structures) { if (s.dead) continue; if (inBox(sx, sy, s.x0, s.x1, s.y0, s.y1, s.topH || 40)) return s; }
    return null;
  }
  function inBox(sx, sy, x0, x1, z0, z1, h) {
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [0, h]) { const p = project(x, y, z); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    return sx >= minX && sx <= maxX && sy >= minY && sy <= maxY;
  }
  function pickResource(sx, sy) {
    let best = null, bd = 24;
    for (const b of bushes) { const p = project(b.x, 8, b.y); const d = Math.hypot(p.x - sx, p.y - sy); if (d < bd) { bd = d; best = b; } }
    for (const fm of farms) if (inBox(sx, sy, fm.x0, fm.x1, fm.y0, fm.y1, 6)) return fm;
    if (best) return best;
    bd = 30;
    for (const t of trees) { const p = project(t.c * TILE + 16, 40 * t.s, t.r * TILE + 16); const d = Math.hypot(p.x - sx, p.y - sy); if (d < bd * t.s) { bd = d; best = t; } }
    if (best) return best;
    bd = 26; for (const r of rocks) { if (r.iron || r.gone) continue; const p = project(r.x, 6 * r.s, r.y - 6); const d = Math.hypot(p.x - sx, p.y - sy); if (d < bd) { bd = d; best = r; } }
    return best;
  }
  // ---------- overlay drawn over the 3D view: rings, bars, labels ----------
  function ringPath(g, x, z, r, h = 1) { g.beginPath(); for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2, p = project(x + Math.cos(a) * r, h, z + Math.sin(a) * r); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.closePath(); }
  function overlay(g) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, vw, vh);
    for (const m of markers) { const k = m.t / 0.7, x = m.target ? m.target.x : m.x, z = m.target ? m.target.y : m.y; g.strokeStyle = `rgba(${m.col},${1 - k})`; g.lineWidth = 2.5; ringPath(g, x, z, 18 * (1 - k * 0.6)); g.stroke(); }
    const targeted = new Set(); for (const u of selection) if (u.order === 'attack' && alive(u.target)) targeted.add(u.target);
    g.setLineDash([5, 4]); g.strokeStyle = 'rgba(255,80,60,0.85)'; g.lineWidth = 2;
    for (const t of targeted) { ringPath(g, t.x, t.x0 !== undefined ? (t.y0 + t.y1) / 2 : t.y, t.x0 !== undefined ? (t.x1 - t.x0) * 0.75 : 14); g.stroke(); }
    g.setLineDash([]);
    for (const u of selection) { if (u.dead) continue; ringPath(g, u.x, u.y, isMachine(u) ? 24 : 13, 1 + elev3D(u)); g.fillStyle = 'rgba(120,255,140,0.16)'; g.fill(); g.strokeStyle = 'rgba(130,255,150,0.95)'; g.lineWidth = 2; g.stroke(); }
    if (hover && !hover.dead && hover.kind === 'unit' && !selection.has(hover)) { ringPath(g, hover.x, hover.y, 13); g.strokeStyle = hover.team === 'enemy' ? 'rgba(255,90,70,0.9)' : 'rgba(220,255,220,0.7)'; g.lineWidth = 1.6; g.stroke(); }
    if (placing && mouse.inside) {
      const dir = isLine(placing.kind) ? 0 : placing.dir || 0, hov = isLine(placing.kind) ? 0 : 10 + Math.sin(performance.now() / 260) * 4;
      const k = playerKeep(), w = toWorld(mouse.x, mouse.y), kind = placing.kind, d = Object.assign({}, BUILD[placing.kind], dimsOf(placing.kind, dir)), cur = tileFor(kind, w.x, w.y, dir);
      if (k) { g.setLineDash([10, 8]); g.strokeStyle = 'rgba(255,230,140,0.6)'; g.lineWidth = 2; ringPath(g, k.x, (k.y0 + k.y1) / 2, TERRITORY); g.stroke(); g.setLineDash([]); }
      const spots = isLine(kind) && placing.start ? wallLine(placing.start.c, placing.start.r, cur.c, cur.r) : [cur];
      let cost = 0;
      for (const t of spots) {
        const okp = canPlace(kind, t.c, t.r, dir); if (okp) cost += d.stone || d.wood;
        const x0 = t.c * TILE, z0 = t.r * TILE, x1 = x0 + d.w * TILE, z1 = z0 + d.h * TILE;
        const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => project(x, 1 + hov, z));
        const top = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => project(x, Math.min(60, d.topH) + hov, z));
        if (!isLine(kind)) { const fl = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => project(x, 1, z)); g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); fl.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath(); g.fill();
          facingArrow(g, (x0 + x1) / 2, (z0 + z1) / 2, dir, Math.max(x1 - x0, z1 - z0) / 2 + 30, q => project(q.x, 2, q.y)); }
        g.fillStyle = okp ? 'rgba(120,255,140,0.3)' : 'rgba(255,80,60,0.38)';
        g.beginPath(); corners.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fill();
        g.strokeStyle = okp ? 'rgba(150,255,170,0.9)' : 'rgba(255,120,100,0.9)'; g.lineWidth = 1.5; g.stroke();
        g.beginPath(); top.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.stroke();
        for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(corners[i].x, corners[i].y); g.lineTo(top[i].x, top[i].y); g.stroke(); }
      }
      if (isLine(kind)) { g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; const label = placing.start ? `${cost} ${d.stone ? 'stone' : 'wood'}` : 'wall start'; g.strokeText(label, mouse.x, mouse.y - 24); g.fillStyle = '#ffe9a8'; g.fillText(label, mouse.x, mouse.y - 24); }
    }
    if (tearing && mouse.inside) drawTearHover(g, (x, y) => project(x, 2, y));
    for (const u of units) { if (u.dead) continue; if (selection.has(u) || u.hp < u.maxHp || hover === u || u.lord) { const p = project(u.x, (isMachine(u) ? 62 : u.lord ? 70 : 52) + elev3D(u), u.y); if (p.ok && p.x > -40 && p.x < vw + 40 && p.y > -40 && p.y < vh + 40) { drawHealthBar(g, p.x, p.y, u.lord ? 44 : 28, u.hp / u.maxHp); if (u.lord) { g.save(); g.font = 'bold 14px "Source Sans 3", Georgia, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(u.name, p.x, p.y - 8); g.fillStyle = '#ffd98a'; g.fillText(u.name, p.x, p.y - 8); g.restore(); } } } }
    for (const s of structures.concat(farms)) if (s.asleep && !s.dead) { const q = project(s.x, (s.topH || 20) + 30, (s.y0 + s.y1) / 2); if (q.ok) { g.save(); g.font = 'bold 15px "Source Sans 3", Georgia, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText('Zz asleep', q.x, q.y); g.fillStyle = '#cfe3ff'; g.fillText('Zz asleep', q.x, q.y); g.restore(); } }
    for (const s of structures) if (!s.dead && (s.hp < s.maxHp || hover === s)) { const p = project(s.x, (s.kind === 'tower' ? 200 : s.kind === 'keep' ? 160 : (s.topH || 40) + 18), (s.y0 + s.y1) / 2); if (p.ok) drawHealthBar(g, p.x, p.y, Math.max(30, Math.min(84, s.x1 - s.x0 + 16)), s.hp / s.maxHp); }
    g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)';
    for (const sp of speeches) { if (sp.u.inside) continue; const q = project(sp.u.x, (sp.u.type === 'king' ? 84 : 66) + elev3D(sp.u), sp.u.y); if (q.ok) drawSpeech(g, q.x, q.y, sp.text); }
    for (const fl of floats) { const gz = fl.y + 50, p = project(fl.x, 50 + fl.t * 22, gz); g.globalAlpha = 1 - fl.t / 1.6; g.strokeText(fl.text, p.x, p.y); g.fillStyle = fl.col; g.fillText(fl.text, p.x, p.y); }
    g.globalAlpha = 1;
    // soft edges
    const vg = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.45, vw / 2, vh / 2, Math.hypot(vw, vh) * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.22)'); g.fillStyle = vg; g.fillRect(0, 0, vw, vh);
    if (drag && drag.box) {
      const x = Math.min(drag.sx, drag.x), y = Math.min(drag.sy, drag.y), w = Math.abs(drag.x - drag.sx), h = Math.abs(drag.y - drag.sy);
      g.fillStyle = 'rgba(120,255,140,0.12)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(140,255,160,0.95)'; g.lineWidth = 1.5; g.strokeRect(x + 0.5, y + 0.5, w, h);
    }
  }
  // quality steps down by itself if frames are slow: sharpness, then shadow detail, then shadows
  let quality = 0, slowT = 0, fastT = 0, lastWall = 0;
  function adapt() {
    const now = performance.now(), dt = lastWall ? Math.min(1, (now - lastWall) / 1000) : 0; lastWall = now;
    if (dt > 1 / 28) { slowT += dt; fastT = 0; } else { fastT += dt; slowT = Math.max(0, slowT - dt * 0.5); }
    if (slowT > 2.5 && quality < 3) { quality++; slowT = 0; applyQuality(); }
  }
  function applyQuality() {
    renderer.setPixelRatio(quality >= 1 ? 1 : dpr); renderer.setSize(vw, vh, false);
    if (quality >= 2 && sun.shadow.mapSize.x > 1024) { sun.shadow.mapSize.set(1024, 1024); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    if (quality >= 3) { renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
  }
  function render(g, dt) {
    if (!ready) init();
    const pr = quality >= 1 ? 1 : dpr, W = Math.round(vw * pr), H = Math.round(vh * pr);
    if (glCanvas.width !== W || glCanvas.height !== H) { renderer.setPixelRatio(pr); renderer.setSize(vw, vh, false); }
    adapt();
    placeCamera(dt); syncWater(dt); syncScenery(); syncBuildings(dt); syncUnits(dt); syncRally(); syncFx();
    renderer.render(scene, camera);
    overlay(g);
  }
  function setActive(v) {
    active = v && available;
    if (glCanvas) glCanvas.style.display = active ? 'block' : 'none';
    try { localStorage.setItem('sd-view', active ? '3d' : '2d'); } catch (e) {}
  }
  const panAxes = () => ({ c: Math.cos(yaw), s: Math.sin(yaw) });
  // throw away a model so it is built again fresh on the next frame (the fix-a-glitch button)
  function rebuildModel(o) { if (o.x0 !== undefined) { const md = bModels.get(o.id); if (md) { scene.remove(md.g); if (md.rubble) scene.remove(md.rubble); bModels.delete(o.id); } } else { const md = unitModels.get(o.id); if (md) { scene.remove(md.root); unitModels.delete(o.id); } } }
  const glbStatus = detail => ({ loaded: Object.keys(GLB), unitsUsingModels: [...unitModels.values()].filter(m => m.glb).map(m => m.glbKey + ':' + (m.cur || '-') + (detail ? ' ' + JSON.stringify((() => { const bb = new T.Box3().setFromObject(m.root); return { min: bb.min.toArray().map(Math.round), max: bb.max.toArray().map(Math.round), vis: m.root.visible, inScene: !!m.root.parent }; })()) : '')) });
  return { rebuildModel, glbStatus, treeDetail: on => { treeDetailWant = on; try { localStorage.setItem('sd-trees', on ? 'detailed' : 'simple'); } catch (e) {} if (setTreeDetail) setTreeDetail(on); }, treeDetailOn: () => treeDetailWant, leafColor: (r, g2, b2) => leafDecid && leafDecid.color.setRGB(r, g2, b2), quality: () => quality, available, get active() { return active; }, setActive, render, groundAt, project, pick, pickResource, panAxes, heightAt };
})();

const speeches = [];
function sayLine(u) {
  const t = u.type, b = u.buildTarget, j = u.job;
  if (u.sick) return u.toHeal ? 'I feel ill... going to the keep to be cared for.' : 'I feel ill...';
  if (t === 'civ') {
    if (u.fat > 0.55 && u.order === 'idle') return 'Ah, that was a fine meal. Do I have to work?';
    if (u.breakUntil > time) return 'Just a short rest, sir. Back to it soon.';
    if (u.order === 'build' && b) return `I'm building the ${b.name}.`;
    if (u.order === 'craft' && j) return `I am busy at the ${j.name}.`;
    if (u.carry > 0 && u.sub === 'toKeep') return `Taking ${u.carry} ${u.carryType} to the store.`;
    if (u.order === 'gather' && u.task) return { wood: "I'm cutting wood.", food: "I'm gathering food.", stone: "I'm quarrying stone.", wheat: "I'm harvesting wheat.", hops: "I'm picking hops." }[u.task.type] || "I'm gathering.";
    return 'How can I help, sir?';
  }
  if (isMachine(u)) return u.holdFire ? 'Holding fire, my lord.' : u.order === 'attack' ? 'Loosing at the enemy!' : 'Loaded and ready to fire.';
  if (t === 'king') return 'My people need walls, bread and brave men.';
  if (u.guardOf && u.guardOf.type === 'king') return 'I guard the King with my life.';
  if (u.gift && u.guardOf) return `I came with the ${u.guardOf.kind === 'keep' ? 'keep' : u.guardOf.name}. No one gets past this door.`;
  if (u.guardOf) return `Guarding the door of the ${u.guardOf.name}.`;
  if (t === 'archer') return u.onWall ? 'Watching from up here. Arrows ready!' : u.order === 'attack' ? 'Loosing arrows!' : 'Arrows ready, waiting on them.';
  if (u.order === 'attack') return t === 'knight' ? 'For the King!' : 'Into them!';
  if (u.order === 'move') return 'On my way!';
  return t === 'knight' ? 'Ready, my lord.' : 'Awaiting orders, sir.';
}
function talkTo(u) {
  if (!u || u.team !== 'player') return;
  for (let i = speeches.length - 1; i >= 0; i--) if (speeches[i].u === u) speeches.splice(i, 1);
  speeches.push({ u, text: sayLine(u), t: 0 });
  if (u.type === 'catapult' || u.type === 'ballista' || u.type === 'trebuchet') showMachine(u);
}
function drawSpeech(g, x, y, text) {
  g.save(); g.font = 'bold 14px "Source Sans 3", Georgia, sans-serif'; const w = g.measureText(text).width + 16;
  g.fillStyle = 'rgba(255,250,236,0.95)'; g.strokeStyle = 'rgba(60,40,20,0.8)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(x - w / 2 + 8, y - 30); g.lineTo(x + w / 2 - 8, y - 30); g.quadraticCurveTo(x + w / 2, y - 30, x + w / 2, y - 22); g.lineTo(x + w / 2, y - 14); g.quadraticCurveTo(x + w / 2, y - 6, x + w / 2 - 8, y - 6); g.lineTo(x + 6, y - 6); g.lineTo(x, y); g.lineTo(x - 2, y - 6); g.lineTo(x - w / 2 + 8, y - 6); g.quadraticCurveTo(x - w / 2, y - 6, x - w / 2, y - 14); g.lineTo(x - w / 2, y - 22); g.quadraticCurveTo(x - w / 2, y - 30, x - w / 2 + 8, y - 30); g.closePath();
  g.fill(); g.stroke(); g.fillStyle = '#2a1a0c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - 18); g.restore();
}
function showMachine(u) {
  storeShown = u; const p = document.getElementById('storePop');
  const key = 'm' + u.id + (u.holdFire ? 'h' : '');
  if (p.dataset.site !== key) { p.innerHTML = `<h3>${u.name.toUpperCase()}</h3>${fixRow}<div class="ln"><span>Status</span><b>${u.holdFire ? 'Holding fire' : 'Firing at will'}</b></div><div class="row" style="display:flex;gap:6px;margin-top:8px"><button class="sm" data-mach="stop">Stop</button><button class="sm" data-mach="go">Continue</button></div>`; p.dataset.site = key; }
  p.hidden = false;
}
function showTower(b) {
  storeShown = b; const p = document.getElementById('storePop'), ln = (a, v) => `<div class="ln"><span>${a}</span><b>${v}</b></div>`;
  const top = units.filter(o => o.onWall === b && !o.dead).length, door = units.filter(o => o.guardOf === b && !o.dead).length;
  let html = `<h3>${b.name.toUpperCase()}</h3>` + ln('Archers on top', `${top} of ${WALL_POSTS[b.kind]}`) + ln('Guards at the door', `${door} of 2`);
  if (b.kind === 'roundtower') {
    html += ln('Engine', b.engine ? (b.engine === 'trebuchet' ? 'Trebuchet' : 'Ballista') + (b.engineHold ? ' (holding fire)' : ' (firing)') : 'none');
    html += `<div class="row" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">` + (b.engine ? `<button class="sm" data-tw="stop">Stop</button><button class="sm" data-tw="go">Continue</button>` : `<button class="sm" data-tw="ballista">Mount Ballista (110 wood, 50 gold)</button><button class="sm" data-tw="trebuchet">Mount Trebuchet (200 wood, 40 stone, 80 gold)</button>`) + `</div>`;
  }
  html += fixRow + '<div style="font-size:13px;color:#d9c9a3;margin-top:6px">Idle archers climb up by themselves; idle knights, macemen and spearmen guard the door. Esc closes.</div>';
  const key = 'tw' + b.id + (b.engine || '') + (b.engineHold ? 'h' : '') + top + '/' + door;
  if (p.dataset.site !== key) { p.innerHTML = html; p.dataset.site = key; } p.hidden = false;
}
document.getElementById('storePop').addEventListener('click', e => {
  const m = e.target.closest('[data-mach]'); if (m && storeShown && storeShown.kind === 'unit') { storeShown.holdFire = m.dataset.mach === 'stop'; if (storeShown.holdFire) { storeShown.order = 'idle'; storeShown.target = null; } talkTo(storeShown); AudioSys.ui('select'); return; }
  const t = e.target.closest('[data-tw]'); if (!t || !storeShown || storeShown.kind !== 'roundtower') return;
  const b = storeShown, a = t.dataset.tw;
  if (a === 'stop' || a === 'go') b.engineHold = a === 'stop';
  else { const cost = a === 'ballista' ? { wood: 110, gold: 50 } : { wood: 200, stone: 40, gold: 80 }; if (!afford(cost)) { showBanner(`Not enough ${lacking(cost)} to mount a ${a}.`, 2.5); return; } pay(cost); b.engine = a; b.engineHold = false; floatText(b.x, b.y - b.topH - 20, `${a === 'ballista' ? 'Ballista' : 'Trebuchet'} mounted`, '#9fe8a8'); }
  AudioSys.ui('select'); showTower(b); updateHud();
});
let paused = false, leftNoteT = 0, menuPause = false, menuT = 0;
function showLeftNote(reasons) {
  const el = document.getElementById('leftNote'); el.hidden = false; leftNoteT = 14;
  el.dataset.why = reasons.length ? 'They left because ' + reasons.slice(0, 4).join(', ') + '. Fix these to win them back; when mood rises, people who left return.' : 'Mood is very low. Open the mood report to see why.';
  document.getElementById('leftText').innerHTML = '<b>An unhappy citizen has left your town.</b>';
}
document.getElementById('leftWhy').onclick = () => { const el = document.getElementById('leftNote'); document.getElementById('leftText').innerHTML = '<b>An unhappy citizen has left your town.</b><span class="why2">' + el.dataset.why + '</span>'; leftNoteT = 20; const mp = document.getElementById('moodPop'); if (mp.hidden) document.getElementById('cMood').click(); };
document.getElementById('leftClose').onclick = () => { document.getElementById('leftNote').hidden = true; };
// every box that pops up gets a big X to close it, and keeps it even when its contents are redrawn
(function closeButtons() {
  const $ = id => document.getElementById(id);
  const closers = {
    storePop: () => { $('storePop').hidden = true; storeShown = null; },
    menuPop: () => { $('menuPop').hidden = true; $('btnMenu').setAttribute('aria-expanded', 'false'); },
    moodPop: () => { $('moodPop').hidden = true; },
    goodsPop: () => { $('goodsPop').hidden = true; },
    banner: () => { clearTimeout(bannerTimer); $('banner').style.opacity = 0; $('banner').classList.remove('shown'); },
    help: () => $('btnHelpClose').click(),
    win: () => { $('win').style.display = 'none'; }
  };
  for (const [id, close] of Object.entries(closers)) {
    const el = id === 'help' || id === 'win' ? $(id).querySelector('.box') : $(id);
    const add = () => { if (el.querySelector(':scope > .xbtn')) return; const x = document.createElement('button'); x.className = 'xbtn'; x.type = 'button'; x.dataset.close = id; x.setAttribute('aria-label', 'Close'); x.title = 'Close'; x.innerHTML = '&times;'; el.prepend(x); };
    add(); new MutationObserver(add).observe(el, { childList: true });
  }
  // the box closes the moment the X is pressed, even if the box redraws itself in between
  const hit = e => { const x = e.target.closest && e.target.closest('.xbtn[data-close]'); if (!x) return; e.stopPropagation(); e.preventDefault(); if (e.type === 'click' && e.detail > 0) return; closers[x.dataset.close](); try { AudioSys.ui('select'); } catch (er) {} };
  document.addEventListener('pointerdown', hit, true); document.addEventListener('click', hit, true);
})();
function enemiesClose() {
  const k = playerKeep(), mine = units.filter(u => u.team === 'player' && !u.dead);
  return units.some(e => !e.dead && e.team === 'enemy' && e.type !== 'civ' && ((k && Math.hypot(e.x - k.x, e.y - k.y) < 760) || mine.some(m => Math.hypot(e.x - m.x, e.y - m.y) < 380) || structures.some(b => b.team === 'player' && !b.dead && Math.hypot(e.x - b.x, e.y - b.y) < 420)));
}
function setPaused(want) {
  if (!started || won) return;
  if (want && enemiesClose()) { showBanner('Enemies are close by: you must fight! You can pause once they are gone.', 3); return; }
  paused = want; document.body.classList.toggle('paused', paused);
  document.getElementById('pauseNote').hidden = !paused; document.getElementById('btnPause').classList.toggle('on', paused);
  document.getElementById('btnPause').innerHTML = paused ? '&#9654;<span class="lbl"> Resume</span>' : '&#10074;&#10074;<span class="lbl"> Pause</span>';
  AudioSys.ui('select');
}
document.getElementById('btnPause').onclick = () => setPaused(!paused);
document.getElementById('btnResume').onclick = () => setPaused(false);
let camSpin = 0, zoomAnim = null; const camVel = { x: 0, y: 0 };
