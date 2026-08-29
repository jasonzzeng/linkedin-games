import type { BoardState } from "./game";
import type { Difficulty, Puzzle } from "./types";

// Namespaced under the hub app so it cannot collide with the other games.
const PREFIX = "lig:queens:v1";

export interface Settings {
  showClock: boolean;
  autoCheck: boolean;
  autoPlaceX: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  showClock: true,
  autoCheck: true,
  autoPlaceX: true,
};

export interface Stats {
  played: number;
  solved: number;
  bestMs: number | null;
  streak: number;
  bestStreak: number;
  hintsUsed: number;
}

export const EMPTY_STATS: Stats = {
  played: 0,
  solved: 0,
  bestMs: null,
  streak: 0,
  bestStreak: 0,
  hintsUsed: 0,
};

export interface SavedGame {
  puzzle: Puzzle;
  board: BoardState;
  elapsedMs: number;
  solved: boolean;
  hintsUsed: number;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}:${key}`);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the game still works, it just won't resume */
  }
}

export const loadSettings = () => read<Settings>("settings", DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => write("settings", s);

export const loadStats = (d: Difficulty) => read<Stats>(`stats:${d}`, EMPTY_STATS);
export const saveStats = (d: Difficulty, s: Stats) => write(`stats:${d}`, s);

export function loadGame(d: Difficulty): SavedGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}:game:${d}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    if (!parsed?.puzzle?.regions?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const saveGame = (d: Difficulty, game: SavedGame) => write(`game:${d}`, game);

export const loadDifficulty = (): Difficulty => {
  const value = read<{ value: Difficulty }>("difficulty", { value: "easy" }).value;
  return value === "easy" || value === "medium" || value === "hard" ? value : "easy";
};
export const saveDifficulty = (d: Difficulty) => write("difficulty", { value: d });
