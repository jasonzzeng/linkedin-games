export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type CellValue = number | null;

export type BoardState = CellValue[];

export interface GameConfig {
  clues: number;
}
