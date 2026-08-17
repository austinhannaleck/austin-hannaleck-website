# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

Austin's personal portfolio website. Built primarily as a vehicle to learn React and TypeScript
and to work with Claude Code — favor clear, idiomatic code over cleverness, and prefer approaches
that are easy to explain.

The site is a Vite SPA on purpose, not an oversight: it may migrate to Next.js later if a use case
(SSR, SEO-heavy routing, blog with server data) demands it, but don't reach for Next-specific
patterns preemptively.

## Commands

```bash
pnpm install       # install dependencies
pnpm dev           # start dev server with HMR
pnpm build         # type-check (tsc -b) then production build to dist/
pnpm preview       # preview the production build locally
pnpm lint          # run ESLint over the project
```

There is no test runner configured yet.

## Architecture

- Standard Vite + React + TypeScript SPA, scaffolded from the `react-ts` template.
- Entry point: `src/main.tsx` mounts `<App />` (from `src/App.tsx`) into `#root` in `index.html`.
- Styling is Tailwind CSS v4, wired in via the `@tailwindcss/vite` plugin in `vite.config.ts` —
  there is no separate `tailwind.config.js`; Tailwind is imported directly with
  `@import "tailwindcss";` in `src/index.css`.
- TypeScript project is split via project references: `tsconfig.json` references
  `tsconfig.app.json` (app source, `src/`) and `tsconfig.node.json` (Vite config itself).

### Signal synth/drum-machine components

`.cursor/rules/synth-project.mdc` documents conventions for a Web Audio synthesizer + drum machine
built as standalone components (`Synth.tsx`, `DrumMachine.tsx`, `StudioExample.tsx`) — raw Web
Audio API, no audio libraries. These components are planned but not yet added to `src/`. Once they
exist, read that rules file before touching them — it covers several non-obvious, intentional
patterns that are easy to "fix" by accident:

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
