import { useImperativeHandle, useRef, type Ref } from 'react';
import { Lock } from 'lucide-react';
import type { RowState } from './game/types';

export interface RowHandle {
  focus: () => void;
}

interface CrossclimbRowProps {
  row: RowState;
  isActive: boolean;
  wordLength: number;
  isReadOnly?: boolean;
  onClick: () => void;
  onChange: (word: string) => void;
  onComplete?: () => void;
  ref?: Ref<RowHandle>;
}

export function CrossclimbRow({
  row,
  isActive,
  wordLength,
  isReadOnly,
  onClick,
  onChange,
  onComplete,
  ref,
}: CrossclimbRowProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (row.isLocked || isReadOnly) return;
      const blank = row.currentWord.indexOf(' ');
      const target = blank === -1 ? wordLength - 1 : blank;
      window.setTimeout(() => inputs.current[target]?.focus(), 10);
    },
  }));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (isReadOnly) return;
    if (event.key === 'Backspace' && row.currentWord[index] === ' ' && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < wordLength - 1) {
      event.preventDefault();
      inputs.current[index + 1]?.focus();
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (isReadOnly) return;
    const character = event.target.value.toUpperCase().slice(-1);
    if (character !== '' && !/^[A-Z]$/.test(character)) return;

    const letters = row.currentWord.split('');
    letters[index] = character || ' ';
    const word = letters.join('');
    onChange(word);

    if (!character) return;
    if (index < wordLength - 1) inputs.current[index + 1]?.focus();
    else if (!word.includes(' ')) onComplete?.();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, wordLength);
    if (!pasted) return;

    const letters = row.currentWord.split('');
    for (let i = 0; i < pasted.length; i++) letters[i] = pasted[i];
    const word = letters.join('');
    onChange(word);

    if (!word.includes(' ')) onComplete?.();
    else inputs.current[Math.min(pasted.length, wordLength - 1)]?.focus();
  };

  if (row.isLocked) {
    return (
      <div
        aria-label="Locked row"
        className="flex h-14 w-full items-center justify-center rounded-md border
          border-dashed border-line-strong bg-sunken text-faint"
      >
        <Lock size={18} />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative flex h-14 w-full items-center justify-center gap-1.5 rounded-md
        border px-2 transition-colors
        ${
          row.status === 'incorrect'
            ? 'border-danger bg-danger-soft'
            : isActive
              ? 'border-accent bg-accent-soft'
              : 'border-line bg-surface'
        }`}
    >
      {Array.from({ length: wordLength }).map((_, index) => {
        const character = row.currentWord[index];
        const isRevealed = row.revealedIndices.includes(index);
        const tone =
          row.status === 'correct'
            ? 'text-success'
            : isRevealed
              ? 'text-accent'
              : 'text-ink';

        if (isReadOnly) {
          return (
            <div
              key={index}
              className={`flex size-10 items-center justify-center border-b-2 text-2xl
                font-bold uppercase ${isActive ? 'border-ink' : 'border-line'} ${tone}`}
            >
              {character === ' ' ? '' : character}
            </div>
          );
        }

        return (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element;
            }}
            value={character === ' ' ? '' : character}
            onChange={(event) => handleChange(event, index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onPaste={handlePaste}
            onFocus={onClick}
            maxLength={2}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label={`Letter ${index + 1}`}
            className={`size-10 border-b-2 bg-transparent text-center text-2xl font-bold
              uppercase outline-none transition-colors
              ${isActive ? 'border-ink' : 'border-line'} ${tone}`}
          />
        );
      })}
    </div>
  );
}
