export default function Carrot() {
  return (
    <div className="buggy-carrot-jitter h-full w-full">
      <style>{`
        @keyframes buggy-carrot-jitter {
          0%, 100% { transform: translateX(0) rotate(-4deg); }
          25% { transform: translateX(-1px) rotate(-8deg); }
          75% { transform: translateX(1px) rotate(0deg); }
        }
        .buggy-carrot-jitter {
          animation: buggy-carrot-jitter 220ms steps(2) infinite;
          transform-origin: 50% 30%;
        }
      `}</style>
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <path d="M12 4 L9 3 M12 4 L12 2 M12 4 L15 3" stroke="#2f9e44" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M9 6 L15 6 L12.5 20 Q12 21.5 11.5 20 Z" fill="#f76707" />
        <path d="M9.5 9 L14.5 9" stroke="#e8590c" strokeWidth="0.8" opacity="0.6" />
        <path d="M10 12 L14 12" stroke="#e8590c" strokeWidth="0.8" opacity="0.6" />
        <path d="M10.5 15 L13.5 15" stroke="#e8590c" strokeWidth="0.8" opacity="0.6" />
      </svg>
    </div>
  );
}
