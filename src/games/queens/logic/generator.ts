import { countSolutions, enumerateSolutions } from './solver';
import type { Difficulty, Point, Puzzle } from '../types';

const MIN_REGION = 3;

export const SIZE_FOR: Record<Difficulty, number> = {
  Easy: 7,
  Medium: 8,
  Hard: 9,
};

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/**
 * A random legal crown placement: one per row and column, with neighbouring
 * rows more than one column apart so no two touch.
 */
function randomPlacement(size: number): Point[] | null {
  const used = new Array<boolean>(size).fill(false);
  const crowns: Point[] = [];

  const place = (row: number, previousColumn: number): boolean => {
    if (row === size) return true;
    for (const column of shuffle([...Array(size).keys()])) {
      if (used[column]) continue;
      if (row > 0 && Math.abs(column - previousColumn) <= 1) continue;

      used[column] = true;
      crowns.push({ r: row, c: column });
      if (place(row + 1, column)) return true;
      crowns.pop();
      used[column] = false;
    }
    return false;
  };

  return place(0, -2) ? crowns : null;
}

/** The unclaimed cells sitting directly against a region. */
function frontierOf(size: number, regions: number[], region: number): number[] {
  const frontier: number[] = [];
  for (let index = 0; index < regions.length; index++) {
    if (regions[index] !== region) continue;
    const r = Math.floor(index / size);
    const c = index % size;
    const neighbours = [
      r > 0 ? index - size : -1,
      r < size - 1 ? index + size : -1,
      c > 0 ? index - 1 : -1,
      c < size - 1 ? index + 1 : -1,
    ];
    for (const neighbour of neighbours) {
      if (neighbour >= 0 && regions[neighbour] === -1) frontier.push(neighbour);
    }
  }
  return frontier;
}

/**
 * Grows one region outward from each crown until the board is covered, so
 * every region holds exactly one crown by construction.
 *
 * Regions take turns claiming a single cell each round. Letting every region
 * bid at once instead — weighted by how much exposed edge it had — let one
 * region snowball across most of the board while its neighbours were squeezed
 * down to a single cell, which hands the player a free crown.
 */
function growRegions(size: number, crowns: Point[]): number[] {
  const regions = new Array<number>(size * size).fill(-1);
  crowns.forEach((crown, index) => {
    regions[crown.r * size + crown.c] = index;
  });

  let remaining = size * size - crowns.length;
  while (remaining > 0) {
    let claimed = false;

    for (const region of shuffle([...Array(crowns.length).keys()])) {
      if (remaining === 0) break;
      const frontier = frontierOf(size, regions, region);
      if (frontier.length === 0) continue;

      regions[frontier[Math.floor(Math.random() * frontier.length)]] = region;
      remaining--;
      claimed = true;
    }

    if (!claimed) break;
  }

  return regions;
}

/** Region areas indexed by region id. */
const areasOf = (regions: number[], count: number): number[] => {
  const areas = new Array<number>(count).fill(0);
  for (const region of regions) areas[region]++;
  return areas;
};

const neighboursOf = (size: number, index: number): number[] => {
  const r = Math.floor(index / size);
  const c = index % size;
  return [
    r > 0 ? index - size : -1,
    r < size - 1 ? index + size : -1,
    c > 0 ? index - 1 : -1,
    c < size - 1 ? index + 1 : -1,
  ].filter((neighbour) => neighbour >= 0);
};

/**
 * Taking a cell out of a region can split it in two. Rather than refuse those
 * moves — which stalled repair entirely on boards of 8x8 and up — let the split
 * happen and re-home whatever broke off. Only the piece holding the region's
 * crown keeps the region; the rest is adopted by whichever neighbouring region
 * it touches, so every region stays contiguous and keeps exactly one crown.
 */
function healRegion(size: number, regions: number[], region: number, crownIndex: number): void {
  const attached = new Set<number>([crownIndex]);
  const queue = [crownIndex];
  while (queue.length > 0) {
    const index = queue.pop()!;
    for (const neighbour of neighboursOf(size, index)) {
      if (regions[neighbour] !== region || attached.has(neighbour)) continue;
      attached.add(neighbour);
      queue.push(neighbour);
    }
  }

  let orphans = regions
    .map((value, index) => (value === region && !attached.has(index) ? index : -1))
    .filter((index) => index >= 0);

  while (orphans.length > 0) {
    const before = orphans.length;

    for (const orphan of orphans) {
      const adopters = neighboursOf(size, orphan).filter(
        (neighbour) => regions[neighbour] !== region,
      );
      if (adopters.length === 0) continue;
      regions[orphan] = regions[shuffle(adopters)[0]];
    }

    orphans = orphans.filter((index) => regions[index] === region);
    if (orphans.length === before) break;
  }
}

/**
 * Random regions almost never pin down a single answer on their own — at 8x8
 * thousands of rerolls found none — so ambiguity is repaired rather than
 * reshuffled.
 *
 * Given the intended solution S and some rival S', take a cell that only S'
 * crowns and hand it to a neighbouring region. S is untouched, because that
 * cell holds none of its crowns and every region keeps exactly the one it had.
 * S' cannot survive: the region it crowned there is left with none, and the
 * region receiving the cell now has two. Each repair therefore kills one rival
 * outright while preserving the answer, so this converges instead of drifting.
 */
function disambiguate(size: number, regions: number[], solution: Point[]): boolean {
  const intended = new Set(solution.map((crown) => crown.r * size + crown.c));
  const crownOf = new Map<number, number>();
  for (const crown of solution) {
    const index = crown.r * size + crown.c;
    crownOf.set(regions[index], index);
  }

  /** Moves one of the rival's own cells into a neighbouring region. */
  const repair = (rival: Point[], guarded: boolean): boolean => {
    for (const crown of rival) {
      const index = crown.r * size + crown.c;
      if (intended.has(index)) continue;

      const region = regions[index];

      // Leave a region big enough to still be a puzzle: a lone cell hands the
      // player that crown for free. Relaxed if nothing else will converge.
      if (guarded) {
        let regionSize = 0;
        for (const value of regions) if (value === region) regionSize++;
        if (regionSize - 1 < MIN_REGION) continue;
      }

      const adopters = neighboursOf(size, index).filter(
        (neighbour) => regions[neighbour] !== region,
      );
      if (adopters.length === 0) continue;

      regions[index] = regions[shuffle(adopters)[0]];
      healRegion(size, regions, region, crownOf.get(region)!);
      return true;
    }
    return false;
  };

  for (let step = 0; step < size * size * 30; step++) {
    const solutions = enumerateSolutions(size, regions, 2);
    if (solutions.length <= 1) return solutions.length === 1;

    const rival = solutions.find((candidate) =>
      candidate.some((crown) => !intended.has(crown.r * size + crown.c)),
    );
    if (!rival) return false;

    // Prefer a repair that keeps regions a decent size; fall back to any legal
    // one rather than abandoning a board that is otherwise fine.
    if (!repair(rival, true) && !repair(rival, false)) return false;
  }

  return countSolutions(size, regions, 2) === 1;
}

export function generatePuzzle(difficulty: Difficulty): Puzzle {
  const size = SIZE_FOR[difficulty];

  for (let attempt = 0; attempt < 250; attempt++) {
    const crowns = randomPlacement(size);
    if (!crowns) continue;

    const regions = growRegions(size, crowns);
    if (regions.includes(-1)) continue;
    if (!disambiguate(size, regions, crowns)) continue;

    // Every region must still hold exactly one crown after the repairs.
    const perRegion = new Array<number>(size).fill(0);
    for (const crown of crowns) perRegion[regions[crown.r * size + crown.c]]++;
    if (perRegion.some((count) => count !== 1)) continue;

    // A one-cell region hands over its crown for free, so redraw rather than
    // ship one — but take whatever solves rather than fail outright if the
    // attempts run down.
    const areas = areasOf(regions, size);
    const smallest = Math.min(...areas);
    const largest = Math.max(...areas);
    if (attempt < 200 && (smallest < 2 || largest > size * 2.5)) continue;

    return { size, regions, solution: crowns };
  }

  throw new Error(`Could not generate a ${size}x${size} Queens board`);
}
