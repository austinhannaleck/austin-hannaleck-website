import { useCallback, useEffect, useRef, useState } from "react";
import {
  BED_COLORS,
  COLS,
  FALL_TICKS,
  PLATFORM_WIDTH,
  tickIntervalForScore,
  type Direction,
  type FallingBed,
  type GameState,
} from "./types";
import { playCatchSound, playGameOverSound, playStartSound } from "./sounds";

function spawnBed(id: number): FallingBed {
  return {
    id,
    col: Math.floor(Math.random() * COLS),
    color: BED_COLORS[Math.floor(Math.random() * BED_COLORS.length)],
    fallProgress: 0,
  };
}

function createInitialState(): GameState {
  return {
    platformCol: Math.floor((COLS - PLATFORM_WIDTH) / 2),
    facing: "right",
    fallingBed: spawnBed(0),
    stack: [],
    status: "paused",
    nextBedId: 1,
  };
}

type Input = { left: boolean; right: boolean };

// One functional update per tick: platform movement, the bed's fall
// progress, and catch/miss resolution are all resolved together here so
// a tick never produces more than one setState.
function nextState(prev: GameState, input: Input): GameState {
  if (prev.status !== "playing") return prev;

  let platformCol = prev.platformCol;
  let facing = prev.facing;
  if (input.left && !input.right) {
    platformCol = Math.max(0, prev.platformCol - 1);
    facing = "left";
  } else if (input.right && !input.left) {
    platformCol = Math.min(COLS - PLATFORM_WIDTH, prev.platformCol + 1);
    facing = "right";
  }

  const fallProgress = prev.fallingBed.fallProgress + 1 / FALL_TICKS;
  if (fallProgress < 1) {
    return { ...prev, platformCol, facing, fallingBed: { ...prev.fallingBed, fallProgress } };
  }

  // The bed has reached the platform's row this tick — resolve catch or
  // miss against the platform's just-moved position, the same way Get
  // the Buggy checks the same-tick head position rather than last tick's.
  const caught = prev.fallingBed.col >= platformCol && prev.fallingBed.col <= platformCol + PLATFORM_WIDTH - 1;
  if (!caught) {
    return { ...prev, platformCol, facing, status: "gameover" };
  }

  return {
    platformCol,
    facing,
    fallingBed: spawnBed(prev.nextBedId),
    stack: [...prev.stack, { col: prev.fallingBed.col, color: prev.fallingBed.color }],
    status: "playing",
    nextBedId: prev.nextBedId + 1,
  };
}

export function useBedGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);

  // Movement is held-key based (Pong-style), not a queued single move
  // per tick like Get the Buggy's direction — refs so the tick callback
  // always reads the latest pressed state without retriggering effects.
  const leftRef = useRef(false);
  const rightRef = useRef(false);

  const tick = useCallback(() => {
    setGameState((prev) => nextState(prev, { left: leftRef.current, right: rightRef.current }));
  }, []);

  const score = gameState.stack.length;
  const tickIntervalMs = tickIntervalForScore(score);

  useEffect(() => {
    if (gameState.status !== "playing") return;
    const id = setInterval(tick, tickIntervalMs);
    return () => clearInterval(id);
  }, [tick, tickIntervalMs, gameState.status]);

  const togglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev.status === "playing") return { ...prev, status: "paused" };
      if (prev.status === "paused") return { ...prev, status: "playing" };
      return prev;
    });
  }, []);

  // Same "arrow key both moves and starts the run" UX as Get the Buggy's
  // setDirection — pressing left/right while paused kicks off play.
  const beginPlaying = useCallback(() => {
    setGameState((prev) => (prev.status === "paused" ? { ...prev, status: "playing" } : prev));
  }, []);

  const hasStartedRef = useRef(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Bumped on every restart so the UI can remount the board and snap
  // the platform back to center instantly, instead of sliding there.
  const [restartKey, setRestartKey] = useState(0);

  const restart = useCallback(() => {
    hasStartedRef.current = false;
    setHasStarted(false);
    leftRef.current = false;
    rightRef.current = false;
    setRestartKey((k) => k + 1);
    setGameState(createInitialState());
  }, []);

  useEffect(() => {
    if (gameState.status === "playing" && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setHasStarted(true);
      playStartSound();
    }
  }, [gameState.status]);

  const prevScoreRef = useRef(score);
  useEffect(() => {
    if (score > prevScoreRef.current) playCatchSound();
    prevScoreRef.current = score;
  }, [score]);

  const prevStatusRef = useRef(gameState.status);
  useEffect(() => {
    if (gameState.status === "gameover" && prevStatusRef.current !== "gameover") playGameOverSound();
    prevStatusRef.current = gameState.status;
  }, [gameState.status]);

  useEffect(() => {
    const KEY_TO_DIRECTION: Record<string, Direction> = {
      arrowleft: "left",
      arrowright: "right",
      a: "left",
      d: "right",
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const direction = KEY_TO_DIRECTION[e.key.toLowerCase()];
      if (direction) {
        e.preventDefault();
        if (direction === "left") leftRef.current = true;
        else rightRef.current = true;
        beginPlaying();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        togglePause();
        return;
      }
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        restart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const direction = KEY_TO_DIRECTION[e.key.toLowerCase()];
      if (direction === "left") leftRef.current = false;
      else if (direction === "right") rightRef.current = false;
    };

    // A key held down while the tab loses focus never fires keyup, which
    // would otherwise leave the platform drifting on its own once focus
    // returns — clear both on blur as a safety net.
    const handleBlur = () => {
      leftRef.current = false;
      rightRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [beginPlaying, togglePause, restart]);

  return { gameState, togglePause, restart, tickIntervalMs, restartKey, hasStarted };
}
