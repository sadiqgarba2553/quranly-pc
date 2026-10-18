// Supabase is the single source for authentication and cloud progress.
export const cloudProvider = 'supabase';
export const cloudConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export const auth = { currentUser: null };
let providerPromise;
const provider = () => {
  if (!cloudConfigured) return Promise.reject(new Error('Cloud sync is not configured yet. You can keep using Quranly on this device.'));
  return providerPromise ||= import('./supabase');
};
export function onAuthStateChanged(_auth, callback) {
  let active = true, cleanup = () => {};
  const notify = user => { if (active) { auth.currentUser = user; callback(user); } };
  if (!cloudConfigured) { queueMicrotask(() => notify(null)); return () => { active = false; }; }
  provider().then(async p => {
    const unsub = await p.subscribeAuth(notify);
    if (active) cleanup = unsub; else unsub();
  }).catch(error => { console.warn('Cloud connection unavailable:', error.message); notify(null); });
  return () => { active = false; cleanup(); };
}
export function subscribeUserData(uid, callback) {
  let active = true, cleanup = () => {};
  provider().then(p => {
    if (!active) return;
    cleanup = p.subscribeUserData(uid, data => { if (active) callback(data); });
  }).catch(error => console.warn('Cloud data unavailable:', error.message));
  return () => { active = false; cleanup(); };
}
const call = name => async (...args) => (await provider())[name](...args);
export const signUpWithEmail = call('signUpWithEmail');
export const signInWithEmail = call('signInWithEmail');
export const signInWithGoogle = call('signInWithGoogle');
export const resetPassword = call('resetPassword');
export const logOutUser = call('logOutUser');
export const updateUserProfileName = call('updateUserProfileName');
export const saveUserProgress = call('saveUserProgress');
export const getUserProgress = call('getUserProgress');
export const getLeaderboard = async (...args) => cloudConfigured ? (await provider()).getLeaderboard(...args) : [];
export const getCommunityParticipation = call('getCommunityParticipation');
export const setCommunityParticipation = call('setCommunityParticipation');
export const submitAppFeedback = call('submitAppFeedback');
export const saveGroupKhatms = call('saveGroupKhatms');

export const verifyEmailLink = call('verifyEmailLink');
export const resendConfirmation = call('resendConfirmation');
export const updatePassword = call('updatePassword');
