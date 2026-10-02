# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, Cursor, etc.) when working
with code in this repository.

## Project purpose

Austin's personal portfolio website. Built primarily as a vehicle to learn React and TypeScript
and to work with AI coding agents: favor clear, idiomatic code over cleverness, and prefer
approaches that are easy to explain.

The site is a Vite SPA on purpose, not an oversight: it may migrate to Next.js later if a use case
(SSR, SEO-heavy routing, blog with server data) demands it, but don't reach for Next-specific
patterns preemptively.

## Writing style

No em-dashes in user-facing text (README, in-app copy, commit messages meant for humans, etc.).
Use a comma, colon, period, or parentheses instead.

## Commands

```bash
pnpm install       # install dependencies
pnpm dev           # start dev server with HMR
pnpm build         # type-check (tsc -b) then production build to dist/
pnpm preview       # preview the production build locally
pnpm lint          # run ESLint over the project
pnpm test          # run the Vitest suite once
```

Vitest covers the codebase's pure logic: game-tick reducers, `localStorage`
sanitizers, and the Signal jam-link encode/decode round trip. It deliberately
does not cover rendering or the live Web Audio graph — nothing here spins up
an `AudioContext` or renders a component tree, both of which would need much
heavier test infrastructure for comparatively little payoff. Test files sit
next to the code they cover, named `*.test.ts`.

## Architecture

- Standard Vite + React + TypeScript SPA, scaffolded from the `react-ts` template.
- Entry point: `src/main.tsx` mounts `<App />` (from `src/App.tsx`) into `#root` in `index.html`.
- Styling is Tailwind CSS v4, wired in via the `@tailwindcss/vite` plugin in `vite.config.ts`.
  There is no separate `tailwind.config.js`; Tailwind is imported directly with
  `@import "tailwindcss";` in `src/index.css`.
- TypeScript project is split via project references: `tsconfig.json` references
  `tsconfig.app.json` (app source, `src/`) and `tsconfig.node.json` (Vite config itself).
- No routing library or state management library: navigation is a `Tab` union type held in
  `useState` in `src/App.tsx`. See `README.md` for the full breakdown of `src/`.

### Signal synth/drum-machine components

`.cursor/rules/synth-project.mdc` documents conventions for the Web Audio synthesizer + drum
machine + bassline components in `src/components/instruments/` (`Synth.tsx`, `DrumMachine.tsx`,
`Bassline.tsx`, `StudioExample.tsx`): raw Web Audio API, no audio libraries. Read that rules file
before touching them; it covers several non-obvious, intentional patterns that are easy to "fix"
by accident:

- **Ref-mirroring for audio callbacks**: state read inside stable `useCallback`s (e.g.
  `triggerVoice`, `polyNoteOn`) is mirrored into a `useRef` each render rather than read from React
  state directly, to avoid stale closures without retriggering scheduler effects.
- **Permanent audio graph, gain-based bypass**: effects are wired once and never
  disconnected/reconnected at runtime; "off" means ramping wet gain to 0, not tearing down nodes.
- **Mono vs. poly voice asymmetry is intentional**: mono uses a persistent, live-updatable
  oscillator pool; poly creates/tears down oscillators per note and is not live-updatable mid-hold.
  Keep new per-voice features consistent with this split.
- **The `SynthPatch` system**: covers sound-shaping params only (not play mode, arp, sequencer
  pattern, or skin). Adding a field means updating `SynthPatch`, `INIT_PATCH`, every entry in
  `FACTORY_PRESETS`, and both `applyPatch`/`capturePatch`. Bump `PRESET_STORAGE_KEY` only when
  changing existing preset *content*, not when just adding a new field (old localStorage data is
  backfilled automatically by `sanitizePatch`).
- **No sample-accurate sync**: Synth and DrumMachine each run independent schedulers and
  `AudioContext`s; the shared `bpm`/`bpmLocked` props only do periodic realignment, not lockstep.

### Thornwood (16-bit adventure game)

`src/components/apps/thornwood/` keeps the game's rules and its rendering strictly apart:

- **`engine/` must stay pure.** No DOM, canvas, or audio imports there. The engine advances in
  fixed 60Hz steps over a 2D tile model and reports side effects (sounds, autosave checkpoints,
  boss intros) as entries in `state.events`, which `useThornwood.ts` drains each frame. All
  randomness goes through `engine/rng.ts` (seeded, stored on the state) so tests are
  deterministic.
- **`render/` must stay logic-free.** It reads `GameState` and draws it; it never writes game
  state. The screen is 256x208 native pixels, scaled up by the page.
- **Pixel art is text** (`render/art/`, palette in `render/palette.ts`). Author sprites without
  outlines and with one transparent pixel of margin; `sprite()` adds the outline. Run `pnpm test`
  after editing: `art.test.ts` checks shapes, palette codes, margins, and that the bitmap font has
  every character the game displays.
- **Rooms are text grids** (`engine/rooms/`, legend in `engine/tiles.ts`). `world.test.ts` checks
  map shape, matching edges between neighbors, chest/sign/warp keys, and reachability.
- **Music** (`audio/music.ts`) is a melody plus one chord per bar; bass and arpeggios are generated
  from the chords. `music.test.ts` checks each melody fills exactly its bars.
- New gameplay rules get a test in `engine/engine.test.ts` that drives them with real inputs.
- `FOLLOWUP_IDEAS.md` in that folder lists intentionally deferred features.
