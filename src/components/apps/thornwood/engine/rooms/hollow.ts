import type { RoomDef } from "../world";

// The Hollow: a small cave under Thornthicket where Mossbeard dropped the
// key to Bramblekeep's gate. A warm-up before the real dungeon: some bats,
// a few pits to mind, then a room that shuts you in until it's cleared.
//
//            x=0
//   y=0   The Key Room
//   y=1   The Hollow (entrance)

export const HOLLOW_ROOMS: Record<string, RoomDef> = {
  "hollow:0,1": {
    name: "The Hollow",
    music: "dungeon",
    map: [
      "#######__#######",
      "#t__o______o__t#",
      "#______________#",
      "#__vv______vv__#",
      "#__vv__o___vv__#",
      "#______________#",
      "#_o__________o_#",
      "#______________#",
      "#__x________x__#",
      "#t_____UU_____t#",
      "################",
    ],
    enemies: [
      { kind: "flitter", col: 5, row: 5 },
      { kind: "flitter", col: 10, row: 6 },
      { kind: "jellop", col: 7, row: 7 },
    ],
    warps: {
      "7,9": { roomId: "overworld:0,2", col: 5.5, row: 7, facing: "down" },
      "8,9": { roomId: "overworld:0,2", col: 5.5, row: 7, facing: "down" },
    },
  },

  "hollow:0,0": {
    name: "The Key Room",
    music: "dungeon",
    map: [
      "################",
      "#t____________t#",
      "#______________#",
      "#___o______o___#",
      "#______________#",
      "#______C_______#",
      "#______________#",
      "#___o______o___#",
      "#______________#",
      "#t____________t#",
      "#######SS#######",
    ],
    enemies: [
      { kind: "knight", col: 3, row: 2 },
      { kind: "knight", col: 12, row: 2 },
      { kind: "jellop", col: 4, row: 8 },
      { kind: "jellop", col: 11, row: 8 },
    ],
    chests: { "7,5": { contents: { item: "gateKey" }, big: true, hidden: true } },
  },
};
