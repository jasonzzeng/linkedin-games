import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Rect, Seed, ShapeType } from './types';

export interface PlacedPatch {
  seedIndex: number;
  rect: Rect;
  valid: boolean;
}

interface PatchesBoardProps {
  size: number;
  seeds: Seed[];
  placed: PlacedPatch[];
  cell: number;
  onPlace: (rect: Rect) => void;
  onRemove: (seedIndex: number) => void;
  disabled?: boolean;
}

const SWATCHES = Array.from({ length: 10 }, (_, i) => `var(--swatch-${i + 1})`);

/** The marker's silhouette is how the game states the required shape. */
const markerShape = (type: ShapeType, cell: number): CSSProperties => {
  const long = Math.round(cell * 0.62);
  const short = Math.round(cell * 0.34);
  if (type === 'tall') return { width: short, height: long };
  if (type === 'wide') return { width: long, height: short };
  if (type === 'square') return { width: long, height: long };
  return { width: long, height: long, borderStyle: 'dashed' };
};

const rectFrom = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x) + 1,
  h: Math.abs(a.y - b.y) + 1,
});

export function PatchesBoard({
  size,
  seeds,
  placed,
  cell,
  onPlace,
  onRemove,
  disabled,
}: PatchesBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const span = cell * size;
  const placedBySeed = new Map(placed.map((patch) => [patch.seedIndex, patch]));
  const colorFor = (seedIndex: number) =>
    SWATCHES[seeds.findIndex((seed) => seed.index === seedIndex) % SWATCHES.length];

  const cellFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = boardRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const x = Math.floor((event.clientX - bounds.left) / cell);
    const y = Math.floor((event.clientY - bounds.top) / cell);
    if (x < 0 || y < 0 || x >= size || y >= size) return null;
    return { x, y };
  };

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const point = cellFromEvent(event);
    if (!point) return;

    // Dragging out from a placed patch takes it back off the board.
    const existing = placed.find(
      ({ rect }) =>
        point.x >= rect.x && point.x < rect.x + rect.w &&
        point.y >= rect.y && point.y < rect.y + rect.h,
    );
    if (existing) {
      onRemove(existing.seedIndex);
      return;
    }

    event.preventDefault();
    boardRef.current?.setPointerCapture(event.pointerId);
    setAnchor(point);
    setCursor(point);
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!anchor) return;
    const point = cellFromEvent(event);
    if (point) setCursor(point);
  };

  const handleUp = (event: PointerEvent<HTMLDivElement>) => {
    if (boardRef.current?.hasPointerCapture(event.pointerId)) {
      boardRef.current.releasePointerCapture(event.pointerId);
    }
    if (anchor && cursor) onPlace(rectFrom(anchor, cursor));
    setAnchor(null);
    setCursor(null);
  };

  const preview = anchor && cursor ? rectFrom(anchor, cursor) : null;

  return (
    <div
      ref={boardRef}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      style={{ width: span, height: span }}
      className="board-surface relative rounded-lg border border-line bg-surface"
    >
      {/* Empty grid behind everything. */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${size}, ${cell}px)`,
          gridTemplateRows: `repeat(${size}, ${cell}px)`,
        }}
      >
        {Array.from({ length: size * size }).map((_, index) => (
          <div
            key={index}
            className={`border-dashed border-line
              ${index % size === size - 1 ? '' : 'border-r'}
              ${Math.floor(index / size) === size - 1 ? '' : 'border-b'}`}
          />
        ))}
      </div>

      {/* Committed patches. */}
      {placed.map((patch) => {
        const seed = seeds.find((candidate) => candidate.index === patch.seedIndex)!;
        return (
          <div
            key={patch.seedIndex}
            style={{
              left: patch.rect.x * cell + 2,
              top: patch.rect.y * cell + 2,
              width: patch.rect.w * cell - 4,
              height: patch.rect.h * cell - 4,
              background: colorFor(patch.seedIndex),
              fontSize: Math.round(cell * 0.36),
            }}
            className={`absolute flex items-center justify-center rounded-md font-bold
              text-[var(--swatch-ink)] shadow-sm transition-colors
              ${patch.valid ? '' : 'outline outline-2 outline-danger'}`}
          >
            {seed.area !== null && <span className="tabular">{seed.area}</span>}
          </div>
        );
      })}

      {/* Markers still waiting to be grown into a patch. */}
      {seeds.map((seed) => {
        if (placedBySeed.has(seed.index)) return null;
        const x = seed.index % size;
        const y = Math.floor(seed.index / size);
        return (
          <div
            key={seed.index}
            style={{ left: x * cell, top: y * cell, width: cell, height: cell }}
            className="pointer-events-none absolute flex items-center justify-center"
          >
            <span
              style={{
                ...markerShape(seed.type, cell),
                background: colorFor(seed.index),
                fontSize: Math.round(cell * 0.32),
              }}
              className="flex items-center justify-center rounded-md border-2
                border-[var(--swatch-ink)]/25 font-bold text-[var(--swatch-ink)]"
            >
              {seed.area !== null && <span className="tabular">{seed.area}</span>}
            </span>
          </div>
        );
      })}

      {/* Live drag outline. */}
      {preview && (
        <div
          style={{
            left: preview.x * cell,
            top: preview.y * cell,
            width: preview.w * cell,
            height: preview.h * cell,
          }}
          className="pointer-events-none absolute rounded-md border-2 border-accent bg-accent/15"
        />
      )}
    </div>
  );
}
