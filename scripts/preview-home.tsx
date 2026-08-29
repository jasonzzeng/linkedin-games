/** Renders the hub and the Wend board to standalone HTML for a visual check. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../src/pages/Home';
import { WendBoard } from '../src/games/wend/WendBoard';
import { generatePuzzle } from '../src/games/wend/logic/generator';

const outPath = process.argv[2] ?? 'home-preview.html';
const theme = process.argv[3] ?? 'light';
const assets = join('dist', 'assets');
const css = readFileSync(join(assets, readdirSync(assets).find((f) => f.endsWith('.css'))!), 'utf8');

const home = renderToStaticMarkup(<MemoryRouter><Home /></MemoryRouter>);

const puzzle = generatePuzzle('Hard');
const claimed = new Map<number, number>();
puzzle.paths.slice(0, 2).forEach((path, wordIndex) => {
  for (const index of path) claimed.set(index, wordIndex);
});
const wend = renderToStaticMarkup(
  <MemoryRouter>
    <WendBoard puzzle={puzzle} claimed={claimed} cell={58} onTrace={() => true} />
  </MemoryRouter>,
);

writeFileSync(
  outPath,
  `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${css}
body{margin:0;background:var(--ground);font-family:var(--font-sans)}
.side{padding:26px;--accent:var(--accent-wend);--accent-soft:color-mix(in srgb,var(--accent) 16%,var(--surface))}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;width:max-content}
h3{margin:0 0 12px;font:600 11px var(--font-sans);letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint)}
.row{display:flex;align-items:flex-start}
</style></head><body><div class="row"><div style="flex:1">${home}</div>
<div class="side"><h3>Wend — ${puzzle.size}×${puzzle.size}, two found</h3>
<div class="card">${wend}</div></div></div></body></html>`,
);
console.log(outPath);
