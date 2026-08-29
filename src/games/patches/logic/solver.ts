import { matchesType } from '../types';
import type { Rect, Seed } from '../types';

/**
 * Counts tilings consistent with the seeds, stopping at `limit`.
 *
 * The search hangs on one observation: in any exact tiling, the rectangle
 * covering the first uncovered cell in reading order must have its top-left
 * corner *at* that cell. So there is never a choice about where to place next,
 * only about how big the patch is — which keeps the branching tiny.
 */
export function countTilings(size: number, seeds: Seed[], limit = 2): number {
  const seedAt = new Map<number, Seed>();
  for (const seed of seeds) seedAt.set(seed.index, seed);

  const covered = new Uint8Array(size * size);
  const used = new Set<number>();
  let found = 0;

  const firstFree = (): number => {
    for (let i = 0; i < covered.length; i++) if (!covered[i]) return i;
    return -1;
  };

  const search = () => {
    if (found >= limit) return;

    const start = firstFree();
    if (start === -1) {
      if (used.size === seeds.length) found++;
      return;
    }

    const x0 = start % size;
    const y0 = Math.floor(start / size);

    for (let h = 1; y0 + h <= size; h++) {
      for (let w = 1; x0 + w <= size; w++) {
        // Any overlap means every wider rectangle on this row overlaps too.
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

        // Exactly one seed, and the patch must satisfy it.
        let seed: Seed | undefined;
        let seedCount = 0;
        for (let y = y0; y < y0 + h && seedCount < 2; y++) {
          for (let x = x0; x < x0 + w; x++) {
            const candidate = seedAt.get(y * size + x);
            if (!candidate) continue;
            seedCount++;
            seed = candidate;
            if (seedCount > 1) break;
          }
        }
        if (seedCount !== 1 || !seed) continue;
        if (used.has(seed.index)) continue;
        if (!matchesType(seed.type, w, h)) continue;
        if (seed.area !== null && seed.area !== w * h) continue;

        for (let y = y0; y < y0 + h; y++) {
          for (let x = x0; x < x0 + w; x++) covered[y * size + x] = 1;
        }
        used.add(seed.index);

        search();

        used.delete(seed.index);
        for (let y = y0; y < y0 + h; y++) {
          for (let x = x0; x < x0 + w; x++) covered[y * size + x] = 0;
        }

        if (found >= limit) return;
      }
    }
  };

  search();
  return found;
}

/** Does this set of patches exactly tile the board, one seed each? */
export function isComplete(size: number, seeds: Seed[], patches: Rect[]): boolean {
  if (patches.length !== seeds.length) return false;

  const covered = new Uint8Array(size * size);
  for (const patch of patches) {
    for (let y = patch.y; y < patch.y + patch.h; y++) {
      for (let x = patch.x; x < patch.x + patch.w; x++) {
        const index = y * size + x;
        if (index < 0 || index >= covered.length || covered[index]) return false;
        covered[index] = 1;
      }
    }
  }
  return covered.every((cell) => cell === 1);
}
