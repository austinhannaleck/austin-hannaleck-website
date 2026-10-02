import { describe, expect, it } from "vitest";
import { INIT_PATCH, sanitizePatch } from "./Synth";

describe("sanitizePatch", () => {
  it("returns INIT_PATCH untouched when given nothing", () => {
    expect(sanitizePatch(undefined)).toEqual(INIT_PATCH);
    expect(sanitizePatch(null)).toEqual(INIT_PATCH);
  });

  it("backfills only the fields missing from a partial patch, keeping the rest", () => {
    const partial = { waveform: "square" as const, cutoff: 999 };
    const result = sanitizePatch(partial);
    expect(result.waveform).toBe("square");
    expect(result.cutoff).toBe(999);
    // Everything not in the partial patch should fall back to INIT_PATCH,
    // e.g. a field added to SynthPatch after some presets/localStorage
    // saves were already written without it.
    expect(result.reverbMix).toBe(INIT_PATCH.reverbMix);
    expect(result.attack).toBe(INIT_PATCH.attack);
  });

  it("overwrites an INIT_PATCH field with an explicit falsy value rather than treating it as missing", () => {
    // Regression guard for a backfill written as `??`/`||` per-field
    // instead of an object spread — that would have incorrectly treated a
    // legitimate 0/false as "missing" and fallen back to INIT_PATCH's
    // (truthy) default instead.
    expect(INIT_PATCH.volume).not.toBe(0);
    expect(INIT_PATCH.legato).toBe(true);
    const result = sanitizePatch({ volume: 0, legato: false });
    expect(result.volume).toBe(0);
    expect(result.legato).toBe(false);
  });
});
