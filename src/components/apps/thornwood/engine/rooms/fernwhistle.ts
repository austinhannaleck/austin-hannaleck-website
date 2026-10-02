import type { RoomDef } from "../world";

// Fernwhistle: a village across the gorge from Eastfield, cut off for
// months behind its jammed drawbridge until Thornback's fall shakes it
// loose. It's one big room, two screens wide and three tall, so the
// camera follows you around it instead of flipping screen to screen.
//
//   North: the orchard and the windmill, the Mayor's Hall, Marigold's.
//   Middle: the road in from the bridge, the Post Office, and the cobbled
//     square with its fountain and stalls, the Bakery, and the inn.
//   South: the beach and the pier, and Mama Mallard's pond.
//
// Its side quests are in quests.ts; its houses are in interiors.ts.

export const FERNWHISTLE = "overworld:3,0";

// Where Mama Mallard's ducklings go once you've caught them, and the kids
// once you've found them.
const pond = (col: number, row: number) => ({ roomId: FERNWHISTLE, col, row });
const square = pond;

export const FERNWHISTLE_ROOMS: Record<string, RoomDef> = {
  [FERNWHISTLE]: {
    name: "Fernwhistle",
    music: "town",
    map: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "T.TT.TT.TT.TT.TT.TT.TT.TT.TT.TTT",
      "TTT,........................b.TT",
      "TTT.T.T.THHH......HHHHH........T",
      "TTT..,...HHHs.....HHHHH...HHH.TT",
      "TTT.......:.......HHEHH...HEH.TT",
      "TTT.T.T...:.....f,.,:,,.f..:...T",
      "TTT..,.,..:.....f.,.:..,f..:..TT",
      "TTT,......:.....ffff:ffff..:..TT",
      "TTT.T.T...:..b......::::::::...T",
      "TTT...HHH.:...HHH...:..HHHHH..TT",
      "TTT...HEH.:...HEH...:..HHEHH..TT",
      "..........:..p++++++++++++++p..T",
      ":::::::::::::++++++++++++++++,TT",
      "...s.........++++s+++++++++++.TT",
      "vvv.........,+HH+++HHHH++++++,.T",
      "vvv..fffff...++++++HHHH++++++.TT",
      "vvv..f,.,..T.+++++++++++++HH+.TT",
      "TTT..f,,.....+HH+++++++++++++..T",
      "TTT..fffff..T++++++++++++++++.TT",
      "T..b.........p++++++++++++++p.TT",
      "T...T......b........:.......,..T",
      "T;;;;;;;;;;;;::::::::...,..T..TT",
      "T;o;;;;;;;;;o...T......~~~....TT",
      "T;;;;;;;;;;;;.....,...~~~~~.,..T",
      "T;;;;;;;;;;;;.T......~~~~~~~..TT",
      "T;;;~~~==~~~;........~~~~~~~..TT",
      "T;~~~~~==~~~~~;...T...~~~~~....T",
      "~~~~~~~==~~~~~~........,..,...TT",
      "~~~~~~~==~~~~~~....fffffffff..TT",
      "~~~~~~~~~~~~~~~.T...........T..T",
      "~~~~~~~~~~~~~~~...............TT",
      "~~~~~~~~~~~~~~~TTTTTTTTTTTTTTTTT",
    ],

    decor: [
      { kind: "windmill", col: 9, row: 3 },
      { kind: "house", col: 18, row: 3, w: 5, h: 3, roof: 0x5a6ab0, wall: 0xf8f0e0 },
      { kind: "house", col: 26, row: 4, w: 3, h: 2, roof: 0x8a9a3a, wall: 0xe8d0a8 },
      { kind: "house", col: 6, row: 10, w: 3, h: 2, roof: 0x3a7cf0, wall: 0xf0e8d8 },
      { kind: "house", col: 14, row: 10, w: 3, h: 2, roof: 0xd0743c, wall: 0xf8e0d0 },
      { kind: "house", col: 23, row: 10, w: 5, h: 2, roof: 0x8a4ab0, wall: 0xf0e0c0 },
      { kind: "fountain", col: 19, row: 15 },
      { kind: "stall", col: 14, row: 15, awning: 0xf04050, goods: "fruit" },
      { kind: "stall", col: 14, row: 18, awning: 0xd05890, goods: "flowers" },
      { kind: "stall", col: 26, row: 17, awning: 0x3a7cf0, goods: "fish" },
    ],
    warps: {
      "20,5": { roomId: "interior:5,0", col: 7.5, row: 9, facing: "up" },
      "27,5": { roomId: "interior:6,0", col: 7.5, row: 9, facing: "up" },
      "7,11": { roomId: "interior:2,0", col: 7.5, row: 9, facing: "up" },
      "15,11": { roomId: "interior:3,0", col: 7.5, row: 9, facing: "up" },
      "25,11": { roomId: "interior:4,0", col: 7.5, row: 9, facing: "up" },
    },
    npcs: [
      { kind: "stout", col: 3, row: 12 },
      { kind: "mallard", col: 20, row: 25 },
      { kind: "duckling", col: 8, row: 7, wanders: true, tag: "duckling-orchard", home: pond(19, 24) },
      { kind: "duckling", col: 24, row: 18, wanders: true, tag: "duckling-square", home: pond(19, 26) },
      { kind: "duckling", col: 7, row: 17, wanders: true, tag: "duckling-garden", home: pond(20, 27) },
      { kind: "duckling", col: 26, row: 30, wanders: true, tag: "duckling-meadow", home: pond(21, 28) },
      { kind: "bellwether", col: 7.5, row: 29 },
      { kind: "tilly", col: 18, row: 19 },
      // Hiding behind the windmill.
      { kind: "bo", col: 10, row: 2, tag: "bo", home: square(17, 20) },
      // Hiding behind the Mayor's Hall, ears and all.
      { kind: "pip", col: 20, row: 2, tag: "pip", home: square(19, 20) },
      { kind: "ott", col: 3, row: 24 },
    ],
    signs: {
      "3,14": ["WELCOME TO FERNWHISTLE! Home of the finest buns in Thornwood, and a drawbridge that finally works."],
      "17,14": [
        "TOWN NOTICES",
        "LOST: Four ducklings. If found, please return them to Mama Mallard, at the pond.",
        "LOST: One mayoral ring. Last seen going PLOP off the end of the pier.",
        "FOUND: Four months of mail. Collect from Pidge at the Post Office.",
      ],
      "12,4": ["FERNWHISTLE MILL. Closed. Gone fishing, back soon. (The sign is very, very old.)"],
    },
    // The Mayor's ring, just off the end of the pier ("a little to the left").
    sunken: { "5,30": { item: "ring" } },
  },
};
