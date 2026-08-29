export interface GameMeta {
  id: 'tango' | 'zip' | 'crossclimb' | 'sudoku' | 'queens' | 'patches' | 'pinpoint' | 'wend';
  /** URL segment, e.g. /tango */
  path: string;
  name: string;
  /** Shown under the name on the hub card. */
  tagline: string;
  /** One line of rules, shown on the card and in the in-game help panel. */
  rules: string[];
  /** CSS custom property carrying this game's accent. */
  accentVar: string;
}

export const GAMES: GameMeta[] = [
  {
    id: 'tango',
    path: '/tango',
    name: 'Tango',
    tagline: 'Balance suns and moons',
    rules: [
      'Fill every cell with a sun or a moon.',
      'Each row and column holds an equal number of both.',
      'No more than two of the same symbol sit next to each other.',
      '= means the two cells match; × means they differ.',
    ],
    accentVar: '--accent-tango',
  },
  {
    id: 'zip',
    path: '/zip',
    name: 'Zip',
    tagline: 'One line through every square',
    rules: [
      'Draw a single unbroken path that fills every square.',
      'Visit the numbered circles in order, 1 → 2 → 3 …',
      'The path may not cross or revisit itself.',
      'Drag from the head, click ahead to auto-route, or use the arrow keys.',
    ],
    accentVar: '--accent-zip',
  },
  {
    id: 'crossclimb',
    path: '/crossclimb',
    name: 'Crossclimb',
    tagline: 'Climb the word ladder',
    rules: [
      'Solve the five middle clues — each answer is one word.',
      'Reorder the rows so each word differs from its neighbour by one letter.',
      'With the ladder built, the locked top and bottom clues unlock.',
      'Hints cost 5 seconds, revealing a row costs 20.',
    ],
    accentVar: '--accent-crossclimb',
  },
  {
    id: 'queens',
    path: '/queens',
    name: 'Queens',
    tagline: 'Crown every region',
    rules: [
      'Place exactly one crown in every row, column and coloured region.',
      'No two crowns may touch — not even diagonally.',
      'Click once to rule a square out, twice to place a crown.',
      'Every board has one answer, and no guessing is ever needed.',
    ],
    accentVar: '--accent-queens',
  },
  {
    id: 'patches',
    path: '/patches',
    name: 'Patches',
    tagline: 'Piece it together',
    rules: [
      'Grow every marker into a rectangle by dragging across the grid.',
      'The patches must fill the board exactly, with no gaps and no overlaps.',
      'A marker\u2019s silhouette is the shape it needs: square, tall or wide.',
      'A dashed marker takes any shape. A number is the count of squares.',
    ],
    accentVar: '--accent-patches',
  },
  {
    id: 'pinpoint',
    path: '/pinpoint',
    name: 'Pinpoint',
    tagline: 'Guess the category',
    rules: [
      'Five things are revealed one at a time; all belong to one category.',
      'Name the category in as few clues as you can.',
      'A wrong guess costs you a clue \u2014 you get five in all.',
      'Close wording counts, so you need the idea, not the exact phrase.',
    ],
    accentVar: '--accent-pinpoint',
  },
  {
    id: 'wend',
    path: '/wend',
    name: 'Wend',
    tagline: 'Weave through words',
    rules: [
      'Drag through touching letters to spell each of the hidden words.',
      'Every unshaded square belongs to exactly one word.',
      'Words may bend in any direction, but never cross themselves.',
      'The rows underneath show how long each word is.',
    ],
    accentVar: '--accent-wend',
  },
  {
    id: 'sudoku',
    path: '/sudoku',
    name: 'Mini Sudoku',
    tagline: 'Six by six, one to six',
    rules: [
      'Fill the grid so 1–6 appears once in every row and column.',
      'Each 2×3 block also holds 1–6 exactly once.',
      'Toggle Notes to pencil in candidates.',
      'Type 1–6, delete to erase, N for notes, ⌘Z to undo.',
    ],
    accentVar: '--accent-sudoku',
  },
];

export const getGame = (id: GameMeta['id']): GameMeta => {
  const game = GAMES.find((g) => g.id === id);
  if (!game) throw new Error(`Unknown game: ${id}`);
  return game;
};

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];
