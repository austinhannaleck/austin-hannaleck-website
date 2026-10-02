import { describe, expect, it } from "vitest";
import { createGame } from "./engine";
import { loadRoom } from "./room";
import { sanitizeSave, snapshotSave } from "./save";

describe("save data", () => {
  it("round-trips a game through JSON", () => {
    const game = createGame(7);
    game.inventory.gems = 42;
    game.inventory.owned.add("sword");
    game.hero.maxHp = 10;
    game.flags.add("chest:overworld:0,1:3,9");
    game.defeated.set("overworld:0,1:2", 1234);
    const restored = sanitizeSave(JSON.parse(JSON.stringify(snapshotSave(game))));
    expect(restored).toEqual(snapshotSave(game));

    const resumed = createGame(7, restored);
    expect(resumed.inventory.gems).toBe(42);
    expect(resumed.inventory.owned.has("sword")).toBe(true);
    expect(resumed.hero.hp).toBe(10);
    expect(resumed.flags.has("chest:overworld:0,1:3,9")).toBe(true);
    expect(resumed.defeated).toEqual(new Map([["overworld:0,1:2", 1234]]));
  });

  it("keeps the Flippers and the equipped tool", () => {
    const game = createGame(3);
    game.inventory.owned.add("flippers");
    game.inventory.owned.add("switcheroo");
    game.inventory.equipped = "switcheroo";
    const resumed = createGame(3, sanitizeSave(JSON.parse(JSON.stringify(snapshotSave(game)))));
    expect(resumed.inventory.owned.has("flippers")).toBe(true);
    expect(resumed.inventory.equipped).toBe("switcheroo");
  });

  it("never equips a tool the save doesn't own", () => {
    const save = snapshotSave(createGame(1));
    expect(sanitizeSave({ ...save, equipped: "laser" })!.equipped).toBeNull();
    expect(createGame(1, { ...save, equipped: "switcheroo", owned: [] }).inventory.equipped).toBeNull();
    // Saves from before tools were equipped get theirs put on the button.
    expect(createGame(1, { ...save, equipped: null, owned: ["switcheroo"] }).inventory.equipped).toBe("switcheroo");
  });

  it("brings a version 1 save up to date", () => {
    const { respawn } = snapshotSave(createGame(1));
    // Shaped exactly like what's in players' browsers from before version 2.
    const v1 = {
      version: 1,
      respawn,
      maxHp: 8,
      gems: 120,
      smallKeys: 2,
      hasSword: true,
      hasSwitcheroo: true,
      hasBigKey: "yes",
      hasGateKey: true,
      hasFlippers: false,
      equipped: "switcheroo",
      flags: ["chest:overworld:0,1:3,9"],
      frames: 5000,
      deaths: 3,
    };
    expect(sanitizeSave(JSON.parse(JSON.stringify(v1)))).toEqual({
      version: 3,
      respawn,
      maxHp: 8,
      gems: 120,
      owned: ["sword", "switcheroo"],
      keys: { bramblekeep: { small: 2, big: false } },
      gateKey: true,
      equipped: "switcheroo",
      flags: ["chest:overworld:0,1:3,9"],
      defeated: {},
      frames: 5000,
      deaths: 3,
    });
  });

  it("drops a version 1 big key or Gate Key whose door is already open", () => {
    const { respawn } = snapshotSave(createGame(1));
    const v1 = { version: 1, respawn, smallKeys: 1, hasBigKey: true, hasGateKey: true, flags: [] as string[] };
    expect(sanitizeSave(v1)).toMatchObject({ keys: { bramblekeep: { small: 1, big: true } }, gateKey: true });

    v1.flags = ["door:bramblekeep:1,1:7,0", "door:bramblekeep:1,1:8,0", "door:overworld:1,0:7,2", "door:overworld:1,0:8,2"];
    expect(sanitizeSave(v1)).toMatchObject({ keys: { bramblekeep: { small: 1, big: false } }, gateKey: false });
  });

  it("brings a version 2 save's beaten dungeon enemies along", () => {
    const { respawn } = snapshotSave(createGame(1));
    // Shaped exactly like what's in players' browsers from before version 3.
    const v2 = {
      version: 2,
      respawn,
      maxHp: 8,
      gems: 120,
      owned: ["sword"],
      keys: { bramblekeep: { small: 1, big: false } },
      gateKey: false,
      equipped: null,
      flags: ["chest:overworld:0,1:3,9", "defeated:bramblekeep:1,2:0", "defeated:bramblekeep:1,2:2"],
      frames: 5000,
      deaths: 3,
    };
    const migrated = sanitizeSave(JSON.parse(JSON.stringify(v2)));
    expect(migrated).toEqual({
      ...v2,
      version: 3,
      flags: ["chest:overworld:0,1:3,9"],
      defeated: { "bramblekeep:1,2:0": 0, "bramblekeep:1,2:2": 0 },
    });

    const resumed = createGame(1, migrated);
    loadRoom(resumed, "bramblekeep:1,2");
    expect(resumed.enemies.map((e) => e.spawn)).toEqual([1]);
  });

  it("keeps each dungeon's keys", () => {
    const game = createGame(5);
    game.inventory.keys.bramblekeep = { small: 2, big: true };
    game.inventory.gateKey = true;
    const resumed = createGame(5, sanitizeSave(JSON.parse(JSON.stringify(snapshotSave(game)))));
    expect(resumed.inventory.keys).toEqual({ bramblekeep: { small: 2, big: true } });
    expect(resumed.inventory.gateKey).toBe(true);
    // The save is a copy: playing on doesn't change it.
    const save = snapshotSave(game);
    game.inventory.keys.bramblekeep.small = 0;
    expect(save.keys.bramblekeep.small).toBe(2);
  });

  it("rejects junk, unknown versions, and saves pointing at rooms that don't exist", () => {
    expect(sanitizeSave(null)).toBeNull();
    expect(sanitizeSave("hello")).toBeNull();
    expect(sanitizeSave({ version: 2 })).toBeNull();
    const save = snapshotSave(createGame(1));
    expect(sanitizeSave({ ...save, version: 99 })).toBeNull();
    expect(sanitizeSave({ ...save, version: "1" })).toBeNull();
    expect(sanitizeSave({ ...save, version: undefined })).toBeNull();
    expect(sanitizeSave({ ...save, respawn: { ...save.respawn, roomId: "moon:0,0" } })).toBeNull();
    expect(sanitizeSave({ ...save, respawn: { ...save.respawn, x: Number.NaN } })).toBeNull();
    expect(sanitizeSave({ ...save, respawn: { ...save.respawn, x: 9000 } })).toBeNull();
  });

  it("cleans up hand-edited values", () => {
    const save = snapshotSave(createGame(1));
    const fixed = sanitizeSave({
      ...save,
      gems: 1e9,
      maxHp: 99,
      keys: { bramblekeep: { small: -3, big: "yes" }, moon: { small: 4, big: true } },
      gateKey: "yes",
      flags: ["ok", 5, null],
      defeated: { "overworld:0,1:0": 90.4, "overworld:0,1:1": -5, "overworld:0,1:2": "soon" },
      owned: ["flippers", "laser", "sword", "sword", 5],
      respawn: { ...save.respawn, facing: "sideways" },
    })!;
    expect(fixed.gems).toBe(999);
    expect(fixed.maxHp).toBe(20);
    expect(fixed.keys).toEqual({ bramblekeep: { small: 0, big: false } });
    expect(fixed.gateKey).toBe(false);
    expect(fixed.flags).toEqual(["ok"]);
    expect(fixed.defeated).toEqual({ "overworld:0,1:0": 90, "overworld:0,1:1": 0 });
    expect(fixed.owned).toEqual(["sword", "flippers"]);
    expect(fixed.respawn.facing).toBe("down");
  });
});
