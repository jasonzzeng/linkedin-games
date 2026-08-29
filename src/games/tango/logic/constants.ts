import type { CellValue } from '../types';

export const EMPTY: CellValue = 0;
export const SUN: CellValue = 1;
export const MOON: CellValue = 2;

export const OPPOSITE = (v: CellValue): CellValue => {
  if (v === SUN) return MOON;
  if (v === MOON) return SUN;
  return EMPTY;
};

/**
 * Given cells and constraint marks are budgeted separately, as fractions of the
 * board area. Harder boards hand over fewer filled cells and lean more on the
 * marks, which is how the real game escalates: its 6x6 Hard shows around six
 * givens against ten marks. relationChance only sizes the candidate pool the
 * generator prunes from — it is not the final mark count.
 */
export const DIFFICULTY_CONFIG = {
  Easy: { givenFactor: 0.33, markFactor: 0.22, relationChance: 0.45 },
  Medium: { givenFactor: 0.22, markFactor: 0.25, relationChance: 0.45 },
  Hard: { givenFactor: 0.14, markFactor: 0.28, relationChance: 0.45 },
};
