import { useCallback, useEffect, useState } from 'react';
import { loadValue, saveValue } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const apply = (preference: ThemePreference) => {
  const root = document.documentElement;
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
};

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    loadValue<ThemePreference>('theme', 'system'),
  );

  useEffect(() => {
    apply(preference);
    saveValue('theme', preference);
  }, [preference]);

  const cycle = useCallback(() => {
    setPreference((current) =>
      current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system',
    );
  }, []);

  return { preference, setPreference, cycle };
}
