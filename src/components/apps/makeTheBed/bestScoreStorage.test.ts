import { beforeEach, describe, expect, it } from "vitest";
import { loadBestScore, saveBestScore } from "./bestScoreStorage";

beforeEach(() => {
  localStorage.clear();
});

describe("loadBestScore / saveBestScore", () => {
  it("returns 0 when nothing has been saved yet", () => {
    expect(loadBestScore()).toBe(0);
  });

  it("round-trips a saved score", () => {
    saveBestScore(12);
    expect(loadBestScore()).toBe(12);
  });

  it("falls back to 0 for non-numeric or non-finite storage content", () => {
    localStorage.setItem("makeTheBed.bestScore", "not a number");
    expect(loadBestScore()).toBe(0);

    localStorage.setItem("makeTheBed.bestScore", "Infinity");
    expect(loadBestScore()).toBe(0);
  });
});
