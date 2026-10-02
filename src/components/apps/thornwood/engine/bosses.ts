import { breakPotsIn } from "./breakables";
import { centerOf } from "./collision";
import { angleOf, angleToward, directionOfAngle, directionOfVector, headingVector, turnToward, vectorOf } from "./directions";
import { addShake, nextId, playSound, spawnBurst } from "./effects";
import { directionToHero, walkEnemy } from "./motion";
import { spawnProjectile } from "./projectiles";
import { randomInt } from "./rng";
import { ROOM_COLS, ROOM_ROWS, TILE, type Enemy, type GameState, type Hero } from "./types";

// ---------------------------------------------------------------------------
// Captain Clank, Bramblekeep's mini-boss. A big knight behind a tower
// shield: swings from the front just clang off. He lines up with you and
// charges like a bull, and if he slams into a wall he's dazed long enough
// to get around that shield.
// ---------------------------------------------------------------------------
const CLANK_WALK_SPEED = 0.5;
const CLANK_CHARGE_SPEED = 3.2;

export function updateClank(state: GameState, e: Enemy): void {
  const from = centerOf(e);
  const to = centerOf(state.hero);
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  switch (e.mode) {
    case "idle":
      if (--e.timer <= 0) {
        e.mode = "move";
        e.timer = 50;
      }
      break;
    case "move": {
      e.facing = directionToHero(state, e);
      const v = vectorOf(e.facing);
      walkEnemy(state, e, v.x * CLANK_WALK_SPEED, v.y * CLANK_WALK_SPEED);
      e.timer--;
      const linedUp = (Math.abs(dx) < 10 && Math.abs(dy) > 24) || (Math.abs(dy) < 10 && Math.abs(dx) > 24);
      if (linedUp && e.timer <= 0) {
        e.mode = "windup";
        e.timer = 34;
        e.facing = directionOfVector(dx, dy);
        playSound(state, "chargeReady");
      }
      break;
    }
    case "windup":
      if (--e.timer <= 0) {
        const v = vectorOf(e.facing);
        e.vx = v.x * CLANK_CHARGE_SPEED;
        e.vy = v.y * CLANK_CHARGE_SPEED;
        e.mode = "charge";
        e.timer = 120;
      }
      break;
    case "charge": {
      const { hitX, hitY } = walkEnemy(state, e, e.vx, e.vy);
      if (hitX || hitY) {
        e.mode = "stunned";
        e.timer = 100;
        addShake(state, 14);
        playSound(state, "thud");
        const c = centerOf(e);
        const v = vectorOf(e.facing);
        spawnBurst(state, c.x + v.x * 10, c.y + v.y * 10, {
          count: 14,
          colors: [0xc8c8d0, 0x8a8a96, 0xffffff],
          speed: 1.8,
          life: 26,
          size: 2,
        });
      } else if (--e.timer <= 0) {
        e.mode = "move";
        e.timer = 60;
      }
      break;
    }
    case "stunned":
      if (--e.timer <= 0) {
        e.mode = "move";
        e.timer = 50;
      }
      break;
    default:
      e.mode = "move";
  }
  e.angle = angleOf(e.facing);
}

// True when Clank's shield is between him and the hero.
export function clankBlocks(e: Enemy, hero: Hero): boolean {
  if (e.mode === "stunned" || e.stunFrames > 0) return false;
  const v = vectorOf(e.facing);
  const from = centerOf(e);
  const to = centerOf(hero);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return (v.x * dx + v.y * dy) / len > 0.45;
}

// ---------------------------------------------------------------------------
// Thornback, the Bramble Tyrant. A giant armored beetle that always turns
// to face you, and its armor is all in front: only hits to its back land.
// The way in is the Switcheroo. Swap places and it's suddenly facing the
// wrong way, open until it turns back around. Along the way it spits thorn
// volleys, and charges that bring the ceiling down when it hits a wall.
// At half health it gets faster at all of it.
// ---------------------------------------------------------------------------

function inPhaseTwo(e: Enemy): boolean {
  return e.hp <= e.maxHp / 2;
}

export function updateThornback(state: GameState, e: Enemy): void {
  const phase2 = inPhaseTwo(e);
  const turnRate = phase2 ? 0.05 : 0.035;
  const target = angleToward(centerOf(e), centerOf(state.hero));

  switch (e.mode) {
    case "idle":
      e.angle = turnToward(e.angle, target, turnRate);
      if (--e.timer <= 0) {
        e.mode = "move";
        e.timer = 100;
      }
      break;
    case "move": {
      e.angle = turnToward(e.angle, target, turnRate);
      const v = headingVector(e.angle);
      const speed = phase2 ? 0.62 : 0.45;
      walkEnemy(state, e, v.x * speed, v.y * speed);
      if (--e.timer <= 0) {
        e.counter++;
        e.mode = "windup";
        const volley = e.counter % 2 === 1;
        e.timer = volley ? 30 : 46;
        if (!volley) playSound(state, "bossRoar");
      }
      break;
    }
    case "windup":
      e.angle = turnToward(e.angle, target, turnRate * 1.4);
      if (--e.timer > 0) break;
      if (e.counter % 2 === 1) {
        fireVolley(state, e, phase2 ? 5 : 3);
        e.mode = "move";
        e.timer = phase2 ? 80 : 110;
      } else {
        const v = headingVector(e.angle);
        const speed = phase2 ? 3.8 : 3.2;
        e.vx = v.x * speed;
        e.vy = v.y * speed;
        e.mode = "charge";
        e.timer = 100;
      }
      break;
    case "charge": {
      // Pots don't slow it down: it plows right through, spilling hearts.
      breakPotsIn(state, { x: e.x + e.vx, y: e.y + e.vy, w: e.w, h: e.h });
      const { hitX, hitY } = walkEnemy(state, e, e.vx, e.vy);
      if (hitX || hitY) crash(state, e, phase2);
      else if (--e.timer <= 0) {
        e.mode = "move";
        e.timer = 90;
      }
      break;
    }
    case "stunned":
      if (--e.timer <= 0) {
        e.mode = "move";
        e.timer = 90;
      }
      break;
    default:
      e.mode = "move";
  }
  e.facing = directionOfAngle(e.angle);
}

function fireVolley(state: GameState, e: Enemy, shots: number): void {
  const c = centerOf(e);
  const spread = 0.32;
  for (let i = 0; i < shots; i++) {
    const a = e.angle + (i - (shots - 1) / 2) * spread;
    const v = headingVector(a);
    spawnProjectile(state, "thorn", c.x + v.x * 14, c.y + v.y * 14, v.x * 1.8, v.y * 1.8);
  }
  playSound(state, "spit");
}

function crash(state: GameState, e: Enemy, phase2: boolean): void {
  e.mode = "stunned";
  e.timer = 80;
  addShake(state, 26);
  playSound(state, "thud");
  const c = centerOf(e);
  const v = headingVector(e.angle);
  spawnBurst(state, c.x + v.x * 14, c.y + v.y * 14, {
    count: 22,
    colors: [0x9b8c7a, 0x6e6255, 0xc9bba5],
    speed: 2.2,
    life: 30,
    size: 2.4,
  });

  // The ceiling rains boulders: a few at random, plus one aimed right at
  // wherever you're standing, so standing still is never the answer.
  const count = phase2 ? 6 : 4;
  for (let i = 0; i < count; i++) {
    const col = randomInt(state, 1, ROOM_COLS - 2);
    const row = randomInt(state, 1, ROOM_ROWS - 2);
    const timer = 50 + i * 10;
    state.hazards.push({ id: nextId(state), x: (col + 0.5) * TILE, y: (row + 0.5) * TILE, timer, maxTimer: timer, radius: 10 });
  }
  const hero = centerOf(state.hero);
  state.hazards.push({ id: nextId(state), x: hero.x, y: hero.y, timer: 60, maxTimer: 60, radius: 10 });
}

// Whether a hit from where the hero stands would land: from behind,
// always; from the side too while it's dazed from ramming a wall.
export function thornbackExposed(e: Enemy, hero: Hero): boolean {
  const heading = headingVector(e.angle);
  const from = centerOf(e);
  const to = centerOf(hero);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const facingHero = (heading.x * dx + heading.y * dy) / len;
  return e.mode === "stunned" || e.stunFrames > 0 ? facingHero < 0.35 : facingHero < -0.2;
}
