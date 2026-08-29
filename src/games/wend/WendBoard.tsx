import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { neighbours } from './logic/generator';
import type { Puzzle } from './types';

interface WendBoardProps {
  puzzle: Puzzle;
  /** Cell index -> index of the word that claimed it, or undefined. */
  claimed: Map<number, number>;
  cell: number;
  onTrace: (path: number[]) => boolean;
  disabled?: boolean;
}

const SWATCHES = Array.from({ length: 10 }, (_, i) => `var(--swatch-${i + 1})`);

export function WendBoard({ puzzle, claimed, cell, onTrace, disabled }: WendBoardProps) {
  const { size, letters, blocked } = puzzle;
  const boardRef = useRef<HTMLDivElement>(null);
  const [trace, setTrace] = useState<number[]>([]);
  const [shake, setShake] = useState(false);

  // Pointer handlers live across a whole drag, so read the trace from a ref
  // rather than closing over a stale copy.
  const traceRef = useRef<number[]>([]);
  traceRef.current = trace;

  useEffect(() => {
    if (!shake) return;
    const id = window.setTimeout(() => setShake(false), 320);
    return () => window.clearTimeout(id);
  }, [shake]);

  const cellFromEvent = (event: PointerEvent<HTMLDivElement>): number | null => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const target = element?.closest<HTMLElement>('[data-cell]');
    if (!target) return null;
    return Number(target.dataset.cell);
  };

  const startTrace = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const index = cellFromEvent(event);
    if (index === null || blocked[index] || claimed.has(index)) return;
    event.preventDefault();
    boardRef.current?.setPointerCapture(event.pointerId);
    setTrace([index]);
  };

  const extendTrace = (event: PointerEvent<HTMLDivElement>) => {
    const current = traceRef.current;
    if (current.length === 0) return;

    const index = cellFromEvent(event);
    if (index === null || blocked[index] || claimed.has(index)) return;

    // Stepping back onto the previous cell rubs the last one out.
    if (current.length >= 2 && index === current[current.length - 2]) {
      setTrace(current.slice(0, -1));
      return;
    }
    if (current.includes(index)) return;
    if (!neighbours(size, current[current.length - 1]).includes(index)) return;

    setTrace([...current, index]);
  };

  const endTrace = (event: PointerEvent<HTMLDivElement>) => {
    if (boardRef.current?.hasPointerCapture(event.pointerId)) {
      boardRef.current.releasePointerCapture(event.pointerId);
    }
    const current = traceRef.current;
    if (current.length > 1 && !onTrace(current)) setShake(true);
    setTrace([]);
  };

  const style: CSSProperties = {
    gridTemplateColumns: `repeat(${size}, ${cell}px)`,
    gridTemplateRows: `repeat(${size}, ${cell}px)`,
  };

  return (
    <div
      ref={boardRef}
      onPointerDown={startTrace}
      onPointerMove={extendTrace}
      onPointerUp={endTrace}
      onPointerCancel={endTrace}
      style={style}
      className={`board-surface grid overflow-hidden rounded-lg border-2 border-line-strong
        bg-surface ${shake ? 'animate-shake' : ''}`}
    >
      {letters.map((letter, index) => {
        const isBlocked = blocked[index];
        const wordIndex = claimed.get(index);
        const tracePos = trace.indexOf(index);

        const background = isBlocked
          ? 'var(--surface-sunken)'
          : tracePos !== -1
            ? 'var(--accent-soft)'
            : wordIndex !== undefined
              ? SWATCHES[wordIndex % SWATCHES.length]
              : 'var(--surface)';

        return (
          <div
            key={index}
            data-cell={index}
            aria-hidden={isBlocked}
            style={{ background, fontSize: Math.round(cell * 0.42) }}
            className={`relative flex items-center justify-center border-b border-r border-line
              font-bold transition-colors
              ${isBlocked ? '' : 'cursor-pointer'}
              ${wordIndex !== undefined || tracePos !== -1 ? 'text-[var(--swatch-ink)]' : 'text-ink'}
              ${tracePos !== -1 ? 'ring-2 ring-inset ring-accent' : ''}`}
          >
            {!isBlocked && letter}
          </div>
        );
      })}
    </div>
  );
}
