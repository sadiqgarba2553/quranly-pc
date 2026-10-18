import { localDateKey, clampGoal } from '../utils/dates';
import { emptyProgress, persistProgress } from '../utils/accountProgress';
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { PlayerActionsContext } from '../hooks/usePlayerState';
import {
  PlaybackContext,
  DataContext,
  UserDataContext,
  UIStateContext,
  TimeStoreContext,
} from './contexts';
import { createTimeStore } from './TimeStore';
import staticSurahs from '../data/surahs';
import staticReciters from '../data/reciters';
import {
  fetchReciters, fetchSuwar, fetchRiwayat,
  fetchMoshaf, fetchRadios, fetchTafasir,
  buildSurahAudioUrl,
} from '../services/mp3quranApi';
import { getSoundUrl } from '../data/sounds';

import { getReciterAvatarUrl } from '../utils/reciterPhotos';

import {
  getDownloadedTracks, isTrackDownloaded,
  downloadAudioTrack, removeAudioTrack, getCachedAudioUrl,
} from '../services/offlineCache';
import AuthModal from '../components/AuthModal';
import useAccountBackup from '../hooks/useAccountBackup';
import { recordReciterPlay, recordListeningDuration, recordSurahCompleted } from '../utils/reciterAnalytics';
import { fadeVolume, getAlternateAudioUrls, triggerHaptic } from '../utils/audioEngine';

// ─── Shape Mappers ────────────────────────────────────────────
function mapReciter(r) {
  const moshafList = (r.moshaf ?? []).map(m => ({
    ...m,
    server: m.server ? m.server.replace(/^http:\/\//i, 'https://') : m.server,
  }));
  return {
    id: r.id,
    name: r.name,
    letter: r.letter,
    country: r.country || '',
    avatar: getReciterAvatarUrl(r.name, r.id),
    moshaf: moshafList.length > 0 ? moshafList : (r.server ? [{ id: 1, name: 'Standard', server: r.server }] : []),
    server: moshafList[0]?.server ?? (r.server ? r.server.replace(/^http:\/\//i, 'https://') : null),
    categories: r.categories ?? ['All'],
  };
}

function mapSurah(s) {
  const staticMatch = staticSurahs.find(st => st.id === s.id);
  return {
    id: s.id,
    nameArabic: staticMatch?.nameArabic ?? s.name,
    nameEnglish: staticMatch?.nameEnglish ?? s.name,
    meaning: staticMatch?.meaning ?? '',
    verseCount: staticMatch?.verseCount ?? 10,
    type: s.makkia === 1 ? 'Meccan' : 'Medinan',
    apiName: s.name,
    startPage: s.start_page,
    endPage: s.end_page,
  };
}

function getAudioUrlFromReciter(reciter, surahId, moshafIndex = 0) {
  if (!reciter) return null;
  if (reciter.offlineAudioUrl && reciter.offlineSurahId === surahId) return reciter.offlineAudioUrl;
  let serverUrl = null;
  if (reciter.moshaf && reciter.moshaf.length > 0) {
    const m = reciter.moshaf[moshafIndex] ?? reciter.moshaf[0];
    serverUrl = m?.server;
  }
  if (!serverUrl && reciter.server) {
    serverUrl = reciter.server;
  }
  if (!serverUrl) return null;

  // Enforce https to prevent browser mixed content blocking
  const secureServer = serverUrl.replace(/^http:\/\//i, 'https://');
  return buildSurahAudioUrl(secureServer, surahId);
}

// ─── LocalStorage Helpers ─────────────────────────────────────
const loadSavedSet = (key) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return new Set(JSON.parse(saved));
  } catch (e) {
    console.error('Error loading saved set:', e);
  }
  return new Set();
};

const loadSavedJson = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading saved json:', e);
  }
  return fallback;
};

// ─── Initial State ─────────────────────────────────────────
const rawSavedTrack = loadSavedJson('quranly_last_track', null);
const savedLastTrack = (rawSavedTrack?.track?.surah?.id && rawSavedTrack?.track?.reciter?.id) ? rawSavedTrack : null;

// currentTime lives in TimeStore, NOT in React state — this is the key perf win.
// It prevents 32 components from re-rendering every 500ms during playback.
const savedInitialTime = savedLastTrack ? savedLastTrack.currentTime : 0;

const initialState = {
  // Playback State
  queue: [],
  queueIndex: 0,
  currentTrack: savedLastTrack ? savedLastTrack.track : { surah: staticSurahs[0], reciter: staticReciters[0], moshafIndex: 0 },
  isPlaying: false,
  duration: 0,
  volume: 1,
  playbackSpeed: 1,
  repeatMode: 'off',
  shuffleOn: false,
  isBuffering: false,
  audioError: null,

  // Offline downloads are available to everyone.
  downloadedTracks: getDownloadedTracks(),
  downloadingTrackId: null,
  downloadProgress: 0,

  readingPage: Math.max(1,Math.min(604,Number(localStorage.getItem('quranly_mushaf_page')) || 1)),
  memorizationProgress: loadSavedJson('quranly_memorization_progress', {}),
  themeMode: localStorage.getItem('quranly_theme') || 'dark', // 'dark' (default) | 'light' | 'system'
  appTheme: localStorage.getItem('quranly_app_theme') || 'white', // 'white' | 'indigo' | 'amethyst' | 'ocean' | 'emerald' | 'sunset'
  playerNatureTheme: localStorage.getItem('quranly_player_nature_theme') || 'darkveil', // 'darkveil' | 'liquidether' | 'prism' | 'acid' | 'none'

  favouriteSurahIds: loadSavedSet('quranly_fav_surahs'),
  favouriteReciterIds: loadSavedSet('quranly_fav_reciters'),
  bookmarkedVerses: loadSavedJson('quranly_bookmarks', []),
  customPlaylists: loadSavedJson('quranly_custom_playlists', []),
  verseReflections: loadSavedJson('quranly_verse_reflections', []),
  groupKhatms: loadSavedJson('quranly_group_khatms', []),

  activeSound: 'None',
  soundVolume: 0.4,

  sleepMinutes: null,
  sleepEndTime: null,
  sleepMode: 'timer', // 'timer' | 'endOfSurah'

  listeningHistory: loadSavedJson('quranly_listening_history', {
    [localDateKey()]: 0,
  }),
  dailyGoalMinutes: loadSavedJson('quranly_daily_goal', 10),
  recentReciterIds: loadSavedJson('quranly_recent_reciter_ids', [1, 2, 3]),
  completedAzkarCount: loadSavedJson('quranly_azkar_count', 0),
  dailyAzkarGoal: loadSavedJson('quranly_azkar_goal', 5),

  isPlayerOpen: false,
  isSoundModalOpen: false,
  isPlaylistDrawerOpen: false,
  isSleepTimerOpen: false,
  isQuranTextOpen: false,
  isVolumeOpen: false,
  activeProfileReciter: null,

  // Auth & Supabase State
  currentUser: null,
  isAuthModalOpen: false,
  isCloudLoaded: false,

  reciters: staticReciters,
  surahs: staticSurahs,
  riwayat: [],
  moshaf: [],
  radios: [],
  tafasir: [],
  apiLanguage: 'eng',
  apiLoading: true,
  apiError: null,
};

function playbackQueue(state) {
  if (state.queue.length) return state.queue;
  const available = state.currentTrack?.reciter?.moshaf?.[state.currentTrack?.moshafIndex || 0]?.surah_list;
  if (!available) return state.surahs;
  const ids = new Set(String(available).split(',').map(Number));
  return state.surahs.filter(item => ids.has(item.id));
}

// ─── Reducer ────────────────────────────────────────────────
function playerReducer(state, action) {
  switch (action.type) {
    case 'PLAY':
      return { ...state, isPlaying: true, audioError: null };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying, audioError: null };

    case 'SET_TRACK': {
      const { surah, reciter, queue, queueIndex, moshafIndex } = action.payload;
      return {
        ...state,
        currentTrack: {
          surah,
          reciter: reciter || state.currentTrack.reciter,
          moshafIndex: moshafIndex ?? state.currentTrack.moshafIndex,
        },
        queue: queue || state.queue,
        queueIndex: queueIndex ?? state.queueIndex,
        currentTime: 0,
        duration: 0,
        isPlaying: true,
        isBuffering: true,
        audioError: null,
      };
    }

    case 'PLAY_NEXT': {
      // Sleep end-of-surah: pause instead of advancing
      if (state.sleepMode === 'endOfSurah' && state.sleepEndTime === -1) {
        return { ...state, isPlaying: false, sleepMode: 'timer', sleepEndTime: null, sleepMinutes: null };
      }
      if (state.repeatMode === 'one' && action.payload !== 'user') {
        return { ...state, currentTime: 0, isPlaying: true, isBuffering: true };
      }

      const queue = playbackQueue(state);
      if (!queue.length) return { ...state, isPlaying: false };
      const currentIndex = queue.findIndex(item => item.id === state.currentTrack?.surah?.id);
      let nextIndex;
      if (state.shuffleOn && queue.length > 1) {
        let randomIndex = currentIndex;
        while (randomIndex === currentIndex) {
          randomIndex = Math.floor(Math.random() * queue.length);
        }
        nextIndex = randomIndex;
      } else {
        nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
          if (state.repeatMode !== 'all') return { ...state, isPlaying: false, isBuffering: false };
          nextIndex = 0;
        }
      }

      const nextSurah = queue[nextIndex];
      return {
        ...state,
        currentTrack: { ...state.currentTrack, surah: nextSurah },
        queue,
        queueIndex: nextIndex,
        currentTime: 0,
        duration: 0,
        isPlaying: true,
        isBuffering: true,
        audioError: null,
      };
    }

    case 'PLAY_PREV': {
      const queue = playbackQueue(state);
      if (!queue.length) return { ...state, isPlaying: false };
      const currentIndex = Math.max(0,queue.findIndex(item => item.id === state.currentTrack?.surah?.id));
      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) prevIndex = state.repeatMode === 'all' ? queue.length - 1 : 0;
      const prevSurah = queue[prevIndex];
      return {
        ...state,
        currentTrack: { ...state.currentTrack, surah: prevSurah },
        queue,
        queueIndex: prevIndex,
        currentTime: 0,
        duration: 0,
        isPlaying: true,
        isBuffering: true,
        audioError: null,
      };
    }

    case 'SEEK':
      // currentTime is stored in TimeStore, not state. Seek is handled via audio element + timeStore.update().
      return state;
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_SOUND_VOLUME':
      return { ...state, soundVolume: action.payload };

    case 'AUDIO_TIME_UPDATE':
      // No-op: currentTime moved to TimeStore to avoid cascading re-renders.
      return state;
    case 'AUDIO_DURATION':
      return { ...state, duration: action.payload, isBuffering: false };
    case 'AUDIO_BUFFERING':
      return { ...state, isBuffering: action.payload };
    case 'AUDIO_ERROR':
      return { ...state, audioError: action.payload, isPlaying: false, isBuffering: false };

    case 'CYCLE_SPEED': {
      const speeds = [1, 1.5, 2, 0.5];
      const idx = speeds.indexOf(state.playbackSpeed);
      return { ...state, playbackSpeed: speeds[(idx + 1) % speeds.length] };
    }

    case 'SET_QUEUE':
      return { ...state, queue: action.payload.queue, queueIndex: action.payload.queueIndex ?? 0 };

    case 'SHUFFLE_QUEUE': {
      const shuffled = [...state.queue].sort(() => Math.random() - 0.5);
      const newIdx = shuffled.findIndex(s => s.id === state.currentTrack.surah.id);
      return { ...state, queue: shuffled, queueIndex: newIdx >= 0 ? newIdx : 0, shuffleOn: !state.shuffleOn };
    }

    case 'TOGGLE_REPEAT': {
      const modes = ['off', 'all', 'one'];
      const idx = modes.indexOf(state.repeatMode);
      return { ...state, repeatMode: modes[(idx + 1) % modes.length] };
    }

    case 'SET_RECITER':
      return {
        ...state,
        currentTrack: { ...state.currentTrack, reciter: action.payload },
        recentReciterIds: [action.payload.id, ...state.recentReciterIds.filter(id => id !== action.payload.id)].slice(0, 10),
      };

    case 'SET_MOSHAF_INDEX':
      return { ...state, currentTrack: { ...state.currentTrack, moshafIndex: action.payload } };

    case 'TOGGLE_FAVOURITE_SURAH': {
      const newSet = new Set(state.favouriteSurahIds);
      const rawId = action.payload;
      const numId = Number(rawId);
      const strId = String(rawId);
      const hasIt = newSet.has(rawId) || newSet.has(numId) || newSet.has(strId);

      if (hasIt) {
        newSet.delete(rawId);
        newSet.delete(numId);
        newSet.delete(strId);
      } else {
        newSet.add(rawId);
        if (!isNaN(numId)) newSet.add(numId);
        newSet.add(strId);
      }
      // Immediately persist to localStorage so refresh retains the favourite
      try { localStorage.setItem('quranly_fav_surahs', JSON.stringify([...newSet])); } catch { }
      return { ...state, favouriteSurahIds: newSet };
    }
    case 'TOGGLE_FAVOURITE_RECITER': {
      const newSet = new Set(state.favouriteReciterIds);
      const rawId = action.payload;
      const numId = Number(rawId);
      const strId = String(rawId);
      const hasIt = newSet.has(rawId) || newSet.has(numId) || newSet.has(strId);

      if (hasIt) {
        newSet.delete(rawId);
        newSet.delete(numId);
        newSet.delete(strId);
      } else {
        newSet.add(rawId);
        if (!isNaN(numId)) newSet.add(numId);
        newSet.add(strId);
      }
      // Immediately persist to localStorage so refresh retains the followed Qari
      try { localStorage.setItem('quranly_fav_reciters', JSON.stringify([...newSet])); } catch { }
      return { ...state, favouriteReciterIds: newSet };
    }

    case 'TOGGLE_BOOKMARK': {
      const { surahId, verseNumber, verseText } = action.payload;
      const key = `${surahId}:${verseNumber}`;
      const exists = state.bookmarkedVerses.some(b => b.key === key);
      let newBookmarks;
      if (exists) {
        newBookmarks = state.bookmarkedVerses.filter(b => b.key !== key);
      } else {
        newBookmarks = [
          ...state.bookmarkedVerses,
          { key, surahId, verseNumber, verseText: verseText?.slice(0, 80) ?? '', addedAt: Date.now() },
        ];
      }
      // Immediately persist to localStorage
      try { localStorage.setItem('quranly_bookmarks', JSON.stringify(newBookmarks)); } catch { }
      return { ...state, bookmarkedVerses: newBookmarks };
    }

    case 'SET_SOUND':
      return { ...state, activeSound: action.payload };

    case 'SET_SLEEP_TIMER': {
      if (action.payload === null) {
        return { ...state, sleepMinutes: null, sleepEndTime: null, sleepMode: 'timer' };
      }
      if (action.payload === 'endOfSurah') {
        return { ...state, sleepMinutes: -1, sleepEndTime: -1, sleepMode: 'endOfSurah' };
      }
      return {
        ...state,
        sleepMinutes: action.payload,
        sleepEndTime: Date.now() + action.payload * 60 * 1000,
        sleepMode: 'timer',
      };
    }

    case 'ADD_LISTENING_TIME': {
      const today = localDateKey();
      const prev = state.listeningHistory[today] || 0;
      const newHistory = { ...state.listeningHistory, [today]: prev + action.payload };
      try { localStorage.setItem('quranly_listening_history', JSON.stringify(newHistory)); } catch { }
      return { ...state, listeningHistory: newHistory };
    }

    case 'SET_DAILY_GOAL':
      return { ...state, dailyGoalMinutes: clampGoal(action.payload) };

    // API
    case 'SET_API_LOADING':
      return { ...state, apiLoading: action.payload };
    case 'SET_API_ERROR':
      return { ...state, apiError: action.payload, apiLoading: false };
    case 'SET_API_DATA': {
      const { reciters, surahs, riwayat, moshaf, radios, tafasir } = action.payload;
      const combinedReciters = [...reciters];
      staticReciters.forEach(sr => {
        if (!combinedReciters.some(cr => cr.id === sr.id || cr.name.toLowerCase() === sr.name.toLowerCase())) {
          combinedReciters.push(sr);
        }
      });
      // Catalog refreshes must not change a saved voice, riwayah or queue.
      const currentReciter = state.currentTrack.reciter || combinedReciters[0];
      const currentSurah = surahs.find(s => s.id === state.currentTrack.surah.id) || surahs[0];
      return {
        ...state,
        reciters: combinedReciters,
        surahs, riwayat, moshaf, radios, tafasir,
        apiLoading: false,
        apiError: null,
        currentTrack: { surah: currentSurah, reciter: currentReciter, moshafIndex: state.currentTrack.moshafIndex || 0 },
        queue: state.queue,
      };
    }
    case 'SET_API_LANGUAGE':
      return { ...state, apiLanguage: action.payload, apiLoading: true };

    case 'SET_APP_THEME':
      try { localStorage.setItem('quranly_app_theme', action.payload); } catch { }
      return { ...state, appTheme: action.payload };

    case 'INCREMENT_AZKAR_COUNT': {
      const nextCount = state.completedAzkarCount + (action.payload || 1);
      try { localStorage.setItem('quranly_azkar_count', JSON.stringify(nextCount)); } catch { }
      return { ...state, completedAzkarCount: nextCount };
    }

    case 'SET_DAILY_AZKAR_GOAL': {
      const goal = Math.max(1,Math.min(1000,Math.round(Number(action.payload)||5)));
      try { localStorage.setItem('quranly_azkar_goal', JSON.stringify(goal)); } catch { }
      return { ...state, dailyAzkarGoal: goal };
    }

    case 'SET_PLAYER_NATURE_THEME':
      try { localStorage.setItem('quranly_player_nature_theme', action.payload); } catch { }
      return { ...state, playerNatureTheme: action.payload };

    case 'SET_ACTIVE_PROFILE_RECITER':
      return { ...state, activeProfileReciter: action.payload };

    // UI
    case 'OPEN_PLAYER':
      return { ...state, isPlayerOpen: true };
    case 'CLOSE_PLAYER':
      return { ...state, isPlayerOpen: false, isSoundModalOpen: false, isPlaylistDrawerOpen: false, isSleepTimerOpen: false, isQuranTextOpen: false, isVolumeOpen: false };
    case 'TOGGLE_SOUND_MODAL':
      return { ...state, isSoundModalOpen: !state.isSoundModalOpen };
    case 'TOGGLE_PLAYLIST_DRAWER':
      return { ...state, isPlaylistDrawerOpen: !state.isPlaylistDrawerOpen };
    case 'TOGGLE_SLEEP_TIMER_MODAL':
      return { ...state, isSleepTimerOpen: !state.isSleepTimerOpen };
    case 'TOGGLE_QURAN_TEXT':
      return { ...state, isQuranTextOpen: !state.isQuranTextOpen };
    case 'TOGGLE_VOLUME':
      return { ...state, isVolumeOpen: !state.isVolumeOpen };
    case 'CLOSE_MODALS':
      return { ...state, isSoundModalOpen: false, isPlaylistDrawerOpen: false, isSleepTimerOpen: false, isQuranTextOpen: false, isVolumeOpen: false };

    // Downloads
    case 'SET_DOWNLOADED_TRACKS':
      return { ...state, downloadedTracks: action.payload };
    case 'SET_DOWNLOADING':
      return { ...state, downloadingTrackId: action.payload.trackId, downloadProgress: action.payload.progress ?? 0 };

    // Theme
    case 'SET_THEME_MODE':
      return { ...state, themeMode: action.payload };

    // Auth & Supabase
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_AUTH_MODAL_OPEN':
      return { ...state, isAuthModalOpen: action.payload };
    case 'RESET_USER_DATA': {
      // isCloudLoaded = false prevents auto-sync from writing empty data back to Supabase
      // We do NOT clear favouriteSurahIds, favouriteReciterIds, etc.
      // This preserves the user's local/offline data if they are not logged in.
      return {
        ...state,
        currentUser: null,
        isCloudLoaded: false,
      };
    }
    case 'SET_ACCOUNT_PROGRESS':
    case 'SYNC_CLOUD_DATA': {
      const d = { ...emptyProgress(), ...action.payload };
      const cloud = action.type === 'SYNC_CLOUD_DATA';
      const snapshot = {
        favouriteSurahIds: Array.isArray(d.favouriteSurahIds) ? d.favouriteSurahIds : [],
        favouriteReciterIds: Array.isArray(d.favouriteReciterIds) ? d.favouriteReciterIds : [],
        bookmarkedVerses: Array.isArray(d.bookmarkedVerses) ? d.bookmarkedVerses : [],
        customPlaylists: Array.isArray(d.customPlaylists) ? d.customPlaylists : [],
        groupKhatms: Array.isArray(d.groupKhatms) ? d.groupKhatms : [],
        listeningHistory: d.listeningHistory || {},
        readingPage: Math.max(1,Math.min(604,Number(d.readingPage) || 1)),
        memorizationProgress: d.memorizationProgress || {},
        dailyGoalMinutes: clampGoal(d.dailyGoalMinutes),
        verseReflections: Array.isArray(d.verseReflections) ? d.verseReflections : [],
        completedAzkarCount: Number(d.completedAzkarCount) || 0,
        dailyAzkarGoal: Number(d.dailyAzkarGoal) || 5,
        reciterAnalytics: d.reciterAnalytics || {},
        recentReciterIds: Array.isArray(d.recentReciterIds) ? d.recentReciterIds : [],
        playbackResume: d.playbackResume || null,
      };
      try { persistProgress(snapshot); } catch (error) { console.warn('Local progress:',error.message); }
      let restoredTrack = state.currentTrack;
      let playback={};
      if (action.restorePlayback) {
        const resume=d.playbackResume || {surahId:d.lastPlayedSurahId,reciterId:d.lastPlayedReciterId,moshafIndex:d.lastPlayedMoshafIndex};
        const restoredSurah=state.surahs.find(item=>item.id===resume.surahId) || staticSurahs[0];
        const restoredReciter=(resume.reciter?.id===resume.reciterId ? resume.reciter : null) || state.reciters.find(item=>item.id===resume.reciterId) || staticReciters[0];
        restoredTrack={surah:restoredSurah,reciter:restoredReciter,moshafIndex:Math.max(0,Number(resume.moshafIndex)||0)};
        const queue=(resume.queueIds||[]).map(id=>state.surahs.find(s=>s.id===id)).filter(Boolean);
        playback={isPlaying:false,queue,queueIndex:Math.max(0,Math.min(queue.length-1,Number(resume.queueIndex)||0)),volume:Math.max(0,Math.min(1,Number.isFinite(resume.volume)?resume.volume:1)),playbackSpeed:[0.5,0.75,1,1.25,1.5,1.75,2].includes(resume.speed)?resume.speed:1,repeatMode:['off','all','one'].includes(resume.repeat)?resume.repeat:'off',shuffleOn:!!resume.shuffle};
      }
      return { ...state, ...snapshot, ...playback, favouriteSurahIds:new Set(snapshot.favouriteSurahIds), favouriteReciterIds:new Set(snapshot.favouriteReciterIds), isCloudLoaded:cloud, currentTrack:restoredTrack };
    }

    case 'SAVE_STUDY_PROGRESS': {
      const patch = action.payload;
      const next = { ...state, readingPage: patch.readingPage === undefined ? state.readingPage : Math.max(1,Math.min(604,Number(patch.readingPage)||1)), memorizationProgress: patch.memorizationProgress || state.memorizationProgress };
      try { localStorage.setItem('quranly_mushaf_page',String(next.readingPage)); localStorage.setItem('quranly_memorization_progress',JSON.stringify(next.memorizationProgress)); } catch {}
      return next;
    }
    case 'RENAME_PLAYLIST': {
      const name=String(action.payload.name).trim().slice(0,50);
      if(!name) return state;
      const customPlaylists=state.customPlaylists.map(p=>p.id===action.payload.id ? {...p,name} : p);
      try {localStorage.setItem('quranly_custom_playlists',JSON.stringify(customPlaylists));} catch {}
      return {...state,customPlaylists};
    }
    case 'CREATE_PLAYLIST': {
      const sanitizedName = String(action.payload || 'My Playlist')
        .replace(/<[^>]*>?/gm, '')
        .trim()
        .slice(0, 50);

      const newPlaylist = {
        id: 'pl_' + Date.now(),
        name: sanitizedName || 'My Playlist',
        surahIds: [],
        createdAt: Date.now(),
      };
      const afterCreate = [...state.customPlaylists, newPlaylist];
      try { localStorage.setItem('quranly_custom_playlists', JSON.stringify(afterCreate)); } catch { }
      return { ...state, customPlaylists: afterCreate };
    }
    case 'DELETE_PLAYLIST': {
      const afterDelete = state.customPlaylists.filter(p => p.id !== action.payload);
      try { localStorage.setItem('quranly_custom_playlists', JSON.stringify(afterDelete)); } catch { }
      return { ...state, customPlaylists: afterDelete };
    }
    case 'ADD_TO_PLAYLIST': {
      const { playlistId, surahId } = action.payload;
      const afterAdd = state.customPlaylists.map(p => {
        if (p.id === playlistId && !p.surahIds.includes(surahId)) {
          return { ...p, surahIds: [...p.surahIds, surahId] };
        }
        return p;
      });
      try { localStorage.setItem('quranly_custom_playlists', JSON.stringify(afterAdd)); } catch { }
      return { ...state, customPlaylists: afterAdd };
    }
    case 'REMOVE_FROM_PLAYLIST': {
      const { playlistId: rmPlId, surahId: rmSurahId } = action.payload;
      const afterRemove = state.customPlaylists.map(p => {
        if (p.id === rmPlId) {
          return { ...p, surahIds: p.surahIds.filter(id => id !== rmSurahId) };
        }
        return p;
      });
      try { localStorage.setItem('quranly_custom_playlists', JSON.stringify(afterRemove)); } catch { }
      return { ...state, customPlaylists: afterRemove };
    }

    case 'SAVE_REFLECTION': {
      const reflection = action.payload; // { surahId, verseNumber, verseText, noteText, tags, id? }
      const key = `${reflection.surahId}:${reflection.verseNumber}`;
      const id = reflection.id || `refl_${Date.now()}`;
      const updatedItem = {
        ...reflection,
        id,
        key,
        updatedAt: Date.now(),
      };
      const existsIndex = state.verseReflections.findIndex(r => r.id === id || r.key === key);
      let newReflections;
      if (existsIndex >= 0) {
        newReflections = [...state.verseReflections];
        newReflections[existsIndex] = updatedItem;
      } else {
        newReflections = [updatedItem, ...state.verseReflections];
      }
      try { localStorage.setItem('quranly_verse_reflections', JSON.stringify(newReflections)); } catch { }
      return { ...state, verseReflections: newReflections };
    }

    case 'DELETE_REFLECTION': {
      const id = action.payload;
      const filtered = state.verseReflections.filter(r => r.id !== id && r.key !== id);
      try { localStorage.setItem('quranly_verse_reflections', JSON.stringify(filtered)); } catch { }
      return { ...state, verseReflections: filtered };
    }

    case 'CREATE_GROUP_KHATM': {
      const { title, type, targetDate } = action.payload;
      const newKhatm = {
        id: `khatm_${Date.now()}`,
        title: title || 'Family & Friends Khatm',
        type: type || 'group',
        targetDate: targetDate || null,
        claimedJuz: {}, // { 1: { claimedBy: 'User', status: 'completed' } }
        createdAt: Date.now(),
      };
      const afterKhatm = [newKhatm, ...state.groupKhatms];
      try { localStorage.setItem('quranly_group_khatms', JSON.stringify(afterKhatm)); } catch { }
      return { ...state, groupKhatms: afterKhatm };
    }

    case 'CLAIM_KHATM_JUZ': {
      const { khatmId, juzNumber, claimedBy, status } = action.payload;
      const updatedKhatms = state.groupKhatms.map(k => {
        if (k.id === khatmId) {
          const currentClaimed = { ...(k.claimedJuz || {}) };
          if (status === 'unclaimed') {
            delete currentClaimed[juzNumber];
          } else {
            currentClaimed[juzNumber] = {
              claimedBy: claimedBy || state.currentUser?.displayName || 'Me',
              status: status || 'claimed',
              updatedAt: Date.now(),
            };
          }
          return { ...k, claimedJuz: currentClaimed };
        }
        return k;
      });
      try { localStorage.setItem('quranly_group_khatms', JSON.stringify(updatedKhatms)); } catch { }
      return { ...state, groupKhatms: updatedKhatms };
    }

    case 'DELETE_GROUP_KHATM': {
      const khatmId = action.payload;
      const filteredKhatms = state.groupKhatms.filter(k => k.id !== khatmId);
      try { localStorage.setItem('quranly_group_khatms', JSON.stringify(filteredKhatms)); } catch { }
      return { ...state, groupKhatms: filteredKhatms };
    }

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────
const PlayerContext = createContext(null);

export const APP_THEMES = {
  white: {
    primary: '#000000',
    hover: '#18181b',
    darkPrimary: '#ffffff',
    darkHover: '#e4e4e7',
  },
  indigo: {
    primary: '#6366f1',
    hover: '#4f46e5',
    darkPrimary: '#818cf8',
    darkHover: '#a5b4fc',
  },
  amethyst: {
    primary: '#a855f7',
    hover: '#9333ea',
    darkPrimary: '#c084fc',
    darkHover: '#d8b4fe',
  },
  ocean: {
    primary: '#0ea5e9',
    hover: '#0284c7',
    darkPrimary: '#38bdf8',
    darkHover: '#7dd3fc',
  },
  emerald: {
    primary: '#10b981',
    hover: '#059669',
    darkPrimary: '#34d399',
    darkHover: '#6ee7b7',
  },
  sunset: {
    primary: '#f97316',
    hover: '#ea580c',
    darkPrimary: '#fb923c',
    darkHover: '#fdba74',
  },
};

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const playbackStateRef = useRef(state);
  playbackStateRef.current = state;

  // ── TimeStore — currentTime lives here, outside React state ──
  const timeStoreRef = useRef(null);
  if (!timeStoreRef.current) {
    timeStoreRef.current = createTimeStore(savedInitialTime);
  }
  const timeStore = timeStoreRef.current;

  // ── Persistent audio elements ─────────────────────────────
  const audioRef = useRef(null);
  const bgAudioRef = useRef(null);
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
  }
  if (!bgAudioRef.current) {
    bgAudioRef.current = new Audio();
    bgAudioRef.current.loop = true;
    bgAudioRef.current.volume = 0.4;
  }
  const audio = audioRef.current;
  const bgAudio = bgAudioRef.current;
  const pendingResumeRef=useRef(savedLastTrack ? {surahId:savedLastTrack.track.surah.id,reciterId:savedLastTrack.track.reciter.id,position:savedInitialTime} : null);
  const cloudBackupStatus = useAccountBackup(state,dispatch,audio,timeStore,pendingResumeRef);
  const countedPlayRef = useRef(null);
  const audioTrackRef=useRef(null);

  // ── Theme Mode & Accent Sync Effect ─────────────────────
  useEffect(() => {
    const updateTheme = () => {
      let effectiveTheme = state.themeMode;
      if (effectiveTheme === 'system') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      document.documentElement.setAttribute('data-app-theme', state.appTheme || 'white');

      const themeConfig = APP_THEMES[state.appTheme] || APP_THEMES.white;
      const primary = effectiveTheme === 'dark' ? themeConfig.darkPrimary : themeConfig.primary;
      const hover = effectiveTheme === 'dark' ? themeConfig.darkHover : themeConfig.hover;

      document.documentElement.style.setProperty('--accent-primary', primary);
      document.documentElement.style.setProperty('--accent-color', primary);
      document.documentElement.style.setProperty('--accent-hover', hover);

      const gradients = {
        white: 'none',
        indigo: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        amethyst: 'linear-gradient(135deg, #a855f7, #d946ef)',
        ocean: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
        emerald: 'linear-gradient(135deg, #10b981, #14b8a6)',
        sunset: 'linear-gradient(135deg, #f97316, #f43f5e)',
      };
      document.documentElement.style.setProperty('--accent-gradient', gradients[state.appTheme] || 'none');
    };

    updateTheme();

    if (state.themeMode === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateTheme();
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(listener);
        return () => mediaQuery.removeListener(listener);
      }
    }
  }, [state.themeMode, state.appTheme]);

  // ── Fetch API data on language change ─────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const lang = state.apiLanguage;
    dispatch({ type: 'SET_API_LOADING', payload: true });

    Promise.all([
      fetchReciters(lang, signal), fetchSuwar(lang, signal),
      fetchRiwayat(lang, signal), fetchMoshaf(lang, signal),
      fetchRadios(lang, signal), fetchTafasir(lang, signal),
    ])
      .then(([rec, sur, riw, mos, rad, taf]) => {
        const mappedReciters = (rec.reciters ?? []).map(mapReciter);
        const mappedSurahs = (sur.suwar ?? []).map(mapSurah);
        dispatch({
          type: 'SET_API_DATA',
          payload: {
            reciters: mappedReciters.length > 0 ? mappedReciters : staticReciters,
            surahs: mappedSurahs.length > 0 ? mappedSurahs : staticSurahs,
            riwayat: riw.riwayat ?? [],
            moshaf: mos.moshaf ?? [],
            radios: rad.radios ?? [],
            tafasir: taf.tafasir ?? [],
          },
        });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('API fetch failed, using fallback:', err);
        dispatch({ type: 'SET_API_ERROR', payload: err.message });
      });

    return () => controller.abort();
  }, [state.apiLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wire audio src on track change (with Cache API lookup) ──
  const surah = state.currentTrack?.surah || staticSurahs[0];
  const reciter = state.currentTrack?.reciter || staticReciters[0];
  const moshafIndex = state.currentTrack?.moshafIndex || 0;
  useEffect(() => {
    if (!reciter || !surah) return;
    let cancelled = false;
    let blobUrl;
    const rawUrl = getAudioUrlFromReciter(reciter, surah.id, moshafIndex);
    if (!rawUrl) { audio.pause(); audio.src = ''; return; }

    getCachedAudioUrl(rawUrl).then((url) => {
      if (cancelled) { if (url.startsWith('blob:')) URL.revokeObjectURL(url); return; }
      if (url.startsWith('blob:')) blobUrl = url;
      audioTrackRef.current={surahId:surah.id,reciterId:reciter.id};
      audio.src = url;
      audio.load();
      audio.playbackRate = playbackStateRef.current.playbackSpeed;
      if (playbackStateRef.current.isPlaying) {
        const promise = audio.play();
        if (promise !== undefined) {
          promise.catch((err) => console.warn('Autoplay error on track change:', err));
        }
      }

    });
    return () => { cancelled = true; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [surah.id, reciter.id, moshafIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gapless Audio Preloader for Next Track ─────────────────
  const nextAudioRef = useRef(null);
  useEffect(() => {
    if (!nextAudioRef.current && typeof Audio !== 'undefined') {
      nextAudioRef.current = new Audio();
    }
    const currentId = surah?.id || 1;
    const nextSurahId = currentId < 114 ? currentId + 1 : 1;
    const nextRawUrl = getAudioUrlFromReciter(reciter, nextSurahId, moshafIndex || 0);
    if (nextRawUrl && nextAudioRef.current) {
      getCachedAudioUrl(nextRawUrl).then((nextUrl) => {
        if (nextAudioRef.current && nextAudioRef.current.src !== nextUrl) {
          nextAudioRef.current.src = nextUrl;
          nextAudioRef.current.preload = 'auto';
        }
      });
    }
  }, [surah.id, reciter, moshafIndex]);

  // ── Play / pause (with smooth micro volume fade) ───────────
  useEffect(() => {
    if (state.isPlaying) {
      if (!audio.src) return;
      audio.playbackRate = state.playbackSpeed;
      // Start muted and ramp volume up over 70ms to eliminate clicks/pops
      audio.volume = 0;
      const promise = audio.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            fadeVolume(audio, state.volume, 70);
          })
          .catch((err) => console.warn('Play error:', err));
      }
    } else {
      // Fade out volume over 60ms before pausing
      fadeVolume(audio, 0, 60).then(completed => {
        if (!completed || playbackStateRef.current.isPlaying) return;
        audio.pause();
        audio.volume = state.volume;
      });
    }
  }, [state.isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Volume & Playback Speed ───────────────────────────────
  useEffect(() => {
    if (state.isPlaying) {
      audio.volume = state.volume;
    }
  }, [state.volume]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { audio.playbackRate = state.playbackSpeed; }, [state.playbackSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── LocalStorage Sync (deduplicated — reducer already persists inline) ──
  // favouriteSurahIds, favouriteReciterIds, and bookmarkedVerses are persisted
  // directly in their reducer cases, so we do NOT duplicate them here.

  useEffect(() => {
    localStorage.setItem('quranly_listening_history', JSON.stringify(state.listeningHistory));
  }, [state.listeningHistory]);

  useEffect(() => {
    localStorage.setItem('quranly_daily_goal', JSON.stringify(state.dailyGoalMinutes));
  }, [state.dailyGoalMinutes]);

  // ── Save Last Played Track (Throttled Resume State) ──────
  // Save every 5 seconds based on an interval, reading timeStore.peek()
  // instead of depending on state.currentTime.
  useEffect(() => {
    const saveInterval = setInterval(() => {
      try {
        localStorage.setItem('quranly_last_track', JSON.stringify({
          track: state.currentTrack,
          currentTime: timeStore.peek()
        }));
      } catch { }
    }, 5000);
    // Also save immediately on track change
    try {
      localStorage.setItem('quranly_last_track', JSON.stringify({
        track: state.currentTrack,
        currentTime: timeStore.peek()
      }));
    } catch { }
    return () => clearInterval(saveInterval);
  }, [state.currentTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Background sound ──────────────────────────────────────
  useEffect(() => {
    const url = getSoundUrl(state.activeSound);
    if (!url) {
      bgAudio.pause();
      bgAudio.src = '';
    } else {
      if (bgAudio.src !== url) { bgAudio.src = url; bgAudio.load(); }
      bgAudio.play().catch(() => { });
    }
  }, [state.activeSound]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bgAudio.volume = state.soundVolume; }, [state.soundVolume]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sleep timer (wall-clock) ──────────────────────────────
  // Checked inside the timeupdate handler now to avoid depending on state.currentTime.
  // This ref lets the handler read current sleep state without stale closures.
  const sleepStateRef = useRef({ sleepMode: state.sleepMode, sleepEndTime: state.sleepEndTime });
  useEffect(() => {
    sleepStateRef.current = { sleepMode: state.sleepMode, sleepEndTime: state.sleepEndTime };
  }, [state.sleepMode, state.sleepEndTime]);

  // ── Audio event listeners (registered once) ───────────────
  const currentTrackRef = useRef(state.currentTrack);
  const fallbackIndexRef = useRef(0);
  useEffect(() => {
    currentTrackRef.current = state.currentTrack;
    fallbackIndexRef.current = 0;
  }, [state.currentTrack]);

  useEffect(() => {
    let lastTimeUpdate = 0;
    let lastSampleAt = performance.now();
    let lastMediaTime = audio.currentTime;
    let pendingSeconds = 0;
    let pendingReciter = currentTrackRef.current?.reciter?.id;
    const flushListening = () => {
      if (pendingSeconds > 0) {
        if (pendingReciter) recordListeningDuration(pendingReciter, pendingSeconds);
        dispatch({ type: 'ADD_LISTENING_TIME', payload: pendingSeconds });
        pendingSeconds = 0;
      }
    };
    const resetSample = () => { flushListening(); lastSampleAt = performance.now(); lastMediaTime = audio.currentTime; };

    const onTimeUpdate = () => {
      const now = Date.now();
      // Always update TimeStore (cheap — only notifies subscribers if value changed)
      if(!pendingResumeRef.current)timeStore.update(audio.currentTime);

      if (now - lastTimeUpdate >= 500) {
        lastTimeUpdate = now;
        // No dispatch needed — currentTime is in TimeStore, not React state.

        // Update MediaSession position state
        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && audio.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate || 1,
              position: Math.min(audio.currentTime, audio.duration)
            });
          } catch (_) {}
        }

        // Check sleep timer (moved from useEffect that depended on state.currentTime)
        const sleep = sleepStateRef.current;
        if (sleep.sleepMode === 'timer' && sleep.sleepEndTime && sleep.sleepEndTime !== -1 && Date.now() >= sleep.sleepEndTime) {
          dispatch({ type: 'PAUSE' });
          dispatch({ type: 'SET_SLEEP_TIMER', payload: null });
        }
      }

      const sampledAt = performance.now();
      const wallSeconds = Math.min(1.5, Math.max(0, (sampledAt - lastSampleAt) / 1000));
      const advanced = audio.currentTime - lastMediaTime;
      const reciterId = currentTrackRef.current?.reciter?.id;
      if (reciterId !== pendingReciter) { flushListening(); pendingReciter = reciterId; }
      if (!audio.paused && !audio.seeking && audio.readyState >= 2 && advanced > 0 && advanced < 3 * (audio.playbackRate || 1)) pendingSeconds += wallSeconds;
      lastSampleAt = sampledAt;
      lastMediaTime = audio.currentTime;
      if (pendingSeconds >= 5) flushListening();
    };
    const applyPendingResume = () => {
      const pending=pendingResumeRef.current;
      if(!pending)return;
      const loadedTrack=audioTrackRef.current;
      if(pending.surahId!==loadedTrack?.surahId||pending.reciterId!==loadedTrack?.reciterId)return;
      const position=Math.min(pending.position||0,Math.max(0,(audio.duration||pending.position||0)-0.1));
      if(position>0&&(!audio.seekable.length||audio.seekable.end(audio.seekable.length-1)<position))return;
      audio.currentTime=position;
      pendingResumeRef.current=null;
      timeStore.update(position);
    };
    const onLoadedMetadata = () => {
      audio.playbackRate = state.playbackSpeed;
      applyPendingResume();
      dispatch({ type: 'AUDIO_DURATION', payload: audio.duration });
      dispatch({ type: 'AUDIO_BUFFERING', payload: false });
    };
    const onWaiting = () => { resetSample(); dispatch({ type: 'AUDIO_BUFFERING', payload: true }); };
    const onCanPlay = () => {
      applyPendingResume();
      audio.playbackRate = state.playbackSpeed;
      dispatch({ type: 'AUDIO_BUFFERING', payload: false });
    };
    const onPlaying = () => {
      resetSample();
      const track=currentTrackRef.current;
      const key=`${playbackStateRef.current.currentUser?.uid||'guest'}:${track?.reciter?.id}:${track?.surah?.id}:${track?.moshafIndex||0}`;
      if(countedPlayRef.current!==key){countedPlayRef.current=key;recordReciterPlay(track?.reciter?.id,track?.surah?.id);}
    };
    const onEnded = () => {
      resetSample();
      countedPlayRef.current=null;
      const track = currentTrackRef.current;
      if (track?.reciter?.id && track?.surah?.id) {
        recordSurahCompleted(track.reciter.id, track.surah.id);
      }
      try { audio.currentTime = 0; } catch { }
      timeStore.update(0);
      if (playbackStateRef.current.repeatMode === 'one' && playbackStateRef.current.sleepEndTime !== -1) {
        audio.play().catch(error => dispatch({ type: 'AUDIO_ERROR', payload: error.message }));
      } else dispatch({ type: 'PLAY_NEXT' });
    };
    const onError = () => {
      const surahId = currentTrackRef.current?.surah?.id || 1;
      const reciterName = currentTrackRef.current?.reciter?.name || '';
      const mirrors = getAlternateAudioUrls(surahId, reciterName);

      if (fallbackIndexRef.current < mirrors.length) {
        const nextMirror = mirrors[fallbackIndexRef.current];
        fallbackIndexRef.current += 1;
        audio.src = nextMirror;
        audio.load();
        if (playbackStateRef.current.isPlaying) audio.play().catch(() => {
          const msgs = { 1: 'Playback aborted.', 2: 'Network error.', 3: 'Decoding error.', 4: 'Format not supported.' };
          dispatch({ type: 'AUDIO_ERROR', payload: msgs[audio.error?.code] || 'Retrying audio server...' });
        });
      } else {
        const msgs = { 1: 'Playback aborted.', 2: 'Network error.', 3: 'Decoding error.', 4: 'Format not supported.' };
        dispatch({ type: 'AUDIO_ERROR', payload: msgs[audio.error?.code] || 'Audio server unavailable.' });
      }
    };

    for (const event of ['pause','seeking','emptied']) audio.addEventListener(event, resetSample);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('playing',onPlaying);
    audio.addEventListener('progress',applyPendingResume);
    return () => {
      flushListening();
      for (const event of ['pause','seeking','emptied']) audio.removeEventListener(event, resetSample);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('playing',onPlaying);
      audio.removeEventListener('progress',applyPendingResume);
    };
  }, [state.playbackSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard Media & Shortcuts ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target?.closest('input, textarea, select, button, a, [contenteditable=true], [role=dialog]')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_PLAY' });
        triggerHaptic(15);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Media Session API (lock screen / notification bar) ───
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const { surah, reciter } = state.currentTrack;
    const artworkSrc = getReciterAvatarUrl(reciter.name);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${surah.nameEnglish} (${surah.nameArabic})`,
      artist: reciter.name,
      album: 'Quranly — Holy Quran',
      artwork: [
        { src: artworkSrc, sizes: '96x96', type: 'image/png' },
        { src: artworkSrc, sizes: '128x128', type: 'image/png' },
        { src: artworkSrc, sizes: '192x192', type: 'image/png' },
        { src: artworkSrc, sizes: '256x256', type: 'image/png' },
        { src: artworkSrc, sizes: '512x512', type: 'image/png' },
      ],
    });
    navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
  }, [state.currentTrack, state.isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => dispatch({ type: 'PLAY' }));
    navigator.mediaSession.setActionHandler('pause', () => dispatch({ type: 'PAUSE' }));
    navigator.mediaSession.setActionHandler('nexttrack', () => dispatch({ type: 'PLAY_NEXT' }));
    navigator.mediaSession.setActionHandler('previoustrack', () => dispatch({ type: 'PLAY_PREV' }));

    // Seek handlers for lock screen scrubbing
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null && audio) {
        audio.currentTime = details.seekTime;
        timeStore.update(details.seekTime);
        if ('setPositionState' in navigator.mediaSession && audio.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate,
              position: details.seekTime,
            });
          } catch (_) {}
        }
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      if (audio) {
        audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
        timeStore.update(audio.currentTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      if (audio) {
        audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration || 0);
        timeStore.update(audio.currentTime);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Action creators ──────────────────────────────────────
  const play = useCallback(() => dispatch({ type: 'PLAY' }), []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const togglePlay = useCallback(() => dispatch({ type: 'TOGGLE_PLAY' }), []);
  const playNext = useCallback(() => { pendingResumeRef.current=null; audio.pause(); audio.currentTime = 0; timeStore.update(0); dispatch({ type: 'PLAY_NEXT', payload: 'user' }); }, [audio, timeStore]);
  const playPrev = useCallback(() => { pendingResumeRef.current=null; const restart = audio.currentTime > 3; audio.currentTime = 0; timeStore.update(0); if (!restart) dispatch({ type: 'PLAY_PREV' }); }, [audio, timeStore]);
  const seek = useCallback((time) => { pendingResumeRef.current=null; audio.currentTime = time; timeStore.update(time); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setVolume = useCallback((v) => dispatch({ type: 'SET_VOLUME', payload: v }), []);
  const setSoundVolume = useCallback((v) => dispatch({ type: 'SET_SOUND_VOLUME', payload: v }), []);
  const cycleSpeed = useCallback(() => dispatch({ type: 'CYCLE_SPEED' }), []);
  const setTrack = useCallback((surah, reciter, queue, queueIndex, moshafIndex) => {
    pendingResumeRef.current=null;
    timeStore.update(0); // Reset time on track change
    dispatch({ type: 'SET_TRACK', payload: { surah, reciter, queue, queueIndex, moshafIndex } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setReciter = useCallback((r) => {pendingResumeRef.current=null;dispatch({ type: 'SET_RECITER', payload: r });}, []);
  const setMoshafIndex = useCallback((i) => {pendingResumeRef.current=null;dispatch({ type: 'SET_MOSHAF_INDEX', payload: i });}, []);
  const setQueue = useCallback((queue, queueIndex) => dispatch({ type: 'SET_QUEUE', payload: { queue, queueIndex } }), []);
  const shuffleQueue = useCallback(() => dispatch({ type: 'SHUFFLE_QUEUE' }), []);
  const toggleRepeat = useCallback(() => dispatch({ type: 'TOGGLE_REPEAT' }), []);
  const toggleFavouriteSurah = useCallback((id) => dispatch({ type: 'TOGGLE_FAVOURITE_SURAH', payload: id }), []);
  const toggleFavouriteReciter = useCallback((id) => dispatch({ type: 'TOGGLE_FAVOURITE_RECITER', payload: id }), []);
  const toggleBookmark = useCallback((surahId, verseNumber, verseText) =>
    dispatch({ type: 'TOGGLE_BOOKMARK', payload: { surahId, verseNumber, verseText } }), []);
  const setSound = useCallback((id) => dispatch({ type: 'SET_SOUND', payload: id }), []);
  const setSleepTimer = useCallback((val) => dispatch({ type: 'SET_SLEEP_TIMER', payload: val }), []);
  const setDailyGoal = useCallback((min) => dispatch({ type: 'SET_DAILY_GOAL', payload: min }), []);
  const openPlayer = useCallback(() => dispatch({ type: 'OPEN_PLAYER' }), []);
  const closePlayer = useCallback(() => dispatch({ type: 'CLOSE_PLAYER' }), []);
  const toggleSoundModal = useCallback(() => dispatch({ type: 'TOGGLE_SOUND_MODAL' }), []);
  const togglePlaylistDrawer = useCallback(() => dispatch({ type: 'TOGGLE_PLAYLIST_DRAWER' }), []);
  const toggleSleepTimerModal = useCallback(() => dispatch({ type: 'TOGGLE_SLEEP_TIMER_MODAL' }), []);
  const toggleQuranText = useCallback(() => dispatch({ type: 'TOGGLE_QURAN_TEXT' }), []);
  const toggleVolume = useCallback(() => dispatch({ type: 'TOGGLE_VOLUME' }), []);
  const closeModals = useCallback(() => dispatch({ type: 'CLOSE_MODALS' }), []);
  const setApiLanguage = useCallback((lang) => dispatch({ type: 'SET_API_LANGUAGE', payload: lang }), []);
  const getAudioUrl = useCallback((reciter, surahId, moshafIndex = 0) =>
    getAudioUrlFromReciter(reciter, surahId, moshafIndex), []);

  // Downloads are available without an account or entitlement.
  const downloadAbortRef = useRef(null);
  const cancelDownload = useCallback(() => downloadAbortRef.current?.abort(),[]);
  useEffect(() => () => downloadAbortRef.current?.abort(),[]);
  const downloadTrack = useCallback(async (targetSurah, targetReciter, moshafIndex = 0) => {
    if(downloadAbortRef.current) return {ok:false,error:'A download is already in progress. Wait for it or cancel it first.'};
    const audioUrl = getAudioUrlFromReciter(targetReciter, targetSurah.id, moshafIndex);
    if (!audioUrl) return { ok: false, error: 'No audio source is available for this recitation.' };

    const trackId = `${targetSurah.id}_${targetReciter.id}`;
    const controller = new AbortController();
    downloadAbortRef.current = controller;
    dispatch({ type: 'SET_DOWNLOADING', payload: { trackId, progress: 0 } });

    try {
      await downloadAudioTrack(audioUrl, targetSurah, targetReciter, (progress) => {
        dispatch({ type: 'SET_DOWNLOADING', payload: { trackId, progress } });
      }, controller.signal);
      dispatch({ type: 'SET_DOWNLOADED_TRACKS', payload: getDownloadedTracks() });
      return { ok: true };
    } catch (e) {
      console.error('Download failed:', e);
      return { ok: false, error: controller.signal.aborted ? 'Download cancelled.' : 'Download failed. Check your connection and try again.' };
    } finally {
      dispatch({ type: 'SET_DOWNLOADING', payload: { trackId: null, progress: 0 } });
      downloadAbortRef.current = null;
    }
  }, []);

  const removeTrack = useCallback(async (surahId, reciterId) => {
    const updated = await removeAudioTrack(surahId, reciterId);
    dispatch({ type: 'SET_DOWNLOADED_TRACKS', payload: updated });
  }, []);

  const isDownloaded = useCallback((surahId, reciterId) => {
    return isTrackDownloaded(surahId, reciterId);
  }, []);

  // ── Theme Manager ────────
  const setThemeMode = useCallback((mode) => {
    try { localStorage.setItem('quranly_theme', mode); } catch { }
    dispatch({ type: 'SET_THEME_MODE', payload: mode });
  }, []);
  const setAppTheme = useCallback((theme) => {
    try { localStorage.setItem('quranly_app_theme', theme); } catch { }
    dispatch({ type: 'SET_APP_THEME', payload: theme });
  }, []);

  const openAuthModal = useCallback(() => dispatch({ type: 'SET_AUTH_MODAL_OPEN', payload: true }), []);
  const closeAuthModal = useCallback(() => dispatch({ type: 'SET_AUTH_MODAL_OPEN', payload: false }), []);

  // Custom Playlist Actions
  const saveStudyProgress = useCallback(patch => dispatch({type:'SAVE_STUDY_PROGRESS',payload:patch}),[]);
  const renamePlaylist = useCallback((id,name) => dispatch({type:'RENAME_PLAYLIST',payload:{id,name}}),[]);
  const createPlaylist = useCallback((name) => dispatch({ type: 'CREATE_PLAYLIST', payload: name }), []);
  const deletePlaylist = useCallback((id) => dispatch({ type: 'DELETE_PLAYLIST', payload: id }), []);
  const addSurahToPlaylist = useCallback((playlistId, surahId) =>
    dispatch({ type: 'ADD_TO_PLAYLIST', payload: { playlistId, surahId } }), []);
  const removeSurahFromPlaylist = useCallback((playlistId, surahId) =>
    dispatch({ type: 'REMOVE_FROM_PLAYLIST', payload: { playlistId, surahId } }), []);

  const setPlayerNatureTheme = useCallback((theme) => {
    try { localStorage.setItem('quranly_player_nature_theme', theme); } catch { }
    dispatch({ type: 'SET_PLAYER_NATURE_THEME', payload: theme });
  }, []);

  const saveReflection = useCallback((reflection) => dispatch({ type: 'SAVE_REFLECTION', payload: reflection }), []);
  const deleteReflection = useCallback((id) => dispatch({ type: 'DELETE_REFLECTION', payload: id }), []);

  const openReciterProfile = useCallback((reciter) =>
    dispatch({ type: 'SET_ACTIVE_PROFILE_RECITER', payload: reciter }), []);

  const createGroupKhatm = useCallback((khatm) => dispatch({ type: 'CREATE_GROUP_KHATM', payload: khatm }), []);
  const claimKhatmJuz = useCallback((data) => dispatch({ type: 'CLAIM_KHATM_JUZ', payload: data }), []);
  const deleteGroupKhatm = useCallback((id) => dispatch({ type: 'DELETE_GROUP_KHATM', payload: id }), []);

  // ── Memoized Stable Actions (never changes reference) ────
  const incrementAzkarCount = useCallback((amt = 1) => dispatch({ type: 'INCREMENT_AZKAR_COUNT', payload: amt }), []);
  const setDailyAzkarGoal = useCallback((goal) => dispatch({ type: 'SET_DAILY_AZKAR_GOAL', payload: goal }), []);

  const actions = useMemo(() => ({
    play, pause, togglePlay, playNext, playPrev, seek, cycleSpeed,
    setVolume, setSoundVolume,
    setTrack, setReciter, setMoshafIndex, setQueue, shuffleQueue, toggleRepeat,
    toggleFavouriteSurah, toggleFavouriteReciter, toggleBookmark,
    setSound, setSleepTimer, setDailyGoal,
    openPlayer, closePlayer, toggleSoundModal, togglePlaylistDrawer,
    toggleSleepTimerModal, toggleQuranText, toggleVolume, closeModals,
    setApiLanguage, getAudioUrl,
    incrementAzkarCount,
    setDailyAzkarGoal,
    downloadTrack, cancelDownload, removeTrack, isDownloaded, setThemeMode, setAppTheme, setPlayerNatureTheme,
    openAuthModal, closeAuthModal, openReciterProfile,
    saveStudyProgress, renamePlaylist, createPlaylist, deletePlaylist, addSurahToPlaylist, removeSurahFromPlaylist,
    saveReflection, deleteReflection,
    createGroupKhatm, claimKhatmJuz, deleteGroupKhatm,
  }), [
    play, pause, togglePlay, playNext, playPrev, seek, cycleSpeed,
    setVolume, setSoundVolume,
    setTrack, setReciter, setMoshafIndex, setQueue, shuffleQueue, toggleRepeat,
    toggleFavouriteSurah, toggleFavouriteReciter, toggleBookmark,
    setSound, setSleepTimer, setDailyGoal,
    openPlayer, closePlayer, toggleSoundModal, togglePlaylistDrawer,
    toggleSleepTimerModal, toggleQuranText, toggleVolume, closeModals,
    setApiLanguage, getAudioUrl,
    incrementAzkarCount,
    setDailyAzkarGoal,
    downloadTrack, cancelDownload, removeTrack, isDownloaded, setThemeMode, setAppTheme, setPlayerNatureTheme,
    openAuthModal, closeAuthModal, openReciterProfile,
    saveStudyProgress, renamePlaylist, createPlaylist, deletePlaylist, addSurahToPlaylist, removeSurahFromPlaylist,
    saveReflection, deleteReflection,
    createGroupKhatm, claimKhatmJuz, deleteGroupKhatm,
  ]);

  // ── Memoized Context Slices ─────────────────────────────────
  // Each slice only creates a new object when its specific fields change,
  // so consumers of one slice don't re-render when another slice updates.

  const playbackValue = useMemo(() => ({
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    isBuffering: state.isBuffering,
    duration: state.duration,
    audioError: state.audioError,
    queue: state.queue,
    queueIndex: state.queueIndex,
    repeatMode: state.repeatMode,
    shuffleOn: state.shuffleOn,
    playbackSpeed: state.playbackSpeed,
    volume: state.volume,
    activeSound: state.activeSound,
    soundVolume: state.soundVolume,
    sleepMinutes: state.sleepMinutes,
    sleepEndTime: state.sleepEndTime,
    sleepMode: state.sleepMode,
  }), [
    state.currentTrack, state.isPlaying, state.isBuffering, state.duration,
    state.audioError, state.queue, state.queueIndex, state.repeatMode,
    state.shuffleOn, state.playbackSpeed, state.volume,
    state.activeSound, state.soundVolume,
    state.sleepMinutes, state.sleepEndTime, state.sleepMode,
  ]);

  const dataValue = useMemo(() => ({
    reciters: state.reciters,
    surahs: state.surahs,
    riwayat: state.riwayat,
    moshaf: state.moshaf,
    radios: state.radios,
    tafasir: state.tafasir,
    apiLanguage: state.apiLanguage,
    apiLoading: state.apiLoading,
    apiError: state.apiError,
  }), [
    state.reciters, state.surahs, state.riwayat, state.moshaf,
    state.radios, state.tafasir, state.apiLanguage, state.apiLoading, state.apiError,
  ]);

  const userDataValue = useMemo(() => ({
    currentUser: state.currentUser,
    isCloudLoaded: state.isCloudLoaded,
    cloudBackupStatus,
    favouriteSurahIds: state.favouriteSurahIds,
    favouriteReciterIds: state.favouriteReciterIds,
    bookmarkedVerses: state.bookmarkedVerses,
    customPlaylists: state.customPlaylists,
    verseReflections: state.verseReflections,
    groupKhatms: state.groupKhatms,
    listeningHistory: state.listeningHistory,
    dailyGoalMinutes: state.dailyGoalMinutes,
    readingPage: state.readingPage,
    memorizationProgress: state.memorizationProgress,
    recentReciterIds: state.recentReciterIds,
    completedAzkarCount: state.completedAzkarCount,
    dailyAzkarGoal: state.dailyAzkarGoal,
    downloadedTracks: state.downloadedTracks,
    downloadingTrackId: state.downloadingTrackId,
    downloadProgress: state.downloadProgress,
    themeMode: state.themeMode,
    appTheme: state.appTheme,
    playerNatureTheme: state.playerNatureTheme,
  }), [
    state.currentUser, state.isCloudLoaded, cloudBackupStatus,
    state.favouriteSurahIds, state.favouriteReciterIds, state.bookmarkedVerses,
    state.customPlaylists, state.verseReflections, state.groupKhatms,
    state.readingPage, state.memorizationProgress,
    state.listeningHistory, state.dailyGoalMinutes, state.recentReciterIds,
    state.completedAzkarCount, state.dailyAzkarGoal,
    state.downloadedTracks, state.downloadingTrackId, state.downloadProgress,
    state.themeMode, state.appTheme, state.playerNatureTheme,
  ]);

  const uiStateValue = useMemo(() => ({
    isPlayerOpen: state.isPlayerOpen,
    isSoundModalOpen: state.isSoundModalOpen,
    isPlaylistDrawerOpen: state.isPlaylistDrawerOpen,
    isSleepTimerOpen: state.isSleepTimerOpen,
    isQuranTextOpen: state.isQuranTextOpen,
    isVolumeOpen: state.isVolumeOpen,
    activeProfileReciter: state.activeProfileReciter,
    isAuthModalOpen: state.isAuthModalOpen,
  }), [
    state.isPlayerOpen, state.isSoundModalOpen, state.isPlaylistDrawerOpen,
    state.isSleepTimerOpen, state.isQuranTextOpen, state.isVolumeOpen,
    state.activeProfileReciter, state.isAuthModalOpen,
  ]);

  // Combined value for backward-compat (existing usePlayer() still works)
  // Components using usePlayer() still re-render on any state change,
  // but they can be incrementally migrated to specific hooks.
  const value = useMemo(() => ({
    ...state,
    ...actions,
    // Provide currentTime via timeStore for backward compat
    currentTime: timeStore.peek(),
    completedAzkarCount: state.completedAzkarCount,
    dailyAzkarGoal: state.dailyAzkarGoal,
  }), [state, actions, timeStore]);

  return (
    <PlaybackContext.Provider value={playbackValue}>
      <DataContext.Provider value={dataValue}>
        <UserDataContext.Provider value={userDataValue}>
          <UIStateContext.Provider value={uiStateValue}>
            <TimeStoreContext.Provider value={timeStore}>
              <PlayerContext.Provider value={value}>
                <PlayerActionsContext.Provider value={actions}>
                  {children}
                  <AuthModal
                    isOpen={state.isAuthModalOpen}
                    onClose={closeAuthModal}
                  />
                </PlayerActionsContext.Provider>
              </PlayerContext.Provider>
            </TimeStoreContext.Provider>
          </UIStateContext.Provider>
        </UserDataContext.Provider>
      </DataContext.Provider>
    </PlaybackContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export { usePlayback, useData, useUserData, useUIState, useCurrentTime, usePlayerActions } from '../hooks/usePlayerHooks';

