import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { WendBoard, WEND_COLORS, type PlacedPath } from './WendBoard';
import { generatePuzzle, SHAPE } from './logic/generator';
import { assignRows, coverage, judge, openSquares, overlaps, spell } from './logic/rules';
import type { Difficulty, Puzzle } from './types';

const meta = getGame('wend');

const difficultyOptions = (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
  value: d,
  label: `${d} · ${SHAPE[d].size}×${SHAPE[d].size}`,
}));

export default function WendGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [placed, setPlaced] = useState<number[][]>([]);
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
      setPlaced([]);
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

  /**
   * Runs are laid down freely, so the board is judged only once every square
   * is used: the words are checked then, all together.
   */
  const spelledBy = useCallback(
    (cells: number[]) => (puzzle ? spell(puzzle, cells) : ''),
    [puzzle],
  );

  const used = coverage(placed);
  const total = puzzle ? openSquares(puzzle) : 0;
  const verdict = puzzle ? judge(puzzle, placed) : { full: false, solved: false };
  const boardFull = verdict.full;
  const allWordsRight = verdict.solved;

  useEffect(() => {
    if (!puzzle || isWon || !allWordsRight) return;
    setFinalTime(elapsed);
    setRecord(submit(elapsed));
    setIsWon(true);
  }, [puzzle, isWon, allWordsRight, elapsed, submit]);

  // Say so when the grid is full but the words are not all real.
  useEffect(() => {
    if (!boardFull || allWordsRight || isWon) return;
    setMessage('Every square is used, but not all of those are words yet.');
  }, [boardFull, allWordsRight, isWon]);

  /**
   * Anything traced goes down, word or not — the real game lets you commit a
   * run you are unsure of and sort it out later. Only a run that would sit on
   * top of one already there is refused.
   */
  const handleTrace = (path: number[]): boolean => {
    if (!puzzle || isWon) return false;

    if (overlaps(placed, path)) {
      setMessage('That crosses a run already on the board.');
      return false;
    }

    setPlaced((previous) => [...previous, path]);
    setMessage(null);
    return true;
  };

  const removePath = (pathIndex: number) => {
    setPlaced((previous) => previous.filter((_, i) => i !== pathIndex));
  };

  const undoWord = () => setPlaced((previous) => previous.slice(0, -1));

  const hint = () => {
    if (!puzzle || isWon) return;

    // The first intended word not yet correctly on the board.
    const wordIndex = puzzle.words.findIndex(
      (word, index) => !placed.some((cells) => spelledBy(cells) === word && cells.length === puzzle.paths[index].length),
    );
    if (wordIndex === -1) return;

    const answer = puzzle.paths[wordIndex];
    const answerCells = new Set(answer);
    setPlaced((previous) => [
      ...previous.filter((cells) => !cells.some((index) => answerCells.has(index))),
      answer,
    ]);
    setHintsUsed((count) => count + 1);
  };

  /**
   * Rows claim runs by length: each row takes the first run of exactly its
   * own length that no earlier row has taken. A run whose length fits no free
   * row still sits on the board, just without a row and in a neutral colour.
   */
  const { slotOf, rowRuns } = useMemo(
    () => (puzzle ? assignRows(puzzle, placed) : { slotOf: new Map<number, number>(), rowRuns: [] }),
    [puzzle, placed],
  );

  const boardPaths: PlacedPath[] = placed.map((cells, index) => {
    const slot = slotOf.get(index);
    return {
      cells,
      color: slot === undefined ? 'var(--wend-frame)' : WEND_COLORS[slot % WEND_COLORS.length],
    };
  });

  // The run being drawn borrows the colour of the first row still empty.
  const firstEmptyRow = rowRuns.findIndex((run) => run === null);
  const pendingColor =
    firstEmptyRow === -1 ? 'var(--wend-frame)' : WEND_COLORS[firstEmptyRow % WEND_COLORS.length];

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
        <Button size="sm" onClick={() => setPlaced([])} disabled={placed.length === 0}>
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
              paths={boardPaths}
              traceColor={pendingColor}
              cell={cell}
              onTrace={handleTrace}
              onRemove={removePath}
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

            {/* One row per word, shortest first. A row shows whatever run
                landed in it, whether or not it spells anything. */}
            <ul className="flex flex-col items-start gap-1">
              {puzzle.words.map((word, wordIndex) => {
                const run = rowRuns[wordIndex];
                const spelled = run ? spelledBy(run) : '';
                const isWord = spelled === word;
                return (
                  <li key={word} className="flex gap-1">
                    {[...word].map((_, i) => (
                      <span
                        key={i}
                        style={{
                          background: run
                            ? WEND_COLORS[wordIndex % WEND_COLORS.length]
                            : 'var(--wend-slot)',
                          width: Math.max(20, cell * 0.44),
                          height: Math.max(20, cell * 0.44),
                          fontSize: Math.max(11, cell * 0.26),
                          // A run that is not a word reads a shade lighter, so
                          // you can see it is provisional without being told off.
                          opacity: run && !isWord ? 0.62 : 1,
                        }}
                        className="flex items-center justify-center rounded-[5px]
                          font-extrabold text-[var(--wend-letter)]"
                      >
                        {spelled[i] ?? ''}
                      </span>
                    ))}
                  </li>
                );
              })}
            </ul>

            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" onClick={undoWord} disabled={placed.length === 0 || isWon}>
                <Undo2 size={17} /> Undo
              </Button>
              <Button size="lg" onClick={hint} disabled={isWon}>
                <Lightbulb size={17} /> Hint
              </Button>
            </div>
          </div>

          <p className="tabular mt-4 text-[13px] font-medium text-faint">
            {used} of {total} squares used
          </p>
          <p className="mt-1 max-w-md text-center text-[13px] leading-relaxed text-faint">
            Drag through touching letters to lay down a run — it does not have to
            be a word yet. Tap a run to lift it off again.
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
