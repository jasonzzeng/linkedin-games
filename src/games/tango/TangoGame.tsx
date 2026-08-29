import { useCallback, useEffect, useRef, useState } from 'react';
import { Lightbulb, RotateCcw, Shuffle, Undo2 } from 'lucide-react';
import { getGame } from '../../lib/games';
import { useTimer } from '../../lib/useTimer';
import { useBestTime } from '../../lib/usePersistedState';
import { loadValue, saveValue, clearValue } from '../../lib/storage';
import { GameShell } from '../../shared/GameShell';
import { Button } from '../../shared/Button';
import { Select } from '../../shared/Select';
import { Modal } from '../../shared/Modal';
import { Toast } from '../../shared/Toast';
import { WinDialog } from '../../shared/WinDialog';
import { TangoBoard } from './TangoBoard';
import { generatePuzzle } from './logic/generator';
import { findForcedMove } from './logic/solver';
import { checkWinCondition, cloneGrid, validateBoard } from './logic/utils';
import { EMPTY, MOON, SUN } from './logic/constants';
import type { Coords, Difficulty, Grid, Relation } from './types';

const meta = getGame('tango');
const SAVE_KEY = 'tango.save';
const SIZES = [4, 6, 8, 10, 12] as const;

interface SavedGame {
  size: number;
  difficulty: Difficulty;
  grid: Grid;
  initialGrid: Grid;
  relations: Relation[];
  history: Grid[];
}

const difficultyOptions = (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
  value: d,
  label: d,
}));
const sizeOptions = SIZES.map((n) => ({ value: String(n), label: `${n}×${n}` }));

export default function TangoGame() {
  const [size, setSize] = useState(6);
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [grid, setGrid] = useState<Grid>([]);
  const [initialGrid, setInitialGrid] = useState<Grid>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [history, setHistory] = useState<Grid[]>([]);

  const [generating, setGenerating] = useState(true);
  const [hint, setHint] = useState<{ coords: Coords | null; message: string } | null>(null);
  const [lastMove, setLastMove] = useState<Coords | null>(null);
  const [invalidCells, setInvalidCells] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);

  const { elapsed, reset: resetTimer } = useTimer(!isWon && !generating);
  const { best, submit } = useBestTime('tango', `${difficulty}-${size}`);
  const [record, setRecord] = useState<{ isRecord: boolean; best: number }>({
    isRecord: false,
    best: 0,
  });

  // Generation blocks the main thread, so hand the browser a frame to paint
  // the "Generating…" state before we start.
  const startNewGame = useCallback(
    (nextSize: number, nextDifficulty: Difficulty) => {
      setGenerating(true);
      setHint(null);
      setLastMove(null);
      setIsWon(false);
      setInvalidCells(new Set());
      setErrorMessage(null);
      clearValue(SAVE_KEY);

      window.setTimeout(() => {
        try {
          const { grid: fresh, relations: freshRelations } = generatePuzzle(
            nextSize,
            nextDifficulty,
          );
          setGrid(fresh);
          setInitialGrid(cloneGrid(fresh));
          setRelations(freshRelations);
          setHistory([]);
          resetTimer();
        } catch {
          setErrorMessage('Could not generate that puzzle. Try again.');
        } finally {
          setGenerating(false);
        }
      }, 30);
    },
    [resetTimer],
  );

  // Restore an unfinished board, or deal a fresh one.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const saved = loadValue<SavedGame | null>(SAVE_KEY, null);
    if (saved && saved.grid?.length) {
      setSize(saved.size);
      setDifficulty(saved.difficulty);
      setGrid(saved.grid);
      setInitialGrid(saved.initialGrid);
      setRelations(saved.relations);
      setHistory(saved.history ?? []);
      const { invalidCells: invalid, error } = validateBoard(saved.grid, saved.relations);
      setInvalidCells(invalid);
      setErrorMessage(error);
      setGenerating(false);
      return;
    }
    startNewGame(6, 'Easy');
  }, [startNewGame]);

  useEffect(() => {
    if (generating || isWon || grid.length === 0) return;
    saveValue(SAVE_KEY, { size, difficulty, grid, initialGrid, relations, history });
  }, [size, difficulty, grid, initialGrid, relations, history, generating, isWon]);

  useEffect(() => {
    if (!errorMessage) return;
    const id = window.setTimeout(() => setErrorMessage(null), 2600);
    return () => window.clearTimeout(id);
  }, [errorMessage]);

  const handleCellClick = (r: number, c: number, isSecondary: boolean) => {
    if (isWon || generating || initialGrid[r][c] !== EMPTY) return;

    const current = grid[r][c];
    const next = isSecondary
      ? current === EMPTY || current === SUN
        ? MOON
        : EMPTY
      : current === EMPTY
        ? SUN
        : current === SUN
          ? MOON
          : EMPTY;

    const nextGrid = cloneGrid(grid);
    nextGrid[r][c] = next;

    setHistory((previous) => [...previous, grid]);
    setGrid(nextGrid);
    setLastMove({ r, c });
    setHint(null);

    const { invalidCells: invalid, error } = validateBoard(nextGrid, relations);
    setInvalidCells(invalid);
    setErrorMessage(error);

    if (invalid.size === 0 && checkWinCondition(nextGrid, relations)) {
      setFinalTime(elapsed);
      setRecord(submit(elapsed));
      setIsWon(true);
      clearValue(SAVE_KEY);
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setGrid(previous);
    setHistory(history.slice(0, -1));
    setHint(null);
    setLastMove(null);
    const { invalidCells: invalid, error } = validateBoard(previous, relations);
    setInvalidCells(invalid);
    setErrorMessage(error);
  };

  const confirmClear = () => {
    setHistory((previous) => [...previous, grid]);
    setGrid(cloneGrid(initialGrid));
    setLastMove(null);
    setHint(null);
    setInvalidCells(new Set());
    setErrorMessage(null);
    setClearOpen(false);
  };

  const showHint = () => {
    const forced = findForcedMove(grid, relations);
    setHint(
      forced
        ? { coords: forced.cell, message: forced.reason }
        : { coords: null, message: 'No forced move from here — look for a cell that would break a rule.' },
    );
  };

  const toolbar = (
    <>
      <Select
        label="Difficulty"
        value={difficulty}
        options={difficultyOptions}
        disabled={generating}
        onChange={(value) => {
          setDifficulty(value);
          startNewGame(size, value);
        }}
      />
      <Select
        label="Board size"
        value={String(size)}
        options={sizeOptions}
        disabled={generating}
        onChange={(value) => {
          const nextSize = Number(value);
          setSize(nextSize);
          startNewGame(nextSize, difficulty);
        }}
      />
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={undo} disabled={history.length === 0 || generating}>
          <Undo2 size={15} /> Undo
        </Button>
        <Button size="sm" onClick={showHint} disabled={generating}>
          <Lightbulb size={15} /> Hint
        </Button>
        <Button size="sm" onClick={() => setClearOpen(true)} disabled={generating}>
          <RotateCcw size={15} /> Clear
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => startNewGame(size, difficulty)}
          disabled={generating}
        >
          <Shuffle size={15} /> New
        </Button>
      </div>
    </>
  );

  return (
    <GameShell game={meta} elapsed={isWon ? finalTime : elapsed} toolbar={toolbar}>
      {generating || grid.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20 text-sm font-medium text-faint">
          Generating a {size}×{size} {difficulty.toLowerCase()} board…
        </div>
      ) : (
        <>
          <TangoBoard
            grid={grid}
            initialGrid={initialGrid}
            relations={relations}
            size={size}
            onCellClick={handleCellClick}
            hintCell={hint?.coords ?? null}
            lastMove={lastMove}
            invalidCells={invalidCells}
          />
          <p className="mt-4 max-w-md text-center text-[13px] leading-relaxed text-faint">
            Click to cycle sun → moon → empty. Right-click to place a moon directly.
          </p>
          {hint && (
            <p className="mt-3 rounded-full bg-accent-soft px-4 py-2 text-[13px] font-medium text-ink">
              {hint.message}
            </p>
          )}
        </>
      )}

      <Toast message={errorMessage} tone="error" />

      <Modal
        isOpen={clearOpen}
        title="Clear the board?"
        confirmLabel="Clear"
        confirmVariant="danger"
        onCancel={() => setClearOpen(false)}
        onConfirm={confirmClear}
      >
        Your own moves are removed. The given cells stay, and this counts as one undo step.
      </Modal>

      <WinDialog
        isOpen={isWon}
        time={finalTime}
        best={record.best || best}
        isRecord={record.isRecord}
        stats={[
          { label: 'Board', value: `${size}×${size}` },
          { label: 'Difficulty', value: difficulty },
        ]}
        onPlayAgain={() => startNewGame(size, difficulty)}
      />
    </GameShell>
  );
}
