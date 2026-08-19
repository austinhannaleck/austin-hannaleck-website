import { useEffect, useRef } from "react";

type EatBurstProps = {
  onDone: () => void;
};

const ANIMATION_MS = 350;

// A quick radial sparkle shown where Banjo just caught a bug. Purely
// decorative — mounts once per catch and calls `onDone` itself once the
// CSS animation finishes, so the parent can drop it from its list.
export default function EatBurst({ onDone }: EatBurstProps) {
  // Read the latest callback from a ref rather than the effect's own
  // dependency, so parent re-renders (which happen every game tick)
  // don't restart this timer before it ever fires.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const id = setTimeout(() => onDoneRef.current(), ANIMATION_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="buggy-eat-burst pointer-events-none h-full w-full">
      <style>{`
        @keyframes buggy-eat-burst-pop {
          0% { transform: scale(0.4); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .buggy-eat-burst {
          animation: buggy-eat-burst-pop ${ANIMATION_MS}ms ease-out forwards;
          transform-origin: 50% 50%;
        }
      `}</style>
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <g stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="2" x2="12" y2="7" />
          <line x1="12" y1="17" x2="12" y2="22" />
          <line x1="2" y1="12" x2="7" y2="12" />
          <line x1="17" y1="12" x2="22" y2="12" />
          <line x1="5" y1="5" x2="8.5" y2="8.5" />
          <line x1="15.5" y1="15.5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="15.5" y2="8.5" />
          <line x1="8.5" y1="15.5" x2="5" y2="19" />
        </g>
        <circle cx="12" cy="12" r="2.5" fill="#f59e0b" />
      </svg>
    </div>
  );
}
