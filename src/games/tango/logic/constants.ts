import type { CellValue } from '../types';

export const EMPTY: CellValue = 0;
export const SUN: CellValue = 1;
export const MOON: CellValue = 2;

export const OPPOSITE = (v: CellValue): CellValue => {
  if (v === SUN) return MOON;
  if (v === MOON) return SUN;
  return EMPTY;
};

export const DIFFICULTY_CONFIG = {
  Easy: { fillFactor: 0.55, relationChance: 0.4 },
  Medium: { fillFactor: 0.40, relationChance: 0.3 },
  Hard: { fillFactor: 0.25, relationChance: 0.2 },
};