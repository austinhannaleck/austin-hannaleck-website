// A tiny seeded PRNG (mulberry32) whose state lives on the GameState, so
// every roll in the simulation is reproducible from the seed. Tests rely on
// that: the same seed and the same inputs always play out the same way.

export function random(state: { rng: number }): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Inclusive on both ends.
export function randomInt(state: { rng: number }, min: number, max: number): number {
  return min + Math.floor(random(state) * (max - min + 1));
}

export function randomPick<T>(state: { rng: number }, items: readonly T[]): T {
  return items[Math.floor(random(state) * items.length)];
}
