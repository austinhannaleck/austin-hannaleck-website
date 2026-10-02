import { BOSS_NAMES, ENEMY_STATS, createDrop } from "./actors";
import { centerOf } from "./collision";
import { QUAKE_PAGES, makeDialog, itemGetPages } from "./dialogue";
import { addHitStop, addShake, playSound, spawnBurst } from "./effects";
import { random } from "./rng";
import { rememberDefeat } from "./respawn";
import { flags, spawnThornbackSpoils } from "./room";
import { outOfReach } from "./swim";
import {
  ENEMY_KNOCKBACK_FRAMES,
  ENEMY_KNOCKBACK_SPEED,
  HERO_KNOCKBACK_FRAMES,
  HERO_KNOCKBACK_SPEED,
  HP_CAP,
  HURT_INVULN_FRAMES,
  type Drop,
  type Enemy,
  type GameState,
  type Point,
} from "./types";

// Damage in both directions, deaths, and loot.

export function hurtHero(state: GameState, damage: number, from: Point): boolean {
  const hero = state.hero;
  // A diver is out of reach of everything up on the surface.
  if (hero.invulnFrames > 0 || outOfReach(hero) || hero.action === "dying" || hero.action === "fall") return false;
  hero.hp = Math.max(0, hero.hp - damage);
  hero.invulnFrames = HURT_INVULN_FRAMES;

  const c = centerOf(hero);
  const dx = c.x - from.x;
  const dy = c.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  hero.knockback = { vx: (dx / len) * HERO_KNOCKBACK_SPEED, vy: (dy / len) * HERO_KNOCKBACK_SPEED, frames: HERO_KNOCKBACK_FRAMES };
  if (hero.action !== "none") hero.action = "none";

  playSound(state, "heroHurt");
  addShake(state, 8);
  addHitStop(state, 3);
  spawnBurst(state, c.x, c.y, { count: 8, colors: [0xff5a6e, 0xffffff], speed: 1.4, life: 24, size: 1.6 });

  if (hero.hp === 0) startDying(state);
  return true;
}

export function startDying(state: GameState): void {
  const hero = state.hero;
  hero.action = "dying";
  hero.actionFrame = 0;
  hero.knockback = null;
  hero.holding = null;
  playSound(state, "dying");
}

// `push` is a unit vector to knock the enemy along (bosses don't budge).
export function damageEnemy(state: GameState, enemy: Enemy, damage: number, push: Point | null): void {
  if (enemy.hurtFrames > 0 || enemy.mode === "dying") return;
  const stats = ENEMY_STATS[enemy.kind];
  const wasAboveHalf = enemy.hp > enemy.maxHp / 2;
  enemy.hp -= damage;
  enemy.hurtFrames = stats.hurtFrames;

  const c = centerOf(enemy);
  spawnBurst(state, c.x, c.y, { count: 10, colors: [0xffffff, 0xfff1a8], speed: 1.8, life: 18, size: 1.4 });

  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
    return;
  }
  if (push && !stats.boss) {
    enemy.knockback = { vx: push.x * ENEMY_KNOCKBACK_SPEED, vy: push.y * ENEMY_KNOCKBACK_SPEED, frames: ENEMY_KNOCKBACK_FRAMES };
  }
  playSound(state, "hit");
  addHitStop(state, stats.boss ? 6 : 3);
  if (stats.boss) addShake(state, 6);

  // Thornback gets angrier at half health: it announces phase two.
  if (enemy.kind === "thornback" && wasAboveHalf && enemy.hp <= enemy.maxHp / 2) {
    playSound(state, "bossRoar");
    addShake(state, 20);
  }
}

export function killEnemy(state: GameState, enemy: Enemy): void {
  const c = centerOf(enemy);
  if (ENEMY_STATS[enemy.kind].boss) {
    // Bosses get a drawn-out death (see bosses.ts); finishBoss() cleans up.
    enemy.mode = "dying";
    enemy.timer = 100;
    enemy.knockback = null;
    playSound(state, "bossDie");
    addShake(state, 30);
    addHitStop(state, 12);
    return;
  }
  state.enemies = state.enemies.filter((e) => e !== enemy);
  if (rememberDefeat(state, enemy)) {
    // Save right away, so a kill sticks even if you close the tab mid-room.
    state.events.push({ type: "checkpoint" });
  }
  playSound(state, "enemyDie");
  spawnBurst(state, c.x, c.y, {
    count: 16,
    colors: [0xffffff, 0xd9d4ff, 0xb8b0e8],
    speed: 1.2,
    life: 30,
    size: 2.4,
    lift: 1,
    gravity: -0.02,
  });
  rollDrop(state, c.x, c.y, "enemy");
}

export function finishBoss(state: GameState, enemy: Enemy): void {
  const boss = ENEMY_STATS[enemy.kind].boss;
  state.enemies = state.enemies.filter((e) => e !== enemy);
  if (!boss) return;
  state.flags.add(flags.boss(boss));
  playSound(state, "bossDefeated");
  const c = centerOf(enemy);
  spawnBurst(state, c.x, c.y, {
    count: 60,
    colors: [0xffffff, 0xffd166, 0xff8a5c, 0x9be564],
    speed: 2.6,
    life: 50,
    size: 3,
    lift: 3,
  });
  if (enemy.kind === "thornback") {
    spawnThornbackSpoils(state, c.x, c.y);
    // It hits the ground hard enough to rattle the whole forest, and to
    // knock the Fernwhistle drawbridge loose (see drawbridgeDown).
    addShake(state, 100);
    playSound(state, "quake");
    state.dialog = makeDialog(QUAKE_PAGES);
  }
  state.events.push({ type: "checkpoint" });
}

export function bossName(enemy: Enemy): string | null {
  const boss = ENEMY_STATS[enemy.kind].boss;
  return boss ? BOSS_NAMES[boss].name : null;
}

export function rollDrop(state: GameState, x: number, y: number, source: "enemy" | "bush" | "pot"): void {
  if (source === "pot") {
    if (random(state) < 0.5) state.drops.push(createDrop(state, "heart", x, y));
    return;
  }
  const roll = random(state);
  const hurt = state.hero.hp < state.hero.maxHp;
  if (source === "bush") {
    if (roll < 0.1 && hurt) state.drops.push(createDrop(state, "heart", x, y));
    else if (roll < 0.28) state.drops.push(createDrop(state, "gem", x, y));
    return;
  }
  if (roll < 0.14) state.drops.push(createDrop(state, hurt ? "heart" : "gem", x, y));
  else if (roll < 0.42) state.drops.push(createDrop(state, "gem", x, y));
  else if (roll < 0.5) state.drops.push(createDrop(state, "bigGem", x, y));
}

export function collectDrop(state: GameState, drop: Drop): void {
  const hero = state.hero;
  const inv = state.inventory;
  state.drops = state.drops.filter((d) => d !== drop);
  if (drop.flag) state.flags.add(drop.flag);
  const c = centerOf(drop);
  switch (drop.kind) {
    case "gem":
    case "bigGem":
      inv.gems = Math.min(999, inv.gems + (drop.kind === "gem" ? 1 : 5));
      playSound(state, "gem");
      spawnBurst(state, c.x, c.y, { count: 6, colors: drop.kind === "gem" ? [0x7cf29a] : [0x7cc6ff], speed: 1, life: 20, size: 1.2 });
      return;
    case "heart":
      hero.hp = Math.min(hero.maxHp, hero.hp + 2);
      playSound(state, "heart");
      spawnBurst(state, c.x, c.y, { count: 6, colors: [0xff6b81], speed: 1, life: 20, size: 1.2 });
      return;
    case "heartContainer":
      hero.maxHp = Math.min(HP_CAP, hero.maxHp + 2);
      hero.hp = hero.maxHp;
      hero.holding = "heartContainer";
      playSound(state, "itemGet");
      state.dialog = makeDialog(itemGetPages("heartContainer"));
      return;
    case "sunstone":
      hero.holding = "sunstone";
      playSound(state, "itemGet");
      state.dialog = makeDialog(itemGetPages("sunstone"), { then: "win" });
      return;
  }
}
