import ProfileHeader from "./ProfileHeader";

function IconArrowRight() {
  return (
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
  );
}

type HomeProps = {
  onOpenResume: () => void;
  onOpenApps: () => void;
  onOpenAbout: () => void;
};

function Home({ onOpenResume, onOpenApps, onOpenAbout }: HomeProps) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
      <ProfileHeader eyebrow="Portfolio" />

      <section className="mb-10">
        <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
          10+ years building software, 5 leading the teams that build it — these days that's a
          10-engineer org at Cardinal Financial, shipping distributed, fintech-scale systems. Off
          the clock, I build for fun: this site is my playground, home to Signal, a Web Audio synth
          coded from scratch — no libraries, just the browser.
        </p>
        <button
          type="button"
          onClick={onOpenAbout}
          className="group mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:gap-1.5 dark:text-indigo-400"
        >
          Chickens, dogs, bees, and video games — more about me
          <IconArrowRight />
        </button>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenResume}
          className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 text-left transition-colors hover:border-indigo-300 dark:border-neutral-800 dark:hover:border-indigo-800"
        >
          <div className="flex h-28 items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900">
            <span className="text-2xl font-bold tracking-tight text-white/90">Resume</span>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-5">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Experience, skills, and the full career story.
            </p>
            <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-indigo-600 group-hover:gap-1.5 dark:text-indigo-400">
              View Resume
              <IconArrowRight />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenApps}
          className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 text-left transition-colors hover:border-indigo-300 dark:border-neutral-800 dark:hover:border-indigo-800"
        >
          <div className="flex h-28 items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600">
            <span className="text-2xl font-bold tracking-tight text-white/90">Apps</span>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-5">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Signal, HiveMind, and whatever I build next.
            </p>
            <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-indigo-600 group-hover:gap-1.5 dark:text-indigo-400">
              Explore Apps
              <IconArrowRight />
            </span>
          </div>
        </button>
      </div>
    </main>
  );
}

export default Home;
