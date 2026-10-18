import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Generic API hook with loading/error state and abort-signal cleanup.
 *
 * @param {(signal: AbortSignal) => Promise<any>} fetchFn  - A function that accepts an AbortSignal and returns a Promise
 * @param {any[]} deps - Dependencies that trigger a re-fetch (like language)
 * @returns {{ data: any, loading: boolean, error: Error|null, refetch: Function }}
 */
export function useApi(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Keep stable reference to fetchFn
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const execute = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchFnRef.current(controller.signal)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // Silently ignore aborts
        setError(err);
        setLoading(false);
      });

    return controller;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = execute();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: execute };
}
