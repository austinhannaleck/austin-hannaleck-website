import { describe, expect, it } from "vitest";
import { STEP_COUNT, sanitizeBassPattern } from "./Bassline";

describe("sanitizeBassPattern", () => {
  it("falls back to a full blank pattern for the wrong shape entirely", () => {
    const blank = { note: null, accent: false, slide: false };
    expect(sanitizeBassPattern(undefined)).toEqual(Array(STEP_COUNT).fill(blank));
    expect(sanitizeBassPattern("not an array")).toEqual(Array(STEP_COUNT).fill(blank));
    expect(sanitizeBassPattern(Array(STEP_COUNT - 1).fill(blank))).toEqual(Array(STEP_COUNT).fill(blank));
  });

  it("sanitizes each step independently rather than rejecting the whole pattern", () => {
    const raw = [
      { note: "C", accent: true, slide: false },
      { note: "not a real note", accent: true, slide: false },
      null,
      { note: "D#" }, // missing accent/slide
      ...Array(STEP_COUNT - 4).fill(null),
    ];
    const result = sanitizeBassPattern(raw);
    expect(result).toHaveLength(STEP_COUNT);
    expect(result[0]).toEqual({ note: "C", accent: true, slide: false });
    // An invalid note name falls back to null rather than being trusted.
    expect(result[1].note).toBeNull();
    expect(result[2]).toEqual({ note: null, accent: false, slide: false });
    expect(result[3]).toEqual({ note: "D#", accent: false, slide: false });
  });
});
