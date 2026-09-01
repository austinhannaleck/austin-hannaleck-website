import NightSky from "./NightSky";

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V8h4v1.5A5 5 0 0 1 16 8Z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

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
      <header className="relative mb-10 overflow-hidden rounded-2xl px-6 py-10 shadow-xl shadow-indigo-950/20 ring-1 ring-white/10 sm:px-10 sm:py-14">
        <NightSky />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Portfolio</p>
          <h1 className="mt-2 text-4xl font-semibold text-white sm:text-5xl">Austin Hannaleck</h1>
          <p className="mt-2 text-lg text-neutral-300">
            Software Engineering Manager — Backend &amp; Distributed Systems
          </p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-300">
            <a
              href="mailto:ahannaleck1@gmail.com"
              className="inline-flex items-center gap-1.5 hover:text-white"
            >
              <IconMail /> ahannaleck1@gmail.com
            </a>
            <a
              href="https://www.linkedin.com/in/austin-hannaleck-0b4aa7b2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white"
            >
              <IconLinkedIn /> LinkedIn
            </a>
          </div>
        </div>
      </header>

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
