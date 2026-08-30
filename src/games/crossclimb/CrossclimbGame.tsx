import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, FlipVertical2, Lightbulb, Shuffle } from 'lucide-react';
import { getGame } from '../../lib/games';
import { formatTime } from '../../lib/format';
import { useBestTime } from '../../lib/usePersistedState';
import { loadValue, saveValue } from '../../lib/storage';
import { GameShell } from '../../shared/GameShell';
import { Button } from '../../shared/Button';
import { Select } from '../../shared/Select';
import { Toast } from '../../shared/Toast';
import { WinDialog } from '../../shared/WinDialog';
import { CrossclimbBoard } from './CrossclimbBoard';
import { useGameState } from './game/useGameState';
import { pickPuzzle } from './data';
import type { Difficulty, Puzzle } from './game/types';

const meta = getGame('crossclimb');
const RECENT_KEY = 'crossclimb.recent';

const difficultyOptions = [
  { value: 'easy' as const, label: 'Easy · 4 letters' },
  { value: 'medium' as const, label: 'Medium · 5 letters' },
  { value: 'hard' as const, label: 'Hard · 6 letters' },
];

const stageHint: Record<string, string> = {
  FILL: 'Solve the middle clues — one word per row.',
  ARRANGE: 'Now drag the rows so each word differs from the next by a single letter.',
  FINAL: 'Ladder locked. Solve the top and bottom rows to finish.',
  COMPLETED: 'Solved.',
};

export default function CrossclimbGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [puzzle, setPuzzle] = useState<Puzzle>(() => {
    const recent = loadValue<string[]>(RECENT_KEY, []);
    return pickPuzzle('easy', recent);
  });

  const loadPuzzle = useCallback((nextDifficulty: Difficulty) => {
    const recent = loadValue<string[]>(RECENT_KEY, []);
    const next = pickPuzzle(nextDifficulty, recent);
    saveValue(RECENT_KEY, [next.id, ...recent].slice(0, 10));
    setDifficulty(nextDifficulty);
    setPuzzle(next);
  }, []);

  return (
    <CrossclimbRound
      key={puzzle.id}
      puzzle={puzzle}
      difficulty={difficulty}
      onChangeDifficulty={loadPuzzle}
      onNewPuzzle={() => loadPuzzle(difficulty)}
    />
  );
}

interface RoundProps {
  puzzle: Puzzle;
  difficulty: Difficulty;
  onChangeDifficulty: (difficulty: Difficulty) => void;
  onNewPuzzle: () => void;
}

function CrossclimbRound({ puzzle, difficulty, onChangeDifficulty, onNewPuzzle }: RoundProps) {
  const gameState = useGameState(puzzle);
  const {
    rows,
    activeRowIndex,
    setActiveRowIndex,
    stage,
    elapsedTime,
    penalties,
    hintsUsed,
    revealsUsed,
    handleHint,
    handleReveal,
    flipMiddle,
    toastMessage,
    stageBanner,
  } = gameState;

  const total = elapsedTime + penalties;
  const { best, submit } = useBestTime('crossclimb', difficulty);
  const [record, setRecord] = useState<{ isRecord: boolean; best: number } | null>(null);

  useEffect(() => {
    if (stage !== 'COMPLETED' || record) return;
    setRecord(submit(total));
  }, [stage, record, submit, total]);

  const activeRow = rows[activeRowIndex];
  const clue = activeRow?.isLocked ? 'Locked until the ladder is built' : activeRow?.clue;

  const toolbar = (
    <>
      <Select
        label="Difficulty"
        value={difficulty}
        options={difficultyOptions}
        onChange={onChangeDifficulty}
      />
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" onClick={handleHint} disabled={stage === 'COMPLETED'}>
          <Lightbulb size={15} /> Hint
          <span className="text-faint">+5s</span>
        </Button>
        <Button size="sm" onClick={handleReveal} disabled={stage === 'COMPLETED'}>
          <Eye size={15} /> Reveal
          <span className="text-faint">+20s</span>
        </Button>
        {stage === 'FINAL' && (
          <Button size="sm" onClick={flipMiddle}>
            <FlipVertical2 size={15} /> Flip
          </Button>
        )}
        <Button size="sm" variant="primary" onClick={onNewPuzzle}>
          <Shuffle size={15} /> New
        </Button>
      </div>
    </>
  );

  return (
    <GameShell game={meta} elapsed={total} toolbar={toolbar}>
      <p className="mb-5 text-center text-[13px] font-medium text-muted">{stageHint[stage]}</p>

      <CrossclimbBoard gameState={gameState} wordLength={puzzle.wordLength} />

      {/* Clue for the row you're on, with a stepper to move between rows. */}
      <div className="mt-6 flex w-full max-w-md items-center gap-1 rounded-lg border border-line bg-surface p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveRowIndex(Math.max(0, activeRowIndex - 1))}
          disabled={activeRowIndex === 0}
          aria-label="Previous clue"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-faint
            transition-colors hover:bg-hover hover:text-ink disabled:opacity-25 sm:size-9"
        >
          <ChevronUp size={18} />
        </button>
        <p className="flex-1 px-2 text-center text-sm font-medium text-ink">
          {clue ?? 'Select a row'}
        </p>
        <button
          type="button"
          onClick={() => setActiveRowIndex(Math.min(rows.length - 1, activeRowIndex + 1))}
          disabled={activeRowIndex === rows.length - 1}
          aria-label="Next clue"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-faint
            transition-colors hover:bg-hover hover:text-ink disabled:opacity-25 sm:size-9"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      <Toast message={stageBanner ?? toastMessage} />

      <WinDialog
        isOpen={stage === 'COMPLETED'}
        time={total}
        best={record?.best ?? best}
        isRecord={record?.isRecord ?? false}
        stats={[
          { label: 'Solving time', value: formatTime(elapsedTime) },
          { label: 'Penalties', value: `+${formatTime(penalties)}` },
          { label: 'Hints', value: String(hintsUsed) },
          { label: 'Reveals', value: String(revealsUsed) },
        ]}
        onPlayAgain={onNewPuzzle}
      />
    </GameShell>
  );
}
