export type Direction = "left" | "right";

export type GameStatus = "playing" | "paused" | "gameover";

export type FallingBed = {
  id: number;
  col: number;
  color: string;
  // 0 at spawn, 1 the instant it reaches the platform's row and is
  // resolved as either caught or missed.
  fallProgress: number;
};

export type StackedBed = {
  col: number;
  color: string;
};

export type GameState = {
  platformCol: number;
  facing: Direction;
  fallingBed: FallingBed;
  stack: StackedBed[];
  status: GameStatus;
  nextBedId: number;
};

export const COLS = 9;
export const PLATFORM_WIDTH = 3;

// How many ticks a bed takes to fall from spawn to the platform's row —
// fixed regardless of score, so the timing feel stays consistent as the
// game speeds up. Difficulty instead comes from the tick interval itself
// shrinking (see tickIntervalForScore), the same way it does in Get the
// Buggy: fewer real-world milliseconds to react, not fewer ticks.
export const FALL_TICKS = 20;

// Viewport height in row-units, and how many empty rows sit above the
// landing row for a bed to fall through before it's resolved. Kept equal
// so the camera (see MakeTheBed.tsx) pins a bed's spawn point right at
// the top edge of the viewport once the tower's tall enough to scroll.
export const VIEW_ROWS = 14;
export const SPAWN_GAP_ROWS = 6;

export const BASE_TICK_MS = 140;
export const MIN_TICK_MS = 55;
export const SPEEDUP_PER_BED_MS = 3;

export const BED_COLORS = ["#f97316", "#f43f5e", "#8b5cf6", "#0ea5e9", "#22c55e", "#eab308"];

export function tickIntervalForScore(score: number): number {
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - score * SPEEDUP_PER_BED_MS);
}

// The world-row a caught bed comes to rest at. World-row 0 is the
// platform itself, so the first bed stacks at row 1, the next at row 2,
// and so on — stack.length is always the row the *next* bed will land on.
export function landingRowForStack(stackLength: number): number {
  return stackLength + 1;
}
