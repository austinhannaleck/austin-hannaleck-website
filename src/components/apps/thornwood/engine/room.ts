import { createDrop, createEnemy, createNpc, createProp, ENEMY_STATS } from "./actors";
import { centerOf, findFreeSpot, overlaps, tileSpan, type SolidAt } from "./collision";
import { playSound, spawnBurst } from "./effects";
import { CONDITIONAL_TILES, OPEN_CHEST, blocksShotsAlways, isAlwaysSolid, isPit, isWater, isWarp } from "./tiles";
import { ROOMS, across, areaOf, cellAt, cellsOf, tileKey, type NpcSpawn } from "./world";
import { ROOM_H, ROOM_W, TILE, type BossId, type Box, type GameState } from "./types";

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
  // A screen the hero has set foot in, which fills it in on the map. Its
  // id is a cell id (see world.ts), the same as the room's for a
  // one-screen room.
  seen: (cellId: string) => `seen:${cellId}`,
  // Treasure brought up from the bottom of a water tile.
  sunken: (roomId: string, col: number, row: number) => `sunken:${roomId}:${tileKey(col, row)}`,
  // Set while Bramblekeep's blue pegs are up (and the red ones down).
  bluePegs: "switch:bramblekeep",
  thornbackHeart: "drop:thornback-heart",
  sunstone: "drop:sunstone",
  nanaSword: "npc:nana-sword",
  banjoGift: "npc:banjo-gift",
  shopHeart: "shop:heart",
  // Someone you had to find: a runaway duckling, a child out of hiding.
  found: (tag: string) => `found:${tag}`,
  // Fernwhistle's side quests (see quests.ts). The letter, the reply, and
  // the ring are set while you're carrying them.
  ducklingsThanked: "quest:ducklings",
  letter: "quest:letter",
  reply: "quest:reply",
  mailDelivered: "quest:mail",
  seekPrize: "quest:seek",
  ring: "quest:ring",
  ringReturned: "quest:ring-returned",
};

export const THORNBACK_ROOM = "bramblekeep:1,0";

// Thornback crashing down shakes the whole forest, hard enough to knock
// the jammed Fernwhistle drawbridge loose.
export function drawbridgeDown(flagSet: Set<string>): boolean {
  return flagSet.has(flags.boss("thornback"));
}

// What a door leaves behind once it's open: dungeon floor, or (for the
// overworld gate) the path it stood on.
export function openedDoor(ch: string): string {
  return ch === "G" ? ":" : "_";
}

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
  for (let row = 0; row < tiles.length; row++) {
    for (let col = 0; col < tiles[row].length; col++) {
      const ch = tiles[row][col];
      if ((ch === "L" || ch === "B" || ch === "G") && flagSet.has(flags.door(roomId, col, row))) tiles[row][col] = openedDoor(ch);
      if (ch === "Y") tiles[row][col] = drawbridgeDown(flagSet) ? "=" : "v";
    }
  }
  return tiles;
}

export function loadRoom(state: GameState, roomId: string): void {
  const def = ROOMS[roomId];
  state.roomId = roomId;
  // A one-screen room is on the map from the moment you start into it.
  // A bigger one fills in screen by screen, as you walk (see noteSeen).
  if (cellsOf(roomId).length === 1) state.flags.add(flags.seen(roomId));
  state.tiles = initialTiles(roomId, state.flags);
  state.enemies = (def.enemies ?? [])
    .map((spawn, index) => ({ ...spawn, index }))
    .filter((spawn) => {
      const boss = ENEMY_STATS[spawn.kind].boss;
      if (boss) return !state.flags.has(flags.boss(boss));
      return !state.flags.has(flags.defeated(roomId, spawn.index));
    })
    .map((spawn) => createEnemy(state, spawn.kind, spawn.col, spawn.row, spawn.index));
  state.npcs = npcsIn(roomId, state.flags).map((spawn) => createNpc(state, spawn, roomId));
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

// Villagers you have to go and find, wherever they start out.
const SOUGHT = Object.values(ROOMS).flatMap((def) => (def.npcs ?? []).filter((n) => n.tag && n.home));

function isFound(spawn: NpcSpawn, flagSet: Set<string>): boolean {
  return spawn.tag !== undefined && flagSet.has(flags.found(spawn.tag));
}

// Who's in a room right now: its own villagers, minus any you've found
// (they've gone home), plus anyone found whose home is here.
export function npcsIn(roomId: string, flagSet: Set<string>): NpcSpawn[] {
  const here = (ROOMS[roomId].npcs ?? []).filter((n) => !(n.home && isFound(n, flagSet)));
  const home = SOUGHT.filter((n) => n.home!.roomId === roomId && isFound(n, flagSet)).map((n) => ({
    ...n,
    col: n.home!.col,
    row: n.home!.row,
    wanders: false,
  }));
  return [...here, ...home];
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
  if (row < 0 || row >= state.tiles.length || col < 0 || col >= state.tiles[row].length) return null;
  return state.tiles[row][col];
}

// The current room's size in pixels.
export function roomPixels(state: GameState): { w: number; h: number } {
  return { w: state.tiles[0].length * TILE, h: state.tiles.length * TILE };
}

// Marks the screen the hero is on as seen, for the map.
export function noteSeen(state: GameState): void {
  const c = centerOf(state.hero);
  state.flags.add(flags.seen(cellAt(state.roomId, c.x, c.y)));
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

// Walking off the room is only allowed where there's a room to scroll
// into. (Openings in the map's border are what actually let you get there.)
function exitOpen(state: GameState, col: number, row: number): boolean {
  const outX = col < 0 || col >= state.tiles[0].length;
  const outY = row < 0 || row >= state.tiles.length;
  if (outX && outY) return false;
  return across(state.roomId, col, row) !== null;
}

// Shutters, bars, and pegs that close while you're standing in them don't
// trap you: they stay passable for whoever is already on that tile.
export function heroSolidAt(state: GameState, from: Box = state.hero): SolidAt {
  const under = tileSpan(from);
  return (col, row) => {
    const ch = tileAt(state, col, row);
    if (ch === null) return !exitOpen(state, col, row);
    if (isAlwaysSolid(ch) || (isWater(ch) && !state.inventory.owned.has("flippers"))) return true;
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
const FLYER_SOLID = new Set(["#", "^", "T", "H", "f", "t", "L", "B", "G"]);

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
