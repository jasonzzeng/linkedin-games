import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, Lightbulb, Shuffle, Undo2 } from 'lucide-react';
import { getGame } from '../../lib/games';
import { useTimer } from '../../lib/useTimer';
import { useBestTime } from '../../lib/usePersistedState';
import { useCellSize } from '../../lib/useCellSize';
import { GameShell } from '../../shared/GameShell';
import { Button } from '../../shared/Button';
import { Select } from '../../shared/Select';
import { Modal } from '../../shared/Modal';
import { Toast } from '../../shared/Toast';
import { WinDialog } from '../../shared/WinDialog';
import { QueensBoard } from './QueensBoard';
import { generatePuzzle, SIZE_FOR } from './logic/generator';
import { findConflicts } from './logic/solver';
import type { CellMark, Difficulty, Point, Puzzle } from './types';

const meta = getGame('queens');

const difficultyOptions = (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
  value: d,
  label: `${d} · ${SIZE_FOR[d]}×${SIZE_FOR[d]}`,
}));

const emptyMarks = (size: number): CellMark[] =>
  new Array<CellMark>(size * size).fill('empty');

const nextMark = (mark: CellMark): CellMark =>
  mark === 'empty' ? 'excluded' : mark === 'excluded' ? 'crown' : 'empty';

export default function QueensGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [marks, setMarks] = useState<CellMark[]>([]);
  const [history, setHistory] = useState<CellMark[][]>([]);
  const [generating, setGenerating] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  const [isWon, setIsWon] = useState(false);
  const [finalTime, setFinalTime] = useState(0);

  const size = puzzle?.size ?? SIZE_FOR[difficulty];
  const cell = useCellSize({ cols: size, rows: size, max: 62, min: 30, reservedHeight: 330 });

  const { elapsed, reset: resetTimer } = useTimer(!isWon && !generating);
  const { best, submit } = useBestTime('queens', difficulty);
  const [record, setRecord] = useState<{ isRecord: boolean; best: number }>({
    isRecord: false,
    best: 0,
  });

  // Generation blocks the thread, so let the browser paint "Generating…" first.
  const startNewGame = useCallback(
    (nextDifficulty: Difficulty) => {
      setGenerating(true);
      setIsWon(false);
      setMessage(null);
      setHistory([]);
      setHintsUsed(0);

      window.setTimeout(() => {
        try {
          const fresh = generatePuzzle(nextDifficulty);
          setPuzzle(fresh);
          setMarks(emptyMarks(fresh.size));
          resetTimer();
        } catch {
          setMessage('Could not generate that board. Try again.');
        } finally {
          setGenerating(false);
        }
      }, 30);
    },
    [resetTimer],
  );

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    startNewGame('Easy');
  }, [startNewGame]);

  const crowns: Point[] = useMemo(() => {
    if (!puzzle) return [];
    const placed: Point[] = [];
    marks.forEach((mark, index) => {
      if (mark === 'crown') {
        placed.push({ r: Math.floor(index / puzzle.size), c: index % puzzle.size });
      }
    });
    return placed;
  }, [marks, puzzle]);

  const conflicts = useMemo(
    () => (puzzle ? findConflicts(puzzle.size, puzzle.regions, crowns) : new Set<string>()),
    [puzzle, crowns],
  );

  // Solved the moment every row has a crown and nothing conflicts.
  useEffect(() => {
    if (!puzzle || isWon || generating) return;
    if (crowns.length !== puzzle.size || conflicts.size > 0) return;

    setFinalTime(elapsed);
    setRecord(submit(elapsed));
    setIsWon(true);
  }, [puzzle, crowns, conflicts, isWon, generating, elapsed, submit]);

  const applyMarks = (next: CellMark[]) => {
    setHistory((previous) => [...previous.slice(-60), marks]);
    setMarks(next);
  };

  const toggle = (index: number) => {
    if (isWon || generating) return;
    const next = [...marks];
    next[index] = nextMark(next[index]);
    applyMarks(next);
  };

  const undo = () => {
    setHistory((previous) => {
      if (previous.length === 0) return previous;
      setMarks(previous[previous.length - 1]);
      return previous.slice(0, -1);
    });
  };

  const hint = () => {
    if (!puzzle || isWon) return;

    // Reveal one crown the player has not found yet.
    const missing = puzzle.solution.find(
      (crown) => marks[crown.r * puzzle.size + crown.c] !== 'crown',
    );
    if (!missing) {
      setMessage('Every crown is already placed — check the ones flagged in red.');
      return;
    }

    const next = [...marks];
    next[missing.r * puzzle.size + missing.c] = 'crown';
    applyMarks(next);
    setHintsUsed((count) => count + 1);
  };

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 2800);
    return () => window.clearTimeout(id);
  }, [message]);

  const toolbar = (
    <>
      <Select
        label="Difficulty"
        value={difficulty}
        options={difficultyOptions}
        disabled={generating}
        onChange={(value) => {
          setDifficulty(value);
          startNewGame(value);
        }}
      />
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={() => setClearOpen(true)} disabled={generating}>
          <Eraser size={15} /> Clear
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => startNewGame(difficulty)}
          disabled={generating}
        >
          <Shuffle size={15} /> New
        </Button>
      </div>
    </>
  );

  return (
    <GameShell game={meta} elapsed={isWon ? finalTime : elapsed} toolbar={toolbar}>
      {generating || !puzzle ? (
        <div className="flex flex-1 items-center justify-center py-20 text-sm font-medium text-faint">
          Generating a {SIZE_FOR[difficulty]}×{SIZE_FOR[difficulty]} board…
        </div>
      ) : (
        <>
          <div className="flex flex-col items-stretch gap-4" style={{ width: cell * puzzle.size }}>
            <QueensBoard
              puzzle={puzzle}
              marks={marks}
              conflicts={conflicts}
              cell={cell}
              onToggle={toggle}
              disabled={isWon}
            />
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" onClick={undo} disabled={history.length === 0}>
                <Undo2 size={17} /> Undo
              </Button>
              <Button size="lg" onClick={hint}>
                <Lightbulb size={17} /> Hint
              </Button>
            </div>
          </div>

          <p className="tabular mt-4 text-[13px] font-medium text-faint">
            {crowns.length} of {puzzle.size} crowns placed
          </p>
          <p className="mt-1 max-w-md text-center text-[13px] leading-relaxed text-faint">
            Click once to rule a square out, twice to place a crown.
          </p>
        </>
      )}

      <Toast message={message} />

      <Modal
        isOpen={clearOpen}
        title="Clear the board?"
        confirmLabel="Clear"
        confirmVariant="danger"
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          if (puzzle) applyMarks(emptyMarks(puzzle.size));
          setClearOpen(false);
        }}
      >
        Every crown and note is removed. The board itself stays the same.
      </Modal>

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
