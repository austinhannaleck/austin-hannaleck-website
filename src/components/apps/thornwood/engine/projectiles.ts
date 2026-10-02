import { ENEMY_STATS } from "./actors";
import { boxHitsTiles, centerOf, findFreeSpot, overlaps } from "./collision";
import { hurtHero } from "./combat";
import { vectorOf } from "./directions";
import { addHitStop, nextId, playSound, spawnBurst } from "./effects";
import { blocksShotAt, flyerSolidAt, heroSolidAt, roomPixels, tileAt, walkerSolidAt } from "./room";
import { outOfReach } from "./swim";
import { toggleSwitch } from "./switches";
import {
  BOLT_RANGE,
  BOLT_SIZE,
  BOLT_SPEED,
  SWAP_STUN_FRAMES,
  TILE,
  type Enemy,
  type GameState,
  type Projectile,
  type ProjectileKind,
  type Prop,
} from "./types";

// Enemy shots, plus the Switcheroo's bolt.

export function spawnProjectile(state: GameState, kind: ProjectileKind, cx: number, cy: number, vx: number, vy: number): void {
  const size = kind === "bolt" ? BOLT_SIZE : 6;
  state.projectiles.push({ id: nextId(state), kind, x: cx - size / 2, y: cy - size / 2, w: size, h: size, vx, vy, traveled: 0 });
}

export function heroBoltActive(state: GameState): boolean {
  return state.projectiles.some((p) => p.kind === "bolt");
}

export function fireBolt(state: GameState): void {
  const hero = state.hero;
  const v = vectorOf(hero.facing);
  const c = centerOf(hero);
  spawnProjectile(state, "bolt", c.x + v.x * 8, c.y + v.y * 8, v.x * BOLT_SPEED, v.y * BOLT_SPEED);
}

function outOfRoom(state: GameState, p: Projectile): boolean {
  const room = roomPixels(state);
  return p.x + p.w < 0 || p.y + p.h < 0 || p.x > room.w || p.y > room.h;
}

function shotBlocked(state: GameState, p: Projectile): boolean {
  const c = centerOf(p);
  return blocksShotAt(state, Math.floor(c.x / TILE), Math.floor(c.y / TILE));
}

export function updateProjectiles(state: GameState): void {
  for (const p of [...state.projectiles]) {
    p.x += p.vx;
    p.y += p.vy;
    p.traveled += Math.hypot(p.vx, p.vy);
    if (p.kind === "bolt") {
      updateBolt(state, p);
      continue;
    }
    const c = centerOf(p);
    if (outOfRoom(state, p) || shotBlocked(state, p)) {
      removeProjectile(state, p);
      spawnBurst(state, c.x, c.y, { count: 5, colors: [0xb08a5a, 0x8c6b45], speed: 1, life: 14, size: 1.2 });
      continue;
    }
    // Shots skim right over a diver.
    if (overlaps(p, state.hero) && !outOfReach(state.hero)) {
      removeProjectile(state, p);
      hurtHero(state, p.kind === "thorn" ? 2 : 1, c);
    }
  }
}

export function removeProjectile(state: GameState, p: Projectile): void {
  state.projectiles = state.projectiles.filter((q) => q !== p);
}

function updateBolt(state: GameState, bolt: Projectile): void {
  const c = centerOf(bolt);
  if (state.frame % 2 === 0) {
    spawnBurst(state, c.x, c.y, { count: 1, colors: [0xc9a2ff, 0xffffff], speed: 0.3, life: 16, size: 1.4, lift: 0, gravity: 0, z: 6 });
  }

  const target: Prop | Enemy | undefined =
    state.props.find((p) => overlaps(bolt, p)) ?? state.enemies.find((e) => e.mode !== "dying" && overlaps(bolt, e));
  if (target) {
    removeProjectile(state, bolt);
    swapWith(state, target);
    return;
  }

  const col = Math.floor(c.x / TILE);
  const row = Math.floor(c.y / TILE);
  if (tileAt(state, col, row) === "Q") {
    removeProjectile(state, bolt);
    toggleSwitch(state, col, row);
    return;
  }

  if (outOfRoom(state, bolt) || shotBlocked(state, bolt) || bolt.traveled >= BOLT_RANGE) {
    removeProjectile(state, bolt);
    playSound(state, "fizzle");
    spawnBurst(state, c.x, c.y, { count: 8, colors: [0xc9a2ff, 0x8f6bd8], speed: 1, life: 18, size: 1.4 });
  }
}

function isEnemy(target: Prop | Enemy): target is Enemy {
  return "hp" in target;
}

// The Switcheroo's whole trick: hero and target trade centers. If either
// one doesn't quite fit where the other was (a big boss into a narrow
// spot, say), it's settled into the nearest spot that does.
export function swapWith(state: GameState, target: Prop | Enemy): boolean {
  const hero = state.hero;
  const heroCenter = centerOf(hero);
  const targetCenter = centerOf(target);

  const heroDest = { ...hero, x: targetCenter.x - hero.w / 2, y: targetCenter.y - hero.h / 2 };
  const heroSolid = heroSolidAt(state, heroDest);
  if (boxHitsTiles(heroDest, heroSolid)) {
    const spot = findFreeSpot(heroDest, heroSolid, 8);
    if (!spot) {
      playSound(state, "fizzle");
      return false;
    }
    heroDest.x = spot.x;
    heroDest.y = spot.y;
  }

  const targetDest = { ...target, x: heroCenter.x - target.w / 2, y: heroCenter.y - target.h / 2 };
  const flying = isEnemy(target) && ENEMY_STATS[target.kind].flying;
  const targetSolid = flying ? flyerSolidAt(state) : walkerSolidAt(state);
  const settled = findFreeSpot(targetDest, targetSolid, 14);

  hero.x = heroDest.x;
  hero.y = heroDest.y;
  target.x = settled ? settled.x : targetDest.x;
  target.y = settled ? settled.y : targetDest.y;
  hero.invulnFrames = Math.max(hero.invulnFrames, 12);

  if (isEnemy(target)) {
    target.knockback = null;
    target.stunFrames = target.kind === "thornback" ? 24 : SWAP_STUN_FRAMES;
    if (target.kind === "thornback" || target.kind === "clank") {
      target.mode = "move";
      target.timer = 90;
    }
  } else {
    target.swapFlash = 20;
  }

  const colors = [0xc9a2ff, 0xffffff, 0x8f6bd8];
  spawnBurst(state, heroCenter.x, heroCenter.y, { count: 14, colors, speed: 1.6, life: 24, size: 1.8 });
  spawnBurst(state, targetCenter.x, targetCenter.y, { count: 14, colors, speed: 1.6, life: 24, size: 1.8 });
  playSound(state, "swap");
  addHitStop(state, 5);
  return true;
}
