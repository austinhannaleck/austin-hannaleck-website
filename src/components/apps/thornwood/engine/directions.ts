import type { Direction, Point } from "./types";

const VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function vectorOf(dir: Direction): Point {
  return VECTORS[dir];
}

// Headings are radians where 0 faces down (+y) and PI/2 faces right (+x),
// i.e. the direction vector is (sin a, cos a). Sprites are drawn facing
// down, so rotating one by -a on the canvas points it along heading a.
export function angleOf(dir: Direction): number {
  switch (dir) {
    case "down":
      return 0;
    case "right":
      return Math.PI / 2;
    case "up":
      return Math.PI;
    case "left":
      return -Math.PI / 2;
  }
}

export function angleToward(from: Point, to: Point): number {
  return Math.atan2(to.x - from.x, to.y - from.y);
}

export function headingVector(angle: number): Point {
  return { x: Math.sin(angle), y: Math.cos(angle) };
}

// The cardinal direction closest to a vector (ties favor vertical).
export function directionOfVector(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}

export function directionOfAngle(angle: number): Direction {
  const { x, y } = headingVector(angle);
  return directionOfVector(x, y);
}

// Smallest signed difference between two angles, in (-PI, PI].
export function angleDelta(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta <= -Math.PI) delta += Math.PI * 2;
  return delta;
}

export function turnToward(angle: number, target: number, maxStep: number): number {
  const delta = angleDelta(angle, target);
  return angle + Math.max(-maxStep, Math.min(maxStep, delta));
}

export const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
