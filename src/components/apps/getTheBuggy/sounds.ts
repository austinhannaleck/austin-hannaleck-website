// Raw Web Audio sound effects — same no-libraries approach as Signal's
// instruments/*.tsx, just short envelope-shaped blips.

import type { PowerupType } from "./types";

let audioCtx: AudioContext | null = null;

function ensureAudioContext(): AudioContext {
  if (audioCtx) return audioCtx;
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  audioCtx = new AudioContextCtor();
  return audioCtx;
}

function playTone(freqStart: number, freqEnd: number, duration: number, type: OscillatorType, peakGain: number) {
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  const time = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, time);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, time + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peakGain, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

export function playEatSound() {
  playTone(520, 880, 0.12, "sine", 0.2);
}

export function playGameOverSound() {
  playTone(300, 90, 0.4, "sawtooth", 0.15);
}

// A single percussive "arf" — fast attack (unlike playTone's instant-on)
// so it thumps instead of just fading in, then a quick pitch-drop decay.
function playBarkPulse(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(650, time);
  osc.frequency.exponentialRampToValueAtTime(200, time + 0.09);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.25, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.13);
}

export function playBarkSound() {
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  const time = ctx.currentTime;
  playBarkPulse(ctx, time);
  playBarkPulse(ctx, time + 0.15);
}

type ArpeggioOptions = {
  notes: number[];
  noteSpacing: number;
  noteDuration: number;
  type: OscillatorType;
  peakGain: number;
};

function playArpeggio(ctx: AudioContext, time: number, { notes, noteSpacing, noteDuration, type, peakGain }: ArpeggioOptions) {
  notes.forEach((freq, i) => {
    const noteTime = time + i * noteSpacing;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, noteTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, noteTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, noteTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + noteDuration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(noteTime);
    osc.stop(noteTime + noteDuration + 0.02);
  });
}

const POWERUP_PICKUP_ARPEGGIOS: Record<PowerupType, Omit<ArpeggioOptions, "notes"> & { notes: number[] }> = {
  // Rising major triad + octave — classic "power up!" fanfare.
  broccoli: { notes: [523.25, 659.25, 783.99, 1046.5], noteSpacing: 0.08, noteDuration: 0.18, type: "square", peakGain: 0.18 },
  // Fast, buzzy, ascending — a "zoom" feel.
  carrot: { notes: [440, 554.37, 659.25, 880], noteSpacing: 0.045, noteDuration: 0.1, type: "sawtooth", peakGain: 0.15 },
  // Slow, soft, descending — settling down.
  mint: { notes: [659.25, 587.33, 523.25, 440], noteSpacing: 0.12, noteDuration: 0.3, type: "sine", peakGain: 0.14 },
  // Two low notes with no gap — a "clunk" of magnetic attraction.
  magnet: { notes: [196, 246.94], noteSpacing: 0.09, noteDuration: 0.22, type: "triangle", peakGain: 0.2 },
};

export function playPowerupPickupSound(type: PowerupType) {
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  playArpeggio(ctx, ctx.currentTime, POWERUP_PICKUP_ARPEGGIOS[type]);
}

// A flat, urgent "beep" — used three times (3, 2, 1) as broccoli's
// invincibility is about to wear off, since the glow alone is easy to
// miss once the board is scrolling by fast.
export function playCountdownBeepSound() {
  playTone(1000, 1000, 0.09, "square", 0.2);
}

// A quick descending "poof" — mushroom's tail-shrink.
export function playMushroomPickupSound() {
  playTone(500, 180, 0.22, "triangle", 0.18);
}

// A bright, coin-like double chime — golden bug's bonus points.
export function playGoldenBugPickupSound() {
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  playArpeggio(ctx, ctx.currentTime, {
    notes: [1318.51, 1760], // E6, A6
    noteSpacing: 0.07,
    noteDuration: 0.16,
    type: "square",
    peakGain: 0.16,
  });
}

// A single short blip at a random pitch from a powerup's scale, so
// successive blips in the loop never sound identical.
const POWERUP_LOOP_SCALES: Record<PowerupType, number[]> = {
  broccoli: [784, 880, 987.77, 1174.66, 1318.51, 1567.98], // G5 major pentatonic — twinkly
  carrot: [440, 523.25, 587.33, 659.25], // A4 minor-ish, punchy
  mint: [392, 493.88, 587.33, 698.46], // G4 major, soft and airy
  magnet: [174.61, 220, 261.63, 349.23], // low F3-ish hum
};
const POWERUP_LOOP_INTERVAL_MS: Record<PowerupType, number> = {
  broccoli: 180,
  carrot: 110,
  mint: 320,
  magnet: 240,
};
const POWERUP_LOOP_WAVE: Record<PowerupType, OscillatorType> = {
  broccoli: "sine",
  carrot: "sawtooth",
  mint: "sine",
  magnet: "triangle",
};

function playLoopBlip(ctx: AudioContext, time: number, type: PowerupType) {
  const scale = POWERUP_LOOP_SCALES[type];
  const freq = scale[Math.floor(Math.random() * scale.length)];
  const osc = ctx.createOscillator();
  osc.type = POWERUP_LOOP_WAVE[type];
  osc.frequency.setValueAtTime(freq, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.12, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.4);
}

// Loops a sparse melody, flavored per powerup type, for as long as it's
// active. Returns a `stop` function; the caller is responsible for
// invoking it when the powerup ends (or the game pauses/ends) — this
// module has no idea how long that should be, it just keeps looping
// until told to stop.
export function playPowerupMusic(type: PowerupType): () => void {
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  let stopped = false;
  const id = setInterval(() => {
    if (stopped) return;
    playLoopBlip(ctx, ctx.currentTime, type);
  }, POWERUP_LOOP_INTERVAL_MS[type]);

  return () => {
    stopped = true;
    clearInterval(id);
  };
}
