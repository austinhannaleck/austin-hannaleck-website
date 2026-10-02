import { DIRECTIONS, HERO_SIZE, HERO_START_HP, HP_CAP, ROOM_H, ROOM_W, type Direction, type GameState, type Spawn } from "./types";
import { ROOMS } from "./world";

// What gets written to localStorage: inventory, progress flags, and the
// spot you'll continue from. Rooms themselves aren't saved (they reset on
// every visit anyway).
export type SaveData = {
  version: 1;
  respawn: Spawn;
  maxHp: number;
  gems: number;
  smallKeys: number;
  hasSword: boolean;
  hasSwitcheroo: boolean;
  hasBigKey: boolean;
  flags: string[];
  frames: number;
  deaths: number;
};

export function snapshotSave(state: GameState): SaveData {
  const inv = state.inventory;
  return {
    version: 1,
    respawn: { ...state.respawn },
    maxHp: state.hero.maxHp,
    gems: inv.gems,
    smallKeys: inv.smallKeys,
    hasSword: inv.hasSword,
    hasSwitcheroo: inv.hasSwitcheroo,
    hasBigKey: inv.hasBigKey,
    flags: [...state.flags].sort(),
    frames: state.frame,
    deaths: state.deaths,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = finiteNumber(value);
  return n === null ? fallback : Math.min(max, Math.max(min, Math.round(n)));
}

// Whatever's in a player's browser could be stale, hand-edited, or junk,
// so every field is checked and clamped. A save that can't be trusted to
// put you somewhere real comes back null, and the game starts fresh.
export function sanitizeSave(raw: unknown): SaveData | null {
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.respawn)) return null;
  const { roomId, x, y, facing } = raw.respawn;
  if (typeof roomId !== "string" || !(roomId in ROOMS)) return null;
  const px = finiteNumber(x);
  const py = finiteNumber(y);
  if (px === null || py === null) return null;
  if (px < 0 || py < 0 || px > ROOM_W - HERO_SIZE || py > ROOM_H - HERO_SIZE) return null;

  // Heart containers come in whole hearts (two halves each).
  const maxHp = clampInt(raw.maxHp, HERO_START_HP, HP_CAP, HERO_START_HP);
  return {
    version: 1,
    respawn: {
      roomId,
      x: px,
      y: py,
      facing: DIRECTIONS.includes(facing as Direction) ? (facing as Direction) : "down",
    },
    maxHp: maxHp - (maxHp % 2),
    gems: clampInt(raw.gems, 0, 999, 0),
    smallKeys: clampInt(raw.smallKeys, 0, 9, 0),
    hasSword: raw.hasSword === true,
    hasSwitcheroo: raw.hasSwitcheroo === true,
    hasBigKey: raw.hasBigKey === true,
    flags: Array.isArray(raw.flags) ? raw.flags.filter((f): f is string => typeof f === "string") : [],
    frames: clampInt(raw.frames, 0, Number.MAX_SAFE_INTEGER, 0),
    deaths: clampInt(raw.deaths, 0, 1_000_000, 0),
  };
}
