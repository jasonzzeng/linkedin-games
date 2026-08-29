/**
 * localStorage is unavailable in private windows and some embedded views,
 * where the accessor itself throws. Every read and write goes through here.
 */
const NAMESPACE = 'lig';

const key = (name: string) => `${NAMESPACE}.${name}`;

export function loadValue<T>(name: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key(name));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveValue(name: string, value: unknown): void {
  try {
    window.localStorage.setItem(key(name), JSON.stringify(value));
  } catch {
    /* storage full, blocked, or unavailable — the game still plays */
  }
}

export function clearValue(name: string): void {
  try {
    window.localStorage.removeItem(key(name));
  } catch {
    /* no-op */
  }
}
