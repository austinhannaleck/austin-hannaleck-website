import { tileSpan } from "./collision";
import { rollDrop } from "./combat";
import { playSound, spawnBurst } from "./effects";
import { tileAt } from "./room";
import { TILE, type Box, type GameState } from "./types";

// Tiles that come apart when hit: bushes in the overworld, and clay pots in
// Thornback's lair. Both grow back when you leave and return to the room,
// so the pots are a supply you can count on for every attempt at the boss.

export function cutBush(state: GameState, col: number, row: number): void {
  state.tiles[row][col] = ".";
  const x = (col + 0.5) * TILE;
  const y = (row + 0.5) * TILE;
  playSound(state, "bushCut");
  spawnBurst(state, x, y, { count: 14, colors: [0x6fbf4a, 0x8fd65c, 0x4c9a3a], speed: 1.4, life: 34, size: 2.2, lift: 2.2 });
  rollDrop(state, x, y, "bush");
}

// Half of all pots hold a heart.
export function breakPot(state: GameState, col: number, row: number): void {
  state.tiles[row][col] = "_";
  const x = (col + 0.5) * TILE;
  const y = (row + 0.5) * TILE;
  playSound(state, "potBreak");
  spawnBurst(state, x, y, { count: 16, colors: [0xb8743c, 0x7a4422, 0xe8b070], speed: 1.6, life: 30, size: 2.4, lift: 2.4 });
  rollDrop(state, x, y, "pot");
}

// Smashes every pot a box overlaps (Thornback barreling through them).
export function breakPotsIn(state: GameState, box: Box): void {
  const { c0, c1, r0, r1 } = tileSpan(box);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (tileAt(state, col, row) === "p") breakPot(state, col, row);
    }
  }
}
