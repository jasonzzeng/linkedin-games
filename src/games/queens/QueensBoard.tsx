import type { CSSProperties } from 'react';
import { Crown, X } from 'lucide-react';
import type { CellMark, Puzzle } from './types';

interface QueensBoardProps {
  puzzle: Puzzle;
  marks: CellMark[];
  conflicts: Set<string>;
  cell: number;
  onToggle: (index: number) => void;
  disabled?: boolean;
}

const EDGE = 'var(--swatch-ink)';
const SEAM = 'color-mix(in srgb, var(--swatch-ink) 14%, transparent)';

/** Ten region colours; boards never exceed nine regions, so one spare. */
const REGION_COLORS = Array.from({ length: 10 }, (_, i) => `var(--queens-${i + 1})`);

export function QueensBoard({
  puzzle,
  marks,
  conflicts,
  cell,
  onToggle,
  disabled,
}: QueensBoardProps) {
  const { size, regions } = puzzle;
  const span = cell * size;

  const style: CSSProperties = {
    gridTemplateColumns: `repeat(${size}, ${cell}px)`,
    gridTemplateRows: `repeat(${size}, ${cell}px)`,
    width: span,
    height: span,
  };

  return (
    <div
      className="board-surface grid overflow-hidden rounded-lg"
      style={{ ...style, border: `2px solid ${EDGE}` }}
    >
      {marks.map((mark, index) => {
        const r = Math.floor(index / size);
        const c = index % size;
        const region = regions[index];

        // A heavy edge wherever the region changes, a hairline within one.
        // Both are keyed to a fixed dark ink rather than the theme's text
        // colour: region fills stay pale in dark mode too, so a border that
        // inverted with the theme disappeared against them.
        const differs = (other: number) => regions[other] !== region;
        const cellStyle: CSSProperties = {
          background: REGION_COLORS[region % REGION_COLORS.length],
          borderTop:
            r === 0 ? 'none' : differs(index - size) ? `2px solid ${EDGE}` : `1px solid ${SEAM}`,
          borderLeft:
            c === 0 ? 'none' : differs(index - 1) ? `2px solid ${EDGE}` : `1px solid ${SEAM}`,
        };

        const isConflicted = conflicts.has(`${r}-${c}`);

        return (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(index)}
            aria-label={`Row ${r + 1}, column ${c + 1}: ${
              mark === 'crown' ? 'crown' : mark === 'excluded' ? 'marked empty' : 'empty'
            }`}
            style={cellStyle}
            className={`relative flex items-center justify-center transition-[filter]
              ${disabled ? 'cursor-default' : 'cursor-pointer hover:brightness-95'}`}
          >
            {mark === 'crown' && (
              <Crown
                size={Math.round(cell * 0.52)}
                strokeWidth={2.25}
                color={isConflicted ? 'var(--danger)' : 'var(--swatch-ink)'}
                fill={isConflicted ? 'var(--danger)' : 'var(--swatch-ink)'}
              />
            )}
            {mark === 'excluded' && (
              <X
                size={Math.round(cell * 0.34)}
                strokeWidth={3.5}
                color="var(--swatch-ink)"
                className="opacity-45"
              />
            )}
            {isConflicted && (
              <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-danger" />
            )}
          </button>
        );
      })}
    </div>
  );
}
