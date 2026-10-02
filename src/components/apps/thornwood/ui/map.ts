import { flags } from "../engine/room";
import { ROOM_COLS, ROOM_ROWS, TILE, type Area, type GameState, type Point } from "../engine/types";
import { ROOMS, allRoomIds, areaOf, cellsOf, parseRoomId, roomSize } from "../engine/world";
import type { Rect } from "./menu";

// The map screen: which areas you've found and where everything sits on
// the 256x208 screen. Pure data and layout, like menu.ts, so the renderer
// (drawing it) and the input hook (paging it, hit-testing taps) agree.
//
// A screen stays blank until the hero has set foot on it (the "seen" flag
// room.ts sets), and a whole area stays off the map until one of its
// rooms has been. A big room fills in a screen at a time.

// Houses don't get a map page of their own: inside one, you're on the
// overworld map, at its front door.
export type MapArea = Exclude<Area, "interior">;

export type MapView = {
  area: MapArea;
  // What closing the map goes back to.
  from: "playing" | "paused";
};

// The order the map pages through areas: the overworld, then the cave on
// the way, then the dungeon.
const AREA_ORDER: MapArea[] = ["overworld", "hollow", "bramblekeep"];

export const AREA_TITLES: Record<MapArea, string> = {
  overworld: "Thornwood",
  hollow: "The Hollow",
  bramblekeep: "Bramblekeep",
};

export function cellSeen(state: GameState, cellId: string): boolean {
  return state.flags.has(flags.seen(cellId));
}

export function roomSeen(state: GameState, roomId: string): boolean {
  return cellsOf(roomId).some((cell) => cellSeen(state, cell));
}

// Every screen in an area, explored or not.
export function areaCells(area: MapArea): string[] {
  return allRoomIds(area).flatMap(cellsOf);
}

export function knownAreas(state: GameState): MapArea[] {
  return AREA_ORDER.filter((area) => allRoomIds(area).some((id) => roomSeen(state, id)));
}

// Where the hero is, as far as the map is concerned: a room and a spot in
// it (in room pixels). Indoors, that's the house's front door, which is
// where its way out leads.
export function heroOnMap(state: GameState): { area: MapArea; roomId: string; at: Point } {
  const area = areaOf(state.roomId);
  if (area === "interior") {
    const out = Object.values(ROOMS[state.roomId].warps ?? {})[0];
    return { area: areaOf(out.roomId) as MapArea, roomId: out.roomId, at: { x: (out.col + 0.5) * TILE, y: out.row * TILE } };
  }
  const hero = state.hero;
  return { area, roomId: state.roomId, at: { x: hero.x + hero.w / 2, y: hero.y + hero.h / 2 } };
}

// The map always opens on wherever the hero is standing.
export function openMap(state: GameState, from: MapView["from"]): MapView {
  return { area: heroOnMap(state).area, from };
}

export function pageMap(view: MapView, state: GameState, delta: number): MapView {
  const areas = knownAreas(state);
  const i = areas.indexOf(view.area);
  if (i < 0 || areas.length < 2) return view;
  return { ...view, area: areas[(i + delta + areas.length) % areas.length] };
}

// The map is drawn inside this box at the largest whole number of screen
// pixels per tile that fits, capped so a two-room cave doesn't balloon.
// (It's just wide enough for the overworld's five screens across at three
// pixels a tile.)
export const MAP_BOX: Rect = { x: 8, y: 26, w: 240, h: 156 };
const MAX_SCALE = 6;

export type MapLayout = Rect & {
  // Screen pixels per tile.
  scale: number;
  // The area's top-left grid cell, which sits at (x, y).
  minGx: number;
  minGy: number;
};

export function mapLayout(area: MapArea): MapLayout {
  const cells = areaCells(area).map(parseRoomId);
  const minGx = Math.min(...cells.map((c) => c.gx));
  const minGy = Math.min(...cells.map((c) => c.gy));
  const tilesW = (Math.max(...cells.map((c) => c.gx)) - minGx + 1) * ROOM_COLS;
  const tilesH = (Math.max(...cells.map((c) => c.gy)) - minGy + 1) * ROOM_ROWS;
  const scale = Math.max(1, Math.min(MAX_SCALE, Math.floor(MAP_BOX.w / tilesW), Math.floor(MAP_BOX.h / tilesH)));
  const w = tilesW * scale;
  const h = tilesH * scale;
  return {
    scale,
    x: MAP_BOX.x + Math.floor((MAP_BOX.w - w) / 2),
    y: MAP_BOX.y + Math.floor((MAP_BOX.h - h) / 2),
    w,
    h,
    minGx,
    minGy,
  };
}

// Where a room (or a single cell, given its id) sits on the map.
export function roomRect(layout: MapLayout, roomId: string): Rect {
  const { gx, gy } = parseRoomId(roomId);
  const { cols, rows } = roomId in ROOMS ? roomSize(roomId) : { cols: ROOM_COLS, rows: ROOM_ROWS };
  return {
    x: layout.x + (gx - layout.minGx) * ROOM_COLS * layout.scale,
    y: layout.y + (gy - layout.minGy) * ROOM_ROWS * layout.scale,
    w: cols * layout.scale,
    h: rows * layout.scale,
  };
}

export function cellRect(layout: MapLayout, cellId: string): Rect {
  const { gx, gy } = parseRoomId(cellId);
  const w = ROOM_COLS * layout.scale;
  const h = ROOM_ROWS * layout.scale;
  return { x: layout.x + (gx - layout.minGx) * w, y: layout.y + (gy - layout.minGy) * h, w, h };
}

// Tap targets for paging between maps: the arrows either side of the
// title. A tap anywhere else closes the map.
export const MAP_ARROWS: { prev: Rect; next: Rect } = {
  prev: { x: 4, y: 2, w: 52, h: 22 },
  next: { x: 200, y: 2, w: 52, h: 22 },
};
