// Shared settings for the browser tests. SP is a scratch folder (tests/.work) that holds screenshots and a copy of
// three.js r128 (fetched once from npm), which the 3D tests feed to the game in place of the internet copy.
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
const SP = path.join(__dirname, '.work');
const THREE = path.join(SP, 'lib/three/package/build/three.min.js');
if (!fs.existsSync(THREE)) {
  fs.mkdirSync(path.join(SP, 'lib/three'), { recursive: true });
  execSync('npm pack three@0.128.0 --silent', { cwd: path.join(SP, 'lib/three'), stdio: 'ignore' });
  execSync('tar xzf three-0.128.0.tgz', { cwd: path.join(SP, 'lib/three') });
}
// The game is 3D only: every test feeds it the local three.js and runs Chromium with software 3D graphics.
const LAUNCH = { args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] };
const LIB = path.join(SP, 'lib/three/package');
async function use3d(page) {
  const js = f => r => r.fulfill({ body: fs.readFileSync(path.join(LIB, f)), contentType: 'application/javascript' });
  await page.route('**/three.min.js', js('build/three.min.js'));
  await page.route('**/GLTFLoader.js', js('examples/js/loaders/GLTFLoader.js'));
  await page.route('**/SkeletonUtils.js', js('examples/js/utils/SkeletonUtils.js'));
  await page.route('**/fonts.g*/**', r => r.abort());
}
module.exports = { SP, LAUNCH, use3d, GAME: 'file://' + path.resolve(__dirname, '../index.html') };
