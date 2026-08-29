import { RelationType } from '../types';
import type { Grid, Relation, Difficulty } from '../types';
import { createEmptyGrid, cloneGrid } from './utils';
import { solveGrid, countSolutions } from './solver';
import { EMPTY, DIFFICULTY_CONFIG } from './constants';

export const generatePuzzle = (size: number, difficulty: Difficulty): { grid: Grid, relations: Relation[], solution: Grid } => {
  // 1. Generate a full valid board (Solution)
  // We start with an empty grid and no relations and just ask the solver to fill it randomly.
  const empty = createEmptyGrid(size);
  const solution = solveGrid(empty, []);
  
  if (!solution) throw new Error("Failed to generate base solution");

  // 2. Generate Relations based on the solution
  const relations: Relation[] = [];
  const config = DIFFICULTY_CONFIG[difficulty];
  
  // Horizontal candidates
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (Math.random() < config.relationChance) {
        const type = solution[r][c] === solution[r][c+1] ? RelationType.Equal : RelationType.Opposite;
        relations.push({ r, c, vertical: false, type });
      }
    }
  }
  // Vertical candidates
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.random() < config.relationChance) {
        const type = solution[r][c] === solution[r+1][c] ? RelationType.Equal : RelationType.Opposite;
        relations.push({ r, c, vertical: true, type });
      }
    }
  }

  // 3. Dig holes (remove cells)
  // We want to reach a certain emptiness while maintaining uniqueness
  const puzzle = cloneGrid(solution);
  const cells = [];
  for(let r=0; r<size; r++) for(let c=0; c<size; c++) cells.push({r,c});
  
  // Shuffle cells to remove randomly
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  // Determine target filled count
  const targetFilled = Math.floor(size * size * config.fillFactor);
  let currentFilled = size * size;

  for (const cell of cells) {
    if (currentFilled <= targetFilled) break;

    const originalVal = puzzle[cell.r][cell.c];
    puzzle[cell.r][cell.c] = EMPTY;

    // Check uniqueness
    // Optimization: Standard solver might be slow for empty boards.
    // But since we are only removing one by one, it's usually okay for 6x6 to 10x10.
    // For 12x12+ it might hitch on 'Hard'.
    const solutions = countSolutions(puzzle, relations, 2);
    
    if (solutions !== 1) {
      // Not unique (or no solution, which shouldn't happen if we started from valid), put it back
      puzzle[cell.r][cell.c] = originalVal;
    } else {
      currentFilled--;
    }
  }

  return { grid: puzzle, relations, solution };
};