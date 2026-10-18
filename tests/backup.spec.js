import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const uid='70000000-0000-4000-8000-000000000091';
const user={id:uid,email:'backup-fixture@example.test',aud:'authenticated',role:'authenticated',user_metadata:{display_name:'Backup test'}};
const seed=async page=>{
 await page.evaluate(({uid,user})=>{
  const encode=o=>btoa(JSON.stringify(o)).replaceAll('=','').replaceAll('+','-').replaceAll('/','_');
  const expires_at=Math.floor(Date.now()/1000)+3600;
  localStorage.setItem('quranly_onboarded','true');localStorage.setItem('quranly_theme','dark');
  localStorage.setItem('sb-rplxdjpbsbhorpucacic-auth-token',JSON.stringify({user,expires_at,expires_in:3600,token_type:'bearer',refresh_token:'fixture',access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,exp:expires_at,role:'authenticated'})}.fixture`}));
 },{uid,user});await page.reload();
};
test('automatic backup survives offline restart and restores collections, stats and playback on a fresh device',async()=>{
 const profiles=[await fs.mkdtemp(path.join(os.tmpdir(),'quranly-backup-one-')),await fs.mkdtemp(path.join(os.tmpdir(),'quranly-backup-two-'))];
 const today=new Date().toLocaleDateString('en-CA');
 let remote={favouriteSurahIds:[3],favouriteReciterIds:[1],customPlaylists:[{id:'cloud',name:'Cloud collection',surahIds:[3,36]}],listeningHistory:{[today]:600},reciterAnalytics:{1:{totalPlays:5,totalSeconds:600}},dailyGoalMinutes:10,readingPage:1,playbackResume:{surahId:3,reciterId:1,position:12,volume:.6,speed:1,queueIds:[3,36],queueIndex:0}};
 let offline=false,app;
 const launch=async(index,seedAuth)=>{
  const env={...process.env,QURANLY_TEST_PROFILE:profiles[index]};delete env.ELECTRON_RUN_AS_NODE;
  const executablePath=process.env.QURANLY_TEST_EXE;
  app=await electron.launch({executablePath,args:executablePath?[`--user-data-dir=${profiles[index]}`]:['.'],env});const page=await app.firstWindow();
  await page.context().addInitScript(()=>{const Original=window.Audio;window.__backupAudioTrace=[];window.__backupAudios=[];window.Audio=function(...args){const a=new Original(...args);window.__backupAudios.push(a);for(const e of ['loadedmetadata','timeupdate','seeking'])a.addEventListener(e,()=>window.__backupAudioTrace.push([e,a.src.slice(-30),a.currentTime]));return a;};});
  const pcm=Buffer.alloc(44+16000*120);pcm.write('RIFF',0);pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(8000,24);pcm.writeUInt32LE(16000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(pcm.length-44,40);
  await page.context().route('**/*.mp3',r=>{
   const range=r.request().headers().range;
   const match=range?.match(/bytes=(\d+)-(\d*)/);
   if(match){const start=Number(match[1]),end=Math.min(pcm.length-1,match[2]?Number(match[2]):pcm.length-1);return r.fulfill({status:206,contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${pcm.length}`},body:pcm.subarray(start,end+1)});}
   return r.fulfill({contentType:'audio/wav',headers:{'Accept-Ranges':'bytes'},body:pcm});
  });
  await page.context().route('https://rplxdjpbsbhorpucacic.supabase.co/**',async route=>{
   const url=new URL(route.request().url());
   if(offline&&url.pathname.includes('/rest/'))return route.abort('internetdisconnected');
   if(url.pathname.includes('/auth/'))return route.fulfill({json:user});
   if(url.pathname.endsWith('/quranly_progress'))return route.fulfill({json:{data:remote}});
   if(url.pathname.endsWith('/rpc/save_quranly_progress')){remote={...remote,...route.request().postDataJSON().patch};return route.fulfill({json:null});}
   return route.fulfill({json:[]});
  });
  if(seedAuth)await seed(page);else await page.reload();
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('quranly_data_owner'))).toBe(uid);
  return page;
 };
 try {
  let page=await launch(0,true);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('quranly_fav_surahs')||'[]'))).toEqual([3]);
  await page.getByRole('button',{name:'Open full player',exact:true}).click();
  await expect(page.getByRole('slider',{name:'Seek recitation',exact:true})).toHaveValue('12');
  expect(remote.reciterAnalytics[1].totalPlays).toBe(5);
  await page.getByRole('button',{name:'Play recitation',exact:true}).click();
  await expect.poll(()=>remote.reciterAnalytics[1].totalPlays).toBe(6);
  await page.getByRole('button',{name:'Pause recitation',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__backupAudios.every(a=>a.paused))).toBe(true);
  const seek=page.getByRole('slider',{name:'Seek recitation',exact:true});
  await seek.focus();await page.keyboard.press('Home');await page.keyboard.press('PageUp');await page.keyboard.press('PageUp');
  const desiredPosition=Math.floor(Number(await seek.inputValue()));expect(desiredPosition).toBeGreaterThan(0);
  await expect.poll(()=>remote.playbackResume.position).toBe(desiredPosition);
  offline=true;
  await page.getByRole('button',{name:'Save surah',exact:true}).click();
  await expect.poll(()=>page.evaluate(uid=>Object.keys(JSON.parse(localStorage.getItem(`quranly_backup_pending_${uid}`)||'{}')),uid)).toContain('favouriteSurahIds');
  await app.close();app=null;
  offline=false;page=await launch(0,false);
  await expect.poll(()=>remote.favouriteSurahIds).toEqual([]);
  await expect.poll(()=>page.evaluate(uid=>JSON.parse(localStorage.getItem(`quranly_backup_pending_${uid}`)||'{}'),uid)).toEqual({});
  await app.close();app=null;
  page=await launch(1,true);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('quranly_custom_playlists')||'[]')[0]?.name)).toBe('Cloud collection');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('quranly_site_reciter_analytics_v2')||'{}')[1]?.totalPlays)).toBe(6);
  await page.getByRole('button',{name:'Open full player',exact:true}).click();
  await expect(page.getByRole('slider',{name:'Seek recitation',exact:true})).toHaveValue(String(desiredPosition));
  await expect(page.getByRole('button',{name:'Play recitation',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close player',exact:true}).click();
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  await expect(page.locator('[data-sync-state="saved"]')).toBeVisible();
  await page.screenshot({path:'test-results/automatic-cloud-backup.png'});
 } finally {if(app)await app.close();for(const profile of profiles)await fs.rm(profile,{recursive:true,force:true});}
});
