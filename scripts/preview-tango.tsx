/**
 * Renders the real TangoBoard to a standalone HTML file using the compiled
 * stylesheet, so the board can be eyeballed without a browser session.
 * Usage: node (bundled) -> writes the path it produced to stdout.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { TangoBoard } from '../src/games/tango/TangoBoard';
import { generatePuzzle } from '../src/games/tango/logic/generator';
import { findForcedMove } from '../src/games/tango/logic/solver';
import { cloneGrid } from '../src/games/tango/logic/utils';

const outPath = process.argv[2] ?? 'tango-preview.html';
const theme = process.argv[3] ?? 'light';
const assets = join('dist', 'assets');
const cssFile = readdirSync(assets).find((f) => f.endsWith('.css'))!;
const css = readFileSync(join(assets, cssFile), 'utf8');

const { grid, relations } = generatePuzzle(6, 'Hard');
const initialGrid = cloneGrid(grid);

// Play a few forced moves so the board shows both given and entered symbols.
const played = cloneGrid(grid);
for (let i = 0; i < 5; i++) {
  const move = findForcedMove(played, relations);
  if (!move) break;
  played[move.cell.r][move.cell.c] = move.value;
}

const board = renderToStaticMarkup(
  <TangoBoard
    grid={played}
    initialGrid={initialGrid}
    relations={relations}
    size={6}
    cell={64}
    onCellClick={() => {}}
    hintCell={null}
    lastMove={null}
    invalidCells={new Set()}
  />,
);

const page = `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${css}
body{margin:0;padding:26px;background:var(--ground);font-family:var(--font-sans);
--accent:var(--accent-tango);--accent-soft:color-mix(in srgb,var(--accent) 14%,var(--surface))}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;
width:max-content;box-shadow:var(--sh-sm)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
.btn{height:48px;border-radius:999px;border:1px solid var(--line);background:var(--surface);
color:var(--ink);font:600 14px var(--font-sans);display:flex;align-items:center;justify-content:center}
h3{margin:0 0 12px;font:600 11px var(--font-sans);letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint)}
</style></head><body>
<h3>${theme} \u2014 6\u00d76 Hard</h3>
<div class="card">${board}<div class="row"><div class="btn">Undo</div><div class="btn">Hint</div></div></div>
</body></html>`;

writeFileSync(outPath, page);
console.log(outPath);
