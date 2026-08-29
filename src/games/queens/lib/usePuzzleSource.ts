import { useCallback, useEffect, useMemo, useRef } from "react";
import { generatePuzzleAsync } from "./generator";
import type { Difficulty, Puzzle } from "./types";

/** How long a fresh worker gets to answer a ping before we stop waiting on it. */
const HANDSHAKE_MS = 6000;
/** Safety net: a worker that goes quiet must not leave the board loading forever. */
const REQUEST_MS = 20000;

type WorkerState = "pending" | "ready" | "dead";

/**
 * Serves puzzles, keeping one spare per difficulty warm so "new puzzle" feels
 * instant even though a hard board takes a moment to search for.
 *
 * The search moves to a worker as soon as one proves it is alive. Where workers
 * are unavailable it runs on the main thread instead, in short slices, so the
 * page keeps painting either way.
 */
export function usePuzzleSource() {
  const workerRef = useRef<Worker | null>(null);
  const stateRef = useRef<WorkerState>("pending");
  const nextId = useRef(1);
  const waiting = useRef(new Map<number, (p: Puzzle | null) => void>());
  const spare = useRef(new Map<Difficulty, Puzzle>());
  const inflight = useRef(new Map<Difficulty, Promise<Puzzle>>());

  /**
   * Spins the worker up and pings it. Nothing waits on the answer: the first
   * puzzle is searched for on the main thread, and later ones move to the
   * worker once it has proved it is alive.
   */
  const openWorker = useCallback(() => {
    if (workerRef.current || stateRef.current === "dead") return;
    if (typeof Worker === "undefined") {
      stateRef.current = "dead";
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL("./generate.worker.ts", import.meta.url), { type: "module" });
    } catch {
      stateRef.current = "dead";
      return;
    }

    const handshake = window.setTimeout(() => {
      if (stateRef.current === "pending") stateRef.current = "dead";
    }, HANDSHAKE_MS);

    worker.addEventListener(
      "message",
      (event: MessageEvent<{ id: number; puzzle?: Puzzle; pong?: true }>) => {
        if (event.data.pong) {
          window.clearTimeout(handshake);
          stateRef.current = "ready";
          return;
        }
        const resolve = waiting.current.get(event.data.id);
        if (resolve && event.data.puzzle) {
          waiting.current.delete(event.data.id);
          resolve(event.data.puzzle);
        }
      },
    );
    worker.addEventListener("error", () => {
      window.clearTimeout(handshake);
      stateRef.current = "dead";
      workerRef.current = null;
      worker.terminate();
    });

    workerRef.current = worker;
    worker.postMessage({ id: nextId.current++, ping: true });
  }, []);

  const onMainThread = useCallback(
    (difficulty: Difficulty) => generatePuzzleAsync(difficulty, { budgetMs: 8000 }).then((r) => r.puzzle),
    [],
  );

  const generate = useCallback(
    async (difficulty: Difficulty): Promise<Puzzle> => {
      openWorker();
      const worker = workerRef.current;
      if (!worker || stateRef.current !== "ready") return onMainThread(difficulty);

      const id = nextId.current++;
      const puzzle = await new Promise<Puzzle | null>((resolve) => {
        waiting.current.set(id, resolve);
        window.setTimeout(() => {
          if (waiting.current.delete(id)) resolve(null);
        }, REQUEST_MS);
        worker.postMessage({ id, difficulty });
      });
      return puzzle ?? onMainThread(difficulty);
    },
    [openWorker, onMainThread],
  );

  /** Quietly builds the spare for a difficulty, if there isn't one already. */
  const prefetch = useCallback(
    (difficulty: Difficulty) => {
      if (spare.current.has(difficulty) || inflight.current.has(difficulty)) return;
      const promise = generate(difficulty).then((puzzle) => {
        spare.current.set(difficulty, puzzle);
        inflight.current.delete(difficulty);
        return puzzle;
      });
      inflight.current.set(difficulty, promise);
    },
    [generate],
  );

  /** Hands over a puzzle, using the spare when one is ready. */
  const take = useCallback(
    async (difficulty: Difficulty): Promise<Puzzle> => {
      const ready = spare.current.get(difficulty);
      if (ready) {
        spare.current.delete(difficulty);
        prefetch(difficulty);
        return ready;
      }
      const pending = inflight.current.get(difficulty);
      const puzzle = pending ? await pending : await generate(difficulty);
      spare.current.delete(difficulty);
      inflight.current.delete(difficulty);
      prefetch(difficulty);
      return puzzle;
    },
    [generate, prefetch],
  );

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Stable identity: effects depend on this object, and a fresh one every
  // render would re-trigger them forever.
  return useMemo(() => ({ take, prefetch }), [take, prefetch]);
}
