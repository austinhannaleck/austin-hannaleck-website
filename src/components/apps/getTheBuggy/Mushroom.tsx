export default function Mushroom() {
  return (
    <div className="buggy-mushroom-bounce h-full w-full">
      <style>{`
        @keyframes buggy-mushroom-bounce {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.88); }
        }
        .buggy-mushroom-bounce {
          animation: buggy-mushroom-bounce 900ms ease-in-out infinite;
          transform-origin: 50% 100%;
        }
      `}</style>
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <rect x="9.5" y="13" width="5" height="7" rx="1.6" fill="#f1e4d0" />
        <path d="M3 12 Q12 2 21 12 Q12 16 3 12 Z" fill="#e03131" />
        <circle cx="8" cy="8.5" r="1.3" fill="#f8f0e3" />
        <circle cx="13" cy="6.5" r="1" fill="#f8f0e3" />
        <circle cx="16.5" cy="9.5" r="1.1" fill="#f8f0e3" />
        <circle cx="10.5" cy="11" r="0.9" fill="#f8f0e3" />
      </svg>
    </div>
  );
}
