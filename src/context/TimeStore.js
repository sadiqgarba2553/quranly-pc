/**
 * TimeStore — External store for audio currentTime.
 *
 * Keeps currentTime out of React state entirely. Components subscribe via
 * useSyncExternalStore, so only the components that actually need live
 * playback time re-render — not the entire 32-component tree.
 *
 * The audio timeupdate handler calls store.update() directly.
 */

export function createTimeStore(initialTime = 0) {
  let currentTime = initialTime;
  const listeners = new Set();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getSnapshot() {
      return currentTime;
    },

    // Server snapshot for SSR compat (Capacitor is client-only, but React 19 requires it)
    getServerSnapshot() {
      return 0;
    },

    update(time) {
      // Only notify if time actually changed meaningfully (avoid sub-ms noise)
      if (Math.abs(time - currentTime) < 0.05) return;
      currentTime = time;
      for (const listener of listeners) {
        listener();
      }
    },

    // Direct read without subscription (for effects, localStorage saves, etc.)
    peek() {
      return currentTime;
    },
  };
}
