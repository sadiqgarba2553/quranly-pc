const { test } = require('node:test');
const assert = require('node:assert/strict');
const project = 'https://quranly-test.supabase.co';
const token = (iss = `${project}/auth/v1`) => `header.${Buffer.from(JSON.stringify({iss})).toString('base64url')}.signature`;
const redirect = (type = 'signup', access = token()) => `http://localhost:3000/#${new URLSearchParams({access_token:access,refresh_token:'test-refresh',type})}`;
const load = () => import('../src/services/authLinks.js');
const ok = { data: { user: {id:'test'}, session: {user:{id:'test'}} }, error:null };

test('browser redirect validates the token with Supabase before establishing a session', async () => {
  const {confirmAuthLink} = await load(); const calls=[];
  const auth = {getUser:async value=>{calls.push(['user',value]);return ok;},setSession:async value=>{calls.push(['session',value]);return ok;}};
  assert.deepEqual(await confirmAuthLink(auth,project,redirect()),{recovery:false});
  assert.deepEqual(calls,[['user',token()],['session',{access_token:token(),refresh_token:'test-refresh'}]]);
});
test('original email links verify through OTP without navigating', async () => {
  const {confirmAuthLink} = await load();let args;
  await confirmAuthLink({verifyOtp:async value=>{args=value;return ok;}},project,`${project}/auth/v1/verify?token=original-hash&type=signup`);
  assert.deepEqual(args,{token_hash:'original-hash',type:'email'});
});
test('wrong origins, wrong issuers, truncated links and errors are rejected without auth side effects', async () => {
  const {confirmAuthLink} = await load();
  for (const value of [redirect().replace('localhost:3000','evil.example'),redirect('signup',token('https://other.supabase.co/auth/v1')),'http://localhost:3000/#access_token=missing-refresh&type=signup','http://localhost:3000/#error=access_denied&error_code=otp_expired',`${project}.evil.example/auth/v1/verify?token=x&type=signup`]) {
    await assert.rejects(confirmAuthLink({},project,value));
  }
});
test('forged or expired tokens cannot establish a session', async () => {
  const {confirmAuthLink} = await load();
  await assert.rejects(confirmAuthLink({getUser:async()=>({error:{message:'invalid'}})},project,redirect()),/expired or is invalid/);
});
test('recovery links require recovery mode before authentication', async () => {
  const {confirmAuthLink} = await load();
  await assert.rejects(confirmAuthLink({},project,redirect('recovery')),/recovery link/);
  await assert.rejects(confirmAuthLink({},project,redirect(),'recovery'),/recovery link/);
  assert.deepEqual(await confirmAuthLink({getUser:async()=>ok,setSession:async()=>ok},project,redirect('recovery'),'recovery'),{recovery:true});
});
