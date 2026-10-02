import { centerOf, overlaps, tileSpan } from "./collision";
import { BIG_DOOR_LOCKED_PAGES, DOOR_LOCKED_PAGES, itemGetPages, makeDialog, npcDialog } from "./dialogue";
import { directionOfVector } from "./directions";
import { addShake, playSound, spawnBurst } from "./effects";
import { flags, tileAt } from "./room";
import { OPEN_CHEST } from "./tiles";
import { ROOMS, tileKey, type ChestContents } from "./world";
import { HP_CAP, TILE, type Box, type GameState, type Hero } from "./types";

// Talking, reading, opening, unlocking: everything the action button does
// when you're facing something instead of swinging at the air.

// A thin strip just in front of the hero, where "the thing you're facing"
// lives.
export function probeBox(hero: Hero, reach = 6): Box {
  switch (hero.facing) {
    case "down":
      return { x: hero.x + 1, y: hero.y + hero.h, w: hero.w - 2, h: reach };
    case "up":
      return { x: hero.x + 1, y: hero.y - reach, w: hero.w - 2, h: reach };
    case "left":
      return { x: hero.x - reach, y: hero.y + 1, w: reach, h: hero.h - 2 };
    case "right":
      return { x: hero.x + hero.w, y: hero.y + 1, w: reach, h: hero.h - 2 };
  }
}

// Tiles under the probe, nearest the probe's center first.
function tilesAhead(state: GameState, probe: Box): { col: number; row: number; ch: string }[] {
  const { c0, c1, r0, r1 } = tileSpan(probe);
  const center = centerOf(probe);
  const found: { col: number; row: number; ch: string; d: number }[] = [];
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const ch = tileAt(state, col, row);
      if (ch === null) continue;
      const d = Math.hypot((col + 0.5) * TILE - center.x, (row + 0.5) * TILE - center.y);
      found.push({ col, row, ch, d });
    }
  }
  return found.sort((a, b) => a.d - b.d);
}

export function tryInteract(state: GameState): boolean {
  const hero = state.hero;
  const probe = probeBox(hero);

  const npc = state.npcs.find((n) => overlaps(probe, n));
  if (npc) {
    const toHero = { x: centerOf(hero).x - centerOf(npc).x, y: centerOf(hero).y - centerOf(npc).y };
    npc.facing = directionOfVector(toHero.x, toHero.y);
    npc.talkFrames = 40;
    if (npc.kind === "banjo") playSound(state, "bark");
    state.dialog = npcDialog(state, npc);
    return true;
  }

  for (const { col, row, ch } of tilesAhead(state, probe)) {
    if (ch === "s") {
      const pages = ROOMS[state.roomId].signs?.[tileKey(col, row)];
      if (pages) {
        state.dialog = makeDialog(pages);
        return true;
      }
    }
    if (ch === "C") {
      openChest(state, col, row);
      return true;
    }
    if (ch === "L" || ch === "B") {
      if (!tryUnlock(state, col, row)) {
        state.dialog = makeDialog(ch === "L" ? DOOR_LOCKED_PAGES : BIG_DOOR_LOCKED_PAGES);
      }
      return true;
    }
  }
  return false;
}

// Walking into a locked door with the right key opens it, no button needed.
export function bumpDoorAhead(state: GameState): void {
  for (const { col, row, ch } of tilesAhead(state, probeBox(state.hero, 2))) {
    if (ch === "L" || ch === "B") {
      tryUnlock(state, col, row);
      return;
    }
  }
}

function tryUnlock(state: GameState, col: number, row: number): boolean {
  const ch = state.tiles[row][col];
  const inv = state.inventory;
  if (ch === "L") {
    if (inv.smallKeys <= 0) return false;
    inv.smallKeys--;
  } else if (!inv.hasBigKey) {
    return false;
  }
  // Doors are a few tiles wide; flood-fill so the whole thing opens.
  const queue = [{ col, row }];
  while (queue.length > 0) {
    const tile = queue.pop()!;
    if (tileAt(state, tile.col, tile.row) !== ch) continue;
    state.tiles[tile.row][tile.col] = "_";
    state.flags.add(flags.door(state.roomId, tile.col, tile.row));
    spawnBurst(state, (tile.col + 0.5) * TILE, (tile.row + 0.5) * TILE, {
      count: 10,
      colors: ch === "B" ? [0xffd166, 0xfff3a0] : [0xc89b6d, 0xe8c9a0],
      speed: 1.4,
      life: 30,
      size: 2,
    });
    queue.push(
      { col: tile.col + 1, row: tile.row },
      { col: tile.col - 1, row: tile.row },
      { col: tile.col, row: tile.row + 1 },
      { col: tile.col, row: tile.row - 1 },
    );
  }
  playSound(state, "doorUnlock");
  addShake(state, 6);
  return true;
}

function openChest(state: GameState, col: number, row: number): void {
  const def = ROOMS[state.roomId].chests?.[tileKey(col, row)];
  if (!def) return;
  state.tiles[row][col] = OPEN_CHEST;
  state.flags.add(flags.chest(state.roomId, col, row));
  playSound(state, "chestOpen");
  // Big chests hold the dungeon's real treasures, and they sound like it.
  playSound(state, def.big ? "fanfare" : "itemGet");
  spawnBurst(state, (col + 0.5) * TILE, (row + 0.5) * TILE, {
    count: 20,
    colors: [0xfff3a0, 0xffffff, 0xffd166],
    speed: 1.2,
    life: 40,
    size: 1.8,
    lift: 2.5,
    gravity: 0.04,
  });
  grantChest(state, def.contents);
}

export function grantChest(state: GameState, contents: ChestContents): void {
  const inv = state.inventory;
  const hero = state.hero;
  switch (contents.item) {
    case "sword":
      inv.hasSword = true;
      break;
    case "switcheroo":
      inv.hasSwitcheroo = true;
      break;
    case "smallKey":
      inv.smallKeys++;
      break;
    case "bigKey":
      inv.hasBigKey = true;
      break;
    case "heartContainer":
      hero.maxHp = Math.min(HP_CAP, hero.maxHp + 2);
      hero.hp = hero.maxHp;
      break;
    case "gems":
      inv.gems = Math.min(999, inv.gems + contents.amount);
      break;
  }
  hero.holding = contents.item;
  hero.action = "none";
  state.dialog = makeDialog(itemGetPages(contents.item, contents.item === "gems" ? contents.amount : 0));
}
