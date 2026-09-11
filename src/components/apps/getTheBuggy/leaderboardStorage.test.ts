import { beforeEach, describe, expect, it } from "vitest";
import {
  buildEntry,
  insertScore,
  loadLastName,
  loadLeaderboard,
  saveLastName,
  saveLeaderboard,
  type LeaderboardEntry,
} from "./leaderboardStorage";

beforeEach(() => {
  localStorage.clear();
});

describe("buildEntry", () => {
  it("trims the given name", () => {
    expect(buildEntry(10, "  Banjo  ").name).toBe("Banjo");
  });

  it("falls back to Anonymous for a blank name", () => {
    expect(buildEntry(10, "   ").name).toBe("Anonymous");
  });
});

describe("insertScore", () => {
  it("sorts by score descending and caps the list at 10 entries", () => {
    const entries: LeaderboardEntry[] = Array.from({ length: 10 }, (_, i) => ({
      score: i,
      date: `2026-01-0${(i % 9) + 1}`,
      name: `player${i}`,
    }));
    const result = insertScore(entries, { score: 5.5, date: "2026-02-01", name: "new" });
    expect(result).toHaveLength(10);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    // Lowest-scoring original entry (score 0) should have been pushed off
    // the end by the new 5.5, not the new entry itself.
    expect(result.some((e) => e.name === "new")).toBe(true);
    expect(result.some((e) => e.name === "player0")).toBe(false);
  });
});

describe("loadLeaderboard / saveLeaderboard", () => {
  it("round-trips a saved leaderboard", () => {
    const entries: LeaderboardEntry[] = [{ score: 3, date: "2026-01-01", name: "Banjo" }];
    saveLeaderboard(entries);
    expect(loadLeaderboard()).toEqual(entries);
  });

  it("defensively falls back to an empty list for garbage storage content", () => {
    localStorage.setItem("getTheBuggy.leaderboard", "not json");
    expect(loadLeaderboard()).toEqual([]);

    localStorage.setItem("getTheBuggy.leaderboard", JSON.stringify({ not: "an array" }));
    expect(loadLeaderboard()).toEqual([]);

    localStorage.setItem("getTheBuggy.leaderboard", JSON.stringify([{ score: "not a number", date: "x" }]));
    expect(loadLeaderboard()).toEqual([]);
  });

  it("backfills a missing name as Anonymous for entries saved before names existed", () => {
    localStorage.setItem("getTheBuggy.leaderboard", JSON.stringify([{ score: 4, date: "2026-01-01" }]));
    expect(loadLeaderboard()).toEqual([{ score: 4, date: "2026-01-01", name: "Anonymous" }]);
  });
});

describe("loadLastName / saveLastName", () => {
  it("round-trips the last-used player name", () => {
    saveLastName("Banjo");
    expect(loadLastName()).toBe("Banjo");
  });

  it("returns an empty string when nothing has been saved yet", () => {
    expect(loadLastName()).toBe("");
  });
});
