import { generatePuzzle as genTango } from '../src/games/tango/logic/generator.ts';
import { checkWinCondition, validateBoard } from '../src/games/tango/logic/utils.ts';
import { solveGrid } from '../src/games/tango/logic/solver.ts';

import { generatePuzzle as genSudoku } from '../src/games/sudoku/lib/generator.ts';
import { isGameWon, isValidMove as sudokuValid } from '../src/games/sudoku/lib/logic.ts';

import { generatePuzzle as genZip } from '../src/games/zip/utils/generator.ts';
import { checkWin as zipWin, isValidMove as zipValid, pointToString } from '../src/games/zip/utils/logic.ts';

import { generatePuzzle as genQueens, SIZE_FOR } from '../src/games/queens/logic/generator.ts';
import { countSolutions as queensSolutions, solve as queensSolve, findConflicts } from '../src/games/queens/logic/solver.ts';

import { generatePuzzle as genPatches, SIZE_FOR as PATCH_SIZE } from '../src/games/patches/logic/generator.ts';
import { countTilings, isComplete } from '../src/games/patches/logic/solver.ts';

import { generatePuzzle as genWend, SHAPE, neighbours } from '../src/games/wend/logic/generator.ts';
import { WORDS } from '../src/games/wend/data/words.ts';
import { PUZZLES as PINPOINT } from '../src/games/pinpoint/data/puzzles.ts';
import { isCorrect } from '../src/games/pinpoint/types.ts';
import type { PinpointPuzzle } from '../src/games/pinpoint/types.ts';

import { easyPuzzles } from '../src/games/crossclimb/data/puzzles.easy.ts';
import { mediumPuzzles } from '../src/games/crossclimb/data/puzzles.medium.ts';
import { hardPuzzles } from '../src/games/crossclimb/data/puzzles.hard.ts';
import { differsByOneLetter } from '../src/games/crossclimb/game/differsByOneLetter.ts';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) { failures++; console.log(`  FAIL  ${name} ${detail}`); }
  else console.log(`  ok    ${name}`);
};

// ---------- TANGO ----------
console.log('\nTANGO');
for (const [size, diff] of [[6,'Easy'],[6,'Hard'],[8,'Medium']] as const) {
  const t0 = Date.now();
  const { grid, relations, solution } = genTango(size, diff);
  const ms = Date.now() - t0;
  check(`${size}x${size} ${diff} solution is a legal board (${ms}ms)`,
    checkWinCondition(solution, relations));
  const { invalidCells } = validateBoard(grid, relations);
  check(`${size}x${size} ${diff} given clues contain no contradiction`, invalidCells.size === 0);
  const solved = solveGrid(grid, relations);
  check(`${size}x${size} ${diff} puzzle is solvable from its clues`,
    solved !== null && checkWinCondition(solved, relations));
}

// ---------- SUDOKU ----------
console.log('\nMINI SUDOKU');
for (const diff of ['Easy','Medium','Hard'] as const) {
  const t0 = Date.now();
  const { initial, solution } = genSudoku(diff);
  const ms = Date.now() - t0;
  check(`${diff} solution is complete and valid (${ms}ms)`, isGameWon(solution));
  const clues = initial.filter(c => c !== null).length;
  check(`${diff} clue count is sane (${clues} clues)`, clues >= 8 && clues <= 36);
  const consistent = initial.every((v, i) => v === null || v === solution[i]);
  check(`${diff} every given matches the solution`, consistent);

  // The real fix: exactly one solution.
  const count = (board: (number|null)[], limit = 2): number => {
    const i = board.findIndex(c => c === null);
    if (i === -1) return 1;
    let found = 0;
    for (let v = 1; v <= 6; v++) {
      if (!sudokuValid(board, i, v)) continue;
      board[i] = v; found += count(board, limit - found); board[i] = null;
      if (found >= limit) break;
    }
    return found;
  };
  check(`${diff} puzzle has exactly one solution`, count([...initial]) === 1);
}

// ---------- ZIP ----------
console.log('\nZIP');
for (const diff of ['Easy','Medium','Hard'] as const) {
  const t0 = Date.now();
  const config = genZip(diff);
  const ms = Date.now() - t0;
  const path = config.solutionPath!;
  check(`${diff} path covers every square exactly once (${ms}ms)`,
    path.length === config.width * config.height &&
    new Set(path.map(pointToString)).size === path.length);

  // Walk the stored solution through the game's own move validator.
  let legal = true;
  const walked = [path[0]];
  for (let i = 1; i < path.length; i++) {
    if (!zipValid(walked, path[i], config)) { legal = false; break; }
    walked.push(path[i]);
  }
  check(`${diff} solution path is legal move-by-move`, legal);
  check(`${diff} solution path registers as a win`, zipWin(walked, config));

  const numbers = Object.values(config.checkpoints).sort((a,b)=>a-b);
  check(`${diff} checkpoints numbered 1..N with no gaps`,
    numbers.every((n, i) => n === i + 1));
}

// ---------- QUEENS ----------
console.log('\nQUEENS');
for (const diff of ['Easy','Medium','Hard'] as const) {
  const N = 6;
  let unique = 0, agrees = 0, oneCrownPerRegion = 0, contiguous = 0, noTinyRegion = 0, ms = 0;

  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    const { size, regions, solution } = genQueens(diff);
    ms += Date.now() - t0;

    if (queensSolutions(size, regions, 3) === 1) unique++;

    const solved = queensSolve(size, regions);
    const key = (p: {r:number,c:number}) => `${p.r}-${p.c}`;
    if (solved && solved.length === size &&
        new Set(solved.map(key)).size === size &&
        solved.every(p => solution.some(q => key(q) === key(p))) &&
        findConflicts(size, regions, solved).size === 0) agrees++;

    const areas = new Map<number, number>();
    regions.forEach(r => areas.set(r, (areas.get(r) ?? 0) + 1));
    const crownCounts = new Array(size).fill(0);
    for (const crown of solution) crownCounts[regions[crown.r * size + crown.c]]++;
    if (areas.size === size && crownCounts.every(c => c === 1)) oneCrownPerRegion++;
    if (Math.min(...areas.values()) >= 2) noTinyRegion++;

    // Every region must be a single connected blob.
    let allConnected = true;
    for (const region of areas.keys()) {
      const cells = regions.map((v, idx) => v === region ? idx : -1).filter(i => i >= 0);
      const seen = new Set([cells[0]]); const queue = [cells[0]];
      while (queue.length) {
        const idx = queue.pop()!; const r = Math.floor(idx / size), c = idx % size;
        for (const nb of [r>0?idx-size:-1, r<size-1?idx+size:-1, c>0?idx-1:-1, c<size-1?idx+1:-1]) {
          if (nb < 0 || regions[nb] !== region || seen.has(nb)) continue;
          seen.add(nb); queue.push(nb);
        }
      }
      if (seen.size !== cells.length) allConnected = false;
    }
    if (allConnected) contiguous++;
  }

  const s = SIZE_FOR[diff];
  check(`${diff} ${s}x${s} has exactly one solution (${(ms/N).toFixed(0)}ms avg)`, unique === N, `${unique}/${N}`);
  check(`${diff} solver reproduces the intended crowns, conflict-free`, agrees === N, `${agrees}/${N}`);
  check(`${diff} one crown per region, ${s} regions`, oneCrownPerRegion === N, `${oneCrownPerRegion}/${N}`);
  check(`${diff} every region is contiguous`, contiguous === N, `${contiguous}/${N}`);
  check(`${diff} no single-cell giveaway region`, noTinyRegion === N, `${noTinyRegion}/${N}`);
}

// ---------- PATCHES ----------
console.log('\nPATCHES');
for (const diff of ['Easy','Medium','Hard'] as const) {
  const N = 12;
  let unique = 0, tiles = 0, seedOwnership = 0, ms = 0, patches = 0;

  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    const p = genPatches(diff);
    ms += Date.now() - t0;
    patches += p.solution.length;

    if (countTilings(p.size, p.seeds, 3) === 1) unique++;
    if (isComplete(p.size, p.seeds, p.solution)) tiles++;

    // Each marker must fall inside exactly one patch, and each patch hold one.
    const ok = p.seeds.every(seed => {
      const sx = seed.index % p.size, sy = Math.floor(seed.index / p.size);
      return p.solution.filter(r => sx >= r.x && sx < r.x + r.w && sy >= r.y && sy < r.y + r.h).length === 1;
    }) && p.solution.length === p.seeds.length;
    if (ok) seedOwnership++;
  }

  const s = PATCH_SIZE[diff];
  check(`${diff} ${s}x${s} has exactly one tiling (${(ms/N).toFixed(0)}ms avg, ${(patches/N).toFixed(1)} patches)`, unique === N, `${unique}/${N}`);
  check(`${diff} the stored solution tiles the board exactly`, tiles === N, `${tiles}/${N}`);
  check(`${diff} one marker per patch, one patch per marker`, seedOwnership === N, `${seedOwnership}/${N}`);
}

// ---------- WEND ----------
console.log('\nWEND');
{
  let lengthOk = 0, alphaOk = 0, dupeOk = 0, total = 0;
  for (const [len, list] of Object.entries(WORDS)) {
    total++;
    if (list.every(w => w.length === Number(len))) lengthOk++;
    if (list.every(w => /^[A-Z]+$/.test(w))) alphaOk++;
    if (new Set(list).size === list.length) dupeOk++;
  }
  check(`word bank: every entry matches its length bucket`, lengthOk === total);
  check(`word bank: every entry is plain A-Z (no truncation artefacts)`, alphaOk === total);
  check(`word bank: no duplicates within a length`, dupeOk === total);
}

for (const diff of ['Easy','Medium','Hard'] as const) {
  const N = 10;
  let partitions = 0, connected = 0, spells = 0, lettersOk = 0, distinct = 0, ms = 0;

  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    const p = genWend(diff);
    ms += Date.now() - t0;
    const { size } = SHAPE[diff];

    const seen = new Set<number>();
    let overlap = false;
    for (const path of p.paths) for (const c of path) { if (seen.has(c)) overlap = true; seen.add(c); }
    const free = p.blocked.filter(b => !b).length;
    if (!overlap && seen.size === free) partitions++;

    if (p.paths.every(path => path.every((c, k) => k === 0 || neighbours(size, path[k-1]).includes(c)))) connected++;
    if (p.paths.every((path, idx) => path.map(c => p.letters[c]).join('') === p.words[idx])) spells++;
    if (p.blocked.every((b, idx) => b ? p.letters[idx] === '' : p.letters[idx] !== '')) lettersOk++;
    if (new Set(p.words).size === p.words.length) distinct++;
  }

  const { size, lengths } = SHAPE[diff];
  check(`${diff} ${size}x${size} paths partition every free square (${(ms/N).toFixed(0)}ms avg)`, partitions === N, `${partitions}/${N}`);
  check(`${diff} every path is a connected walk`, connected === N, `${connected}/${N}`);
  check(`${diff} every path spells its word (${lengths.join('/')})`, spells === N, `${spells}/${N}`);
  check(`${diff} blocked squares hold no letter, free squares all do`, lettersOk === N, `${lettersOk}/${N}`);
  check(`${diff} no word repeats on a board`, distinct === N, `${distinct}/${N}`);
}

// ---------- PINPOINT ----------
console.log('\nPINPOINT');
{
  const ids = new Set(PINPOINT.map(p => p.id));
  check(`${PINPOINT.length} categories, all ids unique`, ids.size === PINPOINT.length);
  check('every category has exactly five clues', PINPOINT.every(p => p.clues.length === 5));
  check('no category repeats a clue', PINPOINT.every(p => new Set(p.clues).size === 5));
  check('every category accepts its own name', PINPOINT.every(p => isCorrect(p.category, p)));
  check('accepted answers are non-empty', PINPOINT.every(p => p.accept.length > 0 && p.accept.every(a => a.trim().length > 2)));
  // A clue must not hand over the category.
  const giveaways = PINPOINT.flatMap(p => p.clues.filter(c => isCorrect(c, p)).map(c => `${p.id}:${c}`));
  check('no clue simply restates the category', giveaways.length === 0, giveaways.join(', '));

  // Answer matching: generous about wording, strict about naming a clue.
  const greek = PINPOINT.find(p => p.id === 'p5')!;
  const chess = PINPOINT.find(p => p.id === 'p2')!;
  const cases: [string, PinpointPuzzle, boolean][] = [
    ['greek letters', greek, true], ['Greek Letters', greek, true],
    ['the greek alphabet', greek, true], ['alpha', greek, false],
    ['letters', greek, false], ['', greek, false],
    ['chess', chess, true], ['chess pieces', chess, true], ['king', chess, false],
  ];
  const wrong = cases.filter(([guess, puzzle, want]) => isCorrect(guess, puzzle) !== want);
  check('answer matching accepts rewordings and rejects bare clues',
    wrong.length === 0, wrong.map(([g]) => `"${g}"`).join(', '));
}

// ---------- CROSSCLIMB ----------
console.log('\nCROSSCLIMB');
for (const [label, bank] of [['easy',easyPuzzles],['medium',mediumPuzzles],['hard',hardPuzzles]] as const) {
  let ladderOk = true, lengthOk = true, idsOk = new Set<string>().size === 0;
  const ids = new Set<string>();
  const bad: string[] = [];
  for (const p of bank) {
    if (ids.has(p.id)) idsOk = false;
    ids.add(p.id);
    const chain = [p.topAnswer, ...p.middleRungs.map(r => r.answer), p.bottomAnswer];
    if (!chain.every(w => w.length === p.wordLength)) { lengthOk = false; bad.push(`${p.id} length`); }
    for (let i = 1; i < chain.length; i++) {
      if (!differsByOneLetter(chain[i], chain[i-1])) { ladderOk = false; bad.push(`${p.id}: ${chain[i-1]}→${chain[i]}`); }
    }
  }
  check(`${label}: ${bank.length} puzzles, all ids unique`, idsOk);
  check(`${label}: every answer matches its wordLength`, lengthOk, bad.filter(b=>b.includes('length')).join(', '));
  check(`${label}: every ladder steps by one letter`, ladderOk, bad.filter(b=>b.includes('→')).slice(0,8).join(' | '));
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
