import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Lightbulb, Shuffle, Undo2 } from 'lucide-react';
import { getGame } from '../../lib/games';
import { useTimer } from '../../lib/useTimer';
import { useBestTime } from '../../lib/usePersistedState';
import { useCellSize } from '../../lib/useCellSize';
import { GameShell } from '../../shared/GameShell';
import { Button } from '../../shared/Button';
import { Select } from '../../shared/Select';
import { Toast } from '../../shared/Toast';
import { WinDialog } from '../../shared/WinDialog';
import { WendBoard, WEND_COLORS } from './WendBoard';
import { generatePuzzle, SHAPE } from './logic/generator';
import type { Difficulty, Puzzle } from './types';

const meta = getGame('wend');

const difficultyOptions = (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
  value: d,
  label: `${d} · ${SHAPE[d].size}×${SHAPE[d].size}`,
}));

export default function WendGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [found, setFound] = useState<Map<number, number[]>>(new Map());
  const [message, setMessage] = useState<string | null>(null);
  const [trace, setTrace] = useState<number[]>([]);
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

  const undoWord = () => {
    setFound((previous) => {
      const keys = [...previous.keys()];
      if (keys.length === 0) return previous;
      const next = new Map(previous);
      next.delete(keys[keys.length - 1]);
      return next;
    });
  };

  const hint = () => {
    if (!puzzle || isWon) return;
    const wordIndex = puzzle.words.findIndex((_, index) => !found.has(index));
    if (wordIndex === -1) return;
    setFound((previous) => new Map(previous).set(wordIndex, puzzle.paths[wordIndex]));
    setHintsUsed((count) => count + 1);
  };

  const pendingIndex = puzzle
    ? puzzle.words.findIndex((word, index) => !found.has(index) && word.length >= trace.length)
    : -1;
  const pendingColor =
    pendingIndex === -1 ? 'var(--wend-frame)' : WEND_COLORS[pendingIndex % WEND_COLORS.length];

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
              found={found}
              cell={cell}
              onTrace={handleTrace}
              onTraceChange={setTrace}
              disabled={isWon}
            />

            {/* What you are spelling right now, echoed under the board. */}
            <div className="flex h-8 items-center justify-center gap-1">
              {trace.map((index, i) => (
                <span
                  key={index}
                  style={{
                    background: pendingColor,
                    width: Math.max(20, cell * 0.44),
                    height: Math.max(20, cell * 0.44),
                    fontSize: Math.max(11, cell * 0.26),
                  }}
                  className="flex items-center justify-center rounded-[5px] font-extrabold
                    text-[var(--wend-letter)]"
                >
                  {puzzle.letters[trace[i]]}
                </span>
              ))}
            </div>

            {/* One row per word, shortest first, filling in as they are found. */}
            <ul className="flex flex-col items-start gap-1">
              {puzzle.words.map((word, wordIndex) => {
                const isFound = found.has(wordIndex);
                return (
                  <li key={word} className="flex gap-1">
                    {[...word].map((letter, i) => (
                      <span
                        key={i}
                        style={{
                          background: isFound
                            ? WEND_COLORS[wordIndex % WEND_COLORS.length]
                            : 'var(--wend-slot)',
                          width: Math.max(20, cell * 0.44),
                          height: Math.max(20, cell * 0.44),
                          fontSize: Math.max(11, cell * 0.26),
                        }}
                        className="flex items-center justify-center rounded-[5px]
                          font-extrabold text-[var(--wend-letter)]"
                      >
                        {isFound ? letter : ''}
                      </span>
                    ))}
                  </li>
                );
              })}
            </ul>

            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" onClick={undoWord} disabled={found.size === 0 || isWon}>
                <Undo2 size={17} /> Undo
              </Button>
              <Button size="lg" onClick={hint} disabled={isWon}>
                <Lightbulb size={17} /> Hint
              </Button>
            </div>
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
