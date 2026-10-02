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
pnpm test          # run the Vitest suite once
```

Vitest covers the codebase's pure logic (game-tick reducers, `localStorage`
sanitizers, the Signal jam-link encode/decode round trip, Thornwood's whole
game engine and level data), colocated as `*.test.ts` next to the code it
covers. It doesn't cover rendering or the live Web Audio graph.

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
      Thornwood.tsx, thornwood/        # 16-bit-style top-down action adventure
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

`GetTheBuggy.tsx` (a Snake-style game) is a thin top-level component
composing a folder of pieces (`getTheBuggy/`) that separates concerns:

- `useSnakeGame.ts`: a single hook owning all game state and the tick
  loop, independent of rendering.
- `types.ts`: shared domain types and tunable constants (grid size, timing,
  pickup effects) in one place.
- `sounds.ts`: small Web Audio-based sound effects, kept separate from the
  synth engine in `instruments/`.
- `leaderboardStorage.ts`: a thin `localStorage` wrapper with defensive
  parsing of whatever's already in a user's browser.
- Small presentational components for individual visual pieces (`Bug.tsx`,
  `Carrot.tsx`, ...).

### Thornwood: a 16-bit top-down adventure

`Thornwood.tsx` is an action adventure in the spirit of *A Link to the
Past*, styled after the SNES and Genesis era: a village with a few odd
neighbors, an overworld to explore, and Bramblekeep, a dungeon built
around one tool. Bramblekeep's gate is locked, so getting in means finding
its retired keeper south of the village and then fetching his key from a
cave in the thicket. The dungeon's tool is the Switcheroo, which fires a bolt that swaps you with
whatever it hits. Its puzzles (crossing a chasm, weighing down a pressure
plate, flipping a crystal switch from across a pit) and its boss (an
armored beetle that's only vulnerable from behind, so you swap places to
get there) all hinge on it.

Puddlebrook's houses can be walked into: Nana's, with a bed you can nap
in to refill your hearts, a bookshelf of silly books, and pots to smash;
and Ribbit's shop, where you buy from behind the counter (and can ring
the service bell, to his annoyance).

Beating Thornback shakes the whole forest, and the jammed drawbridge over
the gorge in Eastfield comes crashing down. Across it is Fernwhistle, a
village cut off for months, with its own theme tune. It's one big room
(six screens' worth) that the camera scrolls around with you instead of
flipping screen to screen, with a windmill, a market square, a pier, a
duck pond, five houses to walk into, and four side quests: catching Mama
Mallard's runaway ducklings (they run), carrying the post to a mole and
back, a game of hide and seek, and diving for the Mayor's ring. The
ducklings earn you the Flippers: with them, deep water stops being a
wall, and diving makes you untouchable for a moment and can turn up sunken
treasure.

The pause screen is a classic subscreen: an item grid where you pick the
tool on the item button, a gear panel (which also shows whatever you're
carrying for somebody), and a map that fills in a screen at a time as you
explore.

There are no image or audio files. Every sprite is pixel art written as
text, every tile is painted procedurally, and the music is played by a
small Web Audio "sound chip":

```
thornwood/
  engine/      # the game's rules: pure TypeScript, no DOM, no canvas
    rooms/     # levels, authored as grids of tile characters, 16x11 a screen
  render/      # Canvas 2D: draws engine state at 256x208, like a SNES
    art/       # pixel art as text grids, plus procedural sprite painters
  audio/       # sound effects and a chiptune sequencer with seven themes
  ui/          # touch controls, and the menu and map models
  useThornwood.ts   # glue: game loop, input, audio, save/load
```

- **The engine is a classic 2D tile simulation**: room-local pixel
  coordinates, AABB collision, a fixed 60Hz step. Rooms sit on a grid of
  screens; most are one screen, a big one covers a block of them, and the
  camera follows the hero inside it. It never touches the
  DOM, which is what lets Vitest play the game headlessly. The tests swing
  swords at enemies, solve the dungeon's puzzles with real inputs, and
  beat the boss from behind. Randomness comes from a seeded PRNG stored on
  the game state, so a given seed and inputs always play out the same way.
- **Sprites are text.** Characters are drawn as rows of palette codes
  (`"..hsewssssewsH.."`), outlined automatically, and mirrored, rotated,
  or recolored for other facings and variants. Bigger shapes (the boss,
  trees, hearts) come from a few shaded-ellipse and line primitives that
  paint into the same format. `art.test.ts` catches ragged rows, unknown
  colors, and any character the game displays that the bitmap font lacks.
- **The renderer owns no game logic.** It draws a 256x208 frame (the
  SNES's native width) that the page scales up by whole pixels, so every
  pixel stays square. Static ground is painted once per room; characters
  and tall props are depth-sorted each frame. Stairs dissolve with a
  SNES-style mosaic, and dungeons get torchlight. The pause-screen map
  repaints each visited room in miniature from its own tile grid, so it
  can never drift from the real level; rooms you haven't entered stay
  fogged.
- **Songs are melodies over chords.** Each theme is a melody line plus one
  chord per bar; the bass and the fast chiptune arpeggios are generated
  from the chords. Voices mix pulse waves and an echo bus (SNES) with
  two-operator FM (Genesis). The music follows the action: the moment a
  trap room's shutters slam shut, or Captain Clank steps up, a menacing
  theme takes over until the last monster falls, and Thornback gets a boss
  theme of its own.
- **Levels are text, too.** Each room is a grid of characters (`T` tree,
  `b` bush, `v` pit, `L` locked door...). `world.test.ts` validates them:
  map shape, matching openings between neighboring rooms, and every chest
  and room reachable from the start (counting Switcheroo swaps).
- **React stays out of the hot path.** The game lives in a ref and runs on
  `requestAnimationFrame`. The HUD, dialog box, and menus are drawn inside
  the canvas, so React only hears about which menu is up (for the touch
  controls and a screen-reader mirror of the menu).

`HiveMind.tsx` is a placeholder for a not-yet-built app and intentionally
has no game logic behind it.

A second game, Make the Bed, previously lived here starring Austin's dog
Lily; it's been removed rather than kept around unpublished.

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
