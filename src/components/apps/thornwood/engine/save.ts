import { noKeys } from "./inventory";
import {
  DIRECTIONS,
  DUNGEONS,
  HERO_SIZE,
  HERO_START_HP,
  HP_CAP,
  KEPT_ITEMS,
  TILE,
  TOOLS,
  type Direction,
  type Dungeon,
  type DungeonKeys,
  type GameState,
  type KeptItem,
  type Spawn,
  type ToolId,
} from "./types";
import { ROOMS, roomSize } from "./world";

// What gets written to localStorage: inventory, progress flags, and the
// spot you'll continue from. Rooms themselves aren't saved (they reset on
// every visit anyway).
//
// Changing this shape means bumping SAVE_VERSION and adding a step to
// MIGRATIONS below that turns the old shape into the new one, so nobody's
// saved game gets thrown away.
export const SAVE_VERSION = 3;

export type SaveData = {
  version: typeof SAVE_VERSION;
  respawn: Spawn;
  maxHp: number;
  gems: number;
  owned: KeptItem[];
  keys: Record<Dungeon, DungeonKeys>;
  gateKey: boolean;
  equipped: ToolId | null;
  flags: string[];
  // Beaten enemies, by defeatKey (respawn.ts), and the frame each fell on.
  defeated: Record<string, number>;
  frames: number;
  deaths: number;
};

export function snapshotSave(state: GameState): SaveData {
  const inv = state.inventory;
  return {
    version: SAVE_VERSION,
    respawn: { ...state.respawn },
    maxHp: state.hero.maxHp,
    gems: inv.gems,
    owned: KEPT_ITEMS.filter((item) => inv.owned.has(item)),
    keys: structuredClone(inv.keys),
    gateKey: inv.gateKey,
    equipped: inv.equipped,
    flags: [...state.flags].sort(),
    defeated: Object.fromEntries(state.defeated),
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

type RawSave = Record<string, unknown>;

// Each step brings a save from its version up to the next one. Steps work
// on raw, unchecked data (sanitizeSave checks the end result), and they're
// never edited once released: real saves in players' browsers depend on them.
const MIGRATIONS: Record<number, (save: RawSave) => RawSave> = {
  // Version 1 had a has<Item> boolean for each item, and one small key
  // count and big key for the whole game (Bramblekeep was the only
  // dungeon then). It also let you keep the big key and the Gate Key after
  // they'd opened their doors, so those only carry over if their door is
  // still shut.
  1: (save) => {
    const flags = Array.isArray(save.flags) ? save.flags : [];
    const unused = (key: unknown, door: string) => key === true && !flags.includes(door);
    return {
      ...save,
      version: 2,
      owned: Object.entries({ hasSword: "sword", hasSwitcheroo: "switcheroo", hasFlippers: "flippers" })
        .filter(([field]) => save[field] === true)
        .map(([, item]) => item),
      keys: {
        bramblekeep: { small: save.smallKeys, big: unused(save.hasBigKey, "door:bramblekeep:1,1:7,0") },
      },
      gateKey: unused(save.hasGateKey, "door:overworld:1,0:7,2"),
    };
  },
  // Version 2 only remembered beaten dungeon enemies, as flags like
  // "defeated:bramblekeep:1,2:0". Now every beaten enemy is remembered
  // with the frame it fell on, so some can come back after a while. When
  // those old ones fell isn't known, so they get 0, as long ago as can be.
  2: (save) => {
    const flags = Array.isArray(save.flags) ? save.flags : [];
    const beaten = (flag: unknown): flag is string => typeof flag === "string" && flag.startsWith("defeated:");
    return {
      ...save,
      version: 3,
      flags: flags.filter((flag) => !beaten(flag)),
      defeated: Object.fromEntries(flags.filter(beaten).map((flag) => [flag.slice("defeated:".length), 0])),
    };
  },
};

function migrate(save: RawSave): RawSave | null {
  while (save.version !== SAVE_VERSION) {
    const step = typeof save.version === "number" ? MIGRATIONS[save.version] : undefined;
    if (!step) return null;
    save = step(save);
  }
  return save;
}

function sanitizeKeys(raw: unknown): Record<Dungeon, DungeonKeys> {
  const keys = noKeys();
  if (!isRecord(raw)) return keys;
  for (const dungeon of DUNGEONS) {
    const found = raw[dungeon];
    if (isRecord(found)) keys[dungeon] = { small: clampInt(found.small, 0, 9, 0), big: found.big === true };
  }
  return keys;
}

// Anything that isn't a frame number is dropped.
function sanitizeDefeated(raw: unknown): Record<string, number> {
  const defeated: Record<string, number> = {};
  if (!isRecord(raw)) return defeated;
  for (const [key, fellAt] of Object.entries(raw)) {
    if (finiteNumber(fellAt) !== null) defeated[key] = clampInt(fellAt, 0, Number.MAX_SAFE_INTEGER, 0);
  }
  return defeated;
}

// Whatever's in a player's browser could be old, hand-edited, or junk.
// Old saves are migrated forward, then every field is checked and clamped.
// A save that can't be trusted to put you somewhere real comes back null,
// and the game starts fresh.
export function sanitizeSave(input: unknown): SaveData | null {
  const raw = isRecord(input) ? migrate(input) : null;
  if (!raw || !isRecord(raw.respawn)) return null;
  const { roomId, x, y, facing } = raw.respawn;
  if (typeof roomId !== "string" || !(roomId in ROOMS)) return null;
  const px = finiteNumber(x);
  const py = finiteNumber(y);
  if (px === null || py === null) return null;
  const { cols, rows } = roomSize(roomId);
  if (px < 0 || py < 0 || px > cols * TILE - HERO_SIZE || py > rows * TILE - HERO_SIZE) return null;

  // Heart containers come in whole hearts (two halves each).
  const maxHp = clampInt(raw.maxHp, HERO_START_HP, HP_CAP, HERO_START_HP);
  const owned = Array.isArray(raw.owned) ? raw.owned : [];
  return {
    version: SAVE_VERSION,
    respawn: {
      roomId,
      x: px,
      y: py,
      facing: DIRECTIONS.includes(facing as Direction) ? (facing as Direction) : "down",
    },
    maxHp: maxHp - (maxHp % 2),
    gems: clampInt(raw.gems, 0, 999, 0),
    // Kept in KEPT_ITEMS order, which also drops unknown names and repeats.
    owned: KEPT_ITEMS.filter((item) => owned.includes(item)),
    keys: sanitizeKeys(raw.keys),
    gateKey: raw.gateKey === true,
    // Whether it's actually owned is settled when the game loads.
    equipped: TOOLS.includes(raw.equipped as ToolId) ? (raw.equipped as ToolId) : null,
    flags: Array.isArray(raw.flags) ? raw.flags.filter((f): f is string => typeof f === "string") : [],
    defeated: sanitizeDefeated(raw.defeated),
    frames: clampInt(raw.frames, 0, Number.MAX_SAFE_INTEGER, 0),
    deaths: clampInt(raw.deaths, 0, 1_000_000, 0),
  };
}
