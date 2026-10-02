import type { SoundName } from "../engine/types";
import { audioGraph, whiteNoise } from "./context";
import { playFanfare } from "./music";

// Every sound effect, synthesized on the spot from oscillators and noise.

type Tone = {
  from: number;
  to?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  attack?: number;
};

function tone({ from, to = from, duration, type = "square", gain = 0.1, delay = 0, attack = 0.005 }: Tone): void {
  const g = audioGraph();
  if (!g) return;
  const { ctx } = g;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(env);
  env.connect(g.sfx);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

type Noise = {
  duration: number;
  gain?: number;
  filter?: BiquadFilterType;
  from?: number;
  to?: number;
  q?: number;
  delay?: number;
};

function noise({ duration, gain = 0.15, filter = "lowpass", from = 2000, to = from, q = 1, delay = 0 }: Noise): void {
  const g = audioGraph();
  if (!g) return;
  const { ctx } = g;
  const t = ctx.currentTime + delay;
  const source = ctx.createBufferSource();
  source.buffer = whiteNoise(ctx);
  const biquad = ctx.createBiquadFilter();
  biquad.type = filter;
  biquad.Q.value = q;
  biquad.frequency.setValueAtTime(from, t);
  if (to !== from) biquad.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(biquad);
  biquad.connect(env);
  env.connect(g.sfx);
  source.start(t, Math.random() * 0.5);
  source.stop(t + duration + 0.05);
}

function arpeggio(notes: number[], spacing: number, duration: number, type: OscillatorType, gain: number, delay = 0): void {
  notes.forEach((from, i) => tone({ from, duration, type, gain, delay: delay + i * spacing, attack: 0.01 }));
}

const SOUNDS: Record<SoundName, () => void> = {
  swing: () => {
    noise({ duration: 0.13, filter: "bandpass", from: 2600, to: 900, q: 1.4, gain: 0.2 });
    tone({ from: 620, to: 300, duration: 0.09, type: "triangle", gain: 0.05 });
  },
  spin: () => {
    noise({ duration: 0.38, filter: "bandpass", from: 700, to: 3200, q: 1.2, gain: 0.22 });
    tone({ from: 300, to: 950, duration: 0.3, type: "square", gain: 0.06 });
  },
  chargeReady: () => arpeggio([1046.5, 1568], 0.06, 0.1, "square", 0.07),
  hit: () => {
    tone({ from: 320, to: 110, duration: 0.09, type: "square", gain: 0.14 });
    noise({ duration: 0.06, from: 1800, gain: 0.16 });
  },
  clink: () => {
    tone({ from: 2300, to: 2150, duration: 0.14, type: "triangle", gain: 0.12 });
    tone({ from: 3400, duration: 0.08, type: "sine", gain: 0.06 });
  },
  enemyDie: () => {
    noise({ duration: 0.32, from: 3000, to: 250, gain: 0.2 });
    tone({ from: 520, to: 80, duration: 0.3, type: "triangle", gain: 0.12 });
  },
  heroHurt: () => {
    tone({ from: 520, to: 170, duration: 0.24, type: "sawtooth", gain: 0.12 });
    noise({ duration: 0.1, from: 1200, gain: 0.12 });
  },
  fall: () => tone({ from: 900, to: 90, duration: 0.65, type: "sine", gain: 0.16 }),
  bushCut: () => noise({ duration: 0.16, filter: "highpass", from: 3200, to: 1100, gain: 0.2 }),
  potBreak: () => {
    noise({ duration: 0.18, filter: "bandpass", from: 2400, to: 900, q: 1.5, gain: 0.24 });
    tone({ from: 1700, to: 900, duration: 0.07, type: "square", gain: 0.06 });
    tone({ from: 2300, to: 1500, duration: 0.06, type: "triangle", gain: 0.05, delay: 0.05 });
  },
  gem: () => arpeggio([1318.5, 1975.5], 0.06, 0.13, "square", 0.065),
  heart: () => arpeggio([784, 1046.5, 1318.5], 0.05, 0.14, "triangle", 0.12),
  itemGet: () => {
    arpeggio([392, 523.25, 659.25, 783.99], 0.1, 0.22, "square", 0.07);
    tone({ from: 1046.5, duration: 0.7, type: "square", gain: 0.07, delay: 0.4, attack: 0.02 });
    tone({ from: 130.8, duration: 1.0, type: "triangle", gain: 0.12, delay: 0.4 });
  },
  fanfare: playFanfare,
  doorUnlock: () => {
    tone({ from: 240, to: 170, duration: 0.1, type: "square", gain: 0.08 });
    noise({ duration: 0.3, from: 450, gain: 0.25, delay: 0.1 });
    tone({ from: 180, to: 80, duration: 0.3, type: "sine", gain: 0.2, delay: 0.1 });
  },
  shutterOpen: () => {
    noise({ duration: 0.5, from: 700, gain: 0.16 });
    tone({ from: 90, to: 150, duration: 0.45, type: "sawtooth", gain: 0.05 });
  },
  shutterClose: () => {
    noise({ duration: 0.28, from: 600, gain: 0.28 });
    tone({ from: 170, to: 55, duration: 0.25, type: "square", gain: 0.1 });
  },
  chestOpen: () => tone({ from: 260, to: 520, duration: 0.22, type: "triangle", gain: 0.1 }),
  chestAppear: () => arpeggio([1046.5, 1318.5, 1568, 2093], 0.06, 0.2, "sine", 0.09),
  stairs: () => arpeggio([784, 659.25, 523.25, 392], 0.08, 0.14, "triangle", 0.1),
  lowHealth: () => {
    tone({ from: 1480, duration: 0.07, type: "square", gain: 0.04 });
    tone({ from: 1480, duration: 0.07, type: "square", gain: 0.04, delay: 0.13 });
  },
  text: () => tone({ from: 820 + Math.random() * 120, duration: 0.025, type: "square", gain: 0.025 }),
  cast: () => {
    tone({ from: 380, to: 1300, duration: 0.18, type: "sine", gain: 0.1 });
    noise({ duration: 0.15, filter: "highpass", from: 5000, gain: 0.05 });
  },
  swap: () => {
    tone({ from: 1300, to: 260, duration: 0.18, type: "sine", gain: 0.1 });
    tone({ from: 260, to: 1300, duration: 0.18, type: "sine", gain: 0.1 });
    noise({ duration: 0.22, filter: "highpass", from: 4000, to: 7000, gain: 0.07 });
  },
  fizzle: () => {
    noise({ duration: 0.2, filter: "bandpass", from: 1300, gain: 0.1 });
    tone({ from: 600, to: 200, duration: 0.15, type: "square", gain: 0.04 });
  },
  switchToggle: () => {
    tone({ from: 880, duration: 0.08, type: "square", gain: 0.08 });
    tone({ from: 1320, duration: 0.12, type: "square", gain: 0.08, delay: 0.08 });
  },
  bars: () => {
    noise({ duration: 0.3, filter: "bandpass", from: 1500, gain: 0.12 });
    tone({ from: 300, to: 430, duration: 0.2, type: "square", gain: 0.04 });
  },
  spit: () => {
    tone({ from: 280, to: 820, duration: 0.07, type: "square", gain: 0.07 });
    noise({ duration: 0.06, from: 2500, gain: 0.08 });
  },
  bossRoar: () => {
    tone({ from: 130, to: 55, duration: 0.85, type: "sawtooth", gain: 0.16, attack: 0.05 });
    tone({ from: 137, to: 58, duration: 0.85, type: "sawtooth", gain: 0.1, attack: 0.05 });
    noise({ duration: 0.8, from: 500, to: 200, gain: 0.14 });
  },
  thud: () => {
    noise({ duration: 0.45, from: 320, gain: 0.4 });
    tone({ from: 95, to: 38, duration: 0.42, type: "sine", gain: 0.35 });
  },
  rockFall: () => {
    noise({ duration: 0.3, from: 900, to: 200, gain: 0.24 });
    tone({ from: 150, to: 60, duration: 0.25, type: "sine", gain: 0.2 });
  },
  bossDie: () => {
    for (let i = 0; i < 6; i++) noise({ duration: 0.3, from: 1200 - i * 150, to: 150, gain: 0.25, delay: i * 0.17 });
    tone({ from: 420, to: 40, duration: 1.6, type: "sawtooth", gain: 0.1 });
  },
  dying: () => arpeggio([784, 740, 698.5, 659.25, 622.25, 587.3, 554.4, 523.25], 0.085, 0.12, "square", 0.06),
  menu: () => tone({ from: 1250, duration: 0.03, type: "square", gain: 0.05 }),
  bark: () => {
    for (const delay of [0, 0.15]) {
      tone({ from: 650, to: 210, duration: 0.11, type: "square", gain: 0.18, delay, attack: 0.015 });
    }
  },
};

export function playSfx(name: SoundName): void {
  SOUNDS[name]();
}

export function playVictory(): void {
  arpeggio([523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5], 0.13, 0.25, "square", 0.07);
  tone({ from: 1318.5, duration: 1.2, type: "square", gain: 0.07, delay: 0.8, attack: 0.02 });
  tone({ from: 130.8, duration: 1.8, type: "triangle", gain: 0.14, delay: 0.8 });
}
