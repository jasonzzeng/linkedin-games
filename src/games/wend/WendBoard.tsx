import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { neighbours } from './logic/generator';
import type { Puzzle } from './types';

export interface PlacedPath {
  cells: number[];
  color: string;
}

interface WendBoardProps {
  puzzle: Puzzle;
  /** Everything currently laid on the board, right or wrong. */
  paths: PlacedPath[];
  /** Colour for the run being drawn right now. */
  traceColor: string;
  cell: number;
  onTrace: (path: number[]) => boolean;
  onRemove: (pathIndex: number) => void;
  onTraceChange?: (cells: number[]) => void;
  disabled?: boolean;
}

export const WEND_COLORS = Array.from({ length: 5 }, (_, i) => `var(--wend-${i + 1})`);

const centre = (size: number, cell: number, index: number) => ({
  x: (index % size) * cell + cell / 2,
  y: Math.floor(index / size) * cell + cell / 2,
});

/**
 * A chevron pointing along the step, sitting in the gap between two letters —
 * how the real board shows which way a word runs.
 */
function Chevron({
  from,
  to,
  size,
  cell,
}: {
  from: number;
  to: number;
  size: number;
  cell: number;
}) {
  const a = centre(size, cell, from);
  const b = centre(size, cell, to);
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const arm = cell * 0.11;

  // Perpendicular to the direction of travel.
  const px = -dy;
  const py = dx;
  const tipX = mx + dx * arm;
  const tipY = my + dy * arm;

  return (
    <path
      d={`M${mx - dx * arm + px * arm} ${my - dy * arm + py * arm}L${tipX} ${tipY}L${
        mx - dx * arm - px * arm
      } ${my - dy * arm - py * arm}`}
      fill="none"
      stroke="var(--wend-letter)"
      strokeWidth={Math.max(2, cell * 0.055)}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.75"
    />
  );
}

/** One word drawn as a thick rounded ribbon, capped at the square it starts on. */
function Ribbon({
  path,
  size,
  cell,
  color,
}: {
  path: number[];
  size: number;
  cell: number;
  color: string;
}) {
  if (path.length === 0) return null;
  const points = path.map((index) => centre(size, cell, index));
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join('');

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={cell * 0.78}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ring round the first letter, so you can see which end is the start. */}
      <circle
        cx={points[0].x}
        cy={points[0].y}
        r={cell * 0.36}
        fill="none"
        stroke="#ffffff"
        strokeWidth={Math.max(2, cell * 0.05)}
      />
      {path.slice(0, -1).map((from, i) => (
        <Chevron key={from} from={from} to={path[i + 1]} size={size} cell={cell} />
      ))}
    </g>
  );
}

export function WendBoard({
  puzzle,
  paths,
  traceColor,
  cell,
  onTrace,
  onRemove,
  onTraceChange,
  disabled,
}: WendBoardProps) {
  const { size, letters, blocked } = puzzle;
  const boardRef = useRef<HTMLDivElement>(null);
  const [trace, setTrace] = useState<number[]>([]);
  const [shake, setShake] = useState(false);

  // Pointer handlers live for a whole drag, so read the trace from a ref
  // rather than closing over a stale copy.
  const traceRef = useRef<number[]>([]);
  traceRef.current = trace;

  // Cell -> index of the path covering it.
  const claimed = new Map<number, number>();
  paths.forEach((path, pathIndex) => {
    for (const index of path.cells) claimed.set(index, pathIndex);
  });

  useEffect(() => {
    onTraceChange?.(trace);
  }, [trace, onTraceChange]);

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
    if (index === null || blocked[index]) return;

    // Touching a run that is already down lifts it off, so a word can be
    // redrawn without clearing the board.
    const existing = claimed.get(index);
    if (existing !== undefined) {
      onRemove(existing);
      return;
    }

    event.preventDefault();
    boardRef.current?.setPointerCapture(event.pointerId);
    setTrace([index]);
  };

  const extendTrace = (event: PointerEvent<HTMLDivElement>) => {
    const current = traceRef.current;
    if (current.length === 0) return;

    const index = cellFromEvent(event);
    if (index === null || blocked[index] || claimed.has(index)) return;

    // Stepping back onto the previous square rubs the last one out.
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

  const span = cell * size;
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${size}, ${cell}px)`,
    gridTemplateRows: `repeat(${size}, ${cell}px)`,
  };

  // Heavy outline wherever a blocked square meets an open one.
  const outline: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const i = r * size + c;
      if (c + 1 < size && blocked[i + 1] !== blocked[i]) outline.push(`M${c + 1} ${r}v1`);
      if (r + 1 < size && blocked[i + size] !== blocked[i]) outline.push(`M${c} ${r + 1}h1`);
    }
  }

  return (
    <div
      ref={boardRef}
      onPointerDown={startTrace}
      onPointerMove={extendTrace}
      onPointerUp={endTrace}
      onPointerCancel={endTrace}
      style={{ width: span, height: span }}
      className={`board-surface relative overflow-hidden rounded-xl border-[3px]
        border-[var(--wend-frame)] bg-surface ${shake ? 'animate-shake' : ''}`}
    >
      {/* 1. Square backgrounds and hairlines. */}
      <div className="absolute inset-0 grid" style={gridStyle}>
        {letters.map((_, index) => (
          <div
            key={index}
            style={{ background: blocked[index] ? 'var(--wend-blocked)' : undefined }}
            className={`border-b border-r border-[var(--wend-line)]
              ${index % size === size - 1 ? 'border-r-0' : ''}
              ${Math.floor(index / size) === size - 1 ? 'border-b-0' : ''}`}
          />
        ))}
      </div>

      {/* 2. Ribbons and the blocked-region outline, beneath the letters. */}
      <svg
        aria-hidden
        width={span}
        height={span}
        className="pointer-events-none absolute inset-0"
      >
        <g transform={`scale(${cell})`}>
          <path
            d={outline.join('')}
            stroke="var(--wend-frame)"
            strokeWidth={3 / cell}
            fill="none"
            shapeRendering="crispEdges"
          />
        </g>
        {paths.map((path, pathIndex) => (
          <Ribbon
            key={pathIndex}
            path={path.cells}
            size={size}
            cell={cell}
            color={path.color}
          />
        ))}
        {trace.length > 0 && (
          <Ribbon path={trace} size={size} cell={cell} color={traceColor} />
        )}
      </svg>

      {/* 3. Letters, and the layer that takes the pointer. */}
      <div className="absolute inset-0 grid" style={gridStyle}>
        {letters.map((letter, index) => {
          // Letters sitting on a ribbon are always dark, because the ribbon is
          // bright in either theme. Everywhere else they follow the theme —
          // otherwise every unclaimed letter turns near-black on a dark page.
          const onRibbon = claimed.has(index) || trace.includes(index);
          return (
            <div
              key={index}
              data-cell={index}
              aria-hidden={blocked[index]}
              style={{
                fontSize: Math.round(cell * 0.46),
                color: onRibbon ? 'var(--wend-letter)' : 'var(--ink)',
              }}
              className={`relative flex items-center justify-center font-extrabold
                ${blocked[index] ? '' : 'cursor-pointer'}`}
            >
              {!blocked[index] && letter}
            </div>
          );
        })}
      </div>
    </div>
  );
}
