import type { Difficulty, GameConfig } from '../types';

export const GRID_SIZE = 6;
export const BLOCK_ROWS = 2;
export const BLOCK_COLS = 3;

export const DIFFICULTIES: Record<Difficulty, GameConfig> = {
  Easy: { clues: 24 },   // ~12 empty
  Medium: { clues: 18 }, // ~18 empty
  Hard: { clues: 14 },   // ~22 empty
};

export const ANIMATION_DURATION = 400; // ms
