/** Renders the real QueensBoard to standalone HTML for a visual check. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueensBoard } from '../src/games/queens/QueensBoard';
import { generatePuzzle } from '../src/games/queens/logic/generator';
import { findConflicts } from '../src/games/queens/logic/solver';
import type { CellMark } from '../src/games/queens/types';

const outPath = process.argv[2] ?? 'queens-preview.html';
const theme = process.argv[3] ?? 'light';
const assets = join('dist', 'assets');
const css = readFileSync(join(assets, readdirSync(assets).find((f) => f.endsWith('.css'))!), 'utf8');

const puzzle = generatePuzzle('Medium');
const marks: CellMark[] = new Array(puzzle.size * puzzle.size).fill('empty');

// Place most of the real crowns, rule out a few squares, and force one clash
// so the conflict styling is visible too.
puzzle.solution.slice(0, puzzle.size - 2).forEach((crown) => {
  marks[crown.r * puzzle.size + crown.c] = 'crown';
});
const last = puzzle.solution[puzzle.size - 1];
marks[last.r * puzzle.size + ((last.c + 1) % puzzle.size)] = 'crown';
for (let i = 0; i < puzzle.size * puzzle.size; i += 7) {
  if (marks[i] === 'empty') marks[i] = 'excluded';
}

const crowns = marks.flatMap((m, i) =>
  m === 'crown' ? [{ r: Math.floor(i / puzzle.size), c: i % puzzle.size }] : [],
);

const board = renderToStaticMarkup(
  <QueensBoard
    puzzle={puzzle}
    marks={marks}
    conflicts={findConflicts(puzzle.size, puzzle.regions, crowns)}
    cell={58}
    onToggle={() => {}}
  />,
);

writeFileSync(
  outPath,
  `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${css}
body{margin:0;padding:26px;background:var(--ground);font-family:var(--font-sans);
--accent:var(--accent-queens);--accent-soft:color-mix(in srgb,var(--accent) 14%,var(--surface))}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;
width:max-content;box-shadow:var(--sh-sm)}
h3{margin:0 0 12px;font:600 11px var(--font-sans);letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint)}
</style></head><body><h3>${theme} — ${puzzle.size}×${puzzle.size}</h3>
<div class="card">${board}</div></body></html>`,
);
console.log(outPath);
