import type { RoomDef } from "../world";

// Bramblekeep, the first dungeon. Its tool is the Switcheroo, and nearly
// every room past the mini-boss is a puzzle about it.
//
//            x=0                  x=1                x=2
//   y=0                       Thornback's Lair
//   y=1   Statue Gallery      The Chasm          Peg Puzzle
//   y=2   Clank's Post        Great Hall         Trial Room
//   y=3                       Entrance
//
// Intended route: Entrance -> Hall -> Trial (small key, shutters trap you
// until it's cleared) -> Clank's Post (locked; beat Captain Clank, get the
// Switcheroo) -> The Chasm (swap across with the crystals) -> Statue
// Gallery (plate puzzle, small key) -> Peg Puzzle (crystal switch, Bramble
// Key) -> Thornback.
//
// East/west doorways in here are two tiles tall (rows 4-5), north/south
// doorways two tiles wide (cols 7-8).

export const BRAMBLEKEEP_ROOMS: Record<string, RoomDef> = {
  "bramblekeep:1,3": {
    name: "Bramblekeep",
    music: "dungeon",
    map: [
      "#######__#######",
      "#t____________t#",
      "#______________#",
      "#__x________x__#",
      "#______________#",
      "#______________#",
      "#______________#",
      "#__x________x__#",
      "#______________#",
      "#t_____UU_____t#",
      "################",
    ],
    npcs: [{ kind: "moanica", col: 4, row: 5 }],
    enemies: [
      { kind: "flitter", col: 11, row: 3 },
      { kind: "flitter", col: 11, row: 7 },
    ],
    warps: {
      "7,9": { roomId: "overworld:1,0", col: 7.5, row: 3, facing: "down" },
      "8,9": { roomId: "overworld:1,0", col: 7.5, row: 3, facing: "down" },
    },
  },

  "bramblekeep:1,2": {
    name: "Great Hall",
    music: "dungeon",
    map: [
      "#######__#######",
      "#t____________t#",
      "#______________#",
      "#__x________x__#",
      "L_______________",
      "L_______________",
      "#______________#",
      "#__x________x__#",
      "#______________#",
      "#t____________t#",
      "#######__#######",
    ],
    enemies: [
      { kind: "jellop", col: 5, row: 5 },
      { kind: "jellop", col: 10, row: 5 },
      { kind: "knight", col: 7, row: 2 },
    ],
  },

  "bramblekeep:2,2": {
    name: "Trial Room",
    music: "dungeon",
    map: [
      "################",
      "#______________#",
      "#__x________x__#",
      "#______________#",
      "S______________#",
      "S__________C___#",
      "#______________#",
      "#______________#",
      "#__x________x__#",
      "#t____________t#",
      "################",
    ],
    enemies: [
      { kind: "knight", col: 6, row: 3 },
      { kind: "knight", col: 10, row: 8 },
      { kind: "spitbug", col: 12, row: 4 },
      { kind: "flitter", col: 6, row: 7 },
    ],
    chests: { "11,5": { contents: { item: "smallKey" }, hidden: true } },
  },

  "bramblekeep:0,2": {
    name: "Clank's Post",
    music: "dungeon",
    map: [
      "################",
      "#t____________t#",
      "#______________#",
      "#______________#",
      "#______________S",
      "#______C_______S",
      "#______________#",
      "#______________#",
      "#______________#",
      "#t____________t#",
      "################",
    ],
    enemies: [{ kind: "clank", col: 4, row: 5 }],
    chests: { "7,5": { contents: { item: "switcheroo" }, big: true, hidden: true } },
  },

  "bramblekeep:1,1": {
    name: "The Chasm",
    music: "dungeon",
    map: [
      "#######BB#######",
      "#t____________t#",
      "#______________#",
      "#______________#",
      "_______________L",
      "_______________L",
      "#vvvvvvvvvvvvvv#",
      "#vvvvvvvvvvvvvv#",
      "#______________#",
      "#______________#",
      "#######__#######",
    ],
    // One crystal on each side of the chasm. Swapping always leaves one
    // behind on the side you just left, so you can never strand yourself.
    props: [
      { kind: "crystal", col: 4, row: 3 },
      { kind: "crystal", col: 11, row: 9 },
    ],
    enemies: [
      { kind: "flitter", col: 6, row: 2 },
      { kind: "flitter", col: 10, row: 3 },
    ],
  },

  "bramblekeep:0,1": {
    name: "Statue Gallery",
    music: "dungeon",
    map: [
      "################",
      "#t____________t#",
      "#_P____________#",
      "#______________#",
      "#_______________",
      "#_______________",
      "#______________#",
      "#___________DDD#",
      "#___________D_C#",
      "#t__________D__#",
      "################",
    ],
    // Stand on the plate, fire the Switcheroo at the statue: it lands on
    // the plate and holds the bars open for you.
    props: [{ kind: "statue", col: 12, row: 2 }],
    enemies: [
      { kind: "jellop", col: 5, row: 5 },
      { kind: "jellop", col: 8, row: 7 },
      { kind: "spitbug", col: 6, row: 3 },
    ],
    chests: { "14,8": { contents: { item: "smallKey" } } },
  },

  "bramblekeep:2,1": {
    name: "Peg Puzzle",
    music: "dungeon",
    map: [
      "################",
      "#t__________r_C#",
      "#___________r__#",
      "#___________rrr#",
      "_u_____________#",
      "_u_____________#",
      "#______________#",
      "#_______vvv____#",
      "#_______vQv____#",
      "#t______vvv___t#",
      "################",
    ],
    // The switch sits on an island only a bolt can reach. Flipping it
    // drops the red pegs around the chest but raises the blue ones across
    // the exit, so you'll be flipping it back on the way out.
    enemies: [
      { kind: "knight", col: 4, row: 2 },
      { kind: "knight", col: 6, row: 6 },
      { kind: "spitbug", col: 12, row: 6 },
    ],
    chests: { "14,1": { contents: { item: "bigKey" }, big: true } },
  },

  "bramblekeep:1,0": {
    name: "Thornback's Lair",
    music: "dungeon",
    map: [
      "################",
      "#tp__________pt#",
      "#______________#",
      "#______________#",
      "#______________#",
      "#p____________p#",
      "#______________#",
      "#______________#",
      "#______________#",
      "#tp__________pt#",
      "#######SS#######",
    ],
    // Pots around the edges hide hearts (about half of them do). Thornback
    // smashes any it charges through, so grab them while you can.
    enemies: [{ kind: "thornback", col: 7.5, row: 3 }],
  },
};
