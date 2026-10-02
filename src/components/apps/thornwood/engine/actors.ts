import { nextId } from "./effects";
import { random, randomInt } from "./rng";
import { boxAtTile } from "./world";
import {
  DROP_LIFETIME,
  type BossId,
  type Drop,
  type DropKind,
  type Enemy,
  type EnemyKind,
  type GameState,
  type Npc,
  type NpcKind,
  type Prop,
  type PropKind,
} from "./types";

// Per-kind stats and constructors for everything that gets spawned into a
// room. Kept free of behavior (that's enemies.ts/bosses.ts) so room loading
// can create actors without pulling in the AI.

type EnemyStats = {
  w: number;
  h: number;
  hp: number;
  // Contact damage, in half-hearts.
  damage: number;
  flying: boolean;
  boss: BossId | null;
  // How long it's invulnerable after a hit. Bosses get longer windows so
  // one opening can't be mashed down in a single breath.
  hurtFrames: number;
};

export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  jellop: { w: 12, h: 10, hp: 2, damage: 1, flying: false, boss: null, hurtFrames: 18 },
  flitter: { w: 12, h: 10, hp: 1, damage: 1, flying: true, boss: null, hurtFrames: 18 },
  knight: { w: 12, h: 12, hp: 4, damage: 2, flying: false, boss: null, hurtFrames: 18 },
  spitbug: { w: 12, h: 12, hp: 2, damage: 1, flying: false, boss: null, hurtFrames: 18 },
  clank: { w: 18, h: 18, hp: 6, damage: 2, flying: false, boss: "clank", hurtFrames: 24 },
  thornback: { w: 28, h: 24, hp: 12, damage: 2, flying: false, boss: "thornback", hurtFrames: 30 },
};

export const BOSS_NAMES: Record<BossId, { name: string; title: string }> = {
  clank: { name: "Captain Clank", title: "Overly Dedicated Guard" },
  thornback: { name: "Thornback", title: "The Bramble Tyrant" },
};

export function createEnemy(state: GameState, kind: EnemyKind, col: number, row: number, spawn = -1): Enemy {
  const stats = ENEMY_STATS[kind];
  const { x, y } = boxAtTile(col, row, stats.w, stats.h);
  return {
    id: nextId(state),
    kind,
    x,
    y,
    w: stats.w,
    h: stats.h,
    hp: stats.hp,
    maxHp: stats.hp,
    facing: "down",
    angle: 0,
    vx: 0,
    vy: 0,
    // Bosses open with a beat of stillness so their intro card can land.
    mode: "idle",
    timer: stats.boss ? 70 : randomInt(state, 20, 60),
    counter: 0,
    hurtFrames: 0,
    knockback: null,
    anim: Math.floor(random(state) * 100),
    lastHitBy: -1,
    stunFrames: 0,
    spawn,
  };
}

export function createNpc(state: GameState, kind: NpcKind, col: number, row: number, wanders: boolean): Npc {
  const { x, y } = boxAtTile(col, row, 12, 12);
  return { id: nextId(state), kind, x, y, w: 12, h: 12, facing: "down", wanders, vx: 0, vy: 0, timer: 30, anim: 0, talkFrames: 0 };
}

export function createProp(state: GameState, kind: PropKind, col: number, row: number): Prop {
  const size = kind === "statue" ? 14 : 12;
  const { x, y } = boxAtTile(col, row, size, size);
  return { id: nextId(state), kind, x, y, w: size, h: size, swapFlash: 0 };
}

const PERMANENT_DROPS = new Set<DropKind>(["heartContainer", "sunstone"]);

export function createDrop(state: GameState, kind: DropKind, cx: number, cy: number, flag: string | null = null): Drop {
  const size = PERMANENT_DROPS.has(kind) ? 12 : 8;
  return {
    id: nextId(state),
    kind,
    x: cx - size / 2,
    y: cy - size / 2,
    w: size,
    h: size,
    life: PERMANENT_DROPS.has(kind) ? null : DROP_LIFETIME,
    flag,
    z: 2,
    vz: 2.2,
  };
}
