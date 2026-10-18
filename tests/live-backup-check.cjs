// Explicit live smoke check. Creates disposable users only when auto-confirm is
// enabled; reports their IDs for cleanup and never prints passwords or tokens.
const {createClient}=require('@supabase/supabase-js');
const {randomUUID,randomBytes}=require('node:crypto');
const assert=require('node:assert/strict');
process.loadEnvFile('.env.desktop.local');
const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const make=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const check=r=>{if(r.error)throw r.error;return r.data;};
(async()=>{
 const settings=await fetch(url+'/auth/v1/settings',{headers:{apikey:key}}).then(r=>r.json());
 assert.equal(settings.mailer_autoconfirm,true,'No email should be sent by this test');
 const fixtures=[];
 try {
  for(let i=0;i<2;i++){
   const client=make(),email=`quranly-backup-check-${randomUUID()}@example.com`,password=randomBytes(24).toString('base64url');
   const {user}=check(await client.auth.signUp({email,password}));
   fixtures.push({client,email,password,id:user.id});console.log('Disposable fixture:',user.id);
  }
  const a=fixtures[0],b=fixtures[1];
  const payload={favouriteSurahIds:[3,36],customPlaylists:[{id:'roundtrip',name:'Cloud test',surahIds:[3,36]}],listeningHistory:{'2026-10-18':610},reciterAnalytics:{1:{totalPlays:3,totalSeconds:610}},readingPage:42,playbackResume:{surahId:3,reciterId:1,moshafIndex:0,position:87,queueIds:[3,36]},memorizationProgress:{1:{reviewedVerses:[0,1]}}};
  check(await a.client.rpc('save_quranly_progress',{patch:payload}));
  check(await a.client.rpc('save_quranly_progress',{patch:{dailyGoalMinutes:25}}));
  await a.client.auth.signOut({scope:'global'});
  const fresh=make();a.fresh=fresh;check(await fresh.auth.signInWithPassword({email:a.email,password:a.password}));
  const restored=check(await fresh.from('quranly_progress').select('data').eq('user_id',a.id).single()).data;
  for(const field of Object.keys(payload))assert.deepEqual(restored[field],payload[field]);assert.equal(restored.dailyGoalMinutes,25);
  const isolated=check(await b.client.from('quranly_progress').select('data').eq('user_id',a.id));assert.equal(isolated.length,0);
  console.log('Live backup, partial patch, fresh-session restore and account isolation passed.');
 } finally {for(const f of fixtures){await f.client.auth.signOut({scope:'global'});if(f.fresh)await f.fresh.auth.signOut({scope:'global'});}}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
