import { OUTLINE, PALETTE } from "./palette";

// Turning text pixel art into canvases, plus the handful of transforms
// that let one drawing cover several poses: mirroring a right-facing
// sprite to face left, rotating a sword, swapping a palette for a variant.

export type Art = readonly string[];

export function flipX(art: Art): string[] {
  return art.map((row) => [...row].reverse().join(""));
}

export function flipY(art: Art): string[] {
  return [...art].reverse();
}

// 90 degrees clockwise.
export function rotateCW(art: Art): string[] {
  const h = art.length;
  const w = art[0].length;
  const out: string[] = [];
  for (let x = 0; x < w; x++) {
    let row = "";
    for (let y = h - 1; y >= 0; y--) row += art[y][x];
    out.push(row);
  }
  return out;
}

export function rotateCCW(art: Art): string[] {
  return rotateCW(rotateCW(rotateCW(art)));
}

export function recolor(art: Art, map: Record<string, string>): string[] {
  return art.map((row) => [...row].map((ch) => map[ch] ?? ch).join(""));
}

// Wraps the art in a one-pixel dark outline wherever an opaque pixel
// borders a transparent one (sideways or up/down, not diagonally, which
// keeps outlines crisp). Art is authored without outlines, which makes it
// far quicker to draw and tweak, so it needs a pixel of transparent margin
// around the edges for the outline to grow into.
export function outlined(art: Art, color = OUTLINE): string[] {
  const h = art.length;
  const w = art[0].length;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && art[y][x] !== ".";
  return art.map((row, y) =>
    [...row]
      .map((ch, x) => {
        if (ch !== ".") return ch;
        return solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1) ? color : ".";
      })
      .join(""),
  );
}

// Pads art with transparent rows/columns so it sits at a fixed size.
export function padTo(art: Art, w: number, h: number, align: "bottom" | "center" = "bottom"): string[] {
  const left = Math.floor((w - art[0].length) / 2);
  const right = w - art[0].length - left;
  const rows = art.map((row) => ".".repeat(left) + row + ".".repeat(right));
  const extra = h - rows.length;
  const top = align === "bottom" ? extra : Math.floor(extra / 2);
  return [...Array(top).fill(".".repeat(w)), ...rows, ...Array(extra - top).fill(".".repeat(w))];
}

export type Sprite = {
  img: HTMLCanvasElement;
  w: number;
  h: number;
  // One past the last row with any pixels in it: where the feet are.
  // Drawing code lines this up with the bottom of an actor's hitbox.
  baseline: number;
  // A solid white silhouette for hit flashes, made on first use.
  flash: () => HTMLCanvasElement;
};

function canvasFor(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

export function toSprite(art: Art): Sprite {
  const h = art.length;
  const w = art[0].length;
  const img = canvasFor(w, h);
  const ctx = img.getContext("2d")!;
  let baseline = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = art[y][x];
      if (ch === ".") continue;
      ctx.fillStyle = PALETTE[ch] ?? "#ff00ff";
      ctx.fillRect(x, y, 1, 1);
      baseline = y + 1;
    }
  }
  let flash: HTMLCanvasElement | null = null;
  return {
    img,
    w,
    h,
    baseline,
    flash: () => {
      if (!flash) flash = silhouette(img, "#ffffff");
      return flash;
    },
  };
}

export function silhouette(img: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const out = canvasFor(img.width, img.height);
  const ctx = out.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, out.width, out.height);
  return out;
}

// Compiles art with the standard outline.
export function sprite(art: Art): Sprite {
  return toSprite(outlined(art));
}
