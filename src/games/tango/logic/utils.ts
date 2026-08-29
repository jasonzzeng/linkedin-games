import { RelationType } from '../types';
import type { Grid, Relation, CellValue, ValidationResult } from '../types';
import { EMPTY, SUN, MOON } from './constants';

export const createEmptyGrid = (size: number): Grid => 
  Array.from({ length: size }, () => Array(size).fill(EMPTY));

export const cloneGrid = (grid: Grid): Grid => 
  grid.map(row => [...row]);

export const isFull = (grid: Grid): boolean => 
  grid.every(row => row.every(cell => cell !== EMPTY));

/**
 * Checks if a specific move is valid regarding immediate 3-in-a-row violation.
 * Does NOT check row balance (count), as that is checked separately during solving.
 */
export const isValidTripleCheck = (grid: Grid, r: number, c: number, val: CellValue): boolean => {
  const size = grid.length;

  // Horizontal check
  if (c >= 2 && grid[r][c-1] === val && grid[r][c-2] === val) return false;
  if (c < size - 2 && grid[r][c+1] === val && grid[r][c+2] === val) return false;
  if (c >= 1 && c < size - 1 && grid[r][c-1] === val && grid[r][c+1] === val) return false;

  // Vertical check
  if (r >= 2 && grid[r-1][c] === val && grid[r-2][c] === val) return false;
  if (r < size - 2 && grid[r+1][c] === val && grid[r+2][c] === val) return false;
  if (r >= 1 && r < size - 1 && grid[r-1][c] === val && grid[r+1][c] === val) return false;

  return true;
};

export const validateBoard = (grid: Grid, relations: Relation[]): ValidationResult => {
  const size = grid.length;
  const invalidCells = new Set<string>();
  let error: string | null = null;
  const target = size / 2;

  // Helper to add error
  const addError = (msg: string, cells: {r: number, c: number}[]) => {
    if (!error) error = msg;
    cells.forEach(cell => invalidCells.add(`${cell.r}-${cell.c}`));
  };

  // 1. Check Row/Col Counts (Overflow)
  for (let i = 0; i < size; i++) {
    let rowSun = 0, rowMoon = 0;
    let colSun = 0, colMoon = 0;
    
    // Count
    for (let k = 0; k < size; k++) {
      if (grid[i][k] === SUN) rowSun++;
      if (grid[i][k] === MOON) rowMoon++;
      if (grid[k][i] === SUN) colSun++;
      if (grid[k][i] === MOON) colMoon++;
    }

    if (rowSun > target) {
      const cells = [];
      for(let k=0; k<size; k++) cells.push({r: i, c: k});
      addError(`Row ${i+1} has too many Suns`, cells);
    }
    if (rowMoon > target) {
      const cells = [];
      for(let k=0; k<size; k++) cells.push({r: i, c: k});
      addError(`Row ${i+1} has too many Moons`, cells);
    }
    if (colSun > target) {
      const cells = [];
      for(let k=0; k<size; k++) cells.push({r: k, c: i});
      addError(`Column ${i+1} has too many Suns`, cells);
    }
    if (colMoon > target) {
      const cells = [];
      for(let k=0; k<size; k++) cells.push({r: k, c: i});
      addError(`Column ${i+1} has too many Moons`, cells);
    }
  }

  // 2. Check 3-in-a-row
  // Horizontal
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 2; c++) {
      const v = grid[r][c];
      if (v !== EMPTY && v === grid[r][c+1] && v === grid[r][c+2]) {
        addError("No more than 2 adjacent symbols allowed", [{r, c}, {r, c: c+1}, {r, c: c+2}]);
      }
    }
  }
  // Vertical
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size - 2; r++) {
      const v = grid[r][c];
      if (v !== EMPTY && v === grid[r+1][c] && v === grid[r+2][c]) {
        addError("No more than 2 adjacent symbols allowed", [{r, c}, {r: r+1, c}, {r: r+2, c}]);
      }
    }
  }

  // 3. Check Relations
  for (const rel of relations) {
    const v1 = grid[rel.r][rel.c];
    const r2 = rel.vertical ? rel.r + 1 : rel.r;
    const c2 = rel.vertical ? rel.c : rel.c + 1;
    const v2 = grid[r2][c2];

    if (v1 === EMPTY || v2 === EMPTY) continue;

    if (rel.type === RelationType.Equal) {
      if (v1 !== v2) {
        addError("Cells must be equal (=)", [{r: rel.r, c: rel.c}, {r: r2, c: c2}]);
      }
    } else {
      if (v1 === v2) {
        addError("Cells must be opposite (×)", [{r: rel.r, c: rel.c}, {r: r2, c: c2}]);
      }
    }
  }

  return { invalidCells, error };
};

export const checkWinCondition = (grid: Grid, relations: Relation[]): boolean => {
  if (!isFull(grid)) return false;
  const { invalidCells } = validateBoard(grid, relations);
  return invalidCells.size === 0;
};