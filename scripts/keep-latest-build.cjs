// Run only after electron-builder succeeds. Preserve the current installer and
// remove older Quranly installers from this project's release directory.
const fs = require('node:fs/promises');
const path = require('node:path');
const {version} = require('../package.json');
(async () => {
  const release = path.resolve(__dirname, '../release');
  const latest = `Quranly-Setup-${version}-x64.exe`;
  const stat = await fs.stat(path.join(release,latest));
  if (stat.size < 1_000_000) throw Error('Current installer is missing or incomplete; older builds were retained.');
  for (const file of await fs.readdir(release,{withFileTypes:true})) {
    if (!file.isFile() || !/^Quranly-Setup-.*\.exe(?:\.blockmap)?$/.test(file.name)) continue;
    if (file.name === latest || file.name === `${latest}.blockmap`) continue;
    await fs.unlink(path.join(release,file.name));
    console.log(`Removed older installer: ${file.name}`);
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
