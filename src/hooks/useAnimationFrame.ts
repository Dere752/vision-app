import { useRef, useEffect, useCallback } from 'react';

export function useAnimationFrame(
  callback: (deltaMs: number) => void,
  active: boolean,
  fpsLimit = 60
) {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const minInterval = 1000 / fpsLimit;

  const loop = useCallback((time: number) => {
    const delta = time - lastTimeRef.current;
    if (delta >= minInterval) {
      lastTimeRef.current = time - (delta % minInterval);
      callbackRef.current(delta);
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [minInterval]);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, loop]);
}
