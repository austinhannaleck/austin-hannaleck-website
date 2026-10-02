import { describe, expect, it } from "vitest";
import { createEnemy } from "./actors";
import { thornbackExposed } from "./bosses";
import { centerOf } from "./collision";
import { damageEnemy, rollDrop } from "./combat";
import { continueAfterDeath, createGame, keepPlaying, update } from "./engine";
import { flags, loadRoom, pegRaised } from "./room";
import { sanitizeSave, snapshotSave } from "./save";
import { arriveInRoom, placeHero } from "./transitions";
import {
  DYING_FRAMES,
  FALL_FRAMES,
  HERO_SPEED,
  SCROLL_FRAMES,
  SWING_FRAMES,
  noButtons,
  type Buttons,
  type Direction,
  type GameState,
  type Input,
} from "./types";
import { spawnAtTile } from "./world";

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
    expect(game.inventory.hasSword).toBe(false);
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
    expect(game.inventory.hasSword).toBe(true);
    expect(game.flags.has(flags.nanaSword)).toBe(true);
    expect(game.hero.holding).toBeNull();
    // Closing the dialog doesn't also swing the sword.
    expect(game.hero.action).toBe("none");
  });

  it("can buy a heart container from Ribbit", () => {
    const game = newGame();
    game.inventory.gems = 50;
    heroAt(game, 13, 4, "up");
    tap(game, "sword");
    expect(game.dialog?.speaker).toBe("Ribbit");
    finishDialogs(game);
    expect(game.inventory.gems).toBe(10);
    expect(game.hero.maxHp).toBe(8);
    expect(game.hero.hp).toBe(8);
  });
});

describe("combat", () => {
  it("cuts bushes", () => {
    const game = newGame();
    game.inventory.hasSword = true;
    heroAt(game, 1, 5, "left");
    expect(game.tiles[5][0]).toBe("b");
    tap(game, "sword");
    step(game, IDLE, SWING_FRAMES);
    expect(game.tiles[5][0]).toBe(".");
  });

  it("knocks enemies back, and enough hits finish them off", () => {
    const game = newGame();
    game.inventory.hasSword = true;
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

  it("opens locked doors with a small key, and they stay open", () => {
    const game = newGame();
    enter(game, "bramblekeep:1,2", 1, 4, "left");
    tap(game, "sword");
    expect(game.dialog?.pages[0]).toMatch(/locked/i);
    finishDialogs(game);

    game.inventory.smallKeys = 1;
    tap(game, "sword");
    expect(game.tiles[4][0]).toBe("_");
    expect(game.tiles[5][0]).toBe("_");
    expect(game.inventory.smallKeys).toBe(0);

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

describe("dungeon mechanics", () => {
  it("plays a fanfare for the treasure in a big chest", () => {
    const game = newGame();
    game.flags.add(flags.bluePegs);
    enter(game, "bramblekeep:2,1", 13, 1, "right");
    tap(game, "sword");
    expect(game.inventory.hasBigKey).toBe(true);
    expect(sounds(game)).toContain("fanfare");
    expect(sounds(game)).not.toContain("itemGet");
  });

  it("shuts you in until every enemy is beaten, then reveals the chest", () => {
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
    expect(sounds(game)).toContain("chestAppear");
  });

  it("swaps places across the chasm with the Switcheroo", () => {
    const game = newGame();
    game.inventory.hasSwitcheroo = true;
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
    game.inventory.hasSwitcheroo = true;
    enter(game, "bramblekeep:0,1", 2, 2, "right");
    step(game);
    expect(game.barsOpen).toBe(true);

    tap(game, "tool");
    step(game, IDLE, 60);
    expect(centerOf(game.hero).x).toBeGreaterThan(180);
    step(game, input({ down: true }), 20);
    expect(game.barsOpen).toBe(true);
  });

  it("flips the crystal switch with a bolt from across the pit", () => {
    const game = newGame();
    game.inventory.hasSwitcheroo = true;
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

  it("come back in the overworld, the classic way", () => {
    const game = newGame();
    enter(game, "overworld:0,1", 7, 5, "down", true);
    defeat(game, 0);
    loadRoom(game, "overworld:0,1");
    expect(game.enemies).toHaveLength(3);
  });
});

describe("bosses", () => {
  it("Captain Clank's shield blocks hits from the front until he's dazed", () => {
    const game = newGame();
    game.inventory.hasSword = true;
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
    game.inventory.hasSword = true;
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
    game.inventory.hasSwitcheroo = true;
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
    game.inventory.hasSword = true;
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

describe("determinism", () => {
  it("plays out identically from the same seed and inputs", () => {
    const run = () => {
      const game = createGame(123);
      game.inventory.hasSword = true;
      const script: Input[] = [input({ left: true }), input({ up: true }), input({ sword: true }, { sword: true }), IDLE];
      for (let i = 0; i < 600; i++) update(game, script[Math.floor(i / 37) % script.length]);
      return JSON.stringify({ ...game, flags: [...game.flags] });
    };
    expect(run()).toBe(run());
  });
});
