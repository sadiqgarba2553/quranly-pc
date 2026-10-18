import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const fixture=spawnSync(require('ffmpeg-static'),['-v','error','-f','lavfi','-i','sine=frequency=440:duration=8','-c:a','libmp3lame','-b:a','192k','-f','mp3','pipe:1'],{windowsHide:true,maxBuffer:1000000}).stdout.toString('base64');
const reciter={id:99999,name:'Collection test reciter',letter:'C',moshaf:[{id:99999,name:'Test recording',server:'https://server1.mp3quran.net/collection-test/',surah_list:'1,2,3',surah_total:3}]};
test('collection UI checks storage, pauses, survives restart, resumes and plays converted audio offline',async()=>{
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'quranly-collection-ui-'));let app;
  const start=()=>electron.launch(process.env.QURANLY_PACKAGED?{executablePath:path.resolve('release/win-unpacked/Quranly.exe'),args:[`--user-data-dir=${profile}`]}:{args:['.'],env:{...process.env,QURANLY_TEST_PROFILE:profile}});
  async function mockNative(){await app.evaluate((_electron,base64)=>{const bytes=Buffer.from(base64,'base64');global.collectionResumeHeaders=[];global.fetch=async(url,options={})=>{
    if(!String(url).startsWith('https://server1.mp3quran.net/collection-test/'))throw Error('Unexpected native network access');
    const offset=options.headers?.Range?Number(options.headers.Range.match(/\d+/)[0]):0;if(offset)global.collectionResumeHeaders.push(options.headers);
    const headers={'content-type':'audio/mpeg','content-length':String(bytes.length-offset),etag:'"fixture-v1"'};if(offset)headers['content-range']=`bytes ${offset}-${bytes.length-1}/${bytes.length}`;
    if(options.method==='HEAD')return new Response(null,{headers});
    let timer;const body=new ReadableStream({start(controller){let at=offset;const send=()=>{if(options.signal.aborted)return;const next=Math.min(at+8192,bytes.length);controller.enqueue(bytes.subarray(at,next));at=next;if(at===bytes.length)controller.close();else timer=setTimeout(send,90);};send();options.signal.addEventListener('abort',()=>{clearTimeout(timer);controller.error(options.signal.reason);},{once:true});}});
    return new Response(body,{status:offset?206:200,headers});
  };},fixture);}
  try{
    app=await start();let page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await mockNative();await page.context().route('**/api/v3/reciters?**',route=>route.fulfill({json:{reciters:[reciter]}}));
    await page.evaluate(()=>{localStorage.setItem('quranly_onboarded','true');location.hash='#/downloads';});await page.reload();
    await expect(page.locator('#download-reciter option').filter({hasText:reciter.name})).toHaveCount(1);
    await page.locator('#download-reciter').selectOption(String(reciter.id));await page.getByLabel('Collection audio quality').selectOption('64');
    await page.getByRole('button',{name:'Check storage',exact:true}).click();await expect(page.getByRole('button',{name:'Download 3 surahs',exact:true})).toBeEnabled();
    await page.screenshot({path:'test-results/collection-setup.png',fullPage:true});await page.getByRole('button',{name:'Download 3 surahs',exact:true}).click();
    await expect.poll(async()=>{const jobs=await page.evaluate(()=>window.quranlyDesktop.collections.list());return jobs[0]?.receivedBytes||0;}).toBeGreaterThan(0);
    await page.getByRole('button',{name:'Pause collection',exact:true}).click();await expect(page.getByRole('button',{name:'Resume collection',exact:true})).toBeVisible();await app.close();app=null;
    app=await start();page=await app.firstWindow();await mockNative();await page.evaluate(()=>{location.hash='#/downloads';});await expect(page.getByRole('button',{name:'Resume collection',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Resume collection',exact:true}).click();await expect(page.getByText('Collection ready offline.',{exact:true})).toBeVisible({timeout:40000});
    expect(await app.evaluate(()=>global.collectionResumeHeaders.some(h=>h.Range&&h['If-Range']==='"fixture-v1"'))).toBe(true);
    expect((await page.evaluate(()=>window.quranlyDesktop.collections.list()))[0].entries.every(e=>e.status==='complete')).toBe(true);
    await app.close();app=null;app=await start();page=await app.firstWindow();await page.context().route('https://**',route=>route.abort());
    await page.evaluate(()=>{location.hash='#/downloads';});await expect(page.getByText('Collection ready offline.',{exact:true})).toBeVisible();
    const jobs=await page.evaluate(()=>window.quranlyDesktop.collections.list()),uri=`quranly-audio://cache/${jobs[0].id}/1`;
    const range=await page.evaluate(async uri=>{const response=await fetch(uri,{headers:{Range:'bytes=10-99'}});return{status:response.status,length:(await response.arrayBuffer()).byteLength,contentRange:response.headers.get('content-range')};},uri);expect(range.status).toBe(206);expect(range.length).toBe(90);
    await page.getByRole('button',{name:/^Play /}).first().click();await expect(page.getByRole('button',{name:'Pause recitation',exact:true})).toBeVisible();
    await expect.poll(async()=>Number(await page.getByRole('slider',{name:'Seek recitation',exact:true}).getAttribute('max'))).toBeGreaterThan(1);
    await page.screenshot({path:'test-results/collection-offline-player.png',fullPage:true});expect(await page.evaluate(()=>typeof window.require)).toBe('undefined');expect(errors).toEqual([]);
  }finally{if(app)await app.close();await fs.rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
});
