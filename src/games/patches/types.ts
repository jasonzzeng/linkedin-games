export type Difficulty = 'Easy' | 'Medium' | 'Hard';

/** The silhouette a patch must have. 'any' is the dashed marker in-game. */
export type ShapeType = 'square' | 'tall' | 'wide' | 'any';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Seed {
  /** Row-major index of the marker cell. */
  index: number;
  type: ShapeType;
  /** Required area, or null when the marker carries no number. */
  area: number | null;
}

export interface Puzzle {
  size: number;
  seeds: Seed[];
  /** The one tiling consistent with those seeds. */
  solution: Rect[];
}

export const classify = (w: number, h: number): ShapeType =>
  w === h ? 'square' : h > w ? 'tall' : 'wide';

export const matchesType = (type: ShapeType, w: number, h: number): boolean =>
  type === 'any' || classify(w, h) === type;
