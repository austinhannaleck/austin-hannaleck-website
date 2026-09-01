export default function Bug() {
  return (
    <div className="buggy-bug-idle h-full w-full">
      <style>{`
        @keyframes buggy-bug-idle {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.08) rotate(-6deg); }
        }
        .buggy-bug-idle {
          animation: buggy-bug-idle 900ms ease-in-out infinite;
          transform-origin: 50% 50%;
        }
      `}</style>
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <ellipse cx="12" cy="13" rx="5" ry="6" fill="#e11d48" />
        <line x1="12" y1="7.5" x2="12" y2="18.5" stroke="#7f1d1d" strokeWidth="0.8" />
        <ellipse cx="10" cy="10" rx="1.4" ry="1" fill="#fca5a5" opacity="0.7" />
        <circle cx="12" cy="7" r="2.6" fill="#e11d48" />
        <line x1="7" y1="9" x2="3" y2="6" stroke="#7f1d1d" strokeWidth="1" strokeLinecap="round" />
        <circle cx="3" cy="6" r="0.7" fill="#7f1d1d" />
        <line x1="7" y1="13" x2="2" y2="13" stroke="#7f1d1d" strokeWidth="1" strokeLinecap="round" />
        <line x1="7" y1="17" x2="3" y2="20" stroke="#7f1d1d" strokeWidth="1" strokeLinecap="round" />
        <line x1="17" y1="9" x2="21" y2="6" stroke="#7f1d1d" strokeWidth="1" strokeLinecap="round" />
        <circle cx="21" cy="6" r="0.7" fill="#7f1d1d" />
        <line x1="17" y1="13" x2="22" y2="13" stroke="#7f1d1d" strokeWidth="1" strokeLinecap="round" />
        <line x1="17" y1="17" x2="21" y2="20" stroke="#7f1d1d" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
}
