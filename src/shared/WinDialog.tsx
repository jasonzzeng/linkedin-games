import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { formatTime } from '../lib/format';
import { Button } from './Button';

export interface WinStat {
  label: string;
  value: string;
}

interface WinDialogProps {
  isOpen: boolean;
  /** Final time in seconds, including any penalties. */
  time: number;
  best: number | null;
  isRecord: boolean;
  /** Optional breakdown rows, e.g. penalties or hints used. */
  stats?: WinStat[];
  onPlayAgain: () => void;
}

export function WinDialog({
  isOpen,
  time,
  best,
  isRecord,
  stats,
  onPlayAgain,
}: WinDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Puzzle solved"
        className="w-full max-w-sm rounded-lg bg-surface p-7 text-center shadow-lg animate-pop-in"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Trophy size={22} />
        </div>

        <h2 className="mt-4 text-xl font-bold text-ink">Solved</h2>
        <div className="tabular mt-1 text-4xl font-light tracking-tight text-ink">
          {formatTime(time)}
        </div>

        {isRecord ? (
          <p className="mt-2 text-sm font-semibold text-accent">New personal best</p>
        ) : (
          best !== null && (
            <p className="tabular mt-2 text-sm text-muted">Your best: {formatTime(best)}</p>
          )
        )}

        {stats && stats.length > 0 && (
          <dl className="mt-5 space-y-1.5 rounded-md bg-sunken p-4 text-sm">
            {stats.map((stat) => (
              <div key={stat.label} className="flex justify-between gap-4">
                <dt className="text-muted">{stat.label}</dt>
                <dd className="tabular font-medium text-ink">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-6 space-y-2">
          <Button variant="primary" size="lg" onClick={onPlayAgain}>
            Play again
          </Button>
          <Link
            to="/"
            className="inline-flex h-10 w-full items-center justify-center rounded-full
              text-sm font-semibold text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            All games
          </Link>
        </div>
      </div>
    </div>
  );
}
