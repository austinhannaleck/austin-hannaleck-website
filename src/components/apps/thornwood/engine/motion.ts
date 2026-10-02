import { ENEMY_STATS } from "./actors";
import { centerOf, moveBox } from "./collision";
import { directionOfVector } from "./directions";
import { randomInt } from "./rng";
import { blockers, flyerSolidAt, walkerSolidAt } from "./room";
import type { Direction, Enemy, GameState } from "./types";

// Movement helpers shared by regular enemies and bosses.

export function walkEnemy(state: GameState, enemy: Enemy, vx: number, vy: number): { hitX: boolean; hitY: boolean } {
  const flying = ENEMY_STATS[enemy.kind].flying;
  return moveBox(enemy, vx, vy, flying ? flyerSolidAt(state) : walkerSolidAt(state), flying ? [] : blockers(state));
}

export function directionToHero(state: GameState, enemy: Enemy): Direction {
  const from = centerOf(enemy);
  const to = centerOf(state.hero);
  return directionOfVector(to.x - from.x, to.y - from.y);
}

export function rest(state: GameState, enemy: Enemy, minFrames: number, maxFrames: number): void {
  enemy.mode = "idle";
  enemy.timer = randomInt(state, minFrames, maxFrames);
  enemy.counter = 0;
}
