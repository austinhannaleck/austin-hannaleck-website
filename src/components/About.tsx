type Hobby = {
  emoji: string;
  title: string;
  description: string;
  accent: string;
};

const HOBBIES: Hobby[] = [
  {
    emoji: "🐔",
    title: "Chickens",
    description: "I keep a large backyard flock — coop-building, feed runs, and a steady egg surplus.",
    accent: "from-amber-500 to-orange-500",
  },
  {
    emoji: "🐕",
    title: "Dogs",
    description: "Two dogs who make sure I actually go outside, rain or shine.",
    accent: "from-rose-500 to-pink-500",
  },
  {
    emoji: "🐝",
    title: "Beekeeping",
    description: "A few hives of honeybees — equal parts hobby and slow-motion science experiment.",
    accent: "from-yellow-500 to-amber-600",
  },
  {
    emoji: "🎮",
    title: "Video games",
    description: "When I'm not building things, there's a good chance I'm playing them instead.",
    accent: "from-violet-500 to-purple-600",
  },
];

function About() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          About
        </p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Beyond the code</h1>
        <p className="mt-2 text-lg text-neutral-500 dark:text-neutral-400">
          A few other things I spend my time on.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {HOBBIES.map((hobby) => (
          <div
            key={hobby.title}
            className="flex gap-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-2xl ${hobby.accent}`}
            >
              {hobby.emoji}
            </div>
            <div>
              <p className="font-medium">{hobby.title}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{hobby.description}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default About;
