import type { Point } from '../types';

/**
 * Exactly one crown per row, per column and per region, and no two crowns
 * touching — including diagonally. Because there is precisely one crown per
 * row, two crowns can only ever touch across neighbouring rows, which reduces
 * the whole adjacency rule to "columns must differ by more than one".
 */
export function countSolutions(size: number, regions: number[], limit = 2): number {
  const columnUsed = new Array<boolean>(size).fill(false);
  const regionUsed = new Array<boolean>(size).fill(false);
  let found = 0;

  const place = (row: number, previousColumn: number) => {
    if (found >= limit) return;
    if (row === size) {
      found++;
      return;
    }

    for (let column = 0; column < size; column++) {
      if (columnUsed[column]) continue;
      if (row > 0 && Math.abs(column - previousColumn) <= 1) continue;
      const region = regions[row * size + column];
      if (regionUsed[region]) continue;

      columnUsed[column] = true;
      regionUsed[region] = true;
      place(row + 1, column);
      columnUsed[column] = false;
      regionUsed[region] = false;

      if (found >= limit) return;
    }
  };

  place(0, -2);
  return found;
}

/** Finds the one valid placement. Returns null if the regions admit none. */
export function solve(size: number, regions: number[]): Point[] | null {
  const columnUsed = new Array<boolean>(size).fill(false);
  const regionUsed = new Array<boolean>(size).fill(false);
  const crowns: Point[] = [];

  const place = (row: number, previousColumn: number): boolean => {
    if (row === size) return true;

    for (let column = 0; column < size; column++) {
      if (columnUsed[column]) continue;
      if (row > 0 && Math.abs(column - previousColumn) <= 1) continue;
      const region = regions[row * size + column];
      if (regionUsed[region]) continue;

      columnUsed[column] = true;
      regionUsed[region] = true;
      crowns.push({ r: row, c: column });

      if (place(row + 1, column)) return true;

      crowns.pop();
      columnUsed[column] = false;
      regionUsed[region] = false;
    }
    return false;
  };

  return place(0, -2) ? crowns : null;
}

/** Which of the placed crowns break a rule, for live feedback while playing. */
export function findConflicts(size: number, regions: number[], crowns: Point[]): Set<string> {
  const conflicts = new Set<string>();
  const key = (p: Point) => `${p.r}-${p.c}`;

  for (let i = 0; i < crowns.length; i++) {
    for (let j = i + 1; j < crowns.length; j++) {
      const a = crowns[i];
      const b = crowns[j];
      const touching = Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1;
      const sameLine = a.r === b.r || a.c === b.c;
      const sameRegion = regions[a.r * size + a.c] === regions[b.r * size + b.c];

      if (touching || sameLine || sameRegion) {
        conflicts.add(key(a));
        conflicts.add(key(b));
      }
    }
  }

  return conflicts;
}

/** Up to `limit` distinct placements, used when repairing an ambiguous board. */
export function enumerateSolutions(size: number, regions: number[], limit = 2): Point[][] {
  const columnUsed = new Array<boolean>(size).fill(false);
  const regionUsed = new Array<boolean>(size).fill(false);
  const current: Point[] = [];
  const found: Point[][] = [];

  const place = (row: number, previousColumn: number) => {
    if (found.length >= limit) return;
    if (row === size) {
      found.push([...current]);
      return;
    }

    for (let column = 0; column < size; column++) {
      if (columnUsed[column]) continue;
      if (row > 0 && Math.abs(column - previousColumn) <= 1) continue;
      const region = regions[row * size + column];
      if (regionUsed[region]) continue;

      columnUsed[column] = true;
      regionUsed[region] = true;
      current.push({ r: row, c: column });
      place(row + 1, column);
      current.pop();
      columnUsed[column] = false;
      regionUsed[region] = false;

      if (found.length >= limit) return;
    }
  };

  place(0, -2);
  return found;
}
