import { createDrop, createEnemy, createNpc, createProp, ENEMY_STATS } from "./actors";
import { centerOf, findFreeSpot, overlaps, tileSpan, type SolidAt } from "./collision";
import { playSound, spawnBurst } from "./effects";
import { CONDITIONAL_TILES, OPEN_CHEST, blocksShotsAlways, isAlwaysSolid, isPit, isWater, isWarp } from "./tiles";
import { ROOMS, areaOf, neighborRoomId, tileKey } from "./world";
import { ROOM_COLS, ROOM_H, ROOM_ROWS, ROOM_W, TILE, type BossId, type Box, type GameState } from "./types";

// Loading rooms, and every rule about which tiles block what. Bushes
// regrow each time you come back to a room, and so do overworld enemies
// (the classic behavior). Anything permanent, like an opened chest, an
// unlocked door, or a defeated dungeon enemy, lives in `state.flags` and is
// re-applied on load.

export const flags = {
  chest: (roomId: string, col: number, row: number) => `chest:${roomId}:${tileKey(col, row)}`,
  door: (roomId: string, col: number, row: number) => `door:${roomId}:${tileKey(col, row)}`,
  boss: (boss: BossId) => `boss:${boss}`,
  // A dungeon enemy, by its spawn index in the room's enemy list.
  defeated: (roomId: string, spawn: number) => `defeated:${roomId}:${spawn}`,
  // Set while Bramblekeep's blue pegs are up (and the red ones down).
  bluePegs: "switch:bramblekeep",
  thornbackHeart: "drop:thornback-heart",
  sunstone: "drop:sunstone",
  nanaSword: "npc:nana-sword",
  banjoGift: "npc:banjo-gift",
  shopHeart: "shop:heart",
};

export const THORNBACK_ROOM = "bramblekeep:1,0";

function floorFor(roomId: string): string {
  return areaOf(roomId) === "overworld" ? "." : "_";
}

export function initialTiles(roomId: string, flagSet: Set<string>): string[][] {
  const def = ROOMS[roomId];
  const tiles = def.map.map((row) => [...row]);
  for (const [key, chest] of Object.entries(def.chests ?? {})) {
    const [col, row] = key.split(",").map(Number);
    if (flagSet.has(flags.chest(roomId, col, row))) tiles[row][col] = OPEN_CHEST;
    else if (chest.hidden) tiles[row][col] = floorFor(roomId);
  }
  for (let row = 0; row < ROOM_ROWS; row++) {
    for (let col = 0; col < ROOM_COLS; col++) {
      const ch = tiles[row][col];
      if ((ch === "L" || ch === "B") && flagSet.has(flags.door(roomId, col, row))) tiles[row][col] = "_";
    }
  }
  return tiles;
}

export function loadRoom(state: GameState, roomId: string): void {
  const def = ROOMS[roomId];
  state.roomId = roomId;
  state.tiles = initialTiles(roomId, state.flags);
  state.enemies = (def.enemies ?? [])
    .map((spawn, index) => ({ ...spawn, index }))
    .filter((spawn) => {
      const boss = ENEMY_STATS[spawn.kind].boss;
      if (boss) return !state.flags.has(flags.boss(boss));
      return !state.flags.has(flags.defeated(roomId, spawn.index));
    })
    .map((spawn) => createEnemy(state, spawn.kind, spawn.col, spawn.row, spawn.index));
  state.npcs = (def.npcs ?? []).map((spawn) => createNpc(state, spawn.kind, spawn.col, spawn.row, spawn.wanders ?? false));
  state.props = (def.props ?? []).map((spawn) => createProp(state, spawn.kind, spawn.col, spawn.row));
  state.drops = [];
  state.projectiles = [];
  state.hazards = [];
  state.particles = [];
  state.shutterArmed = false;
  state.shuttersClosed = false;
  state.roomCleared = state.enemies.length === 0;
  if (state.roomCleared) revealHiddenChests(state, false);

  // Thornback's spoils wait for you even if you leave without them.
  if (roomId === THORNBACK_ROOM && state.flags.has(flags.boss("thornback"))) {
    spawnThornbackSpoils(state, ROOM_W / 2, ROOM_H / 2 + TILE);
  }
}

export function spawnThornbackSpoils(state: GameState, bossX: number, bossY: number): void {
  if (!state.flags.has(flags.thornbackHeart)) {
    state.drops.push(createDrop(state, "heartContainer", bossX, bossY, flags.thornbackHeart));
  }
  if (!state.flags.has(flags.sunstone)) {
    state.drops.push(createDrop(state, "sunstone", ROOM_W / 2, ROOM_H / 2 - TILE, flags.sunstone));
  }
}

// In dungeons, what you defeat stays defeated; out in the overworld,
// monsters come back whenever you return.
export function enemiesStayDefeated(roomId: string): boolean {
  return areaOf(roomId) !== "overworld";
}

export function revealHiddenChests(state: GameState, announce: boolean): void {
  const def = ROOMS[state.roomId];
  for (const [key, chest] of Object.entries(def.chests ?? {})) {
    if (!chest.hidden) continue;
    const [col, row] = key.split(",").map(Number);
    if (state.tiles[row][col] === "C" || state.tiles[row][col] === OPEN_CHEST) continue;
    state.tiles[row][col] = "C";
    nudgeHeroOffTile(state, col, row);
    if (announce) {
      playSound(state, "chestAppear");
      spawnBurst(state, (col + 0.5) * TILE, (row + 0.5) * TILE, {
        count: 24,
        colors: [0xfff3a0, 0xffffff, 0xffd166],
        speed: 1.6,
        life: 40,
        size: 2,
        lift: 2.5,
        gravity: 0.05,
      });
    }
  }
}

// A chest that pops into existence right where the hero is standing would
// otherwise trap them for good (every step out still overlaps something
// solid), so they get bumped to the nearest open spot instead.
function nudgeHeroOffTile(state: GameState, col: number, row: number): void {
  const hero = state.hero;
  if (!overlaps(hero, { x: col * TILE, y: row * TILE, w: TILE, h: TILE })) return;
  const spot = findFreeSpot(hero, heroSolidAt(state, hero), TILE + hero.w);
  if (!spot) return;
  hero.x = spot.x;
  hero.y = spot.y;
}

export function tileAt(state: GameState, col: number, row: number): string | null {
  if (col < 0 || col >= ROOM_COLS || row < 0 || row >= ROOM_ROWS) return null;
  return state.tiles[row][col];
}

export function roomHasTile(state: GameState, ch: string): boolean {
  return state.tiles.some((row) => row.includes(ch));
}

export function pegRaised(state: GameState, ch: string): boolean {
  const blueUp = state.flags.has(flags.bluePegs);
  return ch === "u" ? blueUp : !blueUp;
}

function conditionalSolid(state: GameState, ch: string): boolean {
  switch (ch) {
    case "S":
      return state.shuttersClosed;
    case "D":
      return !state.barsOpen;
    case "r":
    case "u":
      return pegRaised(state, ch);
    default:
      return false;
  }
}

// Walking off the screen is only allowed where there's a room to scroll
// into. (Openings in the map's border are what actually let you get there.)
function exitOpen(state: GameState, col: number, row: number): boolean {
  const outX = col < 0 || col >= ROOM_COLS;
  const outY = row < 0 || row >= ROOM_ROWS;
  if (outX && outY) return false;
  if (col < 0) return neighborRoomId(state.roomId, "left") !== null;
  if (col >= ROOM_COLS) return neighborRoomId(state.roomId, "right") !== null;
  if (row < 0) return neighborRoomId(state.roomId, "up") !== null;
  return neighborRoomId(state.roomId, "down") !== null;
}

// Shutters, bars, and pegs that close while you're standing in them don't
// trap you: they stay passable for whoever is already on that tile.
export function heroSolidAt(state: GameState, from: Box = state.hero): SolidAt {
  const under = tileSpan(from);
  return (col, row) => {
    const ch = tileAt(state, col, row);
    if (ch === null) return !exitOpen(state, col, row);
    if (isAlwaysSolid(ch) || isWater(ch)) return true;
    if (CONDITIONAL_TILES.has(ch)) {
      const standingOn = col >= under.c0 && col <= under.c1 && row >= under.r0 && row <= under.r1;
      return !standingOn && conditionalSolid(state, ch);
    }
    return false;
  };
}

export function walkerSolidAt(state: GameState): SolidAt {
  return (col, row) => {
    const ch = tileAt(state, col, row);
    if (ch === null) return true;
    return isAlwaysSolid(ch) || isWater(ch) || isPit(ch) || isWarp(ch) || conditionalSolid(state, ch);
  };
}

// Flyers cross water, pits, bushes, and boulders, but not anything tall.
const FLYER_SOLID = new Set(["#", "^", "T", "H", "f", "t", "L", "B"]);

export function flyerSolidAt(state: GameState): SolidAt {
  return (col, row) => {
    const ch = tileAt(state, col, row);
    if (ch === null) return true;
    return FLYER_SOLID.has(ch) || (ch === "S" && state.shuttersClosed);
  };
}

export function blocksShotAt(state: GameState, col: number, row: number): boolean {
  const ch = tileAt(state, col, row);
  if (ch === null) return true;
  return blocksShotsAlways(ch) || conditionalSolid(state, ch);
}

// Props and NPCs are solid to the hero and to walking enemies.
export function blockers(state: GameState): Box[] {
  return [...state.props, ...state.npcs];
}

function heroOverlapsTile(state: GameState, ch: string): boolean {
  const { c0, c1, r0, r1 } = tileSpan(state.hero);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (tileAt(state, col, row) === ch) return true;
    }
  }
  return false;
}

function platesPressed(state: GameState): boolean {
  const hero = centerOf(state.hero);
  const weights = [
    ...(state.hero.action === "fall" ? [] : [hero]),
    ...state.props.filter((p) => p.kind === "statue").map(centerOf),
  ];
  return weights.some((w) => tileAt(state, Math.floor(w.x / TILE), Math.floor(w.y / TILE)) === "P");
}

function livingEnemies(state: GameState): number {
  return state.enemies.filter((e) => e.mode !== "dying").length;
}

// Recomputes shutters, bars, and room-clear state from scratch each step,
// announcing any change with a sound. `quiet` is for the moment a room is
// entered, when the starting state shouldn't make a noise.
export function updateMechanisms(state: GameState, quiet = false): void {
  if (!state.shutterArmed && !heroOverlapsTile(state, "S")) state.shutterArmed = true;
  const shut = state.shutterArmed && livingEnemies(state) > 0;
  if (shut !== state.shuttersClosed) {
    state.shuttersClosed = shut;
    if (!quiet && roomHasTile(state, "S")) playSound(state, shut ? "shutterClose" : "shutterOpen");
  }

  const pressed = platesPressed(state);
  if (pressed !== state.barsOpen) {
    state.barsOpen = pressed;
    if (!quiet && roomHasTile(state, "D")) playSound(state, "bars");
  }

  if (!state.roomCleared && state.enemies.length === 0) {
    state.roomCleared = true;
    revealHiddenChests(state, !quiet);
  }
}
