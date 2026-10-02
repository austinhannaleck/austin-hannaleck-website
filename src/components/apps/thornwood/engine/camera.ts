import { roomOrigin, roomSize } from "./world";
import { ROOM_H, ROOM_W, TILE, type Box, type Point } from "./types";

// The view onto the world is always one screen (ROOM_W x ROOM_H). In a
// one-screen room it never moves; in a bigger room it keeps the hero in
// the middle of the screen, stopping short of the room's edges so it
// never shows past them.

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// The view's top-left corner, in room pixels, with `focus` centered. Kept
// to whole pixels so the ground never shimmers between two.
export function cameraFor(roomId: string, focus: Box): Point {
  const { cols, rows } = roomSize(roomId);
  return {
    x: clamp(Math.round(focus.x + focus.w / 2 - ROOM_W / 2), 0, cols * TILE - ROOM_W),
    y: clamp(Math.round(focus.y + focus.h / 2 - ROOM_H / 2), 0, rows * TILE - ROOM_H),
  };
}

// The same, in area pixels, so views of two neighboring rooms can be
// compared (and slid between).
export function areaCameraFor(roomId: string, focus: Box): Point {
  const origin = roomOrigin(roomId);
  const local = cameraFor(roomId, focus);
  return { x: origin.x + local.x, y: origin.y + local.y };
}
