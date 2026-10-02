import { describe, expect, it } from "vitest";
import { TRACK_NAMES, parseChord, parseLine, songShape } from "./music";

describe("music notation", () => {
  it("turns held notes into longer events and skips rests", () => {
    const { events, length } = parseLine("A4 - - . C5 | E5 -");
    expect(length).toBe(7);
    expect(events.map((e) => [e.step, e.steps])).toEqual([
      [0, 3],
      [4, 1],
      [5, 2],
    ]);
    expect(events[0].midi).toBe(69);
  });

  it("spells chords", () => {
    expect(parseChord("C").tones).toEqual([48, 52, 55]);
    expect(parseChord("Am").tones).toEqual([57, 60, 64]);
    expect(parseChord("F#dim").tones).toEqual([54, 57, 60]);
    expect(() => parseChord("H7")).toThrow();
  });

  it.each(TRACK_NAMES)("%s has a melody that fills exactly one bar per chord", (name) => {
    const { bars, melodySteps } = songShape(name);
    expect(melodySteps).toBe(bars * 8);
  });
});
