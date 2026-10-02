import { ENEMY_STATS } from "./actors";
import { ROOMS, type MusicTrack } from "./world";
import type { GameState } from "./types";

// Which theme should be playing. Boss rooms switch to the boss theme only
// while the boss is alive, and menus outside of play are handled by the
// caller (the title screen has its own theme).
export function musicFor(state: GameState): MusicTrack | null {
  if (state.status === "title" || state.status === "won" || state.status === "gameover") return null;
  const bossAlive = state.enemies.some((e) => ENEMY_STATS[e.kind].boss && e.mode !== "dying");
  if (bossAlive) return "boss";
  return ROOMS[state.roomId].music;
}
