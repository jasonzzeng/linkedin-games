export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Point {
  r: number;
  c: number;
}

/** empty -> excluded (a note that no crown fits) -> crown -> empty */
export type CellMark = 'empty' | 'excluded' | 'crown';

export interface Puzzle {
  size: number;
  /** Region id per cell, row-major. Exactly `size` regions, ids 0..size-1. */
  regions: number[];
  /** The single valid crown placement, one per row. */
  solution: Point[];
}
