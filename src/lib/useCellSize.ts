import { useEffect, useState } from 'react';

interface Options {
  cols: number;
  rows: number;
  /** Preferred cell size when there is room for it. */
  max: number;
  min?: number;
  /** Chrome above and below the board that the cells must not overlap. */
  reservedHeight?: number;
  /** Horizontal padding around the board. */
  reservedWidth?: number;
  /** Space between cells, counted into the fit. */
  gap?: number;
}

/**
 * Sizes grid cells to the viewport so a board never overflows on a phone
 * and never looks lost on a desktop. Shared by every grid-based game so
 * they all breathe the same way.
 */
export function useCellSize({
  cols,
  rows,
  max,
  min = 22,
  reservedHeight = 260,
  reservedWidth = 32,
  gap = 0,
}: Options): number {
  const [size, setSize] = useState(max);

  useEffect(() => {
    const measure = () => {
      const availableWidth = window.innerWidth - reservedWidth - gap * (cols - 1);
      const availableHeight = window.innerHeight - reservedHeight - gap * (rows - 1);
      const fit = Math.floor(
        Math.min(max, availableWidth / cols, availableHeight / rows),
      );
      setSize(Math.max(min, fit));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [cols, rows, max, min, reservedHeight, reservedWidth, gap]);

  return size;
}
