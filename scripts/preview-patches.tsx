/** Renders the real PatchesBoard to standalone HTML for a visual check. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatchesBoard, type PlacedPatch } from '../src/games/patches/PatchesBoard';
import { generatePuzzle } from '../src/games/patches/logic/generator';

const outPath = process.argv[2] ?? 'patches-preview.html';
const theme = process.argv[3] ?? 'light';
const assets = join('dist', 'assets');
const css = readFileSync(join(assets, readdirSync(assets).find((f) => f.endsWith('.css'))!), 'utf8');

const puzzle = generatePuzzle('Hard');
const contains = (r: { x: number; y: number; w: number; h: number }, index: number) => {
  const x = index % puzzle.size;
  const y = Math.floor(index / puzzle.size);
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
};

// Place about half the patches, and make one of them deliberately wrong so the
// invalid outline shows up too.
const placed: PlacedPatch[] = puzzle.solution.slice(0, Math.ceil(puzzle.solution.length / 2)).map(
  (rect, i) => ({
    seedIndex: puzzle.seeds.find((s) => contains(rect, s.index))!.index,
    rect,
    valid: i !== 1,
  }),
);

const board = renderToStaticMarkup(
  <PatchesBoard
    size={puzzle.size}
    seeds={puzzle.seeds}
    placed={placed}
    cell={62}
    onPlace={() => {}}
    onRemove={() => {}}
  />,
);

writeFileSync(
  outPath,
  `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${css}
body{margin:0;padding:26px;background:var(--ground);font-family:var(--font-sans);
--accent:var(--accent-patches);--accent-soft:color-mix(in srgb,var(--accent) 14%,var(--surface))}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;
width:max-content;box-shadow:var(--sh-sm)}
h3{margin:0 0 12px;font:600 11px var(--font-sans);letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint)}
</style></head><body><h3>${theme} — ${puzzle.size}×${puzzle.size}, half placed</h3>
<div class="card">${board}</div></body></html>`,
);
console.log(outPath);
