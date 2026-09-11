# austin-hannaleck.com

My personal portfolio site: resume, project showcase, and a couple of from-scratch
browser toys. Built primarily as a vehicle to learn React and TypeScript deeply
(and to work with Claude Code as a collaborator), so it favors clear, idiomatic
code over cleverness. If you're a recruiter or engineer poking around the repo,
this doc is for you.

**Live pattern to look at first:** the [Signal](#signal-synth--drum-machine--bassline)
subsystem, a Web Audio synth/drum-machine/bassline sequencer with no audio
libraries. The app itself ships a "Technical details" page (open the Apps tab →
Signal → "Technical details") that walks through its architecture and the harder
design calls, aimed at exactly this audience.

## Stack

- **React 19 + TypeScript**, scaffolded from Vite's `react-ts` template.
- **Vite** for dev server and build, no framework beyond it. This is a
  deliberate choice, not an oversight: the site is a client-rendered SPA
  because nothing here currently needs SSR, SEO-heavy routing, or server
  data. A move to Next.js is a reasonable future step if that changes, not
  a default.
- **Tailwind CSS v4**, wired in via the `@tailwindcss/vite` plugin (no
  separate `tailwind.config.js`; see `vite.config.ts` and the single
  `@import "tailwindcss";` in `src/index.css`).
- **No routing library, no state management library, no audio/animation
  libraries.** Navigation is a handful of `useState` values in `App.tsx`;
  audio is the raw Web Audio API; animation is CSS transitions plus a couple
  of small custom hooks. The absence of dependencies here is intentional,
  see [Design principles](#design-principles).

```bash
pnpm install       # install dependencies
pnpm dev           # start dev server with HMR
pnpm build         # type-check (tsc -b) then production build to dist/
pnpm preview       # preview the production build locally
pnpm lint          # run ESLint over the project
```

There is no test runner configured yet.

## Top-level structure

```
src/
  main.tsx              # mounts <App /> into #root
  App.tsx                # tab state + view routing (home/resume/apps/about)
  components/
    Sidebar.tsx, Home.tsx, Resume.tsx, About.tsx, ProfileHeader.tsx
    NightSky.tsx, NightSkyBanner.tsx   # shared canvas/parallax visual effects
    Apps.tsx                           # project showcase grid
    apps/                              # one folder per showcased app
      GetTheBuggy.tsx, getTheBuggy/    # Snake-style game
      MakeTheBed.tsx, makeTheBed/      # a second small game
      HiveMind.tsx                     # placeholder ("coming soon")
    instruments/                       # Signal: synth + drum machine + bassline
      Synth.tsx, DrumMachine.tsx, Bassline.tsx
      StudioExample.tsx, StageMode.tsx, TechnicalDetails.tsx, Tutorial.tsx
      skins.ts
  hooks/
    useCardTilt.ts                     # shared cursor-tilt effect for cards
```

There's no `src/pages` or router. `App.tsx` holds a small `Tab` union
(`"home" | "resume" | "apps" | "about"`) in `useState` and conditionally
renders one section at a time. "Apps" has a second layer of state
(`activeApp`) for which showcased project is open, since each is a
self-contained view rather than a route.

## App.tsx: how navigation works

There's no client-side router: the site is small enough that a `Tab` union
type plus `useState` is the whole navigation model:

```ts
type Tab = "home" | "resume" | "apps" | "about";
const [tab, setTab] = useState<Tab>(...);
const [activeApp, setActiveApp] = useState<AppId | null>(...);
```

The one wrinkle: Signal supports shareable "jam" links (an entire session
encoded into a URL, see below), so on mount `App.tsx` checks
`location.search` for a `?jam=` param and, if present, defaults straight into
`tab: "apps"` with Signal already open. Otherwise a pasted link would land on
Home, where the component that reads `?jam=` isn't even mounted yet.

## Signal: synth + drum machine + bassline

The largest and most technically dense part of the site. Three instruments,
a mono/poly synth (`Synth.tsx`), a 16-step drum machine (`DrumMachine.tsx`),
and a TB-303-style acid bassline sequencer (`Bassline.tsx`), each built
directly on the Web Audio API, with `StudioExample.tsx` as a composition
layer that can run all three together with optional shared tempo, a shared
visual skin, combined session recording, and shareable jam links.

```
Synth · Drum Machine · Bassline   (each: own AudioContext, own scheduler)
                │
                ▼
     Studio (composition layer)
  shared tempo · shared skin · combined recording · jam links
                │
        ┌───────┴───────┐
        ▼               ▼
   your speakers   downloadable recording
```

A few architectural decisions worth calling out (the in-app "Technical
details" page, `TechnicalDetails.tsx`, covers these in more depth, with
the reasoning behind each):

- **No audio libraries.** No Tone.js, no sample playback: every sound is
  oscillators and filters wired into the Web Audio graph in real time.
- **Independent clocks, not a shared one.** Each instrument runs its own
  `setInterval`-driven scheduler against its own `AudioContext`. An optional
  `bpm`/`bpmLocked` prop pair (set from `StudioExample.tsx`) realigns all
  three the moment tempo changes, but there's no sample-accurate shared
  clock between changes, a deliberate scope cut, not an oversight.
- **State mirrored into refs for audio callbacks.** The functions that
  actually schedule notes (`triggerVoice`, `polyNoteOn`, etc.) are stable
  `useCallback`s that must not be recreated on every knob turn, recreating
  them would restart the scheduler effect and glitch playback. So live
  parameter values are copied into a `useRef` on every render, and the
  callback reads `.current` instead of closing over React state directly.
- **Effects are permanently wired; "off" is a gain of zero.** Delay, reverb,
  and chorus nodes are connected once and never torn down. Disabling one
  ramps its wet gain to 0 rather than disconnecting the node, which avoids
  audible clicks.
- **Mono and poly voices are intentionally asymmetric.** Mono reuses a
  persistent, live-updatable oscillator pool. Poly creates and tears down
  oscillators per note and is *not* live-updatable mid-hold: changing a
  poly-mode knob only affects the next note played, since making it live
  would mean fighting each note's own envelope.
- **The `SynthPatch` system covers sound only.** Saving, loading, or
  randomizing a patch touches waveform/envelope/filter/effects, never play
  mode, arpeggiator settings, sequencer pattern, or skin. Loading a preset
  is meant to change how a sound feels, not interrupt what you're doing.
- **A URL is the save file.** "Share this jam" serializes every
  instrument's pattern and knob state into base64 JSON in the URL's query
  string. There's no backend and no database: the link itself is the save.

See `.cursor/rules/synth-project.mdc` for the full, more granular set of
conventions (ref-mirroring specifics, the patch-versioning rules, etc.),
read it before making non-trivial changes in `src/components/instruments/`.

## Showcased apps (`src/components/apps/`)

Each app under `apps/` follows the same shape: a thin top-level component
(e.g. `GetTheBuggy.tsx`) composing a folder of pieces (e.g. `getTheBuggy/`)
that separates concerns the same way across both games:

- `use<Game>Game.ts`: a single hook owning all game state and the tick
  loop (`useSnakeGame.ts`, `useBedGame.ts`), independent of rendering.
- `types.ts`: shared domain types and tunable constants (grid size, timing,
  pickup effects) in one place.
- `sounds.ts`: small Web Audio-based sound effects, kept separate from the
  synth engine in `instruments/`.
- `*Storage.ts`: thin `localStorage` wrappers (leaderboard, best score)
  with defensive parsing of whatever's already in a user's browser.
- Small presentational components for individual visual pieces (`Bug.tsx`,
  `Carrot.tsx`, `Lily.tsx`, ...).

`HiveMind.tsx` is a placeholder for a not-yet-built app and intentionally
has no game logic behind it.

## Shared visual effects

`NightSky.tsx` and `NightSkyBanner.tsx` provide a parallax starfield used
as a page backdrop in a few places, and `hooks/useCardTilt.ts` gives project
cards a subtle cursor-following 3D tilt. Both fall back to no motion under
`prefers-reduced-motion`, and `useCardTilt` mutates the DOM node directly on
`mousemove` rather than going through React state, so the tilt doesn't cost
a re-render per pixel of cursor movement.

## Design principles

- **Idiomatic over clever.** This repo exists partly to learn React/TS
  well; patterns are chosen to be easy to explain and extend, not to show
  off.
- **Minimal dependencies, on purpose.** No router, no state management
  library, no audio or animation library. Each of those would be a
  reasonable choice in a larger app; here, avoiding them keeps the parts
  that matter (the audio engine, the game loops) fully visible and
  hand-written rather than hidden behind an abstraction.
- **No premature framework migration.** The Vite SPA shape is a fit for
  what the site does today. Next.js is the natural next step if a real
  need for SSR/SEO-heavy routing/server data shows up, not before.
