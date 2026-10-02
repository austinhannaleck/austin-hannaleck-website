import { beforeEach, describe, expect, it } from "vitest";
import { createGame } from "./engine/engine";
import { snapshotSave } from "./engine/save";
import { clearSave, loadBestFrames, loadSave, recordClearTime, writeSave } from "./saveStorage";

beforeEach(() => localStorage.clear());

describe("saveStorage", () => {
  it("round-trips a save, and clears it", () => {
    const save = snapshotSave(createGame(3));
    writeSave(save);
    expect(loadSave()).toEqual(save);
    clearSave();
    expect(loadSave()).toBeNull();
  });

  it("treats unparseable storage as no save at all", () => {
    localStorage.setItem("thornwood.save.v1", "{not json");
    expect(loadSave()).toBeNull();
  });

  it("only ever keeps the fastest clear time", () => {
    expect(loadBestFrames()).toBeNull();
    expect(recordClearTime(9000)).toBe(9000);
    expect(recordClearTime(12000)).toBe(9000);
    expect(recordClearTime(7000)).toBe(7000);
    expect(loadBestFrames()).toBe(7000);
  });
});
