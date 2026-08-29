import { GRID_SIZE, DIFFICULTIES } from './constants';
import { isValidMove } from './logic';
import type { BoardState, Difficulty } from '../types';

const CELLS = GRID_SIZE * GRID_SIZE;
const CANDIDATES = [1, 2, 3, 4, 5, 6];

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/** Fills a board in place with a random valid solution. */
const fill = (board: BoardState): boolean => {
  const index = board.findIndex((cell) => cell === null);
  if (index === -1) return true;

  for (const value of shuffle(CANDIDATES)) {
    if (!isValidMove(board, index, value)) continue;
    board[index] = value;
    if (fill(board)) return true;
    board[index] = null;
  }
  return false;
};

/**
 * Counts solutions, stopping as soon as `limit` is reached. A puzzle is only
 * fair if exactly one solution exists, so `limit` of 2 is all we ever need.
 */
const countSolutions = (board: BoardState, limit = 2): number => {
  const index = board.findIndex((cell) => cell === null);
  if (index === -1) return 1;

  let found = 0;
  for (const value of CANDIDATES) {
    if (!isValidMove(board, index, value)) continue;
    board[index] = value;
    found += countSolutions(board, limit - found);
    board[index] = null;
    if (found >= limit) break;
  }
  return found;
};

export const generatePuzzle = (difficulty: Difficulty) => {
  const solution: BoardState = new Array(CELLS).fill(null);
  fill(solution);

  // Dig holes one at a time, keeping only the removals that leave the puzzle
  // with exactly one solution. Without this a "puzzle" can have several valid
  // answers, and the board rejects a filled grid that is genuinely correct.
  const puzzle: BoardState = [...solution];
  const targetClues = DIFFICULTIES[difficulty].clues;
  let clues = CELLS;

  for (const index of shuffle(Array.from({ length: CELLS }, (_, i) => i))) {
    if (clues <= targetClues) break;

    const removed = puzzle[index];
    puzzle[index] = null;

    if (countSolutions([...puzzle]) === 1) {
      clues--;
    } else {
      puzzle[index] = removed;
    }
  }

  return { initial: [...puzzle], solution: [...solution] };
};
