import { useCallback, useEffect, useRef } from "react";

/**
 * `setTimeout` that cleans itself up when the component unmounts.
 *
 * The pattern this replaces — a bare `setTimeout(() => setState(...), 2000)`
 * inside a click handler — keeps a live callback pointing at a component that
 * may already be gone, which React warns about and which quietly holds the
 * whole subtree in memory until it fires.
 *
 * Usage:
 *   const after = useTimers();
 *   after(() => setShowTooltip(false), 2000);
 */
export function useTimers() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
    return id;
  }, []);
}
