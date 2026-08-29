export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Puzzle {
  size: number;
  /** Letter per cell, row-major; blocked cells hold ''. */
  letters: string[];
  blocked: boolean[];
  /** The words to find, shortest first. */
  words: string[];
  /** The intended path for each word, used for hints. */
  paths: number[][];
}
