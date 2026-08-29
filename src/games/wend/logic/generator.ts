import { wordsOfLength } from '../data/words';
import type { Difficulty, Puzzle } from '../types';

export const SHAPE: Record<Difficulty, { size: number; lengths: number[] }> = {
  Easy: { size: 6, lengths: [4, 5, 6, 7] },
  Medium: { size: 6, lengths: [5, 6, 7, 8] },
  Hard: { size: 7, lengths: [5, 7, 8, 9, 10] },
};

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const neighbours = (size: number, index: number): number[] => {
  const r = Math.floor(index / size);
  const c = index % size;
  return [
    r > 0 ? index - size : -1,
    r < size - 1 ? index + size : -1,
    c > 0 ? index - 1 : -1,
    c < size - 1 ? index + 1 : -1,
  ].filter((n) => n >= 0);
};

/**
 * Carves one self-avoiding path of `length` cells out of whatever is still
 * free, by depth-first search with the neighbours tried in random order.
 */
function carvePath(size: number, free: boolean[], length: number): number[] | null {
  const starts = shuffle(free.map((isFree, index) => (isFree ? index : -1)).filter((i) => i >= 0));

  for (const start of starts) {
    const path: number[] = [];
    const onPath = new Set<number>();

    const walk = (cell: number): boolean => {
      path.push(cell);
      onPath.add(cell);
      if (path.length === length) return true;

      for (const next of shuffle(neighbours(size, cell))) {
        if (!free[next] || onPath.has(next)) continue;
        if (walk(next)) return true;
      }

      path.pop();
      onPath.delete(cell);
      return false;
    };

    if (walk(start)) return path;
  }

  return null;
}

/**
 * Paths are carved first and the leftovers become the blocked cells, rather
 * than blocking cells up front and hoping the words still fit. That way a
 * board can never be generated that cannot be finished.
 *
 * The letters are ours to choose, so once the paths exist any word of the
 * right length can simply be written along one — no packing search needed.
 */
export function generatePuzzle(difficulty: Difficulty): Puzzle {
  const { size, lengths } = SHAPE[difficulty];

  for (let attempt = 0; attempt < 300; attempt++) {
    const free = new Array<boolean>(size * size).fill(true);
    const paths: number[][] = [];

    // Longest first: the long paths are the ones that struggle for room.
    const ordered = [...lengths].sort((a, b) => b - a);
    let failed = false;

    for (const length of ordered) {
      const path = carvePath(size, free, length);
      if (!path) {
        failed = true;
        break;
      }
      for (const cell of path) free[cell] = false;
      paths.push(path);
    }
    if (failed) continue;

    // Leftover cells are blocked. Too many strewn about looks like noise
    // rather than a shape, so prefer boards whose blanks clump together.
    const blocked = free.map((isFree) => isFree);
    const strays = blocked.filter((isBlocked, index) =>
      isBlocked && neighbours(size, index).every((n) => !blocked[n]),
    ).length;
    if (strays > 2 && attempt < 250) continue;

    const chosen: string[] = [];
    const letters = new Array<string>(size * size).fill('');

    const byLengthAsc = paths
      .map((path) => ({ path, length: path.length }))
      .sort((a, b) => a.length - b.length);

    let wordless = false;
    for (const { path, length } of byLengthAsc) {
      const options = wordsOfLength(length, chosen);
      if (options.length === 0) {
        wordless = true;
        break;
      }
      const word = options[Math.floor(Math.random() * options.length)];
      chosen.push(word);
      path.forEach((cell, i) => {
        letters[cell] = word[i];
      });
    }
    if (wordless) continue;

    return {
      size,
      letters,
      blocked,
      words: chosen,
      paths: byLengthAsc.map(({ path }) => path),
    };
  }

  throw new Error(`Could not generate a ${size}x${size} Wend board`);
}
