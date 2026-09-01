const REPO_URL = "https://github.com/austinhannaleck/austin-hannaleck-website";

type Card = {
  emoji: string;
  accent: string;
  heading: string;
  body: string;
};

const STATS: { value: string; label: string }[] = [
  { value: "0", label: "audio libraries used" },
  { value: "3", label: "instruments, each playable alone" },
  { value: "16", label: "steps per pattern" },
  { value: "live", label: "every sound, synthesized in real time" },
];

const ARCHITECTURE_NOTES: Card[] = [
  {
    emoji: "🔊",
    accent: "from-sky-500 to-cyan-500",
    heading: "No audio libraries, just the Web Audio API",
    body: "Every sound (synth, drum machine, bassline) comes from oscillators and filters wired straight into the browser's audio graph. No Tone.js, no sample packs. If a knob changes the sound, it's because a real-time parameter moved, not because a different clip got swapped in.",
  },
  {
    emoji: "⏱️",
    accent: "from-amber-500 to-orange-500",
    heading: "Synced tempo, not a shared clock",
    body: "Each instrument keeps time on its own setInterval loop against its own audio clock. Locking the tempo realigns all three to beat one the moment it changes, but between changes they can drift apart by a few milliseconds. Fine for jamming along, not tight enough for mastering. A true shared clock is the natural next step, just not one I've needed yet.",
  },
];

const DECISIONS: Card[] = [
  {
    emoji: "🪞",
    accent: "from-sky-500 to-cyan-500",
    heading: "Mirroring state into refs so playback doesn't stutter",
    body: "The scheduler that fires each note can't be recreated every time a knob moves, or the pattern would glitch and reset to step one. So every live knob value also gets copied into a ref on each render, and the scheduler reads from the ref. You get the current value without ever rebuilding the thing that's keeping time.",
  },
  {
    emoji: "🎛️",
    accent: "from-emerald-500 to-lime-500",
    heading: "Effects stay wired in, they just go quiet",
    body: "Delay, reverb, and chorus get connected once and never disconnected. Turning one off just fades its volume to zero instead of tearing out a node. It's a small trick, but it's what keeps flipping an effect on and off from producing a click or pop in the output.",
  },
  {
    emoji: "🎭",
    accent: "from-violet-500 to-purple-600",
    heading: "Mono and poly voices behave differently on purpose",
    body: "In mono mode, one persistent set of oscillators gets reused for every note, so turning a knob changes whatever's currently playing. Poly mode builds and tears down oscillators per note, so a change only applies to the next note you play. Making poly live-updatable too would mean fighting each note's own envelope, so the asymmetry stays.",
  },
  {
    emoji: "🗂️",
    accent: "from-amber-500 to-orange-500",
    heading: "A saved patch is only the sound, never the performance",
    body: "Saving or randomizing a patch touches waveform, filter, envelope, and effects, nothing about which play mode you're in, your arp settings, or your sequence. Loading a preset should change how a sound feels, not yank the ground out from under whatever you were doing on the keyboard.",
  },
  {
    emoji: "🔥",
    accent: "from-rose-500 to-pink-500",
    heading: "Tuning the bassline for warmth instead of squeal",
    body: "The bass sequencer is a TB-303 style mono voice: one resonant filter with its own decay envelope per step, plus accent and slide. On top of that, a second, slightly detuned oscillator and a gentle saturation stage add the kind of analog thickness a single clean oscillator just doesn't have. It's a small addition that noticeably changes the character.",
  },
  {
    emoji: "🔗",
    accent: "from-indigo-500 to-purple-500",
    heading: "A URL that works as a save file",
    body: "Hit 'share this jam' and every instrument's pattern and knob position gets packed into a URL as base64 JSON, then copied to your clipboard. Open that link later and it decodes right back into the same session. No database, no server, the link just is the save.",
  },
  {
    emoji: "🎙️",
    accent: "from-yellow-500 to-amber-600",
    heading: "Recording three instruments that don't share a clock",
    body: "Each instrument taps its own output into a permanent recording stream. Hitting 'record session' spins up a separate AudioContext whose only job is mixing those three streams into one, which is what actually gets captured. It's plumbing between graphs, nothing about how the instruments keep time changes.",
  },
  {
    emoji: "🎨",
    accent: "from-orange-500 to-amber-500",
    heading: "Themes are just CSS variables",
    body: "Switching the look (basic, synthwave, vintage) swaps a handful of CSS custom properties on each panel. No theming library, no separate stylesheet per skin, just a palette object and one function that applies it.",
  },
];

const FEATURES: Card[] = [
  {
    emoji: "🎹",
    accent: "from-orange-500 to-amber-500",
    heading: "Mono synth",
    body: "Waveform picker, unison and detune, a filter with its own envelope, a full ADSR amp envelope, glide, chorus, delay, reverb, an LFO you can route to filter, pitch, or amp, three play modes (Keys, Arp, Seq), and a bank of savable, randomizable patches.",
  },
  {
    emoji: "🥁",
    accent: "from-rose-500 to-pink-500",
    heading: "Drum machine",
    body: "16 steps across kick, snare, closed hat, open hat, and clap, with swing and a live-drumming mode: tap a number key or click a row label to fire that sound right away, whether or not the sequencer is running.",
  },
  {
    emoji: "🎸",
    accent: "from-emerald-500 to-lime-500",
    heading: "Acid bassline",
    body: "16-step mono sequencer with per-step accent and slide, a resonant filter envelope for the classic squelch, a sub oscillator for weight, and the detune and saturation tweaks above for a rounder default tone.",
  },
  {
    emoji: "🎚️",
    accent: "from-indigo-500 to-purple-500",
    heading: "Studio mode",
    body: "Runs all three instruments together, with optional shared tempo (including tap tempo), one shared skin, combined session recording you can download, and shareable jam links.",
  },
  {
    emoji: "🧭",
    accent: "from-sky-500 to-cyan-500",
    heading: "Built-in tutorials",
    body: "Each instrument has a short walkthrough that highlights the real controls in place, instead of pointing to a separate help page that goes stale the moment the layout changes.",
  },
  {
    emoji: "⌨️",
    accent: "from-violet-500 to-purple-600",
    heading: "Accessible custom controls",
    body: "The rotary knobs aren't just decorative SVGs. They're operable from the keyboard, support arrow keys and mouse-wheel input, and expose proper ARIA slider roles.",
  },
];

function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <div key={card.heading} className="flex gap-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-2xl ${card.accent}`}
          >
            {card.emoji}
          </div>
          <div>
            <p className="font-medium">{card.heading}</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{card.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlowArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-neutral-300 dark:text-neutral-700">
      <path d="M12 4v14" />
      <path d="m6 13 6 6 6-6" />
    </svg>
  );
}

function ArchitectureDiagram() {
  const instruments = [
    { emoji: "🎹", name: "Synth", caption: "mono/poly voice, its own AudioContext" },
    { emoji: "🥁", name: "Drum Machine", caption: "16-step sequencer, its own AudioContext" },
    { emoji: "🎸", name: "Bassline", caption: "TB-303 style voice, its own AudioContext" },
  ];
  return (
    <div className="mb-10 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-neutral-900/20">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
        {instruments.map((box) => (
          <div key={box.name} className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-2xl">
              {box.emoji}
            </div>
            <p className="text-sm font-medium">{box.name}</p>
            <p className="max-w-[10rem] text-xs text-neutral-500 dark:text-neutral-400">{box.caption}</p>
          </div>
        ))}
      </div>

      <div className="my-4 flex justify-center">
        <FlowArrow />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-600 to-neutral-800 text-2xl dark:from-neutral-500 dark:to-neutral-700">
          🎚️
        </div>
        <p className="text-sm font-medium">Studio (composition layer)</p>
        <p className="max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
          Optional shared tempo, one shared skin, combined recording, shareable jam links
        </p>
      </div>

      <div className="my-4 flex justify-center">
        <FlowArrow />
      </div>

      <div className="flex justify-center gap-10">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-2xl">🔊</span>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Your speakers</p>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-2xl">💾</span>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Downloadable recording</p>
        </div>
      </div>
    </div>
  );
}

interface TechnicalDetailsProps {
  onBack: () => void;
}

export default function TechnicalDetails({ onBack }: TechnicalDetailsProps) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          Signal · Technical Details
        </p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">How this was built</h1>
        <p className="mt-2 max-w-2xl text-lg text-neutral-500 dark:text-neutral-400">
          I built this from scratch with React, TypeScript, and the raw Web Audio API. No audio
          libraries, no samples, nothing playing back a recording. Here's how it fits together, a
          few of the harder calls I made along the way, and everything it can do.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-neutral-800 dark:text-neutral-100 dark:hover:border-indigo-800 dark:hover:text-indigo-400"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.21.66.79.55A10.98 10.98 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
            </svg>
            View public repo
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            ← Back to Signal
          </button>
        </div>
      </header>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-neutral-200 px-4 py-5 text-center dark:border-neutral-800"
          >
            <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">{stat.value}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-10">
        <section>
          <h2 className="mb-4 text-xl font-semibold">Architecture</h2>
          <ArchitectureDiagram />
          <CardGrid cards={ARCHITECTURE_NOTES} />
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Design decisions worth flagging</h2>
          <CardGrid cards={DECISIONS} />
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Features</h2>
          <CardGrid cards={FEATURES} />
        </section>
      </div>
    </main>
  );
}
