export default function Mint() {
  return (
    <div className="buggy-mint-sway h-full w-full">
      <style>{`
        @keyframes buggy-mint-sway {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(6deg); }
        }
        .buggy-mint-sway {
          animation: buggy-mint-sway 1400ms ease-in-out infinite;
          transform-origin: 50% 90%;
        }
      `}</style>
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <path d="M12 21 L12 10" stroke="#2b8a3e" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M12 15 Q5 13 5 7 Q11 8 12 15 Z" fill="#63e6be" />
        <path d="M12 12 Q19 10 19 5 Q13 6 12 12 Z" fill="#38d9a9" />
        <path d="M8 9 Q9.5 10 11 12.5" stroke="#0ca678" strokeWidth="0.6" opacity="0.7" fill="none" />
        <path d="M16 8 Q14.5 9 13 11.5" stroke="#0ca678" strokeWidth="0.6" opacity="0.7" fill="none" />
      </svg>
    </div>
  );
}
