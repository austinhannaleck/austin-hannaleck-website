---
name: dungeon-design
description: Thornwood's rules for designing dungeons, including small keys vs. boss keys, locked doors and boss doors, key placement that can't softlock the player, dungeon room conventions, and the checklist for adding a new dungeon. Use this whenever designing, adding, or changing a Thornwood dungeon or any room in one, placing keys, chests, locked doors, or a boss, planning the next dungeon or its tool, or editing dungeon files in src/components/apps/thornwood/engine/rooms/, DUNGEONS, or inventory.keys. Use it even when the request only says "level", "cave", "puzzle room", "boss fight", or "new area".
---

# Thornwood dungeon design

Thornwood is a top-down adventure in the style of *A Link to the Past*. This skill holds the
rules every dungeon follows and the steps for building a new one. The code lives in
`src/components/apps/thornwood/`. Read `AGENTS.md` there too, since it covers the engine/render
split, rooms as text grids, and tools vs. gear.

Bramblekeep (`engine/rooms/bramblekeep.ts`) is the reference dungeon. When in doubt, do what it
does.

## The key rules

These are the owner's rules. Treat them as fixed unless the owner changes them.

1. **There are two kinds of dungeon key: small keys and the boss key.**
2. **Keys only work in their own dungeon.** A key belongs to the dungeon it's found in. A
   Bramblekeep small key does nothing in any other dungeon.
3. **Any small key opens any normal locked door in its dungeon.** Small keys are
   interchangeable, so the player chooses which door to spend each one on.
4. **The boss key opens only the boss door.** It never opens a normal locked door, a chest, or
   anything else, and no small key opens the boss door.
5. **Every key is used up by the door it opens.** Once opened, a door stays open for good (it's
   saved as a `door:` flag), so leaving and coming back never costs another key.

One-off overworld keys, like the Gate Key that opens Bramblekeep's gate, aren't dungeon keys.
Each opens one specific door outside any dungeon and is used up the same way.

### How the rules map to code

| Rule's term | In code |
| --- | --- |
| small key | item `"smallKey"`, `inventory.keys[dungeon].small` (a count) |
| boss key | item `"bigKey"` (the "Bramble Key" in Bramblekeep), `inventory.keys[dungeon].big` (yes/no) |
| locked door | tile `L` |
| boss door | tile `B` |
| a dungeon | an entry in `DUNGEONS` (`engine/types.ts`); `dungeonOf(roomId)` in `engine/world.ts` |
| Gate Key | item `"gateKey"`, `inventory.gateKey`, tile `G` |

Unlocking is `tryUnlock` in `engine/interact.ts`, and picking keys up is `grantChest` in the same
file.

## Designing with the rules

The main risk with used-up keys is a **softlock**: the player spends their keys and is left with
a locked door and no way to get another key. Players can't undo a door, so design every key
route so it can't strand them.

- **One boss door per dungeon, leading into the boss room, and one boss key.** The boss key is
  a yes/no per dungeon, so a second boss door would be impossible to open. Put the boss key
  late, usually behind the dungeon's hardest puzzle, in a big chest.
- **Match small keys to locked doors one to one.** `world.test.ts` fails if a dungeon has fewer
  small keys than locked doors. Avoid spare keys too, since a leftover key sends players hunting
  for a door that doesn't exist.
- **Check the order, not just the count.** Walk the intended route and keep a running tally of
  keys held. It must never go below zero at a door. The tests only check totals, so ordering is
  on you. A key locked behind the only door it could open is the classic mistake.
- **Watch for branches.** Because any small key opens any locked door, if the player can reach
  two locked doors while holding one key, either choice must still lead to the next key. The
  simplest fix is to only ever have one unopened locked door within reach at a time.
- **Keys come from inside their dungeon:** chests (`C`) or sunken treasure. A small key or boss
  key placed outside a dungeon is silently lost, and `world.test.ts` fails on it.
- **Big chests hold the dungeon's treasures:** its tool and its boss key. They play a fanfare
  and need no key to open. Hidden chests (`hidden: true`) appear once every enemy in the room is
  beaten, which makes a good reward for a fight room.

## Dungeon shape

Bramblekeep's arc is the template:

1. Entrance and a couple of warm-up rooms.
2. A first small key earned through a challenge (a shutter room that traps you until it's clear).
3. A locked door to the mini-boss, who guards the dungeon's **tool** in a big chest.
4. Rooms that teach the tool safely, then test it. Nearly every room past the mini-boss should be
   about the tool.
5. The boss key, behind the hardest puzzle.
6. The boss door, then the boss. Beating the boss gives a heart container and the dungeon's prize.

Each dungeon introduces exactly one tool. `FOLLOWUP_IDEAS.md` lists candidates (Gust Bellows, Echo
Bell, Bubble Wand) and the mechanics they'd build on.

Start every dungeon file with a header comment like Bramblekeep's: a grid diagram of the rooms,
the intended route, and a **key ledger** (each key: where it's found, and which door it's meant
for). That's where the ordering check above gets written down, and it's what the next person
reads first.

## Room conventions

- Each screen is a 16x11 text grid; the legend is at the top of `engine/tiles.ts`. Dungeon tiles:
  `_` floor, `#` wall, `v` pit, `t` torch, `x` statue, `U` stairs out, `L` locked door, `B` boss
  door, `S` shutter (shut while enemies remain), `P` pressure plate with `D` bars, `Q` crystal
  switch with `r`/`u` pegs, `p` pot, `C` chest.
- Doorways are two tiles: north/south ones at columns 7-8, east/west ones at rows 4-5.
- A locked door or boss door goes in only one of the two rooms it joins. The neighbor's side of
  the doorway is open floor or a shutter. `world.test.ts` checks that edges line up.
- Dungeon rooms use `music: "dungeon"`. The music system switches to the boss theme or the
  "danger" theme on its own during boss fights and shutter fights.
- Beaten enemies stay beaten unless their spawn has a `respawn` rule (`engine/respawn.ts`; the
  default is `never`), and a beaten boss never comes back. An enemy that does come back shuts a
  trap room's shutters again, and re-hides a hidden chest that hasn't been opened yet.

## Adding a new dungeon: checklist

1. Add the area to `Area`, and to `DUNGEONS`, in `engine/types.ts`. The keys record and the save
   pick it up from `DUNGEONS` automatically, with no save migration needed.
2. Create `engine/rooms/<dungeon>.ts` exporting its rooms, with the header comment above, and
   register them in `ROOMS` in `engine/world.ts`.
3. Connect it: an overworld warp onto an `E` tile into the entrance, and a `U` warp back out.
4. Map: add it to `AREA_ORDER` and `AREA_TITLES` in `ui/map.ts`.
5. Look: give it a palette in `dungeonTheme` (`render/tiles.ts`) and add its area to the torchlight
   check in `render/PixelRenderer.ts`.
6. Tool: follow the "Tools vs. gear" checklist in `AGENTS.md`.
7. Bosses: add the mini-boss and boss to `BossId` and `ENEMY_STATS` (`engine/actors.ts`). Several
   spots are still written just for Thornback and need generalizing:
   - `musicFor` (`engine/soundtrack.ts`) plays the boss theme only for Thornback.
   - `finishBoss` (`engine/combat.ts`) and `THORNBACK_ROOM` (`engine/room.ts`) handle the boss's
     rewards.
8. Other spots that still say "Bramblekeep":
   - The small-key pickup text in `itemGetPages` (`engine/dialogue.ts`) names Bramblekeep, and
     the boss key's text calls it the "Bramble Key". Make both depend on the dungeon.
   - Crystal-switch peg state is the single `flags.bluePegs` (`"switch:bramblekeep"`), so a second
     dungeon with pegs needs its own flag.
9. Tests: run `pnpm test`. `world.test.ts` checks the maps, edges, reachability, and the key rules
   for every dungeon in `DUNGEONS`. Add engine tests in `engine/engine.test.ts` for new mechanics,
   driven with real inputs.
