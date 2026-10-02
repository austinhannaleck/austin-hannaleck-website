// The few primitives every procedural painter uses: a stable hash for
// "random" detail that never shimmers between frames, and single pixels
// and boxes.

export type Painter = CanvasRenderingContext2D;

// A seeded hash in [0, 1), so painted details are varied but stable.
export function hash(x: number, y: number, seed = 0): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// The tile at a spot in a room's map, or null off its edge.
export function at(map: string[], col: number, row: number): string | null {
  if (row < 0 || row >= map.length || col < 0 || col >= map[row].length) return null;
  return map[row][col];
}

export function dot(ctx: Painter, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

export function box(ctx: Painter, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
