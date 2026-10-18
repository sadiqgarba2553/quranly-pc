import { createContext } from 'react';

/**
 * Split contexts for PlayerProvider — eliminates cascading re-renders.
 * 
 * Instead of one monolithic PlayerContext that re-renders 32+ consumers
 * on every state change, we split into focused contexts:
 *
 * PlaybackContext  — track, playing, buffering, queue, volume, etc.
 * DataContext      — reciters, surahs, API data (changes once on load)
 * UserDataContext  — favourites, playlists, bookmarks, pro status, theme
 * UIStateContext   — modal/panel open state (changes on user interaction only)
 *
 * currentTime is handled separately via TimeStore (ref + useSyncExternalStore)
 * to avoid any context re-renders during audio playback.
 */

export const PlaybackContext = createContext(null);
export const DataContext = createContext(null);
export const UserDataContext = createContext(null);
export const UIStateContext = createContext(null);
export const TimeStoreContext = createContext(null);
