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
import { PatchesBoard, type PlacedPatch } from './PatchesBoard';
import { generatePuzzle, SIZE_FOR } from './logic/generator';
import { matchesType } from './types';
import type { Difficulty, Puzzle, Rect } from './types';

const meta = getGame('patches');

const difficultyOptions = (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
  value: d,
  label: `${d} · ${SIZE_FOR[d]}×${SIZE_FOR[d]}`,
}));

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const contains = (rect: Rect, index: number, size: number) => {
  const x = index % size;
  const y = Math.floor(index / size);
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
};

export default function PatchesGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [placed, setPlaced] = useState<PlacedPatch[]>([]);
  const [history, setHistory] = useState<PlacedPatch[][]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  const [isWon, setIsWon] = useState(false);
  const [finalTime, setFinalTime] = useState(0);

  const size = puzzle?.size ?? SIZE_FOR[difficulty];
  const cell = useCellSize({ cols: size, rows: size, max: 66, min: 34, reservedHeight: 340 });

  const { elapsed, reset: resetTimer } = useTimer(!isWon && puzzle !== null);
  const { best, submit } = useBestTime('patches', difficulty);
  const [record, setRecord] = useState<{ isRecord: boolean; best: number }>({
    isRecord: false,
    best: 0,
  });

  const startNewGame = useCallback(
    (nextDifficulty: Difficulty) => {
      setPuzzle(generatePuzzle(nextDifficulty));
      setPlaced([]);
      setHistory([]);
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
    const id = window.setTimeout(() => setMessage(null), 2600);
    return () => window.clearTimeout(id);
  }, [message]);

  // Solved once every marker has a patch, all of them legal, board full.
  useEffect(() => {
    if (!puzzle || isWon) return;
    if (placed.length !== puzzle.seeds.length) return;
    if (placed.some((patch) => !patch.valid)) return;

    const area = placed.reduce((total, patch) => total + patch.rect.w * patch.rect.h, 0);
    if (area !== puzzle.size * puzzle.size) return;

    setFinalTime(elapsed);
    setRecord(submit(elapsed));
    setIsWon(true);
  }, [puzzle, placed, isWon, elapsed, submit]);

  const commit = (next: PlacedPatch[]) => {
    setHistory((previous) => [...previous.slice(-60), placed]);
    setPlaced(next);
  };

  const handlePlace = (rect: Rect) => {
    if (!puzzle || isWon) return;

    if (placed.some((patch) => overlaps(patch.rect, rect))) {
      setMessage('Patches cannot overlap.');
      return;
    }

    const inside = puzzle.seeds.filter((seed) => contains(rect, seed.index, puzzle.size));
    if (inside.length === 0) {
      setMessage('Every patch has to cover one marker.');
      return;
    }
    if (inside.length > 1) {
      setMessage('That patch covers more than one marker.');
      return;
    }

    const seed = inside[0];
    const valid =
      matchesType(seed.type, rect.w, rect.h) &&
      (seed.area === null || seed.area === rect.w * rect.h);

    if (!valid) {
      setMessage(
        seed.area !== null && seed.area !== rect.w * rect.h
          ? `That marker needs ${seed.area} squares.`
          : 'That patch is the wrong shape for its marker.',
      );
    }

    commit([...placed, { seedIndex: seed.index, rect, valid }]);
  };

  const handleRemove = (seedIndex: number) => {
    commit(placed.filter((patch) => patch.seedIndex !== seedIndex));
  };

  const undo = () => {
    setHistory((previous) => {
      if (previous.length === 0) return previous;
      setPlaced(previous[previous.length - 1]);
      return previous.slice(0, -1);
    });
  };

  const hint = () => {
    if (!puzzle || isWon) return;

    // Drop in one correct patch the player has not placed yet.
    const missing = puzzle.solution.find(
      (rect) =>
        !placed.some(
          (patch) =>
            patch.rect.x === rect.x && patch.rect.y === rect.y &&
            patch.rect.w === rect.w && patch.rect.h === rect.h,
        ),
    );
    if (!missing) return;

    const seed = puzzle.seeds.find((candidate) => contains(missing, candidate.index, puzzle.size));
    if (!seed) return;

    const cleared = placed.filter((patch) => !overlaps(patch.rect, missing));
    commit([...cleared, { seedIndex: seed.index, rect: missing, valid: true }]);
    setHintsUsed((count) => count + 1);
  };

  const filled = placed.reduce((total, patch) => total + patch.rect.w * patch.rect.h, 0);

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
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" onClick={() => commit([])} disabled={placed.length === 0}>
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
            <PatchesBoard
              size={puzzle.size}
              seeds={puzzle.seeds}
              placed={placed}
              cell={cell}
              onPlace={handlePlace}
              onRemove={handleRemove}
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
            {filled} of {puzzle.size * puzzle.size} squares covered
          </p>
          <p className="mt-1 max-w-md text-center text-[13px] leading-relaxed text-faint">
            Drag across the grid to grow a marker into a patch. Click a patch to take it back.
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
