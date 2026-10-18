const fields = {
  playbackResume: 'quranly_playback_resume', reciterAnalytics: 'quranly_site_reciter_analytics_v2',
  recentReciterIds: 'quranly_recent_reciter_ids',
  readingPage: 'quranly_mushaf_page', memorizationProgress: 'quranly_memorization_progress',
  favouriteSurahIds: 'quranly_fav_surahs', favouriteReciterIds: 'quranly_fav_reciters',
  bookmarkedVerses: 'quranly_bookmarks', customPlaylists: 'quranly_custom_playlists',
  groupKhatms: 'quranly_group_khatms', listeningHistory: 'quranly_listening_history',
  dailyGoalMinutes: 'quranly_daily_goal', verseReflections: 'quranly_verse_reflections',
  completedAzkarCount: 'quranly_azkar_count', dailyAzkarGoal: 'quranly_azkar_goal',
};
export const emptyProgress = () => ({ playbackResume:null,reciterAnalytics:{},recentReciterIds:[],favouriteSurahIds: [], favouriteReciterIds: [], bookmarkedVerses: [], customPlaylists: [], groupKhatms: [], listeningHistory: {}, dailyGoalMinutes: 10, verseReflections: [], completedAzkarCount: 0, dailyAzkarGoal: 5, readingPage: 1, memorizationProgress: {} });
export function progressSnapshot(state) {
  const data = {};
  for (const field of Object.keys(fields)) data[field] = state[field] instanceof Set ? [...state[field]] : state[field];
  if(state.currentTrack || data.reciterAnalytics===undefined){try{data.reciterAnalytics=JSON.parse(localStorage.getItem(fields.reciterAnalytics)||'{}');}catch{data.reciterAnalytics={};}}
  if(data.playbackResume===undefined){try{data.playbackResume=JSON.parse(localStorage.getItem(fields.playbackResume)||'null');}catch{data.playbackResume=null;}}
  return data;
}
export function persistProgress(data) {
  for (const [field,key] of Object.entries(fields)) if (data[field] !== undefined) localStorage.setItem(key,JSON.stringify(data[field]));
}
export function switchAccountProgress(uid, current) {
  const nextOwner = uid || 'guest';
  const previousOwner = localStorage.getItem('quranly_data_owner') || 'guest';
  if (nextOwner === previousOwner) return null;
  const snapshot = progressSnapshot(current);
  if(current.currentTrack) snapshot.playbackResume={...snapshot.playbackResume,surahId:current.currentTrack.surah?.id,reciterId:current.currentTrack.reciter?.id,reciter:current.currentTrack.reciter,moshafIndex:current.currentTrack.moshafIndex||0,position:current.resumePosition||0,queueIds:(current.queue||[]).map(s=>s.id),queueIndex:current.queueIndex||0,volume:current.volume??1,speed:current.playbackSpeed||1,repeat:current.repeatMode||'off',shuffle:!!current.shuffleOn};
  localStorage.setItem(`quranly_account_progress_${previousOwner}`,JSON.stringify(snapshot));
  let next;
  try { next=JSON.parse(localStorage.getItem(`quranly_account_progress_${nextOwner}`) || 'null'); } catch { next=null; }
  if (!next) next = previousOwner === 'guest' && nextOwner !== 'guest' ? snapshot : emptyProgress();
  next = { ...emptyProgress(), ...next };
  localStorage.setItem('quranly_data_owner',nextOwner);
  persistProgress(next);
  return next;
}
