import type { LeaderboardEntry } from "./leaderboardStorage";

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  highlightDate: string | null;
};

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export default function Leaderboard({ entries, highlightDate }: LeaderboardProps) {
  return (
    <div className="mt-10 w-full max-w-sm">
      <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
        Leaderboard
      </h2>
      {entries.length === 0 ? (
        <p className="text-center text-sm text-neutral-400 dark:text-neutral-500">
          No runs yet — catch a bug to get on the board.
        </p>
      ) : (
        <ol className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {entries.map((entry, i) => (
            <li
              key={entry.date}
              className={`flex items-center gap-3 px-4 py-2 text-sm ${
                entry.date === highlightDate
                  ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : ""
              }`}
            >
              <span className="w-4 text-neutral-400 dark:text-neutral-500">{i + 1}</span>
              <span className="flex-1 truncate">{entry.name}</span>
              <span className="font-medium">{entry.score}</span>
              <span className="w-14 text-right text-xs text-neutral-400 dark:text-neutral-500">
                {DATE_FORMAT.format(new Date(entry.date))}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
