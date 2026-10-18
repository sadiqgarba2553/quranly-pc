const { _electron } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(),'quranly-packaged-'));
  const env = {...process.env}; delete env.ELECTRON_RUN_AS_NODE;
  const app = await _electron.launch({ executablePath: path.resolve('release/win-unpacked/Quranly.exe'), args:[`--user-data-dir=${profile}`], env });
  try {
    assert.equal(await app.evaluate(({app}) => app.isPackaged),true);
    assert.equal(await app.evaluate(({app}) => app.getVersion()),'0.1.0-alpha');
    assert.equal(await app.evaluate(({app}) => app.getPath('userData')),profile);
    const page = await app.firstWindow();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.getByRole('button',{name:'Skip setup'}).click();
    await page.locator('.desktop-sidebar').waitFor();
    await page.locator('.home-page').waitFor();
    assert.equal(await page.evaluate(() => typeof window.require),'undefined');
    await page.screenshot({path:'test-results/packaged-windows.png'});
    await page.getByRole('button',{name:'Open full player',exact:true}).click();
    await page.locator('.full-screen-player[data-player-background="darkveil"] canvas').waitFor({state:'visible'});
    assert.equal(await page.getByRole('heading',{name:'Something went wrong'}).count(),0);
    await page.screenshot({path:'test-results/packaged-original-player.png'});
    await page.locator('.fs-seek-slider').waitFor({state:'visible'});
    assert.match(await page.locator('.fs-main-controls').evaluate(el => getComputedStyle(el).backdropFilter), /blur\(24px\)/);
    await page.getByRole('button',{name:'Close player',exact:true}).click();
    await page.getByRole('link',{name:'Ask AI',exact:true}).click();
    await page.getByRole('button',{name:'Source search',exact:true}).waitFor({state:'visible'});
    await page.getByLabel('Your question',{exact:true}).waitFor({state:'visible'});
    await page.screenshot({path:'test-results/packaged-ai-updated.png'});
    console.log('Packaged Quranly 0.1.0 Alpha opened successfully; isolated profile and renderer verified.');
  } finally { await app.close(); await fs.rm(profile,{recursive:true,force:true}); }
})().catch(error => { console.error(error); process.exitCode = 1; });
