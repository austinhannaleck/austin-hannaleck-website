import { GLYPHS, GLYPH_ROWS } from "./art/font";

// Text rendering with the bitmap font. Each glyph is rasterized once per
// color into a tiny canvas and then just blitted, so drawing a full dialog
// box every frame is cheap.

export const LINE_HEIGHT = 11;
const SPACING = 1;

const cache = new Map<string, HTMLCanvasElement>();

function glyphFor(ch: string): string[] {
  return GLYPHS[ch] ?? GLYPHS["?"];
}

function glyphCanvas(ch: string, color: string): HTMLCanvasElement {
  const key = `${color}|${ch}`;
  let canvas = cache.get(key);
  if (canvas) return canvas;
  const rows = glyphFor(ch);
  canvas = document.createElement("canvas");
  canvas.width = rows[0].length;
  canvas.height = GLYPH_ROWS;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === "#") ctx.fillRect(x, y, 1, 1);
  });
  cache.set(key, canvas);
  return canvas;
}

export function measureText(text: string): number {
  let width = 0;
  for (const ch of text) width += glyphFor(ch)[0].length + SPACING;
  return Math.max(0, width - SPACING);
}

// Greedy word wrap to a pixel width.
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureText(candidate) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

type TextOptions = {
  // A drop shadow one pixel down and right, the classic 16-bit look.
  shadow?: string;
  // Integer scale for titles.
  scale?: number;
  align?: "left" | "center" | "right";
};

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  options: TextOptions = {},
): void {
  const scale = options.scale ?? 1;
  const width = measureText(text) * scale;
  let cx = Math.round(options.align === "center" ? x - width / 2 : options.align === "right" ? x - width : x);
  const top = Math.round(y);
  for (const ch of text) {
    const w = glyphFor(ch)[0].length;
    if (options.shadow) {
      ctx.drawImage(glyphCanvas(ch, options.shadow), cx + scale, top + scale, w * scale, GLYPH_ROWS * scale);
    }
    ctx.drawImage(glyphCanvas(ch, color), cx, top, w * scale, GLYPH_ROWS * scale);
    cx += (w + SPACING) * scale;
  }
}
