/** Renders the real WendBoard plus its answer rows for a visual check. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { WendBoard, WEND_COLORS } from '../src/games/wend/WendBoard';
import { generatePuzzle } from '../src/games/wend/logic/generator';

const outPath = process.argv[2] ?? 'wend-preview.html';
const theme = process.argv[3] ?? 'light';
const assets = join('dist', 'assets');
const css = readFileSync(join(assets, readdirSync(assets).find((f) => f.endsWith('.css'))!), 'utf8');

const puzzle = generatePuzzle('Hard');
const CELL = 62;

// Three of the five words found, so ribbons, chevrons and empty slots all show.
const found = new Map<number, number[]>();
puzzle.paths.slice(0, 3).forEach((path, wordIndex) => found.set(wordIndex, path));

const board = renderToStaticMarkup(
  <WendBoard puzzle={puzzle} found={found} cell={CELL} onTrace={() => true} />,
);

const rows = puzzle.words
  .map((word, wordIndex) => {
    const isFound = found.has(wordIndex);
    const tiles = [...word]
      .map(
        (letter) =>
          `<span style="background:${
            isFound ? WEND_COLORS[wordIndex % WEND_COLORS.length] : 'var(--wend-slot)'
          };width:27px;height:27px;font-size:16px" class="tile">${isFound ? letter : ''}</span>`,
      )
      .join('');
    return `<li style="display:flex;gap:4px">${tiles}</li>`;
  })
  .join('');

writeFileSync(
  outPath,
  `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${css}
body{margin:0;padding:26px;background:var(--ground);font-family:var(--font-sans);
--accent:var(--accent-wend);--accent-soft:color-mix(in srgb,var(--accent) 16%,var(--surface))}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;
width:max-content;box-shadow:var(--sh-sm)}
ul{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:4px}
.tile{display:flex;align-items:center;justify-content:center;border-radius:5px;
font-weight:800;color:var(--wend-letter)}
h3{margin:0 0 12px;font:600 11px var(--font-sans);letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint)}
*{animation:none!important}
</style></head><body><h3>${theme} — ${puzzle.size}×${puzzle.size}, 3 of ${puzzle.words.length} found</h3>
<div class="card">${board}<ul>${rows}</ul></div></body></html>`,
);
console.log(outPath);
