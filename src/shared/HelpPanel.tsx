import { X } from 'lucide-react';
import { useEffect } from 'react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  gameName: string;
  rules: string[];
}

export function HelpPanel({ isOpen, onClose, gameName, rules }: HelpPanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`How to play ${gameName}`}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-surface p-6 shadow-lg animate-pop-in"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-ink">How to play {gameName}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full p-1.5 text-faint transition-colors hover:bg-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="mt-4 space-y-2.5">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-3 text-sm leading-relaxed text-muted">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
