import { RelationType } from '../types';
import type { Grid, Relation, Difficulty } from '../types';
import { createEmptyGrid, cloneGrid } from './utils';
import { solveGrid, countSolutions } from './solver';
import { EMPTY, DIFFICULTY_CONFIG } from './constants';

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const generatePuzzle = (
  size: number,
  difficulty: Difficulty,
): { grid: Grid; relations: Relation[]; solution: Grid } => {
  const config = DIFFICULTY_CONFIG[difficulty];

  // 1. A random complete board becomes the solution.
  const solution = solveGrid(createEmptyGrid(size), []);
  if (!solution) throw new Error('Failed to generate base solution');

  // 2. Offer up a pool of candidate constraints consistent with that solution.
  //    Most will be discarded in step 3; a generous pool just means variety.
  const candidates: Relation[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (Math.random() < config.relationChance) {
        candidates.push({
          r,
          c,
          vertical: false,
          type: solution[r][c] === solution[r][c + 1] ? RelationType.Equal : RelationType.Opposite,
        });
      }
    }
  }
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.random() < config.relationChance) {
        candidates.push({
          r,
          c,
          vertical: true,
          type: solution[r][c] === solution[r + 1][c] ? RelationType.Equal : RelationType.Opposite,
        });
      }
    }
  }

  // 3. Strip clues away while the puzzle still has exactly one solution,
  //    emptying cells before pruning marks so the constraints are what carries
  //    the solve — the way the real game plays. Each is held to its own budget.
  //    Digging every hole first, as this used to, leaves the givens so dense
  //    that every constraint is redundant; removing everything greedily strips
  //    the board to two givens and a thicket of marks. Budgeting both lands in
  //    between.
  const puzzle = cloneGrid(solution);
  let relations = candidates;

  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) cells.push({ r, c });
  }

  const area = size * size;
  const targetGivens = Math.max(1, Math.round(area * config.givenFactor));
  const targetMarks = Math.max(0, Math.round(area * config.markFactor));

  let givens = area;
  for (const { r, c } of shuffle(cells)) {
    if (givens <= targetGivens) break;
    const previous = puzzle[r][c];
    puzzle[r][c] = EMPTY;
    if (countSolutions(puzzle, relations, 2) === 1) givens--;
    else puzzle[r][c] = previous;
  }

  for (const candidate of shuffle(candidates)) {
    if (relations.length <= targetMarks) break;
    const trimmed = relations.filter((relation) => relation !== candidate);
    if (countSolutions(puzzle, trimmed, 2) === 1) relations = trimmed;
  }

  return { grid: puzzle, relations, solution };
};
