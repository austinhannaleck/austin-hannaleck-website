export type LeaderboardEntry = {
  score: number;
  date: string;
  name: string;
};

const STORAGE_KEY = "getTheBuggy.leaderboard";
const NAME_STORAGE_KEY = "getTheBuggy.playerName";
const MAX_ENTRIES = 10;

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is { score: number; date: string; name?: unknown } =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as LeaderboardEntry).score === "number" &&
          typeof (entry as LeaderboardEntry).date === "string",
      )
      .map((entry) => ({
        score: entry.score,
        date: entry.date,
        // Entries saved before names existed just get a placeholder.
        name: typeof entry.name === "string" && entry.name ? entry.name : "Anonymous",
      }));
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage can be unavailable (private browsing, quota) — the
    // leaderboard just won't persist this run, which is fine.
  }
}

export function insertScore(entries: LeaderboardEntry[], newEntry: LeaderboardEntry): LeaderboardEntry[] {
  return [...entries, newEntry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
}

export function buildEntry(score: number, name: string): LeaderboardEntry {
  return { score, date: new Date().toISOString(), name: name.trim() || "Anonymous" };
}

export function loadLastName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveLastName(name: string): void {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch {
    // Same rationale as saveLeaderboard — non-critical if it fails.
  }
}
