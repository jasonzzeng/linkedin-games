import { useCallback, useEffect, useRef, useState } from 'react';
import { Delete, Eye, Lightbulb, Pencil, Shuffle, Undo2 } from 'lucide-react';
import { getGame } from '../../lib/games';
import { useTimer } from '../../lib/useTimer';
import { useBestTime } from '../../lib/usePersistedState';
import { GameShell } from '../../shared/GameShell';
import { Button } from '../../shared/Button';
import { Select } from '../../shared/Select';
import { WinDialog } from '../../shared/WinDialog';
import { SudokuBoard } from './SudokuBoard';
import { generatePuzzle } from './lib/generator';
import { getIndicesForRegion, getValidCompletedRegions, isGameWon } from './lib/logic';
import { ANIMATION_DURATION } from './lib/constants';
import type { BoardState, Difficulty } from './types';

const meta = getGame('sudoku');
const CELLS = 36;

const emptyNotes = () => Array.from({ length: CELLS }, () => new Set<number>());
const difficultyOptions = (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
  value: d,
  label: d,
}));

interface Snapshot {
  board: BoardState;
  notes: Set<number>[];
}

export default function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [board, setBoard] = useState<BoardState>(() => new Array(CELLS).fill(null));
  const [initialBoard, setInitialBoard] = useState<BoardState>(() => new Array(CELLS).fill(null));
  const [solution, setSolution] = useState<BoardState>([]);
  const [notes, setNotes] = useState<Set<number>[]>(emptyNotes);
  const [history, setHistory] = useState<Snapshot[]>([]);

  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [autoCheck, setAutoCheck] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  const [completedRegions, setCompletedRegions] = useState<Set<string>>(new Set());
  const [flashing, setFlashing] = useState<Set<number>>(new Set());

  const [isWon, setIsWon] = useState(false);
  const [finalTime, setFinalTime] = useState(0);

  const { elapsed, reset: resetTimer } = useTimer(!isWon);
  const { best, submit } = useBestTime('sudoku', difficulty);
  const [record, setRecord] = useState<{ isRecord: boolean; best: number }>({
    isRecord: false,
    best: 0,
  });

  const startGame = useCallback(
    (nextDifficulty: Difficulty) => {
      const { initial, solution: solved } = generatePuzzle(nextDifficulty);
      setDifficulty(nextDifficulty);
      setBoard([...initial]);
      setInitialBoard([...initial]);
      setSolution(solved);
      setNotes(emptyNotes());
      setHistory([]);
      setSelected(null);
      setHintsUsed(0);
      setCompletedRegions(new Set());
      setFlashing(new Set());
      setIsWon(false);
      resetTimer();
    },
    [resetTimer],
  );

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    startGame('Easy');
  }, [startGame]);

  // Flash a row, column or block the moment it is completed correctly.
  useEffect(() => {
    const current = getValidCompletedRegions(board);
    const fresh = [...current].filter((region) => !completedRegions.has(region));
    setCompletedRegions(current);
    if (fresh.length === 0) return;

    const cells = new Set(fresh.flatMap((region) => getIndicesForRegion(region)));
    setFlashing((previous) => new Set([...previous, ...cells]));

    const id = window.setTimeout(() => {
      setFlashing((previous) => {
        const next = new Set(previous);
        cells.forEach((index) => next.delete(index));
        return next;
      });
    }, ANIMATION_DURATION);
    return () => window.clearTimeout(id);
    // completedRegions is derived here; including it would re-run on its own write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  const pushHistory = useCallback(() => {
    setHistory((previous) => [
      ...previous.slice(-30),
      { board: [...board], notes: notes.map((set) => new Set(set)) },
    ]);
  }, [board, notes]);

  const finishIfWon = useCallback(
    (next: BoardState) => {
      if (!isGameWon(next)) return;
      setFinalTime(elapsed);
      setRecord(submit(elapsed));
      setIsWon(true);
    },
    [elapsed, submit],
  );

  const handleInput = useCallback(
    (value: number) => {
      if (selected === null || initialBoard[selected] !== null || isWon) return;
      pushHistory();

      if (notesMode) {
        setNotes((previous) => {
          const next = [...previous];
          const cellNotes = new Set(previous[selected]);
          if (cellNotes.has(value)) cellNotes.delete(value);
          else cellNotes.add(value);
          next[selected] = cellNotes;
          return next;
        });
        return;
      }

      setBoard((previous) => {
        const next = [...previous];
        next[selected] = next[selected] === value ? null : value;
        finishIfWon(next);
        return next;
      });
      setNotes((previous) => {
        const next = [...previous];
        next[selected] = new Set();
        return next;
      });
    },
    [selected, initialBoard, isWon, notesMode, pushHistory, finishIfWon],
  );

  const handleErase = useCallback(() => {
    if (selected === null || initialBoard[selected] !== null || isWon) return;
    pushHistory();
    setBoard((previous) => {
      const next = [...previous];
      next[selected] = null;
      return next;
    });
    setNotes((previous) => {
      const next = [...previous];
      next[selected] = new Set();
      return next;
    });
  }, [selected, initialBoard, isWon, pushHistory]);

  const handleUndo = useCallback(() => {
    setHistory((previous) => {
      if (previous.length === 0) return previous;
      const last = previous[previous.length - 1];
      setBoard(last.board);
      setNotes(last.notes);
      return previous.slice(0, -1);
    });
  }, []);

  const handleHint = useCallback(() => {
    if (isWon || solution.length === 0) return;

    // Fill the selected cell if it needs it, otherwise the first cell that is
    // empty or wrong.
    let target =
      selected !== null && board[selected] !== solution[selected] ? selected : -1;
    if (target === -1) target = board.findIndex((value) => value === null);
    if (target === -1) target = board.findIndex((value, i) => value !== solution[i]);
    if (target === -1) return;

    pushHistory();
    setHintsUsed((count) => count + 1);
    setSelected(target);
    setBoard((previous) => {
      const next = [...previous];
      next[target] = solution[target];
      finishIfWon(next);
      return next;
    });
  }, [isWon, solution, selected, board, pushHistory, finishIfWon]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isWon) return;

      if ((event.key === 'z' || event.key === 'Z') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleUndo();
        return;
      }
      if (event.key >= '1' && event.key <= '6') {
        handleInput(Number(event.key));
        return;
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        handleErase();
        return;
      }
      if (event.key.toLowerCase() === 'n') {
        setNotesMode((previous) => !previous);
        return;
      }

      const steps: Record<string, number> = {
        ArrowUp: -6,
        ArrowDown: 6,
        ArrowLeft: -1,
        ArrowRight: 1,
      };
      const step = steps[event.key];
      if (step === undefined) return;
      event.preventDefault();
      setSelected((previous) => (previous === null ? 0 : (previous + step + CELLS) % CELLS));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isWon, handleInput, handleErase, handleUndo]);

  const toolbar = (
    <>
      <Select
        label="Difficulty"
        value={difficulty}
        options={difficultyOptions}
        onChange={startGame}
      />
      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          variant={notesMode ? 'primary' : 'secondary'}
          aria-pressed={notesMode}
          onClick={() => setNotesMode((previous) => !previous)}
        >
          <Pencil size={15} /> Notes
        </Button>
        <Button
          size="sm"
          variant={autoCheck ? 'primary' : 'secondary'}
          aria-pressed={autoCheck}
          onClick={() => setAutoCheck((previous) => !previous)}
        >
          <Eye size={15} /> Check
        </Button>
        <Button size="sm" onClick={handleHint}>
          <Lightbulb size={15} /> Hint
        </Button>
        <Button size="sm" variant="primary" onClick={() => startGame(difficulty)}>
          <Shuffle size={15} /> New
        </Button>
      </div>
    </>
  );

  return (
    <GameShell game={meta} elapsed={isWon ? finalTime : elapsed} toolbar={toolbar}>
      <SudokuBoard
        board={board}
        initialBoard={initialBoard}
        selected={selected}
        notes={notes}
        autoCheck={autoCheck}
        flashing={flashing}
        onSelect={setSelected}
      />

      <div className="mt-6 grid w-full max-w-sm grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleInput(value)}
            className="tabular flex h-14 items-center justify-center rounded-md border border-line
              bg-surface text-2xl font-semibold text-ink shadow-sm transition-colors
              hover:border-line-strong hover:bg-hover active:bg-sunken"
          >
            {value}
          </button>
        ))}
      </div>

      <div className="mt-2 grid w-full max-w-sm grid-cols-2 gap-2">
        <Button onClick={handleErase}>
          <Delete size={16} /> Erase
        </Button>
        <Button onClick={handleUndo} disabled={history.length === 0}>
          <Undo2 size={16} /> Undo
        </Button>
      </div>

      <p className="mt-4 text-center text-[13px] text-faint">
        Type 1–6 to fill · N toggles notes · ⌫ erases · ⌘Z undoes
      </p>

      <WinDialog
        isOpen={isWon}
        time={finalTime}
        best={record.best || best}
        isRecord={record.isRecord}
        stats={[
          { label: 'Difficulty', value: difficulty },
          { label: 'Hints used', value: String(hintsUsed) },
        ]}
        onPlayAgain={() => startGame(difficulty)}
      />
    </GameShell>
  );
}
