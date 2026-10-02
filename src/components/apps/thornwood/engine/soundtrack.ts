import { ENEMY_STATS } from "./actors";
import { roomHasTile } from "./room";
import { ROOMS, type MusicTrack } from "./world";
import type { GameState } from "./types";

// Which theme should be playing. Thornback gets the boss theme, but only
// while it's alive. Captain Clank, and any room whose shutters have slammed
// shut with monsters still in it, get the menacing one, until the last of
// them falls and the room's own music comes back. Menus outside of play
// are handled by the caller (the title screen has its own theme).
export function musicFor(state: GameState): MusicTrack | null {
  if (state.status === "title" || state.status === "won" || state.status === "gameover") return null;
  const boss = state.enemies.find((e) => ENEMY_STATS[e.kind].boss && e.mode !== "dying");
  if (boss) return ENEMY_STATS[boss.kind].boss === "thornback" ? "boss" : "danger";
  if (state.shuttersClosed && roomHasTile(state, "S")) return "danger";
  return ROOMS[state.roomId].music;
}
