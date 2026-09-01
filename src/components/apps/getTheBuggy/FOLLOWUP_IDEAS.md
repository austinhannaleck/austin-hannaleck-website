# Get the Buggy — followup ideas

Things intentionally left out of v1, plus new ideas. Not commitments — just a list to pull from later.

- ~~Leaderboard~~ — done: top-10 local high scores in `localStorage` (`leaderboardStorage.ts`), shown as a ranked list (`Leaderboard.tsx`) with a "Best" score next to the live score, a "New best!" callout, and a name field the player fills in on game over.
- ~~Wrap-around edges~~ — tried, then reverted: walls end the run again (hitting one is a real "game over," not a non-event).
- Mobile/touch controls (on-screen D-pad or swipe gestures) — v1 is keyboard-only.
- ~~Sound effects (eat, game over)~~ — done, `sounds.ts`, raw Web Audio oscillator blips.
- Difficulty settings (grid size, starting speed) or obstacles/walls in the middle of the board.
- ~~Visual polish~~ — done: eat particle burst (`EatBurst.tsx`), smooth per-tick sliding/turning (CSS transitions keyed to the current tick speed), idle bug wobble + extra sprite detail.
- ~~Power-ups: Broccoli, Carrot, Mint, Magnet, Mushroom, Golden bug~~ — done: the board has one shared special-item slot (`pickup` in `GameState`) that spawns one of six kinds (`PICKUP_TYPES` in `types.ts`), each with its own sprite, sound, and (where relevant) Banjo glow:
  - **Broccoli** 🥦 — Mario-star invincibility + wall wrap-around, both for the full 15s (an earlier 2s wrap-cutoff buffer was tried, then removed). Rainbow hue-rotate glow.
  - **Carrot** 🥕 — fixed fast tick rate (`CARROT_TICK_MS`) for 8s regardless of score, ignoring the normal speedup curve. Orange pulse glow.
  - **Mint** 🌿 — inverse of carrot, widens the tick interval for 8s as a "breather." Green pulse glow.
  - **Magnet** 🧲 — biases the next several bug spawns toward Banjo's head (`randomEmptyCellNear`) for 10s instead of fully random. Indigo pulse glow.
  - **Mushroom** — instant effect, no timer: shrinks the tail by up to 3 segments (floored at the starting length of 3), no score change.
  - **Golden bug** — a bonus-value catch (`GOLDEN_BUG_BONUS_SCORE`, +4 vs. the normal +1) that despawns on its own timer if left uneaten.

  See `useSnakeGame.ts` (`nextState`'s pickup/activePowerup handling), `types.ts` (durations/constants), `sounds.ts` (per-type pickup fanfares + looping `playPowerupMusic(type)`), and the sprite files (`Broccoli.tsx`, `Carrot.tsx`, `Mint.tsx`, `Magnet.tsx`, `Mushroom.tsx`, `GoldenBug.tsx`).
