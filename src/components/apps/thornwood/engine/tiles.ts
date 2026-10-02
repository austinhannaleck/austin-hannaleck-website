// The tile legend. Rooms are authored as 16x11 grids of these characters
// (see rooms/), which keeps level design readable as plain text.
//
// Overworld:
//   .  grass          ,  flowers         :  dirt path       T  tree
//   b  bush (cut it)  o  boulder         ~  water           ^  cliff
//   E  cave mouth     s  sign            C  chest           H  house
//   f  fence
// Dungeon:
//   _  floor          #  wall            v  pit             t  torch
//   x  statue         U  stairs out      L  locked door     B  big key door
//   S  shutter door (shut while enemies remain)
//   P  pressure plate D  bars (open while a plate is held down)
//   Q  crystal switch r  red peg         u  blue peg
//   p  pot (break it with the sword for a heart)

export const TILE_CHARS = new Set([...".,:TboE~^sCHf_#vtxULBSPDQrup"]);

// Opened chests use "c". It never appears in authored maps; the engine
// swaps it in once a chest has been looted.
export const OPEN_CHEST = "c";

// Block anything that walks, no matter what.
const ALWAYS_SOLID = new Set(["T", "o", "^", "s", "C", "c", "H", "f", "#", "x", "t", "Q", "b", "p", "L", "B"]);

// Solid or not depending on room state (see room.ts).
export const CONDITIONAL_TILES = new Set(["S", "D", "r", "u"]);

export function isAlwaysSolid(ch: string): boolean {
  return ALWAYS_SOLID.has(ch);
}

export function isWater(ch: string): boolean {
  return ch === "~";
}

export function isPit(ch: string): boolean {
  return ch === "v";
}

export function isWarp(ch: string): boolean {
  return ch === "E" || ch === "U";
}

// Tiles tall enough to stop a flying projectile. Water, pits, plates, and
// lowered pegs/open bars let shots sail over.
const BLOCKS_SHOTS = new Set(["T", "o", "^", "s", "C", "c", "H", "f", "#", "x", "t", "b", "p", "L", "B", "Q"]);

export function blocksShotsAlways(ch: string): boolean {
  return BLOCKS_SHOTS.has(ch);
}

// Used only to validate authored maps: could the hero ever stand here,
// once bushes are cut, doors unlocked, and switches flipped?
export function isEventuallyPassable(ch: string): boolean {
  return (
    ch === "." ||
    ch === "," ||
    ch === ":" ||
    ch === "_" ||
    ch === "E" ||
    ch === "U" ||
    ch === "P" ||
    ch === "b" ||
    ch === "p" ||
    ch === "L" ||
    ch === "B" ||
    CONDITIONAL_TILES.has(ch)
  );
}
