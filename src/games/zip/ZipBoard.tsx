import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { InputMode, Point, PuzzleConfig } from './types';
import { isValidMove, pointToString, shouldAllowClick, shouldAllowDrag } from './utils/logic';
import { findShortestPath, findStraightLinePath } from './utils/pathfinding';
import { useCellSize } from '../../lib/useCellSize';

interface ZipBoardProps {
  config: PuzzleConfig;
  path: Point[];
  onPathUpdate: (path: Point[], commitToHistory?: boolean) => void;
  onDragStart: () => void;
  isComplete: boolean;
  inputMode: InputMode;
}

export function ZipBoard({
  config,
  path,
  onPathUpdate,
  onDragStart,
  isComplete,
  inputMode,
}: ZipBoardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [shake, setShake] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const cell = useCellSize({
    cols: config.width,
    rows: config.height,
    max: config.width <= 6 ? 62 : config.width <= 8 ? 54 : 46,
    min: 24,
    reservedHeight: 300,
  });

  // The path state is read inside pointer handlers that live for the whole
  // drag; a ref keeps them looking at the current path rather than a stale one.
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    if (!shake) return;
    const id = window.setTimeout(() => setShake(false), 320);
    return () => window.clearTimeout(id);
  }, [shake]);

  const pointFromEvent = (event: PointerEvent<HTMLElement>): Point | null => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const target = element?.closest<HTMLElement>('[data-cell]');
    if (!target) return null;
    return { x: Number(target.dataset.x), y: Number(target.dataset.y) };
  };

  const extendTo = (point: Point) => {
    const current = pathRef.current;
    const head = current[current.length - 1];
    const key = pointToString(point);

    if (key === pointToString(head)) {
      if (shouldAllowDrag(inputMode)) {
        onDragStart();
        setIsDragging(true);
      }
      return;
    }

    if (!shouldAllowClick(inputMode)) return;

    // Clicking somewhere already drawn rewinds the path to that point.
    const existingIndex = current.findIndex((p) => pointToString(p) === key);
    if (existingIndex !== -1) {
      onDragStart();
      onPathUpdate(current.slice(0, existingIndex + 1), false);
      return;
    }

    // Prefer a straight run; fall back to the shortest legal detour.
    const extension =
      findStraightLinePath(head, point, current, config) ??
      findShortestPath(head, point, current, config);

    if (extension) {
      onPathUpdate([...current, ...extension], true);
    } else {
      setShake(true);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isComplete) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    boardRef.current?.setPointerCapture(event.pointerId);
    extendTo(point);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isComplete || !shouldAllowDrag(inputMode)) return;
    const point = pointFromEvent(event);
    if (!point) return;

    const current = pathRef.current;
    const key = pointToString(point);
    const existingIndex = current.findIndex((p) => pointToString(p) === key);

    if (existingIndex !== -1) {
      // Only ever step back onto the cell directly behind the head — dragging
      // across an older part of the path should not teleport you there.
      if (existingIndex === current.length - 2) {
        onPathUpdate(current.slice(0, existingIndex + 1), false);
      }
      return;
    }

    if (isValidMove(current, point, config)) {
      onPathUpdate([...current, point], false);
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (boardRef.current?.hasPointerCapture(event.pointerId)) {
      boardRef.current.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${config.width}, ${cell}px)`,
    gridTemplateRows: `repeat(${config.height}, ${cell}px)`,
  };

  const head = path[path.length - 1];
  const polyline = path
    .map((p) => `${p.x * cell + cell / 2},${p.y * cell + cell / 2}`)
    .join(' ');

  return (
    <div
      ref={boardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={gridStyle}
      className={`board-surface board-drag relative grid overflow-hidden rounded-lg border border-line
        bg-surface shadow-sm ${shake ? 'animate-shake' : ''}
        ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
    >
      <svg
        aria-hidden
        width={config.width * cell}
        height={config.height * cell}
        className="pointer-events-none absolute inset-0 z-10"
      >
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={cell * 0.44}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
      </svg>

      {Array.from({ length: config.height }).flatMap((_, y) =>
        Array.from({ length: config.width }).map((__, x) => {
          const key = `${x},${y}`;
          const checkpoint = config.checkpoints[key];
          const isHead = head && head.x === x && head.y === y;

          return (
            <div
              key={key}
              data-cell
              data-x={x}
              data-y={y}
              className="relative flex items-center justify-center border-b border-r
                border-line/70 last:border-r-0"
            >
              {checkpoint !== undefined && (
                <span
                  style={{ width: cell * 0.66, height: cell * 0.66, fontSize: cell * 0.34 }}
                  className="tabular relative z-20 flex items-center justify-center rounded-full
                    border-2 border-accent bg-surface font-bold leading-none text-ink"
                >
                  {checkpoint}
                </span>
              )}
              {isHead && checkpoint === undefined && (
                <span
                  style={{ width: cell * 0.3, height: cell * 0.3 }}
                  className="relative z-20 rounded-full bg-surface/70"
                />
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
