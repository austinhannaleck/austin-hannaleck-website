import { ENEMY_STATS } from "./actors";
import { updateClank, updateThornback } from "./bosses";
import { centerOf, distance, overlaps } from "./collision";
import { finishBoss, hurtHero } from "./combat";
import { angleOf, angleToward, directionOfVector, vectorOf } from "./directions";
import { playSound, spawnBurst } from "./effects";
import { directionToHero, rest, walkEnemy } from "./motion";
import { spawnProjectile } from "./projectiles";
import { random, randomInt, randomPick } from "./rng";
import { DIRECTIONS, type Box, type Direction, type Enemy, type GameState } from "./types";

// The regular cast of baddies:
//   Jellop   a wobbly jelly that hops around, sometimes toward you
//   Flitter  a bat that swoops at you in bursts, over water and pits
//   Knight   patrols until it spots you, then marches straight at you
//   Spitbug  stops, turns to face you, and spits seeds

export function updateEnemies(state: GameState): void {
  for (const e of [...state.enemies]) {
    if (!state.enemies.includes(e)) continue;
    e.anim++;
    if (e.hurtFrames > 0) e.hurtFrames--;
    if (e.mode === "dying") {
      updateBossDeath(state, e);
      continue;
    }
    if (e.knockback) {
      const kb = e.knockback;
      walkEnemy(state, e, kb.vx, kb.vy);
      if (--kb.frames <= 0) e.knockback = null;
      continue;
    }
    if (e.stunFrames > 0) {
      e.stunFrames--;
      continue;
    }
    switch (e.kind) {
      case "jellop":
        updateJellop(state, e);
        break;
      case "flitter":
        updateFlitter(state, e);
        break;
      case "knight":
        updateKnight(state, e);
        break;
      case "spitbug":
        updateSpitbug(state, e);
        break;
      case "clank":
        updateClank(state, e);
        break;
      case "thornback":
        updateThornback(state, e);
        break;
    }
  }
  applyContactDamage(state);
}

function inset(box: Box, by: number): Box {
  return { x: box.x + by, y: box.y + by, w: box.w - by * 2, h: box.h - by * 2 };
}

// Dazed enemies (swapped, or Clank after ramming a wall) are harmless.
function applyContactDamage(state: GameState): void {
  const hero = state.hero;
  if (hero.invulnFrames > 0 || hero.action === "dying" || hero.action === "fall") return;
  const heroBox = inset(hero, 2);
  for (const e of state.enemies) {
    if (e.mode === "dying" || e.stunFrames > 0) continue;
    if (e.kind === "clank" && e.mode === "stunned") continue;
    if (overlaps(heroBox, inset(e, 2))) {
      hurtHero(state, ENEMY_STATS[e.kind].damage, centerOf(e));
      return;
    }
  }
}

function updateBossDeath(state: GameState, e: Enemy): void {
  e.timer--;
  if (e.timer % 9 === 0) {
    const c = centerOf(e);
    spawnBurst(state, c.x + (random(state) - 0.5) * e.w, c.y + (random(state) - 0.5) * e.h, {
      count: 10,
      colors: [0xffffff, 0xffd166, 0xff8a5c],
      speed: 1.6,
      life: 24,
      size: 2.2,
    });
    playSound(state, "enemyDie");
  }
  if (e.timer <= 0) finishBoss(state, e);
}

function updateJellop(state: GameState, e: Enemy): void {
  if (e.mode === "move") {
    const v = vectorOf(e.facing);
    const { hitX, hitY } = walkEnemy(state, e, v.x * 0.55, v.y * 0.55);
    if (hitX || hitY || --e.timer <= 0) rest(state, e, 30, 70);
  } else if (--e.timer <= 0) {
    e.mode = "move";
    e.facing = random(state) < 0.4 ? directionToHero(state, e) : randomPick(state, DIRECTIONS);
    e.timer = randomInt(state, 30, 60);
  }
  e.angle = angleOf(e.facing);
}

const FLITTER_SPEED = 1.1;

function aimFlitter(state: GameState, e: Enemy): void {
  const a = angleToward(centerOf(e), centerOf(state.hero)) + (random(state) - 0.5) * 1.6;
  e.vx = Math.sin(a) * FLITTER_SPEED;
  e.vy = Math.cos(a) * FLITTER_SPEED;
  e.mode = "move";
  e.timer = randomInt(state, 40, 70);
  e.counter++;
}

function updateFlitter(state: GameState, e: Enemy): void {
  if (e.mode === "move") {
    const { hitX, hitY } = walkEnemy(state, e, e.vx, e.vy);
    if (hitX) e.vx = -e.vx;
    if (hitY) e.vy = -e.vy;
    e.angle = Math.atan2(e.vx, e.vy);
    if (--e.timer <= 0) {
      if (e.counter < 3) aimFlitter(state, e);
      else rest(state, e, 50, 90);
    }
  } else if (--e.timer <= 0) {
    aimFlitter(state, e);
  }
  e.facing = directionOfVector(e.vx, e.vy);
}

const KNIGHT_SIGHT = 76;

function updateKnight(state: GameState, e: Enemy): void {
  const from = centerOf(e);
  const to = centerOf(state.hero);
  const dist = distance(from, to);
  const heroAlive = state.hero.action !== "dying";
  if (heroAlive && e.mode !== "chase" && dist < KNIGHT_SIGHT) e.mode = "chase";
  if (e.mode === "chase" && (dist > KNIGHT_SIGHT * 1.7 || !heroAlive)) rest(state, e, 20, 40);

  switch (e.mode) {
    case "chase": {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      // Stick with the current axis until the other is clearly longer,
      // so it marches instead of jittering along a diagonal.
      const horizontal = e.facing === "left" || e.facing === "right";
      let dir: Direction = directionOfVector(dx, dy);
      if (horizontal && Math.abs(dx) > 4 && Math.abs(dy) < Math.abs(dx) * 1.6) dir = dx > 0 ? "right" : "left";
      if (!horizontal && Math.abs(dy) > 4 && Math.abs(dx) < Math.abs(dy) * 1.6) dir = dy > 0 ? "down" : "up";
      e.facing = dir;
      const v = vectorOf(dir);
      const { hitX, hitY } = walkEnemy(state, e, v.x * 0.75, v.y * 0.75);
      if (hitX || hitY) {
        const side: Direction = dir === "left" || dir === "right" ? (dy > 0 ? "down" : "up") : dx > 0 ? "right" : "left";
        const sv = vectorOf(side);
        walkEnemy(state, e, sv.x * 0.75, sv.y * 0.75);
      }
      break;
    }
    case "move": {
      const v = vectorOf(e.facing);
      const { hitX, hitY } = walkEnemy(state, e, v.x * 0.45, v.y * 0.45);
      if (hitX || hitY || --e.timer <= 0) rest(state, e, 20, 50);
      break;
    }
    default:
      if (--e.timer <= 0) {
        e.mode = "move";
        e.facing = randomPick(state, DIRECTIONS);
        e.timer = randomInt(state, 40, 90);
      }
  }
  e.angle = angleOf(e.facing);
}

function updateSpitbug(state: GameState, e: Enemy): void {
  switch (e.mode) {
    case "move": {
      const v = vectorOf(e.facing);
      const { hitX, hitY } = walkEnemy(state, e, v.x * 0.35, v.y * 0.35);
      if (hitX || hitY || --e.timer <= 0) rest(state, e, 30, 60);
      break;
    }
    case "windup":
      if (--e.timer <= 0) {
        const v = vectorOf(e.facing);
        const c = centerOf(e);
        spawnProjectile(state, "seed", c.x + v.x * 8, c.y + v.y * 8, v.x * 1.9, v.y * 1.9);
        playSound(state, "spit");
        rest(state, e, 70, 110);
      }
      break;
    default:
      if (--e.timer <= 0) {
        const dist = distance(centerOf(e), centerOf(state.hero));
        if (dist < 150 && random(state) < 0.55) {
          e.mode = "windup";
          e.timer = 24;
          e.facing = directionToHero(state, e);
        } else {
          e.mode = "move";
          e.facing = randomPick(state, DIRECTIONS);
          e.timer = randomInt(state, 30, 60);
        }
      }
  }
  e.angle = angleOf(e.facing);
}
