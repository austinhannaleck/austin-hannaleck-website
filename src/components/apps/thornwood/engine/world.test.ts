import { describe, expect, it } from "vitest";
import { ENEMY_STATS } from "./actors";
import { blocksShotsAlways, isAlwaysSolid, isEventuallyPassable, isPit, isWarp, isWater, TILE_CHARS } from "./tiles";
import { DIRECTIONS, DUNGEONS, ROOM_COLS, ROOM_ROWS, type Direction } from "./types";
import { ROOMS, START_SPAWN, across, allRoomIds, cellsOf, directionStep, dungeonOf, roomSize, tileKey } from "./world";

// These tests check the hand-authored level data, not the engine: every
// map is the right shape, edges line up with their neighbors, every key
// points at the tile it describes, and the whole world can actually be
// reached from the start. A typo in a map string fails here, not
// mid-playthrough.

function tile(roomId: string, col: number, row: number): string {
  return ROOMS[roomId].map[row][col];
}

// Every tile along one edge of a room.
function edgeTiles(roomId: string, dir: Direction): { col: number; row: number }[] {
  const { cols, rows } = roomSize(roomId);
  const along = dir === "up" || dir === "down" ? cols : rows;
  return Array.from({ length: along }, (_, i) => {
    switch (dir) {
      case "up":
        return { col: i, row: 0 };
      case "down":
        return { col: i, row: rows - 1 };
      case "left":
        return { col: 0, row: i };
      case "right":
        return { col: cols - 1, row: i };
    }
  });
}

// Somewhere you could be: on foot, or swimming with the Flippers.
function crossable(ch: string): boolean {
  return isEventuallyPassable(ch) || isWater(ch);
}

describe("authored rooms", () => {
  it.each(allRoomIds())("%s is a whole number of 16x11 screens of known tiles", (roomId) => {
    const map = ROOMS[roomId].map;
    expect(map.length > 0 && map.length % ROOM_ROWS === 0, `${map.length} rows`).toBe(true);
    const cols = map[0].length;
    expect(cols > 0 && cols % ROOM_COLS === 0, `${cols} columns`).toBe(true);
    for (const row of map) {
      expect(row).toHaveLength(cols);
      for (const ch of row) expect(TILE_CHARS.has(ch), `unknown tile "${ch}" in ${roomId}`).toBe(true);
    }
  });

  it("never puts two rooms on the same screen", () => {
    const owners = new Map<string, string>();
    for (const roomId of allRoomIds()) {
      for (const cell of cellsOf(roomId)) {
        expect(owners.get(cell), `${cell} is in ${roomId} and ${owners.get(cell)}`).toBeUndefined();
        owners.set(cell, roomId);
      }
    }
  });

  it.each(allRoomIds())("%s's chests, signs, and warps sit on the right tiles", (roomId) => {
    const def = ROOMS[roomId];
    for (const key of Object.keys(def.chests ?? {})) {
      const [col, row] = key.split(",").map(Number);
      expect(tile(roomId, col, row), `chest at ${key}`).toBe("C");
    }
    for (const key of Object.keys(def.signs ?? {})) {
      const [col, row] = key.split(",").map(Number);
      expect(tile(roomId, col, row), `sign at ${key}`).toBe("s");
    }
    for (const key of Object.keys(def.examine ?? {})) {
      const [col, row] = key.split(",").map(Number);
      expect(isAlwaysSolid(tile(roomId, col, row)), `something to look at at ${key}`).toBe(true);
    }
    for (const key of Object.keys(def.sunken ?? {})) {
      const [col, row] = key.split(",").map(Number);
      expect(isWater(tile(roomId, col, row)), `sunken treasure at ${key}`).toBe(true);
    }
    for (const [key, warp] of Object.entries(def.warps ?? {})) {
      const [col, row] = key.split(",").map(Number);
      expect(isWarp(tile(roomId, col, row)), `warp at ${key}`).toBe(true);
      expect(warp.roomId in ROOMS).toBe(true);
      // The landing spot must be standable and not itself a warp, or
      // you'd bounce straight back.
      for (const c of [Math.floor(warp.col), Math.ceil(warp.col)]) {
        const landing = tile(warp.roomId, c, warp.row);
        expect(isEventuallyPassable(landing) && !isWarp(landing), `landing for ${roomId} ${key}`).toBe(true);
      }
    }
  });

  it.each(allRoomIds())("%s spawns everyone on ground they can occupy", (roomId) => {
    const def = ROOMS[roomId];
    const spots = [
      ...(def.enemies ?? []).map((e) => ({ ...e, flying: ENEMY_STATS[e.kind].flying })),
      ...(def.npcs ?? []).map((n) => ({ ...n, flying: false })),
      ...(def.props ?? []).map((p) => ({ ...p, flying: false })),
    ];
    for (const spot of spots) {
      for (const col of [Math.floor(spot.col), Math.ceil(spot.col)]) {
        const ch = tile(roomId, col, spot.row);
        const ok = isEventuallyPassable(ch) || (spot.flying && (isWater(ch) || isPit(ch)));
        expect(ok, `${spot.kind} at ${col},${spot.row} in ${roomId} stands on "${ch}"`).toBe(true);
      }
    }
  });

  it.each(allRoomIds())("%s's edges match its neighbors", (roomId) => {
    for (const dir of DIRECTIONS) {
      const { dx, dy } = directionStep(dir);
      for (const { col, row } of edgeTiles(roomId, dir)) {
        const ch = tile(roomId, col, row);
        const there = across(roomId, col + dx, row + dy);
        if (there) {
          // Swimmers cross edges too, so water has to meet water (or land).
          const theirs = tile(there.roomId, there.col, there.row);
          expect(crossable(ch), `${roomId} ${col},${row} (${dir}) vs ${there.roomId} ${there.col},${there.row}`).toBe(crossable(theirs));
        } else {
          // Open sea can run off the edge of the world (a swimmer just
          // can't go any further), but a path can't. A doorway on the
          // edge is fine: it whisks you away before you get there.
          expect(isEventuallyPassable(ch) && !isWarp(ch), `${roomId} has an opening to nowhere at ${col},${row}`).toBe(false);
        }
      }
    }
  });
});

describe("the whole world", () => {
  // A flood fill over every standable tile in every room, crossing room
  // edges, warps, and Switcheroo swaps (a swappable prop in a straight,
  // unobstructed line from a reachable tile can be reached). Assumes every
  // bush can be cut, every door opened, and every peg lowered, which is
  // exactly what the intended route makes possible. With `swim`, deep
  // water counts too (the Flippers).
  function reachableTiles(swim: boolean): Set<string> {
    const seen = new Set<string>();
    const queue: [string, number, number][] = [];
    const visit = (roomId: string, col: number, row: number) => {
      const key = `${roomId}|${col},${row}`;
      if (seen.has(key)) return;
      const ch = tile(roomId, col, row);
      if (!isEventuallyPassable(ch) && !(swim && isWater(ch))) return;
      seen.add(key);
      queue.push([roomId, col, row]);
    };
    visit(START_SPAWN.roomId, 7, 8);

    while (queue.length > 0) {
      const [roomId, col, row] = queue.shift()!;
      const def = ROOMS[roomId];
      for (const dir of DIRECTIONS) {
        const { dx, dy } = directionStep(dir);
        const c = col + dx;
        const r = row + dy;
        const { cols, rows } = roomSize(roomId);
        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          visit(roomId, c, r);
        } else {
          const there = across(roomId, c, r);
          if (there) visit(there.roomId, there.col, there.row);
        }
      }
      const warp = def.warps?.[tileKey(col, row)];
      if (warp) visit(warp.roomId, Math.floor(warp.col), warp.row);

      for (const prop of def.props ?? []) {
        const lined = prop.col === col || prop.row === row;
        if (!lined) continue;
        const steps = Math.abs(prop.col - col) + Math.abs(prop.row - row);
        const sx = Math.sign(prop.col - col);
        const sy = Math.sign(prop.row - row);
        let clear = true;
        for (let i = 1; i < steps; i++) {
          if (blocksShotsAlways(tile(roomId, col + sx * i, row + sy * i))) clear = false;
        }
        if (clear) visit(roomId, prop.col, prop.row);
      }
    }
    return seen;
  }

  // Everything in the main quest has to be reachable without the
  // Flippers, which aren't part of it (yet).
  const reachable = reachableTiles(false);
  const swimmable = reachableTiles(true);

  it.each(allRoomIds())("%s can be reached from the start", (roomId) => {
    expect([...reachable].some((key) => key.startsWith(`${roomId}|`))).toBe(true);
  });

  it.each(allRoomIds().flatMap((id) => Object.keys(ROOMS[id].chests ?? {}).map((key) => [id, key])))(
    "the chest in %s at %s can be opened",
    (roomId, key) => {
      const [col, row] = key.split(",").map(Number);
      const next = DIRECTIONS.some((dir) => {
        const { dx, dy } = directionStep(dir);
        return reachable.has(`${roomId}|${col + dx},${row + dy}`);
      });
      expect(next).toBe(true);
    },
  );

  it.each(allRoomIds().flatMap((id) => Object.keys(ROOMS[id].sunken ?? {}).map((key) => [id, key])))(
    "the sunken treasure in %s at %s can be dived for",
    (roomId, key) => {
      expect(swimmable.has(`${roomId}|${key}`)).toBe(true);
    },
  );
});

describe("keys and locked doors", () => {
  // Every key is used up by the door it opens, so a door without a key of
  // its own would leave you stuck.

  // Doors are a couple of tiles wide, so count each one by its top-left tile.
  function doorsIn(roomId: string, ch: string): number {
    const map = ROOMS[roomId].map;
    let doors = 0;
    map.forEach((line, row) => {
      for (let col = 0; col < line.length; col++) {
        if (line[col] === ch && line[col - 1] !== ch && map[row - 1]?.[col] !== ch) doors++;
      }
    });
    return doors;
  }

  // Every key in the world, chests and sunken treasure alike, by room.
  function keysIn(roomId: string, item: "smallKey" | "bigKey" | "gateKey"): number {
    const { chests = {}, sunken = {} } = ROOMS[roomId];
    const contents = [...Object.values(chests).map((chest) => chest.contents), ...Object.values(sunken)];
    return contents.filter((c) => c.item === item).length;
  }

  function total(roomIds: string[], count: (roomId: string) => number): number {
    return roomIds.reduce((sum, roomId) => sum + count(roomId), 0);
  }

  it("only puts small keys, big keys, and their doors inside a dungeon", () => {
    for (const roomId of allRoomIds().filter((id) => dungeonOf(id) === null)) {
      for (const ch of ["L", "B"]) expect(doorsIn(roomId, ch), `${ch} door in ${roomId}`).toBe(0);
      for (const item of ["smallKey", "bigKey"] as const) expect(keysIn(roomId, item), `${item} in ${roomId}`).toBe(0);
    }
  });

  it.each(DUNGEONS)("%s has a small key for every locked door, and one boss key for its one boss door", (dungeon) => {
    const rooms = allRoomIds().filter((id) => dungeonOf(id) === dungeon);
    expect(total(rooms, (id) => keysIn(id, "smallKey"))).toBeGreaterThanOrEqual(total(rooms, (id) => doorsIn(id, "L")));
    const bossDoors = total(rooms, (id) => doorsIn(id, "B"));
    expect(bossDoors).toBeLessThanOrEqual(1);
    expect(total(rooms, (id) => keysIn(id, "bigKey"))).toBe(bossDoors);
  });

  it("has one Gate Key for the one gate", () => {
    const rooms = allRoomIds();
    expect(total(rooms, (id) => doorsIn(id, "G"))).toBe(1);
    expect(total(rooms, (id) => keysIn(id, "gateKey"))).toBe(1);
  });
});
