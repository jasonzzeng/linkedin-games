import type { Point, PuzzleConfig } from '../types';
import { pointToString, isValidMove } from './logic';

export const findStraightLinePath = (
  start: Point,
  target: Point,
  currentPath: Point[],
  config: PuzzleConfig
): Point[] | null => {
  // Must be same row or same column
  if (start.x !== target.x && start.y !== target.y) return null;
  
  const path: Point[] = [];
  const dx = Math.sign(target.x - start.x);
  const dy = Math.sign(target.y - start.y);
  
  let curr = { ...start };
  
  // Iterate from start+1 to target
  while (curr.x !== target.x || curr.y !== target.y) {
    curr = { x: curr.x + dx, y: curr.y + dy };
    
    // Validate this step against the path we are building
    const fullTestPath = [...currentPath, ...path];
    if (!isValidMove(fullTestPath, curr, config)) {
      return null;
    }
    
    path.push(curr);
  }
  
  return path;
};

export const findShortestPath = (
  start: Point,
  target: Point,
  currentPath: Point[],
  config: PuzzleConfig
): Point[] | null => {
  // BFS
  const queue: { point: Point; path: Point[] }[] = [];
  queue.push({ point: start, path: [] });

  const visited = new Set<string>();
  // Mark cells in current player path as visited so we don't cross self
  currentPath.forEach(p => visited.add(pointToString(p)));

  // Exception: The 'head' is in visited, but that's where we start. 
  // We strictly look for *extensions*.

  while (queue.length > 0) {
    const { point, path } = queue.shift()!;
    const pointKey = pointToString(point);

    if (pointKey === pointToString(target)) {
      return path;
    }

    const neighbors = [
      { x: point.x, y: point.y - 1 },
      { x: point.x, y: point.y + 1 },
      { x: point.x - 1, y: point.y },
      { x: point.x + 1, y: point.y }
    ];

    for (const nb of neighbors) {
      const nbKey = pointToString(nb);
      
      // Construct a hypothetical path to test validity using current logic
      // The 'path' here is the segment being built. 
      // isValidMove checks against the *entire* path so far.
      const fullTestPath = [...currentPath, ...path]; 
      
      if (isValidMove(fullTestPath, nb, config)) {
         // Standard BFS visited check for the search scope
         if (!visited.has(nbKey)) {
           visited.add(nbKey);
           queue.push({ point: nb, path: [...path, nb] });
         }
      }
    }
  }

  return null;
};