import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Monitor, Moon, Sun } from 'lucide-react';
import { GAMES } from '../lib/games';
import { useTheme } from '../lib/useTheme';
import { IconButton } from '../shared/Button';
import { GameThumb } from './GameThumb';

const themeIcon = { system: Monitor, light: Sun, dark: Moon };
const themeLabel = { system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' };

export function Home() {
  const { preference, cycle } = useTheme();
  const ThemeIcon = themeIcon[preference];

  return (
    <div className="min-h-full bg-ground">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Games Unlimited
            </h1>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
              Four puzzles in the spirit of the LinkedIn dailies — except they never run out.
              Everything generates in your browser, so there is no daily limit and no account.
            </p>
          </div>
          <IconButton label={themeLabel[preference]} onClick={cycle} className="mt-1 shrink-0">
            <ThemeIcon size={18} />
          </IconButton>
        </header>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {GAMES.map((game) => (
            <li key={game.id}>
              <Link
                to={game.path}
                style={{ '--accent': `var(${game.accentVar})` } as CSSProperties}
                className="group flex h-full items-center gap-4 rounded-lg border border-line
                  bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5
                  hover:border-line-strong hover:shadow-md"
              >
                <div className="size-16 shrink-0 rounded-md bg-sunken p-2">
                  <GameThumb id={game.id} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-bold text-ink">{game.name}</h2>
                    <ArrowRight
                      size={15}
                      className="text-accent opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{game.tagline}</p>
                  <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-faint">
                    {game.rules[0]}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-14 border-t border-line pt-6 text-[13px] leading-relaxed text-faint">
          <p>
            Unofficial fan-made puzzles, not affiliated with or endorsed by LinkedIn. Puzzles are
            generated locally in your browser — nothing you play is sent anywhere, and your times
            are stored only on this device.
          </p>
        </footer>
      </div>
    </div>
  );
}
