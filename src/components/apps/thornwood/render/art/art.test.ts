import { describe, expect, it } from "vitest";
import { BOSS_NAMES } from "../../engine/actors";
import {
  BED_NO_PAGES,
  BELL_LINES,
  BUN_PAGES,
  INN_BED_PAGES,
  QUAKE_PAGES,
  BIG_DOOR_LOCKED_PAGES,
  DOOR_LOCKED_PAGES,
  GATE_LOCKED_PAGES,
  SHOP_TOO_POOR_PAGES,
  WARES_NO_PAGES,
  WARES_PAGES,
  WARES_SOLD_PAGES,
  itemGetPages,
  npcDialog,
} from "../../engine/dialogue";
import { createGame } from "../../engine/engine";
import { DUCKLINGS, HIDERS } from "../../engine/quests";
import { flags } from "../../engine/room";
import { DUCKLING_CAUGHT_PAGES } from "../../engine/townsfolk";
import { ROOMS } from "../../engine/world";
import type { ItemId, NpcKind } from "../../engine/types";
import { PALETTE } from "../palette";
import * as creatures from "./creatures";
import { GLYPHS, GLYPH_ROWS } from "./font";
import * as hero from "./hero";
import * as objects from "./objects";
import * as proc from "./procedural";

// The pixel art is plain text, so it's easy to fat-finger: a row one pixel
// short, a color code that isn't in the palette. These catch that before
// it shows up as a smeared sprite.

type ArtMap = Record<string, string[]>;

function artIn(module: Record<string, unknown>): ArtMap {
  return Object.fromEntries(
    Object.entries(module).filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && typeof entry[1][0] === "string"),
  );
}

// Full-tile art (doors, bars) and glowing effects are drawn without the
// automatic outline, so they don't need a transparent margin.
const UNOUTLINED = new Set(["DOOR", "GATE", "BARS", "FLAME", "FLAME_TALL", "BOLT_A", "BOLT_B", "STAR", "SPARKLE"]);

const ALL_ART: ArtMap = {
  ...artIn(hero),
  ...artIn(creatures),
  ...artIn(objects),
  tree: proc.tree(1),
  crystal: proc.crystal(),
  pedestal: proc.pedestal(),
  statue: proc.statue("swappable"),
  heartContainer: proc.heartContainer(),
  sunstone: proc.sunstone(0),
  clank: proc.clank("down", false),
  clankSide: proc.clank("right", true),
  thornback: proc.thornback(false),
  poof: proc.poof(2),
};

describe("pixel art", () => {
  it.each(Object.keys(ALL_ART))("%s is a clean rectangle of palette colors", (name) => {
    const art = ALL_ART[name];
    const width = art[0].length;
    for (const row of art) {
      expect(row, `${name}: ragged row`).toHaveLength(width);
      for (const ch of row) expect(ch === "." || ch in PALETTE, `${name}: unknown color "${ch}"`).toBe(true);
    }
  });

  it.each(Object.keys(ALL_ART).filter((name) => !UNOUTLINED.has(name)))("%s leaves room for its outline", (name) => {
    const art = ALL_ART[name];
    const last = art.length - 1;
    expect(art[0].replace(/\./g, ""), `${name}: top row`).toBe("");
    expect(art[last].replace(/\./g, ""), `${name}: bottom row`).toBe("");
    for (const row of art) {
      expect(row[0], `${name}: left edge`).toBe(".");
      expect(row[row.length - 1], `${name}: right edge`).toBe(".");
    }
  });

  it("draws the hero's frames all the same size", () => {
    const frames = Object.entries(artIn(hero)).filter(([name]) => name.startsWith("HERO_"));
    for (const [name, art] of frames) {
      expect([art[0].length, art.length], name).toEqual([16, 24]);
    }
  });
});

describe("the bitmap font", () => {
  it.each(Object.keys(GLYPHS))("glyph %j is well-formed", (ch) => {
    const rows = GLYPHS[ch];
    expect(rows.length).toBeLessThanOrEqual(GLYPH_ROWS);
    for (const row of rows) {
      expect(row).toHaveLength(rows[0].length);
      expect(row).toMatch(/^[#.]+$/);
    }
  });

  it("can draw every line of text in the game", () => {
    const game = createGame(1);
    const texts: string[] = [];
    for (const def of Object.values(ROOMS)) {
      texts.push(def.name);
      for (const pages of Object.values(def.signs ?? {})) texts.push(...pages);
      for (const options of Object.values(def.examine ?? {})) texts.push(...options.flat());
      texts.push(...(def.bed ?? []));
    }
    const items: ItemId[] = [
      "sword",
      "switcheroo",
      "flippers",
      "smallKey",
      "bigKey",
      "gateKey",
      "heartContainer",
      "sunstone",
      "gems",
      "letter",
      "reply",
      "ring",
    ];
    for (const item of items) texts.push(...itemGetPages(item, 20));
    texts.push(...DOOR_LOCKED_PAGES, ...BIG_DOOR_LOCKED_PAGES, ...GATE_LOCKED_PAGES, ...SHOP_TOO_POOR_PAGES);
    texts.push(...QUAKE_PAGES, ...BUN_PAGES, ...INN_BED_PAGES);
    for (let caught = 1; caught <= DUCKLINGS.length; caught++) texts.push(...DUCKLING_CAUGHT_PAGES(caught, DUCKLINGS.length));
    texts.push(...BED_NO_PAGES, ...WARES_PAGES, ...WARES_NO_PAGES, ...WARES_SOLD_PAGES, ...BELL_LINES.flat());
    texts.push("Take a nap", "Not now", "Buy it", "Letter", "Reply", "Ring");
    for (const boss of Object.values(BOSS_NAMES)) texts.push(boss.name.toUpperCase(), boss.title.toUpperCase());

    // Every NPC at every stage of the story, and of Fernwhistle's quests.
    const kinds: NpcKind[] = [
      "nana",
      "banjo",
      "ribbit",
      "moanica",
      "fumbleton",
      "mossbeard",
      "pinch",
      "stout",
      "mallard",
      "duckling",
      "pidge",
      "marigold",
      "bellwether",
      "tilly",
      "bo",
      "pip",
      "fern",
      "bun",
      "hopsworth",
      "ott",
    ];
    const stages = [
      () => {},
      () => {
        game.flags.add(flags.nanaSword).add(flags.banjoGift).add(flags.shopHeart);
        game.inventory.gateKey = true;
        game.flags.add(flags.chest("hollow:0,0", 7, 5));
      },
      () => {
        game.inventory.owned.add("switcheroo");
        game.inventory.owned.add("flippers");
      },
      () => {
        game.flags.add(flags.sunstone).add(flags.chest("overworld:2,2", 10, 9)).add(flags.sunken("overworld:2,2", 4, 9));
        game.flags.add(flags.boss("thornback")).add(flags.letter).add(flags.found(DUCKLINGS[0])).add(flags.found(HIDERS[0]));
      },
      () => {
        game.flags.delete(flags.letter);
        game.flags.add(flags.reply).add(flags.ring);
        for (const tag of [...DUCKLINGS, ...HIDERS]) game.flags.add(flags.found(tag));
      },
      () => {
        game.flags.delete(flags.reply);
        game.flags.delete(flags.ring);
        game.flags.add(flags.mailDelivered).add(flags.ringReturned).add(flags.ducklingsThanked).add(flags.seekPrize);
      },
    ];
    for (const advance of stages) {
      advance();
      for (const kind of kinds) {
        const npc = { id: 0, kind, x: 0, y: 0, w: 12, h: 12, facing: "down" as const, wanders: false, vx: 0, vy: 0, timer: 0, anim: 0, talkFrames: 0, tag: kind, home: null, fleeing: false };
        for (let i = 0; i < 6; i++) {
          const dialog = npcDialog(game, npc);
          texts.push(...dialog.pages, dialog.speaker ?? "", ...(dialog.choice?.options ?? []), ...(dialog.choice?.noPages ?? []));
        }
      }
    }

    const missing = new Set<string>();
    for (const text of texts) for (const ch of text) if (!(ch in GLYPHS)) missing.add(ch);
    expect([...missing]).toEqual([]);
  });
});
