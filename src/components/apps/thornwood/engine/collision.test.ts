import { describe, expect, it } from "vitest";
import { cornerNudge, findFreeSpot, moveBox, overlaps, tileSpan } from "./collision";
import { TILE } from "./types";

// A 3x3 block of wall tiles at cols/rows 2..4, open floor everywhere else.
const solidBlock = (col: number, row: number) => col >= 2 && col <= 4 && row >= 2 && row <= 4;

describe("overlaps", () => {
  it("treats touching edges as not overlapping", () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 10, h: 10 })).toBe(true);
  });
});

describe("tileSpan", () => {
  it("doesn't count the next tile when a box is exactly flush with it", () => {
    expect(tileSpan({ x: 0, y: 0, w: TILE, h: TILE })).toEqual({ c0: 0, c1: 0, r0: 0, r1: 0 });
  });
});

describe("moveBox", () => {
  it("stops flush against a wall", () => {
    const box = { x: 10, y: 2.5 * TILE, w: 12, h: 12 };
    const { hitX } = moveBox(box, 30, 0, solidBlock);
    expect(hitX).toBe(true);
    expect(box.x + box.w).toBeLessThanOrEqual(2 * TILE);
    expect(box.x + box.w).toBeGreaterThan(2 * TILE - 1);
  });

  it("slides along a wall when moving diagonally into it", () => {
    const box = { x: 2 * TILE - 12, y: 3 * TILE, w: 12, h: 12 };
    const { hitX, hitY } = moveBox(box, 1, -1, solidBlock);
    expect(hitX).toBe(true);
    expect(hitY).toBe(false);
    expect(box.x).toBe(2 * TILE - 12);
    expect(box.y).toBe(3 * TILE - 1);
  });

  it("is blocked by blocker boxes, but not by one it's already inside", () => {
    const wall = { x: 50, y: 0, w: 10, h: 40 };
    const box = { x: 30, y: 10, w: 12, h: 12 };
    moveBox(box, 20, 0, () => false, [wall]);
    expect(box.x).toBe(38);

    const stuck = { x: 48, y: 10, w: 12, h: 12 };
    moveBox(stuck, 5, 0, () => false, [wall]);
    expect(stuck.x).toBe(53);
  });
});

describe("cornerNudge", () => {
  it("eases a box around a corner it's only barely clipping", () => {
    // Walking right into the block's top-left corner, clipping 3px of it.
    const box = { x: 2 * TILE - 12, y: 2 * TILE - 9, w: 12, h: 12 };
    expect(cornerNudge(box, "x", 1, 6, 1, solidBlock)).toBe(true);
    expect(box.y).toBe(2 * TILE - 10);
  });

  it("doesn't nudge when the wall is dead ahead", () => {
    const box = { x: 2 * TILE - 12, y: 3 * TILE, w: 12, h: 12 };
    expect(cornerNudge(box, "x", 1, 6, 1, solidBlock)).toBe(false);
  });
});

describe("findFreeSpot", () => {
  it("returns the box's own spot when it already fits", () => {
    expect(findFreeSpot({ x: 0, y: 0, w: 12, h: 12 }, solidBlock, 8)).toEqual({ x: 0, y: 0 });
  });

  it("finds the nearest spot outside a wall", () => {
    const spot = findFreeSpot({ x: 2 * TILE - 10, y: 0, w: 12, h: 12 }, solidBlock, 8);
    expect(spot).toEqual({ x: 2 * TILE - 10, y: 0 });
    const pushed = findFreeSpot({ x: 2 * TILE - 10, y: 2 * TILE - 6, w: 12, h: 12 }, solidBlock, 8);
    expect(pushed).not.toBeNull();
    expect(pushed!.y + 12 <= 2 * TILE || pushed!.x + 12 <= 2 * TILE).toBe(true);
  });
});
