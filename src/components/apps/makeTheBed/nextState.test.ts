import { describe, expect, it } from "vitest";
import { nextState, type Input } from "./useBedGame";
import { COLS, FALL_TICKS, PLATFORM_WIDTH, type GameState } from "./types";

const NO_INPUT: Input = { left: false, right: false };

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    platformCol: 3,
    facing: "right",
    fallingBed: { id: 0, col: 3, color: "#000000", fallProgress: 0 },
    stack: [],
    status: "playing",
    nextBedId: 1,
    ...overrides,
  };
}

describe("nextState", () => {
  it("does nothing when the game isn't playing", () => {
    const paused = makeState({ status: "paused" });
    expect(nextState(paused, NO_INPUT)).toBe(paused);
  });

  it("moves the platform left and clamps at the board edge", () => {
    const atEdge = makeState({ platformCol: 0 });
    expect(nextState(atEdge, { left: true, right: false }).platformCol).toBe(0);

    const oneIn = makeState({ platformCol: 1 });
    const next = nextState(oneIn, { left: true, right: false });
    expect(next.platformCol).toBe(0);
    expect(next.facing).toBe("left");
  });

  it("moves the platform right and clamps at the board edge", () => {
    const maxCol = COLS - PLATFORM_WIDTH;
    const atEdge = makeState({ platformCol: maxCol });
    expect(nextState(atEdge, { left: false, right: true }).platformCol).toBe(maxCol);

    const oneIn = makeState({ platformCol: maxCol - 1 });
    const next = nextState(oneIn, { left: false, right: true });
    expect(next.platformCol).toBe(maxCol);
    expect(next.facing).toBe("right");
  });

  it("advances fall progress without resolving until the bed reaches the platform's row", () => {
    const prev = makeState({ fallingBed: { id: 0, col: 3, color: "#000000", fallProgress: 0 } });
    const next = nextState(prev, NO_INPUT);
    expect(next.fallingBed.fallProgress).toBeCloseTo(1 / FALL_TICKS);
    expect(next.status).toBe("playing");
    expect(next.stack).toHaveLength(0);
  });

  it("catches a bed landing within the platform's width and spawns the next one", () => {
    const prev = makeState({
      platformCol: 3,
      fallingBed: { id: 0, col: 4, color: "#f97316", fallProgress: (FALL_TICKS - 1) / FALL_TICKS },
    });
    const next = nextState(prev, NO_INPUT);
    expect(next.status).toBe("playing");
    expect(next.stack).toEqual([{ col: 4, color: "#f97316" }]);
    expect(next.fallingBed.id).toBe(prev.nextBedId);
    expect(next.nextBedId).toBe(prev.nextBedId + 1);
  });

  it("ends the game when a bed lands outside the platform's width", () => {
    const prev = makeState({
      platformCol: 0,
      fallingBed: { id: 0, col: COLS - 1, color: "#f97316", fallProgress: (FALL_TICKS - 1) / FALL_TICKS },
    });
    const next = nextState(prev, NO_INPUT);
    expect(next.status).toBe("gameover");
    expect(next.stack).toHaveLength(0);
  });

  it("resolves catch/miss against this tick's just-moved platform position, not last tick's", () => {
    // The platform starts one column short of the falling bed but moves
    // into range on this very tick — same "resolve same-tick, not a tick
    // behind" rule useSnakeGame's magnet pull follows.
    const prev = makeState({
      platformCol: 1,
      fallingBed: { id: 0, col: 3, color: "#f97316", fallProgress: (FALL_TICKS - 1) / FALL_TICKS },
    });
    const next = nextState(prev, { left: false, right: true });
    expect(next.platformCol).toBe(2);
    expect(next.status).toBe("playing");
    expect(next.stack).toHaveLength(1);
  });
});
