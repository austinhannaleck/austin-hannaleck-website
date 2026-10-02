import { initialTiles } from "../engine/room";
import { OPEN_CHEST } from "../engine/tiles";
import { ROOM_COLS, ROOM_H, ROOM_ROWS, TILE, type GameState } from "../engine/types";
import { ROOMS, allRoomIds, areaOf, cellAt, cellsOf, decorFootprint, parseRoomId, type Decor } from "../engine/world";
import { AREA_TITLES, MAP_ARROWS, areaCells, cellRect, cellSeen, heroOnMap, knownAreas, mapLayout, roomRect, type MapView } from "../ui/map";
import { GOLD, HUD_H, INK, PANEL_EDGE, SCREEN_W, SHADOW, panel, rect, text } from "./screens";
import type { Sprites } from "./sprites";
import { hash } from "./paint";
import { COLORS, dungeonTheme, onBeach, onCobbles, type DungeonTheme } from "./tiles";

// The map screen. Every room the hero has visited is redrawn in miniature
// from its own tile map, a few screen pixels per tile, so the map is
// always true to the world: trees read as forest, the river runs where it
// runs, an unlocked door shows open. Rooms not yet visited stay under the
// fog.

const SCREEN_H = HUD_H + ROOM_H;
const FOG = "#141040";
const FOG_SPECK = "#221c5c";
const DIM = "#8898e0";

// Pointer-only devices get "tap" instead of a key name in the hint.
const TOUCH = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

const STONE_GREY = "#b0b8cc";
const STONE_SHADE = "#6a7090";

type Cell = {
  ch: string;
  // Neighbor at an offset, or null past the room's edge.
  at: (dc: number, dr: number) => string | null;
  s: number;
  wx: number;
  wy: number;
  fill: (dx: number, dy: number, w: number, h: number, color: string) => void;
};

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

// Something standing on its tile: a square inset a pixel (at larger
// scales), shaded along the bottom.
function blob(c: Cell, color: string, shade: string): void {
  const i = Math.floor(c.s / 4);
  const w = c.s - 2 * i;
  c.fill(i, i, w, w, color);
  c.fill(i, i + w - 1, w, 1, shade);
}

// A small centered dot: a sign, a torch, a peg.
function mark(c: Cell, color: string): void {
  const m = Math.max(1, Math.floor(c.s / 2));
  const o = Math.floor((c.s - m) / 2);
  c.fill(o, o, m, m, color);
}

function speck(c: Cell, chance: number, color: string, seed: number): void {
  if (hash(c.wx, c.wy, seed) >= chance) return;
  const x = Math.floor(hash(c.wx, c.wy, seed + 1) * c.s);
  const y = Math.floor(hash(c.wx, c.wy, seed + 2) * c.s);
  c.fill(x, y, 1, 1, color);
}

function chest(c: Cell): void {
  if (c.ch === OPEN_CHEST) blob(c, COLORS.plankDark, COLORS.rail);
  else blob(c, GOLD, "#c89020");
}

function water(c: Cell): void {
  c.fill(0, 0, c.s, c.s, COLORS.water);
  speck(c, 0.12, COLORS.waterLight, 31);
  // Foam along every shore (but not off the room's edge, where the sea
  // carries on into the next room).
  const shore = (dc: number, dr: number) => {
    const n = c.at(dc, dr);
    return n !== null && n !== "~";
  };
  if (shore(0, -1)) c.fill(0, 0, c.s, 1, COLORS.foam);
  if (shore(0, 1)) c.fill(0, c.s - 1, c.s, 1, COLORS.foam);
  if (shore(-1, 0)) c.fill(0, 0, 1, c.s, COLORS.foam);
  if (shore(1, 0)) c.fill(c.s - 1, 0, 1, c.s, COLORS.foam);
}

// A building, or whatever else stands on "H" tiles, from above.
function house(c: Cell, col: number, row: number, decor: Decor[]): void {
  const d = decor.find((h) => {
    const { w, h: tall } = decorFootprint(h);
    return col >= h.col && col < h.col + w && row >= h.row && row < h.row + tall;
  });
  if (!d) {
    c.fill(0, 0, c.s, c.s, COLORS.rockDark);
    return;
  }
  const { w, h } = decorFootprint(d);
  const bottom = row === d.row + h - 1;
  switch (d.kind) {
    case "windmill":
      c.fill(0, 0, c.s, c.s, bottom ? STONE_GREY : "#8a5a30");
      if (bottom && col === d.col + 1) mark(c, "#6c3c1c");
      return;
    case "stall":
      c.fill(0, 0, c.s, c.s, hex(d.awning));
      for (let x = 1; x < c.s; x += 2) c.fill(x, 0, 1, c.s, INK);
      return;
    case "fountain":
      c.fill(0, 0, c.s, c.s, STONE_GREY);
      c.fill(col === d.col ? 1 : 0, row === d.row ? 1 : 0, c.s - 1, c.s - 1, COLORS.water);
      return;
    case "house":
      c.fill(0, 0, c.s, c.s, hex(bottom ? d.wall : d.roof));
      if (row === d.row) c.fill(0, 0, c.s, 1, "rgba(255, 255, 255, 0.35)");
      if (bottom) {
        c.fill(0, 0, c.s, 1, "rgba(0, 0, 0, 0.3)");
        if (col === d.col + Math.floor(w / 2)) mark(c, "#6c3c1c");
      }
  }
}

function paintOverworld(c: Cell, col: number, row: number, map: string[], houses: Decor[]): void {
  const s = c.s;
  // A house's front door is part of the house.
  if (c.ch === "E" && c.at(0, -1) === "H") {
    house(c, col, row, houses);
    return;
  }
  const ground = onBeach(map, col, row) ? COLORS.sand : onCobbles(map, col, row) ? COLORS.cobble : COLORS.grass;
  const onGround = () => c.fill(0, 0, s, s, ground);
  switch (c.ch) {
    case ".":
      c.fill(0, 0, s, s, COLORS.grass);
      speck(c, 0.18, COLORS.grassLight, 3);
      break;
    case ",":
      c.fill(0, 0, s, s, COLORS.grass);
      speck(c, 0.9, ["#fffaf0", "#ffd040", "#ff9cc8"][Math.floor(hash(c.wx, c.wy, 9) * 3)], 5);
      break;
    case ":":
      c.fill(0, 0, s, s, COLORS.path);
      speck(c, 0.15, COLORS.pathDark, 7);
      break;
    case ";":
      c.fill(0, 0, s, s, COLORS.sand);
      speck(c, 0.15, COLORS.sandDark, 7);
      break;
    case "=": {
      c.fill(0, 0, s, s, COLORS.plank);
      for (let y = 1; y < s; y += 2) c.fill(0, y, s, 1, COLORS.plankDark);
      const drop = (ch: string | null) => ch === "~" || ch === "v";
      if (drop(c.at(-1, 0))) c.fill(0, 0, 1, s, COLORS.rail);
      if (drop(c.at(1, 0))) c.fill(s - 1, 0, 1, s, COLORS.rail);
      break;
    }
    case "v":
      // The gorge: its far wall, then the dark.
      c.fill(0, 0, s, s, COLORS.gorge);
      if (c.at(0, -1) !== "v" && c.at(0, -1) !== "=") c.fill(0, 0, s, Math.ceil(s / 2), COLORS.rockDark);
      break;
    case "+":
      c.fill(0, 0, s, s, COLORS.cobble);
      speck(c, 0.3, COLORS.cobbleGrout, 15);
      break;
    case "~":
      water(c);
      break;
    case "T": {
      // Overlapping canopies: each tree is a lit square on a dark one, so
      // a forest reads as a lumpy mass of treetops.
      c.fill(0, 0, s, s, "#1a5a2a");
      c.fill(0, 0, s - 1, s - 1, "#2e8a3a");
      const hl = Math.floor(s / 4);
      c.fill(hl, hl, 1, 1, "#5cc848");
      break;
    }
    case "^":
      c.fill(0, 0, s, s, COLORS.rock);
      speck(c, 0.3, COLORS.rockDark, 11);
      if (c.at(0, -1) !== "^") c.fill(0, 0, s, 1, COLORS.rockLight);
      if (c.at(0, 1) !== "^") c.fill(0, s - 1, s, 1, COLORS.rockDeep);
      break;
    case "E":
      c.fill(0, 0, s, s, COLORS.void);
      break;
    case "H":
      house(c, col, row, houses);
      break;
    case "G":
      // Bramblekeep's gate, still locked: dark iron bars across the road.
      c.fill(0, 0, s, s, "#5a4a3a");
      for (let x = 0; x < s; x += 2) c.fill(x, 0, 1, s, "#2a1c14");
      break;
    case "b":
      onGround();
      blob(c, COLORS.grassDark, COLORS.grassDeep);
      break;
    case "o":
    case "x":
      onGround();
      blob(c, STONE_GREY, STONE_SHADE);
      break;
    case "s":
      onGround();
      mark(c, COLORS.plank);
      break;
    case "f":
      onGround();
      c.fill(0, Math.floor(s / 2), s, 1, COLORS.plankDark);
      break;
    case "p":
      onGround();
      blob(c, COLORS.plank, COLORS.plankDark);
      break;
    case "C":
    case OPEN_CHEST:
      onGround();
      chest(c);
      break;
    default:
      onGround();
  }
}

function paintDungeon(c: Cell, t: DungeonTheme): void {
  const s = c.s;
  const floor = () => c.fill(0, 0, s, s, (c.wx + c.wy) % 2 ? t.floorAlt : t.floor);
  switch (c.ch) {
    case "#": {
      c.fill(0, 0, s, s, t.wallTop);
      speck(c, 0.2, t.wallTopAlt, 13);
      // The wall's face shows wherever it overlooks the floor, which
      // gives the map the same three-quarter view as the rooms.
      const below = c.at(0, 1);
      if (below !== null && below !== "#") {
        const face = Math.max(1, Math.floor(s / 2));
        c.fill(0, s - face, s, face, t.wallFace);
        c.fill(0, s - face, s, 1, t.wallLight);
      }
      break;
    }
    case "v":
      c.fill(0, 0, s, s, COLORS.void);
      if (c.at(0, -1) !== "v") c.fill(0, 0, s, 1, t.floorDark);
      break;
    case "~":
      water(c);
      break;
    case "E":
      c.fill(0, 0, s, s, COLORS.void);
      break;
    case "U":
      c.fill(0, 0, s, s, t.floorDark);
      for (let y = 0; y < s; y += 2) c.fill(0, y, s, 1, t.floorLight);
      break;
    case "L":
      floor();
      blob(c, COLORS.plank, COLORS.rail);
      c.fill(Math.floor(s / 2), Math.floor(s / 2), 1, 1, GOLD);
      break;
    case "B":
      floor();
      blob(c, "#f04050", "#b02838");
      c.fill(Math.floor(s / 2), Math.floor(s / 2), 1, 1, GOLD);
      break;
    case "D":
      floor();
      for (let x = 0; x < s; x += 2) c.fill(x, 0, 1, s, STONE_SHADE);
      break;
    case "P":
      floor();
      blob(c, t.floorDark, t.grout);
      break;
    case "Q":
      floor();
      mark(c, "#5ce0f0");
      break;
    case "r":
      floor();
      mark(c, "#f04050");
      break;
    case "u":
      floor();
      mark(c, "#3a7cf0");
      break;
    case "t":
      floor();
      mark(c, "#ff9030");
      break;
    case "x":
    case "o":
      floor();
      blob(c, STONE_GREY, STONE_SHADE);
      break;
    case "p":
      floor();
      blob(c, COLORS.plank, COLORS.plankDark);
      break;
    case "C":
    case OPEN_CHEST:
      floor();
      chest(c);
      break;
    default:
      floor();
  }
}

function paintRoom(roomId: string, tiles: string[][], s: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = tiles[0].length * s;
  canvas.height = tiles.length * s;
  const ctx = canvas.getContext("2d")!;
  const map = tiles.map((row) => row.join(""));
  const overworld = areaOf(roomId) === "overworld";
  const theme = dungeonTheme(roomId);
  const houses = ROOMS[roomId].decor ?? [];
  const { gx, gy } = parseRoomId(roomId);

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      const cell: Cell = {
        ch: map[row][col],
        at: (dc, dr) => map[row + dr]?.[col + dc] ?? null,
        s,
        wx: gx * ROOM_COLS + col,
        wy: gy * ROOM_ROWS + row,
        fill: (dx, dy, w, h, color) => {
          ctx.fillStyle = color;
          ctx.fillRect(col * s + dx, row * s + dy, w, h);
        },
      };
      if (overworld) paintOverworld(cell, col, row, map, houses);
      else paintDungeon(cell, theme);
    }
  }
  return canvas;
}

// Miniatures are repainted only when a room's tiles change (a door
// unlocked, a chest opened), not every frame.
export class MapPainter {
  private rooms = new Map<string, { key: string; art: HTMLCanvasElement }>();
  private fog = new Map<string, HTMLCanvasElement>();

  room(roomId: string, tiles: string[][], scale: number): HTMLCanvasElement {
    const key = `${scale}|${tiles.map((row) => row.join("")).join("")}`;
    const cached = this.rooms.get(roomId);
    if (cached?.key === key) return cached.art;
    const art = paintRoom(roomId, tiles, scale);
    this.rooms.set(roomId, { key, art });
    return art;
  }

  // Unexplored ground: dark, with a faint diagonal weave.
  fogFor(w: number, h: number): HTMLCanvasElement {
    const key = `${w}x${h}`;
    let canvas = this.fog.get(key);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      rect(ctx, 0, 0, w, h, FOG);
      for (let y = 0; y < h; y += 2) {
        for (let x = (y / 2) % 4; x < w; x += 4) rect(ctx, x, y, 1, 1, FOG_SPECK);
      }
      this.fog.set(key, canvas);
    }
    return canvas;
  }
}

export function drawMap(ctx: CanvasRenderingContext2D, state: GameState, view: MapView, painter: MapPainter, sprites: Sprites, time: number): void {
  panel(ctx, 0, 0, SCREEN_W, SCREEN_H);

  // Title, with page arrows once there's more than one map to see.
  text(ctx, AREA_TITLES[view.area].toUpperCase(), SCREEN_W / 2, 9, GOLD, "center");
  if (knownAreas(state).length > 1) {
    const nudge = Math.floor(time * 3) % 2;
    const { prev, next } = MAP_ARROWS;
    text(ctx, "<", prev.x + 12 - nudge, 9, INK, "center");
    text(ctx, ">", next.x + next.w - 12 + nudge, 9, INK, "center");
  }

  const layout = mapLayout(view.area);
  const cells = areaCells(view.area);
  const seen = cells.filter((cell) => cellSeen(state, cell));
  rect(ctx, layout.x - 2, layout.y - 2, layout.w + 4, layout.h + 4, SHADOW);
  ctx.drawImage(painter.fogFor(layout.w, layout.h), layout.x, layout.y);

  // Explored screens sit on the fog like cards on a table: shadows first,
  // so a neighbor's shadow never falls across one.
  for (const cell of seen) {
    const r = cellRect(layout, cell);
    rect(ctx, r.x + 1, r.y + 1, r.w, r.h, SHADOW);
  }
  const s = layout.scale;
  for (const id of allRoomIds(view.area)) {
    const shown = cellsOf(id).filter((cell) => cellSeen(state, cell));
    if (shown.length === 0) continue;
    const r = roomRect(layout, id);
    const tiles = id === state.roomId ? state.tiles : initialTiles(id, state.flags);
    // A big room is painted whole, then shown a screen at a time.
    const art = painter.room(id, tiles, s);
    for (const cell of shown) {
      const c = cellRect(layout, cell);
      ctx.drawImage(art, c.x - r.x, c.y - r.y, c.w, c.h, c.x, c.y, c.w, c.h);
    }

    // Unopened chests glint now and then, a nudge toward loot left behind.
    tiles.forEach((line, row) =>
      line.forEach((ch, col) => {
        if (ch !== "C" || !cellSeen(state, cellAt(id, col * TILE, row * TILE))) return;
        const phase = (time * 0.8 + hash(col, row, 41)) % 1;
        if (phase < 0.12) rect(ctx, r.x + col * s + Math.floor(s / 4), r.y + row * s + Math.floor(s / 4), 1, 1, INK);
      }),
    );
  }

  // The frame goes on last, so shadows along the edge tuck under it.
  rect(ctx, layout.x - 1, layout.y - 1, layout.w + 2, 1, PANEL_EDGE);
  rect(ctx, layout.x - 1, layout.y + layout.h, layout.w + 2, 1, PANEL_EDGE);
  rect(ctx, layout.x - 1, layout.y, 1, layout.h, PANEL_EDGE);
  rect(ctx, layout.x + layout.w, layout.y, 1, layout.h, PANEL_EDGE);

  // You are here: the hero's head, blinking.
  const here = heroOnMap(state);
  const hereArea = here.area === view.area;
  if (hereArea && time % 0.8 < 0.55) {
    const r = roomRect(layout, here.roomId);
    const icon = sprites.mapIcon;
    const x = r.x + (here.at.x / TILE) * s;
    const y = r.y + (here.at.y / TILE) * s;
    ctx.drawImage(icon.img, Math.round(x - icon.w / 2), Math.round(y - icon.h / 2));
  }

  // Footer: where you are, how much of this map you've seen, and how to
  // close it.
  if (hereArea) text(ctx, ROOMS[state.roomId].name, SCREEN_W / 2, 184, INK, "center");
  text(ctx, `${seen.length}/${cells.length} rooms`, 10, 196, DIM);
  text(ctx, TOUCH ? "Tap to close" : "M: close", SCREEN_W - 10, 196, DIM, "right");
}
