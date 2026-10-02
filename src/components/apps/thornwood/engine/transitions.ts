import { ENEMY_STATS } from "./actors";
import { tileSpan } from "./collision";
import { vectorOf } from "./directions";
import { playSound } from "./effects";
import { loadRoom, tileAt, updateMechanisms } from "./room";
import { neighborRoomId, spawnAtTile, type WarpDef } from "./world";
import { FADE_FRAMES, ROOM_H, ROOM_W, SCROLL_FRAMES, TILE, type Direction, type GameState, type Spawn } from "./types";

// Moving between rooms: sliding to the next screen when you walk off an
// edge, and fading through black on stairs and cave mouths.

// How far the hero walks into the new room while the camera slides, so
// they end up clear of the doorway (and any shutter in it).
const SCROLL_WALK = TILE;

export function startScroll(state: GameState, dir: Direction): boolean {
  const next = neighborRoomId(state.roomId, dir);
  if (!next) return false;
  const fromRoomId = state.roomId;
  loadRoom(state, next);

  const hero = state.hero;
  if (dir === "left") hero.x = ROOM_W - hero.w;
  if (dir === "right") hero.x = 0;
  if (dir === "up") hero.y = ROOM_H - hero.h;
  if (dir === "down") hero.y = 0;
  hero.facing = dir;
  hero.action = "none";
  hero.knockback = null;
  clearDoorwayBushes(state, dir);
  state.transition = { kind: "scroll", dir, frame: 0, fromRoomId, start: { x: hero.x, y: hero.y } };
  return true;
}

// Bushes regrow whenever a room reloads, including ones in a doorway you
// cut your way out through. Clear any in the strip you're about to walk
// into, or you'd arrive stuck inside one.
function clearDoorwayBushes(state: GameState, dir: Direction): void {
  const hero = state.hero;
  const v = vectorOf(dir);
  const path = {
    x: Math.min(hero.x, hero.x + v.x * SCROLL_WALK),
    y: Math.min(hero.y, hero.y + v.y * SCROLL_WALK),
    w: hero.w + Math.abs(v.x) * SCROLL_WALK,
    h: hero.h + Math.abs(v.y) * SCROLL_WALK,
  };
  const { c0, c1, r0, r1 } = tileSpan(path);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (tileAt(state, col, row) === "b") state.tiles[row][col] = ".";
    }
  }
}

export function startWarp(state: GameState, warp: WarpDef): void {
  state.transition = { kind: "fadeOut", frame: 0, to: spawnAtTile(warp.roomId, warp.col, warp.row, warp.facing) };
  state.hero.action = "none";
  state.hero.moving = false;
  playSound(state, "stairs");
}

export function placeHero(state: GameState, spawn: Spawn): void {
  const hero = state.hero;
  hero.x = spawn.x;
  hero.y = spawn.y;
  hero.facing = spawn.facing;
  hero.knockback = null;
  hero.action = "none";
}

// Runs once the hero is standing in a room for real: remembers where they
// came in (for pit falls), settles mechanisms quietly, autosaves, and
// rolls the boss intro if there's a boss waiting.
export function arriveInRoom(state: GameState): void {
  state.roomEntry = { x: state.hero.x, y: state.hero.y };
  updateMechanisms(state, true);
  state.events.push({ type: "checkpoint" });
  const boss = state.enemies.find((e) => ENEMY_STATS[e.kind].boss);
  if (boss) {
    const id = ENEMY_STATS[boss.kind].boss!;
    state.events.push({ type: "bossIntro", boss: id });
    playSound(state, "bossRoar");
  }
}

export function updateTransition(state: GameState): void {
  const t = state.transition;
  if (!t) return;
  t.frame++;
  const hero = state.hero;

  switch (t.kind) {
    case "scroll": {
      const v = vectorOf(t.dir);
      const walked = (SCROLL_WALK * t.frame) / SCROLL_FRAMES;
      hero.x = t.start.x + v.x * walked;
      hero.y = t.start.y + v.y * walked;
      hero.moving = true;
      hero.walkFrames++;
      if (t.frame >= SCROLL_FRAMES) {
        state.transition = null;
        hero.moving = false;
        arriveInRoom(state);
      }
      return;
    }
    case "fadeOut":
      if (t.frame >= FADE_FRAMES) {
        loadRoom(state, t.to.roomId);
        placeHero(state, t.to);
        // Entering an area through its front door makes that the spot
        // you'll continue from after a game over.
        state.respawn = t.to;
        state.transition = { kind: "fadeIn", frame: 0 };
      }
      return;
    case "fadeIn":
      if (t.frame >= FADE_FRAMES) {
        state.transition = null;
        arriveInRoom(state);
      }
      return;
  }
}
