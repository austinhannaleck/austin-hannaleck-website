import { BRAMBLEKEEP_ROOMS } from "./rooms/bramblekeep";
import { OVERWORLD_ROOMS } from "./rooms/overworld";
import {
  HERO_SIZE,
  TILE,
  type Area,
  type Direction,
  type EnemyKind,
  type NpcKind,
  type PropKind,
  type Spawn,
} from "./types";

export type MusicTrack = "village" | "overworld" | "dungeon" | "boss";

export type ChestContents =
  | { item: "sword" | "switcheroo" | "smallKey" | "bigKey" | "heartContainer" }
  | { item: "gems"; amount: number };

export type ChestDef = {
  contents: ChestContents;
  // Big chests hold the dungeon's treasures (its tool, the big key).
  big?: boolean;
  // Hidden chests only appear once every enemy in the room is beaten.
  hidden?: boolean;
};

// Spawn coordinates are in tiles and may be fractional (7.5 centers
// something between columns 7 and 8).
export type EnemySpawn = { kind: EnemyKind; col: number; row: number };
export type NpcSpawn = { kind: NpcKind; col: number; row: number; wanders?: boolean };
export type PropSpawn = { kind: PropKind; col: number; row: number };
export type WarpDef = { roomId: string; col: number; row: number; facing: Direction };

// Purely visual set dressing the engine never looks at beyond its "H"
// footprint tiles. Colors are hex.
export type HouseDecor = { kind: "house"; col: number; row: number; w: number; h: number; roof: number; wall: number };

export type RoomDef = {
  name: string;
  music: MusicTrack;
  map: string[];
  enemies?: EnemySpawn[];
  // Keyed by "col,row" of the chest's "C" tile.
  chests?: Record<string, ChestDef>;
  // Keyed by "col,row" of the sign's "s" tile; one string per dialog page.
  signs?: Record<string, string[]>;
  npcs?: NpcSpawn[];
  props?: PropSpawn[];
  // Keyed by "col,row" of an "E"/"U" tile: stepping on it fades to the target.
  warps?: Record<string, WarpDef>;
  decor?: HouseDecor[];
};

export const ROOMS: Record<string, RoomDef> = { ...OVERWORLD_ROOMS, ...BRAMBLEKEEP_ROOMS };

export function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}

// Room ids look like "overworld:1,1": an area, then grid coordinates.
export function roomIdOf(area: Area, gx: number, gy: number): string {
  return `${area}:${gx},${gy}`;
}

export function parseRoomId(roomId: string): { area: Area; gx: number; gy: number } {
  const [area, coords] = roomId.split(":");
  const [gx, gy] = coords.split(",").map(Number);
  return { area: area as Area, gx, gy };
}

export function areaOf(roomId: string): Area {
  return parseRoomId(roomId).area;
}

const STEP: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function directionStep(dir: Direction): { dx: number; dy: number } {
  return STEP[dir];
}

// The room you'd scroll into by walking off this one's `dir` edge, if any.
export function neighborRoomId(roomId: string, dir: Direction): string | null {
  const { area, gx, gy } = parseRoomId(roomId);
  const { dx, dy } = STEP[dir];
  const id = roomIdOf(area, gx + dx, gy + dy);
  return id in ROOMS ? id : null;
}

export function allRoomIds(area?: Area): string[] {
  return Object.keys(ROOMS).filter((id) => !area || areaOf(id) === area);
}

// Top-left pixel position for a box of the given size centered on a tile.
export function boxAtTile(col: number, row: number, w: number, h: number): { x: number; y: number } {
  return { x: (col + 0.5) * TILE - w / 2, y: (row + 0.5) * TILE - h / 2 };
}

export function spawnAtTile(roomId: string, col: number, row: number, facing: Direction): Spawn {
  return { roomId, ...boxAtTile(col, row, HERO_SIZE, HERO_SIZE), facing };
}

export const START_SPAWN: Spawn = spawnAtTile("overworld:1,1", 7.5, 8, "up");
