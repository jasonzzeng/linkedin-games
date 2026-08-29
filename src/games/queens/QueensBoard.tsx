import { useCallback, useMemo, useRef, useState } from 'react';
import { cellsBetween, colOf, rowOf } from './lib/board';
import { MARK, QUEEN, type Derived } from './lib/game';
import { CONFLICT_COLOR, colorOffset, regionColor } from './lib/palette';
import type { Puzzle } from './lib/types';
import { Crown, XMark } from './QueensIcons';

export type PaintMode = 'mark' | 'erase';

interface QueensBoardProps {
  puzzle: Puzzle;
  derived: Derived;
  autoCheck: boolean;
  /** Cells the current hint points at. */
  hintCells?: Set<number>;
  /** Supporting cells for the current hint. */
  hintFocus?: Set<number>;
  locked?: boolean;
  onBegin: () => void;
  onTap: (cell: number, shown: number) => void;
  onPaint: (cell: number, mode: PaintMode) => void;
  onEnd: () => void;
}

/** One crisp path along every region boundary, drawn over the grid. */
function RegionOutline({ size, regions }: { size: number; regions: number[] }) {
  const segments = useMemo(() => {
    const lines: string[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const i = r * size + c;
        if (c + 1 < size && regions[i + 1] !== regions[i]) lines.push(`M${c + 1} ${r}v1`);
        if (r + 1 < size && regions[i + size] !== regions[i]) lines.push(`M${c} ${r + 1}h1`);
      }
    }
    return lines.join('');
  }, [size, regions]);

  return (
    <svg
      className="q-outline"
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={segments}
        stroke="#111111"
        strokeWidth={0.055}
        fill="none"
        shapeRendering="crispEdges"
      />
      <rect
        x={0.028}
        y={0.028}
        width={size - 0.056}
        height={size - 0.056}
        fill="none"
        stroke="#111111"
        strokeWidth={0.056}
      />
    </svg>
  );
}

export function QueensBoard({
  puzzle,
  derived,
  autoCheck,
  hintCells,
  hintFocus,
  locked = false,
  onBegin,
  onTap,
  onPaint,
  onEnd,
}: QueensBoardProps) {
  const { size, regions } = puzzle;
  const gridRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    active: boolean;
    startCell: number;
    startShown: number;
    moved: boolean;
    mode: PaintMode | null;
    last: number;
  } | null>(null);
  const [cursor, setCursor] = useState(0);
  const offset = useMemo(() => colorOffset(puzzle.id), [puzzle.id]);

  const cellFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const element = gridRef.current;
      if (!element) return -1;
      const rect = element.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return -1;
      const c = Math.min(size - 1, Math.floor((x / rect.width) * size));
      const r = Math.min(size - 1, Math.floor((y / rect.height) * size));
      return r * size + c;
    },
    [size],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (locked || event.button === 2) return;
    const cell = cellFromPoint(event.clientX, event.clientY);
    if (cell < 0) return;
    event.preventDefault();
    gridRef.current?.setPointerCapture(event.pointerId);
    setCursor(cell);
    onBegin();

    const shown = derived.display[cell];
    // Crossing out an empty square happens straight away so dragging feels
    // instant; the other transitions wait for pointer-up, since a drag that
    // starts on a crown or an X means something different.
    if (shown === 0) {
      drag.current = {
        active: true, startCell: cell, startShown: shown, moved: false, mode: 'mark', last: cell,
      };
      onPaint(cell, 'mark');
    } else {
      drag.current = {
        active: true, startCell: cell, startShown: shown, moved: false, mode: null, last: cell,
      };
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state?.active) return;
    const cell = cellFromPoint(event.clientX, event.clientY);
    if (cell < 0 || cell === state.last) return;
    const previous = state.last;
    state.last = cell;

    if (!state.moved) {
      state.moved = true;
      if (state.mode === null) {
        // The gesture started on an X: dragging erases marks.
        state.mode = state.startShown === MARK ? 'erase' : null;
        if (state.mode === 'erase') onPaint(state.startCell, 'erase');
      }
    }
    if (state.mode) {
      setCursor(cell);
      // A fast drag jumps several squares between events; walking the line
      // means everything it passed over still gets marked.
      for (const step of cellsBetween(size, previous, cell)) onPaint(step, state.mode);
    }
  };

  const finishGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state?.active) return;
    if (gridRef.current?.hasPointerCapture(event.pointerId)) {
      gridRef.current.releasePointerCapture(event.pointerId);
    }
    // A tap that never moved cycles the square. An empty square was already
    // crossed out on pointer-down, which is what one tap should do.
    if (!state.moved && state.startShown !== 0) {
      onTap(state.startCell, state.startShown);
    }
    onEnd();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (locked) return;
    const r = rowOf(size, cursor);
    const c = colOf(size, cursor);
    const move = (nr: number, nc: number) => {
      event.preventDefault();
      setCursor(
        Math.max(0, Math.min(size - 1, nr)) * size + Math.max(0, Math.min(size - 1, nc)),
      );
    };
    switch (event.key) {
      case 'ArrowUp':
        return move(r - 1, c);
      case 'ArrowDown':
        return move(r + 1, c);
      case 'ArrowLeft':
        return move(r, c - 1);
      case 'ArrowRight':
        return move(r, c + 1);
      case 'Enter':
      case ' ':
        event.preventDefault();
        onBegin();
        onTap(cursor, derived.display[cursor]);
        return onEnd();
      case 'x':
      case 'X':
        event.preventDefault();
        onBegin();
        onPaint(cursor, derived.display[cursor] === MARK ? 'erase' : 'mark');
        return onEnd();
      default:
        return;
    }
  };

  const cells = [];
  for (let i = 0; i < size * size; i++) {
    const shown = derived.display[i];
    const conflicted = autoCheck && derived.conflictCells.has(i);
    const queenConflict = autoCheck && derived.conflictQueens.has(i);
    const r = rowOf(size, i);
    const c = colOf(size, i);

    cells.push(
      <div
        key={i}
        role="gridcell"
        aria-label={`Row ${r + 1}, column ${c + 1}${
          shown === QUEEN ? ', crown' : shown === MARK ? ', crossed out' : ', empty'
        }`}
        aria-selected={cursor === i}
        className={[
          'q-cell',
          conflicted ? 'q-cell-conflict' : '',
          cursor === i ? 'q-cell-cursor' : '',
          hintCells?.has(i) ? 'q-cell-hint' : '',
          hintFocus?.has(i) && !hintCells?.has(i) ? 'q-cell-hint-focus' : '',
          derived.solved ? 'q-cell-solved' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          background: conflicted ? CONFLICT_COLOR : regionColor(regions[i], offset),
          animationDelay: derived.solved ? `${(r + c) * 45}ms` : undefined,
        }}
      >
        {shown === QUEEN ? (
          <span className={`q-crown-wrap${queenConflict ? ' q-crown-bad' : ''}`}>
            <Crown className="q-crown" />
          </span>
        ) : shown === MARK ? (
          <XMark className={`q-x${derived.autoMark[i] ? ' q-x-auto' : ''}`} />
        ) : null}
      </div>,
    );
  }

  return (
    <div
      ref={gridRef}
      className="q-grid"
      role="grid"
      tabIndex={0}
      aria-label={`Queens board, ${size} by ${size}`}
      /* Both axes need explicit equal tracks: implicit auto rows grow around a
         crown, which slides the cells out from under the region outline. */
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={finishGesture}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {cells}
      <RegionOutline size={size} regions={regions} />
    </div>
  );
}
