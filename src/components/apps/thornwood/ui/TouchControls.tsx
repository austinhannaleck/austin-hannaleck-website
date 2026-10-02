import { useRef, useState } from "react";
import type { Buttons } from "../engine/types";

// On-screen controls for phones and tablets: an 8-way D-pad on the left,
// sword and Switcheroo buttons on the right. Pointer capture keeps a drag
// that wanders off the pad still steering, the way a thumb actually moves.

type Directions = Pick<Buttons, "up" | "down" | "left" | "right">;

const NONE: Directions = { up: false, down: false, left: false, right: false };

// Inside this fraction of the pad's radius, a touch doesn't steer.
const DEAD_ZONE = 0.22;
// sin(22.5 degrees): splits the circle into eight even wedges.
const DIAGONAL = 0.383;

type Props = {
  onDirections: (dirs: Directions) => void;
  onButton: (button: "sword" | "tool", down: boolean) => void;
  onPause: () => void;
  onMap: () => void;
  hasTool: boolean;
};

export default function TouchControls({ onDirections, onButton, onPause, onMap, hasTool }: Props) {
  const padRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Directions>(NONE);

  const steer = (e: React.PointerEvent) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    const dirs =
      dist < (rect.width / 2) * DEAD_ZONE
        ? NONE
        : { up: dy / dist < -DIAGONAL, down: dy / dist > DIAGONAL, left: dx / dist < -DIAGONAL, right: dx / dist > DIAGONAL };
    setActive(dirs);
    onDirections(dirs);
  };

  const release = () => {
    setActive(NONE);
    onDirections(NONE);
  };

  const arrow = (dir: keyof Directions, rotate: number, position: string) => (
    <span
      className={`absolute ${position} text-lg transition-colors ${active[dir] ? "text-amber-300" : "text-white/70"}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      ▲
    </span>
  );

  const actionButton = (button: "sword" | "tool", label: string, className: string) => (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onButton(button, true);
      }}
      onPointerUp={() => onButton(button, false)}
      onPointerCancel={() => onButton(button, false)}
      className={`flex items-center justify-center rounded-full font-black text-white shadow-lg select-none active:scale-95 ${className}`}
    >
      {label === "Sword" ? "⚔" : "✦"}
    </button>
  );

  return (
    <div className="mt-4 hidden w-full touch-none items-center justify-between px-2 select-none pointer-coarse:flex">
      <div
        ref={padRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          steer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) steer(e);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        className="relative h-36 w-36 rounded-full bg-neutral-800/90 shadow-inner ring-4 ring-neutral-700/60 dark:bg-neutral-900"
        aria-label="Movement pad"
      >
        {arrow("up", 0, "top-2 left-1/2 -translate-x-1/2")}
        {arrow("down", 180, "bottom-2 left-1/2 -translate-x-1/2")}
        {arrow("left", -90, "left-3 top-1/2 -translate-y-1/2")}
        {arrow("right", 90, "right-3 top-1/2 -translate-y-1/2")}
        <span className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-700/80" />
      </div>
      <div className="flex flex-col gap-2 self-start">
        {(
          [
            ["Pause", onPause],
            ["Map", onMap],
          ] as const
        ).map(([label, onClick]) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative h-36 w-36">
        {actionButton("sword", "Sword", "absolute right-0 bottom-2 h-20 w-20 bg-rose-500 text-3xl")}
        {hasTool && actionButton("tool", "Switcheroo", "absolute top-0 left-2 h-16 w-16 bg-violet-500 text-2xl")}
      </div>
    </div>
  );
}
