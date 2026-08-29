import { GRID_SIZE, BLOCK_ROWS, BLOCK_COLS } from './constants';
import type { BoardState } from '../types';

export const getRow = (index: number) => Math.floor(index / GRID_SIZE);
export const getCol = (index: number) => index % GRID_SIZE;
export const getBlock = (index: number) => {
  const row = getRow(index);
  const col = getCol(index);
  const blockRow = Math.floor(row / BLOCK_ROWS);
  const blockCol = Math.floor(col / BLOCK_COLS);
  return blockRow * (GRID_SIZE / BLOCK_COLS) + blockCol;
};

// Returns indices of cells in the same row, col, or block
export const getRelatedIndices = (index: number): number[] => {
  const row = getRow(index);
  const col = getCol(index);
  const block = getBlock(index);
  const indices = new Set<number>();

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    if (i === index) continue;
    if (getRow(i) === row || getCol(i) === col || getBlock(i) === block) {
      indices.add(i);
    }
  }
  return Array.from(indices);
};

export const isValidMove = (board: BoardState, index: number, value: number): boolean => {
  const related = getRelatedIndices(index);
  for (const idx of related) {
    if (board[idx] === value) return false;
  }
  return true;
};

export const getConflicts = (board: BoardState, index: number): number[] => {
  const value = board[index];
  if (!value) return [];
  
  const related = getRelatedIndices(index);
  const conflicts: number[] = [];
  
  for (const idx of related) {
    if (board[idx] === value) {
      conflicts.push(idx);
    }
  }
  if (conflicts.length > 0) conflicts.push(index);
  
  return conflicts;
};

export const isGameWon = (board: BoardState) => {
  if (board.some(c => c === null)) return false;
  // If full, check validity of all cells
  for (let i = 0; i < board.length; i++) {
    if (!isValidMove(board, i, board[i]!)) return false;
  }
  return true;
};

// --- NEW HELPERS FOR FLASH FEATURE ---

// Helper to get all cell indices for a specific region
export const getIndicesForRegion = (regionId: string): number[] => {
    const type = regionId[0];
    const index = parseInt(regionId.slice(1), 10);
    const indices: number[] = [];

    for(let i=0; i < GRID_SIZE*GRID_SIZE; i++) {
        if (type === 'r' && getRow(i) === index) indices.push(i);
        else if (type === 'c' && getCol(i) === index) indices.push(i);
        else if (type === 'b' && getBlock(i) === index) indices.push(i);
    }
    return indices;
}

// Returns a set of IDs for regions that are completely filled and VALID
// IDs: r0-r5, c0-c5, b0-b5
export const getValidCompletedRegions = (board: BoardState): Set<string> => {
    const completed = new Set<string>();

    // Check Rows
    for(let r=0; r<GRID_SIZE; r++) {
        const rowIndices = getIndicesForRegion(`r${r}`);
        const values = rowIndices.map(i => board[i]);
        if (values.every(v => v !== null) && new Set(values).size === GRID_SIZE) {
            completed.add(`r${r}`);
        }
    }

    // Check Cols
    for(let c=0; c<GRID_SIZE; c++) {
        const colIndices = getIndicesForRegion(`c${c}`);
        const values = colIndices.map(i => board[i]);
        if (values.every(v => v !== null) && new Set(values).size === GRID_SIZE) {
            completed.add(`c${c}`);
        }
    }

    // Check Blocks
    for(let b=0; b<GRID_SIZE; b++) {
        const blockIndices = getIndicesForRegion(`b${b}`);
        const values = blockIndices.map(i => board[i]);
        if (values.every(v => v !== null) && new Set(values).size === GRID_SIZE) {
            completed.add(`b${b}`);
        }
    }

    return completed;
};
