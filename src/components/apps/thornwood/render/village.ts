import { TILE } from "../engine/types";
import { box, dot, hash, type Painter } from "./paint";

// Fernwhistle's set pieces, painted in code like the houses: a windmill
// with turning sails, market stalls under striped awnings, and the
// fountain in the square. Each comes back as an image plus a draw call
// (for the bits that move), standing on its "H" footprint tiles.

export type DecorArt = {
  // Depth-sort key: the bottom of the footprint, in room pixels.
  sortY: number;
  draw: (ctx: CanvasRenderingContext2D, ox: number, oy: number, time: number) => void;
};

const OUTLINE = "#1c1230";

function canvas(w: number, h: number, paint: (ctx: Painter) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d")!);
  return c;
}

// A one-pixel dark outline around everything opaque.
function outlined(img: HTMLCanvasElement): HTMLCanvasElement {
  const { width: w, height: h } = img;
  const pixels = img.getContext("2d")!.getImageData(0, 0, w, h);
  return canvas(w + 2, h + 2, (ctx) => {
    ctx.fillStyle = OUTLINE;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (pixels.data[(y * w + x) * 4 + 3] > 0) ctx.fillRect(x, y, 3, 3);
      }
    }
    ctx.drawImage(img, 1, 1);
  });
}

function hexColor(hex: number, k = 1): string {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
  const b = Math.min(255, Math.round((hex & 255) * k));
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Picket fences: a post on every fence tile, with rails running to
// whichever neighbors are fence too.
// ---------------------------------------------------------------------------
const fences = new Map<string, HTMLCanvasElement>();

export function fence(left: boolean, right: boolean, up: boolean, down: boolean): HTMLCanvasElement {
  const key = `${+left}${+right}${+up}${+down}`;
  let img = fences.get(key);
  if (img) return img;
  img = outlined(
    canvas(TILE, 20, (ctx) => {
      const wood = "#e8c890";
      const shade = "#b08850";
      const dark = "#7a5a30";
      // Rails across, to the left and right.
      for (const y of [8, 13]) {
        if (left) box(ctx, 0, y, 8, 2, wood);
        if (right) box(ctx, 8, y, 8, 2, wood);
        if (left || right) box(ctx, left ? 0 : 8, y + 1, (left ? 8 : 0) + (right ? 8 : 0), 1, shade);
      }
      // Along a run going up and down the screen, a rail on top of the posts.
      if (up) box(ctx, 7, 0, 2, 10, shade);
      if (down) box(ctx, 7, 10, 2, 10, shade);
      // The post, with a pointed cap.
      box(ctx, 6, 5, 4, 15, wood);
      box(ctx, 7, 4, 2, 1, wood);
      box(ctx, 9, 5, 1, 15, shade);
      box(ctx, 6, 18, 4, 2, dark);
    }),
  );
  fences.set(key, img);
  return img;
}

// ---------------------------------------------------------------------------
// The windmill: a tapering stone tower under a wooden cap, three tiles
// wide at the base, with four lattice sails turning on the front.
// ---------------------------------------------------------------------------
const MILL_W = 48;
const MILL_H = 58;
const HUB = { x: 24, y: 14 };
const SAIL_LENGTH = 26;
// Sails turn through a quarter circle before they look the same again,
// in this many steps.
const SAIL_FRAMES = 12;

function millTower(): HTMLCanvasElement {
  return outlined(
    canvas(MILL_W, MILL_H, (ctx) => {
      // The tower tapers from 40px at the ground to 26px under the cap.
      for (let y = 12; y < MILL_H; y++) {
        const t = (y - 12) / (MILL_H - 12);
        const half = Math.round(13 + t * 7);
        const x0 = MILL_W / 2 - half;
        box(ctx, x0, y, half * 2, 1, "#d8d0c0");
        box(ctx, x0, y, 3, 1, "#f0e8d8");
        box(ctx, x0 + half * 2 - 5, y, 5, 1, "#a8a090");
        // Courses of stone.
        if (y % 5 === 0) box(ctx, x0 + 3, y, half * 2 - 8, 1, "#b8b0a0");
      }
      for (let i = 0; i < 14; i++) {
        const y = 16 + Math.floor(hash(i, 3, 7) * 38);
        const x = 12 + Math.floor(hash(i, 5, 7) * 22);
        box(ctx, x, y, 3, 1, "#b8b0a0");
      }
      // The door and a little round window.
      box(ctx, 19, MILL_H - 14, 10, 14, "#5a3418");
      box(ctx, 20, MILL_H - 13, 8, 13, "#8a5228");
      box(ctx, 24, MILL_H - 13, 1, 13, "#5a3418");
      dot(ctx, 26, MILL_H - 7, "#ffd040");
      box(ctx, 21, 30, 6, 5, "#5a3418");
      box(ctx, 22, 31, 4, 3, "#ffd86c");
      // The cap: a wooden dome with a ridge.
      for (let y = 0; y < 14; y++) {
        const half = Math.round(Math.sqrt(Math.max(0, 1 - ((13 - y) / 14) ** 2)) * 17);
        box(ctx, MILL_W / 2 - half, y, half * 2, 1, y < 4 ? "#b06a3a" : y > 10 ? "#6c3c1c" : "#8a5228");
      }
      for (let x = 10; x < 38; x += 4) box(ctx, x, 3, 1, 9, "#6c3c1c");
    }),
  );
}

function millSails(frame: number): HTMLCanvasElement {
  const angle = (frame / SAIL_FRAMES) * (Math.PI / 2);
  const size = SAIL_LENGTH * 2 + 6;
  const c = size / 2;
  return outlined(
    canvas(size, size, (ctx) => {
      for (let blade = 0; blade < 4; blade++) {
        const a = angle + (blade * Math.PI) / 2;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        // Along the blade (the spar), then across it (the lattice), plotted
        // pixel by pixel so the edges stay crisp at every angle.
        for (let along = 3; along <= SAIL_LENGTH; along += 0.5) {
          const sx = c + ux * along;
          const sy = c + uy * along;
          dot(ctx, Math.round(sx), Math.round(sy), "#6c3c1c");
          if (along < 8) continue;
          for (let across = 1; across <= 6; across += 0.5) {
            const px = Math.round(sx - uy * across);
            const py = Math.round(sy + ux * across);
            const lattice = Math.round(along) % 4 === 0 || across >= 5.5;
            dot(ctx, px, py, lattice ? "#8a5228" : "#f4ecd8");
          }
        }
      }
      box(ctx, c - 2, c - 2, 4, 4, "#5a3418");
      dot(ctx, c - 1, c - 1, "#b06a3a");
    }),
  );
}

export function windmill(col: number, row: number): DecorArt {
  const tower = millTower();
  const sails = Array.from({ length: SAIL_FRAMES }, (_, i) => millSails(i));
  const bottom = (row + 2) * TILE;
  const x = col * TILE - 1;
  const y = bottom - tower.height + 1;
  return {
    sortY: bottom - 1,
    draw: (ctx, ox, oy, time) => {
      ctx.drawImage(tower, ox + x, oy + y);
      const s = sails[Math.floor(time * 5) % SAIL_FRAMES];
      ctx.drawImage(s, ox + x + 1 + HUB.x - Math.floor(s.width / 2), oy + y + 1 + HUB.y - Math.floor(s.height / 2));
    },
  };
}

// ---------------------------------------------------------------------------
// A market stall: a plank counter piled with goods, under an awning with
// a scalloped hem, two tiles wide.
// ---------------------------------------------------------------------------
const GOODS: Record<"fruit" | "fish" | "flowers", string[]> = {
  fruit: ["#f04050", "#ff9a38", "#5cc848", "#ffd040"],
  fish: ["#8ab4d8", "#5a88b8", "#b8d8f0", "#8ab4d8"],
  flowers: ["#ff9cc8", "#ffd040", "#fffaf0", "#dcb4ff"],
};

export function stall(col: number, row: number, awning: number, goods: keyof typeof GOODS): DecorArt {
  const w = 2 * TILE;
  const h = 34;
  const img = outlined(
    canvas(w, h, (ctx) => {
      // Posts
      box(ctx, 2, 8, 2, h - 8, "#6c3c1c");
      box(ctx, w - 4, 8, 2, h - 8, "#6c3c1c");
      // The counter, and what's for sale piled on top of it.
      box(ctx, 1, h - 12, w - 2, 12, "#b8743c");
      box(ctx, 1, h - 12, w - 2, 2, "#e8b070");
      box(ctx, 1, h - 2, w - 2, 2, "#7a4422");
      for (let i = 0; i < 4; i++) box(ctx, 4 + i * 7, h - 9, 1, 7, "#7a4422");
      const colors = GOODS[goods];
      for (let i = 0; i < 9; i++) {
        const gx = 3 + i * 3 + (i % 2);
        const gy = h - 15 + (i % 2 === 0 ? 0 : 1);
        box(ctx, gx, gy, 3, 3, colors[i % colors.length]);
        dot(ctx, gx, gy, "#fffaf0");
      }
      // The awning: stripes, a lit top edge, a scalloped hem.
      for (let x = 0; x < w; x++) {
        const stripe = Math.floor(x / 4) % 2 === 0;
        box(ctx, x, 1, 1, 10, stripe ? hexColor(awning) : "#fffaf0");
        box(ctx, x, 1, 1, 1, stripe ? hexColor(awning, 1.25) : "#ffffff");
        if (x % 4 !== 0) box(ctx, x, 11, 1, 1, stripe ? hexColor(awning, 0.7) : "#d8d0c0");
      }
      box(ctx, 0, 10, w, 1, hexColor(awning, 0.6));
    }),
  );
  const bottom = (row + 1) * TILE;
  const x = col * TILE - 1;
  const y = bottom - img.height + 1;
  return { sortY: bottom - 1, draw: (ctx, ox, oy) => ctx.drawImage(img, ox + x, oy + y) };
}

// ---------------------------------------------------------------------------
// The fountain: the square's centerpiece, four tiles wide. A broad stone
// basin seen from above (a thick rim around the pool, a wall of dressed
// stone in front), a fluted pillar rising from the water to an upper bowl,
// and water spilling over the bowl's lip in arcs, with a little jet on top
// and ripples spreading across the pool.
// ---------------------------------------------------------------------------
const FOUNTAIN_W = 64;
const FOUNTAIN_H = 64;
// The basin: centered at (CX, BASIN_Y), its rim and the pool inside it.
const CX = 32;
const BASIN_Y = 43;
const RIM = { rx: 31, ry: 12 };
const POOL = { rx: 25, ry: 8 };
const WALL = 7;
// The upper bowl, and where the water leaves its lip.
const BOWL_Y = 17;
const BOWL = { rx: 11, ry: 4 };

const STONE = {
  top: "#f0eef8",
  light: "#dcd8ea",
  base: "#c2bcd6",
  shade: "#9c94b8",
  dark: "#766e96",
  deep: "#58507a",
};
const WATER = { deep: "#2a6cc8", base: "#3888e0", light: "#7cc4f8", shine: "#b8ecff", foam: "#e4f8ff" };

function inEllipse(x: number, y: number, cy: number, e: { rx: number; ry: number }): boolean {
  const dx = (x + 0.5 - CX) / e.rx;
  const dy = (y + 0.5 - cy) / e.ry;
  return dx * dx + dy * dy <= 1;
}

function fountainBase(): HTMLCanvasElement {
  return outlined(
    canvas(FOUNTAIN_W, FOUNTAIN_H, (ctx) => {
      // The basin's front wall: dressed stone in a curve, catching the
      // light along its top edge, with a band of trim across the middle.
      for (let x = 0; x < FOUNTAIN_W; x++) {
        const t = (x + 0.5 - CX) / RIM.rx;
        if (Math.abs(t) > 1) continue;
        const top = Math.round(BASIN_Y + RIM.ry * Math.sqrt(1 - t * t)) - 1;
        const edge = Math.abs(t) > 0.82;
        for (let i = 0; i < WALL && top + i < FOUNTAIN_H; i++) {
          let color = i === 0 ? STONE.light : i >= WALL - 2 ? STONE.dark : STONE.base;
          if (i === 3) color = STONE.shade;
          if (edge && i > 0) color = i >= WALL - 2 ? STONE.deep : STONE.shade;
          dot(ctx, x, top + i, color);
        }
        // Joints between the blocks.
        if ((x + 2) % 9 === 0) {
          box(ctx, x, top + 1, 1, 2, STONE.shade);
          box(ctx, x, top + 4, 1, 1, STONE.dark);
        }
      }

      // The rim's broad top, lit from above, then the pool inside it. Just
      // inside the far rim, the inner wall of the basin shows in shadow.
      for (let y = 0; y < FOUNTAIN_H; y++) {
        for (let x = 0; x < FOUNTAIN_W; x++) {
          if (!inEllipse(x, y, BASIN_Y, RIM)) continue;
          if (inEllipse(x, y + 2, BASIN_Y, POOL)) {
            const depth = y - (BASIN_Y - POOL.ry);
            dot(ctx, x, y, depth < 3 ? WATER.deep : WATER.base);
          } else if (inEllipse(x, y - 1, BASIN_Y, POOL) || inEllipse(x, y, BASIN_Y, POOL)) {
            dot(ctx, x, y, y < BASIN_Y ? STONE.dark : STONE.shade);
          } else {
            const outerEdge = !inEllipse(x, y - 1, BASIN_Y, RIM) || !inEllipse(x, y + 1, BASIN_Y, RIM);
            dot(ctx, x, y, outerEdge ? STONE.light : y < BASIN_Y - 4 ? STONE.top : STONE.light);
          }
        }
      }
      // Speckle the rim so it reads as stone.
      for (let i = 0; i < 18; i++) {
        const a = hash(i, 9, 3) * Math.PI * 2;
        const r = 0.9 + hash(i, 4, 3) * 0.06;
        const x = Math.round(CX + Math.cos(a) * ((RIM.rx + POOL.rx) / 2) * r);
        const y = Math.round(BASIN_Y + Math.sin(a) * ((RIM.ry + POOL.ry) / 2 + 1) * r);
        dot(ctx, x, y, STONE.base);
      }

      // The pillar's foot, standing in the pool, ringed with foam.
      for (let y = BASIN_Y - 3; y <= BASIN_Y + 3; y++) {
        for (let x = CX - 8; x <= CX + 8; x++) {
          if (inEllipse(x, y, BASIN_Y, { rx: 7, ry: 3 })) dot(ctx, x, y, WATER.foam);
          if (inEllipse(x, y, BASIN_Y - 1, { rx: 5, ry: 2 })) dot(ctx, x, y, x < CX ? STONE.light : STONE.shade);
        }
      }

      // The pillar: lit on the left, fluted, shaded on the right.
      for (let y = BOWL_Y + 7; y < BASIN_Y - 1; y++) {
        box(ctx, CX - 3, y, 6, 1, STONE.base);
        dot(ctx, CX - 3, y, STONE.top);
        dot(ctx, CX - 2, y, STONE.light);
        dot(ctx, CX, y, STONE.shade);
        dot(ctx, CX + 2, y, STONE.dark);
      }
      box(ctx, CX - 4, BASIN_Y - 4, 8, 2, STONE.light);
      box(ctx, CX - 4, BASIN_Y - 3, 8, 1, STONE.shade);

      // The upper bowl: its underside narrowing into the pillar...
      for (let i = 0; i < 7; i++) {
        const half = Math.max(3, Math.round(BOWL.rx - 1 - i * 1.4));
        const y = BOWL_Y + 3 + i;
        box(ctx, CX - half, y, half * 2, 1, STONE.base);
        dot(ctx, CX - half, y, STONE.light);
        box(ctx, CX + half - 3, y, 3, 1, STONE.shade);
        dot(ctx, CX + half - 1, y, STONE.dark);
      }
      // ...its rim, and the water brimming inside it.
      for (let y = BOWL_Y - BOWL.ry; y <= BOWL_Y + BOWL.ry; y++) {
        for (let x = CX - BOWL.rx; x <= CX + BOWL.rx; x++) {
          if (!inEllipse(x, y, BOWL_Y, BOWL)) continue;
          const pool = inEllipse(x, y + 1, BOWL_Y, { rx: BOWL.rx - 2, ry: BOWL.ry - 1.5 });
          dot(ctx, x, y, pool ? (y < BOWL_Y ? WATER.base : WATER.light) : y < BOWL_Y ? STONE.top : STONE.light);
        }
      }

      // The spout on top: a little column with a round cap.
      box(ctx, CX - 1, BOWL_Y - 9, 3, 8, STONE.base);
      dot(ctx, CX - 1, BOWL_Y - 9, STONE.top);
      box(ctx, CX - 1, BOWL_Y - 8, 1, 7, STONE.light);
      box(ctx, CX + 1, BOWL_Y - 8, 1, 7, STONE.shade);
      box(ctx, CX - 2, BOWL_Y - 12, 5, 3, STONE.light);
      box(ctx, CX - 1, BOWL_Y - 13, 3, 1, STONE.top);
      box(ctx, CX + 1, BOWL_Y - 11, 1, 2, STONE.shade);
    }),
  );
}

// Water spilling from the bowl's lip: streams leave the front of the rim
// and arc outward and down into the pool.
const STREAMS = [-0.85, -0.55, -0.25, 0.25, 0.55, 0.85];

export function fountain(col: number, row: number): DecorArt {
  const base = fountainBase();
  const bottom = (row + 2) * TILE;
  const x = col * TILE - 1;
  const y = bottom - base.height + 1;
  const px = (ctx: CanvasRenderingContext2D, color: string, dx: number, dy: number, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(dx), Math.round(dy), w, h);
  };
  return {
    sortY: bottom - 1,
    draw: (ctx, ox, oy, time) => {
      ctx.drawImage(base, ox + x, oy + y);
      // Everything below is in base-image coordinates (one pixel in, for
      // the outline).
      const fx = ox + x + 1;
      const fy = oy + y + 1;

      // Light glinting on the pool, drifting slowly round.
      for (let i = 0; i < 5; i++) {
        const a = time * 0.4 + i * 1.3;
        const r = 0.45 + 0.4 * hash(i, 2, 8);
        const gx = CX + Math.cos(a) * POOL.rx * r;
        const gy = BASIN_Y + 2 + Math.sin(a) * (POOL.ry - 2) * r;
        if (Math.abs(gx - CX) < 7 && gy < BASIN_Y + 2) continue;
        px(ctx, (time * 3 + i) % 2 < 1 ? WATER.shine : WATER.light, fx + gx - 1, fy + gy, 3, 1);
      }

      // Ripples spreading out from where the water lands.
      for (let k = 0; k < 2; k++) {
        const p = (time * 0.6 + k * 0.5) % 1;
        const rx = 9 + p * (POOL.rx - 11);
        const ry = 3 + p * (POOL.ry - 4);
        const color = p < 0.6 ? WATER.shine : WATER.light;
        for (let i = 0; i < 14; i++) {
          const a = Math.PI * (0.08 + (i / 13) * 0.84);
          px(ctx, color, fx + CX + Math.cos(a) * rx, fy + BASIN_Y + 2 + Math.sin(a) * ry);
          if (i % 2 === 0) px(ctx, color, fx + CX - Math.cos(a) * rx, fy + BASIN_Y + 2 - Math.sin(a) * ry * 0.6);
        }
      }

      // Water sheeting over the front of the bowl's lip, rippling as it goes.
      for (let lx = CX - BOWL.rx + 2; lx <= CX + BOWL.rx - 2; lx++) {
        const t = (lx - CX) / BOWL.rx;
        const ly = BOWL_Y + Math.round(BOWL.ry * Math.sqrt(1 - t * t));
        const long = (lx + Math.floor(time * 8)) % 3 === 0;
        px(ctx, long ? WATER.shine : WATER.light, fx + lx, fy + ly, 1, long ? 3 : 2);
      }

      // The streams, four drops apiece, falling faster as they go.
      for (let s = 0; s < STREAMS.length; s++) {
        const lip = STREAMS[s];
        const x0 = CX + lip * (BOWL.rx - 1);
        const y0 = BOWL_Y + BOWL.ry * Math.sqrt(1 - lip * lip) + 1;
        for (let k = 0; k < 4; k++) {
          const t = (time * 1.5 + k / 4 + s * 0.17) % 1;
          const dx = x0 + lip * 9 * t;
          const dy = y0 + (BASIN_Y - y0 + 1) * t * t;
          px(ctx, t < 0.5 ? WATER.foam : WATER.light, fx + dx, fy + dy, 1, 2);
        }
      }

      // The jet: a few drops leaping from the spout and dropping back.
      for (let k = 0; k < 4; k++) {
        const t = (time * 1.3 + k / 4) % 1;
        const side = k % 2 === 0 ? -1 : 1;
        const dx = CX + side * 5 * t;
        const dy = BOWL_Y - 13 - 9 * t + 14 * t * t;
        px(ctx, WATER.foam, fx + dx, fy + dy);
      }
    },
  };
}
