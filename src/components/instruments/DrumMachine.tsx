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
import { SKIN_PALETTES, skinToCssVars, type SkinName } from "./skins";
import { TutorialOverlay, type TutorialStep } from "./Tutorial";

/**
 * DrumMachine — a small hardware-styled 16-step drum machine.
 *
 * Standalone by design (no imports from Synth.tsx itself — only the
 * shared skin palettes in ./skins.ts and the shared tutorial overlay in
 * ./Tutorial.tsx, both narrow utilities with no dependency on the other
 * instruments) so it can be dropped into a project on its own and run
 * independently. Every sound is synthesized live via the Web Audio API —
 * no samples, no audio files.
 *
 * "Playing in tandem" with Synth.tsx just means mounting both — each
 * keeps its own AudioContext, so they mix together in the browser's
 * audio output automatically with zero extra wiring. See the bottom of
 * this file for a small example. They do NOT currently share a clock —
 * each runs its own independent setInterval-based scheduler, so if you
 * want the drum pattern and the synth's Arp/Seq locked to the exact same
 * BPM and phase, that's a natural next step (lift a shared bpm/transport
 * into a parent and pass it down) rather than something built in yet.
 *
 * Tracks: Kick, Snare, Closed Hat, Open Hat, Clap — 16 steps each.
 *
 * Live performance: number keys 1-5 (or clicking a row's label) fire that
 * track once immediately, independent of the sequencer — MPC-pad style
 * finger-drumming over the pattern. Spacebar toggles play/stop. Keydowns
 * are ignored while an input/textarea/select has focus so this doesn't
 * hijack typing elsewhere on the page (e.g. Synth's patch-name field).
 *
 * Recording: no UI of its own — the master bus is permanently tapped into
 * a MediaStreamAudioDestinationNode alongside (not instead of)
 * ctx.destination, exposed via `getOutputStream()` on the component ref
 * (see DrumMachineHandle). A parent — StudioExample.tsx — pulls this
 * stream (and Synth's) into its own combined "record session" recorder,
 * without the two instruments sharing a clock or AudioContext.
 *
 * `onStep`: fires from inside the scheduler's own tick, at the moment a
 * step is actually triggered — a parent can use it to drive a visual
 * (e.g. a beat-synced page accent) off the real audio clock rather than
 * running a second, independently-drifting timer.
 */

type TrackName = "kick" | "snare" | "closedHat" | "openHat" | "clap";

const TRACKS: { id: TrackName; label: string }[] = [
  { id: "kick", label: "Kick" },
  { id: "snare", label: "Snare" },
  { id: "closedHat", label: "Cl Hat" },
  { id: "openHat", label: "Op Hat" },
  { id: "clap", label: "Clap" },
];

const STEP_COUNT = 16;

const KEY_TO_TRACK: Record<string, TrackName> = {
  "1": "kick",
  "2": "snare",
  "3": "closedHat",
  "4": "openHat",
  "5": "clap",
};

// --- Kits ----------------------------------------------------------
// Two tuning tables for the same synthesis functions below (triggerKick
// etc.) rather than two separate sets of functions — "808" isn't a sample
// swap, it's deeper/longer kick, tighter/higher snare, shorter/brighter
// hats and a snappier clap, all still generated live.
type KitName = "acoustic" | "eightOhEight";
const KIT_NAMES: KitName[] = ["acoustic", "eightOhEight"];

interface KitParams {
  kickStart: number;
  kickEnd: number;
  kickPitchDecay: number;
  kickAmpDecay: number;
  snareToneFreq: number;
  snareToneDecay: number;
  snareNoiseHighpass: number;
  snareNoiseDecay: number;
  hatHighpass: number;
  hatClosedDecay: number;
  hatOpenDecay: number;
  clapBandpass: number;
  clapQ: number;
  clapDecay: number;
}

const KIT_PARAMS: Record<KitName, KitParams> = {
  acoustic: {
    kickStart: 150, kickEnd: 42, kickPitchDecay: 0.15, kickAmpDecay: 0.32,
    snareToneFreq: 190, snareToneDecay: 0.1, snareNoiseHighpass: 1000, snareNoiseDecay: 0.15,
    hatHighpass: 7000, hatClosedDecay: 0.045, hatOpenDecay: 0.28,
    clapBandpass: 1200, clapQ: 1.2, clapDecay: 0.08,
  },
  eightOhEight: {
    kickStart: 190, kickEnd: 32, kickPitchDecay: 0.32, kickAmpDecay: 0.6,
    snareToneFreq: 240, snareToneDecay: 0.05, snareNoiseHighpass: 2200, snareNoiseDecay: 0.08,
    hatHighpass: 9500, hatClosedDecay: 0.03, hatOpenDecay: 0.15,
    clapBandpass: 1600, clapQ: 2, clapDecay: 0.05,
  },
};

// A basic four-on-the-floor-ish starter groove so it's musical immediately.
const DEFAULT_PATTERN: Record<TrackName, boolean[]> = {
  kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  closedHat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
  openHat: [false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true],
  clap: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
};

function makeNoiseBuffer(ctx: AudioContext, seconds: number = 1): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// --- Drum synthesis -------------------------------------------------
// Each of these fires a self-contained, self-cleaning burst of nodes at
// a scheduled time. Classic 808/909-style synthesis techniques — a
// pitch-dropping sine for the kick, filtered noise for hats/snare/clap.

function triggerKick(ctx: AudioContext, dest: AudioNode, time: number, vol: number, k: KitParams) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(k.kickStart, time);
  osc.frequency.exponentialRampToValueAtTime(k.kickEnd, time + k.kickPitchDecay);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + k.kickAmpDecay);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + k.kickAmpDecay + 0.03);
}

function triggerSnare(ctx: AudioContext, dest: AudioNode, time: number, vol: number, noiseBuffer: AudioBuffer, k: KitParams) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = k.snareNoiseHighpass;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(vol * 0.7, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + k.snareNoiseDecay);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(dest);
  noise.start(time);
  noise.stop(time + k.snareNoiseDecay + 0.03);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = k.snareToneFreq;
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(vol * 0.5, time);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, time + k.snareToneDecay);
  osc.connect(oscGain);
  oscGain.connect(dest);
  osc.start(time);
  osc.stop(time + k.snareToneDecay + 0.02);
}

function triggerHat(ctx: AudioContext, dest: AudioNode, time: number, vol: number, noiseBuffer: AudioBuffer, open: boolean, k: KitParams) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = k.hatHighpass;
  const gain = ctx.createGain();
  const decay = open ? k.hatOpenDecay : k.hatClosedDecay;
  gain.gain.setValueAtTime(vol * 0.45, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  noise.connect(hp);
  hp.connect(gain);
  gain.connect(dest);
  noise.start(time);
  noise.stop(time + decay + 0.02);
}

function triggerClap(ctx: AudioContext, dest: AudioNode, time: number, vol: number, noiseBuffer: AudioBuffer, k: KitParams) {
  // A few quick offset noise bursts through a bandpass filter — the
  // slight flutter is what reads as a "clap" rather than a plain hit.
  for (let i = 0; i < 3; i++) {
    const offset = i * 0.011;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = k.clapBandpass;
    bp.Q.value = k.clapQ;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.45, time + offset);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + offset + k.clapDecay);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(dest);
    noise.start(time + offset);
    noise.stop(time + offset + k.clapDecay + 0.02);
  }
}

// --- Compact rotary knob (self-contained copy — see Synth.tsx for the
// annotated original if you're wiring both into the same project) -----
const KNOB_MIN_ANGLE = -135;
const KNOB_MAX_ANGLE = 135;
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
  size?: number;
  ariaLabel: string;
  disabled?: boolean;
}

function Knob({ value, min, max, step = 0, onChange, size = 44, ariaLabel, disabled = false }: KnobProps) {
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
    onChange(clampStep(dragRef.current.startValue + (deltaY / 140) * (max - min)));
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
  const angle = KNOB_MIN_ANGLE + (Math.min(1, Math.max(0, (value - min) / (max - min))) * (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE));
  const pointer = polarToCartesian(cx, cy, r - 3, angle);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`dm-knob-svg${disabled ? " disabled" : ""}`} tabIndex={disabled ? -1 : 0} role="slider"
      aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-label={ariaLabel}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={endDrag}
      onPointerCancel={endDrag} onWheel={handleWheel} onKeyDown={handleKeyDown}>
      <path d={describeArc(cx, cy, r, KNOB_MIN_ANGLE, KNOB_MAX_ANGLE)} className="dm-knob-track" fill="none" />
      {describeArc(cx, cy, r, KNOB_MIN_ANGLE, angle) && (
        <path d={describeArc(cx, cy, r, KNOB_MIN_ANGLE, angle)} className="dm-knob-fill" fill="none" />
      )}
      <circle cx={cx} cy={cy} r={r - 10} className="dm-knob-cap" />
      <line x1={cx} y1={cy} x2={pointer.x} y2={pointer.y} className="dm-knob-pointer" />
    </svg>
  );
}

const clampNum = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

function sanitizeDrumPattern(raw: unknown): Record<TrackName, boolean[]> {
  if (!raw || typeof raw !== "object") return DEFAULT_PATTERN;
  const r = raw as Record<string, unknown>;
  const out = {} as Record<TrackName, boolean[]>;
  for (const track of TRACKS) {
    const arr = r[track.id];
    out[track.id] = Array.isArray(arr) && arr.length === STEP_COUNT ? arr.map((v) => v === true) : DEFAULT_PATTERN[track.id];
  }
  return out;
}

/** Full state snapshot — pattern plus every knob — for a shareable jam link (see StudioExample.tsx). */
export interface DrumMachineState {
  pattern: Record<TrackName, boolean[]>;
  volume: number;
  swing: number;
  kit: KitName;
  bpm: number;
}

/** Imperative handle exposed via `ref` — lets a parent (StudioExample.tsx) pull this instrument's live output into its own combined recording, or trigger a hands-free demo. */
export interface DrumMachineHandle {
  /** Returns the drum machine's permanently-tapped master-bus stream, creating its AudioContext first if needed. */
  getOutputStream: () => MediaStream;
  /** Loads the starter groove and starts the sequencer — no step programming required. */
  playDemo: () => void;
  /** Stops the sequencer (used to stop the demo). */
  stop: () => void;
  /** Snapshots pattern, volume, swing, kit, and tempo for a shareable jam link. */
  getState: () => DrumMachineState;
  /** Restores a snapshot from getState(). Doesn't start the sequencer itself — see `play`. */
  loadState: (state: DrumMachineState) => void;
  /** Starts the sequencer on whatever pattern is currently loaded, without resetting it — used to start a loaded jam link from a real click. */
  play: () => void;
}

interface DrumMachineProps {
  /** If provided, the drum machine's tempo tracks this value instead of managing its own — for syncing with another instrument (see StudioExample.tsx). */
  bpm?: number;
  /** Fires when the user adjusts the local Tempo knob — only meaningful when `bpm` is not also locked via `bpmLocked`. */
  onBpmChange?: (bpm: number) => void;
  /** When true, disables the local Tempo knob (it's being driven externally, so local editing would just fight the shared value). */
  bpmLocked?: boolean;
  /** Which shared skin palette (see ./skins.ts) to render with. Defaults to "basic" when omitted, so the drum machine still looks right standalone. */
  skin?: SkinName;
  /** Fires on every scheduled step while playing, right as it's triggered — lets a parent sync a visual (e.g. a beat-synced page accent) to the real audio clock instead of guessing at timing with its own timer. */
  onStep?: (step: number) => void;
  ref?: Ref<DrumMachineHandle>;
}

// Two stops — this panel really only has two conceptual areas. See
// Synth.tsx for the fuller rationale on why these point at existing
// wrapper elements via `data-tutorial` rather than a dedicated one.
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: '[data-tutorial="dm-transport"]',
    title: "Transport",
    body: "Play/stop, tempo, volume, and swing (delays the off-beat 16ths for groove). Switch drum kits, or hit clear to wipe the pattern.",
  },
  {
    target: '[data-tutorial="dm-grid"]',
    title: "Pattern grid",
    body: "Click a step to toggle it — 16 steps per row, groups of 4 mark the beat. Click a row's label (Kick, Snare…) to preview that drum live.",
  },
];

export default function DrumMachine({
  bpm: externalBpm,
  onBpmChange,
  bpmLocked = false,
  skin = "basic",
  onStep,
  ref,
}: DrumMachineProps = {}) {
  const [pattern, setPattern] = useState<Record<TrackName, boolean[]>>(DEFAULT_PATTERN);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [internalBpm, setInternalBpm] = useState(112);
  const bpm = externalBpm ?? internalBpm;
  const handleBpmChange = (v: number) => {
    if (externalBpm === undefined) setInternalBpm(v);
    onBpmChange?.(v);
  };
  const [volume, setVolume] = useState(0.7);
  const [swing, setSwing] = useState(0);
  const [kit, setKit] = useState<KitName>("acoustic");
  const [liveHit, setLiveHit] = useState<TrackName | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const closeTutorial = () => setTutorialStep(null);
  const nextTutorialStep = () =>
    setTutorialStep((s) => (s === null ? null : s >= TUTORIAL_STEPS.length - 1 ? null : s + 1));
  const prevTutorialStep = () => setTutorialStep((s) => (s === null ? null : Math.max(0, s - 1)));

  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const recordStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const patternRef = useRef(pattern);
  const volumeRef = useRef(volume);
  const swingRef = useRef(swing);
  const kitRef = useRef(kit);
  const bpmRef = useRef(bpm);
  const onStepRef = useRef(onStep);
  patternRef.current = pattern;
  volumeRef.current = volume;
  swingRef.current = swing;
  kitRef.current = kit;
  bpmRef.current = bpm;
  onStepRef.current = onStep;

  const ensureAudioGraph = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volumeRef.current;
    masterGain.connect(ctx.destination);
    // Permanent recording tap (see file header) — connected once, never torn
    // down, so a parent's getOutputStream() call always has a live stream
    // ready without any per-recording graph surgery.
    const recordDest = ctx.createMediaStreamDestination();
    masterGain.connect(recordDest);
    recordStreamDestRef.current = recordDest;
    ctxRef.current = ctx;
    masterGainRef.current = masterGain;
    noiseBufferRef.current = makeNoiseBuffer(ctx);
    return ctx;
    // Reads volume via ref (not the closure directly) so this callback's
    // identity never changes after mount — it flows into the scheduler
    // effect below, and depending on `volume` directly used to mean
    // turning the Volume knob mid-groove would restart the sequencer and
    // snap the pattern back to step 0.
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
        setPattern(DEFAULT_PATTERN);
        setIsPlaying(true);
      },
      stop: () => {
        setIsPlaying(false);
      },
      getState: () => ({
        pattern: patternRef.current,
        volume: volumeRef.current,
        swing: swingRef.current,
        kit: kitRef.current,
        bpm: bpmRef.current,
      }),
      loadState: (state) => {
        setPattern(sanitizeDrumPattern(state?.pattern));
        setVolume(clampNum(state?.volume, 0, 1, 0.7));
        setSwing(clampNum(state?.swing, 0, 70, 0));
        setKit(KIT_NAMES.includes(state?.kit) ? state.kit : "acoustic");
        if (externalBpm === undefined) setInternalBpm(Math.round(clampNum(state?.bpm, 60, 200, 112)));
      },
      play: () => {
        const ctx = ensureAudioGraph();
        if (ctx.state === "suspended") ctx.resume();
        setIsPlaying(true);
      },
    }),
    [ensureAudioGraph, externalBpm],
  );

  useEffect(() => {
    masterGainRef.current?.gain.setTargetAtTime(volume, ctxRef.current?.currentTime ?? 0, 0.02);
  }, [volume]);

  const toggleStep = (track: TrackName, step: number) => {
    setPattern((prev) => ({
      ...prev,
      [track]: prev[track].map((v, i) => (i === step ? !v : v)),
    }));
  };

  const clearPattern = () => {
    setPattern({
      kick: Array(STEP_COUNT).fill(false),
      snare: Array(STEP_COUNT).fill(false),
      closedHat: Array(STEP_COUNT).fill(false),
      openHat: Array(STEP_COUNT).fill(false),
      clap: Array(STEP_COUNT).fill(false),
    });
  };

  const liveHitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTrigger = useCallback(
    (track: TrackName) => {
      const ctx = ensureAudioGraph();
      if (ctx.state === "suspended") ctx.resume();
      const dest = masterGainRef.current!;
      const noiseBuffer = noiseBufferRef.current!;
      const time = ctx.currentTime + 0.01;
      const vol = volumeRef.current;
      const k = KIT_PARAMS[kitRef.current];
      if (track === "kick") triggerKick(ctx, dest, time, vol, k);
      else if (track === "snare") triggerSnare(ctx, dest, time, vol, noiseBuffer, k);
      else if (track === "closedHat") triggerHat(ctx, dest, time, vol, noiseBuffer, false, k);
      else if (track === "openHat") triggerHat(ctx, dest, time, vol, noiseBuffer, true, k);
      else if (track === "clap") triggerClap(ctx, dest, time, vol, noiseBuffer, k);

      setLiveHit(track);
      if (liveHitTimeoutRef.current) clearTimeout(liveHitTimeoutRef.current);
      liveHitTimeoutRef.current = setTimeout(() => setLiveHit(null), 140);
    },
    [ensureAudioGraph],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.repeat) return;
      const track = KEY_TO_TRACK[e.key];
      if (track) {
        e.preventDefault();
        liveTrigger(track);
        return;
      }
      if (e.key === " " && tag !== "BUTTON") {
        e.preventDefault();
        setIsPlaying((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [liveTrigger]);

  // Scheduler — same plain-setInterval approach as the synth's arp/seq:
  // musically close enough for a groove, not sample-accurate. A tiny
  // lookahead (20ms) on each trigger avoids scheduling right at "now",
  // which can clip on some browsers.
  //
  // Swing: the JS interval itself stays perfectly even (it's just the
  // "grid" pulse) — swing is applied by pushing back the audio trigger
  // time on every off-beat 16th (odd step index), which is what MPC-style
  // swing means in practice. Read via a ref so dragging the knob mid-groove
  // doesn't restart the scheduler the way changing `bpm` does.
  useEffect(() => {
    if (!isPlaying) return;
    const ctx = ensureAudioGraph();
    if (ctx.state === "suspended") ctx.resume();
    const stepMs = 60000 / bpm / 4; // 16th notes
    let step = 0;

    const tick = () => {
      const dest = masterGainRef.current!;
      const noiseBuffer = noiseBufferRef.current!;
      const swingDelay = step % 2 === 1 ? (swingRef.current / 100) * (stepMs / 1000) : 0;
      const time = ctx.currentTime + 0.02 + swingDelay;
      const vol = volumeRef.current;
      const steps = patternRef.current;
      const k = KIT_PARAMS[kitRef.current];
      setCurrentStep(step);
      onStepRef.current?.(step);
      if (steps.kick[step]) triggerKick(ctx, dest, time, vol, k);
      if (steps.snare[step]) triggerSnare(ctx, dest, time, vol, noiseBuffer, k);
      if (steps.closedHat[step]) triggerHat(ctx, dest, time, vol, noiseBuffer, false, k);
      if (steps.openHat[step]) triggerHat(ctx, dest, time, vol, noiseBuffer, true, k);
      if (steps.clap[step]) triggerClap(ctx, dest, time, vol, noiseBuffer, k);
      step = (step + 1) % STEP_COUNT;
    };

    tick();
    const id = setInterval(tick, stepMs);
    return () => {
      clearInterval(id);
      setCurrentStep(-1);
    };
  }, [isPlaying, bpm, ensureAudioGraph]);

  return (
    <div className="dm-root" ref={rootRef} style={skinToCssVars(SKIN_PALETTES[skin])}>
      <style>{`
        .dm-root {
          font-family: 'JetBrains Mono', 'Space Mono', monospace;
          color: var(--text); background: var(--panel); border-radius: 14px;
          padding: 20px 22px 24px; max-width: 720px;
          box-shadow: inset 0 0 0 1px var(--border), 0 12px 30px rgba(0,0,0,0.35);
        }
        .dm-header { display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 14px; letter-spacing: 0.06em; }
        .dm-header-left { display: flex; align-items: baseline; gap: 10px; }
        .dm-title { font-size: 13px; font-weight: 700; color: var(--accent1); }
        .dm-sub { font-size: 10px; color: var(--label); }
        .dm-tutorial-btn { font-family: inherit; font-size: 9px; padding: 3px 8px; border-radius: 4px;
          cursor: pointer; letter-spacing: 0.05em; text-transform: uppercase; background: transparent;
          color: var(--accent2); border: 1px solid var(--border); transition: border-color 0.15s; }
        .dm-tutorial-btn:hover { border-color: var(--accent2); }
        .dm-transport { display: flex; align-items: center; gap: 14px; background: var(--panel-2);
          border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; box-shadow: inset 0 0 0 1px var(--border);
          flex-wrap: wrap; }
        .dm-play-btn { font-family: inherit; font-size: 11px; font-weight: 700; padding: 8px 18px;
          background: var(--control-bg); color: var(--control-text); border: 1px solid var(--border);
          border-radius: 6px; cursor: pointer; letter-spacing: 0.05em; }
        .dm-play-btn.active { background: var(--accent1); color: var(--control-bg); border-color: var(--accent1);
          box-shadow: 0 0 8px var(--accent1-glow); }
        .dm-clear-btn { font-family: inherit; font-size: 9px; padding: 7px 12px; background: var(--control-bg);
          color: var(--control-text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
        .dm-kit-row { display: flex; gap: 4px; }
        .dm-kit-btn { font-family: inherit; font-size: 9px; padding: 6px 8px; background: var(--control-bg);
          color: var(--control-text); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; }
        .dm-kit-btn.active { color: var(--control-bg); background: var(--accent1); border-color: var(--accent1);
          box-shadow: 0 0 8px var(--accent1-glow); }
        .dm-field { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .dm-field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--label); }
        .dm-knob-svg { cursor: ns-resize; touch-action: none; outline: none; }
        .dm-knob-svg.disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
        .dm-knob-track { stroke: var(--border); stroke-width: 4; stroke-linecap: round; }
        .dm-knob-fill { stroke: var(--accent1); stroke-width: 4; stroke-linecap: round;
          filter: drop-shadow(0 0 2px var(--accent1-glow)); }
        .dm-knob-cap { fill: var(--control-bg); stroke: var(--border); stroke-width: 1; }
        .dm-knob-pointer { stroke: var(--accent2); stroke-width: 2; stroke-linecap: round; }
        .dm-grid { display: flex; flex-direction: column; gap: 6px; }
        .dm-row { display: flex; align-items: center; gap: 8px; }
        .dm-row-label { width: 52px; flex: none; font-size: 9px; color: var(--label);
          text-transform: uppercase; letter-spacing: 0.04em; font-family: inherit;
          background: none; border: none; padding: 4px 0; text-align: left; cursor: pointer; }
        .dm-row-label.live-hit { color: var(--accent2); text-shadow: 0 0 6px var(--accent2-glow); }
        .dm-steps { display: flex; gap: 4px; flex: 1; }
        .dm-step { flex: 1; aspect-ratio: 1; min-width: 16px; border-radius: 3px;
          background: var(--control-bg); border: 1px solid var(--border); cursor: pointer; padding: 0; }
        .dm-step.beat-start { border-left-color: var(--label); }
        .dm-step.on { background: var(--accent1); border-color: var(--accent1); box-shadow: 0 0 6px var(--accent1-glow); }
        .dm-step.playhead { outline: 2px solid var(--accent2); outline-offset: 1px; }
        .dm-hint { margin-top: 12px; font-size: 9px; color: var(--hint); text-align: center; letter-spacing: 0.04em; }
      `}</style>

      <div className="dm-header">
        <div className="dm-header-left">
          <span className="dm-title">SIGNAL — drum machine</span>
          <button type="button" className="dm-tutorial-btn" onClick={() => setTutorialStep(0)}>
            tutorial
          </button>
        </div>
        <span className="dm-sub">{isPlaying ? `step ${currentStep + 1}/${STEP_COUNT}` : "stopped"}</span>
      </div>

      {tutorialStep !== null && (
        <TutorialOverlay
          rootRef={rootRef}
          steps={TUTORIAL_STEPS}
          stepIndex={tutorialStep}
          onNext={nextTutorialStep}
          onBack={prevTutorialStep}
          onClose={closeTutorial}
        />
      )}

      <div className="dm-transport" data-tutorial="dm-transport">
        <button type="button" className={`dm-play-btn${isPlaying ? " active" : ""}`}
          onClick={() => setIsPlaying((v) => !v)}>{isPlaying ? "stop" : "play"}</button>

        <div className="dm-field">
          <span className="dm-field-label">Tempo · {bpm} bpm{bpmLocked ? " (synced)" : ""}</span>
          <Knob value={bpm} min={60} max={200} step={1} onChange={handleBpmChange} ariaLabel="Tempo" disabled={bpmLocked} />
        </div>

        <div className="dm-field">
          <span className="dm-field-label">Volume · {Math.round(volume * 100)}%</span>
          <Knob value={volume} min={0} max={1} step={0.01} onChange={setVolume} ariaLabel="Volume" />
        </div>

        <div className="dm-field">
          <span className="dm-field-label">Swing · {swing}%</span>
          <Knob value={swing} min={0} max={70} step={1} onChange={setSwing} ariaLabel="Swing" />
        </div>

        <div className="dm-field">
          <span className="dm-field-label">Kit</span>
          <div className="dm-kit-row">
            <button type="button" className={`dm-kit-btn${kit === "acoustic" ? " active" : ""}`}
              onClick={() => setKit("acoustic")} title="Acoustic-style kit">kit 1</button>
            <button type="button" className={`dm-kit-btn${kit === "eightOhEight" ? " active" : ""}`}
              onClick={() => setKit("eightOhEight")} title="Deeper 808-style kit">808</button>
          </div>
        </div>

        <button type="button" className="dm-clear-btn" onClick={clearPattern}>clear</button>
      </div>

      <div className="dm-grid" data-tutorial="dm-grid">
        {TRACKS.map((track) => (
          <div key={track.id} className="dm-row">
            <button
              type="button"
              className={`dm-row-label${liveHit === track.id ? " live-hit" : ""}`}
              onClick={() => liveTrigger(track.id)}
              title={`Play ${track.label} live`}
            >
              {track.label}
            </button>
            <div className="dm-steps">
              {pattern[track.id].map((on, i) => (
                <button
                  key={i}
                  type="button"
                  className={`dm-step${on ? " on" : ""}${currentStep === i ? " playhead" : ""}`}
                  onClick={() => toggleStep(track.id, i)}
                  title={`${track.label} · step ${i + 1}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="dm-hint">
        click a step to toggle it · groups of 4 mark the beat · swing delays the off-beat 16ths · keys 1-5 or a row
        label play that drum live · space toggles play
      </div>
    </div>
  );
}
