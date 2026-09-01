type BedProps = {
  color: string;
};

// A small cushion, colorable so the tower reads as a stack of distinct
// beds rather than a repeating tile.
export default function Bed({ color }: BedProps) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full">
      <rect x="1" y="16" width="22" height="4" rx="2" fill="black" opacity="0.12" />
      <rect x="2" y="9" width="20" height="11" rx="4" fill={color} />
      <rect x="2" y="9" width="20" height="4.5" rx="2.2" fill="white" opacity="0.35" />
    </svg>
  );
}
