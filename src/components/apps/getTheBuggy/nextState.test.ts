import { describe, expect, it } from "vitest";
import { nextState } from "./useSnakeGame";
import { GRID_SIZE, type GameState } from "./types";

// A minimal, otherwise-idle GameState, overridden per test. Bug is placed
// far from Banjo by default so accidental catches don't leak between tests.
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    banjo: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    direction: "right",
    pendingDirection: null,
    bug: { x: 0, y: 0 },
    pickup: null,
    score: 0,
    status: "playing",
    activePowerup: null,
    powerupPickupCount: 0,
    lastPickupType: null,
    ...overrides,
  };
}

describe("nextState", () => {
  it("does nothing when the game isn't playing", () => {
    const paused = makeState({ status: "paused" });
    expect(nextState(paused)).toBe(paused);
  });

  it("moves the head one cell and drops the tail when nothing is eaten", () => {
    const prev = makeState();
    const next = nextState(prev);
    expect(next.banjo[0]).toEqual({ x: 6, y: 5 });
    expect(next.banjo).toHaveLength(prev.banjo.length);
    expect(next.score).toBe(0);
    expect(next.status).toBe("playing");
  });

  it("ends the game on running into a wall", () => {
    const prev = makeState({
      banjo: [{ x: GRID_SIZE - 1, y: 5 }, { x: GRID_SIZE - 2, y: 5 }],
      direction: "right",
    });
    expect(nextState(prev).status).toBe("gameover");
  });

  it("wraps through a wall instead of dying while broccoli's invincibility is active", () => {
    const prev = makeState({
      banjo: [{ x: GRID_SIZE - 1, y: 5 }, { x: GRID_SIZE - 2, y: 5 }],
      direction: "right",
      activePowerup: { type: "broccoli", ticksRemaining: 5 },
    });
    const next = nextState(prev);
    expect(next.status).toBe("playing");
    expect(next.banjo[0]).toEqual({ x: 0, y: 5 });
  });

  it("ends the game on running into its own tail", () => {
    // A body doubled back on itself: moving right runs the head straight
    // into the segment at (6, 5).
    const prev = makeState({
      banjo: [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 6, y: 6 },
        { x: 5, y: 6 },
      ],
      direction: "right",
    });
    expect(nextState(prev).status).toBe("gameover");
  });

  it("passes through its own tail while broccoli's invincibility is active", () => {
    const prev = makeState({
      banjo: [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 6, y: 6 },
        { x: 5, y: 6 },
      ],
      direction: "right",
      activePowerup: { type: "broccoli", ticksRemaining: 5 },
    });
    expect(nextState(prev).status).toBe("playing");
  });

  it("grows and scores on catching the bug directly", () => {
    const prev = makeState({
      banjo: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
      direction: "right",
      bug: { x: 6, y: 5 },
    });
    const next = nextState(prev);
    expect(next.score).toBe(1);
    expect(next.banjo).toHaveLength(prev.banjo.length + 1);
  });

  it("resolves a magnet catch the same tick the pull lands on the head, not a tick behind", () => {
    // Bug starts 2 cells ahead of where the head is about to move — exactly
    // MAGNET_PULL_SPEED, so the pull lands it on the head this same tick.
    // Regression coverage for the bug described in useSnakeGame.ts's
    // comment above pulledBug: checking against prev.bug (a tick-old
    // position) instead would have let the two advance in lockstep forever
    // without ever registering a catch.
    const prev = makeState({
      banjo: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
      direction: "right",
      bug: { x: 8, y: 5 },
      activePowerup: { type: "magnet", ticksRemaining: 5 },
    });
    const next = nextState(prev);
    expect(next.score).toBe(1);
    expect(next.banjo).toHaveLength(prev.banjo.length + 1);
  });

  it("shrinks on eating a mushroom, floored at the minimum length", () => {
    const prev = makeState({
      banjo: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
        { x: 2, y: 5 },
        { x: 1, y: 5 },
        { x: 0, y: 5 },
      ],
      direction: "right",
      pickup: { type: "mushroom", position: { x: 6, y: 5 }, ticksRemaining: null },
    });
    const next = nextState(prev);
    // Moving without growth alone would keep length 6; the mushroom's own
    // shrink (MUSHROOM_SHRINK_SEGMENTS) takes 3 more off on top of that.
    expect(next.banjo).toHaveLength(3);
    expect(next.pickup).toBeNull();
  });
});
