import { ROOM_COLS, ROOM_ROWS, TILE } from "../engine/types";
import { ROOMS, areaOf, parseRoomId, type HouseDecor } from "../engine/world";
import { fence, fountain, stall, windmill } from "./village";
import { furnitureProps, paintInteriorTile } from "./interior";
import { at, box, dot, hash, type Painter } from "./paint";
import { getSprites } from "./sprites";
import type { Sprite } from "./pixelart";

// Paints each room's ground: grass with tufts, dirt paths that grass
// creeps over at the edges, water with shorelines, rocky cliffs, dungeon
// flagstones and brick walls, bottomless pits. All of it is generated from
// the room's tile map with a seeded hash, so it's varied but stable, and
// painted once per room into an offscreen canvas.
//
// Anything taller than its tile (trees, statues, houses, braziers) is
// returned separately as a "standing prop" so the renderer can depth-sort
// it with the characters walking around it.

export const COLORS = {
  grass: "#58b848",
  grassDark: "#3c9040",
  grassDeep: "#2c7034",
  grassLight: "#84d860",
  path: "#e4c084",
  pathDark: "#c49a5c",
  pathLight: "#f6dca4",
  sand: "#f4dea0",
  sandDark: "#d8bc78",
  sandLight: "#fff4cc",
  plank: "#c08850",
  plankDark: "#8a5a30",
  plankLight: "#e0a868",
  rail: "#6a4020",
  water: "#3888e0",
  waterDeep: "#2a6cc8",
  waterShadow: "#2058b0",
  waterLight: "#7cc4f8",
  foam: "#dcf6ff",
  rock: "#b07c4c",
  rockDark: "#7c5232",
  rockDeep: "#58361c",
  rockLight: "#d8a46c",
  floor: "#8a7ea8",
  floorAlt: "#80749e",
  floorLight: "#aca0c8",
  floorDark: "#5e5280",
  grout: "#443a60",
  wallFace: "#7c6e9c",
  wallFaceDark: "#4c406c",
  wallLight: "#a092c0",
  wallTop: "#3e3460",
  wallTopAlt: "#4a3e6e",
  mortar: "#33294c",
  void: "#0c0814",
  outline: "#1c1230",
  gorge: "#1a1026",
  gorgeMist: "#2c2240",
  cobble: "#c4b49c",
  cobbleAlt: "#b6a68c",
  cobbleLight: "#e2d4bc",
  cobbleGrout: "#8a7a64",
  iron: "#586078",
  ironLight: "#8a94b0",
};

// Dungeon stonework comes in two flavors: Bramblekeep's cut purple stone,
// and the Hollow's raw, earthy cave rock.
export type DungeonTheme = {
  floor: string;
  floorAlt: string;
  floorLight: string;
  floorDark: string;
  grout: string;
  wallFace: string;
  wallFaceDark: string;
  wallLight: string;
  wallTop: string;
  wallTopAlt: string;
  mortar: string;
  deep: string;
  shadow: string;
};

const KEEP_STONE: DungeonTheme = {
  floor: COLORS.floor,
  floorAlt: COLORS.floorAlt,
  floorLight: COLORS.floorLight,
  floorDark: COLORS.floorDark,
  grout: COLORS.grout,
  wallFace: COLORS.wallFace,
  wallFaceDark: COLORS.wallFaceDark,
  wallLight: COLORS.wallLight,
  wallTop: COLORS.wallTop,
  wallTopAlt: COLORS.wallTopAlt,
  mortar: COLORS.mortar,
  deep: "#241c3c",
  shadow: "rgba(20, 10, 40, 0.35)",
};

const CAVE_ROCK: DungeonTheme = {
  floor: "#9a7a58",
  floorAlt: "#8e6f4f",
  floorLight: "#b8956c",
  floorDark: "#6a4e34",
  grout: "#4e3824",
  wallFace: "#8a6640",
  wallFaceDark: "#56391e",
  wallLight: "#ac865a",
  wallTop: "#3e2a18",
  wallTopAlt: "#4c3420",
  mortar: "#3a2412",
  deep: "#2a1a0e",
  shadow: "rgba(36, 20, 8, 0.4)",
};

export function dungeonTheme(roomId: string): DungeonTheme {
  return areaOf(roomId) === "hollow" ? CAVE_ROCK : KEEP_STONE;
}


const GRASSY = new Set([".", ",", "b", "p", "T", "o", "s", "C", "H", "x", "f"]);
const DUNGEON_FLOOR = new Set(["_", "L", "B", "S", "D", "P", "Q", "r", "u", "x", "t", "C", "p", "o"]);


// ---------------------------------------------------------------------------
// Overworld ground
// ---------------------------------------------------------------------------
function paintGrass(ctx: Painter, x: number, y: number, wx: number, wy: number): void {
  box(ctx, x, y, TILE, TILE, COLORS.grass);
  for (let i = 0; i < 9; i++) {
    const px = x + Math.floor(hash(wx, wy, i) * 15);
    const py = y + Math.floor(hash(wx, wy, i + 20) * 15);
    dot(ctx, px, py, hash(wx, wy, i + 40) < 0.5 ? COLORS.grassDark : COLORS.grassLight);
  }
  // Two or three little "v" tufts of blades.
  const tufts = 2 + Math.floor(hash(wx, wy, 60) * 2);
  for (let i = 0; i < tufts; i++) {
    const tx = x + 1 + Math.floor(hash(wx, wy, 70 + i) * 12);
    const ty = y + 2 + Math.floor(hash(wx, wy, 80 + i) * 12);
    dot(ctx, tx, ty, COLORS.grassDark);
    dot(ctx, tx + 2, ty, COLORS.grassDark);
    dot(ctx, tx + 1, ty + 1, COLORS.grassDark);
    dot(ctx, tx, ty - 1, COLORS.grassLight);
    dot(ctx, tx + 2, ty - 1, COLORS.grassLight);
  }
}

type Ground = { base: string; dark: string; light: string };
const DIRT: Ground = { base: COLORS.path, dark: COLORS.pathDark, light: COLORS.pathLight };
const SAND: Ground = { base: COLORS.sand, dark: COLORS.sandDark, light: COLORS.sandLight };

// Dirt paths and sandy beaches: speckled ground with grass creeping over
// any edge it shares with a lawn.
function paintPath(ctx: Painter, map: string[], col: number, row: number, x: number, y: number, wx: number, wy: number, ground = DIRT): void {
  box(ctx, x, y, TILE, TILE, ground.base);
  for (let i = 0; i < 4; i++) {
    const px = x + 2 + Math.floor(hash(wx, wy, i + 5) * 11);
    const py = y + 2 + Math.floor(hash(wx, wy, i + 15) * 11);
    box(ctx, px, py, 2, 1, ground.dark);
    dot(ctx, px, py - 1, ground.light);
  }
  // Grass creeps over the path's edges in a ragged fringe.
  const grassy = (c: number, r: number) => {
    const ch = at(map, c, r);
    return ch !== null && GRASSY.has(ch) && !(ch !== "." && ch !== "," && onBeach(map, c, r));
  };
  for (let i = 0; i < TILE; i++) {
    const depth = 1 + (hash(wx * 16 + i, wy, 3) < 0.45 ? 1 : 0);
    if (grassy(col, row - 1)) {
      box(ctx, x + i, y, 1, depth, COLORS.grass);
      dot(ctx, x + i, y + depth, ground.dark);
    }
    if (grassy(col, row + 1)) {
      box(ctx, x + i, y + TILE - depth, 1, depth, COLORS.grass);
      dot(ctx, x + i, y + TILE - depth - 1, ground.light);
    }
    if (grassy(col - 1, row)) {
      box(ctx, x, y + i, depth, 1, COLORS.grass);
      dot(ctx, x + depth, y + i, ground.dark);
    }
    if (grassy(col + 1, row)) {
      box(ctx, x + TILE - depth, y + i, depth, 1, COLORS.grass);
      dot(ctx, x + TILE - depth - 1, y + i, ground.dark);
    }
  }
}

// A prop (a chest, a rock) touching sand and no grass is sitting on the
// beach, so it gets sand under it.
export function onBeach(map: string[], col: number, row: number): boolean {
  const around = [at(map, col - 1, row), at(map, col + 1, row), at(map, col, row - 1), at(map, col, row + 1)];
  return around.includes(";") && !around.some((ch) => ch === "." || ch === ",");
}

// The same for the cobbled square: a stall, a sign or a doorstep with
// cobbles all round stands on cobbles.
export function onCobbles(map: string[], col: number, row: number): boolean {
  const around = [at(map, col - 1, row), at(map, col + 1, row), at(map, col, row - 1), at(map, col, row + 1)];
  return around.includes("+") && !around.some((ch) => ch === "." || ch === "," || ch === ":");
}

// A plank bridge over water, with rails along whichever sides face water.
function paintBridge(ctx: Painter, map: string[], col: number, row: number, x: number, y: number, wx: number, wy: number): void {
  paintWater(ctx, map, col, row, x, y, wx, wy);
  for (let plank = 0; plank < 4; plank++) {
    const py = y + plank * 4;
    box(ctx, x, py, TILE, 4, COLORS.plank);
    box(ctx, x, py, TILE, 1, COLORS.plankLight);
    box(ctx, x, py + 3, TILE, 1, COLORS.plankDark);
    dot(ctx, x + 3, py + 1, COLORS.plankDark);
    dot(ctx, x + 12, py + 1, COLORS.plankDark);
  }
  if (at(map, col - 1, row) === "~") {
    box(ctx, x, y, 2, TILE, COLORS.rail);
    dot(ctx, x, y + 1, COLORS.plankLight);
    dot(ctx, x, y + 9, COLORS.plankLight);
  }
  if (at(map, col + 1, row) === "~") {
    box(ctx, x + TILE - 2, y, 2, TILE, COLORS.rail);
    dot(ctx, x + TILE - 1, y + 1, COLORS.plankLight);
    dot(ctx, x + TILE - 1, y + 9, COLORS.plankLight);
  }
}

function paintWater(ctx: Painter, map: string[], col: number, row: number, x: number, y: number, wx: number, wy: number): void {
  box(ctx, x, y, TILE, TILE, COLORS.water);
  for (let i = 0; i < 6; i++) {
    const px = x + Math.floor(hash(wx, wy, i + 90) * 14);
    const py = y + Math.floor(hash(wx, wy, i + 95) * 15);
    box(ctx, px, py, 3, 1, COLORS.waterDeep);
  }
  const land = (c: number, r: number) => {
    const ch = at(map, c, r);
    return ch !== null && ch !== "~";
  };
  // The bank casts a shadow onto the water below it; foam laps at every edge.
  if (land(col, row - 1)) {
    box(ctx, x, y, TILE, 3, COLORS.waterShadow);
    box(ctx, x, y + 3, TILE, 1, COLORS.foam);
  }
  if (land(col, row + 1)) box(ctx, x, y + TILE - 1, TILE, 1, COLORS.foam);
  if (land(col - 1, row)) box(ctx, x, y, 1, TILE, COLORS.foam);
  if (land(col + 1, row)) box(ctx, x + TILE - 1, y, 1, TILE, COLORS.foam);
}

function paintCliff(ctx: Painter, map: string[], col: number, row: number, x: number, y: number, wx: number, wy: number): void {
  const below = at(map, col, row + 1);
  const face = below !== null && below !== "^" && below !== "E";
  box(ctx, x, y, TILE, TILE, COLORS.rock);
  if (face) {
    // A cliff face: vertical striations, darker toward the base.
    for (let i = 0; i < TILE; i++) {
      if (hash(wx * 16 + i, wy, 7) < 0.3) box(ctx, x + i, y + 3, 1, TILE - 5, COLORS.rockDark);
    }
    box(ctx, x, y, TILE, 2, COLORS.rockLight);
    box(ctx, x, y + TILE - 3, TILE, 3, COLORS.rockDark);
    box(ctx, x, y + TILE - 1, TILE, 1, COLORS.rockDeep);
  } else {
    // The rocky top: lumpy boulders with highlights and cracks.
    for (let i = 0; i < 4; i++) {
      const bx = x + Math.floor(hash(wx, wy, i + 30) * 12);
      const by = y + Math.floor(hash(wx, wy, i + 35) * 12);
      box(ctx, bx, by, 4, 3, COLORS.rockLight);
      box(ctx, bx + 1, by + 3, 4, 1, COLORS.rockDark);
    }
    for (let i = 0; i < 3; i++) {
      const cx = x + Math.floor(hash(wx, wy, i + 50) * 14);
      const cy = y + Math.floor(hash(wx, wy, i + 55) * 14);
      dot(ctx, cx, cy, COLORS.rockDeep);
      dot(ctx, cx + 1, cy + 1, COLORS.rockDeep);
    }
  }
}

// A gorge, seen from its south side: the far wall drops away as a cliff
// face into darkness, and the near wall is out of sight below the lip.
// The drawbridge's gap ("Y") is painted as gorge too; the bridge itself is
// drawn over it once it's down.
export function isGorge(ch: string | null): boolean {
  return ch === "v" || ch === "Y";
}

function paintGorge(ctx: Painter, map: string[], col: number, row: number, x: number, y: number, wx: number, wy: number): void {
  const open = (c: number, r: number) => {
    const ch = at(map, c, r);
    return ch === null || isGorge(ch);
  };
  box(ctx, x, y, TILE, TILE, COLORS.gorge);
  if (!open(col, row - 1)) {
    // The far wall: striated rock under a lit lip, sinking into shadow.
    box(ctx, x, y, TILE, 11, COLORS.rockDark);
    for (let i = 0; i < TILE; i++) {
      if (hash(wx * 16 + i, wy, 17) < 0.35) box(ctx, x + i, y + 3, 1, 5 + Math.floor(hash(wx * 16 + i, wy, 18) * 4), COLORS.rockDeep);
    }
    box(ctx, x, y, TILE, 2, COLORS.rockLight);
    box(ctx, x, y + 2, TILE, 1, COLORS.rock);
    box(ctx, x, y + 9, TILE, 2, COLORS.rockDeep);
  } else {
    // Further down: just the dark, and a wisp of mist.
    for (let i = 0; i < 3; i++) {
      const px = x + Math.floor(hash(wx, wy, i + 150) * 12);
      const py = y + 2 + Math.floor(hash(wx, wy, i + 155) * 12);
      box(ctx, px, py, 4, 1, COLORS.gorgeMist);
    }
  }
  // Where the gorge ends, its side walls; along the near edge, the rim.
  if (!open(col - 1, row)) box(ctx, x, y, 2, TILE, COLORS.rockDeep);
  if (!open(col + 1, row)) box(ctx, x + TILE - 2, y, 2, TILE, COLORS.rockDeep);
  if (!open(col, row + 1)) {
    box(ctx, x, y + TILE - 2, TILE, 2, COLORS.rockDark);
    box(ctx, x, y + TILE - 2, TILE, 1, COLORS.rockDeep);
  }
}

// Fernwhistle's cobbled streets: courses of squared stones, each a
// slightly different shade, with a dark kerb where they meet the grass.
function paintCobbles(ctx: Painter, map: string[], col: number, row: number, x: number, y: number, wx: number, wy: number): void {
  box(ctx, x, y, TILE, TILE, COLORS.cobbleGrout);
  for (let course = 0; course < 4; course++) {
    const cy = y + course * 4;
    const shift = (wy * 4 + course) % 2 === 0 ? 0 : 4;
    for (let sx = -shift; sx < TILE; sx += 8) {
      const x0 = Math.max(0, sx);
      const x1 = Math.min(TILE, sx + 7);
      const stone = hash(wx * 4 + Math.floor((sx + 8) / 8), wy * 4 + course, 9);
      box(ctx, x + x0, cy, x1 - x0, 3, stone < 0.5 ? COLORS.cobble : COLORS.cobbleAlt);
      box(ctx, x + x0, cy, x1 - x0, 1, COLORS.cobbleLight);
    }
  }
  // (Anything standing out in the square, a stall or the fountain, is on
  // cobbles too, so it doesn't get a kerb round it.)
  const lawn = (c: number, r: number) => {
    const ch = at(map, c, r);
    return ch !== null && GRASSY.has(ch) && !onCobbles(map, c, r);
  };
  if (lawn(col, row - 1)) box(ctx, x, y, TILE, 1, COLORS.cobbleGrout);
  if (lawn(col, row + 1)) box(ctx, x, y + TILE - 1, TILE, 1, COLORS.cobbleGrout);
  if (lawn(col - 1, row)) box(ctx, x, y, 1, TILE, COLORS.cobbleGrout);
  if (lawn(col + 1, row)) box(ctx, x + TILE - 1, y, 1, TILE, COLORS.cobbleGrout);
}

// ---------------------------------------------------------------------------
// The Fernwhistle drawbridge
// ---------------------------------------------------------------------------

// One tile of the lowered deck: planks across, with a rail along any side
// that drops into the gorge.
const deckTiles = new Map<string, HTMLCanvasElement>();

export function drawbridgeDeck(railLeft: boolean, railRight: boolean): HTMLCanvasElement {
  const key = `${railLeft}${railRight}`;
  let img = deckTiles.get(key);
  if (img) return img;
  img = document.createElement("canvas");
  img.width = TILE;
  img.height = TILE;
  const ctx = img.getContext("2d")!;
  for (let plank = 0; plank < 4; plank++) {
    const py = plank * 4;
    box(ctx, 0, py, TILE, 4, COLORS.plank);
    box(ctx, 0, py, TILE, 1, COLORS.plankLight);
    box(ctx, 0, py + 3, TILE, 1, COLORS.plankDark);
    dot(ctx, 3, py + 1, COLORS.plankDark);
    dot(ctx, 12, py + 1, COLORS.plankDark);
  }
  if (railLeft) {
    box(ctx, 0, 0, 2, TILE, COLORS.rail);
    dot(ctx, 0, 1, COLORS.plankLight);
    dot(ctx, 0, 9, COLORS.plankLight);
  }
  if (railRight) {
    box(ctx, TILE - 2, 0, 2, TILE, COLORS.rail);
    dot(ctx, TILE - 1, 1, COLORS.plankLight);
    dot(ctx, TILE - 1, 9, COLORS.plankLight);
  }
  deckTiles.set(key, img);
  return img;
}

// The drawbridge hauled up on its chains: the underside of the deck
// standing on end at the far lip, beams and iron bands and all, chained
// back to a post either side. `cols` x `rows` is the gap it spans.
const RAISED_MARGIN = 8;

function paintRaisedDrawbridge(cols: number, rows: number): HTMLCanvasElement {
  const deckW = cols * TILE;
  const deckH = rows * TILE;
  const w = deckW + RAISED_MARGIN * 2;
  const h = deckH;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const left = RAISED_MARGIN;
  for (let y = 0; y < deckH; y += 4) {
    box(ctx, left, y, deckW, 4, COLORS.plank);
    box(ctx, left, y, deckW, 1, COLORS.plankLight);
    box(ctx, left, y + 3, deckW, 1, COLORS.plankDark);
  }
  for (const bx of [left + 5, left + deckW - 8]) {
    box(ctx, bx, 0, 3, deckH, COLORS.rail);
    box(ctx, bx + 2, 0, 1, deckH, COLORS.plankDark);
  }
  for (const by of [6, deckH - 12]) {
    box(ctx, left, by, deckW, 3, COLORS.iron);
    box(ctx, left, by, deckW, 1, COLORS.ironLight);
    for (let rx = left + 2; rx < left + deckW - 1; rx += 5) dot(ctx, rx, by + 1, COLORS.ironLight);
  }
  box(ctx, left, 0, deckW, 2, COLORS.rail);
  box(ctx, left, 0, 1, deckH, COLORS.rail);
  box(ctx, left + deckW - 1, 0, 1, deckH, COLORS.rail);
  for (const side of [0, 1]) {
    const px = side === 0 ? 1 : w - 6;
    box(ctx, px, h - 18, 5, 18, COLORS.rail);
    box(ctx, px, h - 18, 5, 2, COLORS.plankLight);
    box(ctx, px + 4, h - 16, 1, 16, COLORS.plankDark);
    const x0 = px + 2;
    const y0 = h - 18;
    const x1 = side === 0 ? left + 2 : left + deckW - 3;
    const y1 = 3;
    const links = 14;
    for (let i = 0; i <= links; i++) {
      const t = i / links;
      const cx = Math.round(x0 + (x1 - x0) * t);
      const cy = Math.round(y0 + (y1 - y0) * t);
      box(ctx, cx, cy, 2, 2, i % 2 === 0 ? COLORS.ironLight : COLORS.iron);
    }
  }
  return outline(canvas);
}

// A dark one-pixel outline around everything opaque, like the sprites get.
function outline(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const { width: w, height: h } = canvas;
  const pixels = canvas.getContext("2d")!.getImageData(0, 0, w, h);
  const out = document.createElement("canvas");
  out.width = w + 2;
  out.height = h + 2;
  const octx = out.getContext("2d")!;
  octx.fillStyle = COLORS.outline;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (pixels.data[(y * w + x) * 4 + 3] > 0) octx.fillRect(x, y, 3, 3);
    }
  }
  octx.drawImage(canvas, 1, 1);
  return out;
}

// A cave mouth cut into the cliff face. Neighboring cave tiles merge into
// one wide opening.
function paintCave(ctx: Painter, map: string[], col: number, row: number, x: number, y: number, wx: number, wy: number): void {
  paintCliff(ctx, map, col, row, x, y, wx, wy);
  const left = at(map, col - 1, row) === "E";
  const right = at(map, col + 1, row) === "E";
  const x0 = left ? 0 : 3;
  const x1 = right ? TILE : TILE - 3;
  box(ctx, x + x0, y + 4, x1 - x0, TILE - 4, COLORS.void);
  if (!left) {
    box(ctx, x + x0, y + 4, 2, 2, COLORS.rock);
    dot(ctx, x + x0 + 2, y + 4, COLORS.rock);
  }
  if (!right) {
    box(ctx, x + x1 - 2, y + 4, 2, 2, COLORS.rock);
    dot(ctx, x + x1 - 3, y + 4, COLORS.rock);
  }
  box(ctx, x + x0, y + 3, x1 - x0, 1, COLORS.rockDeep);
}

// ---------------------------------------------------------------------------
// Dungeon ground
// ---------------------------------------------------------------------------
function paintFloor(ctx: Painter, t: DungeonTheme, x: number, y: number, wx: number, wy: number): void {
  box(ctx, x, y, TILE, TILE, t.grout);
  for (let sy = 0; sy < 2; sy++) {
    for (let sx = 0; sx < 2; sx++) {
      const px = x + sx * 8;
      const py = y + sy * 8;
      const base = (sx + sy + wx + wy) % 2 === 0 ? t.floor : t.floorAlt;
      box(ctx, px, py, 7, 7, base);
      box(ctx, px, py, 7, 1, t.floorLight);
      box(ctx, px, py, 1, 7, t.floorLight);
      box(ctx, px + 1, py + 6, 6, 1, t.floorDark);
      box(ctx, px + 6, py + 1, 1, 6, t.floorDark);
      if (hash(wx * 2 + sx, wy * 2 + sy, 4) < 0.35) dot(ctx, px + 2 + Math.floor(hash(wx, wy, sx + sy) * 3), py + 3, t.floorDark);
    }
  }
}

function paintWall(ctx: Painter, t: DungeonTheme, map: string[], col: number, row: number, x: number, y: number, wx: number, wy: number): void {
  const below = at(map, col, row + 1);
  const isWall = (c: number, r: number) => {
    const ch = at(map, c, r);
    return ch === null || ch === "#";
  };
  if (below !== null && below !== "#") {
    // A wall face: courses of bricks under a lit cap.
    box(ctx, x, y, TILE, TILE, t.wallFace);
    for (let course = 0; course < 4; course++) {
      const cy = y + course * 4;
      box(ctx, x, cy, TILE, 1, t.mortar);
      const offset = (course + wy) % 2 === 0 ? 0 : 4;
      for (let bx = offset; bx < TILE; bx += 8) box(ctx, x + bx, cy, 1, 4, t.mortar);
      box(ctx, x, cy + 1, TILE, 1, t.wallLight);
    }
    box(ctx, x, y, TILE, 2, t.wallLight);
    box(ctx, x, y + TILE - 2, TILE, 2, t.wallFaceDark);
    if (hash(wx, wy, 2) < 0.3) box(ctx, x + 3 + Math.floor(hash(wx, wy, 3) * 8), y + 6, 2, 2, t.wallFaceDark);
  } else {
    box(ctx, x, y, TILE, TILE, t.wallTop);
    for (let i = 0; i < 5; i++) {
      dot(ctx, x + Math.floor(hash(wx, wy, i + 11) * 16), y + Math.floor(hash(wx, wy, i + 13) * 16), t.wallTopAlt);
    }
    // Light the inner edge wherever the wall meets the room.
    if (!isWall(col + 1, row)) box(ctx, x + TILE - 2, y, 2, TILE, t.wallLight);
    if (!isWall(col - 1, row)) box(ctx, x, y, 2, TILE, t.wallLight);
    if (!isWall(col, row - 1)) box(ctx, x, y, TILE, 2, t.wallLight);
  }
}

function paintPit(ctx: Painter, t: DungeonTheme, map: string[], col: number, row: number, x: number, y: number): void {
  box(ctx, x, y, TILE, TILE, COLORS.void);
  if (at(map, col, row - 1) !== "v") {
    box(ctx, x, y, TILE, 2, t.floorDark);
    box(ctx, x, y + 2, TILE, 2, t.grout);
    box(ctx, x, y + 4, TILE, 1, t.deep);
  }
  if (at(map, col - 1, row) !== "v") box(ctx, x, y, 1, TILE, t.grout);
  if (at(map, col + 1, row) !== "v") box(ctx, x + TILE - 1, y, 1, TILE, t.grout);
}

function paintStairs(ctx: Painter, t: DungeonTheme, x: number, y: number): void {
  const steps = [t.floorLight, t.floor, t.floorDark, t.grout, t.deep];
  steps.forEach((color, i) => box(ctx, x, y + i * 3, TILE, 3, color));
  box(ctx, x, y, TILE, 1, t.wallLight);
}

// Floors next to walls get a soft cast shadow, which sells the depth.
function paintWallShadows(ctx: Painter, t: DungeonTheme, map: string[], col: number, row: number, x: number, y: number): void {
  ctx.fillStyle = t.shadow;
  if (at(map, col, row - 1) === "#") ctx.fillRect(x, y, TILE, 4);
  if (at(map, col - 1, row) === "#") ctx.fillRect(x, y, 3, TILE);
}

// ---------------------------------------------------------------------------
// Houses
// ---------------------------------------------------------------------------
function shadeHex(hex: number, k: number): string {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
  const b = Math.min(255, Math.round((hex & 255) * k));
  return `rgb(${r},${g},${b})`;
}

const ROOF_RISE = 12;

function paintHouse(def: HouseDecor): HTMLCanvasElement {
  const w = def.w * TILE + 6;
  const h = def.h * TILE + ROOF_RISE;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const wallTop = ROOF_RISE + 14;
  const left = 4;
  const right = w - 4;

  // Walls with a timber frame
  box(ctx, left, wallTop - 2, right - left, h - wallTop + 1, shadeHex(def.wall, 1));
  box(ctx, left, h - 3, right - left, 2, shadeHex(def.wall, 0.75));
  for (const bx of [left, left + Math.floor((right - left) / 2) - 1, right - 3]) box(ctx, bx, wallTop - 2, 3, h - wallTop, "#7a4422");
  box(ctx, left, wallTop, right - left, 2, "#7a4422");

  // Door with an arched top and a brass knob
  const doorX = Math.floor(w / 2) - 4;
  box(ctx, doorX, h - 13, 8, 12, "#6c3c1c");
  box(ctx, doorX + 1, h - 14, 6, 1, "#6c3c1c");
  box(ctx, doorX + 1, h - 12, 6, 11, "#9a5a2c");
  box(ctx, doorX + 4, h - 12, 1, 11, "#6c3c1c");
  dot(ctx, doorX + 6, h - 7, "#ffd040");

  // Lit windows
  for (const wx of [left + 6, right - 13]) {
    box(ctx, wx, wallTop + 4, 8, 7, "#5a3418");
    box(ctx, wx + 1, wallTop + 5, 6, 5, "#ffd86c");
    box(ctx, wx + 1, wallTop + 5, 6, 1, "#fff4b0");
    box(ctx, wx + 3, wallTop + 5, 1, 5, "#5a3418");
    box(ctx, wx + 1, wallTop + 7, 6, 1, "#5a3418");
  }

  // The roof: overlapping courses of shingles, a ridge, deep eaves.
  const roofBottom = wallTop + 1;
  for (let y = 0; y < roofBottom; y++) {
    const course = Math.floor(y / 4);
    const shade = 1.08 - course * 0.05;
    box(ctx, 0, y, w, 1, shadeHex(def.roof, shade));
    if (y % 4 === 3) {
      box(ctx, 0, y, w, 1, shadeHex(def.roof, 0.62));
      for (let x = (course % 2) * 3; x < w; x += 6) dot(ctx, x, y - 1, shadeHex(def.roof, 0.78));
    }
  }
  box(ctx, 0, 0, w, 2, shadeHex(def.roof, 1.3));
  box(ctx, 0, roofBottom - 1, w, 2, shadeHex(def.roof, 0.5));
  box(ctx, 0, 0, 2, roofBottom, shadeHex(def.roof, 0.7));
  box(ctx, w - 2, 0, 2, roofBottom, shadeHex(def.roof, 0.55));
  // Chimney
  box(ctx, right - 12, 0, 7, 9, "#b0563f");
  box(ctx, right - 13, 0, 9, 2, "#d8785c");
  box(ctx, right - 12, 4, 7, 1, "#7a2e20");

  return outline(canvas);
}

// ---------------------------------------------------------------------------
// Assembling a room
// ---------------------------------------------------------------------------
export type StandingProp = {
  // Depth-sort key: the bottom of its footprint, in room pixels.
  sortY: number;
  // `tiles` is the room as it stands right now, for the few props (the
  // drawbridge) that change with it.
  draw: (ctx: CanvasRenderingContext2D, ox: number, oy: number, time: number, tiles: string[][]) => void;
};

export type RoomArt = {
  ground: HTMLCanvasElement;
  props: StandingProp[];
  water: { x: number; y: number; wx: number; wy: number }[];
  flowers: { x: number; y: number; color: string; phase: number }[];
  torches: { x: number; y: number }[];
};

const FLOWER_COLORS = ["#fffaf0", "#ffd040", "#ff9cc8", "#b8ecff"];

function placeSprite(s: Sprite, col: number, row: number) {
  return { x: col * TILE + TILE / 2 - Math.floor(s.w / 2), y: row * TILE + TILE - s.baseline };
}

export function buildRoomArt(roomId: string): RoomArt {
  const def = ROOMS[roomId];
  const map = def.map;
  const overworld = areaOf(roomId) === "overworld";
  const interior = areaOf(roomId) === "interior";
  const stone = dungeonTheme(roomId);
  const { gx, gy } = parseRoomId(roomId);
  const sprites = getSprites();

  const ground = document.createElement("canvas");
  ground.width = map[0].length * TILE;
  ground.height = map.length * TILE;
  const ctx = ground.getContext("2d")!;
  const art: RoomArt = { ground, props: [], water: [], flowers: [], torches: [] };

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      const ch = map[row][col];
      const x = col * TILE;
      const y = row * TILE;
      // World-unique tile coordinates, so patterns don't repeat room to room.
      const wx = gx * ROOM_COLS + col + (overworld ? 0 : 500);
      const wy = gy * ROOM_ROWS + row;

      if (overworld) {
        if (ch === ":" || ch === "G") paintPath(ctx, map, col, row, x, y, wx, wy);
        else if (ch === ";") paintPath(ctx, map, col, row, x, y, wx, wy, SAND);
        else if (ch === "=") paintBridge(ctx, map, col, row, x, y, wx, wy);
        else if (ch === "~") {
          paintWater(ctx, map, col, row, x, y, wx, wy);
          art.water.push({ x, y, wx, wy });
        } else if (ch === "^") paintCliff(ctx, map, col, row, x, y, wx, wy);
        else if (isGorge(ch)) paintGorge(ctx, map, col, row, x, y, wx, wy);
        else if (ch === "+") paintCobbles(ctx, map, col, row, x, y, wx, wy);
        // A house's front door is under the house; anything else is a cave.
        else if (ch === "E" && at(map, col, row - 1) === "H") {
          if (onCobbles(map, col, row)) paintCobbles(ctx, map, col, row, x, y, wx, wy);
          else paintGrass(ctx, x, y, wx, wy);
        } else if (ch === "E") paintCave(ctx, map, col, row, x, y, wx, wy);
        else if (onBeach(map, col, row)) paintPath(ctx, map, col, row, x, y, wx, wy, SAND);
        else if (onCobbles(map, col, row)) paintCobbles(ctx, map, col, row, x, y, wx, wy);
        else paintGrass(ctx, x, y, wx, wy);
      } else if (interior) paintInteriorTile(ctx, def, col, row, wx, wy);
      else if (ch === "#") paintWall(ctx, stone, map, col, row, x, y, wx, wy);
      else if (ch === "v") paintPit(ctx, stone, map, col, row, x, y);
      else if (ch === "U") paintStairs(ctx, stone, x, y);
      else if (DUNGEON_FLOOR.has(ch)) {
        paintFloor(ctx, stone, x, y, wx, wy);
        paintWallShadows(ctx, stone, map, col, row, x, y);
      }

      if (ch === ",") {
        for (let i = 0; i < 3; i++) {
          art.flowers.push({
            x: x + 2 + Math.floor(hash(wx, wy, i + 100) * 11),
            y: y + 2 + Math.floor(hash(wx, wy, i + 110) * 11),
            color: FLOWER_COLORS[Math.floor(hash(wx, wy, i + 120) * FLOWER_COLORS.length)],
            phase: hash(wx, wy, i + 130),
          });
        }
      }

      // Standing props, depth-sorted with the characters.
      const sortY = y + TILE - 1;
      const still = (s: Sprite) => {
        const p = placeSprite(s, col, row);
        art.props.push({ sortY, draw: (c, ox, oy) => c.drawImage(s.img, ox + p.x, oy + p.y) });
      };
      if (ch === "T") {
        const tree = sprites.props.trees[Math.floor(hash(wx, wy, 140) * sprites.props.trees.length)];
        const p = placeSprite(tree, col, row);
        art.props.push({ sortY, draw: (c, ox, oy) => c.drawImage(tree.img, ox + p.x, oy + p.y + 1) });
      } else if (ch === "o") still(sprites.props.rock);
      else if (ch === "s") still(sprites.props.sign);
      else if (ch === "f" && overworld) {
        const img = fence(at(map, col - 1, row) === "f", at(map, col + 1, row) === "f", at(map, col, row - 1) === "f", at(map, col, row + 1) === "f");
        art.props.push({ sortY, draw: (c, ox, oy) => c.drawImage(img, ox + x - 1, oy + y + TILE - img.height + 1) });
      }
      else if (ch === "x") still(overworld ? sprites.props.statue.mossy : sprites.props.statue.plain);
      else if (ch === "t") {
        const brazier = sprites.props.brazier;
        const p = placeSprite(brazier, col, row);
        const flames = sprites.props.flame;
        art.torches.push({ x: x + TILE / 2, y: y + 6 });
        art.props.push({
          sortY,
          draw: (c, ox, oy, time) => {
            c.drawImage(brazier.img, ox + p.x, oy + p.y);
            const flame = flames[Math.floor(time * 9 + col * 3 + row) % flames.length];
            c.drawImage(flame.img, ox + x + 3, oy + y - 4 - (flame === flames[2] ? 1 : 0));
          },
        });
      }
    }
  }

  if (interior) art.props.push(...furnitureProps(def, sprites.props.flame));
  const gap = drawbridgeGap(map);
  if (gap) {
    // Standing up at the far lip until the bridge comes down.
    const img = paintRaisedDrawbridge(gap.cols, gap.rows);
    const x = gap.col * TILE - RAISED_MARGIN - 1;
    const y = gap.row * TILE - img.height + 1;
    art.props.push({
      sortY: gap.row * TILE - 1,
      draw: (c, ox, oy, _time, tiles) => {
        if (tiles[gap.row][gap.col] !== "=") c.drawImage(img, ox + x, oy + y);
      },
    });
  }

  for (const d of def.decor ?? []) {
    switch (d.kind) {
      case "house": {
        const img = paintHouse(d);
        const hx = d.col * TILE - 4;
        const hy = (d.row + d.h) * TILE - img.height + 1;
        art.props.push({ sortY: (d.row + d.h) * TILE - 1, draw: (c, ox, oy) => c.drawImage(img, ox + hx, oy + hy) });
        break;
      }
      case "windmill":
        art.props.push(windmill(d.col, d.row));
        break;
      case "stall":
        art.props.push(stall(d.col, d.row, d.awning, d.goods));
        break;
      case "fountain":
        art.props.push(fountain(d.col, d.row));
        break;
    }
  }
  return art;
}

// The block of drawbridge tiles in a room, if it has one.
function drawbridgeGap(map: string[]): { col: number; row: number; cols: number; rows: number } | null {
  const row = map.findIndex((line) => line.includes("Y"));
  if (row < 0) return null;
  const col = map[row].indexOf("Y");
  let cols = 0;
  while (map[row][col + cols] === "Y") cols++;
  let rows = 0;
  while (map[row + rows]?.[col] === "Y") rows++;
  return { col, row, cols, rows };
}

// Things painted fresh every frame on top of the ground: glinting water,
// nodding flowers.
export function drawGroundAnimation(ctx: CanvasRenderingContext2D, art: RoomArt, ox: number, oy: number, time: number): void {
  for (const w of art.water) {
    for (let i = 0; i < 2; i++) {
      const phase = (time * 0.6 + hash(w.wx, w.wy, i + 200)) % 1;
      const gx = ox + w.x + 2 + Math.floor(((hash(w.wx, w.wy, i + 210) * 10 + phase * 6) % 12));
      const gy = oy + w.y + 5 + i * 5 + Math.floor(hash(w.wx, w.wy, i + 220) * 3);
      if (phase < 0.7) box(ctx, gx, gy, phase < 0.35 ? 3 : 2, 1, COLORS.waterLight);
    }
  }
  for (const f of art.flowers) {
    const sway = Math.floor(time * 2 + f.phase * 2) % 2;
    const x = ox + f.x;
    const y = oy + f.y;
    dot(ctx, x, y + 2, COLORS.grassDark);
    if (sway === 0) {
      dot(ctx, x, y - 1, f.color);
      dot(ctx, x - 1, y, f.color);
      dot(ctx, x + 1, y, f.color);
      dot(ctx, x, y + 1, f.color);
    } else {
      dot(ctx, x - 1, y - 1, f.color);
      dot(ctx, x + 1, y - 1, f.color);
      dot(ctx, x - 1, y + 1, f.color);
      dot(ctx, x + 1, y + 1, f.color);
    }
    dot(ctx, x, y, "#ffd040");
  }
}
