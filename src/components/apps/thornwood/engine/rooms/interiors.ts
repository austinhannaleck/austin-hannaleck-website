import type { RoomDef } from "../world";

// Inside the houses of Puddlebrook and Fernwhistle. Each is a small room
// in the middle of the screen (the classics' "bigger on the inside" never
// bothered anyone), entered through its front door and left through the
// doorway at the bottom. They sit side by side in their own little grid,
// but walls all round mean you can only come and go by the doors.

const BOOKS = [
  [
    'You pull out a book: "Thornback: A Field Guide."',
    "Chapter One: Run. Chapter Two: No, really, run. Chapter Three: All that armor is in the front. Have you tried the back?",
  ],
  ['"101 Uses for a Pot," by Anonymous.', "Use 1: Smash it. Uses 2 through 101: See Use 1."],
  ['"Tortoise Racing for Beginners." Every page is a picture of the same tortoise, a tiny bit further along. It\'s a flip book!'],
  ['"The Gatekeeper\'s Log," by Mossbeard. Day 1: Kept the gate. Day 2: Kept the gate. Day 3: Lost the key. Day 4: Retired.'],
  ['A cookbook, "Soups of the Swamp." Somebody has scribbled in the margins. Most of the notes just say "why?"'],
];

const FIREPLACE = [
  ["The fire crackles away. Nana's kettle hangs over it, humming a little tune to itself."],
  ["You warm your hands by the fire. Toasty."],
];

const TEA = [["A pot of tea, still warm, and two cups. Nana always pours one for you, just in case."]];

// Fernwhistle
const LETTERS = [
  ["Pigeonholes stuffed with letters, every one of them stuck here since the bridge went up."],
  ["One envelope is addressed to 'Whoever Finds This.' It's empty. Somebody's idea of a joke, probably."],
];
const SACKS = [
  ["A sack of mail, bulging at the seams."],
  ["A sack of mail. One envelope on top is addressed to 'Banjo, Puddlebrook.' It's been slobbered on."],
];
const OVEN = [["A big brick oven, roaring away. Everything in here smells like warm bread."]];
const BREAD = [
  ["Loaves, buns, rolls, twists, plaits, and a bun shaped like a duck. Bun has been very busy."],
  ["A whole shelf of cinnamon buns. The icing is still shiny."],
];
const FLOUR = [["Sacks of flour, stacked high. A good spot to hide behind, if you were small."]];
const CAFE = [["A little table by the window. Somebody left half a bun. Probably a bun they were too full to finish."]];
const GUEST_BOOK = [
  ["The guest book. The last entry is from months ago: 'Lovely stay. Bridge stuck. Send help.'"],
  ["'101 Ways to Pass the Time When Nobody Can Leave,' by Hopsworth. Every page just says 'Nap.'"],
];
const INN_FIRE = [["A cozy fire. A snail is asleep on the hearth, which explains the inn's name."]];
const INN_TABLE = [["A tray of tea and biscuits for guests. The biscuits are shaped like snails."]];
const RECORDS = [
  ["'The Records of Fernwhistle,' volumes one through forty. Volume twelve is just recipes."],
  ["'Mayor Bellwether's Speeches, Collected.' Every one of them starts with 'Ahem.'"],
];
const HALL_FIRE = [["A grand marble fireplace. A brass plaque says: PLEASE DO NOT TOAST MARSHMALLOWS DURING MEETINGS."]];
const COUNCIL = [
  ["The town council's meeting table. There's a list on it: 1. Fix the bridge. 2. Find the ring. 3. Lunch."],
  ["Somebody has crossed out 'Fix the bridge' and written 'IT FIXED ITSELF!!' in very excited handwriting."],
];
const MARIGOLD_BOOKS = [
  ["'Teas I Have Known,' by Marigold. Every chapter is about dandelion."],
  ["A scrapbook full of pressed flowers, and a drawing of a man with a very big beard. 'My brother,' says the caption."],
];
const MARIGOLD_FIRE = [["A snug little fire. A kettle of dandelion tea sits beside it, keeping warm."]];
const DANDELION = [["Dandelion tea. It's bright yellow, and it smells of a summer meadow. Two cups, just in case."]];

export const INTERIOR_ROOMS: Record<string, RoomDef> = {
  "interior:0,0": {
    name: "Nana's House",
    music: "village",
    bed: ["Your bed! The blanket Nana knitted for you is still warm."],
    map: [
      "################",
      "################",
      "##KK_FF_____Z_##",
      "##__________Z_##",
      "##____________##",
      "##___RRRRRR___##",
      "##___RROORR___##",
      "##___RRRRRR___##",
      "##p___________##",
      "##pp_________p##",
      "#######EE#######",
    ],
    examine: {
      "2,2": BOOKS,
      "3,2": BOOKS,
      "5,2": FIREPLACE,
      "6,2": FIREPLACE,
      "7,6": TEA,
      "8,6": TEA,
    },
    warps: {
      "7,10": { roomId: "overworld:1,1", col: 3, row: 3, facing: "down" },
      "8,10": { roomId: "overworld:1,1", col: 3, row: 3, facing: "down" },
    },
  },

  "interior:1,0": {
    name: "Haggleby's Wares",
    music: "village",
    shelves: "jars",
    map: [
      "################",
      "################",
      "##KK__KK__KK__##",
      "##____________##",
      "##nnnwnnnninnn##",
      "##____________##",
      "##____________##",
      "##____________##",
      "##____RRRR____##",
      "##p___RRRR___p##",
      "#######EE#######",
    ],
    // Haggleby minds the shop from behind the counter; you talk to him
    // across it, and the Heart Container for sale sits on top of it.
    npcs: [{ kind: "haggleby", col: 7.5, row: 3 }],
    warps: {
      "7,10": { roomId: "overworld:1,1", col: 12, row: 3, facing: "down" },
      "8,10": { roomId: "overworld:1,1", col: 12, row: 3, facing: "down" },
    },
  },

  // -------------------------------------------------------------------------
  // Fernwhistle
  // -------------------------------------------------------------------------
  "interior:2,0": {
    name: "Post Office",
    music: "town",
    shelves: "letters",
    wallpaper: "sky",
    map: [
      "################",
      "################",
      "##KK_KK__KK_KK##",
      "##____________##",
      "##nnnnnnnnnnnn##",
      "##____________##",
      "##q__________q##",
      "##qq________qq##",
      "##____RRRR____##",
      "##p___RRRR___p##",
      "#######EE#######",
    ],
    npcs: [{ kind: "pidge", col: 7.5, row: 3 }],
    examine: {
      ...lookAt(LETTERS, [2, 2], [3, 2], [5, 2], [6, 2], [9, 2], [10, 2], [12, 2], [13, 2]),
      ...lookAt(SACKS, [2, 6], [13, 6], [2, 7], [3, 7], [12, 7], [13, 7]),
    },
    warps: doorOut(7, 12),
  },

  "interior:3,0": {
    name: "Bakery",
    music: "town",
    shelves: "bread",
    wallpaper: "rose",
    map: [
      "################",
      "################",
      "##FF_KKKK_FF__##",
      "##_________q__##",
      "##nnnnnnnn_qq_##",
      "##____________##",
      "##__OO____OO__##",
      "##____________##",
      "##p___RRRR____##",
      "##pp__RRRR___p##",
      "#######EE#######",
    ],
    npcs: [
      { kind: "bun", col: 5.5, row: 3 },
      // Hiding behind the flour sacks, for Tilly's game of hide and seek.
      { kind: "fern", col: 12, row: 3, tag: "fern", home: { roomId: "overworld:3,0", col: 18, row: 20 } },
    ],
    examine: {
      ...lookAt(OVEN, [2, 2], [3, 2], [10, 2], [11, 2]),
      ...lookAt(BREAD, [5, 2], [6, 2], [7, 2], [8, 2]),
      ...lookAt(FLOUR, [11, 3], [11, 4], [12, 4]),
      ...lookAt(CAFE, [4, 6], [5, 6], [10, 6], [11, 6]),
    },
    warps: doorOut(15, 12),
  },

  "interior:4,0": {
    name: "The Snoozing Snail",
    music: "town",
    wallpaper: "sage",
    map: [
      "################",
      "################",
      "##Z_Z_Z__KK_FF##",
      "##Z_Z_Z_______##",
      "##____________##",
      "##_RRRR____OO_##",
      "##_ROOR_______##",
      "##_RRRR_______##",
      "##p___________##",
      "##pp_________p##",
      "#######EE#######",
    ],
    npcs: [{ kind: "hopsworth", col: 10, row: 4 }],
    examine: {
      ...lookAt(GUEST_BOOK, [9, 2], [10, 2]),
      ...lookAt(INN_FIRE, [12, 2], [13, 2]),
      ...lookAt(INN_TABLE, [4, 6], [5, 6], [11, 5], [12, 5]),
    },
    warps: doorOut(25, 12),
  },

  "interior:5,0": {
    name: "Mayor's Hall",
    music: "town",
    wallpaper: "gold",
    map: [
      "################",
      "################",
      "##KK__FF__KK__##",
      "##____________##",
      "##__RRRRRRRR__##",
      "##__RROOOORR__##",
      "##__RRRRRRRR__##",
      "##____________##",
      "##p__________p##",
      "##pp________pp##",
      "#######EE#######",
    ],
    examine: {
      ...lookAt(RECORDS, [2, 2], [3, 2], [10, 2], [11, 2]),
      ...lookAt(HALL_FIRE, [6, 2], [7, 2]),
      ...lookAt(COUNCIL, [6, 5], [7, 5], [8, 5], [9, 5]),
    },
    warps: doorOut(20, 6),
  },

  "interior:6,0": {
    name: "Marigold's House",
    music: "town",
    bed: ["Marigold's bed. It's very neatly made, and very, very small. You could probably still fit."],
    map: [
      "################",
      "################",
      "##Z_KK__FF__KK##",
      "##Z___________##",
      "##____________##",
      "##___RRRRRR___##",
      "##___RROORR___##",
      "##___RRRRRR___##",
      "##p__________p##",
      "##pp________pp##",
      "#######EE#######",
    ],
    npcs: [{ kind: "marigold", col: 9.5, row: 4 }],
    examine: {
      ...lookAt(MARIGOLD_BOOKS, [4, 2], [5, 2], [12, 2], [13, 2]),
      ...lookAt(MARIGOLD_FIRE, [8, 2], [9, 2]),
      ...lookAt(DANDELION, [7, 6], [8, 6]),
    },
    warps: doorOut(27, 6),
  },
};

// The same thing to say about several tiles (one piece of furniture).
function lookAt(looks: string[][], ...tiles: [number, number][]): Record<string, string[][]> {
  return Object.fromEntries(tiles.map(([col, row]) => [`${col},${row}`, looks]));
}

// A Fernwhistle house's doorway, back out onto the street in front of it.
function doorOut(col: number, row: number): RoomDef["warps"] {
  const out = { roomId: "overworld:3,0", col, row, facing: "down" as const };
  return { "7,10": out, "8,10": out };
}
