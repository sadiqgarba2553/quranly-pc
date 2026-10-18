import { test, expect, _electron as electron } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('Windows app opens, navigates, saves preferences and uses Supabase', async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(),'quranly-test-'));
  const env = {...process.env, QURANLY_TEST_PROFILE: profile}; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({args:['.'],env});
  try {
    const page = await app.firstWindow();
    const errors=[]; page.on('pageerror',error => errors.push(error.message));
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Welcome to Quranly',{exact:true})).toBeVisible();
    await page.evaluate(() => localStorage.setItem('quranly_onboarded','true'));
    await page.reload();
    await expect(page.getByRole('complementary')).toBeVisible();
    await expect(page.locator('.home-page')).toBeVisible();
    expect(await page.evaluate(() => window.quranlyDesktop.platform)).toBe('windows');
    expect(await page.evaluate(() => typeof window.require)).toBe('undefined');
    await page.screenshot({path:'test-results/windows-listen.png'});
    for (const [route,selector] of [['reciters','.reciters-page'],['search','.search-page'],['playlists','.playlists-page'],['downloads','.downloads-page'],['settings','.settings-page'],['insights','.insights-page'],['azkar','.azkar-page'],['hadith','.hadith-page'],['memorize','.memorize-page'],['mushaf','.mushaf-page'],['radio','.radio-page'],['ask-ai','.ask-ai-page']]) {
      await page.evaluate(route => { location.hash = `#/${route}`; }, route);
      // Pages can contain empty states but must mount without a fatal error.
      await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator('.desktop-sidebar')).toBeVisible();
      await expect(page.getByRole('heading',{name:'Something went wrong'})).toHaveCount(0);
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => { location.hash = '#/settings'; });
    await expect(page.getByRole('button',{name:'Export progress backup'})).toBeVisible();
    await expect(page.getByText('Cloud provider: supabase. Sign in to sync your progress.')).toBeVisible();
    await page.screenshot({path:'test-results/windows-settings.png'});
    await page.keyboard.press('Control+k');
    await expect(page).toHaveURL(/#\/search/);
    const search = page.locator('main input').first(); await search.fill('Fatiha');
    await expect(page.locator('main').getByText('Al-Fatiha',{exact:false}).first()).toBeVisible();
    await page.evaluate(() => localStorage.setItem('quranly_daily_goal','20'));
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem('quranly_daily_goal'))).toBe('20');
    expect(errors).toEqual([]);
  } finally { await app.close(); await fs.rm(profile,{recursive:true,force:true}); }
});

test('original player backgrounds, colors and controls are restored without paywalls', async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(),'quranly-original-ui-'));
  const env = {...process.env, QURANLY_TEST_PROFILE: profile}; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({args:['.'],env});
  try {
    const page = await app.firstWindow();
    const errors=[]; page.on('pageerror',error => errors.push(error.message));
    const pcm = Buffer.alloc(44 + 16000 * 60);
    pcm.write('RIFF',0); pcm.writeUInt32LE(pcm.length-8,4); pcm.write('WAVEfmt ',8);
    pcm.writeUInt32LE(16,16); pcm.writeUInt16LE(1,20); pcm.writeUInt16LE(1,22); pcm.writeUInt32LE(8000,24); pcm.writeUInt32LE(16000,28); pcm.writeUInt16LE(2,32); pcm.writeUInt16LE(16,34); pcm.write('data',36); pcm.writeUInt32LE(pcm.length-44,40);
    await page.context().route('**/*.mp3', route => route.fulfill({status:200,contentType:'audio/wav',body:pcm}));
    await page.evaluate(() => { localStorage.setItem('quranly_onboarded','true'); localStorage.setItem('quranly_pro_active','false'); localStorage.setItem('quranly_app_theme','indigo'); localStorage.setItem('quranly_player_nature_theme','acid'); });
    await page.reload();
    expect(await page.locator('.app-container').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
    await page.screenshot({path:'test-results/original-home-restored.png'});
    await page.getByRole('button',{name:'Open full player',exact:true}).click();
    const player=page.getByRole('region',{name:'Now playing',exact:true});
    await expect(player).toHaveAttribute('data-player-background','acid');
    await expect(player.locator('canvas')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button',{name:'Pause recitation',exact:true})).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button',{name:'Play recitation',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Volume Controls',exact:true}).click();
    const volume=page.getByRole('slider',{name:'Recitation volume',exact:true});
    await volume.focus(); await page.keyboard.press('Home'); await expect(volume).toHaveAttribute('aria-valuenow','0');
    await page.keyboard.press('End'); await expect(volume).toHaveAttribute('aria-valuenow','100');
    await page.keyboard.press('Escape');
    await expect(player).toBeVisible();
    await page.getByRole('button',{name:'Download',exact:true}).click();
    await expect(page.getByRole('button',{name:'Downloaded',exact:true})).toBeVisible();
    await expect(page.locator('.fs-download-notice')).toContainText('Saved to Downloads');
    await page.getByRole('button',{name:'Next surah',exact:true}).click();
    await expect(page.locator('.fs-text h2')).not.toBeEmpty();
    const seek=page.getByRole('slider',{name:'Seek recitation',exact:true});
    await expect(seek).toBeEnabled();
    await seek.focus();await page.keyboard.press('Home');await expect(seek).toHaveValue('0');
    await page.keyboard.press('ArrowRight');
    expect(Number(await seek.inputValue())).toBeGreaterThan(0);
    await page.screenshot({path:'test-results/major-player-timeline.png'});
    await page.getByRole('button',{name:'Save surah',exact:true}).click();
    await expect(page.getByRole('button',{name:'Save surah',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Surah queue',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Surah queue'})).toBeVisible();
    expect(await page.locator('.queue-item').count()).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect(player).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({path:'test-results/original-player-acid.png'});
    await page.getByRole('button',{name:'Close player',exact:true}).click();
    await page.evaluate(() => { location.hash='#/settings'; });
    await expect(page.getByText('Every feature is free',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Acid Squares',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.screenshot({path:'test-results/original-settings-restored.png'});
    for(const [name,id] of [['Dark Veil','darkveil'],['Liquid Ether','liquidether'],['Prism','prism'],['Off','none']]) {
      await page.getByRole('button',{name,exact:true}).click();
      await page.getByRole('button',{name:'Open full player',exact:true}).click();
      await expect(player).toHaveAttribute('data-player-background',id);
      if(id==='none') await expect(player.locator('canvas')).toHaveCount(0);
      else { await expect(player.locator('canvas')).toBeVisible(); await page.waitForTimeout(500); }
      await page.screenshot({path:`test-results/original-player-${id}.png`});
      await page.getByRole('button',{name:'Close player',exact:true}).click();
    }
    await page.getByRole('button',{name:'Acid Squares',exact:true}).click();
    await page.getByRole('button',{name:'Emerald',exact:true}).click();
    await page.reload();
    await expect(page.getByRole('button',{name:'Acid Squares',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(page.getByRole('button',{name:'Emerald',exact:true})).toHaveAttribute('aria-pressed','true');
    expect(await page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--accent-color').trim())).toBe('#34d399');
    await page.getByRole('button',{name:'Light',exact:true}).click();
    await page.getByRole('button',{name:'Open full player',exact:true}).click();
    await expect(player).toHaveAttribute('data-player-background','acid');
    expect(await player.evaluate(el=>getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
    await page.getByRole('button',{name:'Close player',exact:true}).click();
    await expect(page.getByText(/Upgrade to PRO|PRO Feature|Redeem Code|Subscription Tier/)).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally { await app.close(); await fs.rm(profile,{recursive:true,force:true}); }
});

test('live Supabase login isolates account progress and updates profiles', async () => {
  test.skip(!process.env.QURANLY_LIVE_AUTH_FIXTURES,'Live test requires temporary verification accounts');
  const {fixtures}=JSON.parse(await fs.readFile(process.env.QURANLY_LIVE_AUTH_FIXTURES,'utf8'));
  const profile = await fs.mkdtemp(path.join(os.tmpdir(),'quranly-auth-ui-'));
  const env={...process.env,QURANLY_TEST_PROFILE:profile}; delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:['.'],env});
  try {
    const page=await app.firstWindow();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.evaluate(()=>{localStorage.setItem('quranly_onboarded','true');localStorage.setItem('quranly_fav_surahs','[99]');});
    await page.reload();
    const login=async fixture=>{
      await page.evaluate(()=>{location.hash='#/settings';});
      await page.getByRole('button',{name:/Sign In \/ Register Account/}).click();
      await page.getByLabel('Email address',{exact:true}).fill(fixture.email);
      await page.getByLabel('Password',{exact:true}).fill(fixture.password);
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect.poll(()=>page.evaluate(()=>localStorage.getItem('quranly_data_owner'))).toBe(fixture.id);
    };
    await login(fixtures[0]);
    await expect.poll(()=>page.evaluate(()=>localStorage.getItem('quranly_daily_goal'))).toBe('17');
    await page.getByRole('button',{name:/Alpha Test A/}).click();
    await expect(page.locator('.account-summary')).toContainText('17 min');
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await login(fixtures[1]);
    await expect.poll(()=>page.evaluate(()=>localStorage.getItem('quranly_daily_goal'))).toBe('9');
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('quranly_fav_surahs')))).toEqual([5]);
    await page.locator('.settings-section').first().getByRole('button').click();
    await page.getByLabel('Display name',{exact:true}).fill('Alpha Test B UI');
    await page.getByRole('button',{name:'Save name',exact:true}).click();
    await expect(page.getByText('Display name updated.',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>localStorage.getItem('quranly_data_owner'))).toBe('guest');
    expect(errors).toEqual([]);
  } finally {await app.close();await fs.rm(profile,{recursive:true,force:true});}
});

test('downloaded recitations play from cache with external network requests blocked', async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(),'quranly-offline-'));
  const env = {...process.env, QURANLY_TEST_PROFILE: profile}; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({args:['.'],env});
  try {
    const page = await app.firstWindow();
    await page.context().addInitScript(() => {
      const OriginalAudio = window.Audio;
      window.__audioElements = [];
      window.Audio = function (...args) { const audio = new OriginalAudio(...args); window.__audioElements.push(audio); return audio; };
    });
    await page.evaluate(async () => {
      localStorage.setItem('quranly_onboarded','true');
      // A silent WAV fixture verifies playback, rather than just a playing icon.
      const size = 8000 * 2 * 8, buffer = new ArrayBuffer(44 + size), view = new DataView(buffer);
      const ascii = (offset,text) => [...text].forEach((c,i) => view.setUint8(offset+i,c.charCodeAt(0)));
      ascii(0,'RIFF'); view.setUint32(4,36+size,true); ascii(8,'WAVE'); ascii(12,'fmt ');
      view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
      view.setUint32(24,8000,true); view.setUint32(28,16000,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
      ascii(36,'data'); view.setUint32(40,size,true);
      const url = 'https://example.com/offline-fixture/001.mp3';
      const cache = await caches.open('quranly-audio-v1'); await cache.put(url,new Response(buffer,{headers:{'Content-Type':'audio/wav'}}));
      localStorage.setItem('quranly_downloaded_tracks',JSON.stringify([{id:'1_99999',surahId:1,surahName:'Offline test',surahArabic:'الفاتحة',reciterId:99999,reciterName:'Cached reciter',audioUrl:url,sizeBytes:buffer.byteLength}]));
    });
    await page.context().route(/^https?:\/\//, route => route.abort('internetdisconnected'));
    await page.reload();
    await page.evaluate(() => { location.hash = '#/downloads'; });
    await page.getByRole('button',{name:'Play Offline test',exact:true}).click();
    await expect.poll(() => page.evaluate(() => window.__audioElements.some(a => a.src.startsWith('blob:') && !a.paused && a.currentTime > 0))).toBe(true);
    await page.waitForTimeout(2200);
    await page.getByRole('button',{name:'Pause recitation',exact:true}).click();
    await expect.poll(() => page.evaluate(() => window.__audioElements.filter(a => a.src.startsWith('blob:')).every(a => a.paused))).toBe(true);
    await expect.poll(() => page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('quranly_listening_history') || '{}')).reduce((a,b)=>a+b,0))).toBeGreaterThan(0);
    const counted=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('quranly_listening_history') || '{}')).reduce((a,b)=>a+b,0));
    expect(counted).toBeGreaterThan(0);
    expect(counted).toBeLessThan(6);
    await page.waitForTimeout(700);
    expect(await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('quranly_listening_history') || '{}')).reduce((a,b)=>a+b,0))).toBe(counted);
    expect(await page.evaluate(() => fetch('https://example.com/connectivity-check').then(() => false, () => true))).toBe(true);
  } finally { await app.close(); await fs.rm(profile,{recursive:true,force:true}); }
});
