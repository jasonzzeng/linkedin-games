export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PuzzleRung {
  clue: string;
  answer: string;
}

export interface Puzzle {
  id: string;
  difficulty: Difficulty;
  wordLength: number;
  topClue: string;
  topAnswer: string;
  bottomClue: string;
  bottomAnswer: string;
  middleRungs: [PuzzleRung, PuzzleRung, PuzzleRung, PuzzleRung, PuzzleRung];
}

export interface RowState {
  id: string;
  originalIndex: number;
  type: 'top' | 'middle' | 'bottom';
  clue: string;
  answer: string;
  currentWord: string;
  isLocked: boolean;
  status: 'normal' | 'correct' | 'incorrect';
  revealedIndices: number[];
}
