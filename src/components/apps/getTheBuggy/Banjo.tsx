import type { Direction, PowerupType } from "./types";

// Drawn facing "right" — rotated per direction so Banjo always faces
// the way he's moving.
const ROTATION_FOR_DIRECTION: Record<Direction, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

type BanjoSegmentProps = {
  segment: "head" | "body";
  direction: Direction;
  // How long the head's turn animation takes. Passed down (rather than
  // hardcoded) so it stays under the current tick interval — otherwise,
  // as the game speeds up, a turn animation can still be running when
  // the next tick arrives, which reads as input lag.
  turnDurationMs: number;
  // Active power-up, if any — each type gets its own glow. The keyframes
  // themselves live once in GetTheBuggy.tsx rather than here, since
  // Banjo renders once per segment — embedding a <style> tag per
  // instance would duplicate the same rules across every segment as the
  // snake grows. `isWrapBuffer` only matters for "broccoli" (see
  // POWERUP_WRAP_BUFFER_MS in types.ts).
  activePowerupType: PowerupType | null;
  isWrapBuffer: boolean;
};

function glowClassFor(type: PowerupType | null, isWrapBuffer: boolean): string {
  switch (type) {
    case "broccoli":
      return isWrapBuffer ? "buggy-wrap-buffer" : "buggy-invincible";
    case "carrot":
      return "buggy-glow-carrot";
    case "mint":
      return "buggy-glow-mint";
    case "magnet":
      return "buggy-glow-magnet";
    case null:
      return "";
  }
}

function BanjoHead() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full">
      <ellipse cx="7" cy="8.5" rx="2.6" ry="4.4" fill="#5c3a21" transform="rotate(-25 7 8.5)" />
      <ellipse cx="7" cy="15.5" rx="2.6" ry="4.4" fill="#5c3a21" transform="rotate(25 7 15.5)" />
      <ellipse cx="11" cy="12" rx="7" ry="6" fill="#a9713f" />
      <ellipse cx="18" cy="12" rx="4" ry="3.4" fill="#c98a4f" />
      <circle cx="21.3" cy="12" r="1.2" fill="#2b1a10" />
      <circle cx="13.5" cy="9" r="1.1" fill="#2b1a10" />
      <circle cx="13.5" cy="15" r="1.1" fill="#2b1a10" />
    </svg>
  );
}

function BanjoBody() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full">
      <ellipse cx="12" cy="12" rx="8" ry="7" fill="#a9713f" stroke="#8a5a30" strokeWidth="1" />
    </svg>
  );
}

export default function Banjo({
  segment,
  direction,
  turnDurationMs,
  activePowerupType,
  isWrapBuffer,
}: BanjoSegmentProps) {
  const glowClass = glowClassFor(activePowerupType, isWrapBuffer);

  const sprite =
    segment === "body" ? (
      <BanjoBody />
    ) : (
      <div
        className="h-full w-full"
        style={{
          transform: `rotate(${ROTATION_FOR_DIRECTION[direction]}deg)`,
          transition: `transform ${turnDurationMs}ms ease`,
        }}
      >
        <BanjoHead />
      </div>
    );

  if (!glowClass) return sprite;
  return <div className={`h-full w-full ${glowClass}`}>{sprite}</div>;
}
