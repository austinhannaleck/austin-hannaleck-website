import { TILE } from "../engine/types";
import type { RoomDef } from "../engine/world";
import { at, box, dot, hash, type Painter } from "./paint";
import type { Sprite } from "./pixelart";

// Inside the houses: striped wallpaper over wood paneling, plank
// floors, a rug, and the furniture, all painted in code like the houses
// outside. The room sits in the middle of the screen with darkness all
// around, the way the classics framed a cozy indoor scene.

const C = {
  void: "#1c1230",
  trim: "#6a3a1a",
  paper: "#f0d4a4",
  paperStripe: "#e2bc88",
  rail: "#8a5a30",
  wainscot: "#a8683a",
  wainscotLight: "#c8884e",
  wainscotDark: "#74421e",
  plank: "#c48a52",
  plankAlt: "#b87e48",
  plankLight: "#dca068",
  plankSeam: "#7e4c26",
  rug: "#b83c4c",
  rugLight: "#e2707a",
  rugBorder: "#f0c060",
  rugBorderDark: "#c08a30",
  wood: "#a86a3a",
  woodLight: "#d8a868",
  woodDark: "#6c3c1c",
  stone: "#b0a8a8",
  stoneDark: "#7a7070",
  stoneLight: "#d0caca",
  shadow: "rgba(60, 30, 10, 0.3)",
};

const BOOK_COLORS = ["#d84a4a", "#4a7ad8", "#58b848", "#e8c040", "#a868f0", "#f08a3a", "#3aa8a0"];

// Every house has its own wallpaper: a base and a stripe.
type Wallpaper = NonNullable<RoomDef["wallpaper"]>;
const WALLPAPER: Record<Wallpaper, { paper: string; stripe: string }> = {
  cream: { paper: C.paper, stripe: C.paperStripe },
  rose: { paper: "#f4c8c4", stripe: "#e4a4a4" },
  sage: { paper: "#c8dcb0", stripe: "#a8c490" },
  sky: { paper: "#c4dcf0", stripe: "#a0c0e0" },
  gold: { paper: "#f0dc98", stripe: "#d8b860" },
};

function isWall(map: string[], col: number, row: number): boolean {
  const ch = at(map, col, row);
  return ch === null || ch === "#";
}

// ---------------------------------------------------------------------------
// The ground layer
// ---------------------------------------------------------------------------
function paintWall(ctx: Painter, map: string[], col: number, row: number, x: number, y: number, wallpaper: Wallpaper): void {
  const below = at(map, col, row + 1);
  if (below !== null && below !== "#") {
    // The back wall: wallpaper above, wood paneling below.
    const { paper, stripe } = WALLPAPER[wallpaper];
    box(ctx, x, y, TILE, TILE, paper);
    for (let sx = 1; sx < TILE; sx += 4) box(ctx, x + sx, y + 2, 1, 8, stripe);
    box(ctx, x, y, TILE, 2, C.rail);
    box(ctx, x, y + 10, TILE, 6, C.wainscot);
    box(ctx, x, y + 10, TILE, 1, C.wainscotLight);
    box(ctx, x, y + 15, TILE, 1, C.wainscotDark);
    for (let bx = 3; bx < TILE; bx += 8) box(ctx, x + bx, y + 11, 1, 4, C.wainscotDark);
    return;
  }
  // Everything else is the dark beyond, with a wooden trim wherever it
  // meets the room.
  box(ctx, x, y, TILE, TILE, C.void);
  if (!isWall(map, col + 1, row)) box(ctx, x + TILE - 2, y, 2, TILE, C.trim);
  if (!isWall(map, col - 1, row)) box(ctx, x, y, 2, TILE, C.trim);
  if (!isWall(map, col, row - 1)) box(ctx, x, y, TILE, 2, C.trim);
}

function paintPlanks(ctx: Painter, x: number, y: number, wx: number, wy: number): void {
  for (let p = 0; p < 4; p++) {
    const py = y + p * 4;
    const seed = wy * 4 + p;
    box(ctx, x, py, TILE, 4, hash(wx, seed, 61) < 0.5 ? C.plank : C.plankAlt);
    box(ctx, x, py, TILE, 1, C.plankLight);
    box(ctx, x, py + 3, TILE, 1, C.plankSeam);
    if (hash(wx, seed, 63) < 0.6) box(ctx, x + Math.floor(hash(wx, seed, 62) * TILE), py, 1, 4, C.plankSeam);
    if (hash(wx, seed, 64) < 0.15) dot(ctx, x + 2 + Math.floor(hash(wx, seed, 65) * 12), py + 1, C.plankSeam);
  }
}

function paintRug(ctx: Painter, map: string[], col: number, row: number, x: number, y: number): void {
  const rug = (c: number, r: number) => {
    const ch = at(map, c, r);
    return ch === "R" || ch === "O";
  };
  box(ctx, x, y, TILE, TILE, C.rug);
  // A little diamond in the middle of each tile.
  for (const [dx, dy] of [
    [7, 4],
    [6, 5],
    [8, 5],
    [5, 6],
    [9, 6],
    [6, 7],
    [8, 7],
    [7, 8],
  ]) {
    dot(ctx, x + dx, y + dy + 1, C.rugLight);
  }
  // A gold border with fringe on the outside edges.
  if (!rug(col, row - 1)) {
    box(ctx, x, y, TILE, 2, C.rugBorder);
    box(ctx, x, y + 2, TILE, 1, C.rugBorderDark);
  }
  if (!rug(col, row + 1)) {
    box(ctx, x, y + TILE - 2, TILE, 2, C.rugBorder);
    box(ctx, x, y + TILE - 3, TILE, 1, C.rugBorderDark);
  }
  if (!rug(col - 1, row)) {
    box(ctx, x, y, 2, TILE, C.rugBorder);
    for (let i = 1; i < TILE; i += 2) dot(ctx, x - 1, y + i, C.rugBorder);
  }
  if (!rug(col + 1, row)) {
    box(ctx, x + TILE - 2, y, 2, TILE, C.rugBorder);
    for (let i = 1; i < TILE; i += 2) dot(ctx, x + TILE, y + i, C.rugBorder);
  }
}

// The way out: a doormat in the gap in the bottom wall.
function paintDoorway(ctx: Painter, x: number, y: number, wx: number, wy: number): void {
  paintPlanks(ctx, x, y, wx, wy);
  box(ctx, x, y + 2, TILE, 10, "#7a5a3a");
  for (let i = 0; i < TILE; i += 3) box(ctx, x + i, y + 3, 1, 8, "#5a3e24");
  box(ctx, x, y + 12, TILE, 4, "rgba(255, 240, 200, 0.25)");
}

function paintShadows(ctx: Painter, map: string[], col: number, row: number, x: number, y: number): void {
  ctx.fillStyle = C.shadow;
  if (isWall(map, col, row - 1)) ctx.fillRect(x, y, TILE, 4);
  if (isWall(map, col - 1, row)) ctx.fillRect(x, y, 3, TILE);
  if (isWall(map, col + 1, row)) ctx.fillRect(x + TILE - 3, y, 3, TILE);
}

export function paintInteriorTile(ctx: Painter, def: RoomDef, col: number, row: number, wx: number, wy: number): void {
  const map = def.map;
  const ch = map[row][col];
  const x = col * TILE;
  const y = row * TILE;
  if (ch === "#") {
    paintWall(ctx, map, col, row, x, y, def.wallpaper ?? "cream");
  } else if (ch === "E") {
    paintDoorway(ctx, x, y, wx, wy);
  } else {
    // Rugs run under the table that stands on them.
    const around = [at(map, col - 1, row), at(map, col + 1, row), at(map, col, row - 1), at(map, col, row + 1)];
    if (ch === "R" || (ch === "O" && around.includes("R"))) paintRug(ctx, map, col, row, x, y);
    else paintPlanks(ctx, x, y, wx, wy);
    paintShadows(ctx, map, col, row, x, y);
  }
}

// ---------------------------------------------------------------------------
// Furniture: standing props, drawn depth-sorted with the characters.
// ---------------------------------------------------------------------------
export type FurnitureProp = {
  sortY: number;
  draw: (ctx: CanvasRenderingContext2D, ox: number, oy: number, time: number) => void;
};

// A canvas with two pixels of headroom, so a painter can let things (a
// teapot lid, a bell's knob) poke up above y=0. Drawn two pixels higher
// to match.
const HEADROOM = 2;

function canvas(w: number, h: number, paint: (ctx: Painter) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h + HEADROOM;
  const ctx = c.getContext("2d")!;
  ctx.translate(0, HEADROOM);
  paint(ctx);
  return c;
}

function still(img: HTMLCanvasElement, x: number, y: number, sortY: number): FurnitureProp {
  return { sortY, draw: (c, ox, oy) => c.drawImage(img, ox + x, oy + y - HEADROOM) };
}

const JAR_COLORS = ["#7ad87a", "#8cc4ff", "#e8a040", "#ff9cc8", "#dcb4ff"];

// A row of stoppered jars: Haggleby's stock. (Mostly snacks. Mostly pickles.)
function jars(ctx: Painter, top: number, wx: number, wy: number, shelf: number): void {
  for (let i = 0; i < 3; i++) {
    const jx = 2 + i * 4 + Math.floor(hash(wx + i, wy + shelf, 75) * 2);
    const h = 4 + Math.floor(hash(wx + i, wy + shelf, 76) * 2);
    const color = JAR_COLORS[Math.floor(hash(wx * 5 + i, wy * 3 + shelf, 77) * JAR_COLORS.length)];
    box(ctx, jx, top + 7 - h, 3, h, color);
    dot(ctx, jx, top + 8 - h, "rgba(255, 255, 255, 0.7)");
    box(ctx, jx, top + 6 - h, 3, 1, C.plank);
  }
}

// A row of loaves and buns: the Bakery's shelves.
function loaves(ctx: Painter, top: number, wx: number, wy: number, shelf: number): void {
  for (let i = 0; i < 2; i++) {
    const lx = 2 + i * 6;
    if (hash(wx + i, wy + shelf, 78) < 0.5) {
      // A long loaf with slashes across the top.
      box(ctx, lx, top + 3, 6, 4, "#c8803c");
      box(ctx, lx + 1, top + 2, 4, 1, "#e0a058");
      dot(ctx, lx + 2, top + 3, "#f0c890");
      dot(ctx, lx + 4, top + 3, "#f0c890");
    } else {
      // A round bun, iced.
      box(ctx, lx + 1, top + 3, 4, 4, "#d8904a");
      box(ctx, lx + 1, top + 3, 4, 1, "#fffaf0");
      dot(ctx, lx + 2, top + 4, "#fffaf0");
    }
  }
}

// Pigeonholes, most of them stuffed with letters: the Post Office.
function pigeonholes(ctx: Painter, top: number, wx: number, wy: number, shelf: number): void {
  for (let i = 0; i < 3; i++) {
    const px = 1 + i * 5;
    box(ctx, px, top, 4, 7, "#2a1406");
    if (hash(wx * 3 + i, wy + shelf, 79) < 0.75) {
      box(ctx, px, top + 2, 4, 5, "#fffaf0");
      box(ctx, px, top + 2, 4, 1, "#d8ccb8");
      if (hash(wx * 3 + i, wy + shelf, 80) < 0.4) dot(ctx, px + 2, top + 4, "#f04050");
    }
  }
}

// One section of shelving per tile, 30px tall, so it climbs the wall:
// books at Nana's, jars in the shop, bread at the Bakery, letters at the
// Post Office.
function bookshelf(wx: number, wy: number, stock: NonNullable<RoomDef["shelves"]>): HTMLCanvasElement {
  return canvas(TILE, 30, (ctx) => {
    box(ctx, 0, 0, TILE, 30, C.woodDark);
    box(ctx, 1, 1, TILE - 2, 28, "#4a2810");
    for (let shelf = 0; shelf < 3; shelf++) {
      const top = 2 + shelf * 9;
      if (stock !== "books") {
        if (stock === "jars") jars(ctx, top, wx, wy, shelf);
        else if (stock === "bread") loaves(ctx, top, wx, wy, shelf);
        else pigeonholes(ctx, top, wx, wy, shelf);
        box(ctx, 1, top + 7, TILE - 2, 2, C.wood);
        box(ctx, 1, top + 7, TILE - 2, 1, C.woodLight);
        continue;
      }
      let bx = 2;
      let i = 0;
      while (bx < TILE - 2) {
        const w = 1 + Math.floor(hash(wx * 7 + i, wy * 3 + shelf, 71) * 2);
        const h = 5 + Math.floor(hash(wx * 7 + i, wy * 3 + shelf, 72) * 3);
        const color = BOOK_COLORS[Math.floor(hash(wx * 7 + i, wy * 3 + shelf, 73) * BOOK_COLORS.length)];
        const width = Math.min(w + 1, TILE - 2 - bx);
        box(ctx, bx, top + 7 - h, width, h, color);
        box(ctx, bx, top + 7 - h, width, 1, "rgba(255, 255, 255, 0.35)");
        bx += width + (hash(wx + i, shelf, 74) < 0.2 ? 1 : 0);
        i++;
      }
      box(ctx, 1, top + 7, TILE - 2, 2, C.wood);
      box(ctx, 1, top + 7, TILE - 2, 1, C.woodLight);
    }
    box(ctx, 0, 0, TILE, 1, C.woodLight);
  });
}

// A stone hearth two tiles wide, with a wooden mantel and a fire that
// never goes out.
function fireplace(flames: Sprite[]): { img: HTMLCanvasElement; draw: (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => void } {
  const w = TILE * 2;
  const h = 30;
  const img = canvas(w, h, (ctx) => {
    for (let row = 0; row < h; row += 4) {
      box(ctx, 0, row, w, 4, C.stone);
      box(ctx, 0, row + 3, w, 1, C.stoneDark);
      const offset = (row / 4) % 2 === 0 ? 0 : 4;
      for (let bx = offset; bx < w; bx += 8) box(ctx, bx, row, 1, 3, C.stoneDark);
      box(ctx, 0, row, w, 1, C.stoneLight);
    }
    // The mantel, with a candle on each end.
    box(ctx, -1, 4, w + 2, 3, C.wood);
    box(ctx, -1, 4, w + 2, 1, C.woodLight);
    box(ctx, 0, 7, w, 1, C.woodDark);
    for (const cx of [3, w - 5]) {
      box(ctx, cx, 0, 2, 4, "#fffaf0");
      dot(ctx, cx, -1, "#4a2810");
    }
    // The firebox: a dark arch with logs.
    box(ctx, 8, 13, 16, 17, "#2a1810");
    box(ctx, 9, 12, 14, 1, "#2a1810");
    box(ctx, 10, 26, 12, 2, C.woodDark);
    box(ctx, 9, 27, 6, 2, C.wood);
    box(ctx, 17, 27, 6, 2, C.wood);
  });
  return {
    img,
    draw: (ctx, x, y, time) => {
      ctx.drawImage(img, x, y - HEADROOM);
      const f = flames[Math.floor(time * 9) % flames.length];
      ctx.drawImage(f.img, x + 11, y + 16 - (f === flames[2] ? 1 : 0));
      // Candle flames flicker too.
      if (Math.floor(time * 6) % 2 === 0) {
        dot(ctx, x + 3, y - 2, "#fff4a0");
        dot(ctx, x + w - 5, y - 2, "#fff4a0");
      }
      // A warm glow on the floor in front.
      const glow = 0.1 + Math.sin(time * 7) * 0.03;
      ctx.fillStyle = `rgba(255, 160, 60, ${glow})`;
      ctx.fillRect(x + 4, y + h, w - 8, 6);
      ctx.fillRect(x + 8, y + h + 6, w - 16, 3);
    },
  };
}

// The hero's own bed: a wooden frame, a fat pillow, and the patchwork
// blanket Nana knitted.
function bed(): HTMLCanvasElement {
  return canvas(TILE, TILE * 2 + 4, (ctx) => {
    box(ctx, 0, 0, TILE, 8, C.woodDark);
    box(ctx, 1, 1, TILE - 2, 6, C.wood);
    box(ctx, 1, 1, TILE - 2, 1, C.woodLight);
    box(ctx, 1, 6, TILE - 2, 28, "#f4ecdc");
    box(ctx, 3, 7, TILE - 6, 5, "#fffaf0");
    box(ctx, 3, 11, TILE - 6, 1, "#d8ccb8");
    const patches = ["#3a7cf0", "#8cc4ff", "#f04050", "#ffd040"];
    for (let py = 0; py < 4; py++) {
      for (let px = 0; px < 3; px++) box(ctx, 1 + px * 5, 13 + py * 5, 5, 5, patches[(px + py * 2) % patches.length]);
    }
    box(ctx, 1, 13, TILE - 2, 1, "rgba(255, 255, 255, 0.4)");
    box(ctx, 0, 32, TILE, 4, C.woodDark);
    box(ctx, 1, 32, TILE - 2, 1, C.wood);
  });
}

// A sack, tied off at the top: flour at the Bakery, mail at the Post
// Office.
function sack(flour: boolean): HTMLCanvasElement {
  const cloth = flour ? "#f0e8d4" : "#c8a878";
  const shade = flour ? "#c8bca0" : "#9a7a50";
  return canvas(TILE, 18, (ctx) => {
    box(ctx, 2, 5, 12, 13, cloth);
    box(ctx, 1, 8, 14, 9, cloth);
    box(ctx, 3, 4, 10, 1, cloth);
    box(ctx, 12, 6, 2, 11, shade);
    box(ctx, 2, 16, 12, 2, shade);
    box(ctx, 6, 1, 4, 3, cloth);
    box(ctx, 5, 3, 6, 1, "#8a5a30");
    box(ctx, 4, 6, 3, 1, "#ffffff");
    if (flour) {
      box(ctx, 5, 10, 6, 1, "#7a9ad8");
      box(ctx, 6, 12, 4, 1, "#7a9ad8");
    } else {
      box(ctx, 5, 10, 6, 4, "#fffaf0");
      dot(ctx, 9, 11, "#f04050");
    }
  });
}

// A low table, as long as it needs to be. The left end gets the teapot,
// the right a couple of cups.
function table(width: number): HTMLCanvasElement {
  return canvas(width, 18, (ctx) => {
    box(ctx, 1, 12, 2, 6, C.woodDark);
    box(ctx, width - 3, 12, 2, 6, C.woodDark);
    box(ctx, 0, 4, width, 8, C.wood);
    box(ctx, 0, 4, width, 1, C.woodLight);
    box(ctx, 0, 10, width, 2, C.woodDark);
    // Teapot
    box(ctx, 4, 0, 6, 5, "#fffaf0");
    box(ctx, 5, -1, 4, 1, "#fffaf0");
    box(ctx, 4, 2, 6, 1, "#4a7ad8");
    box(ctx, 10, 2, 2, 1, "#fffaf0");
    dot(ctx, 3, 2, "#fffaf0");
    dot(ctx, 7, -1, "#4a7ad8");
    // Cups
    for (const cx of [width - 10, width - 6]) {
      box(ctx, cx, 2, 3, 3, "#fffaf0");
      dot(ctx, cx + 1, 2, "#a8683a");
    }
  });
}

// One tile of shop counter: a wooden top you can lean on, a paneled front.
function counter(map: string[], col: number, row: number, bell: boolean): HTMLCanvasElement {
  const counterAt = (c: number) => ["n", "w", "i"].includes(at(map, c, row) ?? "");
  return canvas(TILE, TILE + 6, (ctx) => {
    box(ctx, 0, 0, TILE, 7, C.woodLight);
    box(ctx, 0, 0, TILE, 1, "#f0c890");
    box(ctx, 0, 6, TILE, 1, C.woodDark);
    box(ctx, 0, 7, TILE, TILE - 1, C.wood);
    for (let bx = 3; bx < TILE; bx += 5) box(ctx, bx, 8, 1, TILE - 3, C.woodDark);
    box(ctx, 0, TILE + 5, TILE, 1, C.woodDark);
    if (!counterAt(col - 1)) box(ctx, 0, 0, 1, TILE + 6, C.woodDark);
    if (!counterAt(col + 1)) box(ctx, TILE - 1, 0, 1, TILE + 6, C.woodDark);
    if (bell) {
      // A brass service bell.
      box(ctx, 5, 4, 7, 2, "#c89020");
      box(ctx, 6, 1, 5, 3, "#ffd040");
      box(ctx, 7, 0, 3, 1, "#ffd040");
      dot(ctx, 8, -1, "#c89020");
      dot(ctx, 7, 1, "#fff4a0");
    }
  });
}

export function furnitureProps(def: RoomDef, flames: Sprite[]): FurnitureProp[] {
  const props: FurnitureProp[] = [];
  const map = def.map;
  const flour = def.shelves === "bread";
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      const ch = map[row][col];
      const x = col * TILE;
      const y = row * TILE;
      const bottom = y + TILE - 1;
      if (ch === "K") {
        props.push(still(bookshelf(col, row, def.shelves ?? "books"), x, y + TILE - 30, bottom));
      } else if (ch === "F" && at(map, col - 1, row) !== "F") {
        const hearth = fireplace(flames);
        props.push({ sortY: bottom, draw: (c, ox, oy, time) => hearth.draw(c, ox + x, oy + y + TILE - 30, time) });
      } else if (ch === "Z" && at(map, col, row - 1) !== "Z") {
        props.push(still(bed(), x, y - 4, bottom + TILE));
      } else if (ch === "O" && at(map, col - 1, row) !== "O") {
        let tiles = 1;
        while (at(map, col + tiles, row) === "O") tiles++;
        props.push(still(table(tiles * TILE), x, y - 1, bottom));
      } else if (ch === "q") {
        props.push(still(sack(flour), x, y + TILE - 18, bottom));
      } else if (ch === "n" || ch === "w" || ch === "i") {
        props.push(still(counter(map, col, row, ch === "i"), x, y - 6, bottom));
      }
    }
  }
  return props;
}
