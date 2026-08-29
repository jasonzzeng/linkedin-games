import { makeRng, orthogonal, shuffle } from "./board";
import { countSolutions, listSolutions, rate } from "./solver";
import { DIFFICULTY_SPECS, type Difficulty, type Puzzle } from "./types";

/** A random legal queen arrangement: one per row and column, none touching. */
function randomArrangement(size: number, rng: () => number): number[] | null {
  const cols = new Array<number>(size).fill(-1);
  const used = new Uint8Array(size);
  const rec = (r: number): boolean => {
    if (r === size) return true;
    for (const c of shuffle(
      Array.from({ length: size }, (_, i) => i),
      rng,
    )) {
      if (used[c]) continue;
      if (r > 0 && Math.abs(c - cols[r - 1]) <= 1) continue;
      used[c] = 1;
      cols[r] = c;
      if (rec(r + 1)) return true;
      used[c] = 0;
      cols[r] = -1;
    }
    return false;
  };
  return rec(0) ? cols : null;
}

/**
 * Grows one region out from each queen until the board is covered. Regions are
 * connected by construction; biasing toward the smallest region keeps them
 * roughly even in size rather than letting one blob swallow the grid.
 */
function growRegions(size: number, arrangement: number[], rng: () => number): number[] | null {
  const n2 = size * size;
  const regions = new Array<number>(n2).fill(-1);
  const frontier: Set<number>[] = [];
  const counts = new Array<number>(size).fill(1);

  for (let r = 0; r < size; r++) {
    const cell = r * size + arrangement[r];
    regions[cell] = r;
    frontier.push(new Set(orthogonal(size, cell).filter((c) => regions[c] === -1)));
  }

  let remaining = n2 - size;
  while (remaining > 0) {
    const live: number[] = [];
    for (let k = 0; k < size; k++) {
      for (const cell of [...frontier[k]]) if (regions[cell] !== -1) frontier[k].delete(cell);
      if (frontier[k].size) live.push(k);
    }
    if (!live.length) return null;

    let pick: number;
    if (rng() < 0.75) {
      let best = Infinity;
      const tied: number[] = [];
      for (const k of live) {
        if (counts[k] < best) {
          best = counts[k];
          tied.length = 0;
        }
        if (counts[k] === best) tied.push(k);
      }
      pick = tied[Math.floor(rng() * tied.length)];
    } else {
      pick = live[Math.floor(rng() * live.length)];
    }

    const options = [...frontier[pick]];
    const cell = options[Math.floor(rng() * options.length)];
    regions[cell] = pick;
    counts[pick]++;
    remaining--;
    for (const n of orthogonal(size, cell)) if (regions[n] === -1) frontier[pick].add(n);
  }

  // A single-square region gives its crown away; reject those boards.
  if (counts.some((c) => c < 2)) return null;
  return regions;
}

/** Would region `k` still be one connected blob without cell `cell`? */
function stillConnected(size: number, regions: number[], k: number, cell: number, seed: number): boolean {
  const members: number[] = [];
  for (let i = 0; i < regions.length; i++) if (regions[i] === k && i !== cell) members.push(i);
  if (members.length < 2) return false; // never shrink a region below two squares
  const seen = new Set<number>([seed]);
  const stack = [seed];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of orthogonal(size, cur)) {
      if (regions[n] === k && n !== cell && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === members.length;
}

const SOLUTION_CAP = 40;

/**
 * Local search that recolours single squares until the board has exactly one
 * solution. Seed squares (the intended queens) are never recoloured, so the
 * intended arrangement always stays valid and the count only ever has to fall.
 *
 * Moves are biased toward squares used by a rival solution — those are the ones
 * standing between us and uniqueness.
 */
function* refineToUnique(
  size: number,
  regions: number[],
  seeds: number[],
  rng: () => number,
  maxSteps: number,
): Generator<void, boolean> {
  let score = countSolutions(size, regions, SOLUTION_CAP);
  let stale = 0;

  for (let step = 0; step < maxSteps && score > 1; step++) {
    if (step % 24 === 0) yield;
    // Pick a square to recolour.
    let target = -1;
    if (rng() < 0.8) {
      const rivals = listSolutions(size, regions, 6).filter(
        (s) => !s.every((c, r) => r * size + c === seeds[r]),
      );
      if (rivals.length) {
        const rival = rivals[Math.floor(rng() * rivals.length)];
        const rows = shuffle(
          Array.from({ length: size }, (_, r) => r),
          rng,
        );
        for (const r of rows) {
          const cell = r * size + rival[r];
          if (!seeds.includes(cell)) {
            target = cell;
            break;
          }
        }
      }
    }
    if (target === -1) {
      for (let t = 0; t < 30 && target === -1; t++) {
        const cell = Math.floor(rng() * regions.length);
        if (!seeds.includes(cell)) target = cell;
      }
    }
    if (target === -1) continue;

    const from = regions[target];
    const options = shuffle(
      [...new Set(orthogonal(size, target).map((n) => regions[n]))].filter((k) => k !== from),
      rng,
    );
    if (!options.length) continue;
    if (!stillConnected(size, regions, from, target, seeds[from])) continue;

    const to = options[0];
    regions[target] = to;
    const next = countSolutions(size, regions, SOLUTION_CAP);
    if (next < score || (next === score && rng() < 0.4)) {
      if (next < score) stale = 0;
      score = next;
    } else {
      regions[target] = from;
      stale++;
      if (stale > 250) return false; // wedged — caller starts a fresh board
    }
  }
  return score === 1;
}

export interface GenerateOptions {
  /** Wall-clock budget in ms before settling for the closest puzzle found. */
  budgetMs?: number;
  seed?: number;
}

export interface GenerateResult {
  puzzle: Puzzle;
  attempts: number;
  ms: number;
  /** True when the budget ran out and the grade is a near miss. */
  relaxed: boolean;
}

/**
 * Nudges an already-unique board toward a target grade by recolouring single
 * squares, keeping uniqueness at every step.
 */
function* tuneRating(
  size: number,
  regions: number[],
  seeds: number[],
  rng: () => number,
  minRating: number,
  maxRating: number,
  steps: number,
): Generator<void, number> {
  const dist = (r: number) => (r < minRating ? minRating - r : r > maxRating ? r - maxRating : 0);
  let current = rate(size, regions);
  for (let step = 0; step < steps && dist(current) > 0; step++) {
    if (step % 12 === 0) yield;
    const target = Math.floor(rng() * regions.length);
    if (seeds.includes(target)) continue;
    const from = regions[target];
    const options = shuffle(
      [...new Set(orthogonal(size, target).map((n) => regions[n]))].filter((k) => k !== from),
      rng,
    );
    if (!options.length) continue;
    if (!stillConnected(size, regions, from, target, seeds[from])) continue;

    regions[target] = options[0];
    if (countSolutions(size, regions, 2) !== 1) {
      regions[target] = from;
      continue;
    }
    const next = rate(size, regions);
    if (dist(next) <= dist(current)) current = next;
    else regions[target] = from;
  }
  return current;
}

/**
 * Builds a puzzle with exactly one solution whose grade matches `difficulty`.
 *
 * Written as a generator that yields after every attempt so the caller decides
 * how to spend the time: the worker drains it in one go, while the main-thread
 * fallback drains it in slices and keeps the page responsive.
 */
export function* generateSteps(
  difficulty: Difficulty,
  options: GenerateOptions = {},
): Generator<void, GenerateResult> {
  const spec = DIFFICULTY_SPECS[difficulty];
  const { size, minRating, maxRating } = spec;
  const budgetMs = options.budgetMs ?? 6000;
  const started = Date.now();
  const baseSeed = options.seed ?? (Math.random() * 0xffffffff) >>> 0;
  const dist = (r: number) => (r < minRating ? minRating - r : r > maxRating ? r - maxRating : 0);

  let attempts = 0;
  let fallback: { regions: number[]; solution: number[]; rating: number; seed: number } | null = null;

  for (;;) {
    const seed = (baseSeed + attempts * 0x9e3779b1) >>> 0;
    const rng = makeRng(seed);
    attempts++;
    const outOfTime = Date.now() - started > budgetMs;

    const arrangement = randomArrangement(size, rng);
    const regions = arrangement && growRegions(size, arrangement, rng);
    if (arrangement && regions) {
      const seeds = arrangement.map((c, r) => r * size + c);
      if (yield* refineToUnique(size, regions, seeds, rng, 2500)) {
        let rating = rate(size, regions);
        if (dist(rating) > 0 && !outOfTime) {
          rating = yield* tuneRating(size, regions, seeds, rng, minRating, maxRating, 400);
        }
        const solution = Array.from({ length: size }, (_, r) => arrangement[r]);
        if (dist(rating) === 0) {
          return {
            puzzle: { id: seed.toString(36), size, regions, solution, difficulty, rating },
            attempts,
            ms: Date.now() - started,
            relaxed: false,
          };
        }
        if (!fallback || dist(rating) < dist(fallback.rating)) {
          fallback = { regions: [...regions], solution, rating, seed };
        }
      }
    }

    if (outOfTime && fallback) {
      return {
        puzzle: {
          id: fallback.seed.toString(36),
          size,
          regions: fallback.regions,
          solution: fallback.solution,
          difficulty,
          rating: fallback.rating,
        },
        attempts,
        ms: Date.now() - started,
        relaxed: true,
      };
    }
    yield;
  }
}

/** Runs the search to completion on the calling thread. */
export function generatePuzzle(difficulty: Difficulty, options: GenerateOptions = {}): GenerateResult {
  const steps = generateSteps(difficulty, options);
  for (;;) {
    const step = steps.next();
    if (step.done) return step.value;
  }
}

/**
 * Hands the thread back to the browser. A MessageChannel task is used rather
 * than a timer because background tabs clamp `setTimeout` to a second or more,
 * which would stretch a half-second search into minutes.
 */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof MessageChannel === "undefined") {
      setTimeout(resolve, 0);
      return;
    }
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

/**
 * Same search, but yields every `sliceMs` so a page without a working worker
 * still paints its loading state and stays clickable.
 */
export async function generatePuzzleAsync(
  difficulty: Difficulty,
  options: GenerateOptions = {},
  sliceMs = 20,
): Promise<GenerateResult> {
  const steps = generateSteps(difficulty, options);
  for (;;) {
    const sliceStart = Date.now();
    for (;;) {
      const step = steps.next();
      if (step.done) return step.value;
      if (Date.now() - sliceStart > sliceMs) break;
    }
    await yieldToBrowser();
  }
}
