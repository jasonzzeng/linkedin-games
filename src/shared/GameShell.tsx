import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CircleHelp, Monitor, Moon, Sun } from 'lucide-react';
import type { GameMeta } from '../lib/games';
import { formatTime } from '../lib/format';
import { useTheme } from '../lib/useTheme';
import { IconButton } from './Button';
import { HelpPanel } from './HelpPanel';

interface GameShellProps {
  game: GameMeta;
  /** Seconds on the clock, shown top-right. Pass null to hide it. */
  elapsed: number | null;
  /** Game-specific controls, laid out in a row beneath the header. */
  toolbar?: ReactNode;
  /** Extra controls in the header, left of the help button. */
  headerExtra?: ReactNode;
  children: ReactNode;
}

const themeIcon = { system: Monitor, light: Sun, dark: Moon };
const themeLabel = { system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' };

export function GameShell({ game, elapsed, toolbar, headerExtra, children }: GameShellProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const { preference, cycle } = useTheme();
  const ThemeIcon = themeIcon[preference];

  // Every descendant reads --accent, so one line repaints the whole game.
  const accentStyle = {
    '--accent': `var(${game.accentVar})`,
    '--accent-soft': 'color-mix(in srgb, var(--accent) 14%, var(--surface))',
  } as CSSProperties;

  return (
    <div style={accentStyle} className="flex min-h-full flex-col bg-ground">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-3 sm:px-4">
          <Link
            to="/"
            aria-label="All games"
            className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full
              px-2.5 text-sm font-semibold text-muted transition-colors hover:bg-hover
              hover:text-ink sm:h-9 sm:min-w-0"
          >
            <ArrowLeft size={17} />
            <span className="hidden sm:inline">Games</span>
          </Link>

          <div className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />

          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="truncate text-[17px] font-bold tracking-tight text-ink">{game.name}</h1>
            <span className="hidden text-xs font-medium text-faint sm:inline">Unlimited</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {elapsed !== null && (
              <div
                className="tabular mr-1 rounded-full bg-sunken px-3 py-1.5 text-sm font-semibold text-ink"
                aria-label="Elapsed time"
              >
                {formatTime(elapsed)}
              </div>
            )}
            {headerExtra}
            <IconButton label="How to play" onClick={() => setHelpOpen(true)}>
              <CircleHelp size={18} />
            </IconButton>
            <IconButton label={themeLabel[preference]} onClick={cycle}>
              <ThemeIcon size={17} />
            </IconButton>
          </div>
        </div>

        {toolbar && (
          <div className="border-t border-line/70 bg-surface">
            <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
              {toolbar}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-3 py-6 sm:px-4">
        {children}
      </main>

      <HelpPanel
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        gameName={game.name}
        rules={game.rules}
      />
    </div>
  );
}
