import { sanitizeSave, type SaveData } from "./engine/save";

// Thin localStorage wrappers. Storage can be missing or full (private
// browsing, quotas), and whatever's already there could be junk, so every
// read is sanitized and every failure is quietly survivable: worst case,
// progress just doesn't persist this session.

const SAVE_KEY = "thornwood.save.v1";
const BEST_KEY = "thornwood.bestFrames";
const MUTED_KEY = "thornwood.muted";

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? sanitizeSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Non-critical; see above.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Non-critical.
  }
}

// Best clear time, in simulation steps (60 per second).
export function loadBestFrames(): number | null {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  } catch {
    return null;
  }
}

// Records a clear time if it beats the stored best. Returns the best after.
export function recordClearTime(frames: number): number {
  const best = loadBestFrames();
  if (best !== null && best <= frames) return best;
  try {
    localStorage.setItem(BEST_KEY, String(frames));
  } catch {
    // Non-critical.
  }
  return frames;
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  } catch {
    // Non-critical.
  }
}
