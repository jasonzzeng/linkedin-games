import type { Point, PuzzleConfig, Difficulty } from '../types';
import { pointToString } from './logic';

const DIRECTIONS = [
  { x: 0, y: -1 }, // Up
  { x: 0, y: 1 },  // Down
  { x: -1, y: 0 }, // Left
  { x: 1, y: 0 }   // Right
];

// Helper: Check if two points are equal
const pointsEqual = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

// Fallback / Seed: Deterministic Serpentine Path (always valid)
const generateSerpentinePath = (width: number, height: number): Point[] => {
  const path: Point[] = [];
  for (let y = 0; y < height; y++) {
    if (y % 2 === 0) {
      for (let x = 0; x < width; x++) path.push({ x, y });
    } else {
      for (let x = width - 1; x >= 0; x--) path.push({ x, y });
    }
  }
  return path;
};

// High-Randomness Generator using "Backbiting" (Rewiring)
// 1. Start with a valid Hamiltonian path (Serpentine).
// 2. Randomly pick an endpoint (head or tail).
// 3. Pick a neighbor of that endpoint that isn't its immediate connection in the path.
// 4. This creates a loop. Break the loop to form a new Hamiltonian path.
// 5. Repeat many times to randomize.
const generateHamiltonianPathRewired = (width: number, height: number, difficulty: Difficulty): Point[] => {
  let path = generateSerpentinePath(width, height);
  const totalCells = width * height;
  
  // Number of rewires. More rewires = more random structure.
  // Scale with grid size.
  let iterations = 0;
  switch (difficulty) {
    case 'Easy': iterations = 300; break;   // 36 cells
    case 'Medium': iterations = 800; break; // 64 cells
    case 'Hard': iterations = 2000; break;  // 100 cells
  }

  // To optimize lookup of "index in path"
  // Map "x,y" -> index in current path array
  const indexMap = new Map<string, number>();
  path.forEach((p, i) => indexMap.set(pointToString(p), i));

  for (let k = 0; k < iterations; k++) {
    // 50% chance to mutate Head, 50% chance to mutate Tail
    const mutateTail = Math.random() > 0.5;

    if (mutateTail) {
      // 1. Look at Tail
      const tailIndex = path.length - 1;
      const tail = path[tailIndex];
      const prev = path[tailIndex - 1]; // Connected neighbor

      // Find valid neighbors on grid
      const neighbors = DIRECTIONS.map(d => ({ x: tail.x + d.x, y: tail.y + d.y }))
        .filter(n => 
          n.x >= 0 && n.x < width && 
          n.y >= 0 && n.y < height && 
          !pointsEqual(n, prev) // Can't connect back to immediate predecessor
        );

      if (neighbors.length === 0) continue;

      // Pick random neighbor to "bite"
      const target = neighbors[Math.floor(Math.random() * neighbors.length)];
      const targetIndex = indexMap.get(pointToString(target));
      
      if (targetIndex === undefined) continue; // Should not happen in full path

      // REWIRE:
      // Current:  0 ... targetIndex ... tail
      // New:      0 ... targetIndex -> tail -> (tail-1) ... (targetIndex+1)
      // Operation: Reverse the segment from targetIndex+1 to tail
      
      const segment = path.slice(targetIndex + 1).reverse();
      
      // Reconstruct path
      // 0..targetIndex stays
      // segment appended
      const prefix = path.slice(0, targetIndex + 1);
      path = prefix.concat(segment);
      
      // Update Index Map (only for changed segment)
      for (let i = targetIndex + 1; i < totalCells; i++) {
        indexMap.set(pointToString(path[i]), i);
      }

    } else {
      // 2. Look at Head
      const head = path[0];
      const next = path[1];

      const neighbors = DIRECTIONS.map(d => ({ x: head.x + d.x, y: head.y + d.y }))
        .filter(n => 
          n.x >= 0 && n.x < width && 
          n.y >= 0 && n.y < height && 
          !pointsEqual(n, next)
        );

      if (neighbors.length === 0) continue;

      const target = neighbors[Math.floor(Math.random() * neighbors.length)];
      const targetIndex = indexMap.get(pointToString(target));
      
      if (targetIndex === undefined) continue;

      // REWIRE HEAD:
      // Current: head ... targetIndex ... end
      // New:     (targetIndex-1) ... head -> targetIndex ... end
      // Operation: Reverse the segment from 0 to targetIndex-1
      
      const segment = path.slice(0, targetIndex).reverse();
      const suffix = path.slice(targetIndex);
      
      path = segment.concat(suffix);

      // Update Index Map
      for (let i = 0; i < targetIndex; i++) {
        indexMap.set(pointToString(path[i]), i);
      }
    }
  }

  return path;
};

export const generatePuzzle = (difficulty: Difficulty): PuzzleConfig => {
  let width = 6;
  let height = 6;
  let numCheckpoints = 8;
  let minGap = 2; // Minimum index difference between checkpoints

  switch (difficulty) {
    case 'Easy':
      width = 6; height = 6; 
      numCheckpoints = 8; 
      minGap = 3; 
      break;
    case 'Medium':
      width = 8; height = 8; 
      numCheckpoints = 14; 
      minGap = 3; 
      break;
    case 'Hard':
      width = 10; height = 10; 
      numCheckpoints = 20; 
      minGap = 4;
      break;
  }

  // 1. Generate Path using Rewiring (Backbiting)
  // This guarantees valid Hamiltonian paths with high randomness
  const path = generateHamiltonianPathRewired(width, height, difficulty);

  // 2. Place Checkpoints
  const pathLength = path.length;
  const indices = new Set<number>();
  
  // Mandatory: Start (0) and End (last)
  indices.add(0);
  indices.add(pathLength - 1);

  // Helper to check validity against existing indices
  const isValidCandidate = (c: number) => {
    for (const idx of indices) {
      if (Math.abs(c - idx) < minGap) return false;
    }
    return true;
  };

  // Attempt to place remaining checkpoints
  let attempts = 0;
  while (indices.size < numCheckpoints && attempts < 2000) {
    attempts++;
    // Pick random index between 1 and length-2
    const c = Math.floor(Math.random() * (pathLength - 2)) + 1;
    
    if (!indices.has(c) && isValidCandidate(c)) {
      indices.add(c);
    }
  }
  
  // Fallback if sparse placement fails
  if (indices.size < numCheckpoints) {
    const available = [];
    for (let i = 1; i < pathLength - 1; i++) {
        if (!indices.has(i)) available.push(i);
    }
    // Shuffle available indices
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }
    
    let ptr = 0;
    while (indices.size < numCheckpoints && ptr < available.length) {
        indices.add(available[ptr]);
        ptr++;
    }
  }

  // 3. Sort indices to assign checkpoint numbers 1..N strictly in order
  const sortedIndices = Array.from(indices).sort((a, b) => a - b);
  const checkpoints: Record<string, number> = {};

  sortedIndices.forEach((pathIdx, i) => {
    const point = path![pathIdx];
    checkpoints[pointToString(point)] = i + 1;
  });

  return {
    width,
    height,
    checkpoints,
    solutionPath: path
  };
};