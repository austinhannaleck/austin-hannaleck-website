import { describe, expect, it } from "vitest";
import { DEFAULT_PATTERN, STEP_COUNT, sanitizeDrumPattern } from "./DrumMachine";

describe("sanitizeDrumPattern", () => {
  it("falls back to DEFAULT_PATTERN entirely for non-object input", () => {
    expect(sanitizeDrumPattern(undefined)).toEqual(DEFAULT_PATTERN);
    expect(sanitizeDrumPattern(null)).toEqual(DEFAULT_PATTERN);
    expect(sanitizeDrumPattern("not an object")).toEqual(DEFAULT_PATTERN);
  });

  it("falls back per-track when only some tracks are malformed", () => {
    const validKick = Array(STEP_COUNT).fill(true);
    const result = sanitizeDrumPattern({
      kick: validKick,
      snare: Array(STEP_COUNT - 1).fill(true), // wrong length
      closedHat: "not an array",
    });
    expect(result.kick).toEqual(validKick);
    expect(result.snare).toEqual(DEFAULT_PATTERN.snare);
    expect(result.closedHat).toEqual(DEFAULT_PATTERN.closedHat);
  });

  it("coerces non-boolean step values rather than passing them through", () => {
    const result = sanitizeDrumPattern({
      kick: Array.from({ length: STEP_COUNT }, (_, i) => (i % 2 === 0 ? "yes" : 0)),
    });
    // Only a literal `true` should survive as a hit; anything else in the
    // array (a truthy string, a number) becomes false, not passed through
    // as truthy.
    expect(result.kick.every((v) => v === false)).toBe(true);
  });
});
