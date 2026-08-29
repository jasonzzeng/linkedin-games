import { useCallback, useEffect, useRef, useState } from 'react';
import { loadValue, saveValue } from './storage';

/** useState that mirrors into localStorage under a namespaced key. */
export function usePersistedState<T>(name: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadValue(name, initial));
  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => {
    saveValue(nameRef.current, value);
  }, [value]);

  return [value, setValue] as const;
}

/** Tracks a personal best (lowest wins) per game + difficulty. */
export function useBestTime(gameId: string, difficulty: string) {
  const name = `best.${gameId}.${difficulty}`;
  const [best, setBest] = useState<number | null>(() => loadValue<number | null>(name, null));

  useEffect(() => {
    setBest(loadValue<number | null>(name, null));
  }, [name]);

  const submit = useCallback(
    (seconds: number): { isRecord: boolean; best: number } => {
      const previous = loadValue<number | null>(name, null);
      if (previous === null || seconds < previous) {
        saveValue(name, seconds);
        setBest(seconds);
        return { isRecord: previous !== null, best: seconds };
      }
      return { isRecord: false, best: previous };
    },
    [name],
  );

  return { best, submit };
}
