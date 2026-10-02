import { describe, expect, it } from "vitest";
import { createGame } from "./engine";
import { sanitizeSave, snapshotSave } from "./save";

describe("save data", () => {
  it("round-trips a game through JSON", () => {
    const game = createGame(7);
    game.inventory.gems = 42;
    game.inventory.hasSword = true;
    game.hero.maxHp = 10;
    game.flags.add("chest:overworld:0,1:3,9");
    const restored = sanitizeSave(JSON.parse(JSON.stringify(snapshotSave(game))));
    expect(restored).toEqual(snapshotSave(game));

    const resumed = createGame(7, restored);
    expect(resumed.inventory.gems).toBe(42);
    expect(resumed.inventory.hasSword).toBe(true);
    expect(resumed.hero.hp).toBe(10);
    expect(resumed.flags.has("chest:overworld:0,1:3,9")).toBe(true);
  });

  it("rejects junk and saves pointing at rooms that don't exist", () => {
    expect(sanitizeSave(null)).toBeNull();
    expect(sanitizeSave("hello")).toBeNull();
    expect(sanitizeSave({ version: 2 })).toBeNull();
    const save = snapshotSave(createGame(1));
    expect(sanitizeSave({ ...save, respawn: { ...save.respawn, roomId: "moon:0,0" } })).toBeNull();
    expect(sanitizeSave({ ...save, respawn: { ...save.respawn, x: Number.NaN } })).toBeNull();
    expect(sanitizeSave({ ...save, respawn: { ...save.respawn, x: 9000 } })).toBeNull();
  });

  it("clamps hand-edited numbers back into range", () => {
    const save = snapshotSave(createGame(1));
    const fixed = sanitizeSave({
      ...save,
      gems: 1e9,
      maxHp: 99,
      smallKeys: -3,
      flags: ["ok", 5, null],
      hasSword: "yes",
      respawn: { ...save.respawn, facing: "sideways" },
    })!;
    expect(fixed.gems).toBe(999);
    expect(fixed.maxHp).toBe(20);
    expect(fixed.smallKeys).toBe(0);
    expect(fixed.flags).toEqual(["ok"]);
    expect(fixed.hasSword).toBe(false);
    expect(fixed.respawn.facing).toBe("down");
  });
});
