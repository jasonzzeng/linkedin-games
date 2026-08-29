import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A wall-clock timer. Counting from a start timestamp rather than
 * incrementing a counter keeps it honest when the tab is backgrounded
 * and the interval is throttled.
 */
export function useTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const accumulated = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now();
    const tick = () => {
      setElapsed(accumulated.current + Math.floor((Date.now() - startedAt.current) / 1000));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => {
      accumulated.current += Math.floor((Date.now() - startedAt.current) / 1000);
      window.clearInterval(id);
    };
  }, [running]);

  const reset = useCallback(() => {
    accumulated.current = 0;
    startedAt.current = Date.now();
    setElapsed(0);
  }, []);

  return { elapsed, reset };
}
