import { STEPS_PER_SECOND } from "../engine/types";

// Simulation steps as m:ss.
export function formatTime(frames: number): string {
  const totalSeconds = Math.floor(frames / STEPS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
