import type { CSSProperties } from 'react';
import { RelationType } from './types';
import type { Coords, Grid, Relation } from './types';
import { EMPTY, MOON, SUN } from './logic/constants';
import { useCellSize } from '../../lib/useCellSize';

const GAP = 4;

interface TangoBoardProps {
  grid: Grid;
  initialGrid: Grid;
  relations: Relation[];
  size: number;
  onCellClick: (row: number, col: number, isSecondary: boolean) => void;
  hintCell: Coords | null;
  lastMove: Coords | null;
  invalidCells: Set<string>;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 100 100" className="size-[68%]" aria-hidden>
      <circle cx="50" cy="50" r="24" fill="var(--accent)" />
      <g stroke="var(--accent)" strokeWidth="9" strokeLinecap="round">
        <line x1="50" y1="8" x2="50" y2="20" />
        <line x1="50" y1="80" x2="50" y2="92" />
        <line x1="8" y1="50" x2="20" y2="50" />
        <line x1="80" y1="50" x2="92" y2="50" />
        <line x1="20" y1="20" x2="28" y2="28" />
        <line x1="72" y1="72" x2="80" y2="80" />
        <line x1="20" y1="80" x2="28" y2="72" />
        <line x1="72" y1="28" x2="80" y2="20" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 100 100" className="size-[68%]" aria-hidden>
      <path
        d="M68 16A38 38 0 1 0 68 84 30 30 0 1 1 68 16Z"
        fill="var(--ink-muted)"
      />
    </svg>
  );
}

const symbolLabel = (value: number) =>
  value === SUN ? 'sun' : value === MOON ? 'moon' : 'empty';

export function TangoBoard({
  grid,
  initialGrid,
  relations,
  size,
  onCellClick,
  hintCell,
  lastMove,
  invalidCells,
}: TangoBoardProps) {
  const cell = useCellSize({
    cols: size,
    rows: size,
    max: 62,
    min: 26,
    reservedHeight: 300,
    gap: GAP,
  });

  const style: CSSProperties = {
    gridTemplateColumns: `repeat(${size}, ${cell}px)`,
    gridTemplateRows: `repeat(${size}, ${cell}px)`,
    gap: `${GAP}px`,
  };

  return (
    <div
      className="board-surface relative grid rounded-lg border border-line bg-surface p-2 shadow-sm"
      style={style}
      onContextMenu={(event) => event.preventDefault()}
    >
      {grid.map((row, r) =>
        row.map((value, c) => {
          const isLocked = initialGrid[r][c] !== EMPTY;
          const isHinted = hintCell?.r === r && hintCell?.c === c;
          const isLast = lastMove?.r === r && lastMove?.c === c;
          const isInvalid = invalidCells.has(`${r}-${c}`);

          return (
            <button
              key={`${r}-${c}`}
              type="button"
              disabled={isLocked}
              aria-label={`Row ${r + 1}, column ${c + 1}: ${symbolLabel(value)}${
                isLocked ? ', given' : ''
              }`}
              onClick={() => onCellClick(r, c, false)}
              onContextMenu={(event) => {
                event.preventDefault();
                onCellClick(r, c, true);
              }}
              className={`flex items-center justify-center rounded-sm border transition-colors
                ${isLocked ? 'cursor-not-allowed bg-sunken' : 'cursor-pointer bg-surface hover:bg-hover'}
                ${
                  isInvalid
                    ? 'border-danger bg-danger-soft'
                    : isHinted || isLast
                      ? 'border-accent bg-accent-soft'
                      : 'border-line'
                }`}
            >
              {value === SUN && <SunIcon />}
              {value === MOON && <MoonIcon />}
            </button>
          );
        }),
      )}

      {relations.map((relation, index) => {
        const step = cell + GAP;
        const top = relation.vertical
          ? (relation.r + 1) * step - GAP / 2
          : relation.r * step + cell / 2;
        const left = relation.vertical
          ? relation.c * step + cell / 2
          : (relation.c + 1) * step - GAP / 2;

        return (
          <span
            key={`relation-${index}`}
            aria-hidden
            style={{ top: top + 8, left: left + 8 }}
            className="pointer-events-none absolute z-10 flex size-4 -translate-x-1/2 -translate-y-1/2
              items-center justify-center rounded-full bg-surface text-[11px] font-bold
              leading-none text-ink shadow-sm ring-1 ring-line"
          >
            {relation.type === RelationType.Equal ? '=' : '×'}
          </span>
        );
      })}
    </div>
  );
}
