const STORAGE_KEY = "makeTheBed.bestScore";

export function loadBestScore(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // Storage can be unavailable (private browsing, quota) — the best
    // score just won't persist this run, which is fine.
  }
}
