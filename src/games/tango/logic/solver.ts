import { RelationType } from '../types';
import type { Grid, Relation, Hint } from '../types';
import { EMPTY, SUN, MOON, OPPOSITE } from './constants';
import { cloneGrid, isValidTripleCheck } from './utils';

/**
 * Tries to find a single forced move based on deduction rules.
 */
export const findForcedMove = (grid: Grid, relations: Relation[]): Hint | null => {
  const size = grid.length;

  // 1. Triple Prevention (XX. -> O, X.X -> O)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== EMPTY) continue;

      // Try putting SUN
      const sunValid = isValidTripleCheck(grid, r, c, SUN);
      const moonValid = isValidTripleCheck(grid, r, c, MOON);

      if (!sunValid && moonValid) return { cell: { r, c }, value: MOON, reason: "Avoids three Suns in a row" };
      if (sunValid && !moonValid) return { cell: { r, c }, value: SUN, reason: "Avoids three Moons in a row" };
    }
  }

  // 2. Row/Col Balance
  for (let i = 0; i < size; i++) {
    let rSun = 0, rMoon = 0, rEmpty = 0;
    let cSun = 0, cMoon = 0, cEmpty = 0;
    
    // Count Row i
    for (let c = 0; c < size; c++) {
      if (grid[i][c] === SUN) rSun++;
      else if (grid[i][c] === MOON) rMoon++;
      else rEmpty++;
    }

    // Count Col i
    for (let r = 0; r < size; r++) {
      if (grid[r][i] === SUN) cSun++;
      else if (grid[r][i] === MOON) cMoon++;
      else cEmpty++;
    }

    const target = size / 2;

    // Row Logic
    if (rEmpty > 0) {
      if (rSun === target) {
        const c = grid[i].indexOf(EMPTY);
        return { cell: { r: i, c }, value: MOON, reason: "Row has maximum Suns" };
      }
      if (rMoon === target) {
        const c = grid[i].indexOf(EMPTY);
        return { cell: { r: i, c }, value: SUN, reason: "Row has maximum Moons" };
      }
    }

    // Col Logic
    if (cEmpty > 0) {
      if (cSun === target) {
        for(let r=0; r<size; r++) if(grid[r][i] === EMPTY) return { cell: { r, c: i }, value: MOON, reason: "Column has maximum Suns" };
      }
      if (cMoon === target) {
        for(let r=0; r<size; r++) if(grid[r][i] === EMPTY) return { cell: { r, c: i }, value: SUN, reason: "Column has maximum Moons" };
      }
    }
  }

  // 3. Relations
  for (const rel of relations) {
    const v1 = grid[rel.r][rel.c];
    const r2 = rel.vertical ? rel.r + 1 : rel.r;
    const c2 = rel.vertical ? rel.c : rel.c + 1;
    const v2 = grid[r2][c2];

    if (v1 === EMPTY && v2 === EMPTY) continue;
    if (v1 !== EMPTY && v2 !== EMPTY) continue; // Already filled

    // One is empty, one is filled
    const filledVal = v1 !== EMPTY ? v1 : v2;
    const emptyPos = v1 === EMPTY ? { r: rel.r, c: rel.c } : { r: r2, c: c2 };
    
    if (rel.type === RelationType.Equal) {
      return { cell: emptyPos, value: filledVal, reason: "Cells must be equal (=)" };
    } else {
      return { cell: emptyPos, value: OPPOSITE(filledVal), reason: "Cells must be opposite (x)" };
    }
  }

  return null;
};

/**
 * Counts solutions using backtracking.
 * Returns 0 (none), 1 (unique), or 2 (multiple/ambiguous).
 * Limit stops early if we find > 1 (optimization).
 */
export const countSolutions = (grid: Grid, relations: Relation[], limit: number = 2): number => {
  const size = grid.length;
  let solutions = 0;

  const solve = (r: number, c: number) => {
    if (solutions >= limit) return;

    if (r === size) {
      solutions++;
      return;
    }

    const nextC = (c + 1) % size;
    const nextR = nextC === 0 ? r + 1 : r;

    if (grid[r][c] !== EMPTY) {
      solve(nextR, nextC);
      return;
    }

    // Try SUN and MOON
    for (const val of [SUN, MOON]) {
      // Check 1: Triple constraint
      if (!isValidTripleCheck(grid, r, c, val)) continue;

      // Check 2: Balance (check only if end of row/col)
      // Optimistic pruning: if we already have > N/2, stop
      let rowCount = 0;
      for (let k = 0; k < c; k++) if (grid[r][k] === val) rowCount++;
      if (rowCount + 1 > size / 2) continue; // Too many

      let colCount = 0;
      for (let k = 0; k < r; k++) if (grid[k][c] === val) colCount++;
      if (colCount + 1 > size / 2) continue; // Too many

      // Strict balance check at end of row/col
      if (c === size - 1) {
        if (rowCount + 1 !== size / 2) continue;
      }
      if (r === size - 1) {
        if (colCount + 1 !== size / 2) continue;
      }

      // Check 3: Relations
      // Only check relations that connect to already filled cells (left or up usually, but here we fill linearly)
      // Horizontal relation to the left?
      // Vertical relation to the top?
      let relValid = true;
      // Note: We need to check relations connected to this cell. 
      // Since we fill top-left to bottom-right, we check left neighbor and top neighbor.
      
      // Check relation with left neighbor (r, c-1)
      if (c > 0) {
        const leftRel = relations.find(rel => rel.r === r && rel.c === c - 1 && !rel.vertical);
        if (leftRel) {
          const vLeft = grid[r][c - 1];
          if (leftRel.type === RelationType.Equal && vLeft !== val) relValid = false;
          if (leftRel.type === RelationType.Opposite && vLeft === val) relValid = false;
        }
      }
      // Check relation with top neighbor (r-1, c)
      if (r > 0) {
        const topRel = relations.find(rel => rel.r === r - 1 && rel.c === c && rel.vertical);
        if (topRel) {
          const vTop = grid[r - 1][c];
          if (topRel.type === RelationType.Equal && vTop !== val) relValid = false;
          if (topRel.type === RelationType.Opposite && vTop === val) relValid = false;
        }
      }

      if (!relValid) continue;

      grid[r][c] = val;
      solve(nextR, nextC);
      grid[r][c] = EMPTY; // Backtrack
      
      if (solutions >= limit) return;
    }
  };

  solve(0, 0);
  return solutions;
};

/**
 * Solves the grid entirely and returns one solution. 
 * Wrapper around the recursive solver.
 */
export const solveGrid = (grid: Grid, relations: Relation[]): Grid | null => {
  const size = grid.length;
  const resGrid = cloneGrid(grid);
  
  const solve = (r: number, c: number): boolean => {
    if (r === size) return true;
    const nextC = (c + 1) % size;
    const nextR = nextC === 0 ? r + 1 : r;

    if (resGrid[r][c] !== EMPTY) return solve(nextR, nextC);

    // Randomize order for generator variety
    const moves = Math.random() > 0.5 ? [SUN, MOON] : [MOON, SUN];

    for (const val of moves) {
       // Basic Validity Checks (Duplicated from countSolutions for speed)
       if (!isValidTripleCheck(resGrid, r, c, val)) continue;

       // Balance pruning: never let a row or column exceed half of one symbol.
       let rowCount = 0; for (let k=0; k<c; k++) if (resGrid[r][k] === val) rowCount++;
       if (rowCount + 1 > size / 2) continue;

       let colCount = 0; for (let k=0; k<r; k++) if (resGrid[k][c] === val) colCount++;
       if (colCount + 1 > size / 2) continue;

       if (c === size - 1 && rowCount + 1 !== size / 2) continue;
       if (r === size - 1 && colCount + 1 !== size / 2) continue;

       // Relations
       let relValid = true;
       if (c > 0) {
         const leftRel = relations.find(rel => rel.r === r && rel.c === c - 1 && !rel.vertical);
         if (leftRel) {
           const vLeft = resGrid[r][c-1];
           if (leftRel.type === RelationType.Equal && vLeft !== val) relValid = false;
           if (leftRel.type === RelationType.Opposite && vLeft === val) relValid = false;
         }
       }
       if (r > 0) {
         const topRel = relations.find(rel => rel.r === r - 1 && rel.c === c && rel.vertical);
         if (topRel) {
           const vTop = resGrid[r-1][c];
           if (topRel.type === RelationType.Equal && vTop !== val) relValid = false;
           if (topRel.type === RelationType.Opposite && vTop === val) relValid = false;
         }
       }
       if (!relValid) continue;

       resGrid[r][c] = val;
       if (solve(nextR, nextC)) return true;
       resGrid[r][c] = EMPTY;
    }
    return false;
  }

  if (solve(0, 0)) return resGrid;
  return null;
};