import type { Puzzle } from '../types';

/** The letters a run spells, in the order it was traced. */
export const spell = (puzzle: Puzzle, cells: number[]): string =>
  cells.map((index) => puzzle.letters[index]).join('');

export const openSquares = (puzzle: Puzzle): number =>
  puzzle.blocked.filter((isBlocked) => !isBlocked).length;

export const coverage = (placed: number[][]): number =>
  placed.reduce((total, cells) => total + cells.length, 0);

/** A run may go anywhere it does not sit on top of one already down. */
export const overlaps = (placed: number[][], path: number[]): boolean => {
  const taken = new Set(placed.flat());
  return path.some((index) => taken.has(index));
};

/**
 * Rows claim runs by length: each row takes the first run of exactly its own
 * length that no earlier row has claimed. A run whose length fits no free row
 * still sits on the board — it just has no row to show it.
 */
export function assignRows(puzzle: Puzzle, placed: number[][]) {
  const slotOf = new Map<number, number>();
  const rowRuns: (number[] | null)[] = [];
  const spare = placed.map((cells, index) => ({ cells, index }));

  for (const word of puzzle.words) {
    const at = spare.findIndex((run) => run.cells.length === word.length);
    if (at === -1) {
      rowRuns.push(null);
      continue;
    }
    const [run] = spare.splice(at, 1);
    slotOf.set(run.index, rowRuns.length);
    rowRuns.push(run.cells);
  }

  return { slotOf, rowRuns };
}

/**
 * Runs go down freely, right or wrong, so the board is only judged once every
 * open square is used — and then all the words are checked together.
 */
export function judge(puzzle: Puzzle, placed: number[][]) {
  const used = coverage(placed);
  const full = used === openSquares(puzzle);
  if (!full) return { used, full, solved: false };

  const remaining = [...puzzle.words];
  for (const cells of placed) {
    const at = remaining.indexOf(spell(puzzle, cells));
    if (at === -1) return { used, full, solved: false };
    remaining.splice(at, 1);
  }
  return { used, full, solved: remaining.length === 0 };
}
