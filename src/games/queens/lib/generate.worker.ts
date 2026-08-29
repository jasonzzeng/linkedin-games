import { generatePuzzle } from "./generator";
import type { Difficulty, Puzzle } from "./types";

export type GenerateRequest =
  | { id: number; ping: true; difficulty?: undefined }
  | { id: number; ping?: false; difficulty: Difficulty };

export type GenerateResponse = { id: number; pong: true } | { id: number; puzzle: Puzzle };

self.addEventListener("message", (event: MessageEvent<GenerateRequest>) => {
  const post = (message: GenerateResponse) => (self as unknown as Worker).postMessage(message);
  if (event.data.ping) {
    post({ id: event.data.id, pong: true });
    return;
  }
  const result = generatePuzzle(event.data.difficulty, { budgetMs: 8000 });
  post({ id: event.data.id, puzzle: result.puzzle });
});
