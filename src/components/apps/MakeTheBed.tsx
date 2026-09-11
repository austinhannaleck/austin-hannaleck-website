// Standing in for the real game (implemented in ./makeTheBed/, still
// intact) since commit 449cfd2 pulled its Apps.tsx card and swapped this in
// instead — deliberately unpublished, not unfinished. Unreachable from the
// UI (no APPS entry links to it), kept only so the "makethebed" AppId/route
// in App.tsx still renders something sane if it's ever reached directly.
function MakeTheBed() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        Make the Bed
      </p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Not published yet</h1>
      <p className="mt-3 max-w-md text-neutral-500 dark:text-neutral-400">
        This one's taking a break for now — check back soon.
      </p>
    </main>
  );
}

export default MakeTheBed;
