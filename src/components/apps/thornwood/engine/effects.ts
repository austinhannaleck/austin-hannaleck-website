import { random } from "./rng";
import type { GameState, SoundName } from "./types";

// Small helpers every engine module leans on: ids, sound events, and
// "juice" (particles, shake, hit-stop). They only record intent on the
// state; the hook and renderer turn that into audio and visuals.

export function nextId(state: GameState): number {
  return state.nextId++;
}

export function playSound(state: GameState, name: SoundName): void {
  state.events.push({ type: "sound", name });
}

export function addShake(state: GameState, frames: number): void {
  state.shake = Math.max(state.shake, frames);
}

export function addHitStop(state: GameState, frames: number): void {
  state.hitStop = Math.max(state.hitStop, frames);
}

type BurstOptions = {
  count: number;
  colors: number[];
  speed: number;
  life: number;
  size: number;
  // Initial upward pop and how hard it falls back down (0 floats).
  lift?: number;
  gravity?: number;
  z?: number;
};

const MAX_PARTICLES = 400;

export function spawnBurst(state: GameState, x: number, y: number, options: BurstOptions): void {
  const { count, colors, speed, life, size, lift = 1.5, gravity = 0.12, z = 4 } = options;
  for (let i = 0; i < count; i++) {
    const angle = random(state) * Math.PI * 2;
    const magnitude = speed * (0.4 + random(state) * 0.6);
    state.particles.push({
      x,
      y,
      z,
      vx: Math.cos(angle) * magnitude,
      vy: Math.sin(angle) * magnitude,
      vz: lift * (0.5 + random(state)),
      gravity,
      life: Math.round(life * (0.7 + random(state) * 0.6)),
      maxLife: life,
      color: colors[Math.floor(random(state) * colors.length)],
      size: size * (0.7 + random(state) * 0.6),
    });
  }
  // Oldest particles go first if a big fight gets busy.
  if (state.particles.length > MAX_PARTICLES) {
    state.particles.splice(0, state.particles.length - MAX_PARTICLES);
  }
}

export function updateParticles(state: GameState): void {
  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;
    p.vz -= p.gravity;
    if (p.z < 0) {
      p.z = 0;
      p.vz *= -0.35;
      p.vx *= 0.6;
      p.vy *= 0.6;
    }
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life--;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}
