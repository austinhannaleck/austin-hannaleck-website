type Stat = { value: string; label: string };

const STATS: Stat[] = [
  { value: "10+", label: "Years in software engineering" },
  { value: "5", label: "Years leading engineering teams" },
  { value: "10", label: "Engineers led, scaled from 3" },
  { value: "$M+", label: "Unlocked in annual loan volume" },
];

const SUMMARY =
  "Software Engineering Manager with 10+ years of technical experience and 5 years leading " +
  "high-performing teams in fast-paced environments. Proven track record driving engineering " +
  "velocity, integrating AI-driven operational efficiencies, and navigating cross-functional " +
  "alignment across Product, Architecture, and Executives to scale core platforms and unlock " +
  "millions in revenue. Hands-on technical leader blending organizational design with modern " +
  "full-stack architecture to build resilient, distributed systems.";

type SkillGroup = { category: string; items: string[] };

const SKILLS: SkillGroup[] = [
  { category: "Languages", items: ["Java", "Kotlin", "JavaScript", "C++"] },
  {
    category: "Data & Storage",
    items: ["MySQL", "MyBatis", "Relational schema design", "Query performance tuning"],
  },
  {
    category: "Cloud & Infrastructure",
    items: [
      "AWS (SQS, API Gateway, CloudWatch)",
      "Distributed / multi-service architecture",
      "OpenTelemetry",
      "Production observability & incident response",
    ],
  },
  {
    category: "AI-Assisted Development",
    items: ["AI-powered diagnostic tooling", "AI-assisted dev workflow"],
  },
];

type Role = { title: string; dates: string };
type Job = { company: string; location: string; roles: Role[]; bullets: string[] };

const EXPERIENCE: Job[] = [
  {
    company: "Cardinal Financial Company",
    location: "Remote",
    roles: [
      { title: "Manager, Software Engineering", dates: "Sept 2021 – Present" },
      { title: "Full-Stack Software Engineer", dates: "May 2019 – Sept 2021" },
    ],
    bullets: [
      "Directed the architecture of a core Credit subsystem update integrating third-party APIs for soft pulls and live debt monitoring, used by ~100% of loans and unlocking millions in annual loan volume.",
      "Scaled and manage a 10-engineer team within a 40+ person organization, growing the team from 3 while securing 5 promotions and partnering cross-functionally with Product and Architecture.",
      "Slashed fee reconciliation time from one day to minutes, eliminating 90%+ of manual intervention for Closing Coordinators and accelerating loan time-to-close.",
      "Diagnosed and eliminated severe SQS queue latency and production downtime by deploying an OpenTelemetry framework paired with an AI-powered diagnostic engine for automated root-cause analysis.",
      "Maintained hands-on technical leadership across enterprise Java, Kotlin, MyBatis, MySQL, and JavaScript systems through architecture, code review, and production support.",
    ],
  },
  {
    company: "CommerceHub",
    location: "Albany, NY",
    roles: [{ title: "Associate Software Engineer", dates: "Dec 2017 – May 2019" }],
    bullets: [
      "Built and maintained interconnected backend systems for OrderStream, the company's flagship product, as part of a three-engineer team.",
    ],
  },
  {
    company: "General Dynamics",
    location: "Pittsfield, MA",
    roles: [{ title: "Software Engineer I", dates: "May 2015 – Dec 2017" }],
    bullets: ["Independently designed and implemented embedded software in C++ to meet customer requirements."],
  },
];

const EDUCATION = {
  school: "Massachusetts College of Liberal Arts",
  location: "North Adams, MA",
  degree: "BS, Computer Science",
  dates: "September 2013 – May 2016",
};

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconWave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M2 12h2l2-7 3 14 3-11 3 8 2-4h5" />
    </svg>
  );
}

type ResumeProps = {
  onViewInstruments?: () => void;
};

function Resume({ onViewInstruments }: ResumeProps) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Resume</p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Austin Hannaleck</h1>
        <p className="mt-2 text-lg text-neutral-500 dark:text-neutral-400">
          Software Engineering Manager — Backend &amp; Distributed Systems
        </p>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1.5">
            <IconPin /> Gilboa, NY
          </span>
          <a href="tel:+14138411801" className="inline-flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-neutral-100">
            <IconPhone /> (413) 841-1801
          </a>
          <a
            href="mailto:ahannaleck1@gmail.com"
            className="inline-flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <IconMail /> ahannaleck1@gmail.com
          </a>
        </div>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center transition-colors hover:border-indigo-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-800"
          >
            <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mb-10">
        <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">{SUMMARY}</p>
      </section>

      <section className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
        <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <IconWave />
          <span>
            <strong className="font-semibold">Signal</strong> — a Web Audio synth &amp; drum machine studio, built
            with React, TypeScript, and the raw Web Audio API, right here on this site.
          </span>
        </p>
        {onViewInstruments && (
          <button
            type="button"
            onClick={onViewInstruments}
            className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Try it out
          </button>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
          Technical Skills
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SKILLS.map((group) => (
            <div key={group.category} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="mb-2 text-sm font-medium">{group.category}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
          Experience
        </h2>
        <ol className="relative border-l border-neutral-200 dark:border-neutral-800">
          {EXPERIENCE.map((job, i) => (
            <li key={job.company} className="relative mb-10 ml-6 last:mb-0">
              <span
                className={`absolute top-1.5 -left-[31px] h-3 w-3 rounded-full border-2 border-white bg-indigo-500 dark:border-neutral-950 ${
                  i === 0 ? "animate-pulse" : ""
                }`}
              />
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-base font-semibold">{job.company}</h3>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">{job.location}</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {job.roles.map((role) => (
                  <p key={role.title} className="text-sm text-neutral-500 dark:text-neutral-400">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{role.title}</span> ·{" "}
                    {role.dates}
                  </p>
                ))}
              </div>
              <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-neutral-600 dark:text-neutral-400">
                {job.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
          Education
        </h2>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h3 className="text-base font-semibold">{EDUCATION.school}</h3>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">{EDUCATION.location}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {EDUCATION.degree} · {EDUCATION.dates}
          </p>
        </div>
      </section>
    </main>
  );
}

export default Resume;
