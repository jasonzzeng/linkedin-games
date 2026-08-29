import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Shuffle, Undo2 } from 'lucide-react';
import { getGame } from '../../lib/games';
import { useTimer } from '../../lib/useTimer';
import { useBestTime, usePersistedState } from '../../lib/usePersistedState';
import { GameShell } from '../../shared/GameShell';
import { Button } from '../../shared/Button';
import { Select } from '../../shared/Select';
import { Modal } from '../../shared/Modal';
import { Toast } from '../../shared/Toast';
import { WinDialog } from '../../shared/WinDialog';
import { ZipBoard } from './ZipBoard';
import { generatePuzzle } from './utils/generator';
import {
  checkInvalidFullBoard,
  checkInvalidNotFull,
  checkWin,
  isValidMove,
  stringToPoint,
} from './utils/logic';
import type { Difficulty, InputMode, Point, PuzzleConfig } from './types';

const meta = getGame('zip');

const difficultyOptions = (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
  value: d,
  label: d,
}));

const inputOptions = [
  { value: 'both' as const, label: 'Drag + click' },
  { value: 'drag' as const, label: 'Drag only' },
  { value: 'click' as const, label: 'Click only' },
];

const startOf = (config: PuzzleConfig): Point => {
  const entry = Object.entries(config.checkpoints).find(([, value]) => value === 1);
  return entry ? stringToPoint(entry[0]) : { x: 0, y: 0 };
};

export default function ZipGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [inputMode, setInputMode] = usePersistedState<InputMode>('zip.inputMode', 'both');

  const [config, setConfig] = useState<PuzzleConfig | null>(null);
  const [path, setPath] = useState<Point[]>([]);
  const [history, setHistory] = useState<Point[][]>([]);
  const [isWon, setIsWon] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const { elapsed, reset: resetTimer } = useTimer(!isWon && config !== null);
  const { best, submit } = useBestTime('zip', difficulty);
  const [record, setRecord] = useState<{ isRecord: boolean; best: number }>({
    isRecord: false,
    best: 0,
  });

  const startNewGame = useCallback(() => {
    const fresh = generatePuzzle(difficulty);
    setConfig(fresh);
    setPath([startOf(fresh)]);
    setHistory([]);
    setIsWon(false);
    setErrorMessage(null);
    resetTimer();
  }, [difficulty, resetTimer]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const updatePath = useCallback(
    (nextPath: Point[], commitToHistory = true) => {
      if (!config) return;

      setHistory((previous) => (commitToHistory ? [...previous, path] : previous));
      setPath(nextPath);

      if (checkWin(nextPath, config)) {
        setFinalTime(elapsed);
        setRecord(submit(elapsed));
        setErrorMessage(null);
        setIsWon(true);
        return;
      }

      if (checkInvalidFullBoard(nextPath, config)) {
        setErrorMessage('The board is full, but the path must end on the last number.');
      } else if (checkInvalidNotFull(nextPath, config)) {
        setErrorMessage('You reached the last number with squares still empty.');
      } else {
        setErrorMessage(null);
      }
    },
    [config, path, elapsed, submit],
  );

  const handleUndo = useCallback(() => {
    setHistory((previous) => {
      if (previous.length === 0) return previous;
      setPath(previous[previous.length - 1]);
      setIsWon(false);
      setErrorMessage(null);
      return previous.slice(0, -1);
    });
  }, []);

  // Arrow keys / WASD walk the head one square at a time.
  useEffect(() => {
    if (!config || isWon || clearOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'z' || event.key === 'Z') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleUndo();
        return;
      }

      const head = path[path.length - 1];
      const moves: Record<string, Point> = {
        ArrowUp: { x: head.x, y: head.y - 1 },
        ArrowDown: { x: head.x, y: head.y + 1 },
        ArrowLeft: { x: head.x - 1, y: head.y },
        ArrowRight: { x: head.x + 1, y: head.y },
        w: { x: head.x, y: head.y - 1 },
        s: { x: head.x, y: head.y + 1 },
        a: { x: head.x - 1, y: head.y },
        d: { x: head.x + 1, y: head.y },
      };

      const next = moves[event.key];
      if (!next) return;
      event.preventDefault();
      if (isValidMove(path, next, config)) updatePath([...path, next], true);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [config, path, isWon, clearOpen, updatePath, handleUndo]);

  const confirmClear = () => {
    if (!config) return;
    setPath([startOf(config)]);
    setHistory([]);
    setErrorMessage(null);
    setClearOpen(false);
  };

  const filled = config ? path.length : 0;
  const total = config ? config.width * config.height : 0;

  const toolbar = (
    <>
      <Select
        label="Difficulty"
        value={difficulty}
        options={difficultyOptions}
        onChange={setDifficulty}
      />
      <Select
        label="Input mode"
        value={inputMode}
        options={inputOptions}
        onChange={setInputMode}
      />
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={handleUndo} disabled={history.length === 0}>
          <Undo2 size={15} /> Undo
        </Button>
        <Button size="sm" onClick={() => setClearOpen(true)}>
          <RotateCcw size={15} /> Clear
        </Button>
        <Button size="sm" variant="primary" onClick={startNewGame}>
          <Shuffle size={15} /> New
        </Button>
      </div>
    </>
  );

  return (
    <GameShell game={meta} elapsed={isWon ? finalTime : elapsed} toolbar={toolbar}>
      {config && (
        <>
          <ZipBoard
            config={config}
            path={path}
            onPathUpdate={updatePath}
            onDragStart={() => setHistory((previous) => [...previous, path])}
            isComplete={isWon}
            inputMode={inputMode}
          />
          <p className="tabular mt-4 text-[13px] font-medium text-faint">
            {filled} of {total} squares filled
          </p>
        </>
      )}

      <Toast message={errorMessage} tone="error" />

      <Modal
        isOpen={clearOpen}
        title="Restart this puzzle?"
        confirmLabel="Restart"
        confirmVariant="danger"
        onCancel={() => setClearOpen(false)}
        onConfirm={confirmClear}
      >
        The path resets to the first number. The puzzle itself stays the same.
      </Modal>

      <WinDialog
        isOpen={isWon}
        time={finalTime}
        best={record.best || best}
        isRecord={record.isRecord}
        stats={[
          { label: 'Difficulty', value: difficulty },
          { label: 'Grid', value: config ? `${config.width}×${config.height}` : '—' },
        ]}
        onPlayAgain={startNewGame}
      />
    </GameShell>
  );
}
