import { centerOf, distance, moveBox, overlaps } from "./collision";
import { directionOfVector, vectorOf } from "./directions";
import { playSound } from "./effects";
import { catchDuckling } from "./quests";
import { random, randomInt, randomPick } from "./rng";
import { blockers, walkerSolidAt } from "./room";
import { DIRECTIONS, type GameState, type Npc } from "./types";

// Everyone who isn't a monster: villagers turn to look at you as you pass,
// Banjo trots about, and Fernwhistle's runaway ducklings waddle around
// until they spot you, and then run for it.

const DUCKLING_WADDLE = 0.4;
const DUCKLING_FLEE = 1.15;
// How close you can get before a duckling bolts.
const DUCKLING_WARY = 44;

// How close you can get before a villager who stays put turns to look at
// you. (The renderer uses it too: a guard stops glancing about.)
export const NOTICE_DISTANCE = 40;

export function updateNpcs(state: GameState): void {
  const heroCenter = centerOf(state.hero);
  for (const npc of state.npcs) {
    npc.anim++;
    if (npc.talkFrames > 0) npc.talkFrames--;
    if (npc.kind === "duckling" && npc.wanders) {
      updateRunaway(state, npc);
    } else if (npc.wanders) {
      wander(state, npc, 0.7);
    } else if (distance(centerOf(npc), heroCenter) < NOTICE_DISTANCE) {
      const c = centerOf(npc);
      npc.facing = directionOfVector(heroCenter.x - c.x, heroCenter.y - c.y);
    }
  }
}

// Ambles about: picks a direction (now and then, toward you, to come say
// hi), goes a little way, stops, thinks about it.
function wander(state: GameState, npc: Npc, speed: number): void {
  if (npc.vx === 0 && npc.vy === 0) {
    if (--npc.timer > 0) return;
    const c = centerOf(npc);
    const hero = centerOf(state.hero);
    npc.facing =
      random(state) < 0.35 ? directionOfVector(hero.x - c.x, hero.y - c.y) : randomPick(state, DIRECTIONS);
    const v = vectorOf(npc.facing);
    npc.vx = v.x * speed;
    npc.vy = v.y * speed;
    npc.timer = randomInt(state, 30, 70);
    return;
  }
  const others = [...blockers(state).filter((b) => b !== npc), state.hero];
  const { hitX, hitY } = moveBox(npc, npc.vx, npc.vy, walkerSolidAt(state), others);
  if (hitX || hitY || --npc.timer <= 0) {
    npc.vx = 0;
    npc.vy = 0;
    npc.timer = randomInt(state, 40, 110);
  }
}

// A duckling on the loose. Get close and it runs directly away from you,
// wobbling as it goes, a touch slower than you walk: corner one against a
// wall or a fence and walk right up to it to scoop it up.
function updateRunaway(state: GameState, npc: Npc): void {
  const hero = state.hero;
  const c = centerOf(npc);
  const h = centerOf(hero);
  const d = distance(c, h);

  const reach = { x: hero.x - 3, y: hero.y - 3, w: hero.w + 6, h: hero.h + 6 };
  if (overlaps(reach, npc) && hero.action !== "dying" && hero.dive === 0) {
    catchDuckling(state, npc);
    return;
  }

  if (d >= DUCKLING_WARY) {
    npc.fleeing = false;
    wander(state, npc, DUCKLING_WADDLE);
    return;
  }
  if (!npc.fleeing) {
    npc.fleeing = true;
    playSound(state, "peep");
  }
  const len = d || 1;
  const away = { x: (c.x - h.x) / len, y: (c.y - h.y) / len };
  // A panicky zigzag across the line of flight.
  const wobble = Math.sin(npc.anim * 0.25) * 0.45;
  const vx = away.x - away.y * wobble;
  const vy = away.y + away.x * wobble;
  const norm = Math.hypot(vx, vy) || 1;
  npc.vx = (vx / norm) * DUCKLING_FLEE;
  npc.vy = (vy / norm) * DUCKLING_FLEE;
  npc.facing = directionOfVector(npc.vx, npc.vy);
  const others = blockers(state).filter((b) => b !== npc);
  moveBox(npc, npc.vx, npc.vy, walkerSolidAt(state), others);
}
