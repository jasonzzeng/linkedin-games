/** Renders the real QueensBoard to standalone HTML for a visual check. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueensBoard } from '../src/games/queens/QueensBoard';
import { generatePuzzle } from '../src/games/queens/lib/generator';
import { derive, emptyBoard, type BoardState } from '../src/games/queens/lib/game';

const outPath = process.argv[2] ?? 'queens-preview.html';
const theme = process.argv[3] ?? 'light';
const assets = join('dist', 'assets');
const css = readFileSync(join(assets, readdirSync(assets).find((f) => f.endsWith('.css'))!), 'utf8');

const { puzzle } = generatePuzzle('medium', { budgetMs: 4000 });
const { size, solution } = puzzle;

// Most crowns correct, one deliberately clashing, plus some hand marks — so
// auto-placed X's, hand-placed X's and the conflict styling all show at once.
const board: BoardState = emptyBoard();
board.queens = solution.slice(0, size - 2).map((c, r) => r * size + c);
board.queens.push((size - 1) * size + ((solution[size - 1] + 1) % size));
board.userX = [size * 2 + 0, size * 2 + 1, size * 3 + 0];

const derived = derive(puzzle, board, true);

const html = renderToStaticMarkup(
  <QueensBoard
    puzzle={puzzle}
    derived={derived}
    autoCheck
    onBegin={() => {}}
    onTap={() => {}}
    onPaint={() => {}}
    onEnd={() => {}}
  />,
);

writeFileSync(
  outPath,
  `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${css}
body{margin:0;padding:26px;background:var(--ground);font-family:var(--font-sans);
--accent:var(--accent-queens);--accent-soft:color-mix(in srgb,var(--accent) 14%,var(--surface))}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;
width:min(78vmin,460px);box-shadow:var(--sh-sm)}
h3{margin:0 0 12px;font:600 11px var(--font-sans);letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint)}
/* Static snapshot: entry animations start at opacity 0, so freeze them at
   their finished state rather than photographing frame zero. */
*{animation:none!important}
</style></head><body><h3>${theme} — ${size}×${size} medium, rated ${puzzle.rating}</h3>
<div class="card">${html}</div></body></html>`,
);
console.log(outPath);
