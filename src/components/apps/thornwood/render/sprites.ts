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

const KNIGHT_TO_FUMBLETON = { r: "b", R: "B", y: "c", z: "w", n: "N" };
const TO_BLUE = { r: "t", R: "T", q: "u" };

function build() {
  const heroSprites = {
    walk: facings(
      walkCycle(hero.HERO_DOWN, hero.HERO_DOWN_STEP),
      walkCycle(hero.HERO_UP, hero.HERO_UP_STEP),
      [hero.HERO_RIGHT, hero.HERO_RIGHT_STEP, hero.HERO_RIGHT, hero.HERO_RIGHT_STEP],
    ),
    attack: facings([hero.HERO_DOWN_ATTACK], [hero.HERO_UP_ATTACK], [hero.HERO_RIGHT_ATTACK]),
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

  const enemies = {
    jellop: [sprite(creatures.JELLOP_A), sprite(creatures.JELLOP_B)],
    flitter: [sprite(creatures.FLITTER_A), sprite(creatures.FLITTER_B)],
    knight: facings(knightDown, knightUp, knightRight),
    spitbug: facings([creatures.SPITBUG_DOWN], [creatures.SPITBUG_UP], [creatures.SPITBUG_RIGHT]),
    clank: facings(
      [proc.clank("down", false), proc.clank("down", true)],
      [proc.clank("up", false), proc.clank("up", true)],
      [proc.clank("right", false), proc.clank("right", true)],
    ),
    thornback: [sprite(proc.thornback(false)), sprite(proc.thornback(true))],
  };

  const npcs = {
    nana: sprite(creatures.NANA),
    ribbit: sprite(creatures.RIBBIT),
    ghost: [sprite(creatures.GHOST_A), sprite(creatures.GHOST_B)],
    banjo: facings([creatures.BANJO_DOWN], [creatures.BANJO_UP], [creatures.BANJO_RIGHT, creatures.BANJO_RIGHT_STEP]),
    fumbleton: facings(fumble(knightDown), fumble(knightUp), fumble(knightRight)),
  };

  const items = {
    gem: sprite(objects.GEM),
    bigGem: sprite(recolor(objects.GEM, { g: "t", l: "u", G: "T" })),
    heart: sprite(proc.heart(7)),
    heartContainer: sprite(proc.heartContainer()),
    smallKey: sprite(objects.SMALL_KEY),
    bigKey: sprite(objects.BIG_KEY),
    sunstone: [sprite(proc.sunstone(0)), sprite(proc.sunstone(1))],
    seed: sprite(objects.SEED),
    thorn: sprite(objects.THORN),
    bolt: [toSprite(objects.BOLT_A), toSprite(objects.BOLT_B)],
    star: toSprite(objects.STAR),
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

  return { hero: heroSprites, sword, wand, enemies, npcs, items, props, hud };
}

export type Sprites = ReturnType<typeof build>;

let sprites: Sprites | null = null;

export function getSprites(): Sprites {
  sprites ??= build();
  return sprites;
}
