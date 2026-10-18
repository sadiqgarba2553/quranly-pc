import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('desktop reader keeps Arabic readable and its toolbar usable in both themes and smaller windows',async()=>{
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'quranly-reader-ui-'));
 const env={...process.env,QURANLY_TEST_PROFILE:profile};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({args:['.'],env});
 try{
  const page=await app.firstWindow();
  const arabic=['بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ','الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ','الرَّحْمَٰنِ الرَّحِيمِ','مَالِكِ يَوْمِ الدِّينِ','إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ','اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ','صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ'];
  await page.context().route('https://api.alquran.cloud/v1/page/**',r=>r.fulfill({json:{code:200,data:{number:1,ayahs:arabic.map((text,i)=>({number:i+1,numberInSurah:i+1,text,surah:{number:1,name:'سُورَةُ ٱلْفَاتِحَةِ',englishName:'Al-Fatihah',numberOfAyahs:7,revelationType:'Meccan'},juz:1,page:1,hizbQuarter:1}))}}}));
  await page.context().route('https://api.quran.com/api/v4/verses/by_page/**',r=>r.fulfill({json:{verses:[]}}));
  await page.getByRole('button',{name:'Skip setup'}).click();
  await page.evaluate(()=>localStorage.setItem('quranly_theme','dark'));await page.reload();
  await page.getByRole('link',{name:'Read Quran',exact:true}).click();
  await expect(page.getByRole('button',{name:'Verse 1: open actions'})).toBeVisible();
  await page.getByRole('button',{name:'Increase Arabic text size'}).click();
  await expect(page.locator('.font-size-value')).toHaveText('32');
  await page.getByRole('button',{name:'Reset Arabic text size'}).click();
  await expect(page.locator('.font-size-value')).toHaveText('30');
  const verse=page.getByRole('button',{name:'Verse 1: open actions'});await verse.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.ayah-modal-card')).toBeVisible();
  await page.locator('.ayah-modal-overlay').click({position:{x:5,y:5}});
  await page.screenshot({path:'test-results/quran-reader-dark.png'});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(900,740));
  expect(await page.locator('.mushaf-header').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:'test-results/quran-reader-compact.png'});
  await page.getByRole('link',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Light',exact:true}).click();
  await page.getByRole('link',{name:'Read Quran',exact:true}).click();
  await expect(page.locator('.quran-text').first()).toBeVisible();
  await expect.poll(()=>page.locator('.mushaf-paper-card').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(28, 28, 30)');
  await page.screenshot({path:'test-results/quran-reader-light.png'});
 }finally{await app.close();await fs.rm(profile,{recursive:true,force:true});}
});
