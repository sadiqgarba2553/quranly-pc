import { useRef, useEffect, useState, useContext, createContext } from 'react';

/**
 * PlayerActionsContext — holds stable action functions that never change reference.
 * Components that only need actions (BottomNav, etc.) won't re-render on state changes.
 */
export const PlayerActionsContext = createContext(null);

/**
 * usePlayerActions — returns only the stable action functions from PlayerContext.
 * These are memoized with useCallback and never change, so this hook NEVER causes re-renders.
 */
export function usePlayerActions() {
  const ctx = useContext(PlayerActionsContext);
  if (!ctx) throw new Error('usePlayerActions must be used within PlayerProvider');
  return ctx;
}
