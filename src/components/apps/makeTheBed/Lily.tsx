import type { Direction } from "./types";

type LilyProps = {
  facing: Direction;
};

// Drawn facing right — flipped horizontally when moving left, same trick
// Banjo's head rotation uses, just mirror instead of rotate since Lily
// only ever moves along one axis.
export default function Lily({ facing }: LilyProps) {
  return (
    <div className="h-full w-full" style={{ transform: facing === "left" ? "scaleX(-1)" : "scaleX(1)" }}>
      <svg viewBox="0 0 52 24" className="h-full w-full">
        <rect x="8" y="17" width="3" height="6" rx="1.4" fill="#e7dcc8" />
        <rect x="16" y="17" width="3" height="6" rx="1.4" fill="#e7dcc8" />
        <rect x="30" y="17" width="3" height="6" rx="1.4" fill="#e7dcc8" />
        <rect x="38" y="17" width="3" height="6" rx="1.4" fill="#e7dcc8" />
        <path d="M6 12 Q0 6 3 2" stroke="#c9a876" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse cx="24" cy="14" rx="18" ry="8" fill="#f4ead6" stroke="#d8c8a4" strokeWidth="1" />
        <ellipse cx="18" cy="10" rx="4" ry="3" fill="#c9a876" opacity="0.8" />
        <ellipse cx="28" cy="18" rx="3" ry="2.4" fill="#c9a876" opacity="0.8" />
        <ellipse cx="38" cy="8" rx="4" ry="6" fill="#c9a876" transform="rotate(20 38 8)" />
        <ellipse cx="41" cy="11" rx="7" ry="6" fill="#f4ead6" />
        <ellipse cx="46.5" cy="12.5" rx="3" ry="2.4" fill="#f4ead6" />
        <circle cx="49" cy="12.5" r="1" fill="#3a2a1a" />
        <circle cx="42.5" cy="9.5" r="1" fill="#3a2a1a" />
      </svg>
    </div>
  );
}
