export interface GameMeta {
  id: 'tango' | 'zip' | 'crossclimb' | 'sudoku';
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
