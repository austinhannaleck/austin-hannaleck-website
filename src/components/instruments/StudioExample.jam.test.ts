import { describe, expect, it } from "vitest";
import { decodeJam, encodeJam, type JamState } from "./StudioExample";
import { INIT_PATCH } from "./Synth";
import { DEFAULT_PATTERN } from "./DrumMachine";

function makeJamState(): JamState {
  return {
    skin: "synthwave",
    bpm: 128,
    synth: {
      patch: INIT_PATCH,
      mode: "seq",
      arpPattern: "up",
      arpOctaves: 2,
      rate: "1/8",
      gate: 0.6,
      seqSteps: [{ note: "C4" }, { note: null }],
      bpm: 128,
    },
    drum: { pattern: DEFAULT_PATTERN, volume: 0.7, swing: 10, kit: "acoustic", bpm: 128 },
    bassline: {
      pattern: [{ note: "C", accent: true, slide: false }],
      waveform: "sawtooth",
      octaveShift: 0,
      volume: 0.7,
      cutoff: 380,
      resonance: 5,
      envMod: 0.3,
      decay: 0.22,
      accentAmount: 0.6,
      subLevel: 0.45,
      bpm: 128,
    },
  };
}

describe("encodeJam / decodeJam", () => {
  it("round-trips a full jam state through the URL-safe encoding", () => {
    const state = makeJamState();
    const decoded = decodeJam(encodeJam(state));
    expect(decoded).toEqual(state);
  });

  it("returns null for a payload that isn't valid base64/JSON", () => {
    expect(decodeJam("not valid base64!!")).toBeNull();
  });

  it("returns null for JSON that doesn't decode to an object at all", () => {
    expect(decodeJam(btoa(JSON.stringify(["just", "an", "array"])))).toBeNull();
  });

  it("still returns a usable state when synth/drum/bassline are missing, rather than passing undefined through", () => {
    // Regression guard: this used to be a blind `as JamState` cast, so a
    // hand-edited or truncated jam link missing one of these fields would
    // hand `undefined` straight to that instrument's loadState() during
    // StudioExample's mount effect and throw, instead of just falling
    // back gracefully like every other malformed-input path in this app.
    const encoded = btoa(JSON.stringify({ skin: "vintage", bpm: 140 }));
    const decoded = decodeJam(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.skin).toBe("vintage");
    expect(decoded?.bpm).toBe(140);
    expect(decoded?.synth).toEqual({});
    expect(decoded?.drum).toEqual({});
    expect(decoded?.bassline).toEqual({});
  });

  it("falls back to a safe default skin/bpm rather than trusting an invalid value", () => {
    const encoded = btoa(JSON.stringify({ skin: "not-a-real-skin", bpm: "not a number" }));
    const decoded = decodeJam(encoded);
    expect(decoded?.skin).toBe("basic");
    expect(decoded?.bpm).toBe(120);
  });
});
