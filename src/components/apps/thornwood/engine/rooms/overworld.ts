import type { RoomDef } from "../world";

// The overworld is a grid of screens around Puddlebrook village, with
// Fernwhistle (one big room, two screens wide and three tall) filling the
// east. Walking off an edge scrolls to the neighboring screen, so openings
// along shared edges have to line up (world.test.ts checks that they do).
//
//            x=0                x=1                 x=2           x=3-4
//   y=0   Whispering Woods   Bramblekeep Gate    Mirror Lake
//   y=1   Bramble Meadow     Puddlebrook (start) Eastfield     Fernwhistle
//   y=2   Thornthicket       Willow Crossing     Sunny Shore
//
// The road to the first dungeon loops through the south: Bramblekeep's
// gate is locked, its old keeper Mossbeard lives at Willow Crossing, and
// the key he dropped is in the Hollow, a cave in Thornthicket. Beating
// Thornback brings down the drawbridge into Fernwhistle (rooms/fernwhistle.ts).

export const OVERWORLD_ROOMS: Record<string, RoomDef> = {
  "overworld:1,1": {
    name: "Puddlebrook",
    music: "village",
    map: [
      "TTTTTTTbbTTTTTTT",
      "T.HHH..::..HHH.T",
      "T.HEH..::..HEH.T",
      "T..:...::...:..T",
      "b..::::::::::..b",
      "b.....,::,.....b",
      "b......::......b",
      "T.,....::...s..T",
      "T....o.::....,.T",
      "T,.....::.....,T",
      "TTTTTTTbbTTTTTTT",
    ],
    npcs: [
      { kind: "nana", col: 4, row: 3 },
      { kind: "banjo", col: 10, row: 6, wanders: true },
    ],
    signs: {
      "12,7": ["PUDDLEBROOK. Population: 4. (5 if you count Banjo, and Banjo insists that you do.)"],
    },
    decor: [
      { kind: "house", col: 2, row: 1, w: 3, h: 2, roof: 0xd9574a, wall: 0xf3e3c3 },
      { kind: "house", col: 11, row: 1, w: 3, h: 2, roof: 0x4f9e6b, wall: 0xf0d8a8 },
    ],
    // Front doors: Nana's house on the left, Ribbit's shop on the right.
    warps: {
      "3,2": { roomId: "interior:0,0", col: 7.5, row: 9, facing: "up" },
      "12,2": { roomId: "interior:1,0", col: 7.5, row: 9, facing: "up" },
    },
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
      "TTTTTT..TTTTTTTT",
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
      "^^^^^x.GG.x^^^^^",
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
      "5,3": [
        "BRAMBLEKEEP. Abandoned. Definitely not haunted. Please stop asking.",
        "Gate locked by order of the Gatekeeper (Mossbeard, retired). Inquiries: Willow Crossing, south of the village.",
      ],
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
    sunken: { "10,2": { item: "gems", amount: 50 } },
    signs: {
      "13,8": ["MIRROR LAKE. Something shiny sits on that island. Shame nobody around here can swim... or teleport."],
    },
  },

  "overworld:2,1": {
    name: "Eastfield",
    music: "overworld",
    // The gorge on the east side cuts Fernwhistle off from everything
    // else. Its drawbridge ("Y") stays jammed up until Thornback falls.
    map: [
      "TTTTTTT..TTTTTTT",
      "T......::.TT....",
      "T.oo...::.T.::::",
      "T.o....::.T.::s.",
      ".......::.^vYYvv",
      ":::::::::.^vYYvv",
      ".......::.^vYYvv",
      "T...,..:::::::sT",
      "T.bb...::..o..,T",
      "T.b....::,...C.T",
      "TTTTTTT..TTTTTTT",
    ],
    enemies: [
      { kind: "knight", col: 12, row: 8 },
      { kind: "knight", col: 5, row: 6 },
      { kind: "jellop", col: 9, row: 8 },
    ],
    npcs: [{ kind: "fumbleton", col: 4, row: 8 }],
    chests: { "13,9": { contents: { item: "gems", amount: 20 } } },
    signs: {
      "14,7": [
        "THE FERNWHISTLE DRAWBRIDGE. The village of Fernwhistle: just across!",
        "Someone has scrawled underneath: JAMMED SHUT. Thanks a lot, Thornback.",
      ],
      "14,3": ["FERNWHISTLE, this way. Mind the gap."],
    },
  },

  "overworld:1,2": {
    name: "Willow Crossing",
    music: "overworld",
    map: [
      "TTTTTTT..TTTTTTT",
      "T....,.::.....,T",
      "T.o....::..s...T",
      ".......::.......",
      "::::::::::::::::",
      ".......::.......",
      "~~~~~~~==~~~~~~~",
      "~~~~~~~==~~~~~~~",
      "T.,....::...,..T",
      "T...........C..T",
      "TTTTTTTTTTTTTTTT",
    ],
    npcs: [{ kind: "mossbeard", col: 4, row: 9 }],
    enemies: [
      { kind: "jellop", col: 3, row: 3 },
      { kind: "spitbug", col: 13, row: 2 },
    ],
    signs: {
      "11,2": ["WILLOW CROSSING. North: Puddlebrook. West: Thornthicket. East: the shore. Over the bridge: a grumpy mole."],
    },
    chests: { "12,9": { contents: { item: "gems", amount: 20 } } },
  },

  "overworld:0,2": {
    name: "Thornthicket",
    music: "overworld",
    map: [
      "TTTTTTbbTTTTTTTT",
      "T..T..::..T....T",
      "T.....:...b.bb.T",
      "T..T..::::::::::",
      "T.b...:....b....",
      "T.b.^^^^^.......",
      "T...^EE^^s.T.~~~",
      "T..b.::...b.~~~~",
      "TT...::..T..b~~T",
      "T.b..,.....b...T",
      "TTTTTTTTTTTTTTTT",
    ],
    enemies: [
      { kind: "knight", col: 8, row: 8 },
      { kind: "knight", col: 13, row: 4 },
      { kind: "jellop", col: 2, row: 1 },
      { kind: "flitter", col: 11, row: 8 },
    ],
    signs: {
      "9,6": ["THE HOLLOW. Bats inside. Also, according to a certain mole, a very important key. Probably."],
    },
    warps: {
      "5,6": { roomId: "hollow:0,1", col: 7.5, row: 8, facing: "up" },
      "6,6": { roomId: "hollow:0,1", col: 7.5, row: 8, facing: "up" },
    },
  },

  "overworld:2,2": {
    name: "Sunny Shore",
    music: "overworld",
    map: [
      "TTTTTTT..TTTTTTT",
      "T....,.::......T",
      "T.o....::...o..T",
      "......;::;;;;;.T",
      "::::::;;;;;;;;;T",
      "......;;;;;;;;;T",
      "~~;;;;;;;;;;;;;~",
      "~~~;;;;;;;;;;;~~",
      "^~~~~~~~~~~~~~~~",
      "^^~~~~~~~;C;~~~~",
      "^^^~~~~~~~~~~~~~",
    ],
    npcs: [{ kind: "pinch", col: 12, row: 3 }],
    enemies: [
      { kind: "spitbug", col: 6, row: 5 },
      { kind: "spitbug", col: 11, row: 6 },
      { kind: "flitter", col: 4, row: 7 },
    ],
    // Out on the islet, only reachable by swapping with the crystal from
    // the beach: a reward for coming back with the Switcheroo.
    props: [{ kind: "crystal", col: 9, row: 9 }],
    chests: { "10,9": { contents: { item: "heartContainer" } } },
    // Pinch's "somethin' shiny" off the point, for anyone with Flippers.
    sunken: { "4,9": { item: "gems", amount: 50 } },
  },
};
