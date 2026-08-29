export type CellValue = 0 | 1 | 2; // 0: Empty, 1: Sun, 2: Moon

export interface Coords {
  r: number;
  c: number;
}

// 0: Horizontal (-), 1: Vertical (|)
export enum RelationType {
  Equal = '=',
  Opposite = 'x'
}

export interface Relation {
  r: number; // Row of the top/left cell
  c: number; // Col of the top/left cell
  vertical: boolean; // true if vertical relation (between r,c and r+1,c)
  type: RelationType;
}

export type Grid = CellValue[][];

export interface GameState {
  size: number;
  grid: Grid;
  initialGrid: Grid; // To know which cells are locked
  relations: Relation[];
  history: Grid[]; // For undo
  startTime: number;
  difficulty: Difficulty;
  isWon: boolean;
  finalTime?: string; // Formatted time string
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Hint {
  cell: Coords;
  value: CellValue;
  reason: string;
}

export interface ValidationResult {
  invalidCells: Set<string>; // Set of "r-c" strings
  error: string | null;
}