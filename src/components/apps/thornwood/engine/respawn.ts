import { ROOMS, type Respawn } from "./world";
import { STEPS_PER_SECOND, type Enemy, type GameState } from "./types";

// Which beaten enemies come back. Every regular enemy you beat is
// remembered in `state.defeated` with the frame it fell on, and its
// spawn's respawn rule decides, each time you enter the room, whether it's
// back yet. (Bosses are separate: their boss flag keeps them beaten.)

// What an enemy does when its spawn doesn't say.
export const DEFAULT_RESPAWN: Respawn = { rule: "never" };

// A spawn is a room plus its index in that room's enemy list.
export function defeatKey(roomId: string, spawn: number): string {
  return `${roomId}:${spawn}`;
}

function respawnOf(roomId: string, spawn: number): Respawn {
  return ROOMS[roomId].enemies?.[spawn]?.respawn ?? DEFAULT_RESPAWN;
}

// Remembers a beaten enemy, unless it's one that always comes back (or
// wasn't one of the room's own spawns). Says whether it did.
export function rememberDefeat(state: GameState, enemy: Enemy): boolean {
  if (enemy.spawn < 0 || respawnOf(state.roomId, enemy.spawn).rule === "always") return false;
  state.defeated.set(defeatKey(state.roomId, enemy.spawn), state.frame);
  return true;
}

export function stillDefeated(state: GameState, roomId: string, spawn: number): boolean {
  const fellAt = state.defeated.get(defeatKey(roomId, spawn));
  if (fellAt === undefined) return false;
  const respawn = respawnOf(roomId, spawn);
  switch (respawn.rule) {
    case "never":
      return true;
    case "timer":
      return state.frame - fellAt < respawn.seconds * STEPS_PER_SECOND;
    case "always":
      return false;
  }
}
