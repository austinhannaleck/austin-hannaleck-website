import { addShake, playSound, spawnBurst } from "./effects";
import { flags } from "./room";
import { TILE, type GameState } from "./types";

// Crystal switches flip which color of peg is raised, dungeon-wide. Either
// a sword or a Switcheroo bolt can hit one.
export function toggleSwitch(state: GameState, col: number, row: number): void {
  if (state.switchCooldown > 0) return;
  state.switchCooldown = 20;
  if (state.flags.has(flags.bluePegs)) state.flags.delete(flags.bluePegs);
  else state.flags.add(flags.bluePegs);
  const blueUp = state.flags.has(flags.bluePegs);
  playSound(state, "switchToggle");
  addShake(state, 4);
  spawnBurst(state, (col + 0.5) * TILE, (row + 0.5) * TILE, {
    count: 16,
    colors: blueUp ? [0x6cb8ff, 0xffffff] : [0xff6b6b, 0xffffff],
    speed: 1.8,
    life: 24,
    size: 1.6,
  });
}
