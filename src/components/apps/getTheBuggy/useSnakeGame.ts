import { useCallback, useEffect, useRef, useState } from "react";
import {
  CARROT_DURATION_MS,
  GOLDEN_BUG_BONUS_SCORE,
  GOLDEN_BUG_LIFESPAN_MS,
  GRID_SIZE,
  MAGNET_DURATION_MS,
  MAGNET_PULL_RADIUS,
  MINT_DURATION_MS,
  MUSHROOM_MIN_LENGTH,
  MUSHROOM_SHRINK_SEGMENTS,
  PICKUP_SPAWN_CHANCE,
  PICKUP_TYPES,
  POWERUP_DURATION_MS,
  POWERUP_WRAP_BUFFER_MS,
  isOpposite,
  tickIntervalForScore,
  tickIntervalForState,
  type ActivePowerup,
  type BoardPickup,
  type Direction,
  type GameState,
  type PickupType,
  type Point,
  type PowerupType,
} from "./types";
import {
  playBarkSound,
  playEatSound,
  playGameOverSound,
  playGoldenBugPickupSound,
  playMushroomPickupSound,
  playPowerupMusic,
  playPowerupPickupSound,
} from "./sounds";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

function isTimedPowerupType(type: PickupType | null): type is PowerupType {
  return type === "broccoli" || type === "carrot" || type === "mint" || type === "magnet";
}

function movePoint(p: Point, direction: Direction): Point {
  switch (direction) {
    case "up":
      return { x: p.x, y: p.y - 1 };
    case "down":
      return { x: p.x, y: p.y + 1 };
    case "left":
      return { x: p.x - 1, y: p.y };
    case "right":
      return { x: p.x + 1, y: p.y };
  }
}

function randomEmptyCell(occupied: Point[]): Point {
  let candidate: Point;
  do {
    candidate = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (occupied.some((p) => p.x === candidate.x && p.y === candidate.y));
  return candidate;
}

// Like randomEmptyCell, but biased toward a handful of candidates near
// `origin` first (magnet's "bugs drawn toward Banjo" effect) — falls
// back to a fully random cell if the nearby area is too crowded to find
// one within a reasonable number of tries.
function randomEmptyCellNear(occupied: Point[], origin: Point, radius: number): Point {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate: Point = {
      x: Math.min(GRID_SIZE - 1, Math.max(0, origin.x + Math.floor(Math.random() * (radius * 2 + 1)) - radius)),
      y: Math.min(GRID_SIZE - 1, Math.max(0, origin.y + Math.floor(Math.random() * (radius * 2 + 1)) - radius)),
    };
    if (!occupied.some((p) => p.x === candidate.x && p.y === candidate.y)) return candidate;
  }
  return randomEmptyCell(occupied);
}

function createInitialState(): GameState {
  const startY = Math.floor(GRID_SIZE / 2);
  const startX = Math.floor(GRID_SIZE / 3);
  const banjo: Point[] = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  return {
    banjo,
    direction: "right",
    pendingDirection: null,
    bug: randomEmptyCell(banjo),
    pickup: null,
    score: 0,
    status: "paused",
    activePowerup: null,
    powerupPickupCount: 0,
    lastPickupType: null,
  };
}

function powerupDurationMs(type: PowerupType): number {
  switch (type) {
    case "broccoli":
      return POWERUP_DURATION_MS;
    case "carrot":
      return CARROT_DURATION_MS;
    case "mint":
      return MINT_DURATION_MS;
    case "magnet":
      return MAGNET_DURATION_MS;
  }
}

// One functional update per tick: move, growth, and collision are all
// resolved together here so a tick never produces more than one setState.
function nextState(prev: GameState): GameState {
  if (prev.status !== "playing") return prev;

  const direction = prev.pendingDirection ?? prev.direction;
  const rawHead = movePoint(prev.banjo[0], direction);

  const isInvincible = prev.activePowerup?.type === "broccoli" && prev.activePowerup.ticksRemaining > 0;
  const isWrapActive = prev.activePowerup?.type === "broccoli" && prev.activePowerup.wrapTicksRemaining > 0;

  const isOutOfBounds = rawHead.x < 0 || rawHead.x >= GRID_SIZE || rawHead.y < 0 || rawHead.y >= GRID_SIZE;
  if (isOutOfBounds && !isWrapActive) {
    return { ...prev, status: "gameover" };
  }
  const head: Point = isOutOfBounds
    ? { x: (rawHead.x + GRID_SIZE) % GRID_SIZE, y: (rawHead.y + GRID_SIZE) % GRID_SIZE }
    : rawHead;

  const ateBug = head.x === prev.bug.x && head.y === prev.bug.y;
  const pickupType: PickupType | null =
    prev.pickup !== null && head.x === prev.pickup.position.x && head.y === prev.pickup.position.y
      ? prev.pickup.type
      : null;
  const atePickup = pickupType !== null;

  // Mushroom is the one pickup that shrinks Banjo instead of growing
  // him — everything else (the regular bug, or any other pickup) grows.
  const grew = ateBug || (atePickup && pickupType !== "mushroom");
  // The tail's last segment vacates this tick unless Banjo grew, so
  // it's safe to move into that cell — exclude it from the check.
  const body = grew ? prev.banjo : prev.banjo.slice(0, -1);
  if (!isInvincible && body.some((p) => p.x === head.x && p.y === head.y)) {
    return { ...prev, status: "gameover" };
  }

  let banjo = [head, ...body];
  if (pickupType === "mushroom") {
    banjo = banjo.slice(0, Math.max(MUSHROOM_MIN_LENGTH, banjo.length - MUSHROOM_SHRINK_SEGMENTS));
  }

  // Timed powerups: eating one (of the four buff types) starts a fresh
  // window; otherwise count down whatever's already active.
  let activePowerup: ActivePowerup | null;
  if (isTimedPowerupType(pickupType)) {
    const type = pickupType;
    const tickMs = tickIntervalForState(prev.score, { type, ticksRemaining: 0, wrapTicksRemaining: 0 });
    activePowerup = {
      type,
      ticksRemaining: Math.round(powerupDurationMs(type) / tickMs),
      wrapTicksRemaining:
        type === "broccoli" ? Math.round((POWERUP_DURATION_MS - POWERUP_WRAP_BUFFER_MS) / tickMs) : 0,
    };
  } else if (prev.activePowerup && prev.activePowerup.ticksRemaining > 1) {
    activePowerup = {
      ...prev.activePowerup,
      ticksRemaining: prev.activePowerup.ticksRemaining - 1,
      wrapTicksRemaining: Math.max(0, prev.activePowerup.wrapTicksRemaining - 1),
    };
  } else {
    activePowerup = null;
  }

  const isMagnetActive = activePowerup?.type === "magnet" && activePowerup.ticksRemaining > 0;
  const bugOccupied = prev.pickup ? [...banjo, prev.pickup.position] : banjo;
  const bug = ateBug
    ? isMagnetActive
      ? randomEmptyCellNear(bugOccupied, head, MAGNET_PULL_RADIUS)
      : randomEmptyCell(bugOccupied)
    : prev.bug;

  // Golden bug counts down its own on-board lifespan independent of any
  // player buff, and disappears (unclaimed) if it runs out.
  let pickup: BoardPickup | null;
  if (atePickup) {
    pickup = null;
  } else if (prev.pickup && prev.pickup.ticksRemaining !== null) {
    pickup = prev.pickup.ticksRemaining > 1 ? { ...prev.pickup, ticksRemaining: prev.pickup.ticksRemaining - 1 } : null;
  } else {
    pickup = prev.pickup;
  }

  // A new pickup can only spawn once the board's one special-item slot
  // is free and no powerup is currently active — otherwise the board
  // could end up stacking effects.
  const shouldSpawnPickup = ateBug && pickup === null && !activePowerup && Math.random() < PICKUP_SPAWN_CHANCE;
  if (shouldSpawnPickup) {
    const type = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)];
    const position = randomEmptyCell([...banjo, bug]);
    const ticksRemaining =
      type === "goldenBug" ? Math.round(GOLDEN_BUG_LIFESPAN_MS / tickIntervalForScore(prev.score)) : null;
    pickup = { type, position, ticksRemaining };
  }

  const score = ateBug ? prev.score + 1 : pickupType === "goldenBug" ? prev.score + GOLDEN_BUG_BONUS_SCORE : prev.score;

  return {
    banjo,
    direction,
    pendingDirection: null,
    bug,
    pickup,
    score,
    status: "playing",
    activePowerup,
    powerupPickupCount: atePickup ? prev.powerupPickupCount + 1 : prev.powerupPickupCount,
    lastPickupType: atePickup ? pickupType : prev.lastPickupType,
  };
}

export function useSnakeGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);

  const tick = useCallback(() => {
    setGameState((prev) => nextState(prev));
  }, []);

  const tickIntervalMs = tickIntervalForState(gameState.score, gameState.activePowerup);

  useEffect(() => {
    if (gameState.status !== "playing") return;
    const id = setInterval(tick, tickIntervalMs);
    return () => clearInterval(id);
  }, [tick, tickIntervalMs, gameState.status]);

  const setDirection = useCallback((direction: Direction) => {
    setGameState((prev) => {
      if (prev.status === "gameover") return prev;
      if (isOpposite(direction, prev.direction)) return prev;
      return { ...prev, status: "playing", pendingDirection: direction };
    });
  }, []);

  const togglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev.status === "playing") return { ...prev, status: "paused" };
      if (prev.status === "paused") return { ...prev, status: "playing" };
      return prev;
    });
  }, []);

  // Tracks whether this "life" has had its first move yet — gates the
  // bark to fire once per game rather than on every pause/resume, and
  // lets the UI show "Start" instead of "Resume" before the first move.
  const hasStartedRef = useRef(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Bumped on every restart so the UI can remount the board and snap
  // Banjo back to the start instantly, instead of sliding there from
  // wherever the previous game ended.
  const [restartKey, setRestartKey] = useState(0);

  const restart = useCallback(() => {
    hasStartedRef.current = false;
    setHasStarted(false);
    setRestartKey((k) => k + 1);
    setGameState(createInitialState());
  }, []);

  useEffect(() => {
    if (gameState.status === "playing" && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setHasStarted(true);
      playBarkSound();
    }
  }, [gameState.status]);

  const prevScoreRef = useRef(gameState.score);
  useEffect(() => {
    if (gameState.score > prevScoreRef.current) playEatSound();
    prevScoreRef.current = gameState.score;
  }, [gameState.score]);

  const prevStatusRef = useRef(gameState.status);
  useEffect(() => {
    if (gameState.status === "gameover" && prevStatusRef.current !== "gameover") playGameOverSound();
    prevStatusRef.current = gameState.status;
  }, [gameState.status]);

  const prevPowerupPickupCountRef = useRef(gameState.powerupPickupCount);
  useEffect(() => {
    if (gameState.powerupPickupCount > prevPowerupPickupCountRef.current) {
      if (isTimedPowerupType(gameState.lastPickupType)) {
        playPowerupPickupSound(gameState.lastPickupType);
      } else if (gameState.lastPickupType === "mushroom") {
        playMushroomPickupSound();
      } else if (gameState.lastPickupType === "goldenBug") {
        playGoldenBugPickupSound();
      }
    }
    prevPowerupPickupCountRef.current = gameState.powerupPickupCount;
  }, [gameState.powerupPickupCount, gameState.lastPickupType]);

  // The music loop is keyed off "is a powerup active right now," not
  // "was one just picked up" — so it naturally restarts on resume and
  // stops on pause, game over, or restart, via the effect's own cleanup,
  // without any extra pause-tracking bookkeeping.
  const activePowerupType = gameState.activePowerup?.type ?? null;
  useEffect(() => {
    if (gameState.status !== "playing" || !activePowerupType) return;
    const stop = playPowerupMusic(activePowerupType);
    return stop;
  }, [gameState.status, activePowerupType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const direction = KEY_TO_DIRECTION[e.key.toLowerCase()];
      if (direction) {
        e.preventDefault();
        setDirection(direction);
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setDirection, togglePause, restart]);

  return { gameState, togglePause, restart, tickIntervalMs, restartKey, hasStarted };
}
