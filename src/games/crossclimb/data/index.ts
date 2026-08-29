import type { Difficulty, Puzzle } from '../game/types';
import { easyPuzzles } from './puzzles.easy';
import { mediumPuzzles } from './puzzles.medium';
import { hardPuzzles } from './puzzles.hard';

const BANK: Record<Difficulty, Puzzle[]> = {
  easy: easyPuzzles,
  medium: mediumPuzzles,
  hard: hardPuzzles,
};

/**
 * Picks a puzzle the player has not seen recently. Falls back to the full pool
 * once they have worked through everything at that difficulty.
 */
export function pickPuzzle(difficulty: Difficulty, excludeIds: string[] = []): Puzzle {
  const pool = BANK[difficulty];
  const unseen = pool.filter((puzzle) => !excludeIds.includes(puzzle.id));
  const candidates = unseen.length > 0 ? unseen : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const puzzleCount = (difficulty: Difficulty) => BANK[difficulty].length;
