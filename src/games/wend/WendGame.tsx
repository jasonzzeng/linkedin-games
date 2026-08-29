import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Lightbulb, Shuffle } from 'lucide-react';
import { getGame } from '../../lib/games';
import { useTimer } from '../../lib/useTimer';
import { useBestTime } from '../../lib/usePersistedState';
import { useCellSize } from '../../lib/useCellSize';
import { GameShell } from '../../shared/GameShell';
import { Button } from '../../shared/Button';
import { Select } from '../../shared/Select';
import { Toast } from '../../shared/Toast';
import { WinDialog } from '../../shared/WinDialog';
import { WendBoard } from './WendBoard';
import { generatePuzzle, SHAPE } from './logic/generator';
import type { Difficulty, Puzzle } from './types';

const meta = getGame('wend');
const SWATCHES = Array.from({ length: 10 }, (_, i) => `var(--swatch-${i + 1})`);

const difficultyOptions = (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
  value: d,
  label: `${d} · ${SHAPE[d].size}×${SHAPE[d].size}`,
}));

export default function WendGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [found, setFound] = useState<Map<number, number[]>>(new Map());
  const [message, setMessage] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  const [isWon, setIsWon] = useState(false);
  const [finalTime, setFinalTime] = useState(0);

  const size = puzzle?.size ?? SHAPE[difficulty].size;
  const cell = useCellSize({ cols: size, rows: size, max: 62, min: 34, reservedHeight: 360 });

  const { elapsed, reset: resetTimer } = useTimer(!isWon && puzzle !== null);
  const { best, submit } = useBestTime('wend', difficulty);
  const [record, setRecord] = useState<{ isRecord: boolean; best: number }>({
    isRecord: false,
    best: 0,
  });

  const startNewGame = useCallback(
    (nextDifficulty: Difficulty) => {
      setPuzzle(generatePuzzle(nextDifficulty));
      setFound(new Map());
      setHintsUsed(0);
      setIsWon(false);
      setMessage(null);
      resetTimer();
    },
    [resetTimer],
  );

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    startNewGame('Easy');
  }, [startNewGame]);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 2400);
    return () => window.clearTimeout(id);
  }, [message]);

  useEffect(() => {
    if (!puzzle || isWon) return;
    if (found.size !== puzzle.words.length) return;

    setFinalTime(elapsed);
    setRecord(submit(elapsed));
    setIsWon(true);
  }, [puzzle, found, isWon, elapsed, submit]);

  // Cell index -> which word owns it, for colouring the board.
  const claimed = new Map<number, number>();
  for (const [wordIndex, path] of found) {
    for (const index of path) claimed.set(index, wordIndex);
  }

  const handleTrace = (path: number[]): boolean => {
    if (!puzzle || isWon) return false;

    const spelled = path.map((index) => puzzle.letters[index]).join('');
    const forwards = puzzle.words.indexOf(spelled);
    const backwards = puzzle.words.indexOf([...spelled].reverse().join(''));
    const wordIndex = forwards !== -1 ? forwards : backwards;

    if (wordIndex === -1) {
      setMessage(
        spelled.length < 4 ? 'Trace a longer run of letters.' : `"${spelled}" is not one of the words.`,
      );
      return false;
    }
    if (found.has(wordIndex)) {
      setMessage(`${puzzle.words[wordIndex]} is already found.`);
      return false;
    }

    setFound((previous) => new Map(previous).set(wordIndex, path));
    return true;
  };

  const hint = () => {
    if (!puzzle || isWon) return;
    const wordIndex = puzzle.words.findIndex((_, index) => !found.has(index));
    if (wordIndex === -1) return;
    setFound((previous) => new Map(previous).set(wordIndex, puzzle.paths[wordIndex]));
    setHintsUsed((count) => count + 1);
  };

  const toolbar = (
    <>
      <Select
        label="Difficulty"
        value={difficulty}
        options={difficultyOptions}
        onChange={(value) => {
          setDifficulty(value);
          startNewGame(value);
        }}
      />
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={() => setFound(new Map())} disabled={found.size === 0}>
          <Eraser size={15} /> Clear
        </Button>
        <Button size="sm" variant="primary" onClick={() => startNewGame(difficulty)}>
          <Shuffle size={15} /> New
        </Button>
      </div>
    </>
  );

  return (
    <GameShell game={meta} elapsed={isWon ? finalTime : elapsed} toolbar={toolbar}>
      {puzzle && (
        <>
          <div className="flex flex-col items-stretch gap-4" style={{ width: cell * puzzle.size }}>
            <WendBoard
              puzzle={puzzle}
              claimed={claimed}
              cell={cell}
              onTrace={handleTrace}
              disabled={isWon}
            />

            {/* One row per word, shortest first, filling in as they are found. */}
            <ul className="flex flex-col items-center gap-1.5">
              {puzzle.words.map((word, wordIndex) => {
                const isFound = found.has(wordIndex);
                return (
                  <li key={word} className="flex gap-1">
                    {[...word].map((letter, i) => (
                      <span
                        key={i}
                        style={{
                          background: isFound ? SWATCHES[wordIndex % SWATCHES.length] : undefined,
                          width: Math.max(18, cell * 0.42),
                          height: Math.max(18, cell * 0.42),
                          fontSize: Math.max(10, cell * 0.24),
                        }}
                        className={`flex items-center justify-center rounded-sm font-bold ${
                          isFound ? 'text-[var(--swatch-ink)]' : 'bg-sunken'
                        }`}
                      >
                        {isFound ? letter : ''}
                      </span>
                    ))}
                  </li>
                );
              })}
            </ul>

            <Button size="lg" onClick={hint} disabled={isWon}>
              <Lightbulb size={17} /> Hint
            </Button>
          </div>

          <p className="mt-4 max-w-md text-center text-[13px] leading-relaxed text-faint">
            Drag through touching letters to spell a word. Every unshaded square
            belongs to exactly one of the {puzzle.words.length} words.
          </p>
        </>
      )}

      <Toast message={message} tone="error" />

      <WinDialog
        isOpen={isWon}
        time={finalTime}
        best={record.best || best}
        isRecord={record.isRecord}
        stats={[
          { label: 'Board', value: `${size}×${size}` },
          { label: 'Hints used', value: String(hintsUsed) },
        ]}
        onPlayAgain={() => startNewGame(difficulty)}
      />
    </GameShell>
  );
}
