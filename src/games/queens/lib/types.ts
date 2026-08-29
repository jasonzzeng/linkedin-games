export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export interface Puzzle {
  /** Deterministic id derived from the seed used to build the puzzle. */
  id: string;
  size: number;
  /** size*size array, each entry is the region index (0..size-1) of that cell. */
  regions: number[];
  /** solution[row] = column of the queen in that row. */
  solution: number[];
  difficulty: Difficulty;
  /** Highest logical technique level required to solve it (1..4). */
  rating: number;
}

export interface DifficultySpec {
  size: number;
  /** Allowed logical-difficulty ratings for a puzzle of this difficulty. */
  minRating: number;
  maxRating: number;
  label: string;
}

export const DIFFICULTY_SPECS: Record<Difficulty, DifficultySpec> = {
  easy: { size: 7, minRating: 1, maxRating: 2, label: "EASY" },
  medium: { size: 9, minRating: 2, maxRating: 3, label: "MEDIUM" },
  hard: { size: 10, minRating: 4, maxRating: 4, label: "HARD" },
};
