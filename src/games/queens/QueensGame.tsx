import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Lightbulb, RotateCcw, Shuffle, Undo2, X } from 'lucide-react';
import { getGame } from '../../lib/games';
import { GameShell } from '../../shared/GameShell';
import { Button } from '../../shared/Button';
import { Select } from '../../shared/Select';
import { WinDialog } from '../../shared/WinDialog';
import { QueensBoard, type PaintMode } from './QueensBoard';
import { QueensSettings } from './QueensSettings';
import {
  derive,
  emptyBoard,
  MARK,
  paintCell,
  sameBoard,
  tapCell,
  type BoardState,
} from './lib/game';
import { hint as findHint } from './lib/solver';
import {
  DEFAULT_SETTINGS,
  EMPTY_STATS,
  loadGame,
  loadSettings,
  loadStats,
  saveGame,
  saveSettings,
  saveStats,
  type SavedGame,
  type Settings,
  type Stats,
} from './lib/storage';
import { DIFFICULTY_SPECS, type Difficulty, type Puzzle } from './lib/types';
import { usePuzzleSource } from './lib/usePuzzleSource';

const meta = getGame('queens');

const difficultyOptions = (['easy', 'medium', 'hard'] as const).map((value) => ({
  value,
  label: `${DIFFICULTY_SPECS[value].label[0]}${DIFFICULTY_SPECS[value].label
    .slice(1)
    .toLowerCase()} · ${DIFFICULTY_SPECS[value].size}×${DIFFICULTY_SPECS[value].size}`,
}));

/* ------------------------------ board history ----------------------------- */

interface Slice {
  board: BoardState;
  history: BoardState[];
}

type Action =
  | { type: 'begin' }
  | { type: 'end' }
  | { type: 'tap'; cell: number; shown: number }
  | { type: 'paint'; cell: number; mode: PaintMode }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'set'; board: BoardState };

/**
 * A whole gesture is one undo step: 'begin' snapshots the board, 'end' throws
 * the snapshot away again if nothing actually changed. Otherwise dragging
 * across twelve squares would cost twelve undos.
 */
function reducer(state: Slice, action: Action): Slice {
  switch (action.type) {
    case 'begin':
      return { ...state, history: [...state.history.slice(-149), state.board] };
    case 'end': {
      const last = state.history[state.history.length - 1];
      if (last && sameBoard(last, state.board)) {
        return { ...state, history: state.history.slice(0, -1) };
      }
      return state;
    }
    case 'tap':
      return { ...state, board: tapCell(state.board, action.cell, action.shown) };
    case 'paint':
      return { ...state, board: paintCell(state.board, action.cell, action.mode) };
    case 'undo':
      if (!state.history.length) return state;
      return {
        board: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
      };
    case 'reset':
      return { board: emptyBoard(), history: [...state.history.slice(-149), state.board] };
    case 'set':
      return { board: action.board, history: [] };
    default:
      return state;
  }
}

export default function QueensGame() {
  const source = usePuzzleSource();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [slice, dispatch] = useReducer(reducer, { board: emptyBoard(), history: [] });
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isBest, setIsBest] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const [hintView, setHintView] = useState<{
    cells: Set<number>;
    focus: Set<number>;
    message: string;
    apply?: { kind: 'place' | 'eliminate'; cells: number[] };
  } | null>(null);

  /* --------------------------------- timer -------------------------------- */

  const timer = useRef({ base: 0, startedAt: null as number | null });
  const [timeMs, setTimeMs] = useState(0);
  const recorded = useRef(false);

  const startTimer = useCallback(() => {
    if (timer.current.startedAt === null) timer.current.startedAt = Date.now();
  }, []);
  const pauseTimer = useCallback(() => {
    if (timer.current.startedAt !== null) {
      timer.current.base += Date.now() - timer.current.startedAt;
      timer.current.startedAt = null;
      setTimeMs(timer.current.base);
    }
  }, []);
  const resetTimer = useCallback((base = 0) => {
    timer.current = { base, startedAt: null };
    setTimeMs(base);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const { base, startedAt } = timer.current;
      if (startedAt !== null) setTimeMs(base + (Date.now() - startedAt));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const derived = useMemo(
    () => (puzzle ? derive(puzzle, slice.board, settings.autoPlaceX) : null),
    [puzzle, slice.board, settings.autoPlaceX],
  );

  /* ------------------------------ start / stop ---------------------------- */

  const startGame = useCallback(
    async (next: Difficulty, resume?: SavedGame | null) => {
      setDifficulty(next);
      setStats(loadStats(next));
      setHintView(null);
      setWinOpen(false);
      setIsBest(false);

      if (resume) {
        setPuzzle(resume.puzzle);
        dispatch({ type: 'set', board: resume.board });
        setHintsUsed(resume.hintsUsed ?? 0);
        resetTimer(resume.elapsedMs);
        recorded.current = resume.solved;
        setLoading(false);
        if (!resume.solved) startTimer();
        source.prefetch(next);
        return;
      }

      // Walking away from a board you had started breaks the streak.
      const previous = loadGame(next);
      const abandoned = !!previous && !previous.solved && previous.board.queens.length > 0;

      setPuzzle(null);
      setLoading(true);
      dispatch({ type: 'set', board: emptyBoard() });
      setHintsUsed(0);
      resetTimer(0);
      recorded.current = false;

      const fresh = await source.take(next);
      setPuzzle(fresh);
      setLoading(false);
      startTimer();
      setStats((current) => {
        const updated = { ...current, played: current.played + 1, streak: abandoned ? 0 : current.streak };
        saveStats(next, updated);
        return updated;
      });
    },
    [resetTimer, source, startTimer],
  );

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setSettings(loadSettings());
    const saved = loadGame('easy');
    startGame('easy', saved && !saved.solved ? saved : null);
  }, [startGame]);

  /* ------------------------------ persistence ----------------------------- */

  const persist = useCallback(() => {
    if (!puzzle) return;
    saveGame(difficulty, {
      puzzle,
      board: slice.board,
      elapsedMs:
        timer.current.base + (timer.current.startedAt ? Date.now() - timer.current.startedAt : 0),
      solved: derived?.solved ?? false,
      hintsUsed,
    });
  }, [puzzle, slice.board, derived?.solved, hintsUsed, difficulty]);

  useEffect(() => {
    if (!puzzle) return;
    const id = window.setTimeout(persist, 350);
    return () => window.clearTimeout(id);
  }, [puzzle, slice.board, persist]);

  // The clock stops when the tab is hidden or the win dialog covers the board.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pauseTimer();
        persist();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', persist);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', persist);
    };
  }, [pauseTimer, persist]);

  useEffect(() => {
    const idle = !puzzle || winOpen || derived?.solved;
    if (idle || document.visibilityState === 'hidden') pauseTimer();
    else startTimer();
  }, [puzzle, winOpen, derived?.solved, pauseTimer, startTimer]);

  /* -------------------------------- solving ------------------------------- */

  const [justSolved, setJustSolved] = useState(false);

  useEffect(() => {
    if (!derived?.solved || recorded.current) return;
    recorded.current = true;
    pauseTimer();

    const ms = timer.current.base;
    setStats((current) => {
      setIsBest(current.bestMs === null || ms < current.bestMs);
      const updated: Stats = {
        ...current,
        solved: current.solved + 1,
        bestMs: current.bestMs === null ? ms : Math.min(current.bestMs, ms),
        streak: current.streak + 1,
        bestStreak: Math.max(current.bestStreak, current.streak + 1),
        hintsUsed: current.hintsUsed + hintsUsed,
      };
      saveStats(difficulty, updated);
      return updated;
    });
    setJustSolved(true);
  }, [derived?.solved, difficulty, hintsUsed, pauseTimer]);

  // Let the winning wave play before the dialog covers the board.
  useEffect(() => {
    if (!justSolved) return;
    const id = window.setTimeout(() => {
      setWinOpen(true);
      setJustSolved(false);
    }, 850);
    return () => window.clearTimeout(id);
  }, [justSolved]);

  /* -------------------------------- actions ------------------------------- */

  const clearHint = useCallback(() => setHintView(null), []);
  const onBegin = useCallback(() => dispatch({ type: 'begin' }), []);
  const onEnd = useCallback(() => dispatch({ type: 'end' }), []);
  const onTap = useCallback(
    (cell: number, shown: number) => {
      clearHint();
      dispatch({ type: 'tap', cell, shown });
    },
    [clearHint],
  );
  const onPaint = useCallback(
    (cell: number, mode: PaintMode) => {
      clearHint();
      dispatch({ type: 'paint', cell, mode });
    },
    [clearHint],
  );

  const handleHint = useCallback(() => {
    if (!puzzle || !derived || derived.solved) return;

    // Everything already crossed out, the player's marks and the automatic
    // ones alike, so the hint never repeats work already done.
    const marks: number[] = [];
    for (let cell = 0; cell < derived.display.length; cell++) {
      if (derived.display[cell] === MARK) marks.push(cell);
    }

    const result = findHint(
      puzzle.size,
      puzzle.regions,
      puzzle.solution,
      slice.board.queens,
      marks,
    );

    if (!result) {
      setHintView({
        cells: new Set(),
        focus: new Set(),
        message: 'Every crown you have placed is correct.',
      });
      return;
    }

    setHintsUsed((count) => count + 1);
    if (result.kind === 'wrong-crown' || result.kind === 'wrong-mark') {
      setHintView({ cells: new Set(result.cells), focus: new Set(), message: result.message });
      return;
    }
    setHintView({
      cells: new Set(result.cells),
      focus: new Set(result.focus),
      message: result.message,
      apply: { kind: result.kind, cells: result.cells },
    });
  }, [puzzle, derived, slice.board.queens]);

  const applyHint = useCallback(() => {
    if (!hintView?.apply) return;
    dispatch({ type: 'begin' });
    for (const cell of hintView.apply.cells) {
      if (hintView.apply.kind === 'place') dispatch({ type: 'tap', cell, shown: MARK });
      else dispatch({ type: 'paint', cell, mode: 'mark' });
    }
    dispatch({ type: 'end' });
    setHintView(null);
  }, [hintView]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const canUndo = slice.history.length > 0;
  const canReset = slice.board.queens.length > 0 || slice.board.userX.length > 0;
  const size = puzzle?.size ?? DIFFICULTY_SPECS[difficulty].size;

  const toolbar = (
    <>
      <Select
        label="Difficulty"
        value={difficulty}
        options={difficultyOptions}
        disabled={loading}
        onChange={(value) => {
          // Boards are saved per difficulty, so switching back picks up where
          // you left off. "New" still deals a fresh one.
          const saved = loadGame(value);
          startGame(value, saved && !saved.solved ? saved : null);
        }}
      />
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          onClick={() => {
            clearHint();
            dispatch({ type: 'reset' });
          }}
          disabled={!canReset || loading}
        >
          <RotateCcw size={15} /> Clear
        </Button>
        <Button size="sm" variant="primary" onClick={() => startGame(difficulty)} disabled={loading}>
          <Shuffle size={15} /> New
        </Button>
      </div>
    </>
  );

  return (
    <GameShell
      game={meta}
      elapsed={settings.showClock ? Math.floor(timeMs / 1000) : null}
      toolbar={toolbar}
      headerExtra={<QueensSettings settings={settings} onChange={updateSettings} />}
    >
      <div
        className="flex w-full flex-col items-stretch gap-4"
        style={{ width: 'min(100%, 460px)' }}
      >
        {puzzle && derived ? (
          <QueensBoard
            puzzle={puzzle}
            derived={derived}
            autoCheck={settings.autoCheck}
            hintCells={hintView?.cells}
            hintFocus={hintView?.focus}
            locked={derived.solved}
            onBegin={onBegin}
            onTap={onTap}
            onPaint={onPaint}
            onEnd={onEnd}
          />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border border-line bg-surface">
            <p className="text-sm font-medium text-faint">
              {loading ? `Building a ${size}×${size} puzzle…` : ''}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            onClick={() => {
              clearHint();
              dispatch({ type: 'undo' });
            }}
            disabled={!canUndo || !!derived?.solved}
          >
            <Undo2 size={17} /> Undo
          </Button>
          <Button size="lg" onClick={handleHint} disabled={!puzzle || !!derived?.solved}>
            <Lightbulb size={17} /> Hint
          </Button>
        </div>

        {hintView && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-lg border border-warning/40
              bg-warning-soft p-3.5 animate-pop-in"
          >
            <Lightbulb size={18} className="mt-0.5 shrink-0 text-warning" />
            <p className="flex-1 text-sm leading-relaxed text-ink">{hintView.message}</p>
            {hintView.apply && (
              <Button size="sm" variant="primary" onClick={applyHint}>
                {hintView.apply.kind === 'place' ? 'Place it' : 'Cross out'}
              </Button>
            )}
            <button
              type="button"
              aria-label="Dismiss hint"
              onClick={clearHint}
              className="rounded-full p-1 text-faint transition-colors hover:bg-hover hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 max-w-md text-center text-[13px] leading-relaxed text-faint">
        Tap to cross a square out, tap again for a crown. Drag to cross out a run
        of squares at once, or drag from a crossed-out square to erase.
      </p>

      <WinDialog
        isOpen={winOpen}
        time={Math.floor(timeMs / 1000)}
        best={stats.bestMs === null ? null : Math.floor(stats.bestMs / 1000)}
        isRecord={isBest}
        stats={[
          { label: 'Board', value: `${size}×${size}` },
          { label: 'Difficulty', value: DIFFICULTY_SPECS[difficulty].label },
          { label: 'Hints used', value: String(hintsUsed) },
          { label: 'Streak', value: String(stats.streak) },
        ]}
        onPlayAgain={() => startGame(difficulty)}
      />
    </GameShell>
  );
}
