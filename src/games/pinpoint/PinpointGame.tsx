import { useCallback, useEffect, useRef, useState } from 'react';
import { CornerDownLeft, Shuffle } from 'lucide-react';
import { getGame } from '../../lib/games';
import { useTimer } from '../../lib/useTimer';
import { loadValue, saveValue } from '../../lib/storage';
import { GameShell } from '../../shared/GameShell';
import { Button } from '../../shared/Button';
import { Toast } from '../../shared/Toast';
import { WinDialog } from '../../shared/WinDialog';
import { pickPuzzle } from './data/puzzles';
import { isCorrect } from './types';
import type { PinpointPuzzle } from './types';

const meta = getGame('pinpoint');
const RECENT_KEY = 'pinpoint.recent';
const MAX_GUESSES = 5;

export default function PinpointGame() {
  const [puzzle, setPuzzle] = useState<PinpointPuzzle>(() =>
    pickPuzzle(loadValue<string[]>(RECENT_KEY, [])),
  );
  const [revealed, setRevealed] = useState(1);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [entry, setEntry] = useState('');
  const [outcome, setOutcome] = useState<'playing' | 'won' | 'lost'>('playing');
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { elapsed, reset: resetTimer } = useTimer(outcome === 'playing');
  const [finalTime, setFinalTime] = useState(0);

  const startNewGame = useCallback(() => {
    const recent = loadValue<string[]>(RECENT_KEY, []);
    const next = pickPuzzle(recent);
    saveValue(RECENT_KEY, [next.id, ...recent].slice(0, 12));
    setPuzzle(next);
    setRevealed(1);
    setGuesses([]);
    setEntry('');
    setOutcome('playing');
    setMessage(null);
    resetTimer();
    inputRef.current?.focus();
  }, [resetTimer]);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 2400);
    return () => window.clearTimeout(id);
  }, [message]);

  const submit = () => {
    const guess = entry.trim();
    if (!guess || outcome !== 'playing') return;

    if (isCorrect(guess, puzzle)) {
      setFinalTime(elapsed);
      setGuesses((previous) => [...previous, guess]);
      setRevealed(5);
      setOutcome('won');
      return;
    }

    const next = [...guesses, guess];
    setGuesses(next);
    setEntry('');

    if (next.length >= MAX_GUESSES) {
      setRevealed(5);
      setOutcome('lost');
      return;
    }

    setRevealed((count) => Math.min(5, count + 1));
    setMessage('Not it — here is another clue.');
  };

  // Fewer clues used is a better round, so score by clues rather than seconds.
  const cluesUsed = outcome === 'won' ? revealed : MAX_GUESSES;

  const toolbar = (
    <>
      <span className="text-[13px] font-semibold text-muted">
        Guess {Math.min(guesses.length + 1, MAX_GUESSES)} of {MAX_GUESSES}
      </span>
      <div className="ml-auto">
        <Button size="sm" variant="primary" onClick={startNewGame}>
          <Shuffle size={15} /> New
        </Button>
      </div>
    </>
  );

  return (
    <GameShell game={meta} elapsed={outcome === 'playing' ? elapsed : finalTime} toolbar={toolbar}>
      <div className="w-full max-w-md">
        <ol className="overflow-hidden rounded-lg border border-line">
          {puzzle.clues.map((clue, index) => {
            const isOpen = index < revealed;
            return (
              <li
                key={clue}
                style={{
                  // Each clue sits a step deeper in the accent, so the stack
                  // reads as a descent toward the answer.
                  background: isOpen
                    ? `color-mix(in srgb, var(--accent) ${10 + index * 11}%, var(--surface))`
                    : 'var(--surface-sunken)',
                }}
                className={`flex h-14 items-center justify-center border-b border-line
                  text-center last:border-b-0 ${
                    isOpen ? 'text-base font-bold text-ink' : 'text-[13px] font-semibold text-faint'
                  }`}
              >
                {isOpen ? clue : `Clue ${index + 1}`}
              </li>
            );
          })}
        </ol>

        <p className="mt-3 text-center text-[13px] leading-relaxed text-muted">
          All five belong to one category. Name it in as few clues as you can.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            ref={inputRef}
            value={entry}
            disabled={outcome !== 'playing'}
            onChange={(event) => setEntry(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
            placeholder="Guess the category…"
            aria-label="Guess the category"
            className="h-11 flex-1 rounded-full border border-line bg-surface px-4 text-sm
              text-ink outline-none transition-colors placeholder:text-faint
              focus:border-accent disabled:opacity-50"
          />
          <Button variant="primary" onClick={submit} disabled={outcome !== 'playing' || !entry.trim()}>
            <CornerDownLeft size={16} /> Guess
          </Button>
        </div>

        {guesses.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {guesses.map((guess, index) => (
              <li
                key={`${guess}-${index}`}
                className="rounded-full bg-sunken px-3 py-1 text-[13px] text-muted line-through"
              >
                {guess}
              </li>
            ))}
          </ul>
        )}

        {outcome === 'lost' && (
          <div className="mt-5 rounded-lg border border-line bg-surface p-4 text-center">
            <p className="text-sm text-muted">The category was</p>
            <p className="mt-1 text-lg font-bold text-ink">{puzzle.category}</p>
            <Button variant="primary" size="lg" className="mt-4" onClick={startNewGame}>
              Next category
            </Button>
          </div>
        )}
      </div>

      <Toast message={message} />

      <WinDialog
        isOpen={outcome === 'won'}
        time={finalTime}
        best={null}
        isRecord={false}
        stats={[
          { label: 'Category', value: puzzle.category },
          { label: 'Clues used', value: `${cluesUsed} of ${MAX_GUESSES}` },
        ]}
        onPlayAgain={startNewGame}
      />
    </GameShell>
  );
}
