import { centerOf } from "./collision";
import { playSound, spawnBurst } from "./effects";
import { grantChest } from "./interact";
import { flags, tileAt } from "./room";
import { isWater } from "./tiles";
import { ROOMS, tileKey } from "./world";
import { DIVE_COOLDOWN_FRAMES, DIVE_FRAMES, DIVE_REACH_FRAMES, SURFACE_GRACE_FRAMES, TILE, type GameState, type Hero } from "./types";

// The Flippers: deep water stops being a wall. Out in it the hero swims
// (slower, no sword, no tools), and the sword button dives instead. A
// diver is out of sight and out of reach of everything on the surface,
// and can come back up with whatever's sunk on the bottom.

// Underwater, nothing up top can see you: monsters lose track of you.
export function underwater(hero: Hero): boolean {
  return hero.dive > 0;
}

// Nor can anything touch you, not even for a moment after you come up.
export function outOfReach(hero: Hero): boolean {
  return hero.dive > 0 || hero.surfacing > 0;
}

const SPRAY = [0xdcf6ff, 0x7cc4f8, 0xffffff];

function waterUnderHero(state: GameState): { col: number; row: number } | null {
  const c = centerOf(state.hero);
  const col = Math.floor(c.x / TILE);
  const row = Math.floor(c.y / TILE);
  const ch = tileAt(state, col, row);
  return ch !== null && isWater(ch) ? { col, row } : null;
}

function splash(state: GameState, count: number): void {
  const c = centerOf(state.hero);
  spawnBurst(state, c.x, c.y + 2, { count, colors: SPRAY, speed: 1.1, life: 20, size: 1.4, lift: 1.4, gravity: 0.14, z: 1 });
}

// Run every step the hero is free to move: notices wading in and climbing
// out, and keeps a dive going.
export function updateSwimming(state: GameState): void {
  const hero = state.hero;
  const inWater = state.inventory.owned.has("flippers") && waterUnderHero(state) !== null;
  if (inWater && !hero.swimming) {
    hero.swimming = true;
    // No charging a spin attack while treading water.
    if (hero.action === "charge") hero.action = "none";
    playSound(state, "splash");
    splash(state, 10);
  } else if (!inWater && hero.swimming) {
    hero.swimming = false;
    if (hero.dive > 0) surface(state);
  }
  if (hero.diveCooldown > 0) hero.diveCooldown--;
  if (hero.surfacing > 0) hero.surfacing--;
  if (hero.dive > 0) updateDive(state);
}

export function startDive(state: GameState): void {
  const hero = state.hero;
  if (!hero.swimming || hero.dive > 0 || hero.diveCooldown > 0) return;
  hero.dive = DIVE_FRAMES;
  playSound(state, "dive");
  splash(state, 8);
}

function updateDive(state: GameState): void {
  const hero = state.hero;
  hero.dive--;
  if (state.frame % 9 === 0) {
    const c = centerOf(hero);
    spawnBurst(state, c.x, c.y, { count: 1, colors: [0xdcf6ff, 0xa8dcff], speed: 0.15, life: 24, size: 1.2, lift: 0.5, gravity: 0, z: 0 });
  }
  if (DIVE_FRAMES - hero.dive >= DIVE_REACH_FRAMES && grabSunkenTreasure(state)) return;
  if (hero.dive === 0) surface(state);
}

export function surface(state: GameState): void {
  const hero = state.hero;
  hero.dive = 0;
  hero.diveCooldown = DIVE_COOLDOWN_FRAMES;
  hero.surfacing = SURFACE_GRACE_FRAMES;
  playSound(state, "surface");
  splash(state, 6);
}

// Treasure sunk on a water tile (a room's `sunken` list), found by diving
// over it. Each piece can only be brought up once.
function grabSunkenTreasure(state: GameState): boolean {
  const spot = waterUnderHero(state);
  if (!spot) return false;
  const contents = ROOMS[state.roomId].sunken?.[tileKey(spot.col, spot.row)];
  const flag = flags.sunken(state.roomId, spot.col, spot.row);
  if (!contents || state.flags.has(flag)) return false;
  state.flags.add(flag);
  surface(state);
  playSound(state, "itemGet");
  grantChest(state, contents);
  return true;
}
