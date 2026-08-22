export type Direction = "up" | "down" | "left" | "right";

export type Point = { x: number; y: number };

export type GameStatus = "playing" | "paused" | "gameover";

// The board's one special-item slot can hold any of these — only one at
// a time, same rarity budget broccoli originally had alone. "mushroom"
// and "goldenBug" are one-shot (an instant shrink, or bonus points on
// pickup); the rest grant a timed buff, tracked via ActivePowerup.
export type PickupType = "broccoli" | "carrot" | "mint" | "magnet" | "mushroom" | "goldenBug";

export const PICKUP_TYPES: PickupType[] = ["broccoli", "carrot", "mint", "magnet", "mushroom", "goldenBug"];

export type BoardPickup = {
  type: PickupType;
  position: Point;
  // Only goldenBug despawns on a timer if left uneaten; everything else
  // just sits on the board until eaten (or the game restarts).
  ticksRemaining: number | null;
};

export type PowerupType = "broccoli" | "carrot" | "mint" | "magnet";

export type ActivePowerup = {
  type: PowerupType;
  // Counted down in ticks (not wall-clock ms) so the timer naturally
  // pauses along with the game — no separate bookkeeping needed for
  // "how long were we paused."
  ticksRemaining: number;
};

export type GameState = {
  banjo: Point[];
  direction: Direction;
  pendingDirection: Direction | null;
  bug: Point;
  pickup: BoardPickup | null;
  score: number;
  status: GameStatus;
  activePowerup: ActivePowerup | null;
  // Bumped each time a powerup pickup is eaten — lets the UI/sound layer
  // detect "a pickup just happened" distinctly from "a powerup is
  // (still) active," the same way `score` doubles as an eat signal.
  powerupPickupCount: number;
  // Which pickup type triggered the most recent bump above — sound
  // effects need to know *which* fanfare to play.
  lastPickupType: PickupType | null;
};

export const GRID_SIZE = 18;
export const BASE_TICK_MS = 220;
export const MIN_TICK_MS = 90;
export const SPEEDUP_PER_BUG_MS = 6;

export const PICKUP_SPAWN_CHANCE = 0.2;

// Broccoli: a Mario-star-style power-up. Invincible (no self-collision
// death) and wall wrap-around, both for the full duration.
export const POWERUP_DURATION_MS = 15_000;

// Carrot: fixed fast tick rate regardless of score — a skill-testing
// speed boost rather than a defensive buff like broccoli.
export const CARROT_DURATION_MS = 8_000;
export const CARROT_TICK_MS = 65;

// Mint: the inverse of carrot — a "breather" that widens the tick
// interval so the board feels slower for a bit.
export const MINT_DURATION_MS = 8_000;
export const MINT_TICK_MS = 260;

// Magnet: doesn't touch collision or speed — drags the current bug one
// cell closer to Banjo every tick, and biases where the next one spawns
// too, an easier-mode pickup.
export const MAGNET_DURATION_MS = 10_000;
export const MAGNET_PULL_RADIUS = 5;
// Cells per tick the pull moves the bug on each axis — has to beat
// Banjo's own 1-cell-per-tick pace, or a bug trailing directly behind a
// straight run never actually closes the gap.
export const MAGNET_PULL_SPEED = 2;

// Mushroom: instant effect on pickup, no timer — cuts the tail down,
// floored so the snake never shrinks below its starting length.
export const MUSHROOM_SHRINK_SEGMENTS = 3;
export const MUSHROOM_MIN_LENGTH = 3;

// Golden bug: a rare high-value bug standing in for the regular one,
// worth more but on a countdown — risk/reward instead of a buff.
export const GOLDEN_BUG_BONUS_SCORE = 4;
export const GOLDEN_BUG_LIFESPAN_MS = 6_000;

export function tickIntervalForScore(score: number): number {
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - score * SPEEDUP_PER_BUG_MS);
}

// The tick rate actually in effect right now — carrot/mint override the
// normal score-based curve while they're active. Used both to schedule
// the game loop and (at pickup time) to convert a powerup's ms duration
// into a tick count.
export function tickIntervalForState(score: number, activePowerup: ActivePowerup | null): number {
  if (activePowerup?.type === "carrot") return CARROT_TICK_MS;
  if (activePowerup?.type === "mint") return MINT_TICK_MS;
  return tickIntervalForScore(score);
}

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b;
}
