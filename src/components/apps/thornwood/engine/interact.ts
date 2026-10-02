import { centerOf, overlaps, tileSpan } from "./collision";
import {
  BED_NO_PAGES,
  BELL_LINES,
  INN_BED_PAGES,
  BIG_DOOR_LOCKED_PAGES,
  DOOR_LOCKED_PAGES,
  GATE_LOCKED_PAGES,
  WARES_NO_PAGES,
  WARES_PAGES,
  WARES_SOLD_PAGES,
  itemGetPages,
  makeDialog,
  npcDialog,
} from "./dialogue";
import { directionOfVector } from "./directions";
import { addShake, playSound, spawnBurst } from "./effects";
import { settleEquipped } from "./inventory";
import { HIDERS, catchDuckling } from "./quests";
import { flags, openedDoor, tileAt } from "./room";
import { randomPick } from "./rng";
import { OPEN_CHEST } from "./tiles";
import { ROOMS, dungeonOf, tileKey, type ChestContents } from "./world";
import { HP_CAP, TILE, type Box, type GameState, type Hero, type Npc } from "./types";

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
    talkTo(state, npc);
    return true;
  }

  for (const { col, row, ch } of tilesAhead(state, probe)) {
    const looks = ROOMS[state.roomId].examine?.[tileKey(col, row)];
    if (looks) {
      state.dialog = makeDialog(randomPick(state, looks));
      return true;
    }
    if (ch === "Z") {
      const pages = ROOMS[state.roomId].bed ?? INN_BED_PAGES;
      state.dialog = makeDialog(pages, { choice: { options: ["Take a nap", "Not now"], onYes: "rest", noPages: BED_NO_PAGES } });
      return true;
    }
    if (ch === "w") {
      state.dialog = state.flags.has(flags.shopHeart)
        ? makeDialog(WARES_SOLD_PAGES)
        : makeDialog(WARES_PAGES, { choice: { options: ["Buy it", "Not now"], onYes: "buyHeart", noPages: WARES_NO_PAGES } });
      return true;
    }
    if (ch === "i") {
      // Ding! The shopkeeper jumps.
      playSound(state, "bell");
      const keeper = state.npcs.find((n) => n.kind === "ribbit");
      if (keeper) keeper.talkFrames = 40;
      state.dialog = makeDialog(randomPick(state, BELL_LINES), { speaker: keeper ? "Ribbit" : null });
      return true;
    }
    if (ch === "n") {
      // Across a shop counter, the way you'd lean over to chat.
      const across = state.npcs.find((n) => overlaps(probeBox(hero, 6 + TILE + 4), n));
      if (across) {
        talkTo(state, across);
        return true;
      }
    }
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
    if (ch === "L" || ch === "B" || ch === "G") {
      if (!tryUnlock(state, col, row)) {
        state.dialog = makeDialog(ch === "L" ? DOOR_LOCKED_PAGES : ch === "B" ? BIG_DOOR_LOCKED_PAGES : GATE_LOCKED_PAGES);
      }
      return true;
    }
  }
  return false;
}

function talkTo(state: GameState, npc: Npc): void {
  // A runaway duckling you've got close enough to talk to is a caught one.
  if (npc.kind === "duckling" && npc.wanders) {
    catchDuckling(state, npc);
    return;
  }
  const hero = state.hero;
  const toHero = { x: centerOf(hero).x - centerOf(npc).x, y: centerOf(hero).y - centerOf(npc).y };
  npc.facing = directionOfVector(toHero.x, toHero.y);
  npc.talkFrames = 40;
  if (npc.kind === "banjo") playSound(state, "bark");
  state.dialog = npcDialog(state, npc);
  // Talking to someone who's hiding is finding them.
  if (npc.tag && HIDERS.includes(npc.tag)) state.flags.add(flags.found(npc.tag));
}

// Walking into a locked door with the right key opens it, no button needed.
export function bumpDoorAhead(state: GameState): void {
  for (const { col, row, ch } of tilesAhead(state, probeBox(state.hero, 2))) {
    if (ch === "L" || ch === "B" || ch === "G") {
      tryUnlock(state, col, row);
      return;
    }
  }
}

function tryUnlock(state: GameState, col: number, row: number): boolean {
  const ch = state.tiles[row][col];
  const inv = state.inventory;
  // A door uses up the key that opens it, and a dungeon's doors only take
  // that dungeon's keys.
  const dungeon = dungeonOf(state.roomId);
  const keys = dungeon ? inv.keys[dungeon] : null;
  if (ch === "L") {
    if (!keys || keys.small <= 0) return false;
    keys.small--;
  } else if (ch === "G") {
    if (!inv.gateKey) return false;
    inv.gateKey = false;
  } else {
    if (!keys?.big) return false;
    keys.big = false;
  }
  // Doors are a few tiles wide; flood-fill so the whole thing opens.
  const queue = [{ col, row }];
  while (queue.length > 0) {
    const tile = queue.pop()!;
    if (tileAt(state, tile.col, tile.row) !== ch) continue;
    state.tiles[tile.row][tile.col] = openedDoor(ch);
    state.flags.add(flags.door(state.roomId, tile.col, tile.row));
    spawnBurst(state, (tile.col + 0.5) * TILE, (tile.row + 0.5) * TILE, {
      count: 10,
      colors: ch === "B" ? [0xffd166, 0xfff3a0] : ch === "G" ? [0x6fbf4a, 0x8fd65c, 0x4c9a3a] : [0xc89b6d, 0xe8c9a0],
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
  const dungeon = dungeonOf(state.roomId);
  switch (contents.item) {
    case "sword":
    case "switcheroo":
    case "flippers":
      inv.owned.add(contents.item);
      // A new tool goes on the item button if it's empty.
      settleEquipped(inv);
      break;
    // Dungeon keys belong to the dungeon they're found in (world.test.ts
    // checks they're only ever placed inside one).
    case "smallKey":
      if (dungeon) inv.keys[dungeon].small++;
      break;
    case "bigKey":
      if (dungeon) inv.keys[dungeon].big = true;
      break;
    case "gateKey":
      inv.gateKey = true;
      break;
    case "heartContainer":
      hero.maxHp = Math.min(HP_CAP, hero.maxHp + 2);
      hero.hp = hero.maxHp;
      break;
    case "gems":
      inv.gems = Math.min(999, inv.gems + contents.amount);
      break;
    case "letter":
      state.flags.add(flags.letter);
      break;
    case "reply":
      state.flags.add(flags.reply);
      break;
    case "ring":
      state.flags.add(flags.ring);
      break;
  }
  hero.holding = contents.item;
  hero.action = "none";
  state.dialog = makeDialog(itemGetPages(contents.item, contents.item === "gems" ? contents.amount : 0));
}
