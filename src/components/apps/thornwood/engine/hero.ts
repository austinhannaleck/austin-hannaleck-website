import { clankBlocks, thornbackExposed } from "./bosses";
import { breakPot, cutBush } from "./breakables";
import { centerOf, cornerNudge, moveBox, overlaps, tileSpan } from "./collision";
import { damageEnemy, startDying } from "./combat";
import { vectorOf } from "./directions";
import { addHitStop, playSound, spawnBurst } from "./effects";
import { bumpDoorAhead, tryInteract } from "./interact";
import { fireBolt, heroBoltActive, removeProjectile } from "./projectiles";
import { blockers, heroSolidAt, tileAt } from "./room";
import { toggleSwitch } from "./switches";
import { isPit, isWarp } from "./tiles";
import { startScroll, startWarp } from "./transitions";
import { ROOMS, tileKey } from "./world";
import {
  CAST_FRAMES,
  DYING_FRAMES,
  FALL_FRAMES,
  HERO_CHARGE_SPEED,
  HERO_SPEED,
  HURT_INVULN_FRAMES,
  ROOM_H,
  ROOM_W,
  SPIN_CHARGE_FRAMES,
  SPIN_DAMAGE,
  SPIN_FRAMES,
  SPIN_RADIUS,
  SWING_FRAMES,
  SWORD_DAMAGE,
  TILE,
  type Box,
  type Direction,
  type Enemy,
  type GameState,
  type Hero,
  type Input,
  type Point,
} from "./types";

// ---------------------------------------------------------------------------
// Sword geometry. A swing sweeps through three hitboxes, written here for
// a hero facing down as offsets from the hero's center, and rotated for
// the other facings: out to the side, the diagonal, then straight ahead.
// ---------------------------------------------------------------------------
type ArcSegment = { x: number; y: number; w: number; h: number };

const SWING_ARC: ArcSegment[] = [
  { x: 13, y: -1, w: 14, h: 8 },
  { x: 10, y: 10, w: 13, h: 13 },
  { x: 1, y: 14, w: 8, h: 15 },
];

function rotateSegment(seg: ArcSegment, facing: Direction): ArcSegment {
  switch (facing) {
    case "down":
      return seg;
    case "up":
      return { x: -seg.x, y: -seg.y, w: seg.w, h: seg.h };
    case "right":
      return { x: seg.y, y: -seg.x, w: seg.h, h: seg.w };
    case "left":
      return { x: -seg.y, y: seg.x, w: seg.h, h: seg.w };
  }
}

export function swingSegmentIndex(frame: number): number {
  return Math.min(SWING_ARC.length - 1, Math.floor((frame * SWING_ARC.length) / SWING_FRAMES));
}

// The sword's hitbox this step, or null if it isn't out.
export function swordBox(hero: Hero): Box | null {
  let seg: ArcSegment;
  if (hero.action === "swing") seg = SWING_ARC[swingSegmentIndex(hero.actionFrame)];
  else if (hero.action === "charge") seg = SWING_ARC[SWING_ARC.length - 1];
  else return null;
  const r = rotateSegment(seg, hero.facing);
  const c = centerOf(hero);
  return { x: c.x + r.x - r.w / 2, y: c.y + r.y - r.h / 2, w: r.w, h: r.h };
}

// Where the blade is and which way it points (a unit-ish vector from the
// hero's center), for drawing the sword exactly where it hits.
export function swordAim(hero: Hero): { box: Box; dir: Point } | null {
  const box = swordBox(hero);
  if (!box) return null;
  const c = centerOf(hero);
  const dx = box.x + box.w / 2 - c.x;
  const dy = box.y + box.h / 2 - c.y;
  const len = Math.hypot(dx, dy) || 1;
  return { box, dir: { x: dx / len, y: dy / len } };
}

// Diagonal input keeps your current facing if it's one of the two
// directions held (so strafing along a wall doesn't spin you around).
export function pickFacing(current: Direction, dx: number, dy: number): Direction {
  if (dx === 0 && dy === 0) return current;
  if (dx !== 0 && dy !== 0) {
    const horizontal: Direction = dx > 0 ? "right" : "left";
    const vertical: Direction = dy > 0 ? "down" : "up";
    return current === horizontal || current === vertical ? current : vertical;
  }
  if (dx !== 0) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

export function updateHero(state: GameState, input: Input): void {
  const hero = state.hero;
  if (hero.invulnFrames > 0) hero.invulnFrames--;

  if (hero.action === "dying") {
    if (++hero.actionFrame >= DYING_FRAMES) {
      state.status = "gameover";
      state.deaths++;
    }
    return;
  }
  if (hero.action === "fall") {
    updateFall(state);
    return;
  }

  if (hero.knockback) {
    const kb = hero.knockback;
    moveBox(hero, kb.vx, kb.vy, heroSolidAt(state), blockers(state));
    if (--kb.frames <= 0) hero.knockback = null;
    hero.moving = false;
    checkPit(state);
    return;
  }

  switch (hero.action) {
    case "swing":
      updateSwing(state, input);
      return;
    case "spin":
      updateSpin(state);
      return;
    case "cast":
      updateCast(state);
      return;
    case "charge":
      if (!updateCharge(state, input)) return;
      break;
  }

  walk(state, input);

  if (hero.action === "none") {
    if (input.pressed.sword) {
      if (!tryInteract(state) && state.inventory.hasSword) startSwing(state);
    } else if (input.pressed.tool) {
      startCast(state);
    }
  }
  if (state.dialog) return;
  checkPit(state);
  checkExits(state);
}

function walk(state: GameState, input: Input): void {
  const hero = state.hero;
  const { held } = input;
  const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  const dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
  const charging = hero.action === "charge";
  hero.moving = dx !== 0 || dy !== 0;
  if (!hero.moving) {
    hero.walkFrames = 0;
    return;
  }
  // Charging locks your facing, so you can strafe with the sword held out.
  if (!charging) hero.facing = pickFacing(hero.facing, dx, dy);
  const base = charging ? HERO_CHARGE_SPEED : HERO_SPEED;
  const speed = dx !== 0 && dy !== 0 ? base * Math.SQRT1_2 : base;
  const solid = heroSolidAt(state);
  const walls = blockers(state);
  const { hitX, hitY } = moveBox(hero, dx * speed, dy * speed, solid, walls);
  if (hitX && dy === 0) cornerNudge(hero, "x", dx, 7, speed, solid, walls);
  if (hitY && dx === 0) cornerNudge(hero, "y", dy, 7, speed, solid, walls);
  if (hitX || hitY) bumpDoorAhead(state);
  hero.walkFrames++;
}

function startSwing(state: GameState): void {
  const hero = state.hero;
  hero.action = "swing";
  hero.actionFrame = 0;
  hero.attackId++;
  playSound(state, "swing");
}

function updateSwing(state: GameState, input: Input): void {
  const hero = state.hero;
  const box = swordBox(hero);
  if (box) strike(state, box, SWORD_DAMAGE, () => vectorOf(hero.facing), true);
  if (++hero.actionFrame >= SWING_FRAMES) {
    hero.action = input.held.sword ? "charge" : "none";
    hero.actionFrame = 0;
  }
}

// Returns whether the hero can still move this step.
function updateCharge(state: GameState, input: Input): boolean {
  const hero = state.hero;
  if (!input.held.sword) {
    if (hero.actionFrame >= SPIN_CHARGE_FRAMES) {
      hero.action = "spin";
      hero.actionFrame = 0;
      hero.attackId++;
      playSound(state, "spin");
    } else {
      hero.action = "none";
    }
    return false;
  }
  hero.actionFrame++;
  if (hero.actionFrame === SPIN_CHARGE_FRAMES) {
    playSound(state, "chargeReady");
    const c = centerOf(hero);
    spawnBurst(state, c.x, c.y, { count: 10, colors: [0xfff3a0, 0xffffff], speed: 1, life: 20, size: 1.2, lift: 2, gravity: 0.03 });
  }
  // Holding the sword out still pokes whatever walks into it.
  const box = swordBox(hero);
  if (box) strike(state, box, SWORD_DAMAGE, () => vectorOf(hero.facing), false);
  return true;
}

function updateSpin(state: GameState): void {
  const hero = state.hero;
  const c = centerOf(hero);
  const area = { x: c.x - SPIN_RADIUS, y: c.y - SPIN_RADIUS, w: SPIN_RADIUS * 2, h: SPIN_RADIUS * 2 };
  strike(state, area, SPIN_DAMAGE, (e) => awayFrom(c, centerOf(e)), true);
  if (state.frame % 2 === 0) {
    const a = (hero.actionFrame / SPIN_FRAMES) * Math.PI * 2;
    spawnBurst(state, c.x + Math.sin(a) * 18, c.y + Math.cos(a) * 18, {
      count: 2,
      colors: [0xfff3a0, 0xffffff, 0x9fe8ff],
      speed: 0.4,
      life: 18,
      size: 1.6,
      lift: 0.5,
      gravity: 0,
    });
  }
  if (++hero.actionFrame >= SPIN_FRAMES) hero.action = "none";
}

function awayFrom(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function startCast(state: GameState): void {
  const hero = state.hero;
  if (!state.inventory.hasSwitcheroo || heroBoltActive(state)) return;
  hero.action = "cast";
  hero.actionFrame = 0;
  playSound(state, "cast");
}

function updateCast(state: GameState): void {
  const hero = state.hero;
  hero.actionFrame++;
  if (hero.actionFrame === 4) fireBolt(state);
  if (hero.actionFrame >= CAST_FRAMES) hero.action = "none";
}

// Everything a sword (or spin) touches this step: enemies, enemy shots,
// bushes, and crystal switches. `once` limits each enemy to one hit per
// attack; the held-out sword passes false so it can keep poking.
function strike(state: GameState, area: Box, damage: number, push: (e: Enemy) => Point, once: boolean): void {
  const hero = state.hero;
  for (const e of [...state.enemies]) {
    if (e.mode === "dying" || e.hurtFrames > 0 || !overlaps(area, e)) continue;
    if (once && e.lastHitBy === hero.attackId) continue;
    e.lastHitBy = hero.attackId;
    if ((e.kind === "clank" && clankBlocks(e, hero)) || (e.kind === "thornback" && !thornbackExposed(e, hero))) {
      deflect(state, e);
      continue;
    }
    damageEnemy(state, e, damage, push(e));
  }

  for (const p of [...state.projectiles]) {
    if (p.kind !== "bolt" && overlaps(area, p)) {
      removeProjectile(state, p);
      playSound(state, "clink");
      const c = centerOf(p);
      spawnBurst(state, c.x, c.y, { count: 6, colors: [0xffffff, 0xfff1a8], speed: 1.4, life: 14, size: 1.2 });
    }
  }

  const { c0, c1, r0, r1 } = tileSpan(area);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const ch = tileAt(state, col, row);
      if (ch === "b") cutBush(state, col, row);
      if (ch === "p") breakPot(state, col, row);
      if (ch === "Q") toggleSwitch(state, col, row);
    }
  }
}

// A blocked hit: a clang, sparks, and a little shove back.
function deflect(state: GameState, e: Enemy): void {
  const hero = state.hero;
  const from = centerOf(e);
  const to = centerOf(hero);
  const away = awayFrom(from, to);
  playSound(state, "clink");
  addHitStop(state, 3);
  spawnBurst(state, (from.x + to.x) / 2, (from.y + to.y) / 2, {
    count: 8,
    colors: [0xffffff, 0xfff1a8, 0xffc857],
    speed: 2,
    life: 14,
    size: 1.3,
  });
  hero.action = "none";
  hero.knockback = { vx: away.x * 1.8, vy: away.y * 1.8, frames: 7 };
}

function checkPit(state: GameState): void {
  const hero = state.hero;
  const c = centerOf(hero);
  const ch = tileAt(state, Math.floor(c.x / TILE), Math.floor(c.y / TILE));
  if (ch !== null && isPit(ch)) {
    hero.action = "fall";
    hero.actionFrame = 0;
    hero.knockback = null;
    hero.moving = false;
    playSound(state, "fall");
  }
}

// Falling costs half a heart and puts you back where you entered the room.
function updateFall(state: GameState): void {
  const hero = state.hero;
  if (++hero.actionFrame < FALL_FRAMES) return;
  hero.action = "none";
  hero.x = state.roomEntry.x;
  hero.y = state.roomEntry.y;
  hero.invulnFrames = HURT_INVULN_FRAMES;
  hero.hp = Math.max(0, hero.hp - 1);
  playSound(state, "heroHurt");
  if (hero.hp === 0) startDying(state);
}

function checkExits(state: GameState): void {
  const hero = state.hero;
  let dir: Direction | null = null;
  if (hero.x < 0) dir = "left";
  else if (hero.x + hero.w > ROOM_W) dir = "right";
  else if (hero.y < 0) dir = "up";
  else if (hero.y + hero.h > ROOM_H) dir = "down";
  if (dir) {
    startScroll(state, dir);
    return;
  }

  const c = centerOf(hero);
  const col = Math.floor(c.x / TILE);
  const row = Math.floor(c.y / TILE);
  const ch = tileAt(state, col, row);
  if (ch !== null && isWarp(ch)) {
    const warp = ROOMS[state.roomId].warps?.[tileKey(col, row)];
    if (warp) startWarp(state, warp);
  }
}
