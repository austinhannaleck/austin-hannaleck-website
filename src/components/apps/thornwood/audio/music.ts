import type { MusicTrack } from "../engine/world";
import { MUSIC_LEVEL, audioGraph, whiteNoise } from "./context";

// A little 16-bit-style sound chip and seven original themes.
//
// Each song is written as a melody (one token per eighth note: a note like
// "F#5", "-" to hold, "." to rest) over a chord per bar. The bass line and
// the fast chiptune arpeggios are generated from the chords, so harmony
// stays right by construction and a whole theme fits on a screen. Voices
// borrow from both consoles: narrow pulse waves with vibrato and an echo
// bus (very SNES), and two-operator FM for brassy leads and slap bass
// (very Genesis).
//
// Scheduling is the classic Web Audio lookahead pattern: a timer wakes
// every 25ms and books any notes due in the next 120ms against the audio
// clock, so timing never depends on the JS timer's jitter.

export type TrackName = MusicTrack | "title";

type Voice =
  | { kind: "pulse"; duty: number; gain: number; release: number; vibrato?: number; cutoff?: number }
  | { kind: "fm"; ratio: number; index: number; decay: number; gain: number; release: number; vibrato?: number }
  | { kind: "triangle"; gain: number; release: number };

type BassStyle = "pump" | "rootFifth" | "drive" | "arp" | "grind";

type Song = {
  bpm: number;
  // Delays every off-beat eighth by this fraction of a step (0 = straight).
  swing?: number;
  chords: string;
  melody: string;
  bass: BassStyle;
  // Eight characters per bar, repeated: k kick, s snare, h hat, x kick+hat.
  drums: string;
  lead: Voice;
  bassVoice: Voice;
  arp: Voice | null;
  // Echo send for the lead and arpeggios.
  echo: number;
};

const SONGS: Record<TrackName, Song> = {
  // A sunset, a long road, a hero: big and hopeful, in C.
  title: {
    bpm: 112,
    chords: "C G Am F C G F G Am F C G Am F G G",
    melody: `
      G4 - C5 - E5 - G5 - | F5 - E5 D5 B4 - G4 - | A4 - C5 - E5 - A5 - | G5 - F5 - E5 - C5 - |
      E5 - - G5 C6 - - B5 | A5 - G5 - D5 - - . | F5 - A5 - C6 - A5 F5 | G5 - - - - - . . |
      E5 - - A5 G5 - E5 - | F5 - - C5 F5 - A5 - | G5 - - E5 C5 - E5 G5 | D6 - - - B5 - G5 - |
      C6 - B5 A5 E5 - A5 - | A5 - G5 F5 C5 - F5 - | G5 - F5 - D5 - B4 - | G5 - - - D5 - B4 - |`,
    bass: "pump",
    drums: "k.hks.h.",
    lead: { kind: "fm", ratio: 1, index: 2.4, decay: 0.35, gain: 0.16, release: 0.12, vibrato: 1 },
    bassVoice: { kind: "triangle", gain: 0.3, release: 0.05 },
    arp: { kind: "pulse", duty: 0.125, gain: 0.035, release: 0.03 },
    echo: 0.3,
  },
  // Puddlebrook: a cozy, bouncy village tune in F, with a swing.
  village: {
    bpm: 100,
    swing: 0.32,
    chords: "F A# F C F A# C F Dm A# F C Dm A# C C",
    melody: `
      A4 . C5 . F5 - E5 F5 | D5 - - . A#4 - C5 D5 | C5 - A4 . F4 - A4 C5 | G4 - - - . . E4 F4 |
      A4 . C5 . F5 - G5 A5 | A#5 - A5 G5 F5 - D5 - | E5 - D5 C5 A#4 - G4 - | F4 - - - . . C5 . |
      D5 - - F5 A5 - F5 D5 | D5 - C5 A#4 F4 - A#4 D5 | C5 - - A4 F5 - C5 A4 | G4 - A4 A#4 C5 - . . |
      F5 - E5 D5 A5 - F5 - | G5 - F5 D5 A#4 - D5 - | E5 - - G5 - - E5 C5 | C5 - - - G4 - - . |`,
    bass: "rootFifth",
    drums: "k.h.s.h.",
    lead: { kind: "pulse", duty: 0.25, gain: 0.07, release: 0.1, vibrato: 1 },
    bassVoice: { kind: "triangle", gain: 0.3, release: 0.08 },
    arp: { kind: "pulse", duty: 0.125, gain: 0.025, release: 0.03 },
    echo: 0.2,
  },
  // Fernwhistle: a market-day oom-pah in G, all reedy squeezebox lead
  // and bouncing bass, for a town that's finally got visitors again.
  town: {
    bpm: 126,
    swing: 0.18,
    chords: "G C G D Em C D G C G Am D Em C D G",
    melody: `
      G4 . B4 D5 G5 - D5 B4 | C5 - E5 - G5 - E5 C5 | B4 - D5 B4 G4 - B4 D5 | A4 - - - D5 - . . |
      E5 - G5 E5 B4 - E5 G5 | G5 - E5 C5 E5 - G5 - | F#5 - E5 D5 A4 - F#4 - | G4 - - - . . D5 . |
      E5 - E5 - G5 - E5 - | D5 - D5 - B4 - G4 - | C5 - E5 - A5 - G5 E5 | F#5 - - - D5 - . . |
      G5 - F#5 - E5 - B4 - | C5 - E5 - G5 - C6 - | A5 - F#5 - D5 - F#5 - | G5 - - - D5 - B4 - |`,
    bass: "pump",
    drums: "k.s.k.sh",
    lead: { kind: "fm", ratio: 2, index: 1.3, decay: 0.4, gain: 0.12, release: 0.08, vibrato: 1 },
    bassVoice: { kind: "triangle", gain: 0.28, release: 0.05 },
    arp: { kind: "pulse", duty: 0.25, gain: 0.022, release: 0.03 },
    echo: 0.22,
  },
  // Out in the fields: brisk and adventurous, in D.
  overworld: {
    bpm: 132,
    chords: "D A Bm G D A G A Bm G D A Bm G Em A",
    melody: `
      D5 - - A4 D5 - F#5 A5 | E5 - - - . C#5 E5 A5 | F#5 - - D5 B4 - D5 F#5 | G5 - F#5 E5 D5 - B4 - |
      A4 - D5 - F#5 - A5 - | C#6 - B5 A5 E5 - A5 - | B5 - A5 G5 D5 - G5 B5 | A5 - - - - - . . |
      B5 - - F#5 D5 - F#5 B5 | A5 - G5 - D5 - B4 - | A5 - - F#5 D5 - A4 D5 | E5 - - - C#5 - A4 - |
      D5 - F#5 - B5 - A5 F#5 | G5 - B5 - D6 - B5 G5 | E5 - G5 - B5 - G5 E5 | A5 - - - C#5 - E5 - |`,
    bass: "pump",
    drums: "khshkhsh",
    lead: { kind: "pulse", duty: 0.5, gain: 0.06, release: 0.08, vibrato: 1, cutoff: 3200 },
    bassVoice: { kind: "fm", ratio: 1, index: 1.6, decay: 0.12, gain: 0.2, release: 0.05 },
    arp: { kind: "pulse", duty: 0.125, gain: 0.028, release: 0.03 },
    echo: 0.25,
  },
  // Bramblekeep: slow, echoing bells over a rolling bass, in D minor.
  dungeon: {
    bpm: 96,
    chords: "Dm Dm A# A Dm Dm Gm A A# C Am Dm A# Gm A A",
    melody: `
      D5 - - - A4 - - . | F5 - E5 - D5 - A4 - | D5 - - - F5 - - . | E5 - - C#5 A4 - - . |
      D5 - F5 - A5 - - . | G5 - F5 E5 F5 - D5 - | A#4 - D5 - G5 - F5 E5 | E5 - - - - - . . |
      F5 - - D5 A#4 - D5 F5 | G5 - - E5 C5 - E5 G5 | A5 - G5 - E5 - C5 - | D5 - - - - - . . |
      A#5 - A5 - F5 - D5 - | G5 - F5 - D5 - A#4 - | A4 - C#5 - E5 - G5 - | A5 - - - G5 - E5 C#5 |`,
    bass: "arp",
    drums: "k..h..h.",
    lead: { kind: "fm", ratio: 3.5, index: 1.8, decay: 0.6, gain: 0.13, release: 0.4 },
    bassVoice: { kind: "triangle", gain: 0.24, release: 0.12 },
    arp: null,
    echo: 0.45,
  },
  // Trapped: shutters down, monsters closing in, or Captain Clank. A low,
  // lurking line in C minor over a bass grinding on the half step above
  // the root, with the Neapolitan and a tritone or two for menace.
  danger: {
    bpm: 132,
    chords: "Cm Cm C# Cm Cm Cm G# G Fm Fm Cm Cm G# F#dim G G",
    melody: `
      C4 . C4 . D#4 - C4 . | G4 - F#4 - G4 . . . | G#4 - F4 - C#4 - . . | D#4 - D4 - C4 - B3 - |
      C5 . C5 . D#5 - C5 . | G5 - F#5 - G5 . . . | G#5 - G5 - D#5 - C5 - | D5 - - - B4 - G4 - |
      F5 - G#5 - C6 - G#5 - | G5 - F5 - D#5 - C#5 - | C5 - D#5 - G5 - F#5 - | G5 - - - . . . . |
      G#5 - G5 - G#5 - C6 - | A5 - F#5 - D#5 - C5 - | B4 - D5 - G5 - F5 - | D5 - B4 - G4 - B4 - |`,
    bass: "grind",
    drums: "k..ks.h.",
    lead: { kind: "fm", ratio: 1, index: 3.6, decay: 0.14, gain: 0.12, release: 0.06 },
    bassVoice: { kind: "fm", ratio: 1, index: 2.2, decay: 0.1, gain: 0.24, release: 0.04 },
    arp: { kind: "pulse", duty: 0.125, gain: 0.02, release: 0.02 },
    echo: 0.32,
  },
  // Boss fights: fast and driving, in E minor.
  boss: {
    bpm: 160,
    chords: "Em Em C D Em Em C B Am Em C D Am Em F#dim B",
    melody: `
      E5 - B4 - E5 - F#5 G5 | F#5 - E5 - D#5 - B4 - | C5 - E5 - G5 - E5 G5 | A5 - - - F#5 - D5 - |
      E5 - G5 - B5 - G5 B5 | E6 - D6 - B5 - G5 - | C6 - B5 - G5 - E5 - | D#5 - F#5 - B5 - - - |
      A5 - - E5 A5 - C6 - | B5 - - G5 E5 - G5 - | C6 - B5 - A5 - G5 - | F#5 - - D5 A5 - - - |
      A5 - B5 - C6 - E6 - | D6 - - B5 G5 - E5 - | F#5 - A5 - C6 - A5 - | B5 - - - D#5 - F#5 - |`,
    bass: "drive",
    drums: "xhsxxhsh",
    lead: { kind: "fm", ratio: 1, index: 3.2, decay: 0.2, gain: 0.13, release: 0.06, vibrato: 1 },
    bassVoice: { kind: "fm", ratio: 1, index: 2.8, decay: 0.08, gain: 0.22, release: 0.04 },
    arp: { kind: "pulse", duty: 0.125, gain: 0.03, release: 0.02 },
    echo: 0.15,
  },
};

// ---------------------------------------------------------------------------
// Notation
// ---------------------------------------------------------------------------
const NOTE_INDEX: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };

function midiOf(note: string): number {
  const match = /^([A-G]#?)(\d)$/.exec(note);
  if (!match) throw new Error(`Bad note "${note}"`);
  return NOTE_INDEX[match[1]] + (Number(match[2]) + 1) * 12;
}

function frequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

type NoteEvent = { step: number; midi: number; steps: number };

// Exported for tests: melody text to timed note events.
export function parseLine(line: string): { events: NoteEvent[]; length: number } {
  const tokens = line.replace(/\|/g, " ").split(/\s+/).filter(Boolean);
  const events: NoteEvent[] = [];
  tokens.forEach((token, step) => {
    if (token === "-") {
      const last = events[events.length - 1];
      if (last && last.step + last.steps === step) last.steps++;
    } else if (token !== ".") {
      events.push({ step, midi: midiOf(token), steps: 1 });
    }
  });
  return { events, length: tokens.length };
}

const CHORD_SHAPES: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  dim: [0, 3, 6],
};

// Exported for tests: "F#dim" to its root (in octave 3) and chord tones.
export function parseChord(name: string): { root: number; tones: number[] } {
  const match = /^([A-G]#?)(m7|m|7|dim)?$/.exec(name);
  if (!match) throw new Error(`Bad chord "${name}"`);
  const root = NOTE_INDEX[match[1]] + 48;
  return { root, tones: CHORD_SHAPES[match[2] ?? ""].map((t) => root + t) };
}

export function songShape(name: TrackName): { bars: number; melodySteps: number } {
  const song = SONGS[name];
  return { bars: song.chords.split(/\s+/).filter(Boolean).length, melodySteps: parseLine(song.melody).length };
}

export const TRACK_NAMES = Object.keys(SONGS) as TrackName[];

// The bass part for one bar: eight eighth-note MIDI notes (null = rest).
function bassBar(style: BassStyle, root: number, tones: number[]): (number | null)[] {
  const low = root - 12;
  const fifth = tones[2] - 12;
  switch (style) {
    case "pump":
      return [low, low + 12, low, low + 12, low, low + 12, fifth, low + 12];
    case "rootFifth":
      return [low, null, fifth, null, low, null, fifth, low + 12];
    case "drive":
      return [low, low, low + 12, low, low, low, tones[1] - 12, low];
    case "arp":
      return [low, fifth, low + 12, fifth + 12, low + 12, fifth, low, fifth];
    // Grinding back and forth on the half step above the root.
    case "grind":
      return [low, low, low + 1, low, low + 12, low, low + 1, low];
  }
}

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------
const pulseWaves = new WeakMap<AudioContext, Map<number, PeriodicWave>>();

// A pulse wave of the given duty cycle, built from its Fourier series. The
// narrow ones (12.5%, 25%) are the reedy, nasal sound of 8- and 16-bit
// sound chips.
function pulseWave(ctx: AudioContext, duty: number): PeriodicWave {
  let byDuty = pulseWaves.get(ctx);
  if (!byDuty) {
    byDuty = new Map();
    pulseWaves.set(ctx, byDuty);
  }
  let wave = byDuty.get(duty);
  if (!wave) {
    const harmonics = 48;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    for (let n = 1; n < harmonics; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    wave = ctx.createPeriodicWave(real, imag);
    byDuty.set(duty, wave);
  }
  return wave;
}

function playNote(ctx: AudioContext, out: AudioNode, voice: Voice, midi: number, start: number, duration: number): void {
  const freq = frequency(midi);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(voice.gain, start + 0.01);
  env.gain.setValueAtTime(voice.gain * 0.75, start + Math.max(0.02, duration * 0.6));
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration + voice.release);
  const stop = start + duration + voice.release + 0.05;

  const carrier = ctx.createOscillator();
  carrier.frequency.setValueAtTime(freq, start);
  if (voice.kind === "pulse") carrier.setPeriodicWave(pulseWave(ctx, voice.duty));
  else carrier.type = voice.kind === "triangle" ? "triangle" : "sine";

  if (voice.kind === "fm") {
    const modulator = ctx.createOscillator();
    modulator.frequency.setValueAtTime(freq * voice.ratio, start);
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(freq * voice.index, start);
    depth.gain.exponentialRampToValueAtTime(Math.max(1, freq * voice.index * 0.15), start + voice.decay);
    modulator.connect(depth);
    depth.connect(carrier.frequency);
    modulator.start(start);
    modulator.stop(stop);
  }

  // A delayed vibrato on held notes.
  if (voice.kind !== "triangle" && voice.vibrato && duration > 0.2) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const amount = ctx.createGain();
    amount.gain.setValueAtTime(0, start);
    amount.gain.linearRampToValueAtTime(freq * 0.007 * voice.vibrato, start + Math.min(duration, 0.35));
    lfo.connect(amount);
    amount.connect(carrier.frequency);
    lfo.start(start);
    lfo.stop(stop);
  }

  let node: AudioNode = carrier;
  if (voice.kind === "pulse" && voice.cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = voice.cutoff;
    carrier.connect(filter);
    node = filter;
  }
  node.connect(env);
  env.connect(out);
  carrier.start(start);
  carrier.stop(stop);
}

function playDrum(ctx: AudioContext, out: AudioNode, kind: string, start: number): void {
  if (kind === "k" || kind === "x") {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, start);
    osc.frequency.exponentialRampToValueAtTime(42, start + 0.12);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.32, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.connect(env);
    env.connect(out);
    osc.start(start);
    osc.stop(start + 0.2);
  }
  if (kind === "s" || kind === "h" || kind === "x") {
    const snare = kind === "s";
    const source = ctx.createBufferSource();
    source.buffer = whiteNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = snare ? "bandpass" : "highpass";
    filter.frequency.value = snare ? 1900 : 7500;
    const env = ctx.createGain();
    const length = snare ? 0.13 : 0.035;
    env.gain.setValueAtTime(snare ? 0.18 : 0.05, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter);
    filter.connect(env);
    env.connect(out);
    source.start(start, Math.random() * 0.5);
    source.stop(start + length + 0.02);
    if (snare) {
      const body = ctx.createOscillator();
      body.frequency.setValueAtTime(220, start);
      body.frequency.exponentialRampToValueAtTime(140, start + 0.06);
      const bodyEnv = ctx.createGain();
      bodyEnv.gain.setValueAtTime(0.08, start);
      bodyEnv.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
      body.connect(bodyEnv);
      bodyEnv.connect(out);
      body.start(start);
      body.stop(start + 0.1);
    }
  }
}

// ---------------------------------------------------------------------------
// The treasure fanfare
// ---------------------------------------------------------------------------

// Each entry: [note, start in seconds, length in seconds].
type Score = [string, number, number][];

const FANFARE = {
  // Three pickup notes, then a stepwise climb to a long, ringing high C.
  lead: [
    ["G4", 0, 0.09],
    ["G4", 0.11, 0.09],
    ["G4", 0.22, 0.09],
    ["C5", 0.33, 0.38],
    ["B4", 0.75, 0.11],
    ["C5", 0.87, 0.11],
    ["D5", 0.99, 0.11],
    ["F5", 1.11, 0.38],
    ["E5", 1.53, 0.11],
    ["F5", 1.65, 0.11],
    ["G5", 1.77, 0.11],
    ["C6", 1.9, 1.3],
  ] as Score,
  harmony: [
    ["E4", 0.33, 0.38],
    ["G4", 0.33, 0.38],
    ["A4", 1.11, 0.38],
    ["C5", 1.11, 0.38],
    ["E5", 1.9, 1.3],
    ["G5", 1.9, 1.3],
  ] as Score,
  bass: [
    ["C3", 0.33, 0.38],
    ["F2", 1.11, 0.38],
    ["G2", 1.53, 0.33],
    ["C3", 1.9, 1.3],
    ["C2", 1.9, 1.3],
  ] as Score,
  // A twinkle up the chord as the last note rings.
  sparkle: [
    ["C6", 2.05, 0.08],
    ["E6", 2.13, 0.08],
    ["G6", 2.21, 0.08],
    ["C7", 2.29, 0.3],
  ] as Score,
};

const BRASS: Voice = { kind: "fm", ratio: 1, index: 2.2, decay: 0.3, gain: 0.15, release: 0.15, vibrato: 1 };
const HORNS: Voice = { kind: "pulse", duty: 0.5, gain: 0.04, release: 0.2, cutoff: 2400 };
const TUBA: Voice = { kind: "triangle", gain: 0.3, release: 0.2 };
const BELL: Voice = { kind: "pulse", duty: 0.125, gain: 0.05, release: 0.25 };

function noiseHit(ctx: AudioContext, out: AudioNode, start: number, length: number, gain: number, highpass: number): void {
  const source = ctx.createBufferSource();
  source.buffer = whiteNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = highpass;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, start);
  env.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(filter);
  filter.connect(env);
  env.connect(out);
  source.start(start, Math.random() * 0.3);
  source.stop(start + length + 0.02);
}

// A short, ceremonial fanfare for the treasure in a big chest. The
// background theme ducks out of the way while it plays, then comes back.
export function playFanfare(): void {
  const g = audioGraph();
  if (!g) return;
  const { ctx } = g;
  const t0 = ctx.currentTime + 0.05;
  const out = ctx.createGain();
  out.connect(g.sfx);

  const play = (score: Score, voice: Voice) => {
    for (const [note, at, length] of score) playNote(ctx, out, voice, midiOf(note), t0 + at, length);
  };
  play(FANFARE.lead, BRASS);
  play(FANFARE.harmony, HORNS);
  play(FANFARE.bass, TUBA);
  play(FANFARE.sparkle, BELL);

  // A snare roll building into a cymbal crash on the high C.
  for (let i = 0; i < 9; i++) noiseHit(ctx, out, t0 + 1.53 + i * 0.04, 0.05, 0.04 + i * 0.012, 1800);
  noiseHit(ctx, out, t0 + 1.9, 1.4, 0.14, 5000);

  g.music.gain.cancelScheduledValues(ctx.currentTime);
  g.music.gain.setTargetAtTime(MUSIC_LEVEL * 0.15, ctx.currentTime, 0.05);
  g.music.gain.setTargetAtTime(MUSIC_LEVEL, t0 + 3.1, 0.35);
  window.setTimeout(() => out.disconnect(), 4500);
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------
type Playing = { name: TrackName; out: GainNode; timer: number };

let playing: Playing | null = null;

function startSong(name: TrackName): Playing | null {
  const g = audioGraph();
  if (!g) return null;
  const { ctx } = g;
  const song = SONGS[name];
  const melody = parseLine(song.melody);
  const chords = song.chords.split(/\s+/).filter(Boolean).map(parseChord);
  const loopSteps = chords.length * 8;
  const step = 60 / song.bpm / 2;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, ctx.currentTime);
  out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.5);
  out.connect(g.music);

  // The echo: a feedback delay, darkened a little on each repeat, that the
  // lead and arpeggios send into.
  const echoIn = ctx.createGain();
  echoIn.gain.value = song.echo;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = step * 1.5;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2600;
  echoIn.connect(delay);
  delay.connect(tone);
  tone.connect(feedback);
  feedback.connect(delay);
  tone.connect(out);

  const lead = ctx.createGain();
  lead.connect(out);
  lead.connect(echoIn);

  let index = 0;
  let next = ctx.currentTime + 0.08;
  const tick = () => {
    while (next < ctx.currentTime + 0.12) {
      const s = index % loopSteps;
      const bar = Math.floor(s / 8);
      const beat = s % 8;
      const swing = beat % 2 === 1 ? (song.swing ?? 0) * step : 0;
      const t = next + swing;
      const chord = chords[bar];

      for (const note of melody.events) {
        if (note.step === s) playNote(ctx, lead, song.lead, note.midi, t, note.steps * step * 0.9);
      }
      const bassNote = bassBar(song.bass, chord.root, chord.tones)[beat];
      if (bassNote !== null) playNote(ctx, out, song.bassVoice, bassNote, t, step * 0.8);
      if (song.arp) {
        // Chiptune chords: the chord's tones rattled off as fast notes.
        for (let k = 0; k < 4; k++) {
          const arpTone = chord.tones[(beat * 4 + k) % chord.tones.length] + 12;
          playNote(ctx, lead, song.arp, arpTone, t + (k * step) / 4, step / 4);
        }
      }
      const drum = song.drums[beat % song.drums.length];
      if (drum !== ".") playDrum(ctx, out, drum, t);
      index++;
      next += step;
    }
  };
  tick();
  return { name, out, timer: window.setInterval(tick, 25) };
}

function stopSong(track: Playing): void {
  window.clearInterval(track.timer);
  const g = audioGraph();
  if (!g) return;
  const now = g.ctx.currentTime;
  track.out.gain.cancelScheduledValues(now);
  track.out.gain.setValueAtTime(Math.max(0.0001, track.out.gain.value), now);
  track.out.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  window.setTimeout(() => track.out.disconnect(), 700);
}

// Switches to a theme (crossfading), or to silence with null. Asking for
// what's already playing is a no-op, so this is safe to call every frame.
export function playMusic(name: TrackName | null): void {
  if (playing?.name === name) return;
  if (playing) stopSong(playing);
  playing = name ? startSong(name) : null;
}
