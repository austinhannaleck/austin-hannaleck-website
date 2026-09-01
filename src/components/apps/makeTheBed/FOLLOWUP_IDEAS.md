# Make the Bed — followup ideas

Things intentionally left out of v1, plus new ideas. Not commitments — just a list to pull from later.

- Named leaderboard like Get the Buggy's (`leaderboardStorage.ts` + `Leaderboard.tsx`) — v1 only persists a single best score (`bestScoreStorage.ts`), no name entry or ranked list.
- Mobile/touch controls (on-screen left/right buttons or swipe) — v1 is keyboard-only.
- A second falling bed at higher scores, or beds that fall at a slant, for extra difficulty ramp beyond the current tick-speed-only curve.
- Visual polish: a catch particle burst (like `EatBurst.tsx`), camera shake or a "thud" flash on a miss, Lily reacting (happy bounce on catch, sad ears on miss).
- Wonkier stacking — right now a caught bed always lands cleanly on the column it fell in; leaning/toppling if catches drift too far from the tower's center could raise the skill ceiling.
- Difficulty settings (board width, starting speed) or a "endless vs. sprint to N beds" mode.
- Sound variety — currently one catch blip and one miss/game-over tone; could vary pitch with stack height, or add a Lily bark on start (mirroring Banjo's `playBarkSound`).
