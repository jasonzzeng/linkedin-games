export interface Point {
  x: number;
  y: number;
}

export interface PuzzleConfig {
  width: number;
  height: number;
  checkpoints: Record<string, number>; // key: "x,y", value: number (1-N)
  solutionPath?: Point[]; // Stored for validation/debugging
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type InputMode = 'both' | 'drag' | 'click';

export interface GameState {
  path: Point[]; // Ordered list of visited cells
  history: Point[][]; // Undo stack
  isComplete: boolean;
}