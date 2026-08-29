import { attackedBy, colOf, regionCells, rowOf } from "./board";

/* -------------------------------------------------------------------------- */
/*  Exhaustive solver — used to guarantee a puzzle has exactly one solution.   */
/* -------------------------------------------------------------------------- */

/**
 * Counts solutions (up to `limit`). One queen per row means we can walk row by
 * row and only ever need to compare against the previous row for adjacency.
 */
export function countSolutions(size: number, regions: number[], limit = 2): number {
  let count = 0;
  const rec = (r: number, usedCols: number, usedRegions: number, prevCol: number) => {
    if (count >= limit) return;
    if (r === size) {
      count++;
      return;
    }
    for (let c = 0; c < size; c++) {
      const colBit = 1 << c;
      if (usedCols & colBit) continue;
      if (r > 0 && Math.abs(c - prevCol) <= 1) continue;
      const regBit = 1 << regions[r * size + c];
      if (usedRegions & regBit) continue;
      rec(r + 1, usedCols | colBit, usedRegions | regBit, c);
      if (count >= limit) return;
    }
  };
  rec(0, 0, 0, -5);
  return count;
}

/** First solution found, as solution[row] = col. */
export function findSolution(size: number, regions: number[]): number[] | null {
  const sol = new Array<number>(size).fill(-1);
  const rec = (r: number, usedCols: number, usedRegions: number, prevCol: number): boolean => {
    if (r === size) return true;
    for (let c = 0; c < size; c++) {
      const colBit = 1 << c;
      if (usedCols & colBit) continue;
      if (r > 0 && Math.abs(c - prevCol) <= 1) continue;
      const regBit = 1 << regions[r * size + c];
      if (usedRegions & regBit) continue;
      sol[r] = c;
      if (rec(r + 1, usedCols | colBit, usedRegions | regBit, c)) return true;
    }
    sol[r] = -1;
    return false;
  };
  return rec(0, 0, 0, -5) ? sol : null;
}

/** Up to `limit` distinct solutions, each as solution[row] = col. */
export function listSolutions(size: number, regions: number[], limit: number): number[][] {
  const out: number[][] = [];
  const cols = new Array<number>(size).fill(-1);
  const rec = (r: number, usedCols: number, usedRegions: number, prevCol: number) => {
    if (out.length >= limit) return;
    if (r === size) {
      out.push([...cols]);
      return;
    }
    for (let c = 0; c < size; c++) {
      const colBit = 1 << c;
      if (usedCols & colBit) continue;
      if (r > 0 && Math.abs(c - prevCol) <= 1) continue;
      const regBit = 1 << regions[r * size + c];
      if (usedRegions & regBit) continue;
      cols[r] = c;
      rec(r + 1, usedCols | colBit, usedRegions | regBit, c);
      if (out.length >= limit) return;
    }
    cols[r] = -1;
  };
  rec(0, 0, 0, -5);
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Logical solver — mirrors how a person solves, and grades the puzzle.       */
/* -------------------------------------------------------------------------- */

export type GroupKind = "row" | "col" | "region";

export interface Group {
  kind: GroupKind;
  id: number;
  cells: number[];
}

export interface Move {
  /** 1 = spotting a forced cell, 4 = proof by contradiction. */
  level: number;
  kind: "place" | "eliminate";
  /** Cells the move acts on. */
  cells: number[];
  /** Cells that justify it (highlighted alongside, in the hint UI). */
  focus: number[];
  message: string;
}

const WORD = 32;

class BitSet {
  words: Uint32Array;
  constructor(bits: number, copy?: Uint32Array) {
    this.words = copy ? Uint32Array.from(copy) : new Uint32Array(Math.ceil(bits / WORD));
  }
  add(i: number) {
    this.words[(i / WORD) | 0] |= 1 << i % WORD;
  }
  has(i: number) {
    return (this.words[(i / WORD) | 0] & (1 << i % WORD)) !== 0;
  }
  andWith(other: BitSet) {
    for (let w = 0; w < this.words.length; w++) this.words[w] &= other.words[w];
  }
  isEmpty() {
    for (let w = 0; w < this.words.length; w++) if (this.words[w]) return false;
    return true;
  }
}

export interface Analysis {
  size: number;
  regions: number[];
  groups: Group[];
  /** Group indices touching each cell: [row, col, region]. */
  cellGroups: number[][];
  attacks: number[][];
  attackBits: BitSet[];
}

export function analyse(size: number, regions: number[]): Analysis {
  const n2 = size * size;
  const groups: Group[] = [];
  for (let r = 0; r < size; r++) {
    groups.push({ kind: "row", id: r, cells: Array.from({ length: size }, (_, c) => r * size + c) });
  }
  for (let c = 0; c < size; c++) {
    groups.push({ kind: "col", id: c, cells: Array.from({ length: size }, (_, r) => r * size + c) });
  }
  for (const cells of regionCells(size, regions)) {
    groups.push({ kind: "region", id: regions[cells[0]], cells });
  }
  const cellGroups: number[][] = Array.from({ length: n2 }, () => []);
  groups.forEach((g, gi) => g.cells.forEach((cell) => cellGroups[cell].push(gi)));

  const attacks: number[][] = [];
  const attackBits: BitSet[] = [];
  for (let i = 0; i < n2; i++) {
    const a = attackedBy(size, regions, i);
    attacks.push(a);
    const bs = new BitSet(n2);
    for (const cell of a) bs.add(cell);
    attackBits.push(bs);
  }
  return { size, regions, groups, cellGroups, attacks, attackBits };
}

export interface LogicState {
  cand: Uint8Array;
  queen: Uint8Array;
  placed: number;
}

export function initialState(a: Analysis): LogicState {
  const n2 = a.size * a.size;
  return { cand: new Uint8Array(n2).fill(1), queen: new Uint8Array(n2), placed: 0 };
}

export function cloneState(s: LogicState): LogicState {
  return { cand: Uint8Array.from(s.cand), queen: Uint8Array.from(s.queen), placed: s.placed };
}

export function placeQueen(a: Analysis, s: LogicState, i: number) {
  if (s.queen[i]) return;
  s.queen[i] = 1;
  s.cand[i] = 0;
  s.placed++;
  for (const cell of a.attacks[i]) s.cand[cell] = 0;
}

const groupHasQueen = (s: LogicState, g: Group) => g.cells.some((c) => s.queen[c]);
const groupCands = (s: LogicState, g: Group) => g.cells.filter((c) => s.cand[c]);

/** A group with no queen and nowhere left to put one means the state is impossible. */
export function hasContradiction(a: Analysis, s: LogicState): boolean {
  for (const g of a.groups) {
    if (groupHasQueen(s, g)) continue;
    if (!g.cells.some((c) => s.cand[c])) return true;
  }
  return false;
}

const groupName = (g: Group) =>
  g.kind === "row" ? `row ${g.id + 1}` : g.kind === "col" ? `column ${g.id + 1}` : "this colour region";

/** Finds the easiest available deduction, or null when the state is stuck. */
export function findMove(a: Analysis, s: LogicState, maxLevel: number): Move | null {
  // Level 1 — a row, column or region with a single remaining square.
  for (const g of a.groups) {
    if (groupHasQueen(s, g)) continue;
    const cands = groupCands(s, g);
    if (cands.length === 1) {
      return {
        level: 1,
        kind: "place",
        cells: cands,
        focus: g.cells,
        message: `Only one square is left in ${groupName(g)}, so the crown must go there.`,
      };
    }
  }
  if (maxLevel < 2) return null;

  // Level 2 — confinement. A region trapped in one line clears the rest of that
  // line, and a line trapped inside one region clears the rest of that region.
  for (const g of a.groups) {
    if (groupHasQueen(s, g)) continue;
    const cands = groupCands(s, g);
    if (cands.length < 2) continue;

    if (g.kind === "region") {
      for (const axis of ["row", "col"] as const) {
        const line = axis === "row" ? rowOf(a.size, cands[0]) : colOf(a.size, cands[0]);
        const same = cands.every(
          (c) => (axis === "row" ? rowOf(a.size, c) : colOf(a.size, c)) === line,
        );
        if (!same) continue;
        const lineGroup = a.groups[axis === "row" ? line : a.size + line];
        const kill = groupCands(s, lineGroup).filter((c) => a.regions[c] !== g.id);
        if (kill.length) {
          return {
            level: 2,
            kind: "eliminate",
            cells: kill,
            focus: cands,
            message: `This colour only fits in ${groupName(lineGroup)}, so no other square in ${groupName(
              lineGroup,
            )} can hold a crown.`,
          };
        }
      }
    } else {
      const region = a.regions[cands[0]];
      if (!cands.every((c) => a.regions[c] === region)) continue;
      const regionGroup = a.groups[2 * a.size + region];
      const kill = groupCands(s, regionGroup).filter((c) => !cands.includes(c));
      if (kill.length) {
        return {
          level: 2,
          kind: "eliminate",
          cells: kill,
          focus: cands,
          message: `Every square left in ${groupName(g)} shares one colour, so that colour's crown is used up here — the rest of the colour can be crossed out.`,
        };
      }
    }
  }
  if (maxLevel < 3) return null;

  // Level 3 — squeeze. If every remaining square of a group attacks the same
  // outside cell, that cell is dead whichever square ends up holding the crown.
  for (const g of a.groups) {
    if (groupHasQueen(s, g)) continue;
    const cands = groupCands(s, g);
    if (cands.length < 2 || cands.length > 5) continue;
    const inter = new BitSet(a.size * a.size, a.attackBits[cands[0]].words);
    for (let k = 1; k < cands.length; k++) inter.andWith(a.attackBits[cands[k]]);
    if (inter.isEmpty()) continue;
    const kill: number[] = [];
    for (let i = 0; i < s.cand.length; i++) if (s.cand[i] && inter.has(i)) kill.push(i);
    if (kill.length) {
      return {
        level: 3,
        kind: "eliminate",
        cells: kill,
        focus: cands,
        message: `Wherever the crown for ${groupName(g)} goes, it rules out these squares — so they can be crossed out now.`,
      };
    }
  }
  if (maxLevel < 4) return null;

  // Level 4 — try a square and show it fails.
  for (let i = 0; i < s.cand.length; i++) {
    if (!s.cand[i]) continue;
    const trial = cloneState(s);
    placeQueen(a, trial, i);
    if (propagate(a, trial, 2)) {
      return {
        level: 4,
        kind: "eliminate",
        cells: [i],
        focus: [i],
        message: `Putting a crown here leaves some row, column or colour with nowhere to go, so it can be crossed out.`,
      };
    }
  }
  return null;
}

/** Applies moves until stuck. Returns true if a contradiction appeared. */
function propagate(a: Analysis, s: LogicState, maxLevel: number): boolean {
  for (;;) {
    if (hasContradiction(a, s)) return true;
    if (s.placed === a.size) return false;
    const move = findMove(a, s, maxLevel);
    if (!move) return false;
    applyMove(a, s, move);
  }
}

export function applyMove(a: Analysis, s: LogicState, move: Move) {
  if (move.kind === "place") for (const c of move.cells) placeQueen(a, s, c);
  else for (const c of move.cells) s.cand[c] = 0;
}

/**
 * Grades a puzzle: the lowest technique level that cracks it end to end.
 * 4 means the straightforward techniques stall and the solver has to test a
 * square and disprove it — a puzzle with a unique solution always yields to
 * that, so we never need to run the (expensive) level-4 search to find out.
 */
export function rate(size: number, regions: number[], analysis?: Analysis): number {
  const a = analysis ?? analyse(size, regions);
  for (let level = 1; level <= 3; level++) {
    const s = initialState(a);
    propagate(a, s, level);
    if (s.placed === size) return level;
  }
  return 4;
}

/** What the hint button can come back with. */
export type Hint =
  | { kind: "wrong-crown"; cells: number[]; focus: number[]; message: string }
  | { kind: "wrong-mark"; cells: number[]; focus: number[]; message: string }
  | Move;

/**
 * The next deduction for the player, reasoning from the board as they have
 * actually marked it — crowns *and* X's. Seeding their X's is what stops the
 * hint from proposing work they have already done.
 *
 * Their marks are only trusted once they check out: a crown or an X that can't
 * be part of the solution is reported instead, since every later deduction
 * would be built on it.
 */
export function hint(
  size: number,
  regions: number[],
  solution: number[],
  queens: number[],
  marks: number[] = [],
): Hint | null {
  const onSolution = (cell: number) => solution[rowOf(size, cell)] === colOf(size, cell);

  const badCrowns = queens.filter((q) => !onSolution(q));
  if (badCrowns.length) {
    return {
      kind: "wrong-crown",
      cells: badCrowns,
      focus: [],
      message:
        badCrowns.length === 1
          ? "This crown can't be part of the solution — try moving it."
          : `${badCrowns.length} of your crowns can't be part of the solution — try moving them.`,
    };
  }

  const badMarks = marks.filter((m) => onSolution(m) && !queens.includes(m));
  if (badMarks.length) {
    return {
      kind: "wrong-mark",
      cells: badMarks,
      focus: [],
      message:
        badMarks.length === 1
          ? "This square is crossed out, but a crown has to go there — clear it first."
          : `${badMarks.length} of your crossed-out squares have to hold crowns — clear them first.`,
    };
  }

  const a = analyse(size, regions);
  const s = initialState(a);
  for (const q of queens) placeQueen(a, s, q);
  for (const m of marks) if (!s.queen[m]) s.cand[m] = 0;
  if (s.placed === size) return null;
  return findMove(a, s, 4);
}
