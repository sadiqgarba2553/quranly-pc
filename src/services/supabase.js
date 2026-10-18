import { createClient } from '@supabase/supabase-js';
import { confirmAuthLink } from './authLinks';

const client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const check = result => { if (result.error) throw result.error; return result.data; };
const userShape = user => user ? { uid: user.id, email: user.email,
  displayName: user.user_metadata?.display_name || '', photoURL: user.user_metadata?.avatar_url || null } : null;
export async function subscribeAuth(callback) {
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => callback(userShape(session?.user)));
  return () => subscription.unsubscribe();
}
export async function signUpWithEmail(email, password, displayName) {
  const data = check(await client.auth.signUp({ email, password, options: { data: { display_name: displayName } } }));
  if (!data.session) return { confirmationRequired: true };
  return userShape(data.user);
}
export async function signInWithEmail(email, password) {
  return userShape(check(await client.auth.signInWithPassword({ email, password })).user);
}
export async function signInWithGoogle() {
  // Embedded desktop OAuth requires a configured browser callback. Do not silently redirect the app.
  if (window.quranlyDesktop) throw Error('Use email and password in the Windows app. Google sign-in is available in the web app.');
  check(await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + import.meta.env.BASE_URL } }));
  return null;
}
export async function resetPassword(email) { check(await client.auth.resetPasswordForEmail(email)); }
export async function verifyEmailLink(link, expectedType) {
  return confirmAuthLink(client.auth, import.meta.env.VITE_SUPABASE_URL, link, expectedType);
}
export async function resendConfirmation(email) { check(await client.auth.resend({ type: 'signup', email })); }
export async function updatePassword(password) {
  if (password.length < 8) throw Error('Use a password with at least 8 characters.');
  check(await client.auth.updateUser({ password }));
}
export async function logOutUser() { check(await client.auth.signOut()); }
export async function updateUserProfileName(name) {
  const clean = String(name).replace(/<[^>]*>/g,'').trim().slice(0,40);
  const data = check(await client.auth.updateUser({ data: { display_name: clean } }));
  await saveUserProgress(data.user.id, { displayName: clean });
}
// Narrowly scoped RPC merges patches atomically, avoiding lost concurrent updates.
export async function saveUserProgress(uid, data) {
  if (!uid) return;
  const { data: { session } } = await client.auth.getSession();
  if (session?.user.id !== uid) throw Error('Your session changed. Sign in again to sync this account.');
  const clean = JSON.parse(JSON.stringify(data));
  delete clean.isPro; delete clean.proLicense; delete clean.email;
  // Bind this write to the captured account even if another sign-in happens
  // while a request is waiting for the network.
  const authorization=`Bearer ${session.access_token}`;
  check(await client.rpc('save_quranly_progress', { patch: clean }).setHeader('Authorization',authorization).abortSignal(AbortSignal.timeout(12000)));
  if (data.totalXP !== undefined) {
    await client.from('quranly_community').update({total_minutes:Math.floor(data.totalMinutes || 0),total_xp:Math.floor(data.totalXP || 0),streak:Math.floor(data.streak || 0),level_title:data.levelTitle || 'Reader',updated_at:new Date().toISOString()}).eq('user_id',uid).setHeader('Authorization',authorization).abortSignal(AbortSignal.timeout(12000));
  }
}
export async function getUserProgress(uid) {
  const data = check(await client.from('quranly_progress').select('data').eq('user_id',uid).maybeSingle().abortSignal(AbortSignal.timeout(12000)));
  if (!data?.data) return null;
  const progress = { ...data.data };
  delete progress.isPro; delete progress.proLicense; delete progress.email;
  return progress;
}
export function subscribeUserData(uid, callback) {
  let stopped = false;
  let previous;
  const refresh = () => getUserProgress(uid).then(data => {
    const fingerprint = JSON.stringify(data);
    if (!stopped && fingerprint !== previous) { previous = fingerprint; callback(data); }
  }).catch(error => console.warn('Progress sync:', error.message));
  refresh();
  // Poll only while visible. No public Realtime publication is required.
  const timer = setInterval(() => { if (!document.hidden) refresh(); }, 30_000);
  return () => { stopped = true; clearInterval(timer); };
}
export async function getLeaderboard(limit = 20) {
  const {data:{session}}=await client.auth.getSession();
  if(!session) return [];
  const rows=check(await client.from('quranly_community').select('user_id,display_name,total_minutes,total_xp,streak,level_title').order('total_xp',{ascending:false}).order('streak',{ascending:false}).limit(Math.min(100,limit)));
  return rows.map(r=>({uid:r.user_id,displayName:r.display_name,totalMinutes:r.total_minutes,totalXP:r.total_xp,streak:r.streak,levelTitle:r.level_title,isMe:r.user_id===session.user.id}));
}
export async function getCommunityParticipation() {
  const {data:{session}}=await client.auth.getSession();
  if(!session) return null;
  return check(await client.from('quranly_community').select('display_name').eq('user_id',session.user.id).maybeSingle());
}
export async function setCommunityParticipation(enabled, alias, stats) {
  const user=check(await client.auth.getUser()).user;
  if(!user) throw Error('Sign in to join the community.');
  if(!enabled) {check(await client.from('quranly_community').delete().eq('user_id',user.id));return;}
  const name=String(alias).trim().slice(0,40);
  if(!name) throw Error('Choose a display name for the leaderboard.');
  check(await client.from('quranly_community').upsert({user_id:user.id,display_name:name,total_minutes:stats.totalMinutes,total_xp:stats.totalXP,streak:stats.streak,level_title:stats.levelTitle,updated_at:new Date().toISOString()}));
}
export async function submitAppFeedback({type,payload}) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw Error('Sign in to send feedback.');
  check(await client.from('quranly_feedback').insert({ user_id: user.id, type, payload }));
  return { ok: true };
}
export async function saveGroupKhatms(uid, groupKhatms) { await saveUserProgress(uid, {groupKhatms}); }
