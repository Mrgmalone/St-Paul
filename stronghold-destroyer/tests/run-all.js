// Runs every browser test and reports pass or fail. A test passes when it exits cleanly and reports no page errors.
// usage, from the stronghold-destroyer folder:   node tests/run-all.js            (all tests)
//                                                 node tests/run-all.js tK tArt3d  (just these)
// Needs Node and Playwright with Chromium. 3D tests run the game in a software graphics mode and are slow (minutes each).
const { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const { SP } = require('./env');
const all = fs.readdirSync(__dirname).filter(f => /^t.*\.js$/.test(f)).map(f => f.slice(0, -3));
const pick = process.argv.slice(2).length ? process.argv.slice(2) : all;
const slow = n => /3d|Tg|Art3d/.test(n);
const run = n => new Promise(res => {
  const t0 = Date.now(), p = spawn(process.execPath, [path.join(__dirname, n + '.js'), SP], { cwd: SP, detached: true }); let out = '', done = false;
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  /* a check that runs too long is killed together with the browser it started (its own process group), otherwise the browser can hold the output open and the runner waits forever */
  const killAll = () => { try { process.kill(-p.pid, 'SIGKILL'); } catch (e) { try { p.kill('SIGKILL'); } catch (e2) {} } };
  const timer = setTimeout(killAll, /SweepUI|Save/.test(n) ? 3600000 : 1200000);   /* (the button sweep taps every button on five screens; the save check reloads many games) */
  const finish = code => { if (done) return; done = true; clearTimeout(timer); fs.writeFileSync(path.join(SP, n + '.log'), out);
    const errs = /errors \[\]/.test(out) && !/errors \[\s*['"]/.test(out); res({ n, ok: code === 0 && errs, code, secs: Math.round((Date.now() - t0) / 1000) }); };
  p.on('close', finish); p.on('exit', code => setTimeout(() => { killAll(); finish(code); }, 3000));
});
(async () => {
  fs.mkdirSync(SP, { recursive: true });
  const fast = pick.filter(n => !slow(n)), heavy = pick.filter(slow), results = [];
  const pool = async (list, k) => { const q = list.slice(); await Promise.all(Array.from({ length: k }, async () => { while (q.length) { const r = await run(q.shift()); results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n.padEnd(10)} ${r.secs}s${r.ok ? '' : '  (see tests/.work/' + r.n + '.log)'}`); } })); };
  await pool(fast, 2); await pool(heavy, 1);
  const bad = results.filter(r => !r.ok); console.log(`\n${results.length - bad.length} of ${results.length} passed`); process.exit(bad.length ? 1 : 0);
})();
