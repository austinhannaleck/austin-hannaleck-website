import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import NightSky from "./NightSky";

type Stat = { value: string; label: string };

const STATS: Stat[] = [
  { value: "10+", label: "Years in software engineering" },
  { value: "5+", label: "Years leading engineering teams" },
  { value: "10", label: "Direct reports, scaled from 3" },
  { value: "$10M+", label: "Unlocked in annual loan volume" },
];

const SUMMARY =
  "Software Engineering Manager with 10+ years of technical experience and 5+ years leading " +
  "high-performing teams in fast-paced environments. Proven track record driving engineering " +
  "velocity, integrating AI-driven operational efficiencies, and navigating cross-functional " +
  "alignment across Product, Architecture, and Executives to scale core platforms and unlock " +
  "millions in revenue. Hands-on technical leader blending organizational design with modern " +
  "full-stack architecture to build resilient, distributed systems.";

type SkillGroup = { category: string; emoji: string; accent: string; items: string[] };

const SKILLS: SkillGroup[] = [
  {
    category: "Languages",
    emoji: "💻",
    accent: "from-indigo-500 to-purple-500",
    items: ["Java", "Kotlin", "JavaScript", "C++"],
  },
  {
    category: "Data & Storage",
    emoji: "🗄️",
    accent: "from-emerald-500 to-lime-500",
    items: ["MySQL", "MyBatis", "Relational schema design", "Query performance tuning"],
  },
  {
    category: "Cloud & Infrastructure",
    emoji: "☁️",
    accent: "from-sky-500 to-cyan-500",
    items: [
      "AWS (SQS, API Gateway, CloudWatch)",
      "Distributed / multi-service architecture",
      "OpenTelemetry",
      "Production observability & incident response",
    ],
  },
  {
    category: "AI-Assisted Development",
    emoji: "🤖",
    accent: "from-amber-500 to-orange-500",
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
      { title: "Senior Software Engineer", dates: "Sept 2020 – Sept 2021" },
      { title: "Full-Stack Software Engineer", dates: "May 2019 – Sept 2021" },
    ],
    bullets: [
      "Scaled and manage a 10-engineer team within a 40+ person organization, more than doubling engineering output through AI-driven operational efficiencies.",
      "Directed the architecture of core Credit subsystem upgrades, integrating third-party APIs for soft pulls, live debt monitoring, and derogatory credit event tracking, unlocking tens of millions in annual loan volume.",
      "Slashed Closing Disclosure fee reconciliation time from days to hours, eliminating roughly 90%+ of manual intervention for Closing Coordinators and accelerating loan time-to-close.",
      "Designed and engineered an improved observability framework through OpenTelemetry, paired with an AI-powered diagnostic engine for automated root-cause analysis.",
    ],
  },
  {
    company: "CommerceHub",
    location: "Albany, NY",
    roles: [{ title: "Associate Software Engineer", dates: "Dec 2017 – May 2019" }],
    bullets: [
      "Built and maintained interconnected backend systems for OrderStream, the company's flagship dropshipping / order fulfillment service.",
      "Provided rotating, 24/7 on-call support for OrderStream's backend systems, resolving incidents and ensuring high availability.",
      "Introduced a CI/CD pipeline for OrderStream, automating builds and reducing deployment time from hours to minutes.",
    ],
  },
  {
    company: "General Dynamics Mission Systems",
    location: "Pittsfield, MA",
    roles: [{ title: "Software Engineer I", dates: "May 2015 – Dec 2017" }],
    bullets: [
      "Independently orchestrated a C to C++ tech refresh for a legacy embedded system.",
      "Successfully pitched and migrated the team from a legacy version control system to Git, increasing team collaboration and productivity.",
      "Modernized workflows by introducing scrum ceremonies and daily standups, improving team communication and transparency.",

    ],
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

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

/** Fires `true` once an element first scrolls into view, then stops watching
 * (a resume's stats/timeline should settle once, not re-trigger on scroll
 * back up). Print media bypasses this entirely (see the print: overrides
 * below each consumer), since a printed page has no "scroll into view." */
function useRevealOnce<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, revealed };
}

/** Total time a stat tile takes to count from 0 up to its target number,
 * once it's scrolled into view. Bump this up/down to make the count-up
 * feel slower/faster; it's the only knob that controls that pacing. */
const COUNT_UP_DURATION_MS = 2200;

/** Eases the count-up toward its target instead of ticking up linearly, so
 * it starts fast and settles gently into place rather than stopping
 * abruptly. `t` is elapsed progress from 0 (just started) to 1 (done). */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Splits a stat's display value into a numeric part to animate plus any
 * surrounding prefix/suffix ("10+" -> "", 10, "+"). Returns null for a
 * value with no digits (e.g. "$M+", which has no specific number to count
 * up to) so the caller can fall back to just showing it as-is. */
function parseStatValue(value: string): { prefix: string; target: number; suffix: string } | null {
  const match = value.match(/^(\D*)(\d+)(\D*)$/);
  if (!match) return null;
  return { prefix: match[1], target: Number(match[2]), suffix: match[3] };
}

function StatTile({ stat }: { stat: Stat }) {
  const { ref, revealed } = useRevealOnce<HTMLDivElement>();
  // Memoized on stat.value (not recomputed as a fresh object every render):
  // this feeds the effect's dependency array below, and an unstable object
  // reference there would cancel and restart the rAF loop on every tick,
  // freezing the count at 0 forever instead of counting up.
  const parsedStat = useMemo(() => parseStatValue(stat.value), [stat.value]);
  const [displayedCount, setDisplayedCount] = useState(0);
  // Drives the shimmer below: it only starts once there's a final value on
  // screen to shimmer, whether that's a count-up finishing or (for a stat
  // like "$M+" with nothing to count) immediately on reveal — otherwise the
  // shimmer sweep would be racing visibly against the rapidly-changing
  // count-up digits.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    if (!parsedStat) {
      setSettled(true);
      return;
    }
    const animationStart = performance.now();
    let animationFrameId: number;

    const renderNextFrame = (now: number) => {
      const elapsedFraction = Math.min(1, (now - animationStart) / COUNT_UP_DURATION_MS);
      setDisplayedCount(Math.round(parsedStat.target * easeOutCubic(elapsedFraction)));
      if (elapsedFraction < 1) {
        animationFrameId = requestAnimationFrame(renderNextFrame);
      } else {
        setSettled(true);
      }
    };

    animationFrameId = requestAnimationFrame(renderNextFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [revealed, parsedStat]);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center transition-colors hover:border-indigo-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-800"
    >
      {/* Print always gets the final value, an in-progress or never-started
          count-up animation would otherwise show 0 or a half-finished
          number on paper. */}
      <p className="hidden text-2xl font-semibold text-indigo-600 sm:text-3xl print:block">{stat.value}</p>
      <p
        className={`text-2xl font-semibold text-indigo-600 sm:text-3xl print:hidden dark:text-indigo-400 ${
          settled ? "stat-shimmer" : ""
        }`}
      >
        {parsedStat ? `${parsedStat.prefix}${displayedCount}${parsedStat.suffix}` : stat.value}
      </p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
      <style>{`
        /* A light highlight sweeps across the settled number every few
           seconds — background-clip: text lets the gradient itself paint
           the glyphs, so only the ink shimmers, not the surrounding
           whitespace (a separate mix-blend-mode overlay was tried here
           briefly; it lit up the whole box, not just the digits, so it's
           gone). The base color is hardcoded to indigo-600/indigo-400 (the
           same swatches the text-indigo-* classes above use) rather than
           currentColor: this rule also sets color: transparent for
           browsers that don't support background-clip: text, and
           currentColor would have resolved against THAT (transparent),
           silently erasing the whole gradient instead of just hiding the
           fallback.
           Timing is linear, not ease-in-out: with only two keyframes and
           infinite repetition (no alternate direction), every loop has to
           snap instantly back to its starting position — ease-in-out decelerates to
           near-a-standstill right before that snap, so the sweep reads as
           "slowly grind to a halt, then teleport," which is what looked
           jumpy. Linear keeps constant speed right up to the reset, so it
           reads as one continuous sweep instead of a stall-and-jump. */
        .stat-shimmer {
          background-image: linear-gradient(100deg, #4f46e5 30%, rgba(255, 255, 255, 0.9) 50%, #4f46e5 70%);
          background-size: 200% 100%;
          background-position: 200% 0;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: stat-shimmer-sweep 3s linear infinite;
        }
        @media (prefers-color-scheme: dark) {
          .stat-shimmer {
            background-image: linear-gradient(100deg, #818cf8 30%, rgba(255, 255, 255, 0.9) 50%, #818cf8 70%);
          }
        }
        /* The travel distance (keyframe delta) must equal the tile width
           (background-size) — a 1:1 ratio — so the repeating gradient
           wraps back on itself in phase. The previous 250%-wide tile with
           a 300% travel (a 1.2 ratio) meant the pattern didn't repeat on a
           whole tile boundary: two highlight bands swept past per cycle
           instead of one, and the loop-reset point clipped one of them
           mid-sweep, which read as "every other pass is faster." */
        @keyframes stat-shimmer-sweep {
          0% { background-position: 200% 0; }
          100% { background-position: 0% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .stat-shimmer { animation: none; background-position: 0% 0; }
        }
      `}</style>
    </div>
  );
}

/** Renders a role's date range, swapping a trailing "Present" for a small
 * badge so the current role reads clearly at a glance. */
function DateRange({ dates }: { dates: string }) {
  const match = dates.match(/^(.*)–\s*Present$/i);
  if (!match) return <>{dates}</>;
  return (
    <>
      {match[1].trim()} –{" "}
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-600 print:bg-transparent print:px-0 print:font-medium dark:text-emerald-400">
        Present
      </span>
    </>
  );
}

/** True when any of a job's roles is still ongoing ("... – Present"). Drives
 * the current-role card highlight below, so it's derived from the actual
 * data instead of "whichever job happens to be first in the array" (see
 * the now-removed index === 0 pulse logic this replaces the spirit of). */
function isCurrentJob(job: Job): boolean {
  return job.roles.some((role) => /–\s*Present$/i.test(role.dates));
}

/** Bullet stagger timing: each bullet starts BULLET_STAGGER_MS after the
 * previous one, offset by BULLET_BASE_DELAY_MS so the cascade begins once
 * the parent card has visibly started settling into place rather than
 * racing its own entrance transition. */
const BULLET_BASE_DELAY_MS = 350;
const BULLET_STAGGER_MS = 90;

/**
 * Every knob for the EXPERIENCE card highlight (the current role's
 * permanent tint, and the hover tint every card gets) lives here, named,
 * instead of buried in one long template-literal string. Bump the numbers
 * to change brightness; see the two notes below before you do.
 *
 * 1. Tailwind's `color/N` suffix is that color's OPACITY as a percentage,
 *    not a different shade — `bg-indigo-50/60` is indigo-50 at 60% opacity,
 *    `bg-indigo-50/100` is fully solid indigo-50, `bg-indigo-50/10` is
 *    barely-there. Higher N = brighter/more visible. Valid range is 0-100.
 *    To make hovers "even more distinct," raising these numbers (up toward
 *    100) is the first thing to try.
 *
 * 2. Light and dark mode intentionally use different SWATCHES, not just
 *    different opacities: light mode tints a white card with a pale swatch
 *    (indigo-50) so it needs a moderate opacity to read at all; dark mode
 *    tints an already-dark card with a deep swatch (indigo-950), which
 *    would look like a jarring solid block at the same opacity light mode
 *    uses, so it stays much lower (20-30% vs. 60-80%). If you brighten one,
 *    sanity-check the other in a dark browser/OS theme too.
 *
 * The ring (Tailwind's box-shadow-based border-lookalike, doesn't affect
 * layout the way a real `border` would) has two separate knobs: its COLOR
 * is set below via `ring-indigo-100`/`ring-indigo-900`, and its WIDTH is
 * set separately where it's used, via `ring-1` (a 1px ring) — bump that to
 * `ring-2` or `ring-4` for a visibly thicker border rather than just a
 * stronger color.
 *
 * Tailwind can only generate CSS for class names it can find as literal
 * text in this file, so these are complete class-name strings, not numbers
 * you can plug into a template literal (e.g. `bg-indigo-50/${n}` will NOT
 * work — Tailwind's scanner never sees a real class name to generate).
 * Edit the literal numbers inside each string below instead.
 */
const CURRENT_ROLE_TINT = "bg-indigo-50/60 dark:bg-indigo-950/20";
const CURRENT_ROLE_RING = "ring-indigo-100 dark:ring-indigo-900/40";
const CURRENT_ROLE_TINT_ON_HOVER = "group-hover:bg-indigo-200/80 dark:group-hover:bg-indigo-950/50";
// Every other role starts fully invisible (no tint, no ring) and lights up
// on hover to the exact same brightness as the current role's hover state
// above — same numbers, kept as a separate literal (rather than reusing
// CURRENT_ROLE_TINT_ON_HOVER by reference) only because Tailwind needs to
// see each class name written out; there's no behavioral reason they'd
// ever need to diverge.
const OTHER_ROLE_BASE = "bg-transparent ring-transparent";
const OTHER_ROLE_TINT_ON_HOVER = "group-hover:bg-indigo-200/80 dark:group-hover:bg-indigo-950/50";
const OTHER_ROLE_RING_ON_HOVER = "group-hover:ring-indigo-50 dark:group-hover:ring-indigo-900/40";

function TimelineEntry({ job, index }: { job: Job; index: number }) {
  const { ref, revealed } = useRevealOnce<HTMLLIElement>(0.15);
  const isCurrent = isCurrentJob(job);

  return (
    <li
      ref={ref}
      className={`group relative mb-10 ml-6 transition-all duration-700 ease-out last:mb-0 print:!translate-y-0 print:!opacity-100 ${
        revealed ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      style={{ transitionDelay: `${Math.min(index, 4) * 90}ms` }}
    >
      {/* A separate, absolutely-positioned decorative layer rather than
          margin/padding tricks on the content below: an earlier version
          used negative margin + matching padding on the content div itself
          to push its background out far enough to enclose the dot/rail,
          which worked fine horizontally but silently failed vertically —
          vertical margins collapse with the parent <li> in CSS (horizontal
          margins never do), so a negative margin-top just dragged the
          whole <li> up with it instead of extending the card past the dot
          independently. Positioning the highlight as its own element with
          plain inset offsets sidesteps collapsing entirely, and means the
          content below never needs any conditional spacing at all — it's
          identical for every entry, current or not.
          -left-8 reaches far enough to enclose the pulsing dot and the
          rail behind it. -top-4 clears rounded-xl's 12px corner radius
          above the dot (which sits only 6px down, well inside that curve)
          so the corner doesn't cut across its row and give it a lopsided
          background. -z-10 keeps this behind the dot and text, which is
          why it needs `aria-hidden` and no interactive content of its
          own — it's pure backdrop.
          Always rendered now (not just for isCurrent): every entry gets a
          hover-triggered tint via `group-hover` (the `group` class lives on
          the <li> itself, so hovering anywhere over the entry's visible
          text — not just this backdrop div sitting behind everything —
          still lights it up). The current role's tint stays permanently
          visible and just brightens a touch further on hover, rather than
          having hover behave differently for it than for every other
          entry. */}
      <div
        aria-hidden="true"
        className={`absolute -top-4 -right-4 -bottom-4 -left-8 -z-10 rounded-xl ring-1 transition-colors duration-200 print:hidden ${
          isCurrent
            ? `${CURRENT_ROLE_TINT} ${CURRENT_ROLE_RING} ${CURRENT_ROLE_TINT_ON_HOVER}`
            : `${OTHER_ROLE_BASE} ${OTHER_ROLE_TINT_ON_HOVER} ${OTHER_ROLE_RING_ON_HOVER}`
        }`}
      />
      {/* -left-6 (a clean -24px, matching the rail's own -left-0.5/w-1
          being centered at the same point once ml-6 is accounted for) plus
          -translate-x-1/2 to center the dot on that point — not a
          hand-measured fractional left value. A fractional CSS length
          (this used to be -left-[29.5px]) lands exactly on a device pixel
          under some device-pixel-ratio/zoom combinations and gets
          sub-pixel-blurred under others, reading as "leaning" one way even
          though the box model math is correct. Whole-number left plus a
          percentage transform is resolved by the renderer at paint time
          against the dot's actual rendered size, so it can't drift like
          that regardless of DPR or zoom. */}
      <span className="absolute top-1.5 -left-6 -translate-x-1/2 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-indigo-500 dark:border-neutral-950" />
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-base font-semibold">{job.company}</h3>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">{job.location}</span>
        </div>
        <div className="mt-1 space-y-0.5">
          {job.roles.map((role) => (
            <p key={role.title} className="text-sm text-neutral-500 dark:text-neutral-400">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{role.title}</span> ·{" "}
              <DateRange dates={role.dates} />
            </p>
          ))}
        </div>
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-neutral-600 dark:text-neutral-400">
          {job.bullets.map((bullet, bulletIndex) => (
            <li
              key={bullet}
              className={`transition-all duration-500 ease-out print:!translate-x-0 print:!opacity-100 ${
                revealed ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
              }`}
              style={{
                transitionDelay: revealed ? `${BULLET_BASE_DELAY_MS + bulletIndex * BULLET_STAGGER_MS}ms` : "0ms",
              }}
            >
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

/** How long the comet trail below takes to sweep from top to bottom of the
 * timeline rail, once it scrolls into view. */
const COMET_GROW_DURATION_MS = 1600;

/** Wraps the Experience list's vertical rail. The plain gray border on the
 * `<ol>` itself is the permanent, always-fully-drawn line (also what print
 * sees). Layered on top of it is a glowing overlay that starts fully
 * collapsed (`scaleY(0)`, anchored to the top via `transform-origin`) and
 * grows to full height once revealed.
 *
 * Brightness is deliberately front-loaded, not evenly distributed: the
 * gradient runs bright-indigo at the top down to transparent at the
 * bottom, so the brightest point always marks the most recent role (top
 * of EXPERIENCE), and growing the overlay downward reveals progressively
 * more of the fading trail extending back through older roles beneath it.
 * No separate glow dot marks that bright end — the first role's own
 * per-entry pulsing dot (see TimelineEntry) already sits right there, and
 * an anchored glow dot on top of it just doubled up as two overlapping
 * nodes at the same spot.
 *
 * Threshold is 0, not the usual 0.15/0.35 used elsewhere on this page:
 * this wraps the whole (often tall) Experience list, so it should start
 * growing as soon as its top edge appears rather than waiting for a large
 * fraction of a tall element to be visible, which may never happen within
 * one viewport. */
function TimelineRail({ children }: { children: ReactNode }) {
  const { ref, revealed } = useRevealOnce<HTMLOListElement>(0);
  return (
    <ol ref={ref} className="relative border-l border-neutral-200 dark:border-neutral-800">
      {/* -left-0.5/w-1 (2px/4px), not -left-px/w-[3px]: an odd width has no
          whole-pixel center, so anything trying to line up with its middle
          is forced through a .5px value somewhere. That renders crisply
          under some device-pixel-ratio/zoom combinations and slightly
          blurred/off-center under others — not a bug in the alignment math
          itself, just DPR-dependent rounding. Even width, even anchor.
          top-3 (12px), not top-0: starting flush with <ol>'s own top edge
          left a flat-topped 6px sliver of solid bright bar poking out
          above the first entry's dot (whose vertical center sits 12px down
          — top-1.5 for the dot itself, plus half its own 12px height) —
          read as a second node sitting just above the real one. Starting
          the bar at that same 12px mark instead tucks its flat top behind
          the dot itself, so the trail visually emerges from the node
          rather than floating a few pixels above it. Height is shortened
          by the same 12px so the bottom of the rail doesn't shift. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-3 -left-0.5 h-[calc(100%-0.75rem)] w-1 origin-top print:hidden"
        style={{
          transform: revealed ? "scaleY(1)" : "scaleY(0)",
          transition: `transform ${COMET_GROW_DURATION_MS}ms ease-out`,
        }}
      >
        <div className="h-full w-full bg-gradient-to-b from-indigo-400 via-indigo-500/50 to-transparent" />
      </div>
      {children}
    </ol>
  );
}

type ResumeProps = {
  onOpenSignal?: () => void;
};

function Resume({ onOpenSignal }: ResumeProps) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
      <header className="relative mb-10 overflow-hidden rounded-2xl px-6 py-10 shadow-xl shadow-indigo-950/20 ring-1 ring-white/10 print:rounded-none print:p-0 print:shadow-none print:ring-0 sm:px-10 sm:py-14">
        <NightSky />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300 print:text-indigo-600">
              Resume
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-white print:text-neutral-900 sm:text-5xl">
              Austin Hannaleck
            </h1>
            <p className="mt-2 text-lg text-neutral-300 print:text-neutral-600">
              Software Engineering Manager — Backend &amp; Distributed Systems
            </p>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-300 print:text-neutral-600">
              <span className="inline-flex items-center gap-1.5">
                <IconPin /> Gilboa, NY
              </span>
              <a href="tel:+14138411801" className="inline-flex items-center gap-1.5 hover:text-white print:hover:text-neutral-600">
                <IconPhone /> (413) 841-1801
              </a>
              <a
                href="mailto:ahannaleck1@gmail.com"
                className="inline-flex items-center gap-1.5 hover:text-white print:hover:text-neutral-600"
              >
                <IconMail /> ahannaleck1@gmail.com
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 print:hidden"
          >
            <IconDownload /> Download PDF
          </button>
        </div>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((stat) => (
          <StatTile key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="mb-10">
        <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">{SUMMARY}</p>
      </section>

      <section className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 print:hidden dark:border-indigo-800 dark:bg-indigo-950/30">
        <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <IconWave />
          <span>
            <strong className="font-semibold">Signal</strong> — a Web Audio synth &amp; drum machine studio, built
            with React, TypeScript, and the raw Web Audio API, right here on this site.
          </span>
        </p>
        {onOpenSignal && (
          <button
            type="button"
            onClick={onOpenSignal}
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
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-sm ${group.accent}`}
                >
                  {group.emoji}
                </span>
                <p className="text-sm font-medium">{group.category}</p>
              </div>
              {/* A small constellation instead of flat pills: a faint
                  connecting line down the left with a glowing node per
                  item, echoing the same star-chart language as NightSky
                  and the Experience timeline's rail, just quieter (no
                  motion — this list is dense enough without it). */}
              <ul className="relative space-y-1.5 border-l border-dashed border-neutral-200 pl-4 dark:border-neutral-800">
                {group.items.map((item) => (
                  <li key={item} className="relative text-xs text-neutral-700 dark:text-neutral-300">
                    <span className="absolute top-1.5 -left-[17px] h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_4px_1px_rgba(129,140,248,0.6)] print:shadow-none dark:bg-indigo-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mb-10 overflow-hidden rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800 sm:p-8">
        <div className="relative">
          {/* mb-8, not the mb-4 other section headers use: each entry's
              highlight backdrop (see TimelineEntry) extends -top-4 above
              itself, so with only mb-4 here the first entry's tint/ring box
              would reach all the way up to touch this header's text. */}
          <h2 className="mb-8 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
            Experience
          </h2>
          <TimelineRail>
            {EXPERIENCE.map((job, i) => (
              <TimelineEntry key={job.company} job={job} index={i} />
            ))}
          </TimelineRail>
        </div>
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
