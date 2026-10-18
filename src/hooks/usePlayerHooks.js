import { useContext, useSyncExternalStore } from 'react';
import {
  PlaybackContext,
  DataContext,
  UserDataContext,
  UIStateContext,
  TimeStoreContext,
} from '../context/contexts';
import { PlayerActionsContext } from './usePlayerState';

export { usePlayerActions } from './usePlayerState';

/**
 * Focused selector hooks for Quranly.
 *
 * Each hook subscribes to exactly one context slice, so components
 * only re-render when the data they actually use changes.
 *
 * Migration guide:
 *   Before: const { isPlaying, togglePlay } = usePlayer();
 *   After:  const { isPlaying } = usePlayback();
 *           const { togglePlay } = usePlayerActions();
 */

// ── Playback State ──────────────────────────────────────────
// currentTrack, isPlaying, isBuffering, duration, audioError,
// queue, queueIndex, repeatMode, shuffleOn, playbackSpeed,
// volume, activeSound, soundVolume, sleepMinutes, sleepEndTime, sleepMode
export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within PlayerProvider');
  return ctx;
}

// ── API Data ────────────────────────────────────────────────
// reciters, surahs, riwayat, moshaf, radios, tafasir,
// apiLanguage, apiLoading, apiError
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within PlayerProvider');
  return ctx;
}

// ── User Data & Preferences ────────────────────────────────
// currentUser, isPro, isCloudLoaded, favouriteSurahIds, favouriteReciterIds,
// bookmarkedVerses, customPlaylists, verseReflections, groupKhatms,
// listeningHistory, dailyGoalMinutes, completedAzkarCount, dailyAzkarGoal,
// recentReciterIds, downloadedTracks, downloadingTrackId, downloadProgress,
// themeMode, appTheme, playerNatureTheme
export function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData must be used within PlayerProvider');
  return ctx;
}

// ── UI State ────────────────────────────────────────────────
// isPlayerOpen, isSoundModalOpen, isPlaylistDrawerOpen, isSleepTimerOpen,
// isQuranTextOpen, isVolumeOpen, activeProfileReciter,
// isSubscriptionModalOpen, isAuthModalOpen
export function useUIState() {
  const ctx = useContext(UIStateContext);
  if (!ctx) throw new Error('useUIState must be used within PlayerProvider');
  return ctx;
}

// ── Current Time (ref-based, zero-cost for non-subscribers) ─
// Returns the live audio currentTime. Only components calling this
// hook re-render on time updates. All others are immune.
export function useCurrentTime() {
  const store = useContext(TimeStoreContext);
  if (!store) throw new Error('useCurrentTime must be used within PlayerProvider');
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
