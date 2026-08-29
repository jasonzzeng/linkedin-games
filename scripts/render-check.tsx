import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../src/pages/Home';
import TangoGame from '../src/games/tango/TangoGame';
import ZipGame from '../src/games/zip/ZipGame';
import SudokuGame from '../src/games/sudoku/SudokuGame';
import CrossclimbGame from '../src/games/crossclimb/CrossclimbGame';
import QueensGame from '../src/games/queens/QueensGame';
import PatchesGame from '../src/games/patches/PatchesGame';
import PinpointGame from '../src/games/pinpoint/PinpointGame';
import WendGame from '../src/games/wend/WendGame';

const cases: [string, () => ReactElement][] = [
  ['Home', () => <Home />],
  ['Tango', () => <TangoGame />],
  ['Zip', () => <ZipGame />],
  ['Mini Sudoku', () => <SudokuGame />],
  ['Crossclimb', () => <CrossclimbGame />],
  ['Queens', () => <QueensGame />],
  ['Patches', () => <PatchesGame />],
  ['Pinpoint', () => <PinpointGame />],
  ['Wend', () => <WendGame />],
];

let failures = 0;
for (const [name, make] of cases) {
  try {
    const html = renderToStaticMarkup(<MemoryRouter>{make()}</MemoryRouter>);
    if (html.length < 80) throw new Error(`suspiciously empty output (${html.length} chars)`);
    console.log(`  ok    ${name} renders (${html.length} chars)`);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${name}: ${(error as Error).message}`);
  }
}
console.log(failures === 0 ? '\nALL ROUTES RENDER' : `\n${failures} ROUTE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
