import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
async function launch() {
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'quranly-features-'));
  const env={...process.env,QURANLY_TEST_PROFILE:profile};delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({args:['.'],env});const page=await app.firstWindow();
  await page.evaluate(()=>localStorage.setItem('quranly_onboarded','true'));await page.reload();
  return {app,page,close:async()=>{await app.close();await fs.rm(profile,{recursive:true,force:true});}};
}
const navigate=(page,route)=>page.evaluate(route=>{location.hash=`#/${route}`;},route);

test('an in-progress download can be cancelled without saving a partial track',async()=>{
  const {page,close}=await launch();
  const pending=[];
  try {
    await page.context().route('**/*.mp3',route=>{pending.push(route);});
    await page.reload();
    await page.getByRole('button',{name:'Open full player',exact:true}).click();
    await page.getByRole('button',{name:'Download',exact:true}).click();
    await page.getByRole('button',{name:'Cancel download',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Download cancelled.'})).toBeVisible();
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('quranly_downloaded_tracks') || '[]').length)).toBe(0);
    for(const route of pending) await route.abort().catch(()=>{});
  } finally {await close();}
});

test('AI source search, model connection, quota recovery and desktop composer work',async()=>{
  const {app,page,close}=await launch();
  try {
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.context().route('https://api.quran.com/api/v4/search**',r=>r.fulfill({json:{search:{results:[{verse_key:'2:153',text:'آية',translations:[{text:'Seek help through patience and prayer.'}]}]}}}));
    await page.context().route('https://api.quran.com/api/v4/tafsirs/**',r=>r.fulfill({json:{tafsir:{text:'Seek help with patience and prayer.'}}}));
    await page.context().route('https://generativelanguage.googleapis.com/v1beta/models?**',r=>r.fulfill({json:{models:[{name:'models/gemini-test-flash',displayName:'Test Flash',supportedGenerationMethods:['generateContent']}]}}));
    let attempts=0;
    await page.context().route('https://generativelanguage.googleapis.com/v1beta/models/*:generateContent',r=>{
      expect(r.request().url()).not.toContain('key=');
      attempts++;
      return attempts===1 ? r.fulfill({status:429,json:{error:{message:'Quota'}}}) : r.fulfill({json:{candidates:[{content:{parts:[{text:'Patience and prayer are mentioned in [Verse 2:153].'}]}}]}});
    });
    await navigate(page,'ask-ai');
    await page.getByLabel('Your question',{exact:true}).fill('patience');
    await page.getByRole('button',{name:'Send question'}).click();
    await expect(page.getByRole('link',{name:/Quran 2:153/})).toBeVisible();
    await expect(page.locator('.message-text').last()).toContainText('matching your search');
    await page.getByRole('button',{name:'AI answer',exact:true}).click();
    await page.getByLabel('Gemini API key',{exact:true}).fill('test-personal-key');
    await page.getByRole('button',{name:'Save Key',exact:true}).click();
    await expect(page.locator('.api-key-card')).toHaveCount(0);
    await page.getByLabel('Your question',{exact:true}).fill('Explain patience');
    await page.getByRole('button',{name:'Send question'}).click();
    await expect(page.getByText(/Gemini usage limit reached/)).toBeVisible();
    await page.getByRole('button',{name:'Try again',exact:true}).click();
    await expect(page.locator('.message-text').last()).toContainText('Patience and prayer are mentioned');
    await page.screenshot({path:'test-results/major-ai-desktop.png'});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(900,640));
    const composer=await page.locator('.chat-input-wrapper').boundingBox();const mini=await page.locator('.mini-player').boundingBox();
    expect(composer.y+composer.height).toBeLessThan(mini.y);
    expect(await page.locator('.ask-ai-page').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.screenshot({path:'test-results/major-ai-small-window.png'});
    await page.reload();
    await expect(page.locator('.message-text').last()).toContainText('Patience and prayer are mentioned');
    expect(errors).toEqual([]);
  } finally {await close();}
});

test('playlists, manual memorization and goals persist with usable empty states',async()=>{
  const {page,close}=await launch();
  try {
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.context().route('https://api.alquran.cloud/v1/surah/1',r=>r.fulfill({json:{code:200,data:{ayahs:[{numberInSurah:1,text:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'},{numberInSurah:2,text:'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'}]}}}));
    await navigate(page,'playlists');
    await page.getByRole('button',{name:'Create New Playlist'}).click();
    await page.getByLabel('New playlist name').fill('Morning practice');
    await page.getByRole('button',{name:'Create Playlist',exact:true}).click();
    await page.getByRole('heading',{name:'Morning practice',exact:true}).click();
    await expect(page.getByText('Your playlist is empty')).toBeVisible();
    await expect(page.getByRole('button',{name:'Play playlist'})).toBeDisabled();
    await page.getByRole('button',{name:'Rename playlist'}).click();
    await page.getByLabel('Playlist name',{exact:true}).fill('Daily practice');
    await page.getByRole('button',{name:'Save playlist name'}).click();
    await page.getByRole('button',{name:'Add surahs',exact:true}).click();
    await page.getByLabel('Search surahs to add').fill('Fati');
    await page.getByRole('button',{name:/^Add Al-Fati/}).click();
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('quranly_custom_playlists'))[0].surahIds.length)).toBe(1);
    await page.evaluate(()=>{location.hash='#/memorize';});
    await expect(page.getByRole('button',{name:'Mark verse reviewed'})).toBeEnabled();
    await page.getByRole('button',{name:'Mark verse reviewed'}).click();
    await expect(page.getByText('1 verses reviewed',{exact:true})).toBeVisible();
    await page.reload();
    await expect(page.getByText('1 verses reviewed',{exact:true})).toBeVisible();
    await page.screenshot({path:'test-results/major-memorization.png'});
    await navigate(page,'insights');
    await page.getByRole('button',{name:'Edit daily listening goal'}).click();
    await page.getByLabel('Daily listening goal in minutes').fill('25');
    await page.getByRole('button',{name:'Save listening goal'}).click();
    await expect(page.getByRole('button',{name:'Edit daily listening goal'})).toContainText('25-min');
    expect(await page.locator('.day-circle.missed').count()).toBe(0);
    await page.screenshot({path:'test-results/major-progress.png'});
    expect(errors).toEqual([]);
  } finally {await close();}
});

test('reading saves the right page and reopens cached text without internet',async()=>{
  const {page,close}=await launch();
  try {
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.context().addInitScript(()=>{
      const OriginalAudio=window.Audio;
      window.__readerAudios=[];window.__readerPlayCount=0;
      window.Audio=function(...args){const audio=new OriginalAudio(...args);audio.play=()=>{window.__readerPlayCount++;return Promise.resolve();};window.__readerAudios.push(audio);return audio;};
    });
    await page.context().route('https://api.alquran.cloud/v1/page/**',route=>{
      const [,num,edition]=new URL(route.request().url()).pathname.match(/page\/(\d+)\/(.+)/);
      return route.fulfill({json:{code:200,data:{number:Number(num),ayahs:[{number:Number(num),numberInSurah:Number(num),text:edition==='en.sahih' ? `Saved page ${num}` : `نص الصفحة ${num}`,surah:{number:1,name:'الفاتحة',englishName:'Al-Fatihah',englishNameTranslation:'The Opening'},juz:1,page:Number(num),hizbQuarter:1}],surahs:{1:{number:1,name:'الفاتحة',englishName:'Al-Fatihah'}}}}});
    });
    await page.context().route('https://api.quran.com/api/v4/verses/by_page/**',r=>r.fulfill({json:{verses:[]}}));
    await page.reload();
    await navigate(page,'mushaf');
    await expect(page.locator('.quran-text').first()).toContainText('1');
    await page.getByRole('button',{name:'Next Page',exact:true}).click();
    await expect(page.locator('.quran-text').first()).toContainText('2');
    await page.locator('.quran-text').first().click();
    await page.getByRole('button',{name:'3x',exact:true}).click();
    await page.getByRole('button',{name:'Play Verse (3x)',exact:true}).click();
    for(let i=0;i<3;i++) await page.evaluate(()=>window.__readerAudios.find(a=>a.src.includes('/ar.alafasy/')).dispatchEvent(new Event('ended')));
    await expect(page.getByRole('button',{name:'Play Verse (3x)',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>window.__readerPlayCount)).toBe(3);
    await expect.poll(()=>page.evaluate(()=>localStorage.getItem('quranly_mushaf_page'))).toBe('2');
    await page.context().unroute('https://api.alquran.cloud/v1/page/**');
    await page.context().route(/^https?:\/\//,r=>r.abort('internetdisconnected'));
    await page.reload();
    await expect(page.locator('.quran-text').first()).toContainText('2');
    await page.screenshot({path:'test-results/major-reading-offline.png'});
    expect(errors).toEqual([]);
  } finally {await close();}
});

test('community participation requires an explicit join and can be removed',async()=>{
  const {page,close}=await launch();
  try {
    const uid='70000000-0000-4000-8000-000000000001';
    const user={id:uid,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated',user_metadata:{display_name:'Private name'},created_at:new Date().toISOString()};
    let member=null,joined=0;
    await page.context().route('https://rplxdjpbsbhorpucacic.supabase.co/**',async route=>{
      const url=new URL(route.request().url()),method=route.request().method();
      if(url.pathname.includes('/auth/')) return route.fulfill({json:user});
      if(url.pathname.endsWith('/quranly_progress')) return route.fulfill({json:[]});
      if(url.pathname.includes('/rpc/')) return route.fulfill({json:null});
      if(url.pathname.endsWith('/quranly_community')) {
        if(method==='POST') {joined++;const body=route.request().postDataJSON();member=body;return route.fulfill({status:201,body:''});}
        if(method==='DELETE') {member=null;return route.fulfill({status:204,body:''});}
        if(method==='PATCH') return route.fulfill({status:204,body:''});
        if(url.searchParams.get('select')==='display_name') return route.fulfill({json:member ? [{display_name:member.display_name}] : []});
        return route.fulfill({json:member ? [member] : []});
      }
      return route.fulfill({json:[]});
    });
    await page.evaluate(({uid,user})=>{
      const encode=value=>btoa(JSON.stringify(value)).replaceAll('=','').replaceAll('+','-').replaceAll('/','_');
      const expires_at=Math.floor(Date.now()/1000)+3600;
      const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,exp:expires_at,role:'authenticated'})}.fixture`;
      localStorage.setItem('sb-rplxdjpbsbhorpucacic-auth-token',JSON.stringify({access_token,refresh_token:'fixture',token_type:'bearer',expires_in:3600,expires_at,user}));
    },{uid,user});
    await page.reload();await navigate(page,'insights');
    await page.getByRole('button',{name:'Leaderboard',exact:true}).click();
    await expect(page.getByLabel('Community display name',{exact:true})).toBeVisible();
    expect(joined).toBe(0);
    await page.getByLabel('Community display name',{exact:true}).fill('Public alias');
    await page.getByRole('button',{name:'Join leaderboard',exact:true}).click();
    await expect(page.getByRole('button',{name:'Leave leaderboard',exact:true})).toBeVisible();
    expect(member.display_name).toBe('Public alias');expect(JSON.stringify(member)).not.toContain('fixture@example.invalid');
    await page.getByRole('button',{name:'Leave leaderboard',exact:true}).click();
    await expect(page.getByRole('button',{name:'Join leaderboard',exact:true})).toBeVisible();
    expect(member).toBe(null);
  } finally {await close();}
});
