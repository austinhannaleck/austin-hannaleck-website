// Bigger or rounder sprites are painted with a few shape primitives
// (shaded ellipses, lines, rects) into the same character grids the
// hand-drawn art uses, so they share the palette and the outline pass.
// Smooth curves and consistent lighting are much easier to get right this
// way than by placing every pixel of a 40x40 boss by hand.

export class Grid {
  readonly w: number;
  readonly h: number;
  private cells: string[][];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array(w).fill("."));
  }

  set(x: number, y: number, ch: string): this {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix >= 0 && iy >= 0 && ix < this.w && iy < this.h) this.cells[iy][ix] = ch;
    return this;
  }

  get(x: number, y: number): string {
    return this.cells[y]?.[x] ?? ".";
  }

  rect(x: number, y: number, w: number, h: number, ch: string): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, ch);
    return this;
  }

  // Fills an ellipse; `shade` picks a color per pixel from its position on
  // the shape (u, v in -1..1, distance from center 0..1).
  ellipse(cx: number, cy: number, rx: number, ry: number, shade: string | ((u: number, v: number, d: number) => string | null)): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx;
        const v = (y + 0.5 - cy) / ry;
        const d = u * u + v * v;
        if (d > 1) continue;
        const ch = typeof shade === "string" ? shade : shade(u, v, Math.sqrt(d));
        if (ch) this.set(x, y, ch);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, ch: string): this {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) this.set(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, ch);
    return this;
  }

  // Replaces every pixel of one color with another (handy for variants).
  swap(from: string, to: string): this {
    for (const row of this.cells) for (let x = 0; x < row.length; x++) if (row[x] === from) row[x] = to;
    return this;
  }

  rows(): string[] {
    return this.cells.map((row) => row.join(""));
  }
}

// Adds a one-pixel transparent border, so the outline pass has room.
export function framed(rows: string[]): string[] {
  const blank = ".".repeat(rows[0].length + 2);
  return [blank, ...rows.map((row) => `.${row}.`), blank];
}

// Classic top-left lighting: a highlight up and to the left, shadow down
// and to the right, darkest at the rim.
export function lit(highlight: string, base: string, shadow: string, rim = shadow) {
  return (u: number, v: number, d: number): string => {
    const light = -(u * 0.6 + v * 0.8);
    if (d > 0.86 && light < 0.1) return rim;
    if (light > 0.45 && d < 0.75) return highlight;
    if (light < -0.25) return shadow;
    return base;
  };
}

function hash(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// ---------------------------------------------------------------------------
// Scenery
// ---------------------------------------------------------------------------

// A big round tree, 24x28: wider than its tile, so a row of them reads as
// one continuous canopy. Leaf clusters are scattered with a seeded hash so
// each variant has its own texture.
export function tree(seed: number): string[] {
  const g = new Grid(24, 28);
  g.rect(10, 18, 4, 7, "n").rect(13, 18, 1, 7, "N").rect(9, 23, 6, 2, "N").set(10, 19, "m");
  const canopy = lit("l", "g", "G", "d");
  g.ellipse(12, 11, 10.5, 9.5, canopy);
  g.ellipse(6.5, 13, 5.5, 5, canopy);
  g.ellipse(17.5, 13, 5.5, 5, canopy);
  g.ellipse(12, 7, 7, 5.5, canopy);
  // Leafy texture: little highlight and shadow tufts.
  for (let y = 2; y < 20; y++) {
    for (let x = 2; x < 22; x++) {
      const ch = g.get(x, y);
      if (ch === "." || ch === "n") continue;
      const r = hash(x, y, seed);
      if (ch === "g" && r < 0.09) g.set(x, y, "l");
      else if (ch === "g" && r > 0.93) g.set(x, y, "G");
      else if (ch === "G" && r < 0.12) g.set(x, y, "d");
    }
  }
  return g.rows();
}

export function crystal(): string[] {
  const g = new Grid(14, 18);
  // An octahedron: widest at the waist, faceted light to dark.
  for (let y = 1; y <= 16; y++) {
    const half = y <= 8 ? Math.round((y - 1) * 0.75) : Math.round((16 - y) * 0.75);
    for (let x = 7 - half; x <= 6 + half; x++) {
      const left = x < 7;
      const top = y <= 8;
      g.set(x, y, top ? (left ? "v" : "p") : left ? "p" : "P");
    }
  }
  g.set(5, 4, "w").set(5, 5, "w").set(4, 6, "w").set(6, 3, "w");
  g.line(7, 2, 7, 15, "P").set(7, 2, "p");
  return g.rows();
}

export function pedestal(): string[] {
  const g = new Grid(14, 8);
  g.ellipse(7, 3.5, 5.5, 2.2, lit("E", "D", "C"));
  g.rect(3, 3, 8, 3, "D").rect(3, 5, 8, 1, "C");
  g.ellipse(7, 3, 5, 1.6, "E");
  return g.rows();
}

// A stone owl. Swappable ones glow purple, so players learn to read
// "purple glow means the Switcheroo works on it".
export function statue(kind: "plain" | "swappable" | "mossy"): string[] {
  const g = new Grid(16, 24);
  const stone = lit("E", "D", "C");
  g.rect(2, 19, 12, 3, "C").rect(2, 18, 12, 1, "D");
  g.ellipse(8, 13, 5.5, 6, stone);
  g.ellipse(8, 7, 5, 4.5, stone);
  g.set(4, 2, "D").set(4, 3, "D").set(5, 3, "D").set(11, 2, "D").set(11, 3, "D").set(10, 3, "D");
  const eye = kind === "swappable" ? "v" : "C";
  g.ellipse(6, 7, 1.6, 1.6, kind === "swappable" ? "p" : "E").ellipse(10, 7, 1.6, 1.6, kind === "swappable" ? "p" : "E");
  g.set(6, 7, eye).set(10, 7, eye);
  g.set(8, 9, "y").set(8, 10, "Y");
  g.ellipse(4, 14, 1.6, 3.5, "C").ellipse(12, 14, 1.6, 3.5, "C");
  if (kind === "swappable") g.set(7, 14, "v").set(8, 13, "v").set(9, 14, "v").set(8, 15, "v").set(8, 14, "w");
  if (kind === "mossy") {
    g.ellipse(8, 4, 4.5, 2, (u) => (u < 0.3 ? "g" : "G"));
    g.set(3, 12, "g").set(4, 11, "g").set(12, 16, "G");
  }
  return g.rows();
}

// ---------------------------------------------------------------------------
// Hearts and treasure
// ---------------------------------------------------------------------------
function heartMask(x: number, y: number): boolean {
  const v = -y;
  const a = x * x + v * v - 1;
  return a * a * a - x * x * v * v * v <= 0;
}

export function heart(size: number, fill: "full" | "half" | "empty" = "full"): string[] {
  const w = size + 2;
  const h = size + 1;
  const g = new Grid(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = ((x + 0.5 - w / 2) / (size / 2)) * 1.15;
      const v = ((y + 0.5 - h * 0.46) / (size / 2)) * 1.2;
      if (!heartMask(u, v)) continue;
      const empty = fill === "empty" || (fill === "half" && x >= w / 2);
      if (empty) g.set(x, y, "e");
      else g.set(x, y, u < -0.35 && v < -0.2 ? "q" : u + v > 0.9 ? "R" : "r");
    }
  }
  return g.rows();
}

export function heartContainer(): string[] {
  const outer = heart(13);
  const g = new Grid(outer[0].length, outer.length);
  outer.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && g.set(x, y, "y")));
  heart(9).forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && g.set(x + 2, y + 2, ch)));
  return framed(g.rows());
}

export function sunstone(frame: number): string[] {
  const g = new Grid(18, 18);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (frame % 2) * (Math.PI / 8);
    g.line(9 + Math.cos(a) * 5, 9 + Math.sin(a) * 5, 9 + Math.cos(a) * 8, 9 + Math.sin(a) * 8, i % 2 ? "o" : "y");
  }
  g.ellipse(9, 9, 5, 5, lit("z", "y", "o", "O"));
  g.set(7, 6, "w").set(6, 7, "w");
  return framed(g.rows());
}

// ---------------------------------------------------------------------------
// Bosses
// ---------------------------------------------------------------------------

// Captain Clank: a big knight behind a tower shield. 24x30, three facings.
export function clank(facing: "down" | "up" | "right", step: boolean): string[] {
  const g = new Grid(26, 30);
  const steel = lit("a", "A", "i");
  // Legs
  const legY = 24;
  if (facing === "right") {
    g.rect(step ? 8 : 9, legY, 3, 4, "A").rect(step ? 14 : 13, legY, 3, 4, "A");
  } else {
    g.rect(step ? 8 : 9, legY + (step ? -1 : 0), 3, 4, "A").rect(14, legY, 3, 4, "A");
  }
  // Body: plum tabard with a gold belt
  g.ellipse(12.5, 18, 7, 7, lit("p", "P", "P", "e"));
  g.rect(6, 21, 13, 2, "y").rect(6, 22, 13, 1, "Y");
  // Pauldrons
  g.ellipse(5.5, 14, 3, 2.5, steel).ellipse(19.5, 14, 3, 2.5, steel);
  // Helmet and plume
  g.ellipse(12.5, 8, 6.5, 6, steel);
  g.ellipse(12.5, 2.5, 2, 2.5, lit("z", "y", "Y"));
  if (facing === "down") {
    g.rect(7, 8, 11, 2, "e").set(10, 8, "o").set(15, 8, "o");
    // Tower shield across the front
    g.rect(6, 13, 13, 11, "A").rect(7, 13, 11, 10, "a").rect(6, 13, 13, 1, "y").rect(6, 23, 13, 1, "Y");
    g.rect(6, 13, 1, 11, "y").rect(18, 13, 1, 11, "Y");
    g.rect(11, 15, 3, 6, "P").rect(9, 17, 7, 2, "P").set(12, 16, "v");
    // Lance over the shoulder
    g.line(21, 1, 21, 20, "n").line(21, 1, 21, 4, "a").set(22, 4, "A").set(20, 4, "A");
  } else if (facing === "up") {
    g.rect(7, 9, 11, 1, "i");
    g.rect(8, 13, 9, 8, "P").rect(8, 13, 9, 1, "p");
    g.line(21, 1, 21, 20, "n").line(21, 1, 21, 4, "a");
  } else {
    g.rect(13, 8, 6, 2, "e").set(16, 8, "o");
    g.rect(16, 12, 5, 12, "A").rect(17, 12, 3, 11, "a").rect(16, 12, 5, 1, "y").rect(16, 23, 5, 1, "Y");
    g.set(18, 17, "P").set(18, 18, "P");
    g.line(4, 12, 24, 12, "n").line(21, 12, 24, 12, "a").set(24, 11, "A").set(24, 13, "A");
  }
  return framed(g.rows());
}

// Thornback: a giant armored beetle, drawn facing down (head at the bottom).
// The renderer rotates it to its heading. The pink soft spot on its rear is
// the only place a sword gets through, and the art says so.
export function thornback(step: boolean): string[] {
  const g = new Grid(44, 44);
  const cx = 22;
  // Six legs, scuttling
  for (let i = 0; i < 3; i++) {
    const y = 14 + i * 7 + (step ? (i % 2 ? 1 : -1) : 0);
    const reach = i === 1 ? 18 : 17;
    g.line(cx - 11, y, cx - reach, y + (i - 1) * 2 + 3, "P").line(cx - reach, y + (i - 1) * 2 + 3, cx - reach - 1, y + (i - 1) * 2 + 6, "P");
    g.line(cx + 11, y, cx + reach, y + (i - 1) * 2 + 3, "P").line(cx + reach, y + (i - 1) * 2 + 3, cx + reach + 1, y + (i - 1) * 2 + 6, "P");
  }
  // Head with mandibles and glowing eyes
  g.ellipse(cx, 34, 8, 5.5, lit("p", "P", "P", "e"));
  g.line(cx - 6, 37, cx - 9, 41, "E").line(cx - 5, 38, cx - 8, 42, "D");
  g.line(cx + 6, 37, cx + 9, 41, "E").line(cx + 5, 38, cx + 8, 42, "D");
  g.set(cx - 4, 34, "r").set(cx - 3, 34, "r").set(cx - 4, 33, "q");
  g.set(cx + 3, 34, "r").set(cx + 4, 34, "r").set(cx + 3, 33, "q");
  // The shell
  g.ellipse(cx, 18, 14, 13.5, lit("g", "G", "d", "e"));
  g.line(cx, 6, cx, 31, "d");
  // Thorns in two rings
  const thorns: [number, number][] = [
    [-9, 10], [9, 10], [-12, 17], [12, 17], [-11, 24], [11, 24], [-5, 15], [5, 15], [-6, 23], [6, 23], [0, 27], [0, 20],
  ];
  for (const [dx, dy] of thorns) {
    const x = cx + dx;
    g.set(x, dy - 1, "w").set(x, dy, "E").set(x - 1, dy + 1, "D").set(x + 1, dy + 1, "D").set(x, dy + 1, "E");
  }
  // The soft, glowing weak spot at the rear
  g.ellipse(cx, 8, 5.5, 3.5, lit("w", "f", "F"));
  return g.rows();
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
export function poof(frame: number): string[] {
  const g = new Grid(18, 18);
  const r = 3 + frame * 1.6;
  const puff = lit("w", "E", "D");
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + frame;
    g.ellipse(9 + Math.cos(a) * r, 9 + Math.sin(a) * r, 3.4 - frame * 0.7, 3.4 - frame * 0.7, puff);
  }
  return g.rows();
}
