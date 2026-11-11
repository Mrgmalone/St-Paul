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
module.exports = { SP, GAME: 'file://' + path.resolve(__dirname, '../index.html') };
