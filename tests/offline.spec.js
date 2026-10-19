import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('missing saved audio is detected and can be downloaded again without losing progress',async()=>{
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'quranly-offline-repair-'));
  const env={...process.env,QURANLY_TEST_PROFILE:profile};delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:['.'],env});
  try{
    const page=await app.firstWindow();await page.route('https://audio.example/001.mp3',route=>route.fulfill({status:200,contentType:'audio/mpeg',headers:{'access-control-allow-origin':'*','content-length':'14'},body:'complete audio'}));
    await page.evaluate(()=>{
      localStorage.setItem('quranly_onboarded','true');localStorage.setItem('quranly_mushaf_page','42');
      localStorage.setItem('quranly_downloaded_tracks',JSON.stringify([{id:'1_2',surahId:1,reciterId:2,surahName:'Al-Fatihah',reciterName:'Test reciter',audioUrl:'https://audio.example/001.mp3',sizeBytes:14}]));
    });
    await page.reload();await page.evaluate(()=>{location.hash='#/downloads';});
    await page.getByRole('button',{name:'Check offline files',exact:true}).click();await expect(page.getByRole('button',{name:'Download again',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Download again',exact:true}).click();await expect(page.getByRole('button',{name:'Download again',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Check offline files',exact:true}).click();await expect(page.getByText(/saved track is missing/)).toHaveCount(0);
    const saved=await page.evaluate(async()=>{const track=JSON.parse(localStorage.getItem('quranly_downloaded_tracks'))[0],cache=await caches.open('quranly-audio-v1');return{audio:await(await cache.match(track.cacheKey)).text(),page:localStorage.getItem('quranly_mushaf_page')};});
    expect(saved.audio).toBe('complete audio');expect(saved.page).toBe('42');
  }finally{await app.close();await fs.rm(profile,{recursive:true,force:true,maxRetries:5});}
});
