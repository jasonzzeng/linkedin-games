/** Small geometry helpers shared by the solver, the generator and the UI. */

export const idx = (size: number, r: number, c: number) => r * size + c;
export const rowOf = (size: number, i: number) => Math.floor(i / size);
export const colOf = (size: number, i: number) => i % size;

/** The 8 cells touching `i` (queens may not touch, not even diagonally). */
export function neighbors(size: number, i: number): number[] {
  const r = rowOf(size, i);
  const c = colOf(size, i);
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      out.push(idx(size, nr, nc));
    }
  }
  return out;
}

/** The 4 orthogonally adjacent cells (used when growing colour regions). */
export function orthogonal(size: number, i: number): number[] {
  const r = rowOf(size, i);
  const c = colOf(size, i);
  const out: number[] = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
}

/** Every cell a queen on `i` rules out: its row, its column, its region, its neighbours. */
export function attackedBy(size: number, regions: number[], i: number): number[] {
  const r = rowOf(size, i);
  const c = colOf(size, i);
  const region = regions[i];
  const seen = new Set<number>();
  for (let k = 0; k < size; k++) {
    seen.add(idx(size, r, k));
    seen.add(idx(size, k, c));
  }
  for (let k = 0; k < size * size; k++) if (regions[k] === region) seen.add(k);
  for (const n of neighbors(size, i)) seen.add(n);
  seen.delete(i);
  return [...seen];
}

/** Cells of each region, indexed by region id. */
export function regionCells(size: number, regions: number[]): number[][] {
  const out: number[][] = Array.from({ length: size }, () => []);
  for (let i = 0; i < size * size; i++) out[regions[i]].push(i);
  return out;
}

/** Which of a cell's 4 sides sit on a region boundary — used to draw the thick borders. */
export function regionBorders(size: number, regions: number[], i: number) {
  const r = rowOf(size, i);
  const c = colOf(size, i);
  const k = regions[i];
  return {
    top: r === 0 || regions[i - size] !== k,
    bottom: r === size - 1 || regions[i + size] !== k,
    left: c === 0 || regions[i - 1] !== k,
    right: c === size - 1 || regions[i + 1] !== k,
  };
}

/**
 * Cells along the straight line from `from` to `to`, excluding `from`.
 * Pointer moves can jump several squares at once; walking the line means a
 * quick drag still crosses out everything it passed over.
 */
export function cellsBetween(size: number, from: number, to: number): number[] {
  let r = rowOf(size, from);
  let c = colOf(size, from);
  const r1 = rowOf(size, to);
  const c1 = colOf(size, to);
  const dr = Math.abs(r1 - r);
  const dc = Math.abs(c1 - c);
  const sr = r < r1 ? 1 : -1;
  const sc = c < c1 ? 1 : -1;
  let err = dc - dr;
  const out: number[] = [];
  for (let guard = 0; guard < size * 4; guard++) {
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dr) {
      err -= dr;
      c += sc;
    }
    if (e2 < dc) {
      err += dc;
      r += sr;
    }
    out.push(idx(size, r, c));
  }
  return out;
}

/** Mulberry32 — tiny deterministic PRNG so a seed always rebuilds the same puzzle. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
