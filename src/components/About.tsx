import { useCardTilt } from "../hooks/useCardTilt";
import NightSkyBanner from "./NightSkyBanner";

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
    description: "I keep a large backyard flock. Coop-building, free-ranging, and a steady egg surplus.",
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
    description: "A few hives of honeybees. Equal parts hobby and slow-motion science experiment.",
    accent: "from-yellow-500 to-amber-600",
  },
  {
    emoji: "🎮",
    title: "Video games",
    description: "When I'm not building things, there's a good chance I'm playing them instead.",
    accent: "from-violet-500 to-purple-600",
  },
];

type HobbyCardProps = {
  hobby: Hobby;
};

function HobbyCard({ hobby }: HobbyCardProps) {
  const tilt = useCardTilt<HTMLDivElement>();

  return (
    <div
      ref={tilt}
      className="flex gap-4 rounded-xl border border-neutral-200 p-5 transition-transform duration-150 ease-out dark:border-neutral-800"
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
  );
}

function About() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
      <NightSkyBanner>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300 print:text-indigo-600">
          About
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-white print:text-neutral-900 sm:text-5xl">
          Beyond the code
        </h1>
        <p className="mt-2 text-lg text-neutral-300 print:text-neutral-600">
          A few other things I spend my time on.
        </p>
      </NightSkyBanner>

      <div className="grid gap-5 sm:grid-cols-2">
        {HOBBIES.map((hobby) => (
          <HobbyCard key={hobby.title} hobby={hobby} />
        ))}
      </div>
    </main>
  );
}

export default About;
