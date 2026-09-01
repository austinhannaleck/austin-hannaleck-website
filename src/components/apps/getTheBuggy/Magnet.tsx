export default function Magnet() {
  return (
    <div className="buggy-magnet-pulse h-full w-full">
      <style>{`
        @keyframes buggy-magnet-pulse {
          0%, 100% { filter: drop-shadow(0 0 0px rgba(99, 102, 241, 0.8)); }
          50% { filter: drop-shadow(0 0 3px rgba(99, 102, 241, 0.95)); }
        }
        .buggy-magnet-pulse {
          animation: buggy-magnet-pulse 600ms ease-in-out infinite;
        }
      `}</style>
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <path
          d="M7 4 A7 7 0 0 1 17 4 L17 13 A2.4 2.4 0 0 1 12.2 13 L12.2 6.4 A0.8 0.8 0 0 0 10.8 6.4 L10.8 13 A2.4 2.4 0 0 1 6 13 Z"
          fill="#4c6ef5"
        />
        <rect x="6" y="11.5" width="4.8" height="2.6" fill="#e9ecef" />
        <rect x="13.2" y="11.5" width="4.8" height="2.6" fill="#e9ecef" />
        <rect x="6" y="13.6" width="4.8" height="1.6" fill="#495057" />
        <rect x="13.2" y="13.6" width="4.8" height="1.6" fill="#495057" />
      </svg>
    </div>
  );
}
