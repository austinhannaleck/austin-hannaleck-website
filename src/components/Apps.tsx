export type AppId = "signal" | "hivemind" | "buggy" | "makethebed";

type AppEntry = {
  id: AppId;
  name: string;
  tagline: string;
  description: string;
  status: "live" | "under-construction";
  accent: string;
};

const APPS: AppEntry[] = [
  {
    id: "signal",
    name: "Signal",
    tagline: "Synth · Drum Machine · Bassline",
    description:
      "A Web Audio synth, drum machine, and bassline sequencer built from scratch with React, TypeScript, and the raw Web Audio API. No samples, no audio libraries.",
    status: "live",
    accent: "from-orange-500 to-amber-500",
  },
  {
    id: "buggy",
    name: "Get the Buggy",
    tagline: "Snake, starring Banjo",
    description:
      "A Snake-style game starring my dog Banjo. Chase down bugs, grow your tail, and try not to run into a wall (or yourself).",
    status: "live",
    accent: "from-emerald-500 to-lime-500",
  },
  {
    id: "hivemind",
    name: "HiveMind",
    tagline: "Coming soon",
    description: "A new app to help beekeepers manage their hives. Coming soon.",
    status: "under-construction",
    accent: "from-indigo-500 to-purple-500",
  },
];

type AppsProps = {
  onOpenApp: (id: AppId) => void;
};

function Apps({ onOpenApp }: AppsProps) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Apps</p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Things I've built</h1>
        <p className="mt-2 text-lg text-neutral-500 dark:text-neutral-400">
          Small apps and experiments, some of them built right here on this site.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {APPS.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => onOpenApp(app.id)}
            className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 text-left transition-colors hover:border-indigo-300 dark:border-neutral-800 dark:hover:border-indigo-800"
          >
            <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${app.accent}`}>
              <span className="text-2xl font-bold tracking-tight text-white/90">{app.name}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{app.tagline}</p>
                {app.status === "under-construction" && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                    Under construction
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{app.description}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-indigo-600 group-hover:gap-1.5 dark:text-indigo-400">
                Open {app.name}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </span>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}

export default Apps;
