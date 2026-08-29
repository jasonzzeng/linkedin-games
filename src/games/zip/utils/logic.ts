import type { Point, PuzzleConfig, InputMode } from '../types';

export const pointToString = (p: Point) => `${p.x},${p.y}`;
export const stringToPoint = (s: string): Point => {
  const [x, y] = s.split(',').map(Number);
  return { x, y };
};

export const isAdjacent = (a: Point, b: Point): boolean => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
};

export const getCurrentMaxCheckpoint = (path: Point[], checkpoints: Record<string, number>): number => {
  let max = 0;
  for (const p of path) {
    const val = checkpoints[pointToString(p)];
    if (val && val > max) max = val;
  }
  return max;
};

export const isValidMove = (
  currentPath: Point[],
  nextPoint: Point,
  config: PuzzleConfig
): boolean => {
  const head = currentPath[currentPath.length - 1];
  
  // 1. Must be adjacent
  if (!isAdjacent(head, nextPoint)) return false;

  // 2. Must be within bounds
  if (nextPoint.x < 0 || nextPoint.x >= config.width || 
      nextPoint.y < 0 || nextPoint.y >= config.height) return false;

  const nextKey = pointToString(nextPoint);
  
  // 3. Must not be visited
  if (currentPath.some(p => pointToString(p) === nextKey)) return false;

  // 4. Checkpoint ordering logic
  const nextCheckpointVal = config.checkpoints[nextKey];
  const currentMax = getCurrentMaxCheckpoint(currentPath, config.checkpoints);

  if (nextCheckpointVal !== undefined) {
    // If we step on a number, it MUST be the next sequential number
    if (nextCheckpointVal !== currentMax + 1) return false;
  } else {
    // If it's empty, we are fine
  }

  return true;
};

export const checkWin = (path: Point[], config: PuzzleConfig): boolean => {
  const totalCells = config.width * config.height;
  if (path.length !== totalCells) return false;
  
  const totalCheckpoints = Object.keys(config.checkpoints).length;
  
  // New strict rule: The path MUST end on the final checkpoint.
  const head = path[path.length - 1];
  const headKey = pointToString(head);
  const headCheckpointVal = config.checkpoints[headKey];

  return headCheckpointVal === totalCheckpoints;
};

export const checkInvalidFullBoard = (path: Point[], config: PuzzleConfig): boolean => {
  const totalCells = config.width * config.height;
  
  // Only relevant if board is full
  if (path.length !== totalCells) return false;

  // If full, check if we missed the win condition (ending on last number)
  const totalCheckpoints = Object.keys(config.checkpoints).length;
  const head = path[path.length - 1];
  const headKey = pointToString(head);
  const headCheckpointVal = config.checkpoints[headKey];

  // It's invalid if we are full but NOT standing on the final checkpoint
  return headCheckpointVal !== totalCheckpoints;
};

export const checkInvalidNotFull = (path: Point[], config: PuzzleConfig): boolean => {
  const totalCells = config.width * config.height;
  
  // Requirement: Not full
  if (path.length === totalCells) return false;

  const totalCheckpoints = Object.keys(config.checkpoints).length;
  const currentMax = getCurrentMaxCheckpoint(path, config.checkpoints);

  // Requirement: All checkpoints visited
  return currentMax === totalCheckpoints;
};

// Input Mode Gating Helpers
export const shouldAllowDrag = (mode: InputMode): boolean => {
  return mode === 'drag' || mode === 'both';
};

export const shouldAllowClick = (mode: InputMode): boolean => {
  return mode === 'click' || mode === 'both';
};
