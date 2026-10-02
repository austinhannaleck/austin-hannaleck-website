import { TILE, type Box, type Point } from "./types";

// Nudges the far edge of a box inward so a box exactly flush against a
// tile boundary doesn't count as overlapping the next tile over.
const EPS = 0.001;

export type SolidAt = (col: number, row: number) => boolean;

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function centerOf(box: Box): Point {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Inclusive tile ranges a box covers.
export function tileSpan(box: Box): { c0: number; c1: number; r0: number; r1: number } {
  return {
    c0: Math.floor(box.x / TILE),
    c1: Math.floor((box.x + box.w - EPS) / TILE),
    r0: Math.floor(box.y / TILE),
    r1: Math.floor((box.y + box.h - EPS) / TILE),
  };
}

export function boxHitsTiles(box: Box, solidAt: SolidAt): boolean {
  const { c0, c1, r0, r1 } = tileSpan(box);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (solidAt(col, row)) return true;
    }
  }
  return false;
}

function isBlocked(box: Box, solidAt: SolidAt, blockers: Box[]): boolean {
  return boxHitsTiles(box, solidAt) || blockers.some((b) => overlaps(box, b));
}

// Moves along one axis in steps of at most 1px, stopping at the first step
// that would collide. Per-frame speeds here are all a few pixels at most,
// so this is both cheap and immune to tunneling through thin walls, and
// it's much easier to reason about than snapping to tile edges.
function stepAxis(box: Box, axis: "x" | "y", delta: number, solidAt: SolidAt, blockers: Box[]): boolean {
  let remaining = delta;
  while (remaining !== 0) {
    const step = Math.sign(remaining) * Math.min(1, Math.abs(remaining));
    const next = { ...box, [axis]: box[axis] + step };
    if (isBlocked(next, solidAt, blockers)) return false;
    box[axis] += step;
    remaining -= step;
  }
  return true;
}

// Moves a box (mutating it) by dx then dy, sliding along whatever it hits.
// Blockers already overlapping the box are ignored, so something that got
// placed on top of you (say, by a swap) never pins you in place.
export function moveBox(
  box: Box,
  dx: number,
  dy: number,
  solidAt: SolidAt,
  blockers: Box[] = [],
): { hitX: boolean; hitY: boolean } {
  const active = blockers.filter((b) => !overlaps(box, b));
  const hitX = dx !== 0 && !stepAxis(box, "x", dx, solidAt, active);
  const hitY = dy !== 0 && !stepAxis(box, "y", dy, solidAt, active);
  return { hitX, hitY };
}

// The classic "corner assist": walking straight into the edge of a wall
// that you're only barely clipping slides you around it instead of
// stopping you dead. If shifting sideways by up to `reach` pixels would
// clear the way forward, ease one step toward the nearer such offset.
export function cornerNudge(
  box: Box,
  axis: "x" | "y",
  forward: number,
  reach: number,
  step: number,
  solidAt: SolidAt,
  blockers: Box[] = [],
): boolean {
  const active = blockers.filter((b) => !overlaps(box, b));
  const side = axis === "x" ? "y" : "x";
  for (let offset = 1; offset <= reach; offset++) {
    for (const sign of [-1, 1]) {
      const shifted = { ...box, [side]: box[side] + sign * offset };
      const ahead = { ...shifted, [axis]: shifted[axis] + Math.sign(forward) };
      if (!isBlocked(shifted, solidAt, active) && !isBlocked(ahead, solidAt, active)) {
        stepAxis(box, side, sign * Math.min(step, offset), solidAt, active);
        return true;
      }
    }
  }
  return false;
}

// The nearest spot (searching outward in rings) where a box fits without
// overlapping anything solid. Used to settle big things after a swap.
export function findFreeSpot(box: Box, solidAt: SolidAt, maxRadius: number): Point | null {
  if (!boxHitsTiles(box, solidAt)) return { x: box.x, y: box.y };
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const candidate = { ...box, x: box.x + dx, y: box.y + dy };
        if (!boxHitsTiles(candidate, solidAt)) return { x: candidate.x, y: candidate.y };
      }
    }
  }
  return null;
}
