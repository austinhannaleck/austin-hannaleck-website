import type { RoomDef } from "../world";

// The overworld is a 3x2 grid of screens around Puddlebrook village.
// Walking off an edge scrolls to the neighboring screen, so openings along
// shared edges have to line up (world.test.ts checks that they do).
//
//            x=0                x=1                 x=2
//   y=0   Whispering Woods   Bramblekeep Gate    Mirror Lake
//   y=1   Bramble Meadow     Puddlebrook (start) Eastfield

export const OVERWORLD_ROOMS: Record<string, RoomDef> = {
  "overworld:1,1": {
    name: "Puddlebrook",
    music: "village",
    map: [
      "TTTTTTTbbTTTTTTT",
      "T.HHH..::..HHH.T",
      "T.HHH..::..HHH.T",
      "T..:...::...:..T",
      "b..::::::::::..b",
      "b.....,::,.....b",
      "b......::......b",
      "T.,....::...s..T",
      "T....o.::....,.T",
      "T,.....::.....,T",
      "TTTTTTTTTTTTTTTT",
    ],
    npcs: [
      { kind: "nana", col: 4, row: 3 },
      { kind: "ribbit", col: 13, row: 3 },
      { kind: "banjo", col: 10, row: 6, wanders: true },
    ],
    signs: {
      "12,7": ["PUDDLEBROOK. Population: 4. (5 if you count Banjo, and Banjo insists that you do.)"],
    },
    decor: [
      { kind: "house", col: 2, row: 1, w: 3, h: 2, roof: 0xd9574a, wall: 0xf3e3c3 },
      { kind: "house", col: 11, row: 1, w: 3, h: 2, roof: 0x4f9e6b, wall: 0xf0d8a8 },
    ],
  },

  "overworld:0,1": {
    name: "Bramble Meadow",
    music: "overworld",
    map: [
      "TTT..TTTTTTTTTTT",
      "T.....,........T",
      "T..bb.....oo...T",
      "T..bb..,.......T",
      "T.........bb....",
      "T..,..........::",
      "T......oo.......",
      "T.bbb..........T",
      "T........,..bb.T",
      "T..C...........T",
      "TTTTTTTTTTTTTTTT",
    ],
    enemies: [
      { kind: "jellop", col: 5, row: 5 },
      { kind: "jellop", col: 11, row: 7 },
      { kind: "jellop", col: 8, row: 3 },
    ],
    chests: { "3,9": { contents: { item: "gems", amount: 20 } } },
  },

  "overworld:0,0": {
    name: "Whispering Woods",
    music: "overworld",
    map: [
      "TTTTTTTTTTTTTTTT",
      "T..T....T....T.T",
      "T.....T....,...T",
      "T.T.,....TT..T.T",
      "T....T..........",
      "TT......C...T...",
      "T...T.....T.....",
      "T.T....T.....T.T",
      "T....,....T....T",
      "TT.......T..T..T",
      "TTT..TTTTTTTTTTT",
    ],
    enemies: [
      { kind: "flitter", col: 4, row: 2 },
      { kind: "flitter", col: 11, row: 7 },
      { kind: "spitbug", col: 6, row: 8 },
    ],
    chests: { "8,5": { contents: { item: "gems", amount: 30 } } },
  },

  "overworld:1,0": {
    name: "Bramblekeep Gate",
    music: "overworld",
    map: [
      "^^^^^^^^^^^^^^^^",
      "^^^^^^^EE^^^^^^^",
      "^^^^^x.::.x^^^^^",
      "T....s.::......T",
      ".......::.......",
      "::::::::::::::::",
      ".......::.......",
      "T..o...::...o..T",
      "T,.....::.....,T",
      "T......::......T",
      "TTTTTTT..TTTTTTT",
    ],
    enemies: [
      { kind: "knight", col: 3, row: 8 },
      { kind: "knight", col: 12, row: 4 },
    ],
    signs: {
      "5,3": ["BRAMBLEKEEP. Abandoned. Definitely not haunted. Please stop asking."],
    },
    warps: {
      "7,1": { roomId: "bramblekeep:1,3", col: 7.5, row: 8, facing: "up" },
      "8,1": { roomId: "bramblekeep:1,3", col: 7.5, row: 8, facing: "up" },
    },
  },

  "overworld:2,0": {
    name: "Mirror Lake",
    music: "overworld",
    map: [
      "TTTTTTTTTTTTTTTT",
      "T...~~~~~~~~...T",
      "T..~~~~~~~~~~..T",
      "T..~~~,C,~~~~..T",
      "...~~~,,,~~~~..T",
      "::.~~~~~~~~~~..T",
      "...~~~~~~~~~~..T",
      "T...~~~~~~~~...T",
      "T......:.....s.T",
      "T,.....::....,.T",
      "TTTTTTT..TTTTTTT",
    ],
    enemies: [
      { kind: "spitbug", col: 13, row: 6 },
      { kind: "spitbug", col: 2, row: 8 },
      { kind: "flitter", col: 10, row: 9 },
    ],
    // The island is only reachable by swapping with this crystal from the
    // shore, so the heart container is a reward for coming back with the
    // Switcheroo.
    props: [{ kind: "crystal", col: 7, row: 4 }],
    chests: { "7,3": { contents: { item: "heartContainer" } } },
    signs: {
      "13,8": ["MIRROR LAKE. Something shiny sits on that island. Shame nobody around here can swim... or teleport."],
    },
  },

  "overworld:2,1": {
    name: "Eastfield",
    music: "overworld",
    map: [
      "TTTTTTT..TTTTTTT",
      "T......::......T",
      "T.oo...::...bb.T",
      "T.o....::....b.T",
      ".......::......T",
      ":::::::::......T",
      "...............T",
      "T...,.....oo...T",
      "T.bb.......o..,T",
      "T.b.....,....C.T",
      "TTTTTTTTTTTTTTTT",
    ],
    enemies: [
      { kind: "knight", col: 11, row: 4 },
      { kind: "knight", col: 5, row: 6 },
      { kind: "jellop", col: 9, row: 8 },
    ],
    npcs: [{ kind: "fumbleton", col: 4, row: 8 }],
    chests: { "13,9": { contents: { item: "gems", amount: 20 } } },
  },
};
