import * as creatures from "./art/creatures";
import * as hero from "./art/hero";
import * as objects from "./art/objects";
import * as proc from "./art/procedural";
import { flipX, flipY, recolor, rotateCCW, rotateCW, sprite, toSprite, type Art, type Sprite } from "./pixelart";

// Every sprite in the game, compiled once into canvases. Facing variants
// come from mirroring and rotating, palette variants from recoloring.

type Facings<T> = { down: T; up: T; right: T; left: T };

function facings(down: Art[], up: Art[], right: Art[]): Facings<Sprite[]> {
  return {
    down: down.map(sprite),
    up: up.map(sprite),
    right: right.map(sprite),
    left: right.map((art) => sprite(flipX(art))),
  };
}

// Down/up walk cycles are stand, step, stand, mirrored step.
function walkCycle(stand: Art, step: Art): Art[] {
  return [stand, step, stand, flipX(step)];
}

// A villager with their eyes open, and shut for blinking.
export type Blinker = { open: Sprite; shut: Sprite };

function blinker(open: Art, shut: Art): Blinker {
  return { open: sprite(open), shut: sprite(shut) };
}

// A knight, down-facing, glancing to either side.
function glances(colors: Record<string, string> = {}): { left: Sprite; right: Sprite } {
  return {
    left: sprite(recolor(creatures.KNIGHT_DOWN_LOOK_LEFT, colors)),
    right: sprite(recolor(creatures.KNIGHT_DOWN_LOOK_RIGHT, colors)),
  };
}

const KNIGHT_TO_FUMBLETON = { r: "b", R: "B", y: "c", z: "w", n: "N" };
const KNIGHT_TO_STOUT = { r: "g", R: "G", n: "N" };
// Tilly and the hide-and-seek gang: hair, skin, then clothes.
const KIDS = {
  tilly: {},
  bo: { j: "C", h: "e", H: "e", s: "n", S: "N", x: "N", n: "N", r: "g", R: "G" },
  pip: { j: "z", h: "y", H: "Y", r: "b", R: "B" },
  fern: { j: "n", h: "N", H: "e", S: "x", s: "S", x: "N", r: "f", R: "F" },
};
const TO_BLUE = { r: "t", R: "T", q: "u" };

function build() {
  const heroSprites = {
    walk: facings(
      walkCycle(hero.HERO_DOWN, hero.HERO_DOWN_STEP),
      walkCycle(hero.HERO_UP, hero.HERO_UP_STEP),
      [hero.HERO_RIGHT, hero.HERO_RIGHT_STEP, hero.HERO_RIGHT, hero.HERO_RIGHT_STEP],
    ),
    // One pose per stretch of the sword's arc (see hero.ts). Facing left,
    // the arc comes up from below rather than over the top, so it has low
    // poses of its own.
    swing: {
      down: [hero.HERO_DOWN_SWING_A, hero.HERO_DOWN_SWING_B, hero.HERO_DOWN_SWING_C].map(sprite),
      up: [hero.HERO_UP_SWING_A, hero.HERO_UP_SWING_B, hero.HERO_UP_SWING_C].map(sprite),
      right: [hero.HERO_RIGHT_SWING_A, hero.HERO_RIGHT_SWING_B, hero.HERO_RIGHT_SWING_C].map(sprite),
      left: [hero.HERO_LEFT_SWING_A, hero.HERO_LEFT_SWING_B, hero.HERO_RIGHT_SWING_C].map((art) => sprite(flipX(art))),
    } satisfies Facings<Sprite[]>,
    // From behind there are no eyes to shut.
    blink: { down: sprite(hero.HERO_DOWN_BLINK), right: sprite(hero.HERO_RIGHT_BLINK), left: sprite(flipX(hero.HERO_RIGHT_BLINK)) },
    hold: sprite(hero.HERO_HOLD),
    collapsed: sprite(rotateCW(hero.HERO_DOWN)),
  };

  const sword = {
    down: sprite(hero.SWORD),
    up: sprite(flipY(hero.SWORD)),
    right: sprite(rotateCCW(hero.SWORD)),
    left: sprite(rotateCW(hero.SWORD)),
    downRight: sprite(hero.SWORD_DIAGONAL),
    downLeft: sprite(flipX(hero.SWORD_DIAGONAL)),
    upRight: sprite(flipY(hero.SWORD_DIAGONAL)),
    upLeft: sprite(flipX(flipY(hero.SWORD_DIAGONAL))),
  };

  const mapIcon = sprite(hero.MAP_ICON);

  const wand = {
    right: sprite(hero.WAND),
    left: sprite(flipX(hero.WAND)),
    down: sprite(rotateCW(hero.WAND)),
    up: sprite(rotateCCW(hero.WAND)),
  };

  const knightDown = [creatures.KNIGHT_DOWN, creatures.KNIGHT_DOWN_STEP];
  const knightUp = [creatures.KNIGHT_UP, creatures.KNIGHT_UP_STEP];
  const knightRight = [creatures.KNIGHT_RIGHT, creatures.KNIGHT_RIGHT_STEP];
  const fumble = (arts: Art[]) => arts.map((a) => recolor(a, KNIGHT_TO_FUMBLETON));
  const kid = (colors: Record<string, string>) => blinker(recolor(creatures.KID, colors), recolor(creatures.KID_BLINK, colors));

  const enemies = {
    jellop: [sprite(creatures.JELLOP_A), sprite(creatures.JELLOP_B)],
    flitter: [sprite(creatures.FLITTER_A), sprite(creatures.FLITTER_B)],
    knight: facings(knightDown, knightUp, knightRight),
    knightGlance: glances(),
    spitbug: facings([creatures.SPITBUG_DOWN], [creatures.SPITBUG_UP], [creatures.SPITBUG_RIGHT]),
    clank: facings(
      [proc.clank("down", false), proc.clank("down", true)],
      [proc.clank("up", false), proc.clank("up", true)],
      [proc.clank("right", false), proc.clank("right", true)],
    ),
    thornback: [sprite(proc.thornback(false)), sprite(proc.thornback(true))],
  };

  const npcs = {
    nana: { still: sprite(creatures.NANA), glint: [sprite(creatures.NANA_GLINT_A), sprite(creatures.NANA_GLINT_B)] },
    haggleby: blinker(creatures.HAGGLEBY, creatures.HAGGLEBY_BLINK),
    ghost: [sprite(creatures.GHOST_A), sprite(creatures.GHOST_B)],
    banjo: facings([creatures.BANJO_DOWN], [creatures.BANJO_UP], [creatures.BANJO_RIGHT, creatures.BANJO_RIGHT_STEP]),
    banjoBlink: {
      down: sprite(creatures.BANJO_DOWN_BLINK),
      right: sprite(creatures.BANJO_RIGHT_BLINK),
      left: sprite(flipX(creatures.BANJO_RIGHT_BLINK)),
    },
    fumbleton: facings(fumble(knightDown), fumble(knightUp), fumble(knightRight)),
    fumbletonGlance: glances(KNIGHT_TO_FUMBLETON),
    mossbeard: blinker(creatures.MOSSBEARD, creatures.MOSSBEARD_BLINK),
    pinch: sprite(creatures.PINCH),
    stout: facings(
      [recolor(creatures.KNIGHT_DOWN, KNIGHT_TO_STOUT)],
      [recolor(creatures.KNIGHT_UP, KNIGHT_TO_STOUT)],
      [recolor(creatures.KNIGHT_RIGHT, KNIGHT_TO_STOUT)],
    ),
    stoutGlance: glances(KNIGHT_TO_STOUT),
    mallard: blinker(creatures.MALLARD, creatures.MALLARD_BLINK),
    duckling: {
      right: [sprite(creatures.DUCKLING_A), sprite(creatures.DUCKLING_B)],
      left: [sprite(flipX(creatures.DUCKLING_A)), sprite(flipX(creatures.DUCKLING_B))],
    },
    pidge: blinker(creatures.PIDGE, creatures.PIDGE_BLINK),
    marigold: blinker(creatures.MARIGOLD, creatures.MARIGOLD_BLINK),
    bellwether: sprite(creatures.BELLWETHER),
    kids: {
      tilly: kid(KIDS.tilly),
      bo: kid(KIDS.bo),
      pip: kid(KIDS.pip),
      fern: kid(KIDS.fern),
    },
    bun: blinker(creatures.BUN, creatures.BUN_BLINK),
    hopsworth: blinker(creatures.HOPSWORTH, creatures.HOPSWORTH_BLINK),
    ott: blinker(creatures.OTT, creatures.OTT_BLINK),
  };

  const items = {
    gem: sprite(objects.GEM),
    bigGem: sprite(recolor(objects.GEM, { g: "t", l: "u", G: "T" })),
    heart: sprite(proc.heart(7)),
    heartContainer: sprite(proc.heartContainer()),
    smallKey: sprite(objects.SMALL_KEY),
    bigKey: sprite(objects.BIG_KEY),
    gateKey: sprite(recolor(objects.BIG_KEY, { y: "g", z: "l", Y: "G", r: "y" })),
    flippers: sprite(objects.FLIPPERS),
    letter: sprite(objects.LETTER),
    reply: sprite(recolor(objects.LETTER, { w: "m", E: "n", r: "g" })),
    ring: sprite(objects.RING),
    sunstone: [sprite(proc.sunstone(0)), sprite(proc.sunstone(1))],
    seed: sprite(objects.SEED),
    thorn: sprite(objects.THORN),
    bolt: [toSprite(objects.BOLT_A), toSprite(objects.BOLT_B)],
    star: toSprite(objects.STAR),
    question: sprite(objects.QUESTION),
    sparkle: toSprite(objects.SPARKLE),
  };

  const props = {
    bush: sprite(objects.BUSH),
    rock: sprite(objects.ROCK),
    pot: sprite(objects.POT),
    sign: sprite(objects.SIGN),
    chest: {
      closed: sprite(objects.CHEST_CLOSED),
      open: sprite(objects.CHEST_OPEN),
      bigClosed: sprite(recolor(objects.CHEST_CLOSED, { n: "b", m: "c", N: "B" })),
      bigOpen: sprite(recolor(objects.CHEST_OPEN, { n: "b", m: "c", N: "B" })),
    },
    brazier: sprite(objects.BRAZIER),
    flame: [toSprite(objects.FLAME), toSprite(flipX(objects.FLAME)), toSprite(objects.FLAME_TALL)],
    peg: {
      r: { up: sprite(objects.PEG_UP), down: sprite(objects.PEG_DOWN) },
      u: { up: sprite(recolor(objects.PEG_UP, TO_BLUE)), down: sprite(recolor(objects.PEG_DOWN, TO_BLUE)) },
    },
    switchOrb: { red: sprite(objects.SWITCH), blue: sprite(recolor(objects.SWITCH, TO_BLUE)) },
    plate: { up: sprite(objects.PLATE_UP), down: sprite(objects.PLATE_DOWN) },
    door: { across: toSprite(objects.DOOR), along: toSprite(rotateCW(objects.DOOR)) },
    bigDoor: (() => {
      const art = recolor(objects.DOOR, { n: "R", N: "e", m: "r", A: "y" });
      return { across: toSprite(art), along: toSprite(rotateCW(art)) };
    })(),
    bars: { across: toSprite(objects.BARS), along: toSprite(rotateCW(objects.BARS)) },
    gate: toSprite(objects.GATE),
    goldBars: (() => {
      const art = recolor(objects.BARS, { a: "z", A: "y", i: "Y" });
      return { across: toSprite(art), along: toSprite(rotateCW(art)) };
    })(),
    trees: [sprite(proc.tree(1)), sprite(proc.tree(7)), sprite(proc.tree(13))],
    crystal: sprite(proc.crystal()),
    pedestal: sprite(proc.pedestal()),
    statue: { plain: sprite(proc.statue("plain")), swappable: sprite(proc.statue("swappable")), mossy: sprite(proc.statue("mossy")) },
    poof: [sprite(proc.poof(0)), sprite(proc.poof(1)), sprite(proc.poof(2))],
  };

  const hud = {
    heart: { full: sprite(proc.heart(7)), half: sprite(proc.heart(7, "half")), empty: sprite(proc.heart(7, "empty")) },
  };

  return { hero: heroSprites, sword, wand, mapIcon, enemies, npcs, items, props, hud };
}

export type Sprites = ReturnType<typeof build>;

let sprites: Sprites | null = null;

export function getSprites(): Sprites {
  sprites ??= build();
  return sprites;
}
