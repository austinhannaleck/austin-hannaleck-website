export default function GoldenBug() {
  return (
    <div className="buggy-golden-bug-sparkle h-full w-full">
      <style>{`
        @keyframes buggy-golden-bug-sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 1px rgba(250, 176, 5, 0.7)); }
          50% { transform: scale(1.15) rotate(8deg); filter: drop-shadow(0 0 5px rgba(250, 176, 5, 1)); }
        }
        .buggy-golden-bug-sparkle {
          animation: buggy-golden-bug-sparkle 450ms ease-in-out infinite;
          transform-origin: 50% 60%;
        }
      `}</style>
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <ellipse cx="12" cy="13" rx="5" ry="6" fill="#f59f00" />
        <line x1="12" y1="7.5" x2="12" y2="18.5" stroke="#e8590c" strokeWidth="0.8" />
        <ellipse cx="10" cy="10" rx="1.4" ry="1" fill="#ffe066" opacity="0.85" />
        <circle cx="12" cy="7" r="2.6" fill="#f59f00" />
        <line x1="7" y1="9" x2="3" y2="6" stroke="#e8590c" strokeWidth="1" strokeLinecap="round" />
        <circle cx="3" cy="6" r="0.7" fill="#e8590c" />
        <line x1="7" y1="13" x2="2" y2="13" stroke="#e8590c" strokeWidth="1" strokeLinecap="round" />
        <line x1="7" y1="17" x2="3" y2="20" stroke="#e8590c" strokeWidth="1" strokeLinecap="round" />
        <line x1="17" y1="9" x2="21" y2="6" stroke="#e8590c" strokeWidth="1" strokeLinecap="round" />
        <circle cx="21" cy="6" r="0.7" fill="#e8590c" />
        <line x1="17" y1="13" x2="22" y2="13" stroke="#e8590c" strokeWidth="1" strokeLinecap="round" />
        <line x1="17" y1="17" x2="21" y2="20" stroke="#e8590c" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
}
