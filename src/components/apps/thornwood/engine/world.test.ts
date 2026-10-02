import { describe, expect, it } from "vitest";
import { ENEMY_STATS } from "./actors";
import { blocksShotsAlways, isEventuallyPassable, isPit, isWarp, isWater, TILE_CHARS } from "./tiles";
import { DIRECTIONS, ROOM_COLS, ROOM_ROWS, type Direction } from "./types";
import { ROOMS, START_SPAWN, allRoomIds, directionStep, neighborRoomId, tileKey } from "./world";

// These tests check the hand-authored level data, not the engine: every
// map is the right shape, edges line up with their neighbors, every key
// points at the tile it describes, and the whole world can actually be
// reached from the start. A typo in a map string fails here, not
// mid-playthrough.

function tile(roomId: string, col: number, row: number): string {
  return ROOMS[roomId].map[row][col];
}

function edgeTiles(roomId: string, dir: Direction): string[] {
  const map = ROOMS[roomId].map;
  switch (dir) {
    case "up":
      return [...map[0]];
    case "down":
      return [...map[ROOM_ROWS - 1]];
    case "left":
      return map.map((row) => row[0]);
    case "right":
      return map.map((row) => row[ROOM_COLS - 1]);
  }
}

const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };

describe("authored rooms", () => {
  it.each(allRoomIds())("%s is a 16x11 grid of known tiles", (roomId) => {
    const map = ROOMS[roomId].map;
    expect(map).toHaveLength(ROOM_ROWS);
    for (const row of map) {
      expect(row).toHaveLength(ROOM_COLS);
      for (const ch of row) expect(TILE_CHARS.has(ch), `unknown tile "${ch}" in ${roomId}`).toBe(true);
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
      const neighbor = neighborRoomId(roomId, dir);
      const mine = edgeTiles(roomId, dir).map(isEventuallyPassable);
      if (neighbor) {
        const theirs = edgeTiles(neighbor, OPPOSITE[dir]).map(isEventuallyPassable);
        expect(mine, `${roomId} ${dir} edge vs ${neighbor}`).toEqual(theirs);
      } else {
        expect(mine.some(Boolean), `${roomId} has an opening to nowhere on its ${dir} edge`).toBe(false);
      }
    }
  });
});

describe("the whole world", () => {
  // A flood fill over every standable tile in every room, crossing room
  // edges, warps, and Switcheroo swaps (a swappable prop in a straight,
  // unobstructed line from a reachable tile can be reached). Assumes every
  // bush can be cut, every door opened, and every peg lowered, which is
  // exactly what the intended route makes possible.
  function reachableTiles(): Set<string> {
    const seen = new Set<string>();
    const queue: [string, number, number][] = [];
    const visit = (roomId: string, col: number, row: number) => {
      const key = `${roomId}|${col},${row}`;
      if (seen.has(key)) return;
      if (!isEventuallyPassable(tile(roomId, col, row))) return;
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
        if (c >= 0 && c < ROOM_COLS && r >= 0 && r < ROOM_ROWS) {
          visit(roomId, c, r);
        } else {
          const neighbor = neighborRoomId(roomId, dir);
          if (neighbor) visit(neighbor, (c + ROOM_COLS) % ROOM_COLS, (r + ROOM_ROWS) % ROOM_ROWS);
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

  const reachable = reachableTiles();

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
});
