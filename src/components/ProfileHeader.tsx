import type { ReactNode } from "react";
import NightSky from "./NightSky";

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
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

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V8h4v1.5A5 5 0 0 1 16 8Z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

type ProfileHeaderProps = {
  /** Small label above the name — "Portfolio" on Home, "Resume" on the resume page. */
  eyebrow: string;
  /** Optional page-specific controls rendered top-right (e.g. Resume's "Download PDF" button). */
  actions?: ReactNode;
};

/** The "Austin Hannaleck" name/title/contact banner shared by every page that
 * introduces him (Home, Resume, ...). Keep this the single source of truth
 * for that content — pages should never re-type the name, title, or contact
 * links themselves. */
function ProfileHeader({ eyebrow, actions }: ProfileHeaderProps) {
  return (
    <header className="relative mb-10 overflow-hidden rounded-2xl px-6 py-10 shadow-xl shadow-indigo-950/20 ring-1 ring-white/10 print:rounded-none print:p-0 print:shadow-none print:ring-0 sm:px-10 sm:py-14">
      <NightSky />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300 print:text-indigo-600">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-white print:text-neutral-900 sm:text-5xl">
            Austin Hannaleck
          </h1>
          <p className="mt-2 text-lg text-neutral-300 print:text-neutral-600">
            Software Engineering Manager — Backend &amp; Distributed Systems
          </p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-300 print:text-neutral-600">
            <span className="inline-flex items-center gap-1.5">
              <IconPin /> Upstate NY
            </span>
            <a
              href="mailto:ahannaleck1@gmail.com"
              className="inline-flex items-center gap-1.5 hover:text-white print:hover:text-neutral-600"
            >
              <IconMail /> ahannaleck1@gmail.com
            </a>
            <a
              href="https://www.linkedin.com/in/austin-hannaleck-0b4aa7b2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white print:hover:text-neutral-600"
            >
              <IconLinkedIn /> LinkedIn
            </a>
          </div>
        </div>

        {actions}
      </div>
    </header>
  );
}

export default ProfileHeader;
