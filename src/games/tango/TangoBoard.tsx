import type { CSSProperties } from 'react';
import { RelationType } from './types';
import type { Coords, Grid, Relation } from './types';
import { EMPTY, MOON, SUN } from './logic/constants';

interface TangoBoardProps {
  grid: Grid;
  initialGrid: Grid;
  relations: Relation[];
  size: number;
  onCellClick: (row: number, col: number, isSecondary: boolean) => void;
  hintCell: Coords | null;
  lastMove: Coords | null;
  invalidCells: Set<string>;
  /** Pixel size of one cell, owned by the caller so controls can match the board. */
  cell: number;
}

/** A plain ringed disc, as in the real game — not a rayed sun. */
function SunIcon() {
  return (
    <svg viewBox="0 0 100 100" className="size-[58%]" aria-hidden>
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="var(--tango-sun)"
        stroke="var(--tango-sun-edge)"
        strokeWidth="7"
      />
    </svg>
  );
}

/**
 * Crescent built from two arcs meeting at cusps computed from the
 * intersection of a r=36 disc at (50,52) and the r=33 disc at (69,33)
 * subtracted from it, so the outline strokes cleanly.
 */
function MoonIcon() {
  return (
    <svg viewBox="0 0 100 100" className="size-[62%]" aria-hidden>
      <path
        d="M39.9 17.4 A36 36 0 1 0 84.6 62.1 A33 33 0 0 1 39.9 17.4 Z"
        fill="var(--tango-moon)"
        stroke="var(--tango-moon-edge)"
        strokeWidth="7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const symbolLabel = (value: number) =>
  value === SUN ? 'sun' : value === MOON ? 'moon' : 'empty';

interface Segment {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Splits one divider into the runs that are actually drawn, skipping a window
 * around each constraint marker. Interrupting the line beats painting a swatch
 * over it: a swatch has to guess a single background colour, and a divider sits
 * between two cells that may be shaded differently.
 */
function splitDivider(
  key: string,
  start: number,
  end: number,
  fixed: number,
  horizontal: boolean,
  breaks: number[],
  gap: number,
): Segment[] {
  const segments: Segment[] = [];
  let cursor = start;

  for (const at of [...breaks].sort((a, b) => a - b)) {
    const from = at - gap;
    if (from > cursor) {
      segments.push({
        key: `${key}-${cursor}`,
        x1: horizontal ? cursor : fixed,
        y1: horizontal ? fixed : cursor,
        x2: horizontal ? from : fixed,
        y2: horizontal ? fixed : from,
      });
    }
    cursor = Math.max(cursor, at + gap);
  }

  if (cursor < end) {
    segments.push({
      key: `${key}-${cursor}`,
      x1: horizontal ? cursor : fixed,
      y1: horizontal ? fixed : cursor,
      x2: horizontal ? end : fixed,
      y2: horizontal ? fixed : end,
    });
  }

  return segments;
}

export function TangoBoard({
  grid,
  initialGrid,
  relations,
  size,
  onCellClick,
  hintCell,
  lastMove,
  invalidCells,
  cell,
}: TangoBoardProps) {
  const span = cell * size;
  const markerGap = Math.max(7, cell * 0.15);
  const markerSize = Math.max(11, cell * 0.3);

  // Where each divider is interrupted by a constraint marker.
  const horizontalBreaks = new Map<number, number[]>();
  const verticalBreaks = new Map<number, number[]>();
  for (const relation of relations) {
    if (relation.vertical) {
      // Sits on the horizontal divider below row r.
      const row = relation.r + 1;
      const list = horizontalBreaks.get(row) ?? [];
      list.push(relation.c * cell + cell / 2);
      horizontalBreaks.set(row, list);
    } else {
      const col = relation.c + 1;
      const list = verticalBreaks.get(col) ?? [];
      list.push(relation.r * cell + cell / 2);
      verticalBreaks.set(col, list);
    }
  }

  const segments: Segment[] = [];
  for (let row = 1; row < size; row++) {
    segments.push(
      ...splitDivider(
        `h${row}`,
        0,
        span,
        row * cell,
        true,
        horizontalBreaks.get(row) ?? [],
        markerGap,
      ),
    );
  }
  for (let col = 1; col < size; col++) {
    segments.push(
      ...splitDivider(
        `v${col}`,
        0,
        span,
        col * cell,
        false,
        verticalBreaks.get(col) ?? [],
        markerGap,
      ),
    );
  }

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${size}, ${cell}px)`,
    gridTemplateRows: `repeat(${size}, ${cell}px)`,
  };

  return (
    <div
      className="board-surface relative overflow-hidden rounded-lg border
        border-[var(--tango-grid)] bg-surface"
      style={{ width: span, height: span }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="grid" style={gridStyle}>
        {grid.map((row, r) =>
          row.map((value, c) => {
            const isLocked = initialGrid[r][c] !== EMPTY;
            const isHinted = hintCell?.r === r && hintCell?.c === c;
            const isLast = lastMove?.r === r && lastMove?.c === c;
            const isInvalid = invalidCells.has(`${r}-${c}`);

            const background = isInvalid
              ? 'var(--danger-soft)'
              : isHinted || isLast
                ? 'var(--accent-soft)'
                : isLocked
                  ? 'var(--tango-locked)'
                  : undefined;

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
                style={{ background }}
                className={`flex items-center justify-center transition-colors ${
                  isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-hover'
                }`}
              >
                {value === SUN && <SunIcon />}
                {value === MOON && <MoonIcon />}
              </button>
            );
          }),
        )}
      </div>

      {/* Dividers and constraint markers share one crisp overlay. */}
      <svg
        aria-hidden
        width={span}
        height={span}
        className="pointer-events-none absolute inset-0"
      >
        <g stroke="var(--tango-grid)" strokeWidth="1" shapeRendering="crispEdges">
          {segments.map((segment) => (
            <line
              key={segment.key}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
            />
          ))}
        </g>

        <g
          fill="var(--tango-mark)"
          fontSize={markerSize}
          fontWeight="600"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {relations.map((relation, index) => {
            const x = relation.vertical
              ? relation.c * cell + cell / 2
              : (relation.c + 1) * cell;
            const y = relation.vertical
              ? (relation.r + 1) * cell
              : relation.r * cell + cell / 2;
            return (
              <text key={`relation-${index}`} x={x} y={y}>
                {relation.type === RelationType.Equal ? '=' : '×'}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
