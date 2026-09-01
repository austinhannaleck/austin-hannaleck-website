export default function Broccoli() {
  return (
    <div className="buggy-broccoli-twinkle h-full w-full">
      <style>{`
        @keyframes buggy-broccoli-twinkle {
          0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 1px rgba(250, 204, 21, 0.6)); }
          50% { transform: scale(1.12) rotate(6deg); filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.9)); }
        }
        .buggy-broccoli-twinkle {
          animation: buggy-broccoli-twinkle 700ms ease-in-out infinite;
          transform-origin: 50% 60%;
        }
      `}</style>
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <rect x="10.5" y="15" width="3" height="6" rx="1.2" fill="#a3742a" />
        <circle cx="8" cy="9" r="4.6" fill="#2f9e44" />
        <circle cx="13" cy="6.5" r="4.8" fill="#37b24d" />
        <circle cx="17.5" cy="9.5" r="4" fill="#2f9e44" />
        <circle cx="11.5" cy="11" r="4.2" fill="#40c057" />
        <circle cx="7" cy="8" r="1" fill="#1e7e34" opacity="0.6" />
        <circle cx="14" cy="5.5" r="1" fill="#1e7e34" opacity="0.6" />
        <circle cx="17" cy="8.5" r="0.9" fill="#1e7e34" opacity="0.6" />
        <circle cx="11" cy="10" r="0.9" fill="#1e7e34" opacity="0.6" />
      </svg>
    </div>
  );
}
