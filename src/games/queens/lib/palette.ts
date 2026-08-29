/**
 * Region colours. Eleven hues, ordered so that neighbouring entries stay easy
 * to tell apart; a puzzle uses a rotated slice so boards don't all look alike.
 */
export const REGION_COLORS = [
  "#FFC8A2", // peach
  "#96BEFF", // blue
  "#B3DFA0", // green
  "#BBA3E2", // purple
  "#E6F388", // lime
  "#DFDFDF", // grey
  "#FF7B60", // coral
  "#A3D2D8", // teal
  "#DFA0BF", // pink
  "#B9B29E", // taupe
  "#8FE3D8", // aqua
];

/** Deterministic colour for a region, rotated by the puzzle id. */
export function regionColor(regionId: number, offset: number): string {
  return REGION_COLORS[(regionId + offset) % REGION_COLORS.length];
}

/** Turns a puzzle id into a stable rotation offset. */
export function colorOffset(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % REGION_COLORS.length;
}

export const CONFLICT_COLOR = "#FF4438";
