import { attackedBy, colOf, rowOf } from "./board";
import type { Puzzle } from "./types";

export const EMPTY = 0;
export const MARK = 1;
export const QUEEN = 2;

export interface BoardState {
  /** Cells holding a crown. */
  queens: number[];
  /** Cells the player crossed out by hand (auto X's are derived, not stored). */
  userX: number[];
}

export const emptyBoard = (): BoardState => ({ queens: [], userX: [] });

export interface Derived {
  /** EMPTY | MARK | QUEEN per cell. */
  display: Uint8Array;
  /** Cells painted red by auto-check. */
  conflictCells: Set<number>;
  /** Crowns that take part in a conflict. */
  conflictQueens: Set<number>;
  /** True when a cell shows an X only because a crown put it there. */
  autoMark: Uint8Array;
  solved: boolean;
}

/** Cells ruled out by each cell — cached per puzzle, since it never changes. */
const attackCache = new WeakMap<Puzzle, number[][]>();

export function attacksOf(puzzle: Puzzle): number[][] {
  let cached = attackCache.get(puzzle);
  if (!cached) {
    cached = Array.from({ length: puzzle.size * puzzle.size }, (_, i) =>
      attackedBy(puzzle.size, puzzle.regions, i),
    );
    attackCache.set(puzzle, cached);
  }
  return cached;
}

export function derive(puzzle: Puzzle, state: BoardState, autoPlaceX: boolean): Derived {
  const { size, regions } = puzzle;
  const n2 = size * size;
  const display = new Uint8Array(n2);
  const autoMark = new Uint8Array(n2);
  const attacks = attacksOf(puzzle);

  if (autoPlaceX) {
    for (const q of state.queens) for (const cell of attacks[q]) autoMark[cell] = 1;
  }
  for (const cell of state.userX) display[cell] = MARK;
  if (autoPlaceX) for (let i = 0; i < n2; i++) if (autoMark[i]) display[i] = MARK;
  // A crown always wins over an X on the same square.
  for (const q of state.queens) display[q] = QUEEN;
  for (const q of state.queens) autoMark[q] = 0;
  for (const cell of state.userX) autoMark[cell] = 0;

  const conflictQueens = new Set<number>();
  const conflictRegions = new Set<number>();
  for (let a = 0; a < state.queens.length; a++) {
    for (let b = a + 1; b < state.queens.length; b++) {
      const qa = state.queens[a];
      const qb = state.queens[b];
      const ra = rowOf(size, qa);
      const rb = rowOf(size, qb);
      const ca = colOf(size, qa);
      const cb = colOf(size, qb);
      const sameRegion = regions[qa] === regions[qb];
      const touching = Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1;
      if (ra === rb || ca === cb || sameRegion || touching) {
        conflictQueens.add(qa);
        conflictQueens.add(qb);
        if (sameRegion) conflictRegions.add(regions[qa]);
      }
    }
  }

  const conflictCells = new Set<number>(conflictQueens);
  if (conflictRegions.size) {
    for (let i = 0; i < n2; i++) if (conflictRegions.has(regions[i])) conflictCells.add(i);
  }

  const solved = state.queens.length === size && conflictQueens.size === 0;
  return { display, conflictCells, conflictQueens, autoMark, solved };
}

/* --------------------------- state transitions ---------------------------- */

const without = (arr: number[], value: number) => arr.filter((v) => v !== value);
const with_ = (arr: number[], value: number) => (arr.includes(value) ? arr : [...arr, value]);

/** Tap cycle: empty → X → crown → empty. */
export function tapCell(state: BoardState, cell: number, shown: number): BoardState {
  if (shown === QUEEN) {
    return { queens: without(state.queens, cell), userX: without(state.userX, cell) };
  }
  if (shown === MARK) {
    return { queens: with_(state.queens, cell), userX: without(state.userX, cell) };
  }
  return { ...state, userX: with_(state.userX, cell) };
}

/** Drag painting: add or erase the player's own X's, never crowns. */
export function paintCell(state: BoardState, cell: number, mode: "mark" | "erase"): BoardState {
  if (state.queens.includes(cell)) return state;
  if (mode === "mark") {
    return state.userX.includes(cell) ? state : { ...state, userX: [...state.userX, cell] };
  }
  return state.userX.includes(cell) ? { ...state, userX: without(state.userX, cell) } : state;
}

export const sameBoard = (a: BoardState, b: BoardState) =>
  a.queens.length === b.queens.length &&
  a.userX.length === b.userX.length &&
  a.queens.every((q) => b.queens.includes(q)) &&
  a.userX.every((x) => b.userX.includes(x));

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
