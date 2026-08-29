export interface PinpointPuzzle {
  id: string;
  /** Shown when the round ends. */
  category: string;
  /** Phrases counted as correct. Include a short alias, since a guess must
   *  contain every word of at least one of these to be accepted. */
  accept: string[];
  /** Five members of the category, vaguest first. */
  clues: [string, string, string, string, string];
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'to', 'for']);

/** Lower-cases, drops punctuation and filler words, and de-pluralises. */
export function tokenise(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token))
    .map((token) => (token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token));
}

/**
 * A guess counts when it contains every word of an accepted phrase — so
 * "the greek letters" matches "greek letter", while "alpha" does not.
 *
 * Plain substring matching was the first attempt and was far too generous:
 * "alpha" is a substring of "greek alphabet", so naming a single clue was
 * scored as naming the category.
 */
export function isCorrect(guess: string, puzzle: PinpointPuzzle): boolean {
  const answer = new Set(tokenise(guess));
  if (answer.size === 0) return false;

  return puzzle.accept.some((phrase) => {
    const target = tokenise(phrase);
    return target.length > 0 && target.every((token) => answer.has(token));
  });
}
