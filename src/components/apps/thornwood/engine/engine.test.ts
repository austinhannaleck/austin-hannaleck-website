import { describe, expect, it } from "vitest";
import { createEnemy } from "./actors";
import { thornbackExposed } from "./bosses";
import { cameraFor } from "./camera";
import { centerOf, distance } from "./collision";
import { damageEnemy, finishBoss, hurtHero, rollDrop } from "./combat";
import { INN_BED_PAGES, QUAKE_PAGES, WARES_SOLD_PAGES, npcDialog } from "./dialogue";
import { grantChest } from "./interact";
import { cycleTool } from "./inventory";
import { continueAfterDeath, createGame, keepPlaying, update } from "./engine";
import { DUCKLINGS } from "./quests";
import { THORNBACK_ROOM, flags, loadRoom, pegRaised } from "./room";
import { FERNWHISTLE } from "./rooms/fernwhistle";
import { sanitizeSave, snapshotSave } from "./save";
import { musicFor } from "./soundtrack";
import { arriveInRoom, placeHero } from "./transitions";
import {
  DIVE_COOLDOWN_FRAMES,
  DIVE_FRAMES,
  DIVE_REACH_FRAMES,
  DYING_FRAMES,
  FALL_FRAMES,
  HERO_SPEED,
  SCROLL_FRAMES,
  SURFACE_GRACE_FRAMES,
  SWIM_SPEED,
  SWING_FRAMES,
  noButtons,
  type Buttons,
  type Direction,
  type GameState,
  type Input,
  type NpcKind,
} from "./types";
import { ROOMS, boxAtTile, spawnAtTile, type Respawn } from "./world";

// Gameplay tests: each one sets up a scene, feeds the engine inputs one
// fixed step at a time (exactly like the real game loop does), and checks
// what happened.

function input(held: Partial<Buttons> = {}, pressed: Partial<Buttons> = {}): Input {
  return { held: { ...noButtons(), ...held }, pressed: { ...noButtons(), ...pressed } };
}

const IDLE = input();

function step(state: GameState, inp: Input = IDLE, times = 1): void {
  for (let i = 0; i < times; i++) update(state, inp);
}

// Press and release a button: one step with it going down, one with it up.
function tap(state: GameState, button: keyof Buttons): void {
  update(state, input({ [button]: true }, { [button]: true }));
  update(state, IDLE);
}

function finishDialogs(state: GameState): void {
  for (let i = 0; i < 200 && state.dialog; i++) tap(state, "sword");
  expect(state.dialog).toBeNull();
}

function heroAt(state: GameState, col: number, row: number, facing: Direction): void {
  placeHero(state, spawnAtTile(state.roomId, col, row, facing));
}

// Jump straight into a room, as if you'd just walked in. Monsters are
// cleared unless a test wants them.
function enter(state: GameState, roomId: string, col: number, row: number, facing: Direction, keepEnemies = false): void {
  loadRoom(state, roomId);
  placeHero(state, spawnAtTile(roomId, col, row, facing));
  if (!keepEnemies) state.enemies = [];
  arriveInRoom(state);
  state.events = [];
}

function newGame(): GameState {
  const game = createGame(1);
  // Banjo wanders, which would make movement tests flaky.
  game.npcs = game.npcs.filter((npc) => npc.kind !== "banjo");
  return game;
}

function sounds(state: GameState): string[] {
  return state.events.flatMap((e) => (e.type === "sound" ? [e.name] : []));
}

describe("starting out", () => {
  it("begins in Puddlebrook with three hearts and empty hands", () => {
    const game = createGame(1);
    expect(game.roomId).toBe("overworld:1,1");
    expect(game.hero.hp).toBe(6);
    expect(game.inventory.owned.has("sword")).toBe(false);
    expect(game.events).toContainEqual({ type: "checkpoint" });
  });

  it("walks, without diagonals being any faster", () => {
    const straight = newGame();
    const start = { ...straight.hero };
    step(straight, input({ up: true }), 10);
    expect(start.y - straight.hero.y).toBeCloseTo(HERO_SPEED * 10);

    const diagonal = newGame();
    step(diagonal, input({ up: true, right: true }), 10);
    expect(Math.hypot(diagonal.hero.x - start.x, diagonal.hero.y - start.y)).toBeCloseTo(HERO_SPEED * 10);
  });

  it("can't walk through trees", () => {
    const game = newGame();
    heroAt(game, 1, 9, "left");
    step(game, input({ left: true }), 30);
    expect(game.hero.x).toBeGreaterThanOrEqual(16);
  });

  it("gets a sword from Nana Shellby", () => {
    const game = newGame();
    heroAt(game, 4, 4, "up");
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Nana Shellby");
    finishDialogs(game);
    expect(game.inventory.owned.has("sword")).toBe(true);
    expect(game.flags.has(flags.nanaSword)).toBe(true);
    expect(game.hero.holding).toBeNull();
    // Closing the dialog doesn't also swing the sword.
    expect(game.hero.action).toBe("none");
  });

  it("can buy a heart container from Haggleby, across his counter", () => {
    const game = newGame();
    game.inventory.gems = 50;
    enter(game, "interior:1,0", 7.5, 5, "up");
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Haggleby");
    finishDialogs(game);
    expect(game.inventory.gems).toBe(10);
    expect(game.hero.maxHp).toBe(8);
    expect(game.hero.hp).toBe(8);
  });
});

describe("combat", () => {
  it("cuts bushes", () => {
    const game = newGame();
    game.inventory.owned.add("sword");
    heroAt(game, 1, 5, "left");
    expect(game.tiles[5][0]).toBe("b");
    tap(game, "sword");
    step(game, IDLE, SWING_FRAMES);
    expect(game.tiles[5][0]).toBe(".");
  });

  it("knocks enemies back, and enough hits finish them off", () => {
    const game = newGame();
    game.inventory.owned.add("sword");
    enter(game, "overworld:0,1", 7, 5, "right");
    const jellop = createEnemy(game, "jellop", 8, 5);
    jellop.timer = 999;
    game.enemies = [jellop];

    tap(game, "sword");
    for (let i = 0; i < SWING_FRAMES && jellop.hp === 2; i++) step(game);
    expect(jellop.hp).toBe(1);
    expect(jellop.knockback?.vx).toBeGreaterThan(0);

    step(game, IDLE, 40);
    jellop.x = game.hero.x + 16;
    jellop.y = game.hero.y;
    tap(game, "sword");
    step(game, IDLE, SWING_FRAMES);
    expect(game.enemies).toHaveLength(0);
  });

  it("hurts to touch an enemy, followed by a moment of invulnerability", () => {
    const game = newGame();
    enter(game, "overworld:0,1", 7, 5, "down");
    game.enemies = [createEnemy(game, "knight", 7, 5)];
    step(game);
    expect(game.hero.hp).toBe(4);
    step(game, IDLE, 5);
    expect(game.hero.hp).toBe(4);
  });

  it("ends the run at zero hearts, and continuing returns you to the last entrance", () => {
    const game = newGame();
    game.hero.hp = 1;
    enter(game, "overworld:0,1", 7, 5, "down");
    game.enemies = [createEnemy(game, "knight", 7, 5)];
    step(game, IDLE, DYING_FRAMES + 10);
    expect(game.status).toBe("gameover");
    expect(game.deaths).toBe(1);

    continueAfterDeath(game);
    expect(game.status).toBe("playing");
    expect(game.hero.hp).toBe(6);
    expect(game.roomId).toBe("overworld:1,1");
  });
});

describe("getting around", () => {
  it("scrolls into the next room, clearing regrown bushes from the doorway", () => {
    const game = newGame();
    enter(game, "overworld:0,1", 14, 5, "right");
    step(game, input({ right: true }), 30);
    expect(game.transition?.kind).toBe("scroll");
    expect(game.roomId).toBe("overworld:1,1");

    step(game, IDLE, SCROLL_FRAMES);
    expect(game.transition).toBeNull();
    expect(game.hero.x).toBe(16);
    expect(game.tiles[5][0]).toBe(".");
    expect(game.events).toContainEqual({ type: "checkpoint" });
  });

  it("keeps the room you're leaving as you left it while the screen slides", () => {
    const game = newGame();
    game.inventory.owned.add("sword");
    heroAt(game, 1, 5, "left");
    tap(game, "sword");
    step(game, IDLE, SWING_FRAMES);
    expect(game.tiles[5][0]).toBe(".");

    step(game, input({ left: true }), 30);
    expect(game.transition?.kind).toBe("scroll");
    expect(game.roomId).toBe("overworld:0,1");
    // The renderer draws Puddlebrook from these: the cut bush stays cut.
    const t = game.transition;
    expect(t?.kind === "scroll" && t.fromTiles[5][0]).toBe(".");
  });

  it("remembers every room you set foot in, for the map", () => {
    const game = newGame();
    expect(game.flags.has(flags.seen("overworld:1,1"))).toBe(true);
    expect(game.flags.has(flags.seen("overworld:0,0"))).toBe(false);

    enter(game, "overworld:0,1", 3.5, 1, "up");
    step(game, input({ up: true }), 30);
    expect(game.roomId).toBe("overworld:0,0");
    expect(game.flags.has(flags.seen("overworld:0,0"))).toBe(true);

    // It's just a flag, so it rides along in the save.
    const restored = createGame(2, sanitizeSave(JSON.parse(JSON.stringify(snapshotSave(game)))));
    expect(restored.flags.has(flags.seen("overworld:0,0"))).toBe(true);
    expect(restored.flags.has(flags.seen("overworld:2,1"))).toBe(false);
  });

  it("opens locked doors with a small key, and they stay open", () => {
    const game = newGame();
    enter(game, "bramblekeep:1,2", 1, 4, "left");
    tap(game, "sword");
    expect(game.dialog?.pages[0]).toMatch(/locked/i);
    finishDialogs(game);

    game.inventory.keys.bramblekeep.small = 1;
    tap(game, "sword");
    expect(game.tiles[4][0]).toBe("_");
    expect(game.tiles[5][0]).toBe("_");
    expect(game.inventory.keys.bramblekeep.small).toBe(0);

    loadRoom(game, "bramblekeep:1,2");
    expect(game.tiles[4][0]).toBe("_");
  });

  it("falls into pits, losing half a heart and starting back at the door", () => {
    const game = newGame();
    enter(game, "bramblekeep:1,1", 7.5, 9, "up");
    const entry = { ...game.roomEntry };
    step(game, input({ up: true }), 30);
    expect(game.hero.action).toBe("fall");
    step(game, IDLE, FALL_FRAMES + 5);
    expect(game.hero.hp).toBe(5);
    expect({ x: game.hero.x, y: game.hero.y }).toEqual(entry);
  });
});

describe("Puddlebrook's houses", () => {
  it("can be walked into through the front door, and out again", () => {
    const game = newGame();
    heroAt(game, 3, 3, "up");
    step(game, input({ up: true }), 12);
    expect(game.transition?.kind).toBe("fadeOut");
    step(game, IDLE, 60);
    expect(game.roomId).toBe("interior:0,0");
    expect(game.transition).toBeNull();

    step(game, input({ down: true }), 30);
    step(game, IDLE, 60);
    expect(game.roomId).toBe("overworld:1,1");
    expect(game.hero.facing).toBe("down");
    expect(Math.floor((game.hero.x + game.hero.w / 2) / 16)).toBe(3);
  });

  it("have a bed you can nap in, which fills your hearts back up", () => {
    const game = newGame();
    enter(game, "interior:0,0", 11, 3, "right");
    game.hero.hp = 1;
    tap(game, "sword");
    expect(game.dialog?.choice?.options[0]).toBe("Take a nap");
    finishDialogs(game);
    expect(sounds(game)).toContain("lullaby");
    expect(game.transition?.kind).toBe("fadeOut");
    step(game, IDLE, 200);
    expect(game.transition).toBeNull();
    expect(game.roomId).toBe("interior:0,0");
    expect(game.hero.hp).toBe(game.hero.maxHp);
  });

  it("have a bookshelf to browse", () => {
    const game = newGame();
    enter(game, "interior:0,0", 2, 3, "up");
    tap(game, "sword");
    const books = ROOMS["interior:0,0"].examine!["2,2"];
    expect(books.some((pages) => pages[0] === game.dialog?.pages[0])).toBe(true);
  });

  it("sell the heart container right off Haggleby's counter", () => {
    const game = newGame();
    game.inventory.gems = 45;
    enter(game, "interior:1,0", 5, 5, "up");
    tap(game, "sword");
    expect(game.dialog?.pages[0]).toMatch(/HEART CONTAINER/);
    finishDialogs(game);
    expect(game.inventory.gems).toBe(5);
    expect(game.hero.maxHp).toBe(8);

    tap(game, "sword");
    expect(game.dialog?.pages).toEqual(WARES_SOLD_PAGES);
  });

  it("have a service bell that makes Haggleby jump", () => {
    const game = newGame();
    enter(game, "interior:1,0", 10, 5, "up");
    tap(game, "sword");
    expect(sounds(game)).toContain("bell");
    expect(game.dialog?.speaker).toBe("Haggleby");
    expect(game.npcs.find((n) => n.kind === "haggleby")?.talkFrames).toBeGreaterThan(0);
  });
});

describe("the Flippers", () => {
  function swimmer(): GameState {
    const game = newGame();
    game.inventory.owned.add("flippers");
    return game;
  }

  // Willow Crossing's river runs across rows 6 and 7.
  const RIVER_TOP = 6 * 16;

  it("keep you out of deep water until you have them", () => {
    const game = newGame();
    enter(game, "overworld:1,2", 4, 5, "down");
    step(game, input({ down: true }), 40);
    expect(game.hero.swimming).toBe(false);
    expect(game.hero.y + game.hero.h).toBeLessThanOrEqual(RIVER_TOP);
  });

  it("let you wade in with a splash and swim, a little slower than walking", () => {
    const game = swimmer();
    enter(game, "overworld:1,2", 4, 5, "down");
    for (let i = 0; i < 30 && !game.hero.swimming; i++) step(game, input({ down: true }));
    expect(game.hero.swimming).toBe(true);
    expect(sounds(game)).toContain("splash");

    const y = game.hero.y;
    step(game, input({ down: true }), 10);
    expect(game.hero.y - y).toBeCloseTo(SWIM_SPEED * 10, 5);

    // Right across, and out onto the far bank.
    step(game, input({ down: true }), 40);
    expect(game.hero.swimming).toBe(false);
    expect(game.hero.y).toBeGreaterThan(8 * 16);
  });

  it("carry you downriver into the next screen", () => {
    const game = swimmer();
    enter(game, "overworld:1,2", 14, 6.5, "right");
    step(game, input({ right: true }), 30);
    expect(game.roomId).toBe("overworld:2,2");
    step(game, IDLE, SCROLL_FRAMES + 1);
    expect(game.hero.swimming).toBe(true);
  });

  it("dive with the sword button, out of reach of everything on the surface", () => {
    const game = swimmer();
    game.inventory.owned.add("sword");
    enter(game, "overworld:1,2", 4, 6.5, "down");
    step(game);
    expect(game.hero.swimming).toBe(true);

    tap(game, "sword");
    expect(game.hero.action).toBe("none");
    expect(game.hero.dive).toBeGreaterThan(0);
    expect(sounds(game)).toContain("dive");

    // Spit and bites miss a diver.
    const hp = game.hero.hp;
    expect(hurtHero(game, 2, { x: 0, y: 0 })).toBe(false);
    const { x, y } = game.hero;
    game.projectiles.push({ id: 999, kind: "seed", x, y, w: 6, h: 6, vx: 0, vy: 0, traveled: 0 });
    step(game, IDLE, 5);
    expect(game.hero.hp).toBe(hp);
    game.projectiles = [];

    step(game, IDLE, DIVE_FRAMES);
    expect(game.hero.dive).toBe(0);
    expect(sounds(game)).toContain("surface");

    // A moment to catch your breath before the next one.
    tap(game, "sword");
    expect(game.hero.dive).toBe(0);
    step(game, IDLE, DIVE_COOLDOWN_FRAMES);
    tap(game, "sword");
    expect(game.hero.dive).toBeGreaterThan(0);
  });

  it("hide a diver from bats, even one hovering right overhead, until just after coming up for air", () => {
    const game = swimmer();
    enter(game, "overworld:1,2", 4, 6.5, "down");
    step(game);
    tap(game, "sword");
    expect(game.hero.dive).toBeGreaterThan(0);

    const bat = createEnemy(game, "flitter", 4, 6.5);
    game.enemies = [bat];
    const overhead = () => {
      bat.x = game.hero.x;
      bat.y = game.hero.y;
      step(game);
    };
    const hp = game.hero.hp;
    while (game.hero.dive > 0) overhead();
    expect(sounds(game)).toContain("surface");
    // Breaking the surface right under it is safe, for a moment...
    for (let i = 0; i < SURFACE_GRACE_FRAMES - 2; i++) overhead();
    expect(game.hero.hp).toBe(hp);
    // ...but only a moment.
    for (let i = 0; i < 4; i++) overhead();
    expect(game.hero.hp).toBeLessThan(hp);
  });

  it("make monsters lose track of you while you're under", () => {
    const game = swimmer();
    enter(game, "overworld:1,2", 4, 6.5, "down");
    const knight = createEnemy(game, "knight", 6, 4);
    game.enemies = [knight];
    step(game);
    tap(game, "sword");
    step(game, IDLE, 30);
    expect(game.hero.dive).toBeGreaterThan(0);
    expect(knight.mode).not.toBe("chase");

    // Up top again, it spots you straight away.
    while (game.hero.dive > 0) step(game);
    step(game, IDLE, 2);
    expect(knight.mode).toBe("chase");
  });

  it("keep tools dry: no Switcheroo while swimming", () => {
    const game = swimmer();
    grantChest(game, { item: "switcheroo" });
    finishDialogs(game);
    enter(game, "overworld:1,2", 4, 6.5, "down");
    step(game);
    tap(game, "tool");
    expect(game.hero.action).toBe("none");
    expect(game.projectiles).toHaveLength(0);
  });

  it("bring up sunken treasure from the bottom, once", () => {
    const game = swimmer();
    enter(game, "overworld:2,0", 10, 2, "down");
    step(game);
    tap(game, "sword");
    step(game, IDLE, DIVE_REACH_FRAMES + 2);
    expect(game.hero.dive).toBe(0);
    expect(game.hero.holding).toBe("gems");
    expect(game.dialog?.pages[0]).toMatch(/50 gems/);
    finishDialogs(game);
    expect(game.inventory.gems).toBe(50);
    expect(game.flags.has(flags.sunken("overworld:2,0", 10, 2))).toBe(true);

    step(game, IDLE, DIVE_COOLDOWN_FRAMES);
    tap(game, "sword");
    step(game, IDLE, DIVE_FRAMES);
    expect(game.dialog).toBeNull();
    expect(game.inventory.gems).toBe(50);
  });
});

describe("the item button", () => {
  it("starts empty, and the first tool you find goes straight on it", () => {
    const game = newGame();
    expect(game.inventory.equipped).toBeNull();
    tap(game, "tool");
    expect(game.hero.action).toBe("none");

    grantChest(game, { item: "switcheroo" });
    expect(game.inventory.equipped).toBe("switcheroo");
    // With only one tool, there's nothing to cycle to.
    expect(cycleTool(game, 1)).toBe(false);
  });

  it("leaves the Flippers off it: they just work", () => {
    const game = newGame();
    grantChest(game, { item: "flippers" });
    expect(game.inventory.owned.has("flippers")).toBe(true);
    expect(game.inventory.equipped).toBeNull();
    expect(game.dialog?.pages.join(" ")).toMatch(/dive/);
  });
});

describe("the road to Bramblekeep", () => {
  it("keeps the keep's gate shut until you have the Gate Key", () => {
    const game = newGame();
    enter(game, "overworld:1,0", 7.5, 3, "up");
    expect(game.tiles[2][7]).toBe("G");
    tap(game, "sword");
    expect(game.dialog?.pages[0]).toMatch(/locked/i);
    finishDialogs(game);

    game.inventory.gateKey = true;
    tap(game, "sword");
    expect(game.tiles[2][7]).toBe(":");
    expect(game.tiles[2][8]).toBe(":");
    // The gate keeps the key.
    expect(game.inventory.gateKey).toBe(false);
    loadRoom(game, "overworld:1,0");
    expect(game.tiles[2][7]).toBe(":");

    // And now the cave mouth beyond it takes you into the dungeon.
    step(game, input({ up: true }), 40);
    step(game, IDLE, 50);
    expect(game.roomId).toBe("bramblekeep:1,3");
  });

  it("hides the Gate Key in the Hollow, in a chest that appears once the room is clear", () => {
    const game = newGame();
    enter(game, "hollow:0,0", 7.5, 9, "up", true);
    expect(game.shuttersClosed).toBe(true);
    expect(game.tiles[5][7]).toBe("_");
    for (const e of [...game.enemies]) damageEnemy(game, e, 99, null);
    step(game);
    expect(game.tiles[5][7]).toBe("C");

    heroAt(game, 7, 6, "up");
    tap(game, "sword");
    expect(game.inventory.gateKey).toBe(true);
    expect(sounds(game)).toContain("fanfare");
  });

  it("remembers you found the Gate Key after the gate has used it up", () => {
    const game = newGame();
    game.flags.add(flags.nanaSword).add(flags.chest("hollow:0,0", 7, 5)).add(flags.door("overworld:1,0", 7, 2));
    expect(game.inventory.gateKey).toBe(false);
    const talkTo = (kind: NpcKind) => npcDialog(game, { ...game.npcs[0], kind }).pages.join(" ");
    expect(talkTo("nana")).toMatch(/found the gate key/i);
    expect(talkTo("mossbeard")).toMatch(/you found it/i);
  });

  it("takes you into the Hollow through the cave in Thornthicket", () => {
    const game = newGame();
    enter(game, "overworld:0,2", 5.5, 7, "up");
    step(game, input({ up: true }), 30);
    step(game, IDLE, 50);
    expect(game.roomId).toBe("hollow:0,1");
  });
});

describe("dungeon mechanics", () => {
  it("opens the boss door with the boss key, which the door keeps", () => {
    const game = newGame();
    enter(game, "bramblekeep:1,1", 7.5, 1, "up");
    tap(game, "sword");
    finishDialogs(game);
    expect(game.tiles[0][7]).toBe("B");

    game.inventory.keys.bramblekeep.big = true;
    tap(game, "sword");
    expect(game.tiles[0][7]).not.toBe("B");
    expect(game.tiles[0][8]).not.toBe("B");
    expect(game.inventory.keys.bramblekeep.big).toBe(false);
  });

  it("plays a fanfare for the treasure in a big chest", () => {
    const game = newGame();
    game.flags.add(flags.bluePegs);
    enter(game, "bramblekeep:2,1", 13, 1, "right");
    tap(game, "sword");
    expect(game.inventory.keys.bramblekeep.big).toBe(true);
    expect(sounds(game)).toContain("fanfare");
    expect(sounds(game)).not.toContain("itemGet");
  });

  it("shuts you in until every enemy is beaten, then reveals the chest, with one jingle for the lot", () => {
    const game = newGame();
    enter(game, "bramblekeep:2,2", 2, 4, "left", true);
    expect(game.shuttersClosed).toBe(true);
    expect(game.tiles[5][11]).toBe("_");
    step(game, input({ left: true }), 40);
    expect(game.hero.x).toBeGreaterThanOrEqual(16);

    game.enemies = [];
    step(game);
    expect(game.shuttersClosed).toBe(false);
    expect(game.tiles[5][11]).toBe("C");
    expect(sounds(game).filter((name) => name === "puzzleSolved")).toHaveLength(1);
  });

  it("swaps places across the chasm with the Switcheroo", () => {
    const game = newGame();
    game.inventory.owned.add("switcheroo");
    enter(game, "bramblekeep:1,1", 4, 8, "up");
    const crystal = game.props.find((p) => p.y < 80)!;
    const crystalStart = centerOf(crystal);
    const heroStart = centerOf(game.hero);

    tap(game, "tool");
    step(game, IDLE, 40);
    expect(centerOf(game.hero)).toEqual(crystalStart);
    expect(centerOf(crystal)).toEqual(heroStart);
  });

  it("holds the bars open once a statue is swapped onto the pressure plate", () => {
    const game = newGame();
    game.inventory.owned.add("switcheroo");
    enter(game, "bramblekeep:0,1", 2, 2, "right");
    step(game);
    expect(game.barsOpen).toBe(true);

    tap(game, "tool");
    step(game, IDLE, 60);
    expect(centerOf(game.hero).x).toBeGreaterThan(180);
    step(game, input({ down: true }), 20);
    expect(game.barsOpen).toBe(true);
  });

  it("plays the jingle when a statue holds the plate down, but not when you do", () => {
    const game = newGame();
    game.inventory.owned.add("switcheroo");
    enter(game, "bramblekeep:0,1", 2, 2, "right");
    // Off the plate and back on: the bars shut and open again, but that's
    // no puzzle solved.
    step(game, input({ down: true }), 20);
    heroAt(game, 2, 2, "right");
    step(game);
    expect(game.barsOpen).toBe(true);
    expect(sounds(game).filter((name) => name === "bars")).toHaveLength(2);
    expect(sounds(game)).not.toContain("puzzleSolved");

    tap(game, "tool");
    step(game, IDLE, 60);
    expect(game.plateHeld).toBe(true);
    expect(sounds(game)).toContain("puzzleSolved");
  });

  it("flips the crystal switch with a bolt from across the pit", () => {
    const game = newGame();
    game.inventory.owned.add("switcheroo");
    enter(game, "bramblekeep:2,1", 5, 8, "right");
    expect(pegRaised(game, "r")).toBe(true);
    tap(game, "tool");
    step(game, IDLE, 30);
    expect(game.flags.has(flags.bluePegs)).toBe(true);
    expect(pegRaised(game, "r")).toBe(false);
    expect(pegRaised(game, "u")).toBe(true);
  });
});

describe("defeated enemies", () => {
  function defeat(game: GameState, index: number): void {
    const enemy = game.enemies.find((e) => e.spawn === index)!;
    damageEnemy(game, enemy, 99, null);
  }

  it("stay defeated in dungeons when you leave and come back", () => {
    const game = newGame();
    enter(game, "bramblekeep:1,2", 7.5, 8, "up", true);
    expect(game.enemies.map((e) => e.spawn)).toEqual([0, 1, 2]);
    defeat(game, 1);
    expect(game.events).toContainEqual({ type: "checkpoint" });

    loadRoom(game, "bramblekeep:1,2");
    expect(game.enemies.map((e) => e.spawn)).toEqual([0, 2]);
  });

  it("stay defeated after loading a save", () => {
    const game = newGame();
    enter(game, "bramblekeep:1,2", 7.5, 8, "up", true);
    defeat(game, 0);
    const resumed = createGame(2, sanitizeSave(JSON.parse(JSON.stringify(snapshotSave(game)))));
    loadRoom(resumed, "bramblekeep:1,2");
    expect(resumed.enemies.map((e) => e.spawn)).toEqual([1, 2]);
  });

  it("keeps a cleared trap room open, chest and all, on every later visit", () => {
    const game = newGame();
    enter(game, "bramblekeep:2,2", 2, 4, "left", true);
    for (const e of [...game.enemies]) damageEnemy(game, e, 99, null);
    step(game);
    expect(game.tiles[5][11]).toBe("C");

    enter(game, "bramblekeep:2,2", 2, 4, "left", true);
    expect(game.enemies).toHaveLength(0);
    expect(game.shuttersClosed).toBe(false);
    expect(game.tiles[5][11]).toBe("C");
  });

  it("stay defeated in the overworld too, unless their spawn says otherwise", () => {
    const game = newGame();
    enter(game, "overworld:0,1", 7, 5, "down", true);
    defeat(game, 0);
    loadRoom(game, "overworld:0,1");
    expect(game.enemies.map((e) => e.spawn)).toEqual([1, 2]);
  });

  // No room uses these rules yet, so the tests lend one to a room's
  // enemies for as long as the test runs.
  function withRespawn(roomId: string, respawn: Respawn, test: () => void): void {
    const def = ROOMS[roomId];
    const authored = def.enemies;
    def.enemies = authored!.map((spawn) => ({ ...spawn, respawn }));
    try {
      test();
    } finally {
      def.enemies = authored;
    }
  }

  it("come back every time you return when they always respawn", () => {
    withRespawn("overworld:0,1", { rule: "always" }, () => {
      const game = newGame();
      enter(game, "overworld:0,1", 7, 5, "down", true);
      defeat(game, 0);
      // Nothing to remember, so nothing to save.
      expect(game.events).not.toContainEqual({ type: "checkpoint" });
      loadRoom(game, "overworld:0,1");
      expect(game.enemies.map((e) => e.spawn)).toEqual([0, 1, 2]);
    });
  });

  it("come back on a timer, counted in time spent playing", () => {
    withRespawn("overworld:0,1", { rule: "timer", seconds: 5 }, () => {
      const game = newGame();
      enter(game, "overworld:0,1", 7, 5, "down", true);
      defeat(game, 0);
      expect(game.events).toContainEqual({ type: "checkpoint" });

      // Off to Puddlebrook to wait, popping back in just before it's time.
      enter(game, "overworld:1,1", 7.5, 8, "up");
      step(game, IDLE, 5 * 60 - 1);
      loadRoom(game, "overworld:0,1");
      expect(game.enemies.map((e) => e.spawn)).toEqual([1, 2]);

      step(game);
      loadRoom(game, "overworld:0,1");
      expect(game.enemies.map((e) => e.spawn)).toEqual([0, 1, 2]);
    });
  });

  it("keep their timers through a save", () => {
    withRespawn("overworld:0,1", { rule: "timer", seconds: 5 }, () => {
      const game = newGame();
      enter(game, "overworld:0,1", 7, 5, "down", true);
      defeat(game, 0);
      const resumed = createGame(2, sanitizeSave(JSON.parse(JSON.stringify(snapshotSave(game)))));
      loadRoom(resumed, "overworld:0,1");
      expect(resumed.enemies.map((e) => e.spawn)).toEqual([1, 2]);

      resumed.frame += 5 * 60;
      loadRoom(resumed, "overworld:0,1");
      expect(resumed.enemies.map((e) => e.spawn)).toEqual([0, 1, 2]);
    });
  });

  it("never brings a boss back, whatever its spawn says", () => {
    withRespawn("bramblekeep:0,2", { rule: "always" }, () => {
      const game = newGame();
      enter(game, "bramblekeep:0,2", 4, 5, "left", true);
      finishBoss(game, game.enemies[0]);
      loadRoom(game, "bramblekeep:0,2");
      expect(game.enemies).toHaveLength(0);
    });
  });
});

describe("bosses", () => {
  it("Captain Clank's shield blocks hits from the front until he's dazed", () => {
    const game = newGame();
    game.inventory.owned.add("sword");
    enter(game, "bramblekeep:0,2", 4, 5, "left", true);
    const clank = game.enemies[0];
    clank.facing = "right";
    clank.mode = "windup";
    clank.timer = 999;
    placeHero(game, { roomId: game.roomId, x: 94, y: 82, facing: "left" });

    tap(game, "sword");
    step(game, IDLE, SWING_FRAMES);
    expect(clank.hp).toBe(6);
    expect(sounds(game)).toContain("clink");

    clank.mode = "stunned";
    placeHero(game, { roomId: game.roomId, x: 94, y: 82, facing: "left" });
    tap(game, "sword");
    step(game, IDLE, SWING_FRAMES);
    expect(clank.hp).toBe(5);
  });

  it("never traps you inside a chest that appears where you're standing", () => {
    const game = newGame();
    enter(game, "bramblekeep:0,2", 4, 5, "left", true);
    // Stand exactly where the Switcheroo chest will appear, then beat Clank.
    heroAt(game, 7, 5, "down");
    const clank = game.enemies[0];
    clank.x = 200;
    clank.y = 140;
    damageEnemy(game, clank, 99, null);
    for (let i = 0; i < 200 && game.tiles[5][7] !== "C"; i++) step(game);
    expect(game.tiles[5][7]).toBe("C");

    const chest = { x: 7 * 16, y: 5 * 16, w: 16, h: 16 };
    const hero = game.hero;
    const overlapping = hero.x < chest.x + chest.w && hero.x + hero.w > chest.x && hero.y < chest.y + chest.h && hero.y + hero.h > chest.y;
    expect(overlapping).toBe(false);
    const before = { x: hero.x, y: hero.y };
    step(game, input({ down: true }), 10);
    step(game, input({ left: true }), 10);
    expect(hero.x !== before.x || hero.y !== before.y).toBe(true);
  });

  it("Thornback shrugs off hits from the front but not from behind", () => {
    const game = newGame();
    game.inventory.owned.add("sword");
    enter(game, "bramblekeep:1,0", 7.5, 7, "up", true);
    const boss = game.enemies[0];
    boss.angle = 0;
    boss.stunFrames = 500;

    placeHero(game, { roomId: game.roomId, x: 122, y: 78, facing: "up" });
    tap(game, "sword");
    step(game, IDLE, SWING_FRAMES);
    expect(boss.hp).toBe(12);

    step(game, IDLE, 40);
    placeHero(game, { roomId: game.roomId, x: 122, y: 24, facing: "down" });
    tap(game, "sword");
    step(game, IDLE, SWING_FRAMES);
    expect(boss.hp).toBe(11);
  });

  it("swapping with Thornback leaves it facing the wrong way", () => {
    const game = newGame();
    game.inventory.owned.add("switcheroo");
    enter(game, "bramblekeep:1,0", 7.5, 7, "up", true);
    const boss = game.enemies[0];
    boss.angle = 0;
    boss.mode = "idle";
    boss.timer = 999;
    placeHero(game, { roomId: game.roomId, x: 122, y: 114, facing: "up" });
    expect(thornbackExposed(boss, game.hero)).toBe(false);

    tap(game, "tool");
    for (let i = 0; i < 30 && centerOf(game.hero).y > centerOf(boss).y; i++) step(game);
    expect(centerOf(game.hero).y).toBeLessThan(centerOf(boss).y);
    expect(thornbackExposed(boss, game.hero)).toBe(true);
  });

  it("has pots in its lair that break under the sword", () => {
    const game = newGame();
    game.inventory.owned.add("sword");
    game.flags.add(flags.boss("thornback"));
    enter(game, "bramblekeep:1,0", 3, 9, "left");
    expect(game.tiles[9][2]).toBe("p");
    tap(game, "sword");
    step(game, IDLE, SWING_FRAMES);
    expect(game.tiles[9][2]).toBe("_");
    expect(sounds(game)).toContain("potBreak");
  });

  it("hides a heart in about half of its pots", () => {
    const game = newGame();
    let hearts = 0;
    for (let i = 0; i < 400; i++) {
      game.drops = [];
      rollDrop(game, 0, 0, "pot");
      hearts += game.drops.filter((d) => d.kind === "heart").length;
    }
    expect(hearts).toBeGreaterThan(160);
    expect(hearts).toBeLessThan(240);
  });

  it("Thornback smashes any pots it charges through", () => {
    const game = newGame();
    enter(game, "bramblekeep:1,0", 12, 8, "up", true);
    const boss = game.enemies[0];
    Object.assign(boss, { x: 34, y: 76, mode: "charge", vx: -3.2, vy: 0, timer: 100 });
    expect(game.tiles[5][1]).toBe("p");
    step(game, IDLE, 3);
    expect(game.tiles[5][1]).toBe("_");
  });

  it("leaves the Sunstone behind, and picking it up wins the game", () => {
    const game = newGame();
    game.flags.add(flags.boss("thornback"));
    enter(game, "bramblekeep:1,0", 7.5, 8, "up");
    const sunstone = game.drops.find((d) => d.kind === "sunstone")!;
    expect(sunstone).toBeDefined();
    const c = centerOf(sunstone);
    placeHero(game, { roomId: game.roomId, x: c.x - 6, y: c.y - 6, facing: "up" });
    step(game, IDLE, 30);
    expect(game.hero.holding).toBe("sunstone");
    finishDialogs(game);
    expect(game.status).toBe("won");
    expect(game.events).toContainEqual({ type: "won" });

    // Winning isn't the end: you can head back out and keep exploring.
    keepPlaying(game);
    expect(game.status).toBe("playing");
    const y = game.hero.y;
    step(game, input({ down: true }), 10);
    expect(game.hero.y).toBeGreaterThan(y);
  });
});

describe("the road to Fernwhistle", () => {
  it("is cut off by a gorge, its drawbridge jammed up", () => {
    const game = newGame();
    enter(game, "overworld:2,1", 12.5, 7, "up");
    expect(game.tiles[5][12]).toBe("v");
    step(game, input({ up: true }), 30);
    expect(game.hero.action).toBe("fall");
  });

  it("comes down when Thornback does, with a quake you feel all the way across the forest", () => {
    const game = newGame();
    enter(game, THORNBACK_ROOM, 7.5, 8, "up");
    const boss = createEnemy(game, "thornback", 7.5, 4);
    game.enemies = [boss];
    finishBoss(game, boss);
    expect(game.dialog?.pages).toEqual(QUAKE_PAGES);
    expect(sounds(game)).toContain("quake");
    expect(game.shake).toBeGreaterThan(60);
    finishDialogs(game);

    enter(game, "overworld:2,1", 12.5, 7, "up");
    expect(game.tiles[5][12]).toBe("=");
    step(game, input({ up: true }), 60);
    expect(game.hero.action).toBe("none");
    expect(game.hero.y).toBeLessThan(4 * 16);
  });

  it("leads into Fernwhistle, a room so big the camera follows you around it", () => {
    const game = newGame();
    game.flags.add(flags.boss("thornback"));
    enter(game, "overworld:2,1", 14, 2, "right");
    step(game, input({ right: true }), 30);
    expect(game.roomId).toBe(FERNWHISTLE);
    step(game, IDLE, SCROLL_FRAMES);
    expect(game.transition).toBeNull();
    // Eastfield is the second screen down, so its row 2 is the village's row 13.
    expect(Math.floor((game.hero.y + game.hero.h / 2) / 16)).toBe(13);

    // Against the village's west edge the view stops at the edge...
    const start = cameraFor(game.roomId, game.hero);
    expect(start.x).toBe(0);
    expect(start.y).toBe(Math.round(game.hero.y + game.hero.h / 2 - 88));
    // ...and out in the middle it keeps the hero centered.
    step(game, input({ right: true }), 200);
    expect(game.roomId).toBe(FERNWHISTLE);
    expect(cameraFor(game.roomId, game.hero).x).toBe(Math.round(game.hero.x + game.hero.w / 2 - 128));
  });

  it("fills in the village on the map one screen at a time", () => {
    const game = newGame();
    game.flags.add(flags.boss("thornback"));
    enter(game, FERNWHISTLE, 2, 13, "right");
    expect(game.flags.has(flags.seen("overworld:3,1"))).toBe(true);
    expect(game.flags.has(flags.seen("overworld:4,1"))).toBe(false);
    expect(game.flags.has(flags.seen("overworld:3,0"))).toBe(false);
    step(game, input({ right: true }), 220);
    expect(game.flags.has(flags.seen("overworld:4,1"))).toBe(true);
  });

  it("saves and restores a spot anywhere in the big room", () => {
    const game = newGame();
    game.respawn = { roomId: FERNWHISTLE, x: 400, y: 300, facing: "down" };
    const save = sanitizeSave(JSON.parse(JSON.stringify(snapshotSave(game))));
    expect(save?.respawn).toEqual(game.respawn);
  });
});

describe("Fernwhistle's side quests", () => {
  function inFernwhistle(col: number, row: number, facing: Direction): GameState {
    const game = newGame();
    game.flags.add(flags.boss("thornback"));
    enter(game, FERNWHISTLE, col, row, facing);
    return game;
  }

  it("has ducklings that run from you when you get close", () => {
    const game = inFernwhistle(24, 15, "down");
    const duck = game.npcs.find((n) => n.tag === "duckling-square")!;
    const before = distance(centerOf(duck), centerOf(game.hero));
    step(game, input({ down: true }), 12);
    expect(duck.fleeing).toBe(true);
    expect(sounds(game)).toContain("peep");
    step(game, IDLE, 20);
    expect(distance(centerOf(duck), centerOf(game.hero))).toBeGreaterThan(before - 12);
  });

  it("catches a duckling you walk right up to, and sends it home to the pond", () => {
    const game = inFernwhistle(22, 18, "right");
    const duck = game.npcs.find((n) => n.tag === "duckling-square")!;
    placeHero(game, { roomId: game.roomId, x: duck.x - game.hero.w - 1, y: duck.y - 2, facing: "right" });
    step(game);
    expect(game.flags.has(flags.found("duckling-square"))).toBe(true);
    expect(game.dialog?.pages[0]).toMatch(/1 of 4/);
    finishDialogs(game);
    const home = boxAtTile(19, 26, duck.w, duck.h);
    expect({ x: duck.x, y: duck.y }).toEqual(home);
    expect(duck.wanders).toBe(false);
  });

  it("gets you Mama Mallard's spare Flippers once all four are home", () => {
    const game = newGame();
    game.flags.add(flags.boss("thornback"));
    for (const tag of DUCKLINGS) game.flags.add(flags.found(tag));
    enter(game, FERNWHISTLE, 19, 25, "right");
    expect(game.npcs.filter((n) => n.kind === "duckling").every((n) => !n.wanders)).toBe(true);
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Mama Mallard");
    finishDialogs(game);
    expect(game.inventory.owned.has("flippers")).toBe(true);
    expect(game.flags.has(flags.ducklingsThanked)).toBe(true);
  });

  it("delivers Pidge's letter to Mossbeard, and his reply to Marigold, for a heart container", () => {
    const game = newGame();
    enter(game, "interior:2,0", 7.5, 5, "up");
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Postmaster Pidge");
    finishDialogs(game);
    expect(game.flags.has(flags.letter)).toBe(true);

    enter(game, "overworld:1,2", 4, 8, "down");
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Mossbeard");
    finishDialogs(game);
    expect(game.flags.has(flags.letter)).toBe(false);
    expect(game.flags.has(flags.reply)).toBe(true);

    const hearts = game.hero.maxHp;
    enter(game, "interior:6,0", 9.5, 5, "up");
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Marigold");
    finishDialogs(game);
    expect(game.flags.has(flags.reply)).toBe(false);
    expect(game.flags.has(flags.mailDelivered)).toBe(true);
    expect(game.hero.maxHp).toBe(hearts + 2);
  });

  it("plays hide and seek: talk to a hider to find them, and Tilly pays up for all three", () => {
    const game = inFernwhistle(21, 2, "left");
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Pip");
    finishDialogs(game);
    expect(game.flags.has(flags.found("pip"))).toBe(true);
    // Off he goes, back to the square.
    const pip = game.npcs.find((n) => n.kind === "pip")!;
    expect({ x: pip.x, y: pip.y }).toEqual(boxAtTile(19, 20, 12, 12));

    heroAt(game, 11, 2, "left");
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Bo");
    finishDialogs(game);

    enter(game, "interior:3,0", 13, 3, "left");
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Fern");
    finishDialogs(game);
    // She's gone home: not here any more, but in the square.
    expect(game.npcs.some((n) => n.kind === "fern")).toBe(false);
    enter(game, FERNWHISTLE, 18, 18, "down");
    expect(game.npcs.some((n) => n.kind === "fern")).toBe(true);

    const gems = game.inventory.gems;
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Tilly");
    finishDialogs(game);
    expect(game.inventory.gems).toBe(gems + 50);
    expect(game.flags.has(flags.seekPrize)).toBe(true);
  });

  it("dives up the Mayor's ring from beside the pier, and he trades a heart container for it", () => {
    const game = inFernwhistle(5, 30, "down");
    game.inventory.owned.add("flippers");
    step(game);
    tap(game, "sword");
    step(game, IDLE, DIVE_REACH_FRAMES + 2);
    expect(game.hero.holding).toBe("ring");
    finishDialogs(game);
    expect(game.flags.has(flags.ring)).toBe(true);

    const hearts = game.hero.maxHp;
    heroAt(game, 7.5, 28, "down");
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Mayor Bellwether");
    finishDialogs(game);
    expect(game.flags.has(flags.ring)).toBe(false);
    expect(game.flags.has(flags.ringReturned)).toBe(true);
    expect(game.hero.maxHp).toBe(hearts + 2);
  });

  it("has a baker whose buns fill your hearts right back up", () => {
    const game = newGame();
    enter(game, "interior:3,0", 5.5, 5, "up");
    game.hero.hp = 1;
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Bun");
    finishDialogs(game);
    expect(game.hero.hp).toBe(game.hero.maxHp);
  });

  it("has an inn with beds to nap in", () => {
    const game = newGame();
    enter(game, "interior:4,0", 3, 3, "left");
    tap(game, "sword");
    expect(game.dialog?.pages).toEqual(INN_BED_PAGES);
    expect(game.dialog?.choice?.options[0]).toBe("Take a nap");
  });
});

describe("the soundtrack", () => {
  it("turns menacing when the shutters slam shut on you, and calms down once the room's clear", () => {
    const game = newGame();
    // In the Hollow's doorway the shutters are still open...
    enter(game, "hollow:0,0", 7.5, 10, "up", true);
    expect(musicFor(game)).toBe("dungeon");
    // ...one step inside, they shut, and the music turns.
    step(game, input({ up: true }), 16);
    expect(game.shuttersClosed).toBe(true);
    expect(musicFor(game)).toBe("danger");

    game.enemies = [];
    step(game);
    expect(game.shuttersClosed).toBe(false);
    expect(musicFor(game)).toBe("dungeon");
  });

  it("goes quiet as a boss goes down, then plays its fanfare instead of the puzzle jingle", () => {
    const game = newGame();
    enter(game, "bramblekeep:0,2", 13, 5, "left", true);
    const clank = game.enemies[0];
    damageEnemy(game, clank, 99, null);
    expect(clank.mode).toBe("dying");
    expect(musicFor(game)).toBeNull();

    for (let i = 0; i < 200 && game.enemies.length > 0; i++) step(game);
    expect(game.tiles[5][7]).toBe("C");
    expect(sounds(game)).toContain("bossDefeated");
    expect(sounds(game)).not.toContain("puzzleSolved");
    expect(musicFor(game)).toBe("dungeon");
  });

  it("plays the menacing theme for Captain Clank and saves the boss theme for Thornback", () => {
    const game = newGame();
    enter(game, "bramblekeep:0,2", 13, 5, "left", true);
    expect(musicFor(game)).toBe("danger");
    enter(game, THORNBACK_ROOM, 7.5, 8, "up", true);
    expect(musicFor(game)).toBe("boss");
  });
});

describe("determinism", () => {
  it("plays out identically from the same seed and inputs", () => {
    const run = () => {
      const game = createGame(123);
      game.inventory.owned.add("sword");
      const script: Input[] = [input({ left: true }), input({ up: true }), input({ sword: true }, { sword: true }), IDLE];
      for (let i = 0; i < 600; i++) update(game, script[Math.floor(i / 37) % script.length]);
      return JSON.stringify({ ...game, flags: [...game.flags] });
    };
    expect(run()).toBe(run());
  });
});
