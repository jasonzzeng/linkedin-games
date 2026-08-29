import { classify } from '../types';
import type { Difficulty, Puzzle, Rect, Seed } from '../types';
import { countTilings } from './solver';

export const SIZE_FOR: Record<Difficulty, number> = {
  Easy: 5,
  Medium: 6,
  Hard: 7,
};

/** Largest patch allowed, to keep boards from becoming one giant slab. */
const MAX_SIDE = 4;

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/**
 * Lays random rectangles down in reading order. Anchoring each one at the
 * first uncovered cell is not a simplification — in an exact tiling that is
 * necessarily where the next rectangle's corner sits — so this can reach any
 * tiling, and a 1x1 always fits, so it never dead-ends.
 */
function randomTiling(size: number): Rect[] {
  const covered = new Uint8Array(size * size);
  const patches: Rect[] = [];

  for (;;) {
    let start = -1;
    for (let i = 0; i < covered.length; i++) {
      if (!covered[i]) {
        start = i;
        break;
      }
    }
    if (start === -1) break;

    const x0 = start % size;
    const y0 = Math.floor(start / size);

    const options: Rect[] = [];
    for (let h = 1; h <= MAX_SIDE && y0 + h <= size; h++) {
      for (let w = 1; w <= MAX_SIDE && x0 + w <= size; w++) {
        let clear = true;
        for (let y = y0; y < y0 + h && clear; y++) {
          for (let x = x0; x < x0 + w; x++) {
            if (covered[y * size + x]) {
              clear = false;
              break;
            }
          }
        }
        if (!clear) break;
        options.push({ x: x0, y: y0, w, h });
      }
    }

    // Favour chunkier patches; all-1x1 boards are dull and barely a puzzle.
    const weighted = options.flatMap((rect) =>
      Array<Rect>(Math.max(1, rect.w * rect.h)).fill(rect),
    );
    const pick = weighted[Math.floor(Math.random() * weighted.length)];

    for (let y = pick.y; y < pick.y + pick.h; y++) {
      for (let x = pick.x; x < pick.x + pick.w; x++) covered[y * size + x] = 1;
    }
    patches.push(pick);
  }

  return patches;
}

export function generatePuzzle(difficulty: Difficulty): Puzzle {
  const size = SIZE_FOR[difficulty];

  for (let attempt = 0; attempt < 600; attempt++) {
    const solution = randomTiling(size);
    if (solution.length < 4) continue;

    // One marker per patch, dropped on a random cell inside it, initially
    // carrying everything it knows: its silhouette and its area.
    const seeds: Seed[] = solution.map((patch) => {
      const x = patch.x + Math.floor(Math.random() * patch.w);
      const y = patch.y + Math.floor(Math.random() * patch.h);
      return {
        index: y * size + x,
        type: classify(patch.w, patch.h),
        area: patch.w * patch.h,
      };
    });

    if (countTilings(size, seeds, 2) !== 1) continue;

    // Then take information away for as long as the board still has one
    // answer, so the markers that remain are the ones actually doing work.
    const relaxations = shuffle(
      seeds.flatMap((_, index) => [
        { index, drop: 'area' as const },
        { index, drop: 'type' as const },
      ]),
    );

    for (const { index, drop } of relaxations) {
      const seed = seeds[index];
      const before = drop === 'area' ? seed.area : seed.type;
      if (drop === 'area') seed.area = null;
      else seed.type = 'any';

      if (countTilings(size, seeds, 2) !== 1) {
        if (drop === 'area') seed.area = before as number | null;
        else seed.type = before as Seed['type'];
      }
    }

    return { size, seeds, solution };
  }

  throw new Error(`Could not generate a ${size}x${size} Patches board`);
}
