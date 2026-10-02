# Thornwood: follow-up ideas

Things deliberately left out of the first version, roughly in the order they'd pay off. Not
commitments, just a list to pull from.

## Content

- **A second dungeon and tool.** The engine already supports any number of areas (`Area` in
  `engine/types.ts`, a new file under `engine/rooms/`). Tool candidates that would build on the
  existing mechanics:
  - *Gust Bellows*: pushes enemies, projectiles, and light objects; spins pinwheels to open
    doors; blows out (or relights) torches for a light-and-dark dungeon.
  - *Echo Bell*: rings out a shockwave that reveals hidden walkways and stuns armored enemies
    briefly; puzzles about where you stand when you ring it.
  - *Bubble Wand*: traps enemies in floating bubbles you can push across pits as stepping stones.
- **Lifting and throwing pots and rocks**, the most recognizable *A Link to the Past* verb. Needs a
  carry state on the hero and a thrown-object projectile.
- **Pushable blocks** for a classic sliding-block puzzle room.
- **More for gems to buy.** Haggleby's shop has one item; a bottle or a fairy-in-a-jar refill would
  give the wallet a reason to fill up.
- **More side quests**, now that Fernwhistle has four: Banjo's lost ball, Sir Fumbleton working up
  the nerve to leave his bush, a trading sequence between the two villages.
- **A quest log** on the pause screen. For now, Fernwhistle's notice board in the square is the
  closest thing.

## Presentation

- **A compass**, the classic dungeon item that marks the boss room (and unopened chests) on the
  map before you've found them.
- **Palette effects**: a dark room you light with a lantern, a lightning flash on the boss's phase
  change, water that palette-cycles instead of drawing glints.
- **A title-screen attract mode** that plays back a short scripted demo, the way cartridges did.

## Engine

- **Enemy-vs-enemy separation**, so packs of jellops don't stack on one tile.
- **Knockback that respects pits**, so a well-timed hit can knock an enemy off a ledge (the classic
  trick, and a natural Switcheroo combo).
