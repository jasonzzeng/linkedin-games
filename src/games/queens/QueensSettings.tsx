import { useEffect, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import type { Settings } from './lib/storage';
import { IconButton } from '../../shared/Button';

interface QueensSettingsProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const OPTIONS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'showClock', label: 'Show clock', hint: 'Hide the timer if it stresses you out.' },
  { key: 'autoCheck', label: 'Auto-check', hint: 'Paint clashing crowns red as you place them.' },
  {
    key: 'autoPlaceX',
    label: "Auto-place X's",
    hint: 'Cross out everything a crown rules out. Your own marks survive.',
  },
];

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        on ? 'bg-accent' : 'bg-line-strong'
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${
          on ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function QueensSettings({ settings, onChange }: QueensSettingsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <IconButton label="Settings" onClick={() => setOpen((value) => !value)}>
        <Settings2 size={17} />
      </IconButton>

      {open && (
        <div
          role="dialog"
          aria-label="Queens settings"
          className="absolute right-0 top-11 z-40 w-72 rounded-lg border border-line
            bg-surface p-2 shadow-lg animate-pop-in"
        >
          {OPTIONS.map((option) => (
            <div
              key={option.key}
              className="flex items-start gap-3 rounded-md p-2.5 hover:bg-hover"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{option.label}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-faint">{option.hint}</p>
              </div>
              <Toggle
                label={option.label}
                on={settings[option.key]}
                onChange={(value) => onChange({ [option.key]: value })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
