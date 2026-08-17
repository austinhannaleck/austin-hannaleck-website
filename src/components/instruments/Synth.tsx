import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type WheelEvent as ReactWheelEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { SKIN_PALETTES, skinToCssVars, type SkinName, type SkinPalette } from "./skins";

/**
 * Synth — a small hardware-styled synthesizer with a mono/poly switch,
 * an arpeggiator, an 8-step sequencer, and three visual skins.
 *
 * Drop this into any React + TypeScript project (Next.js, Vite, CRA).
 * No external audio or styling library required — built entirely on
 * the native Web Audio API, with scoped CSS injected via a <style> tag.
 *
 * Skins (palettes defined in ./skins.ts, shared with DrumMachine.tsx and
 * Bassline.tsx so all three can be palette-synced — see StudioExample.tsx):
 *  - basic     — the original dark hardware panel.
 *  - synthwave — purple-to-sunset gradient panel, magenta/cyan accents.
 *  - vintage   — cream/walnut Moog Grandmother-inspired panel.
 * Every color in the stylesheet is a CSS custom property, so a skin is
 * just a palette object swapped onto the root element's inline style. This
 * component takes `skin` as a plain prop only — it has no selector of its
 * own; StudioExample.tsx's top bar is the one place skin is chosen when
 * composed with the other instruments. A standalone consumer just passes
 * whichever skin it wants (or omits it for "basic").
 *
 * Play modes:
 *  - Keys: manual play, in either voice mode:
 *      Mono — true note-stack, last-note priority, glide, legato.
 *      Poly — independent voices per note, each with its own filter
 *             and envelope, so chords ring out properly.
 *  - Arp: hold a chord on the keys; steps through it (up/down/up-down/
 *    random) across 1-3 octaves, synced to BPM. Always single-voice.
 *  - Seq: an 8-step pattern on its own clock. Click a step to set its
 *    note or turn it off. Always single-voice.
 *
 * Play with the mouse/touch, or your computer keyboard:
 *   White keys: A S D F G H J K   ->  C  D  E  F  G  A  B  C
 *   Black keys: W E   T Y U       ->  C# D#   F# G# A#
 *
 * Worthwhile follow-ups (not yet done):
 *  - Separate factory presets from user-saved ones (e.g. a `source:
 *    "factory" | "user"` flag, or two arrays). Right now factory and
 *    user patches share one flat array under one storage key, so
 *    updating factory *content* (not just adding a field — sanitizePatch
 *    already handles that gracefully) requires bumping the storage
 *    version, which resets everyone's custom saves too. A real
 *    separation would let factory content evolve independently.
 *  - Stereo width / panning — the whole signal path is mono internally;
 *    spreading unison voices left/right would add real stereo dimension.
 *  - Filter type switch (highpass/bandpass alongside the current lowpass).
 *  - A noise layer mixed under the tone for analog "breath" texture.
 *  - MIDI input support via the Web MIDI API, for a real controller.
 *  - A "randomize" button to generate exploratory starting patches.
 */

type WaveType = OscillatorType;
type PlayMode = "keys" | "arp" | "seq";
type VoiceMode = "mono" | "poly";
type ArpPattern = "up" | "down" | "updown" | "random";
type Rate = "1/4" | "1/8" | "1/16";
type LfoTarget = "off" | "filter" | "pitch" | "amp";
type FilterType = "lowpass" | "highpass" | "bandpass";

interface KeyDef {
  note: string;
  freq: number;
  computerKey: string;
  isSharp: boolean;
}

interface SeqStep {
  note: string | null;
}

interface PolyVoice {
  oscs: OscillatorNode[];
  gain: GainNode;
  filter: BiquadFilterNode;
  filterAlt: BiquadFilterNode;
  filterLPGain: GainNode;
  filterAltGain: GainNode;
  subOsc: OscillatorNode;
  subGain: GainNode;
  noiseSource: AudioBufferSourceNode;
  noiseGain: GainNode;
}

const SEMITONES_FROM_A4: Record<string, number> = {
  C4: -9, "C#4": -8, D4: -7, "D#4": -6, E4: -5, F4: -4, "F#4": -3,
  G4: -2, "G#4": -1, A4: 0, "A#4": 1, B4: 2, C5: 3,
};

const noteToFreq = (semitones: number) => 440 * Math.pow(2, semitones / 12);

const COMPUTER_KEY_MAP: Record<string, string> = {
  a: "C4", w: "C#4", s: "D4", e: "D#4", d: "E4", f: "F4", t: "F#4",
  g: "G4", y: "G#4", h: "A4", u: "A#4", j: "B4", k: "C5",
};

const NOTE_ORDER = [
  "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5",
];

const KEYS: KeyDef[] = NOTE_ORDER.map((note) => ({
  note,
  freq: noteToFreq(SEMITONES_FROM_A4[note]),
  computerKey: Object.entries(COMPUTER_KEY_MAP).find(([, n]) => n === note)?.[0] ?? "",
  isSharp: note.includes("#"),
}));

const noteFreq = (note: string) => KEYS.find((k) => k.note === note)?.freq ?? 440;

const WAVES: { type: WaveType; label: string }[] = [
  { type: "sine", label: "sine" },
  { type: "triangle", label: "tri" },
  { type: "sawtooth", label: "saw" },
  { type: "square", label: "square" },
];

const RATE_MULTIPLIER: Record<Rate, number> = { "1/4": 1, "1/8": 0.5, "1/16": 0.25 };

// Valid values for performance-state fields restored from a shared jam link
// (see StudioExample.tsx's "share this jam" feature) — the link's payload
// is just base64 JSON a visitor could hand-edit, so loadState() checks
// against these rather than trusting it outright.
const PLAY_MODES: PlayMode[] = ["keys", "arp", "seq"];
const ARP_PATTERNS: ArpPattern[] = ["up", "down", "updown", "random"];
const RATES: Rate[] = ["1/4", "1/8", "1/16"];

const MAX_UNISON = 7;
const FILTER_LFO_MAX_HZ = 4000;
const PITCH_LFO_MAX_CENTS = 100;
const CHORUS_VOICE_COUNT = 2;
const CHORUS_BASE_DELAY_SEC = 0.015;
const CHORUS_MAX_DEPTH_SEC = 0.008;
const CHORUS_VOICE_RATE_SPREAD = 1.3; // second chorus LFO runs slightly faster, so the two drift in and out of phase instead of staying locked

const DEFAULT_SEQ: SeqStep[] = [
  { note: "C4" }, { note: null }, { note: "E4" }, { note: null },
  { note: "G4" }, { note: null }, { note: "E4" }, { note: null },
];

// --- Patches -----------------------------------------------------------
// A "patch" captures the sound-shaping parameters (oscillator, filter,
// envelopes, voice mode, effects) — not performance state like play
// mode, arp settings, or the sequencer pattern, since loading a patch
// shouldn't clobber what you're playing, just how it sounds.

interface SynthPatch {
  waveform: WaveType;
  voiceMode: VoiceMode;
  octaveShift: number;
  unisonCount: number;
  detuneAmount: number;
  subLevel: number;
  noiseLevel: number;
  filterType: FilterType;
  filterBlend: number;
  cutoff: number;
  resonance: number;
  filterEnvAmount: number;
  filterEnvDecay: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  glide: number;
  legato: boolean;
  volume: number;
  delayOn: boolean;
  delayTime: number;
  delayFeedback: number;
  delayMix: number;
  reverbOn: boolean;
  reverbSize: number;
  reverbMix: number;
  chorusOn: boolean;
  chorusRate: number;
  chorusDepth: number;
  chorusMix: number;
  lfoTarget: LfoTarget;
  lfoRate: number;
  lfoDepth: number;
}

interface PresetSlot {
  name: string;
  patch: SynthPatch;
}

const PRESET_STORAGE_KEY = "signal-synth-presets-v5";
const PRESET_SLOT_COUNT = 10;

// Backfills any missing fields with INIT_PATCH defaults. Guards against
// stale localStorage data saved before a field (like octaveShift) was
// added — without this, a missing field becomes `undefined`, which
// silently turns into NaN in pitch math and kills the audio entirely.
function sanitizePatch(patch: Partial<SynthPatch> | undefined | null): SynthPatch {
  return { ...INIT_PATCH, ...(patch ?? {}) };
}

function sanitizePresets(raw: unknown): (PresetSlot | null)[] | null {
  if (!Array.isArray(raw) || raw.length !== PRESET_SLOT_COUNT) return null;
  return raw.map((slot) => {
    if (!slot || typeof slot !== "object" || !("patch" in slot)) return null;
    const s = slot as { name?: unknown; patch?: Partial<SynthPatch> };
    return { name: typeof s.name === "string" && s.name ? s.name : "Patch", patch: sanitizePatch(s.patch) };
  });
}

// --- Randomizer ---------------------------------------------------------
// Deliberately biased ranges rather than sampling full parameter extremes —
// e.g. resonance capped well below self-oscillation, LFO/detune kept
// moderate — so mashing the button gives usable starting points instead
// of mostly-harsh noise. Categorical picks (filter type, LFO target) are
// weighted toward the "safer" / more common choice too.
const randRange = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.round(randRange(min, max));
const randChoice = <T,>(options: T[]): T => options[Math.floor(Math.random() * options.length)];
const weightedChoice = <T,>(weighted: [T, number][]): T => {
  const total = weighted.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [value, weight] of weighted) {
    r -= weight;
    if (r <= 0) return value;
  }
  return weighted[weighted.length - 1][0];
};

function randomizePatch(): SynthPatch {
  const filterType = weightedChoice<FilterType>([
    ["lowpass", 3],
    ["highpass", 1],
    ["bandpass", 1],
  ]);
  const lfoTarget = weightedChoice<LfoTarget>([
    ["off", 3],
    ["filter", 1],
    ["pitch", 1],
    ["amp", 1],
  ]);
  return {
    waveform: randChoice(WAVES.map((w) => w.type)),
    voiceMode: randChoice<VoiceMode>(["mono", "poly"]),
    octaveShift: randInt(-1, 1),
    unisonCount: randInt(1, 5),
    detuneAmount: randRange(0, 25),
    subLevel: randRange(0, 0.35),
    noiseLevel: randRange(0, 0.12),
    filterType,
    filterBlend: randRange(0.2, 0.8),
    cutoff: randRange(500, 7000),
    resonance: randRange(0, 10),
    filterEnvAmount: randRange(-1500, 4500),
    filterEnvDecay: randRange(0.05, 1),
    attack: randRange(0.005, 0.9),
    decay: randRange(0.05, 0.9),
    sustain: randRange(0.2, 0.9),
    release: randRange(0.05, 1.3),
    glide: randRange(0, 0.15),
    legato: Math.random() < 0.5,
    volume: randRange(0.45, 0.7),
    delayOn: Math.random() < 0.5,
    delayTime: randRange(0.06, 0.55),
    delayFeedback: randRange(0, 0.5),
    delayMix: randRange(0.1, 0.45),
    reverbOn: Math.random() < 0.5,
    reverbSize: randRange(0.5, 4),
    reverbMix: randRange(0.1, 0.55),
    chorusOn: Math.random() < 0.4,
    chorusRate: randRange(0.15, 1.3),
    chorusDepth: randRange(0.1, 0.7),
    chorusMix: randRange(0.1, 0.45),
    lfoTarget,
    lfoRate: randRange(0.1, 5),
    lfoDepth: randRange(0.1, 0.55),
  };
}
// -----------------------------------------------------------------------

const INIT_PATCH: SynthPatch = {
  waveform: "sawtooth", voiceMode: "mono", octaveShift: 0, unisonCount: 1, detuneAmount: 0, subLevel: 0, noiseLevel: 0,
  filterType: "lowpass", filterBlend: 0.5, cutoff: 4200, resonance: 3,
  filterEnvAmount: 1800, filterEnvDecay: 0.2, attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3,
  glide: 0.03, legato: true, volume: 0.6,
  delayOn: false, delayTime: 0.32, delayFeedback: 0.3, delayMix: 0.25,
  reverbOn: false, reverbSize: 1.5, reverbMix: 0.25,
  chorusOn: false, chorusRate: 0.6, chorusDepth: 0.5, chorusMix: 0.35,
  lfoTarget: "off", lfoRate: 4, lfoDepth: 0.4,
};

const FACTORY_PRESETS: (PresetSlot | null)[] = [
  { name: "Init", patch: INIT_PATCH },
  {
    name: "Warm Pad",
    patch: {
      waveform: "triangle", voiceMode: "poly", octaveShift: 0, unisonCount: 4, detuneAmount: 12, subLevel: 0.15, noiseLevel: 0.03,
      filterType: "lowpass", filterBlend: 0.5, cutoff: 2600, resonance: 2,
      filterEnvAmount: 800, filterEnvDecay: 0.6, attack: 1.2, decay: 0.8, sustain: 0.85, release: 1.6,
      glide: 0, legato: true, volume: 0.5,
      delayOn: true, delayTime: 0.45, delayFeedback: 0.25, delayMix: 0.2,
      reverbOn: true, reverbSize: 4.5, reverbMix: 0.55,
      chorusOn: true, chorusRate: 0.5, chorusDepth: 0.4, chorusMix: 0.25,
      lfoTarget: "filter", lfoRate: 0.3, lfoDepth: 0.3,
    },
  },
  {
    name: "Deep Bass",
    patch: {
      waveform: "square", voiceMode: "mono", octaveShift: -1, unisonCount: 2, detuneAmount: 6, subLevel: 0.5, noiseLevel: 0,
      filterType: "lowpass", filterBlend: 0.5, cutoff: 900, resonance: 6,
      filterEnvAmount: 2600, filterEnvDecay: 0.15, attack: 0.005, decay: 0.1, sustain: 0.6, release: 0.18,
      glide: 0.05, legato: false, volume: 0.7,
      delayOn: false, delayTime: 0.25, delayFeedback: 0.2, delayMix: 0.15,
      reverbOn: false, reverbSize: 1, reverbMix: 0.15,
      chorusOn: false, chorusRate: 0.6, chorusDepth: 0.5, chorusMix: 0.35,
      lfoTarget: "off", lfoRate: 4, lfoDepth: 0.4,
    },
  },
  {
    name: "Pluck Arp",
    patch: {
      waveform: "sawtooth", voiceMode: "mono", octaveShift: 0, unisonCount: 1, detuneAmount: 0, subLevel: 0, noiseLevel: 0,
      filterType: "lowpass", filterBlend: 0.5, cutoff: 3600, resonance: 8,
      filterEnvAmount: 4200, filterEnvDecay: 0.12, attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.12,
      glide: 0.02, legato: false, volume: 0.55,
      delayOn: true, delayTime: 0.18, delayFeedback: 0.4, delayMix: 0.3,
      reverbOn: true, reverbSize: 1.8, reverbMix: 0.2,
      chorusOn: false, chorusRate: 0.6, chorusDepth: 0.5, chorusMix: 0.35,
      lfoTarget: "off", lfoRate: 4, lfoDepth: 0.4,
    },
  },
  {
    name: "Ambient Drift",
    patch: {
      waveform: "sine", voiceMode: "poly", octaveShift: 0, unisonCount: 5, detuneAmount: 18, subLevel: 0.1, noiseLevel: 0.06,
      filterType: "lowpass", filterBlend: 0.5, cutoff: 1800, resonance: 1,
      filterEnvAmount: 400, filterEnvDecay: 1.2, attack: 1.8, decay: 1.5, sustain: 0.9, release: 2,
      glide: 0, legato: true, volume: 0.45,
      delayOn: true, delayTime: 0.6, delayFeedback: 0.55, delayMix: 0.35,
      reverbOn: true, reverbSize: 6, reverbMix: 0.7,
      chorusOn: true, chorusRate: 0.25, chorusDepth: 0.5, chorusMix: 0.3,
      lfoTarget: "pitch", lfoRate: 0.15, lfoDepth: 0.15,
    },
  },
  null,
  null,
  null,
  null,
  null,
];
// -----------------------------------------------------------------------

// Algorithmically generated reverb impulse response — decaying stereo
// noise, no external audio file needed. `duration` roughly controls
// perceived room/plate size.
function makeImpulseResponse(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    }
  }
  return impulse;
}

// Flat white noise, generated once and shared (via loop=true) by every
// voice that wants a noise layer — 2 seconds is long enough that the loop
// point produces no audible periodicity/pitch of its own.
function makeNoiseBuffer(ctx: AudioContext, seconds: number = 2): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// --- Rotary knob -----------------------------------------------------
// A compact drag/scroll/keyboard-adjustable dial, styled to look like
// hardware. Sweeps 270° (-135° to +135°, straight up = center).

const KNOB_MIN_ANGLE = -135;
const KNOB_MAX_ANGLE = 135;

function valueToAngle(value: number, min: number, max: number) {
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return KNOB_MIN_ANGLE + t * (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE);
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  if (endAngle - startAngle < 0.5) return "";
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** If set, the value arc fills from this value's angle instead of from min — for bipolar params like filter env amount. */
  bipolarZero?: number;
  size?: number;
  ariaLabel: string;
  disabled?: boolean;
}

function Knob({ value, min, max, step = 0, onChange, bipolarZero, size = 46, ariaLabel, disabled = false }: KnobProps) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);

  const clampStep = useCallback(
    (v: number) => {
      const clamped = Math.min(max, Math.max(min, v));
      return step > 0 ? Math.round(clamped / step) * step : clamped;
    },
    [min, max, step],
  );

  const handlePointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startValue: value };
  };
  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const deltaY = dragRef.current.startY - e.clientY;
    const next = dragRef.current.startValue + (deltaY / 140) * (max - min);
    onChange(clampStep(next));
  };
  const endDrag = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };
  const handleWheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = (e.deltaY < 0 ? 1 : -1) * (step > 0 ? step : (max - min) / 100);
    onChange(clampStep(value + delta));
  };
  const handleKeyDown = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    const delta = step > 0 ? step : (max - min) / 100;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      onChange(clampStep(value + delta));
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(clampStep(value - delta));
    }
  };

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const angle = valueToAngle(value, min, max);
  const zeroAngle = bipolarZero !== undefined ? valueToAngle(bipolarZero, min, max) : KNOB_MIN_ANGLE;
  const arcStart = Math.min(zeroAngle, angle);
  const arcEnd = Math.max(zeroAngle, angle);
  const pointer = polarToCartesian(cx, cy, r - 3, angle);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`synth-knob-svg${disabled ? " disabled" : ""}`}
      tabIndex={disabled ? -1 : 0}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
    >
      <path d={describeArc(cx, cy, r, KNOB_MIN_ANGLE, KNOB_MAX_ANGLE)} className="synth-knob-track" fill="none" />
      {describeArc(cx, cy, r, arcStart, arcEnd) && (
        <path d={describeArc(cx, cy, r, arcStart, arcEnd)} className="synth-knob-fill" fill="none" />
      )}
      <circle cx={cx} cy={cy} r={r - 10} className="synth-knob-cap" />
      <line x1={cx} y1={cy} x2={pointer.x} y2={pointer.y} className="synth-knob-pointer" />
    </svg>
  );
}
// -----------------------------------------------------------------------

const clampNum = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

/** Full state snapshot — SynthPatch plus the performance state a patch deliberately excludes (play mode, arp settings, sequencer pattern, tempo). Used only for the "share this jam" link (see StudioExample.tsx), not for patch save/load. */
export interface SynthState {
  patch: SynthPatch;
  mode: PlayMode;
  arpPattern: ArpPattern;
  arpOctaves: number;
  rate: Rate;
  gate: number;
  seqSteps: SeqStep[];
  bpm: number;
}

/** Imperative handle exposed via `ref` — lets a parent (StudioExample.tsx) pull this instrument's live output into its own combined recording, or trigger a hands-free demo. */
export interface SynthHandle {
  /** Returns the synth's permanently-tapped post-effects output stream, creating its AudioContext first if needed. */
  getOutputStream: () => MediaStream;
  /** Loads a melodic factory patch and switches to Seq mode, which plays itself on its own clock — no keys held, no interaction required beyond the click that called this. */
  playDemo: () => void;
  /** Returns to Keys mode, which stops Seq/Arp's self-playing clock (used to stop the demo). */
  stop: () => void;
  /** Snapshots patch + performance state (mode, arp settings, sequencer pattern, tempo) for a shareable jam link. */
  getState: () => SynthState;
  /** Restores a snapshot from getState(). Doesn't itself resume audio (see `play`) — loading state on page mount happens before any user gesture. */
  loadState: (state: SynthState) => void;
  /** Ensures the audio graph exists and resumes it if suspended — called from a real click so a loaded jam link can actually make sound. */
  play: () => void;
}

interface SynthProps {
  /** If provided, the synth's tempo tracks this value instead of managing its own — for syncing with another instrument (see StudioExample.tsx). */
  bpm?: number;
  /** Fires when the user adjusts the local Tempo knob — only meaningful when `bpm` is not also locked via `bpmLocked`. */
  onBpmChange?: (bpm: number) => void;
  /** When true, disables the local Tempo knob (it's being driven externally, so local editing would just fight the shared value). */
  bpmLocked?: boolean;
  /** Which shared skin palette (see ./skins.ts) to render with. Defaults to "basic" when omitted, so the synth still looks right standalone. There's no selector in this panel — see StudioExample.tsx's top bar, the single place skin is chosen. */
  skin?: SkinName;
  ref?: Ref<SynthHandle>;
}

export default function Synth({
  bpm: externalBpm,
  onBpmChange,
  bpmLocked = false,
  skin = "basic",
  ref,
}: SynthProps = {}) {
  const [waveform, setWaveform] = useState<WaveType>("sawtooth");
  const [filterType, setFilterType] = useState<FilterType>("lowpass");
  const [filterBlend, setFilterBlend] = useState(0.5);
  const [cutoff, setCutoff] = useState(2200);
  const [resonance, setResonance] = useState(4);
  const [attack, setAttack] = useState(0.02);
  const [decay, setDecay] = useState(0.2);
  const [sustain, setSustain] = useState(0.7);
  const [release, setRelease] = useState(0.35);
  const [volume, setVolume] = useState(0.6);
  const [glide, setGlide] = useState(0.08);
  const [legato, setLegato] = useState(true);
  const [filterEnvAmount, setFilterEnvAmount] = useState(2500);
  const [filterEnvDecay, setFilterEnvDecay] = useState(0.25);
  const [unisonCount, setUnisonCount] = useState(1);
  const [detuneAmount, setDetuneAmount] = useState(0);
  const [subLevel, setSubLevel] = useState(0);
  const [noiseLevel, setNoiseLevel] = useState(0);

  const [mode, setMode] = useState<PlayMode>("keys");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("mono");
  const [octaveShift, setOctaveShift] = useState(0);
  const [internalBpm, setInternalBpm] = useState(120);
  const bpm = externalBpm ?? internalBpm;
  const handleBpmChange = (v: number) => {
    if (externalBpm === undefined) setInternalBpm(v);
    onBpmChange?.(v);
  };
  const [rate, setRate] = useState<Rate>("1/16");
  const [gate, setGate] = useState(0.6);
  const [arpPattern, setArpPattern] = useState<ArpPattern>("up");
  const [arpOctaves, setArpOctaves] = useState(1);
  const [seqSteps, setSeqSteps] = useState<SeqStep[]>(DEFAULT_SEQ);
  const [currentStep, setCurrentStep] = useState(-1);

  const [delayOn, setDelayOn] = useState(false);
  const [delayTime, setDelayTime] = useState(0.32);
  const [delayFeedback, setDelayFeedback] = useState(0.35);
  const [delayMix, setDelayMix] = useState(0.3);
  const [reverbOn, setReverbOn] = useState(false);
  const [reverbSize, setReverbSize] = useState(2.2);
  const [reverbMix, setReverbMix] = useState(0.35);

  const [chorusOn, setChorusOn] = useState(false);
  const [chorusRate, setChorusRate] = useState(0.6);
  const [chorusDepth, setChorusDepth] = useState(0.5);
  const [chorusMix, setChorusMix] = useState(0.35);

  const [lfoTarget, setLfoTarget] = useState<LfoTarget>("off");
  const [lfoRate, setLfoRate] = useState(4);
  const [lfoDepth, setLfoDepth] = useState(0.4);

  const [presets, setPresets] = useState<(PresetSlot | null)[]>(() => {
    if (typeof window === "undefined") return FACTORY_PRESETS;
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (raw) {
        const sanitized = sanitizePresets(JSON.parse(raw));
        if (sanitized) return sanitized;
      }
    } catch {
      /* corrupt or unavailable storage — fall back to factory defaults */
    }
    return FACTORY_PRESETS;
  });
  const [saveMode, setSaveMode] = useState(false);
  const [savingSlotIndex, setSavingSlotIndex] = useState<number | null>(null);
  const [patchNameDraft, setPatchNameDraft] = useState("");
  const [activePatchIndex, setActivePatchIndex] = useState<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [heldKeys, setHeldKeys] = useState<Set<string>>(new Set());
  const [soundingNote, setSoundingNote] = useState<string | null>(null);
  const [polyActiveNotes, setPolyActiveNotes] = useState<Set<string>>(new Set());

  const ctxRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const filterAltRef = useRef<BiquadFilterNode | null>(null);
  const filterLPGainRef = useRef<GainNode | null>(null);
  const filterAltGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const monoOscsRef = useRef<OscillatorNode[]>([]);
  const monoOscGainsRef = useRef<GainNode[]>([]);
  const monoBaseFreqRef = useRef(440);
  const monoSubOscRef = useRef<OscillatorNode | null>(null);
  const monoSubGainRef = useRef<GainNode | null>(null);
  const monoNoiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const monoNoiseGainRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const ampGainRef = useRef<GainNode | null>(null);
  const noteStackRef = useRef<string[]>([]);
  const polyVoicesRef = useRef<Map<string, PolyVoice>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayFeedbackGainRef = useRef<GainNode | null>(null);
  const delayWetGainRef = useRef<GainNode | null>(null);
  const delayDryGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const reverbWetGainRef = useRef<GainNode | null>(null);
  const reverbDryGainRef = useRef<GainNode | null>(null);
  const tremoloGainRef = useRef<GainNode | null>(null);
  const lfoOscRef = useRef<OscillatorNode | null>(null);
  const lfoFilterDepthGainRef = useRef<GainNode | null>(null);
  const lfoPitchDepthGainRef = useRef<GainNode | null>(null);
  const lfoAmpDepthGainRef = useRef<GainNode | null>(null);
  const chorusDryGainRef = useRef<GainNode | null>(null);
  const chorusWetGainRef = useRef<GainNode | null>(null);
  const chorusDelaysRef = useRef<DelayNode[]>([]);
  const chorusLfosRef = useRef<OscillatorNode[]>([]);
  const chorusLfoDepthGainsRef = useRef<GainNode[]>([]);

  const waveformRef = useRef(waveform);
  const attackRef = useRef(attack);
  const decayRef = useRef(decay);
  const sustainRef = useRef(sustain);
  const releaseRef = useRef(release);
  const filterTypeRef = useRef(filterType);
  const filterBlendRef = useRef(filterBlend);
  const cutoffRef = useRef(cutoff);
  const resonanceRef = useRef(resonance);
  const glideRef = useRef(glide);
  const legatoRef = useRef(legato);
  const filterEnvAmountRef = useRef(filterEnvAmount);
  const filterEnvDecayRef = useRef(filterEnvDecay);
  const unisonCountRef = useRef(unisonCount);
  const detuneAmountRef = useRef(detuneAmount);
  const subLevelRef = useRef(subLevel);
  const noiseLevelRef = useRef(noiseLevel);
  const modeRef = useRef(mode);
  const voiceModeRef = useRef(voiceMode);
  const octaveShiftRef = useRef(octaveShift);
  const heldKeysRef = useRef(heldKeys);
  const arpPatternRef = useRef(arpPattern);
  const arpOctavesRef = useRef(arpOctaves);
  const gateRef = useRef(gate);
  const seqStepsRef = useRef(seqSteps);
  const skinRef = useRef<SkinPalette>(SKIN_PALETTES[skin]);
  // Only needed at audio-graph creation time (see ensureAudioGraph) — kept
  // as refs, like everything else above, so turning these knobs doesn't
  // change ensureAudioGraph's identity and cascade into restarting the
  // Arp/Seq scheduler (which depends on triggerVoice, which depends on
  // ensureAudioGraph). Live updates after creation still go through their
  // own small effects further down, unaffected by this.
  const volumeRef = useRef(volume);
  const delayTimeRef = useRef(delayTime);
  const delayFeedbackRef = useRef(delayFeedback);
  const delayMixRef = useRef(delayMix);
  const delayOnRef = useRef(delayOn);
  const reverbSizeRef = useRef(reverbSize);
  const reverbMixRef = useRef(reverbMix);
  const reverbOnRef = useRef(reverbOn);
  const lfoRateRef = useRef(lfoRate);
  const lfoTargetRef = useRef(lfoTarget);
  const lfoDepthRef = useRef(lfoDepth);
  const chorusOnRef = useRef(chorusOn);
  const chorusRateRef = useRef(chorusRate);
  const chorusDepthRef = useRef(chorusDepth);
  const chorusMixRef = useRef(chorusMix);

  waveformRef.current = waveform;
  attackRef.current = attack;
  decayRef.current = decay;
  sustainRef.current = sustain;
  releaseRef.current = release;
  filterTypeRef.current = filterType;
  filterBlendRef.current = filterBlend;
  cutoffRef.current = cutoff;
  resonanceRef.current = resonance;
  glideRef.current = glide;
  legatoRef.current = legato;
  filterEnvAmountRef.current = filterEnvAmount;
  filterEnvDecayRef.current = filterEnvDecay;
  unisonCountRef.current = unisonCount;
  detuneAmountRef.current = detuneAmount;
  subLevelRef.current = subLevel;
  noiseLevelRef.current = noiseLevel;
  modeRef.current = mode;
  voiceModeRef.current = voiceMode;
  octaveShiftRef.current = octaveShift;
  heldKeysRef.current = heldKeys;
  arpPatternRef.current = arpPattern;
  arpOctavesRef.current = arpOctaves;
  gateRef.current = gate;
  seqStepsRef.current = seqSteps;
  skinRef.current = SKIN_PALETTES[skin];
  volumeRef.current = volume;
  delayTimeRef.current = delayTime;
  delayFeedbackRef.current = delayFeedback;
  delayMixRef.current = delayMix;
  delayOnRef.current = delayOn;
  reverbSizeRef.current = reverbSize;
  reverbMixRef.current = reverbMix;
  reverbOnRef.current = reverbOn;
  lfoRateRef.current = lfoRate;
  lfoTargetRef.current = lfoTarget;
  lfoDepthRef.current = lfoDepth;
  chorusOnRef.current = chorusOn;
  chorusRateRef.current = chorusRate;
  chorusDepthRef.current = chorusDepth;
  chorusMixRef.current = chorusMix;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      /* storage unavailable — patches just won't persist across reloads */
    }
  }, [presets]);

  const applyPatch = useCallback((rawPatch: SynthPatch) => {
    const patch = sanitizePatch(rawPatch);
    setWaveform(patch.waveform);
    setVoiceMode(patch.voiceMode);
    setOctaveShift(patch.octaveShift);
    setUnisonCount(patch.unisonCount);
    setDetuneAmount(patch.detuneAmount);
    setSubLevel(patch.subLevel);
    setNoiseLevel(patch.noiseLevel);
    setFilterType(patch.filterType);
    setFilterBlend(patch.filterBlend);
    setCutoff(patch.cutoff);
    setResonance(patch.resonance);
    setFilterEnvAmount(patch.filterEnvAmount);
    setFilterEnvDecay(patch.filterEnvDecay);
    setAttack(patch.attack);
    setDecay(patch.decay);
    setSustain(patch.sustain);
    setRelease(patch.release);
    setGlide(patch.glide);
    setLegato(patch.legato);
    setVolume(patch.volume);
    setDelayOn(patch.delayOn);
    setDelayTime(patch.delayTime);
    setDelayFeedback(patch.delayFeedback);
    setDelayMix(patch.delayMix);
    setReverbOn(patch.reverbOn);
    setReverbSize(patch.reverbSize);
    setReverbMix(patch.reverbMix);
    setChorusOn(patch.chorusOn);
    setChorusRate(patch.chorusRate);
    setChorusDepth(patch.chorusDepth);
    setChorusMix(patch.chorusMix);
    setLfoTarget(patch.lfoTarget);
    setLfoRate(patch.lfoRate);
    setLfoDepth(patch.lfoDepth);
  }, []);

  const capturePatch = useCallback(
    (): SynthPatch => ({
      waveform, voiceMode, octaveShift, unisonCount, detuneAmount, subLevel, noiseLevel, filterType, filterBlend, cutoff, resonance,
      filterEnvAmount, filterEnvDecay, attack, decay, sustain, release, glide, legato, volume,
      delayOn, delayTime, delayFeedback, delayMix, reverbOn, reverbSize, reverbMix,
      chorusOn, chorusRate, chorusDepth, chorusMix,
      lfoTarget, lfoRate, lfoDepth,
    }),
    [
      waveform, voiceMode, octaveShift, unisonCount, detuneAmount, subLevel, noiseLevel, filterType, filterBlend, cutoff, resonance,
      filterEnvAmount, filterEnvDecay, attack, decay, sustain, release, glide, legato, volume,
      delayOn, delayTime, delayFeedback, delayMix, reverbOn, reverbSize, reverbMix,
      chorusOn, chorusRate, chorusDepth, chorusMix,
      lfoTarget, lfoRate, lfoDepth,
    ],
  );

  useEffect(() => {
    if (savingSlotIndex !== null) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [savingSlotIndex]);

  const handlePatchSlotClick = (index: number) => {
    if (saveMode) {
      const slot = presets[index];
      setPatchNameDraft(slot?.name ?? `Patch ${index + 1}`);
      setSavingSlotIndex(index);
    } else {
      const slot = presets[index];
      applyPatch(slot ? slot.patch : INIT_PATCH);
      setActivePatchIndex(index);
    }
  };

  const handleRandomize = () => {
    applyPatch(randomizePatch());
    setActivePatchIndex(null);
    setSaveMode(false);
    setSavingSlotIndex(null);
  };

  const confirmSave = () => {
    if (savingSlotIndex === null) return;
    const index = savingSlotIndex;
    const trimmed = patchNameDraft.trim();
    setPresets((prev) => {
      const next = [...prev];
      next[index] = trimmed ? { name: trimmed, patch: capturePatch() } : null;
      return next;
    });
    setActivePatchIndex(index);
    setSavingSlotIndex(null);
    setSaveMode(false);
  };

  const cancelSave = () => {
    setSavingSlotIndex(null);
    setSaveMode(false);
  };

  const ensureAudioGraph = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();

    const masterGain = ctx.createGain();
    masterGain.gain.value = volumeRef.current;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;

    // --- LFO: one oscillator, three permanently-wired modulation paths ---
    // Each path (filter/pitch/amp) is always connected; only the *active*
    // target's depth-gain is ever nonzero, controlled centrally by a single
    // effect. This avoids dynamically rewiring the graph every time the
    // target changes, and lets poly voices connect unconditionally too.
    const lfoOsc = ctx.createOscillator();
    lfoOsc.type = "sine";
    lfoOsc.frequency.value = lfoRateRef.current;
    const lfoFilterDepthGain = ctx.createGain();
    lfoFilterDepthGain.gain.value = lfoTargetRef.current === "filter" ? lfoDepthRef.current * FILTER_LFO_MAX_HZ : 0;
    const lfoPitchDepthGain = ctx.createGain();
    lfoPitchDepthGain.gain.value = lfoTargetRef.current === "pitch" ? lfoDepthRef.current * PITCH_LFO_MAX_CENTS : 0;
    const lfoAmpDepthGain = ctx.createGain();
    lfoAmpDepthGain.gain.value = lfoTargetRef.current === "amp" ? lfoDepthRef.current : 0;
    lfoOsc.connect(lfoFilterDepthGain);
    lfoOsc.connect(lfoPitchDepthGain);
    lfoOsc.connect(lfoAmpDepthGain);
    lfoOsc.start();

    // Tremolo stage: sits between masterGain and the effects chain so it
    // affects both mono and poly voices uniformly without per-voice wiring.
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.value = lfoTargetRef.current === "amp" ? 1 - lfoDepthRef.current / 2 : 1;
    lfoAmpDepthGain.connect(tremoloGain.gain);
    masterGain.connect(tremoloGain);

    // --- Chorus: N modulated delay lines summed as "wet", dry passthrough ---
    // Each voice's LFO runs at a slightly different rate (see
    // CHORUS_VOICE_RATE_SPREAD) so they drift in and out of phase rather
    // than staying locked together — cheap way to get ensemble-like
    // movement without needing true phase control on OscillatorNode.
    const chorusDryGain = ctx.createGain();
    chorusDryGain.gain.value = chorusOnRef.current ? 1 - chorusMixRef.current : 1;
    const chorusWetGain = ctx.createGain();
    chorusWetGain.gain.value = chorusOnRef.current ? chorusMixRef.current : 0;
    const chorusStageOut = ctx.createGain();
    tremoloGain.connect(chorusDryGain);
    chorusDryGain.connect(chorusStageOut);

    const chorusDelays: DelayNode[] = [];
    const chorusLfos: OscillatorNode[] = [];
    const chorusLfoDepthGains: GainNode[] = [];
    for (let i = 0; i < CHORUS_VOICE_COUNT; i++) {
      const delay = ctx.createDelay(CHORUS_BASE_DELAY_SEC + CHORUS_MAX_DEPTH_SEC + 0.005);
      delay.delayTime.value = CHORUS_BASE_DELAY_SEC;
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = chorusRateRef.current * (i === 0 ? 1 : CHORUS_VOICE_RATE_SPREAD);
      const depthGain = ctx.createGain();
      depthGain.gain.value = chorusDepthRef.current * CHORUS_MAX_DEPTH_SEC;
      lfo.connect(depthGain);
      depthGain.connect(delay.delayTime);
      tremoloGain.connect(delay);
      delay.connect(chorusWetGain);
      lfo.start();
      chorusDelays.push(delay);
      chorusLfos.push(lfo);
      chorusLfoDepthGains.push(depthGain);
    }
    chorusWetGain.connect(chorusStageOut);

    // --- Effects chain: chorusStageOut -> delay stage -> reverb stage -> analyser ---
    // Each stage is a permanent dry+wet pair; toggling an effect off just
    // ramps its wet gain to 0 and dry gain to 1 rather than disconnecting
    // anything, which avoids clicks and graph-rebuild complexity.
    const delayNode = ctx.createDelay(2.0);
    delayNode.delayTime.value = delayTimeRef.current;
    const delayFeedbackGain = ctx.createGain();
    delayFeedbackGain.gain.value = delayFeedbackRef.current;
    const delayWetGain = ctx.createGain();
    delayWetGain.gain.value = delayOnRef.current ? delayMixRef.current : 0;
    const delayDryGain = ctx.createGain();
    delayDryGain.gain.value = delayOnRef.current ? 1 - delayMixRef.current : 1;
    const delayStageOut = ctx.createGain();

    chorusStageOut.connect(delayDryGain);
    chorusStageOut.connect(delayNode);
    delayNode.connect(delayFeedbackGain);
    delayFeedbackGain.connect(delayNode);
    delayNode.connect(delayWetGain);
    delayDryGain.connect(delayStageOut);
    delayWetGain.connect(delayStageOut);

    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulseResponse(ctx, reverbSizeRef.current);
    const reverbWetGain = ctx.createGain();
    reverbWetGain.gain.value = reverbOnRef.current ? reverbMixRef.current : 0;
    const reverbDryGain = ctx.createGain();
    reverbDryGain.gain.value = reverbOnRef.current ? 1 - reverbMixRef.current : 1;
    const reverbStageOut = ctx.createGain();

    delayStageOut.connect(reverbDryGain);
    delayStageOut.connect(convolver);
    convolver.connect(reverbWetGain);
    reverbDryGain.connect(reverbStageOut);
    reverbWetGain.connect(reverbStageOut);

    reverbStageOut.connect(analyser);
    analyser.connect(ctx.destination);
    // Permanent recording tap, post-effects — connected once and never torn
    // down (same pattern as the DrumMachine tap), so a parent's
    // getOutputStream() call always returns the fully-processed signal.
    const recordDest = ctx.createMediaStreamDestination();
    analyser.connect(recordDest);
    recordStreamDestRef.current = recordDest;

    // Two filters in parallel, crossfaded by filterBlend, so switching or
    // dialing in a filter "type" morphs smoothly instead of hard-cutting —
    // BiquadFilterNode.type can't be animated directly (it's a plain
    // property, not an AudioParam), so blending is done by running a fixed
    // lowpass and the selected alt-type side by side and mixing outputs.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoffRef.current;
    filter.Q.value = resonanceRef.current;

    const filterAlt = ctx.createBiquadFilter();
    filterAlt.type = filterTypeRef.current === "lowpass" ? "highpass" : filterTypeRef.current;
    filterAlt.frequency.value = cutoffRef.current;
    filterAlt.Q.value = resonanceRef.current;

    const filterLPGain = ctx.createGain();
    const filterAltGain = ctx.createGain();
    const initialBlend = filterTypeRef.current === "lowpass" ? 0 : filterBlendRef.current;
    filterLPGain.gain.value = 1 - initialBlend;
    filterAltGain.gain.value = initialBlend;

    filter.connect(filterLPGain);
    filterAlt.connect(filterAltGain);
    filterLPGain.connect(masterGain);
    filterAltGain.connect(masterGain);

    lfoFilterDepthGain.connect(filter.frequency);
    lfoFilterDepthGain.connect(filterAlt.frequency);

    // Mono voice — a fixed pool of MAX_UNISON oscillators, each through its
    // own gain (for muting unused voices and normalizing loudness), all
    // summing into one shared ampGain. Unison count / detune just changes
    // which of these are audible and how far apart they're tuned — the
    // oscillators themselves are created once and never torn down.
    const ampGain = ctx.createGain();
    ampGain.gain.value = 0;
    const monoOscs: OscillatorNode[] = [];
    const monoOscGains: GainNode[] = [];
    for (let i = 0; i < MAX_UNISON; i++) {
      const o = ctx.createOscillator();
      o.type = waveformRef.current;
      o.frequency.value = 440;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 1 : 0;
      o.connect(g);
      g.connect(ampGain);
      lfoPitchDepthGain.connect(o.detune);
      o.start();
      monoOscs.push(o);
      monoOscGains.push(g);
    }
    ampGain.connect(filter);
    ampGain.connect(filterAlt);

    // Sub-oscillator: a single fixed-sine voice one octave below the root,
    // for weight/foundation. Deliberately not part of the unison pool —
    // it tracks the root pitch only, ignoring unison detune spread, and
    // sine keeps the low end clean rather than adding harmonic mud.
    const subOsc = ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.value = 220;
    const subGain = ctx.createGain();
    subGain.gain.value = subLevelRef.current;
    subOsc.connect(subGain);
    subGain.connect(ampGain);
    subOsc.start();

    // Noise layer: a shared buffer (generated once) looped through its own
    // gain into ampGain, so it gets shaped by the same envelope and filter
    // as the rest of the mono voice — analog "breath" texture under the tone.
    const noiseBuffer = makeNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = noiseLevelRef.current;
    noiseSource.connect(noiseGain);
    noiseGain.connect(ampGain);
    noiseSource.start();

    ctxRef.current = ctx;
    filterRef.current = filter;
    filterAltRef.current = filterAlt;
    filterLPGainRef.current = filterLPGain;
    filterAltGainRef.current = filterAltGain;
    masterGainRef.current = masterGain;
    analyserRef.current = analyser;
    monoOscsRef.current = monoOscs;
    monoOscGainsRef.current = monoOscGains;
    monoSubOscRef.current = subOsc;
    monoSubGainRef.current = subGain;
    monoNoiseSourceRef.current = noiseSource;
    monoNoiseGainRef.current = noiseGain;
    noiseBufferRef.current = noiseBuffer;
    ampGainRef.current = ampGain;
    delayNodeRef.current = delayNode;
    delayFeedbackGainRef.current = delayFeedbackGain;
    delayWetGainRef.current = delayWetGain;
    delayDryGainRef.current = delayDryGain;
    convolverRef.current = convolver;
    reverbWetGainRef.current = reverbWetGain;
    reverbDryGainRef.current = reverbDryGain;
    tremoloGainRef.current = tremoloGain;
    lfoOscRef.current = lfoOsc;
    lfoFilterDepthGainRef.current = lfoFilterDepthGain;
    lfoPitchDepthGainRef.current = lfoPitchDepthGain;
    lfoAmpDepthGainRef.current = lfoAmpDepthGain;
    chorusDryGainRef.current = chorusDryGain;
    chorusWetGainRef.current = chorusWetGain;
    chorusDelaysRef.current = chorusDelays;
    chorusLfosRef.current = chorusLfos;
    chorusLfoDepthGainsRef.current = chorusLfoDepthGains;
    return ctx;
    // Every knob this reads comes from a ref (see above), so this callback's
    // identity never changes after mount — which matters, because it flows
    // into triggerVoice -> the Arp/Seq scheduler effect. Depending on the
    // knob state directly here used to mean turning almost any sound-shaping
    // knob while a sequence played would tear down and restart the
    // scheduler, snapping the pattern back to step 0 mid-playback.
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getOutputStream: () => {
        ensureAudioGraph();
        return recordStreamDestRef.current!.stream;
      },
      playDemo: () => {
        const ctx = ensureAudioGraph();
        if (ctx.state === "suspended") ctx.resume();
        const demoPatch = FACTORY_PRESETS.find((p) => p?.name === "Pluck Arp")?.patch ?? INIT_PATCH;
        applyPatch(demoPatch);
        setMode("seq");
      },
      stop: () => {
        setMode("keys");
      },
      getState: () => ({
        patch: capturePatch(),
        mode,
        arpPattern,
        arpOctaves,
        rate,
        gate,
        seqSteps,
        bpm,
      }),
      loadState: (state) => {
        applyPatch(state.patch);
        setMode(PLAY_MODES.includes(state.mode) ? state.mode : "keys");
        setArpPattern(ARP_PATTERNS.includes(state.arpPattern) ? state.arpPattern : "up");
        setArpOctaves(Math.round(clampNum(state.arpOctaves, 1, 3, 1)));
        setRate(RATES.includes(state.rate) ? state.rate : "1/16");
        setGate(clampNum(state.gate, 0.05, 1, 0.6));
        const steps =
          Array.isArray(state.seqSteps) && state.seqSteps.length === 8
            ? state.seqSteps.map((s) => ({ note: typeof s?.note === "string" ? s.note : null }))
            : DEFAULT_SEQ;
        setSeqSteps(steps);
        if (externalBpm === undefined) setInternalBpm(Math.round(clampNum(state.bpm, 40, 200, 120)));
      },
      play: () => {
        const ctx = ensureAudioGraph();
        if (ctx.state === "suspended") ctx.resume();
      },
    }),
    [ensureAudioGraph, applyPatch, capturePatch, mode, arpPattern, arpOctaves, rate, gate, seqSteps, bpm, externalBpm],
  );

  useEffect(() => {
    if (filterAltRef.current) filterAltRef.current.type = filterType === "lowpass" ? "highpass" : filterType;
    polyVoicesRef.current.forEach((v) => {
      v.filterAlt.type = filterType === "lowpass" ? "highpass" : filterType;
    });
  }, [filterType]);

  useEffect(() => {
    const now = ctxRef.current?.currentTime ?? 0;
    const blend = filterType === "lowpass" ? 0 : filterBlend;
    filterLPGainRef.current?.gain.setTargetAtTime(1 - blend, now, 0.02);
    filterAltGainRef.current?.gain.setTargetAtTime(blend, now, 0.02);
    polyVoicesRef.current.forEach((v) => {
      v.filterLPGain.gain.setTargetAtTime(1 - blend, now, 0.02);
      v.filterAltGain.gain.setTargetAtTime(blend, now, 0.02);
    });
  }, [filterType, filterBlend]);

  useEffect(() => {
    const now = ctxRef.current?.currentTime ?? 0;
    filterRef.current?.frequency.setTargetAtTime(cutoff, now, 0.01);
    filterAltRef.current?.frequency.setTargetAtTime(cutoff, now, 0.01);
    polyVoicesRef.current.forEach((v) => {
      v.filter.frequency.setTargetAtTime(cutoff, now, 0.01);
      v.filterAlt.frequency.setTargetAtTime(cutoff, now, 0.01);
    });
  }, [cutoff]);
  useEffect(() => {
    const now = ctxRef.current?.currentTime ?? 0;
    filterRef.current?.Q.setTargetAtTime(resonance, now, 0.01);
    filterAltRef.current?.Q.setTargetAtTime(resonance, now, 0.01);
    polyVoicesRef.current.forEach((v) => {
      v.filter.Q.setTargetAtTime(resonance, now, 0.01);
      v.filterAlt.Q.setTargetAtTime(resonance, now, 0.01);
    });
  }, [resonance]);
  useEffect(() => {
    masterGainRef.current?.gain.setTargetAtTime(volume, ctxRef.current?.currentTime ?? 0, 0.01);
  }, [volume]);
  useEffect(() => {
    monoOscsRef.current.forEach((o) => (o.type = waveform));
    polyVoicesRef.current.forEach((v) => v.oscs.forEach((o) => (o.type = waveform)));
  }, [waveform]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const oscs = monoOscsRef.current;
    const gains = monoOscGainsRef.current;
    const n = unisonCount;
    const norm = 1 / Math.sqrt(n);
    for (let i = 0; i < oscs.length; i++) {
      const active = i < n;
      gains[i].gain.setTargetAtTime(active ? norm : 0, now, 0.02);
      const offset = n === 1 ? 0 : -detuneAmount + (2 * detuneAmount * i) / Math.max(1, n - 1);
      oscs[i].frequency.setTargetAtTime(monoBaseFreqRef.current * Math.pow(2, offset / 1200), now, 0.02);
    }
  }, [unisonCount, detuneAmount]);

  useEffect(() => {
    monoSubGainRef.current?.gain.setTargetAtTime(subLevel, ctxRef.current?.currentTime ?? 0, 0.02);
  }, [subLevel]);

  useEffect(() => {
    monoNoiseGainRef.current?.gain.setTargetAtTime(noiseLevel, ctxRef.current?.currentTime ?? 0, 0.02);
  }, [noiseLevel]);

  useEffect(() => {
    const now = ctxRef.current?.currentTime ?? 0;
    chorusLfosRef.current.forEach((lfo, i) => {
      lfo.frequency.setTargetAtTime(chorusRate * (i === 0 ? 1 : CHORUS_VOICE_RATE_SPREAD), now, 0.05);
    });
    chorusLfoDepthGainsRef.current.forEach((g) => g.gain.setTargetAtTime(chorusDepth * CHORUS_MAX_DEPTH_SEC, now, 0.05));
  }, [chorusRate, chorusDepth]);

  useEffect(() => {
    const now = ctxRef.current?.currentTime ?? 0;
    chorusWetGainRef.current?.gain.setTargetAtTime(chorusOn ? chorusMix : 0, now, 0.02);
    chorusDryGainRef.current?.gain.setTargetAtTime(chorusOn ? 1 - chorusMix : 1, now, 0.02);
  }, [chorusOn, chorusMix]);

  useEffect(() => {
    lfoOscRef.current?.frequency.setTargetAtTime(lfoRate, ctxRef.current?.currentTime ?? 0, 0.05);
  }, [lfoRate]);

  useEffect(() => {
    const now = ctxRef.current?.currentTime ?? 0;
    const filterDepthHz = lfoTarget === "filter" ? lfoDepth * FILTER_LFO_MAX_HZ : 0;
    const pitchDepthCents = lfoTarget === "pitch" ? lfoDepth * PITCH_LFO_MAX_CENTS : 0;
    const ampDepth = lfoTarget === "amp" ? lfoDepth : 0;
    lfoFilterDepthGainRef.current?.gain.setTargetAtTime(filterDepthHz, now, 0.05);
    lfoPitchDepthGainRef.current?.gain.setTargetAtTime(pitchDepthCents, now, 0.05);
    lfoAmpDepthGainRef.current?.gain.setTargetAtTime(ampDepth, now, 0.05);
    tremoloGainRef.current?.gain.setTargetAtTime(1 - ampDepth / 2, now, 0.05);
  }, [lfoTarget, lfoDepth]);

  useEffect(() => {
    delayNodeRef.current?.delayTime.setTargetAtTime(delayTime, ctxRef.current?.currentTime ?? 0, 0.02);
  }, [delayTime]);
  useEffect(() => {
    delayFeedbackGainRef.current?.gain.setTargetAtTime(delayFeedback, ctxRef.current?.currentTime ?? 0, 0.02);
  }, [delayFeedback]);
  useEffect(() => {
    const now = ctxRef.current?.currentTime ?? 0;
    const wet = delayOn ? delayMix : 0;
    const dry = delayOn ? 1 - delayMix : 1;
    delayWetGainRef.current?.gain.setTargetAtTime(wet, now, 0.02);
    delayDryGainRef.current?.gain.setTargetAtTime(dry, now, 0.02);
  }, [delayOn, delayMix]);
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !convolverRef.current) return;
    convolverRef.current.buffer = makeImpulseResponse(ctx, reverbSize);
  }, [reverbSize]);
  useEffect(() => {
    const now = ctxRef.current?.currentTime ?? 0;
    const wet = reverbOn ? reverbMix : 0;
    const dry = reverbOn ? 1 - reverbMix : 1;
    reverbWetGainRef.current?.gain.setTargetAtTime(wet, now, 0.02);
    reverbDryGainRef.current?.gain.setTargetAtTime(dry, now, 0.02);
  }, [reverbOn, reverbMix]);

  const triggerVoice = useCallback(
    (freq: number, glideFromCurrent: boolean, gateSeconds: number | null, retriggerAmp: boolean = true) => {
      const ctx = ensureAudioGraph();
      if (ctx.state === "suspended") ctx.resume();
      monoBaseFreqRef.current = freq;
      const oscs = monoOscsRef.current;
      const gains = monoOscGainsRef.current;
      const ampGain = ampGainRef.current!;
      const filters = [filterRef.current!, filterAltRef.current!];
      const now = ctx.currentTime;
      const n = unisonCountRef.current;
      const detune = detuneAmountRef.current;
      const norm = 1 / Math.sqrt(n);

      for (let i = 0; i < oscs.length; i++) {
        const active = i < n;
        const offset = n === 1 ? 0 : -detune + (2 * detune * i) / Math.max(1, n - 1);
        const targetFreq = freq * Math.pow(2, offset / 1200);
        oscs[i].frequency.cancelScheduledValues(now);
        if (glideFromCurrent && glideRef.current > 0.001) {
          oscs[i].frequency.setValueAtTime(oscs[i].frequency.value, now);
          oscs[i].frequency.linearRampToValueAtTime(targetFreq, now + glideRef.current);
        } else {
          oscs[i].frequency.setValueAtTime(targetFreq, now);
        }
        gains[i].gain.setTargetAtTime(active ? norm : 0, now, 0.01);
      }

      const subOsc = monoSubOscRef.current;
      if (subOsc) {
        const subTarget = freq / 2;
        subOsc.frequency.cancelScheduledValues(now);
        if (glideFromCurrent && glideRef.current > 0.001) {
          subOsc.frequency.setValueAtTime(subOsc.frequency.value, now);
          subOsc.frequency.linearRampToValueAtTime(subTarget, now + glideRef.current);
        } else {
          subOsc.frequency.setValueAtTime(subTarget, now);
        }
      }

      const atk =
        gateSeconds !== null
          ? Math.min(Math.max(attackRef.current, 0.005), Math.max(gateSeconds * 0.4, 0.005))
          : Math.max(attackRef.current, 0.005);
      const dec =
        gateSeconds !== null
          ? Math.min(Math.max(decayRef.current, 0.005), Math.max(gateSeconds * 0.4, 0.005))
          : Math.max(decayRef.current, 0.005);
      const sustainLevel = Math.min(Math.max(sustainRef.current, 0), 1);

      if (retriggerAmp) {
        ampGain.gain.cancelScheduledValues(now);
        ampGain.gain.setValueAtTime(ampGain.gain.value, now);
        ampGain.gain.linearRampToValueAtTime(1, now + atk);
        ampGain.gain.linearRampToValueAtTime(sustainLevel, now + atk + dec);
      }

      const base = cutoffRef.current;
      const peak = Math.min(Math.max(base + filterEnvAmountRef.current, 80), 18000);
      for (const filter of filters) {
        filter.frequency.cancelScheduledValues(now);
        filter.frequency.setValueAtTime(filter.frequency.value, now);
        filter.frequency.linearRampToValueAtTime(peak, now + atk);
        filter.frequency.linearRampToValueAtTime(base, now + atk + Math.max(filterEnvDecayRef.current, 0.02));
      }

      if (gateSeconds !== null) {
        const releaseTime = Math.max(releaseRef.current, 0.02);
        const offAt = now + gateSeconds;
        // Pin at the sustain level right before release, in case attack+decay
        // ran right up against the gate boundary and a ramp is still mid-flight.
        ampGain.gain.setValueAtTime(sustainLevel, offAt);
        ampGain.gain.linearRampToValueAtTime(0, offAt + releaseTime);
        for (const filter of filters) {
          filter.frequency.setValueAtTime(filter.frequency.value, offAt);
          filter.frequency.linearRampToValueAtTime(base, offAt + releaseTime);
        }
      }
    },
    [ensureAudioGraph],
  );

  const silenceMonoVoice = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const ampGain = ampGainRef.current;
    const now = ctx.currentTime;
    const releaseTime = Math.max(releaseRef.current, 0.02);
    if (ampGain) {
      ampGain.gain.cancelScheduledValues(now);
      ampGain.gain.setValueAtTime(ampGain.gain.value, now);
      ampGain.gain.linearRampToValueAtTime(0, now + releaseTime);
    }
    for (const filter of [filterRef.current, filterAltRef.current]) {
      if (!filter) continue;
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(filter.frequency.value, now);
      filter.frequency.linearRampToValueAtTime(cutoffRef.current, now + releaseTime);
    }
  }, []);

  const monoNoteOn = useCallback(
    (note: string) => {
      const stack = noteStackRef.current;
      const wasEmpty = stack.length === 0;
      const idx = stack.indexOf(note);
      if (idx !== -1) stack.splice(idx, 1);
      stack.push(note);
      triggerVoice(noteFreq(note) * Math.pow(2, octaveShiftRef.current), !wasEmpty, null, wasEmpty || !legatoRef.current);
      setSoundingNote(note);
    },
    [triggerVoice],
  );

  const monoNoteOff = useCallback(
    (note: string) => {
      if (!ctxRef.current) return;
      const stack = noteStackRef.current;
      const idx = stack.indexOf(note);
      if (idx !== -1) stack.splice(idx, 1);
      if (stack.length > 0) {
        const prevNote = stack[stack.length - 1];
        triggerVoice(noteFreq(prevNote) * Math.pow(2, octaveShiftRef.current), true, null, false);
        setSoundingNote(prevNote);
      } else {
        silenceMonoVoice();
        setSoundingNote(null);
      }
    },
    [triggerVoice, silenceMonoVoice],
  );

  const polyNoteOn = useCallback(
    (note: string) => {
      const ctx = ensureAudioGraph();
      if (ctx.state === "suspended") ctx.resume();
      if (polyVoicesRef.current.has(note)) return;

      const n = unisonCountRef.current;
      const detune = detuneAmountRef.current;
      const baseFreq = noteFreq(note) * Math.pow(2, octaveShiftRef.current);

      const gain = ctx.createGain();
      gain.gain.value = 0;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoffRef.current;
      filter.Q.value = resonanceRef.current;

      const filterAlt = ctx.createBiquadFilter();
      filterAlt.type = filterTypeRef.current === "lowpass" ? "highpass" : filterTypeRef.current;
      filterAlt.frequency.value = cutoffRef.current;
      filterAlt.Q.value = resonanceRef.current;

      const filterLPGain = ctx.createGain();
      const filterAltGain = ctx.createGain();
      const initialBlend = filterTypeRef.current === "lowpass" ? 0 : filterBlendRef.current;
      filterLPGain.gain.value = 1 - initialBlend;
      filterAltGain.gain.value = initialBlend;

      gain.connect(filter);
      gain.connect(filterAlt);
      filter.connect(filterLPGain);
      filterAlt.connect(filterAltGain);
      filterLPGain.connect(masterGainRef.current!);
      filterAltGain.connect(masterGainRef.current!);
      lfoFilterDepthGainRef.current?.connect(filter.frequency);
      lfoFilterDepthGainRef.current?.connect(filterAlt.frequency);

      const oscs: OscillatorNode[] = [];
      for (let i = 0; i < n; i++) {
        const offset = n === 1 ? 0 : -detune + (2 * detune * i) / Math.max(1, n - 1);
        const o = ctx.createOscillator();
        o.type = waveformRef.current;
        o.frequency.value = baseFreq * Math.pow(2, offset / 1200);
        o.connect(gain);
        lfoPitchDepthGainRef.current?.connect(o.detune);
        o.start();
        oscs.push(o);
      }

      const subOsc = ctx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.value = baseFreq / 2;
      const subGain = ctx.createGain();
      subGain.gain.value = subLevelRef.current;
      subOsc.connect(subGain);
      subGain.connect(gain);
      subOsc.start();

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBufferRef.current;
      noiseSource.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = noiseLevelRef.current;
      noiseSource.connect(noiseGain);
      noiseGain.connect(gain);
      noiseSource.start();

      const now = ctx.currentTime;
      const atk = Math.max(attackRef.current, 0.005);
      const dec = Math.max(decayRef.current, 0.005);
      const sustainLevel = Math.min(Math.max(sustainRef.current, 0), 1);
      const norm = 1 / Math.sqrt(n);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(norm, now + atk);
      gain.gain.linearRampToValueAtTime(norm * sustainLevel, now + atk + dec);

      const base = cutoffRef.current;
      const peak = Math.min(Math.max(base + filterEnvAmountRef.current, 80), 18000);
      for (const f of [filter, filterAlt]) {
        f.frequency.setValueAtTime(base, now);
        f.frequency.linearRampToValueAtTime(peak, now + atk);
        f.frequency.linearRampToValueAtTime(base, now + atk + Math.max(filterEnvDecayRef.current, 0.02));
      }

      polyVoicesRef.current.set(note, {
        oscs, gain, filter, filterAlt, filterLPGain, filterAltGain, subOsc, subGain, noiseSource, noiseGain,
      });
      setPolyActiveNotes((prev) => new Set(prev).add(note));
    },
    [ensureAudioGraph],
  );

  const polyNoteOff = useCallback((note: string) => {
    const ctx = ctxRef.current;
    const voice = polyVoicesRef.current.get(note);
    if (!ctx || !voice) return;
    const now = ctx.currentTime;
    const releaseTime = Math.max(releaseRef.current, 0.02);

    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + releaseTime);
    for (const f of [voice.filter, voice.filterAlt]) {
      f.frequency.cancelScheduledValues(now);
      f.frequency.setValueAtTime(f.frequency.value, now);
      f.frequency.linearRampToValueAtTime(cutoffRef.current, now + releaseTime);
    }

    const { oscs, gain, filter, filterAlt, filterLPGain, filterAltGain, subOsc, subGain, noiseSource, noiseGain } = voice;
    const stopAt = now + releaseTime + 0.05;
    oscs.forEach((o) => o.stop(stopAt));
    subOsc.stop(stopAt);
    noiseSource.stop(stopAt);
    oscs[0].onended = () => {
      oscs.forEach((o) => {
        o.disconnect();
        try {
          lfoPitchDepthGainRef.current?.disconnect(o.detune);
        } catch {
          /* already disconnected */
        }
      });
      subOsc.disconnect();
      subGain.disconnect();
      noiseSource.disconnect();
      noiseGain.disconnect();
      gain.disconnect();
      filter.disconnect();
      filterAlt.disconnect();
      filterLPGain.disconnect();
      filterAltGain.disconnect();
      try {
        lfoFilterDepthGainRef.current?.disconnect(filter.frequency);
        lfoFilterDepthGainRef.current?.disconnect(filterAlt.frequency);
      } catch {
        /* already disconnected */
      }
    };

    polyVoicesRef.current.delete(note);
    setPolyActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  }, []);

  const noteOn = useCallback(
    (note: string) => (voiceModeRef.current === "poly" ? polyNoteOn(note) : monoNoteOn(note)),
    [polyNoteOn, monoNoteOn],
  );
  const noteOff = useCallback(
    (note: string) => (voiceModeRef.current === "poly" ? polyNoteOff(note) : monoNoteOff(note)),
    [polyNoteOff, monoNoteOff],
  );

  const handlePress = useCallback(
    (note: string) => {
      setHeldKeys((prev) => new Set(prev).add(note));
      if (modeRef.current === "keys") noteOn(note);
    },
    [noteOn],
  );

  const handleRelease = useCallback(
    (note: string) => {
      setHeldKeys((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      if (modeRef.current === "keys") noteOff(note);
    },
    [noteOff],
  );

  const allNotesOff = useCallback(() => {
    noteStackRef.current = [];
    silenceMonoVoice();
    setSoundingNote(null);
    const ctx = ctxRef.current;
    polyVoicesRef.current.forEach((voice) => {
      if (ctx) {
        const now = ctx.currentTime;
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(0, now);
        voice.oscs.forEach((o) => o.stop(now + 0.05));
        voice.subOsc.stop(now + 0.05);
        voice.noiseSource.stop(now + 0.05);
      } else {
        [...voice.oscs, voice.subOsc, voice.noiseSource].forEach((o) => {
          try {
            o.stop();
          } catch {
            /* not started yet */
          }
        });
      }
    });
    polyVoicesRef.current.clear();
    setPolyActiveNotes(new Set());
    setHeldKeys(new Set());
    setCurrentStep(-1);
  }, [silenceMonoVoice]);

  useEffect(() => {
    allNotesOff();
  }, [mode, voiceMode, allNotesOff]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = COMPUTER_KEY_MAP[e.key.toLowerCase()];
      if (note) handlePress(note);
    };
    const handleUp = (e: KeyboardEvent) => {
      const note = COMPUTER_KEY_MAP[e.key.toLowerCase()];
      if (note) handleRelease(note);
    };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, [handlePress, handleRelease]);

  useEffect(() => {
    if (mode === "keys") return;
    const stepMs = (60000 / bpm) * RATE_MULTIPLIER[rate];
    let stepCounter = 0;

    const buildArpPool = () => {
      const held = Array.from(heldKeysRef.current).sort(
        (a, b) => NOTE_ORDER.indexOf(a) - NOTE_ORDER.indexOf(b),
      );
      if (held.length === 0) return [];
      const octaves = arpOctavesRef.current;
      let pool: { label: string; freq: number }[] = [];
      for (let o = 0; o < octaves; o++) {
        for (const n of held) pool.push({ label: n, freq: noteFreq(n) * Math.pow(2, o) * Math.pow(2, octaveShiftRef.current) });
      }
      if (arpPatternRef.current === "down") pool = pool.slice().reverse();
      else if (arpPatternRef.current === "updown" && pool.length > 2) {
        pool = pool.concat(pool.slice(1, -1).reverse());
      }
      return pool;
    };

    const tick = () => {
      const gateSeconds = (stepMs / 1000) * gateRef.current;
      if (mode === "arp") {
        const pool = buildArpPool();
        if (pool.length === 0) {
          silenceMonoVoice();
          setSoundingNote(null);
          return;
        }
        const step =
          arpPatternRef.current === "random"
            ? pool[Math.floor(Math.random() * pool.length)]
            : pool[stepCounter % pool.length];
        triggerVoice(step.freq, true, gateSeconds);
        setSoundingNote(step.label);
        stepCounter++;
      } else if (mode === "seq") {
        const steps = seqStepsRef.current;
        const idx = stepCounter % steps.length;
        setCurrentStep(idx);
        const step = steps[idx];
        if (step.note) {
          triggerVoice(noteFreq(step.note) * Math.pow(2, octaveShiftRef.current), true, gateSeconds);
          setSoundingNote(step.note);
        } else {
          setSoundingNote(null);
        }
        stepCounter++;
      }
    };

    tick();
    const id = setInterval(tick, stepMs);
    return () => {
      clearInterval(id);
      silenceMonoVoice();
      setSoundingNote(null);
      setCurrentStep(-1);
    };
  }, [mode, bpm, rate, triggerVoice, silenceMonoVoice]);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas) return;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) return;
      const width = canvas.width;
      const height = canvas.height;
      const colors = skinRef.current;
      ctx2d.fillStyle = colors.scopeBg;
      ctx2d.fillRect(0, 0, width, height);
      if (!analyser) {
        ctx2d.strokeStyle = colors.accent2;
        ctx2d.globalAlpha = 0.25;
        ctx2d.beginPath();
        ctx2d.moveTo(0, height / 2);
        ctx2d.lineTo(width, height / 2);
        ctx2d.stroke();
        ctx2d.globalAlpha = 1;
        return;
      }
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      ctx2d.lineWidth = 2;
      ctx2d.strokeStyle = colors.accent2;
      ctx2d.beginPath();
      const slice = width / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128 - 1;
        const y = height / 2 + v * (height / 2 - 6);
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
        x += slice;
      }
      ctx2d.stroke();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const updateSeqStep = (idx: number, value: string) => {
    setSeqSteps((prev) => prev.map((s, i) => (i === idx ? { note: value === "" ? null : value } : s)));
  };

  const showGlide = !(mode === "keys" && voiceMode === "poly");
  const showLegato = mode === "keys" && voiceMode === "mono";

  return (
    <div className="synth-root" style={skinToCssVars(SKIN_PALETTES[skin])}>
      <style>{`
        .synth-root {
          font-family: 'JetBrains Mono', 'Space Mono', monospace;
          color: var(--text); background: var(--panel); border-radius: 14px;
          padding: 20px 22px 24px; max-width: 780px;
          box-shadow: inset 0 0 0 1px var(--border), 0 12px 30px rgba(0,0,0,0.35);
        }
        .synth-header { display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 14px; letter-spacing: 0.06em; }
        .synth-title { font-size: 13px; font-weight: 700; color: var(--accent1); }
        .synth-voice { font-size: 10px; color: var(--accent2); min-width: 90px; text-align: right; }
        .synth-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 14px; background: var(--panel-2); border-radius: 10px; padding: 14px 16px;
          margin-bottom: 12px; box-shadow: inset 0 0 0 1px var(--border); }
        .synth-mode-row { margin-bottom: 8px; }
        .synth-mode-extra { box-shadow: inset 0 0 0 1px var(--border), inset 2px 0 0 var(--accent1);
          animation: synth-fade-in 0.18s ease; }
        @keyframes synth-fade-in {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .synth-field { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .synth-field:has(.synth-wave-row) { align-items: stretch; }
        .synth-knob-svg { cursor: ns-resize; touch-action: none; outline: none; }
        .synth-knob-svg.disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
        .synth-knob-svg:focus-visible { filter: drop-shadow(0 0 3px var(--accent2-glow)); }
        .synth-knob-track { stroke: var(--border); stroke-width: 4; stroke-linecap: round; }
        .synth-knob-fill { stroke: var(--accent1); stroke-width: 4; stroke-linecap: round;
          filter: drop-shadow(0 0 2px var(--accent1-glow)); }
        .synth-knob-cap { fill: var(--control-bg); stroke: var(--border); stroke-width: 1; }
        .synth-knob-pointer { stroke: var(--accent2); stroke-width: 2; stroke-linecap: round; }
        .synth-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--label); }
        .synth-wave-row { display: flex; gap: 4px; flex-wrap: wrap; }
        .synth-wave-btn { flex: 1; font-family: inherit; font-size: 9px; padding: 6px 4px;
          background: var(--control-bg); color: var(--control-text); border: 1px solid var(--border);
          border-radius: 4px; cursor: pointer; transition: 0.15s; min-width: 34px; }
        .synth-wave-btn.active { color: var(--control-bg); background: var(--accent1); border-color: var(--accent1);
          box-shadow: 0 0 8px var(--accent1-glow); }
        .synth-scope { width: 100%; height: 90px; border-radius: 8px; display: block;
          box-shadow: inset 0 0 0 1px var(--border), inset 0 0 12px rgba(0,0,0,0.5); margin-bottom: 12px; }
        .synth-seq { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; margin-bottom: 14px; }
        .synth-step { display: flex; flex-direction: column; gap: 4px; background: var(--panel-2);
          border-radius: 6px; padding: 6px 4px; box-shadow: inset 0 0 0 1px var(--border); align-items: center; }
        .synth-step.on-step { box-shadow: inset 0 0 0 1px var(--accent1), 0 0 6px var(--accent1-glow); }
        .synth-step select { width: 100%; font-family: inherit; font-size: 9px; background: var(--control-bg);
          color: var(--control-text); border: 1px solid var(--border); border-radius: 3px; padding: 3px 2px; }
        .synth-step-idx { font-size: 8px; color: var(--label); }
        .synth-keys { position: relative; display: flex; height: 130px; margin-top: 4px; user-select: none; }
        .synth-key-white { flex: 1; background: var(--key-white); border: 1px solid var(--control-bg);
          border-radius: 0 0 5px 5px; position: relative; display: flex; align-items: flex-end;
          justify-content: center; padding-bottom: 6px; cursor: pointer; }
        .synth-key-white.held { box-shadow: inset 0 0 0 2px var(--accent1); }
        .synth-key-white.sounding { background: var(--accent2); }
        .synth-key-white span { font-size: 9px; color: var(--key-white-label); pointer-events: none; }
        .synth-key-black { position: absolute; top: 0; width: 6.2%; height: 62%; background: var(--key-black);
          border-radius: 0 0 4px 4px; cursor: pointer; display: flex; align-items: flex-end;
          justify-content: center; padding-bottom: 5px; z-index: 2; box-shadow: 0 3px 4px rgba(0,0,0,0.5); }
        .synth-key-black.held { box-shadow: inset 0 0 0 2px var(--accent1), 0 3px 4px rgba(0,0,0,0.5); }
        .synth-key-black.sounding { background: var(--accent1); }
        .synth-key-black span { font-size: 8px; color: var(--key-black-label); pointer-events: none; }
        .synth-hint { margin-top: 10px; font-size: 9px; color: var(--hint); text-align: center; letter-spacing: 0.04em; }
        .synth-fx-row { display: flex; gap: 14px; margin-bottom: 12px; flex-wrap: wrap; }
        .synth-fx-group { flex: 1; min-width: 220px; background: var(--panel-2); border-radius: 10px;
          padding: 12px 16px 14px; box-shadow: inset 0 0 0 1px var(--border); }
        .synth-fx-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .synth-fx-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent1); font-weight: 700; }
        .synth-fx-knobs { display: flex; gap: 18px; flex-wrap: wrap; }
        .synth-patches { margin-bottom: 12px; }
        .synth-save-btn { flex: none; padding: 5px 10px; }
        .synth-patch-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
        .synth-patch-btn { font-family: inherit; font-size: 9px; padding: 8px 4px;
          background: var(--control-bg); color: var(--control-text); border: 1px solid var(--border);
          border-radius: 5px; cursor: pointer; text-align: center; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap; transition: 0.15s; }
        .synth-patch-btn:not(.empty):hover { border-color: var(--accent2); }
        .synth-patch-btn.empty { color: var(--label); border-style: dashed; cursor: default; }
        .synth-patch-btn.save-armed { cursor: pointer; }
        .synth-patch-btn.save-armed:not(.empty) { border-color: var(--accent1); box-shadow: 0 0 6px var(--accent1-glow); }
        .synth-patch-btn.save-armed.empty { color: var(--accent1); border-color: var(--accent1); }
        .synth-patch-btn.active-patch { background: var(--accent1); border-color: var(--accent1);
          color: var(--control-bg); box-shadow: 0 0 8px var(--accent1-glow); }
        .synth-patch-naming { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .synth-patch-naming-label { font-size: 9px; color: var(--label); text-transform: uppercase;
          letter-spacing: 0.06em; white-space: nowrap; }
        .synth-patch-name-input { flex: 1; min-width: 120px; font-family: inherit; font-size: 10px;
          padding: 6px 8px; background: var(--control-bg); color: var(--control-text);
          border: 1px solid var(--accent1); border-radius: 4px; outline: none; }
        .synth-octave-row { display: flex; align-items: center; gap: 8px; margin: 4px 0 6px; }
        .synth-octave-btn { flex: none; width: 28px; padding: 5px 0; font-size: 12px; }
        .synth-octave-btn:disabled { opacity: 0.35; cursor: default; }
        .synth-octave-value { font-size: 11px; color: var(--accent2); min-width: 22px; text-align: center; }
      `}</style>

      <div className="synth-header">
        <span className="synth-title">SIGNAL — {mode === "keys" ? voiceMode : "mono"} synth</span>
        <span className="synth-voice">
          {soundingNote ? `note: ${soundingNote}${octaveShift !== 0 ? ` (oct ${octaveShift > 0 ? "+" : ""}${octaveShift})` : ""}` : "note: —"}
        </span>
      </div>

      <div className="synth-fx-group synth-patches">
        <div className="synth-fx-header">
          <span className="synth-fx-title">Patches</span>
          {savingSlotIndex === null && (
            <div className="synth-wave-row">
              <button type="button" className="synth-wave-btn" onClick={handleRandomize}>random</button>
              <button type="button" className={`synth-wave-btn synth-save-btn${saveMode ? " active" : ""}`}
                onClick={() => setSaveMode((v) => !v)}>{saveMode ? "cancel" : "save"}</button>
            </div>
          )}
        </div>

        {savingSlotIndex !== null ? (
          <div className="synth-patch-naming">
            <span className="synth-patch-naming-label">Save to slot {savingSlotIndex + 1}</span>
            <input
              ref={nameInputRef}
              className="synth-patch-name-input"
              value={patchNameDraft}
              onChange={(e) => setPatchNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmSave();
                if (e.key === "Escape") cancelSave();
              }}
            />
            <button type="button" className="synth-wave-btn synth-save-btn active" onClick={confirmSave}>save</button>
            <button type="button" className="synth-wave-btn synth-save-btn" onClick={cancelSave}>cancel</button>
          </div>
        ) : (
          <div className="synth-patch-grid">
            {presets.map((slot, i) => (
              <button key={i} type="button"
                className={`synth-patch-btn${slot ? "" : " empty"}${saveMode ? " save-armed" : ""}${activePatchIndex === i ? " active-patch" : ""}`}
                onClick={() => handlePatchSlotClick(i)}
                title={slot ? slot.name : saveMode ? "Save here" : "Empty — click to start from a blank slate"}>
                {slot ? slot.name : "—"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="synth-controls">
        <div className="synth-field">
          <span className="synth-label">Waveform</span>
          <div className="synth-wave-row">
            {WAVES.map((w) => (
              <button key={w.type} type="button"
                className={`synth-wave-btn${waveform === w.type ? " active" : ""}`}
                onClick={() => setWaveform(w.type)}>{w.label}</button>
            ))}
          </div>
        </div>

        <div className="synth-field">
          <span className="synth-label">Filter</span>
          <div className="synth-wave-row">
            {(["lowpass", "highpass", "bandpass"] as FilterType[]).map((t) => (
              <button key={t} type="button" className={`synth-wave-btn${filterType === t ? " active" : ""}`}
                onClick={() => setFilterType(t)}>{t === "lowpass" ? "lp" : t === "highpass" ? "hp" : "bp"}</button>
            ))}
          </div>
        </div>

        {filterType !== "lowpass" && (
          <div className="synth-field">
            <span className="synth-label">Blend · {Math.round(filterBlend * 100)}%</span>
            <Knob value={filterBlend} min={0} max={1} step={0.01} onChange={setFilterBlend} ariaLabel="Filter type blend" />
          </div>
        )}

        <div className="synth-field">
          <span className="synth-label">Cutoff · {Math.round(cutoff)}Hz</span>
          <Knob value={cutoff} min={200} max={12000} step={10} onChange={setCutoff} ariaLabel="Filter cutoff" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Resonance · {resonance.toFixed(1)}</span>
          <Knob value={resonance} min={0} max={20} step={0.1} onChange={setResonance} ariaLabel="Resonance" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Filter env · {filterEnvAmount >= 0 ? "+" : ""}{Math.round(filterEnvAmount)}Hz</span>
          <Knob value={filterEnvAmount} min={-4000} max={8000} step={50} bipolarZero={0}
            onChange={setFilterEnvAmount} ariaLabel="Filter envelope amount" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Env decay · {filterEnvDecay.toFixed(2)}s</span>
          <Knob value={filterEnvDecay} min={0.02} max={2} step={0.01} onChange={setFilterEnvDecay} ariaLabel="Filter envelope decay" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Unison · {unisonCount}</span>
          <Knob value={unisonCount} min={1} max={MAX_UNISON} step={1} onChange={setUnisonCount} ariaLabel="Unison voice count" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Detune · {Math.round(detuneAmount)}¢</span>
          <Knob value={detuneAmount} min={0} max={50} step={1} onChange={setDetuneAmount} ariaLabel="Unison detune amount" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Sub · {Math.round(subLevel * 100)}%</span>
          <Knob value={subLevel} min={0} max={1} step={0.01} onChange={setSubLevel} ariaLabel="Sub-oscillator level" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Noise · {Math.round(noiseLevel * 100)}%</span>
          <Knob value={noiseLevel} min={0} max={1} step={0.01} onChange={setNoiseLevel} ariaLabel="Noise layer level" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Attack · {attack.toFixed(2)}s</span>
          <Knob value={attack} min={0.005} max={1.5} step={0.005} onChange={setAttack} ariaLabel="Attack" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Decay · {decay.toFixed(2)}s</span>
          <Knob value={decay} min={0.005} max={2} step={0.01} onChange={setDecay} ariaLabel="Decay" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Sustain · {Math.round(sustain * 100)}%</span>
          <Knob value={sustain} min={0} max={1} step={0.01} onChange={setSustain} ariaLabel="Sustain" />
        </div>

        <div className="synth-field">
          <span className="synth-label">Release · {release.toFixed(2)}s</span>
          <Knob value={release} min={0.02} max={2} step={0.01} onChange={setRelease} ariaLabel="Release" />
        </div>

        {showGlide && (
          <div className="synth-field">
            <span className="synth-label">Glide · {Math.round(glide * 1000)}ms</span>
            <Knob value={glide} min={0} max={0.4} step={0.005} onChange={setGlide} ariaLabel="Glide" />
          </div>
        )}

        {showLegato && (
          <div className="synth-field">
            <span className="synth-label">Legato</span>
            <div className="synth-wave-row">
              <button type="button" className={`synth-wave-btn${legato ? " active" : ""}`} onClick={() => setLegato(true)}>on</button>
              <button type="button" className={`synth-wave-btn${!legato ? " active" : ""}`} onClick={() => setLegato(false)}>off</button>
            </div>
          </div>
        )}

        <div className="synth-field">
          <span className="synth-label">Volume · {Math.round(volume * 100)}%</span>
          <Knob value={volume} min={0} max={1} step={0.01} onChange={setVolume} ariaLabel="Volume" />
        </div>
      </div>

      <div className="synth-controls synth-mode-row">
        <div className="synth-field">
          <span className="synth-label">Mode</span>
          <div className="synth-wave-row">
            {(["keys", "arp", "seq"] as PlayMode[]).map((m) => (
              <button key={m} type="button" className={`synth-wave-btn${mode === m ? " active" : ""}`}
                onClick={() => setMode(m)}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="synth-controls synth-mode-extra" key={mode}>
        {mode === "keys" && (
          <div className="synth-field">
            <span className="synth-label">Voice</span>
            <div className="synth-wave-row">
              {(["mono", "poly"] as VoiceMode[]).map((v) => (
                <button key={v} type="button" className={`synth-wave-btn${voiceMode === v ? " active" : ""}`}
                  onClick={() => setVoiceMode(v)}>{v}</button>
              ))}
            </div>
          </div>
        )}

        {mode !== "keys" && (
          <>
            <div className="synth-field">
              <span className="synth-label">Tempo · {bpm} bpm{bpmLocked ? " (synced)" : ""}</span>
              <Knob value={bpm} min={40} max={240} step={1} onChange={handleBpmChange} ariaLabel="Tempo" disabled={bpmLocked} />
            </div>

            <div className="synth-field">
              <span className="synth-label">Rate</span>
              <div className="synth-wave-row">
                {(["1/4", "1/8", "1/16"] as Rate[]).map((r) => (
                  <button key={r} type="button" className={`synth-wave-btn${rate === r ? " active" : ""}`}
                    onClick={() => setRate(r)}>{r}</button>
                ))}
              </div>
            </div>

            <div className="synth-field">
              <span className="synth-label">Gate · {Math.round(gate * 100)}%</span>
              <Knob value={gate} min={0.1} max={1} step={0.05} onChange={setGate} ariaLabel="Gate length" />
            </div>
          </>
        )}

        {mode === "arp" && (
          <>
            <div className="synth-field">
              <span className="synth-label">Pattern</span>
              <div className="synth-wave-row">
                {(["up", "down", "updown", "random"] as ArpPattern[]).map((p) => (
                  <button key={p} type="button" className={`synth-wave-btn${arpPattern === p ? " active" : ""}`}
                    onClick={() => setArpPattern(p)}>{p === "updown" ? "up-dn" : p}</button>
                ))}
              </div>
            </div>
            <div className="synth-field">
              <span className="synth-label">Octaves</span>
              <div className="synth-wave-row">
                {[1, 2, 3].map((o) => (
                  <button key={o} type="button" className={`synth-wave-btn${arpOctaves === o ? " active" : ""}`}
                    onClick={() => setArpOctaves(o)}>{o}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="synth-fx-row">
        <div className="synth-fx-group">
          <div className="synth-fx-header">
            <span className="synth-fx-title">Chorus</span>
            <div className="synth-wave-row">
              <button type="button" className={`synth-wave-btn${chorusOn ? " active" : ""}`} onClick={() => setChorusOn(true)}>on</button>
              <button type="button" className={`synth-wave-btn${!chorusOn ? " active" : ""}`} onClick={() => setChorusOn(false)}>off</button>
            </div>
          </div>
          <div className="synth-fx-knobs">
            <div className="synth-field">
              <span className="synth-label">Rate · {chorusRate.toFixed(2)}Hz</span>
              <Knob value={chorusRate} min={0.05} max={3} step={0.05} onChange={setChorusRate} ariaLabel="Chorus rate" />
            </div>
            <div className="synth-field">
              <span className="synth-label">Depth · {Math.round(chorusDepth * 100)}%</span>
              <Knob value={chorusDepth} min={0} max={1} step={0.01} onChange={setChorusDepth} ariaLabel="Chorus depth" />
            </div>
            <div className="synth-field">
              <span className="synth-label">Mix · {Math.round(chorusMix * 100)}%</span>
              <Knob value={chorusMix} min={0} max={1} step={0.01} onChange={setChorusMix} ariaLabel="Chorus mix" />
            </div>
          </div>
        </div>

        <div className="synth-fx-group">
          <div className="synth-fx-header">
            <span className="synth-fx-title">Delay</span>
            <div className="synth-wave-row">
              <button type="button" className={`synth-wave-btn${delayOn ? " active" : ""}`} onClick={() => setDelayOn(true)}>on</button>
              <button type="button" className={`synth-wave-btn${!delayOn ? " active" : ""}`} onClick={() => setDelayOn(false)}>off</button>
            </div>
          </div>
          <div className="synth-fx-knobs">
            <div className="synth-field">
              <span className="synth-label">Time · {Math.round(delayTime * 1000)}ms</span>
              <Knob value={delayTime} min={0.02} max={1} step={0.01} onChange={setDelayTime} ariaLabel="Delay time" />
            </div>
            <div className="synth-field">
              <span className="synth-label">Feedback · {Math.round(delayFeedback * 100)}%</span>
              <Knob value={delayFeedback} min={0} max={0.9} step={0.01} onChange={setDelayFeedback} ariaLabel="Delay feedback" />
            </div>
            <div className="synth-field">
              <span className="synth-label">Mix · {Math.round(delayMix * 100)}%</span>
              <Knob value={delayMix} min={0} max={1} step={0.01} onChange={setDelayMix} ariaLabel="Delay mix" />
            </div>
          </div>
        </div>

        <div className="synth-fx-group">
          <div className="synth-fx-header">
            <span className="synth-fx-title">Reverb</span>
            <div className="synth-wave-row">
              <button type="button" className={`synth-wave-btn${reverbOn ? " active" : ""}`} onClick={() => setReverbOn(true)}>on</button>
              <button type="button" className={`synth-wave-btn${!reverbOn ? " active" : ""}`} onClick={() => setReverbOn(false)}>off</button>
            </div>
          </div>
          <div className="synth-fx-knobs">
            <div className="synth-field">
              <span className="synth-label">Size · {reverbSize.toFixed(1)}s</span>
              <Knob value={reverbSize} min={0.5} max={6} step={0.1} onChange={setReverbSize} ariaLabel="Reverb size" />
            </div>
            <div className="synth-field">
              <span className="synth-label">Mix · {Math.round(reverbMix * 100)}%</span>
              <Knob value={reverbMix} min={0} max={1} step={0.01} onChange={setReverbMix} ariaLabel="Reverb mix" />
            </div>
          </div>
        </div>
        <div className="synth-fx-group">
          <div className="synth-fx-header">
            <span className="synth-fx-title">LFO</span>
            <div className="synth-wave-row">
              {(["off", "filter", "pitch", "amp"] as LfoTarget[]).map((t) => (
                <button key={t} type="button" className={`synth-wave-btn${lfoTarget === t ? " active" : ""}`}
                  onClick={() => setLfoTarget(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="synth-fx-knobs">
            <div className="synth-field">
              <span className="synth-label">Rate · {lfoRate.toFixed(1)}Hz</span>
              <Knob value={lfoRate} min={0.05} max={12} step={0.05} onChange={setLfoRate} ariaLabel="LFO rate" />
            </div>
            <div className="synth-field">
              <span className="synth-label">Depth · {Math.round(lfoDepth * 100)}%</span>
              <Knob value={lfoDepth} min={0} max={1} step={0.01} onChange={setLfoDepth} ariaLabel="LFO depth" />
            </div>
          </div>
        </div>
      </div>

      {mode === "seq" && (
        <div className="synth-seq">
          {seqSteps.map((step, i) => (
            <div key={i} className={`synth-step${currentStep === i ? " on-step" : ""}`}>
              <span className="synth-step-idx">{i + 1}</span>
              <select value={step.note ?? ""} onChange={(e) => updateSeqStep(i, e.target.value)}>
                <option value="">off</option>
                {KEYS.map((k) => (
                  <option key={k.note} value={k.note}>{k.note}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <canvas ref={canvasRef} className="synth-scope" width={680} height={90} />

      <div className="synth-octave-row">
        <span className="synth-label">Octave</span>
        <button type="button" className="synth-wave-btn synth-octave-btn"
          onClick={() => setOctaveShift((v) => Math.max(-3, v - 1))} disabled={octaveShift <= -3}>−</button>
        <span className="synth-octave-value">{octaveShift > 0 ? `+${octaveShift}` : octaveShift}</span>
        <button type="button" className="synth-wave-btn synth-octave-btn"
          onClick={() => setOctaveShift((v) => Math.min(3, v + 1))} disabled={octaveShift >= 3}>+</button>
      </div>

      <div className="synth-keys">
        {KEYS.filter((k) => !k.isSharp).map((key) => {
          const isSounding =
            mode === "keys" && voiceMode === "poly" ? polyActiveNotes.has(key.note) : soundingNote === key.note;
          return (
            <div key={key.note}
              className={`synth-key-white${heldKeys.has(key.note) ? " held" : ""}${isSounding ? " sounding" : ""}`}
              onMouseDown={() => handlePress(key.note)}
              onMouseUp={() => handleRelease(key.note)}
              onMouseLeave={() => handleRelease(key.note)}
              onTouchStart={(e) => { e.preventDefault(); handlePress(key.note); }}
              onTouchEnd={(e) => { e.preventDefault(); handleRelease(key.note); }}>
              <span>{key.computerKey.toUpperCase()}</span>
            </div>
          );
        })}
        {KEYS.filter((k) => k.isSharp).map((key) => {
          const whiteBefore = KEYS.filter((k) => !k.isSharp).findIndex(
            (w) => NOTE_ORDER.indexOf(w.note) === NOTE_ORDER.indexOf(key.note) - 1,
          );
          const whiteKeyCount = KEYS.filter((k) => !k.isSharp).length;
          const leftPct = ((whiteBefore + 1) / whiteKeyCount) * 100 - 6.2 * 0.5;
          const isSounding =
            mode === "keys" && voiceMode === "poly" ? polyActiveNotes.has(key.note) : soundingNote === key.note;
          return (
            <div key={key.note} style={{ left: `${leftPct}%` }}
              className={`synth-key-black${heldKeys.has(key.note) ? " held" : ""}${isSounding ? " sounding" : ""}`}
              onMouseDown={() => handlePress(key.note)}
              onMouseUp={() => handleRelease(key.note)}
              onMouseLeave={() => handleRelease(key.note)}
              onTouchStart={(e) => { e.preventDefault(); handlePress(key.note); }}
              onTouchEnd={(e) => { e.preventDefault(); handleRelease(key.note); }}>
              <span>{key.computerKey.toUpperCase()}</span>
            </div>
          );
        })}
      </div>

      <div className="synth-hint">
        {mode === "keys" && voiceMode === "mono" && "mono voice, last-note priority. play with your keyboard or click the keys"}
        {mode === "keys" && voiceMode === "poly" && "poly voice — hold multiple keys for real chords"}
        {mode === "arp" && "hold a chord on the keys — the arp plays through it. amber ring = held, teal/amber fill = sounding"}
        {mode === "seq" && "click a step to set its note. steps light up as the pattern plays"}
      </div>
    </div>
  );
}
