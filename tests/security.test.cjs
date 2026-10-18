const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { resolveAsset, isExternalUrl } = require('../electron/security.cjs');
const root = path.resolve('dist');
test('serves only packaged files on the expected origin', () => {
  assert.equal(resolveAsset(root, 'quranly://app/'), path.join(root,'index.html'));
  assert.equal(resolveAsset(root, 'quranly://app/assets/app.js'), path.join(root,'assets/app.js'));
  for (const url of ['quranly://evil/index.html','file:///C:/Windows/win.ini','quranly://app/%2e%2e%5cpackage.json','quranly://app/%00','quranly://app/%2e%2e%2fpackage.json']) assert.equal(resolveAsset(root,url),null);
});
test('external links cannot invoke executables or script protocols', () => {
  assert.equal(isExternalUrl('https://quran.com'),true);
  assert.equal(isExternalUrl('mailto:hello@example.com'),true);
  for (const url of ['javascript:alert(1)','file:///C:/Windows/cmd.exe','ms-settings:','data:text/html,test']) assert.equal(isExternalUrl(url),false);
});
test('audio fallback preserves reciter and uses complete surahs', async () => {
  const { getAlternateAudioUrls } = await import('../src/utils/audioEngine.js');
  assert.deepEqual(getAlternateAudioUrls(2,'Abdul Basit'),[]);
  const mirrors = getAlternateAudioUrls(2,'Mishary Alafasy');
  assert.equal(mirrors.length,2);
  assert.ok(mirrors.every(url => url.endsWith('/002.mp3')));
});
