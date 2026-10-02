import { BRAMBLEKEEP_ROOMS } from "./rooms/bramblekeep";
import { FERNWHISTLE_ROOMS } from "./rooms/fernwhistle";
import { HOLLOW_ROOMS } from "./rooms/hollow";
import { INTERIOR_ROOMS } from "./rooms/interiors";
import { OVERWORLD_ROOMS } from "./rooms/overworld";
import {
  DUNGEONS,
  HERO_SIZE,
  ROOM_COLS,
  ROOM_H,
  ROOM_ROWS,
  ROOM_W,
  TILE,
  type Area,
  type Direction,
  type Dungeon,
  type EnemyKind,
  type NpcKind,
  type PropKind,
  type Point,
  type Spawn,
} from "./types";

export type MusicTrack = "village" | "town" | "overworld" | "dungeon" | "danger" | "boss";

export type ChestContents =
  | { item: "sword" | "switcheroo" | "flippers" | "smallKey" | "bigKey" | "gateKey" | "heartContainer" | "letter" | "reply" | "ring" }
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
export type NpcSpawn = {
  kind: NpcKind;
  col: number;
  row: number;
  wanders?: boolean;
  // Someone you have to find (a runaway duckling, a child hiding). Once
  // found, they're back at `home` (which may be in another room) every
  // time you look, instead of here.
  tag?: string;
  home?: { roomId: string; col: number; row: number };
};
export type PropSpawn = { kind: PropKind; col: number; row: number };
export type WarpDef = { roomId: string; col: number; row: number; facing: Direction };

// Purely visual set dressing the engine never looks at beyond the "H"
// footprint tiles it stands on. Colors are hex.
export type HouseDecor = { kind: "house"; col: number; row: number; w: number; h: number; roof: number; wall: number };

export type Decor =
  | HouseDecor
  // A stone windmill, its sails turning in the breeze.
  | { kind: "windmill"; col: number; row: number }
  // A market stall under a striped awning.
  | { kind: "stall"; col: number; row: number; awning: number; goods: "fruit" | "fish" | "flowers" }
  // A stone fountain, four tiles wide, splashing away.
  | { kind: "fountain"; col: number; row: number };

// The tiles a piece of decor stands on.
export function decorFootprint(d: Decor): { w: number; h: number } {
  switch (d.kind) {
    case "house":
      return { w: d.w, h: d.h };
    case "windmill":
      return { w: 3, h: 2 };
    case "stall":
      return { w: 2, h: 1 };
    case "fountain":
      return { w: 4, h: 2 };
  }
}

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
  // Keyed by "col,row" of a piece of furniture: what you see when you look
  // at it. Each entry is a set of alternatives (one picked at random each
  // time), each a list of dialog pages.
  examine?: Record<string, string[][]>;
  // Keyed by "col,row" of a "~" tile: treasure sunk on the bottom, brought
  // up by diving there with the Flippers.
  sunken?: Record<string, ChestContents>;
  // Keyed by "col,row" of an "E"/"U" tile: stepping on it fades to the target.
  warps?: Record<string, WarpDef>;
  // Indoors: what the beds ("Z") say when you look at them, what's on the
  // shelves ("K"), and the wallpaper.
  bed?: string[];
  shelves?: "books" | "jars" | "bread" | "letters";
  wallpaper?: "cream" | "rose" | "sage" | "sky" | "gold";
  decor?: Decor[];
};

export const ROOMS: Record<string, RoomDef> = {
  ...OVERWORLD_ROOMS,
  ...FERNWHISTLE_ROOMS,
  ...INTERIOR_ROOMS,
  ...HOLLOW_ROOMS,
  ...BRAMBLEKEEP_ROOMS,
};

export function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}

// Room ids look like "overworld:1,1": an area, then grid coordinates.
// Each area is laid out on a grid of screens (16x11 tiles apiece). Most
// rooms are a single screen; a big one (a whole village) covers a block
// of them, its map a whole number of screens across and down, and its id
// names its top-left screen. A screen of the grid is a "cell", and cell
// ids look just like room ids.
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

// The dungeon a room is in, if it's in one with keys of its own.
export function dungeonOf(roomId: string): Dungeon | null {
  const area = areaOf(roomId);
  return DUNGEONS.find((dungeon) => dungeon === area) ?? null;
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

// A room's size in tiles.
export function roomSize(roomId: string): { cols: number; rows: number } {
  const map = ROOMS[roomId].map;
  return { cols: map[0].length, rows: map.length };
}

// Where a room's top-left corner sits in its area, in pixels.
export function roomOrigin(roomId: string): Point {
  const { gx, gy } = parseRoomId(roomId);
  return { x: gx * ROOM_W, y: gy * ROOM_H };
}

// The cells a room covers.
export function cellsOf(roomId: string): string[] {
  const { area, gx, gy } = parseRoomId(roomId);
  const { cols, rows } = roomSize(roomId);
  const cells: string[] = [];
  for (let y = 0; y < rows / ROOM_ROWS; y++) {
    for (let x = 0; x < cols / ROOM_COLS; x++) cells.push(roomIdOf(area, gx + x, gy + y));
  }
  return cells;
}

// The cell a spot in a room (in room pixels) falls in.
export function cellAt(roomId: string, x: number, y: number): string {
  const { area, gx, gy } = parseRoomId(roomId);
  const { cols, rows } = roomSize(roomId);
  const cx = Math.min(cols / ROOM_COLS - 1, Math.max(0, Math.floor(x / ROOM_W)));
  const cy = Math.min(rows / ROOM_ROWS - 1, Math.max(0, Math.floor(y / ROOM_H)));
  return roomIdOf(area, gx + cx, gy + cy);
}

// Which room covers each cell.
const CELL_OWNERS = new Map(Object.keys(ROOMS).flatMap((id) => cellsOf(id).map((cell) => [cell, id] as const)));

// Where stepping off a room's edge lands. (col, row) is a tile just past
// the edge, in this room's coordinates; the answer is the room on the
// other side and that same tile in its coordinates, or null if nothing's
// there.
export function across(roomId: string, col: number, row: number): { roomId: string; col: number; row: number } | null {
  const { area, gx, gy } = parseRoomId(roomId);
  const ac = gx * ROOM_COLS + col;
  const ar = gy * ROOM_ROWS + row;
  const owner = CELL_OWNERS.get(roomIdOf(area, Math.floor(ac / ROOM_COLS), Math.floor(ar / ROOM_ROWS)));
  if (!owner || owner === roomId) return null;
  const o = parseRoomId(owner);
  return { roomId: owner, col: ac - o.gx * ROOM_COLS, row: ar - o.gy * ROOM_ROWS };
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
