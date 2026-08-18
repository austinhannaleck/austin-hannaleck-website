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

/**
 * Bassline — a 16-step monophonic acid-bass sequencer, TB-303-inspired:
 * a saw/square oscillator through one resonant lowpass filter with its
 * own decay envelope, plus per-step accent (louder + brighter) and slide
 * (portamento into the next note) — the classic "squelch" comes from
 * cranking Resonance and Env Mod together.
 *
 * Sub oscillator: a plain sine one octave below the main osc (see
 * `Sub Level`), mixed in *after* the filter so Cutoff/Resonance never
 * touch it, but still through the shared `ampGain` — it rides the exact
 * same per-note envelope as the filtered voice for free, no separate
 * envelope automation needed. It's what gives the low end weight the
 * filtered oscillator alone can't really deliver.
 *
 * Standalone by design, same conventions as DrumMachine.tsx: its own
 * AudioContext, a permanent recording tap exposed via `getOutputStream()`,
 * and `playDemo()`/`stop()` for StudioExample's hands-free demo. See
 * DrumMachine.tsx for the fuller rationale on those patterns — not
 * re-explained here to avoid drift between two copies of the same comment.
 *
 * Persistent mono voice: unlike DrumMachine's one-shot-per-hit synthesis,
 * the oscillator/filter/amp chain here is created once and lives for the
 * whole session (same idea as Synth.tsx's mono voice) — required for
 * slide to work as a real pitch glide rather than two separate notes.
 *
 * Slide is a simplification of real 303 behavior: true acid slide holds
 * the amp envelope open across the glide and only decays at the end of a
 * slid run. Here every triggered step still runs its own decay — slide
 * only skips the attack "click" and ramps pitch smoothly into the new
 * note. Audibly this reads as a glide; it's not an authentic envelope
 * hold, which would need cancelling and re-scheduling the *previous*
 * note's decay the moment a slide is detected — a reasonable follow-up.
 */

interface BassStep {
  note: string | null; // pitch class, e.g. "C", "D#" — octave comes from the global Octave control
  accent: boolean;
  slide: boolean;
}

const STEP_COUNT = 16;
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Semitone distance from A4 (440Hz) for each pitch class at the base
// octave (Octave = 0 means this table's own octave, roughly C2-B2 — a
// classic acid-bass range).
const NOTE_SEMITONES: Record<string, number> = {
  C: -33, "C#": -32, D: -31, "D#": -30, E: -29, F: -28,
  "F#": -27, G: -26, "G#": -25, A: -24, "A#": -23, B: -22,
};

const noteToFreq = (note: string, octaveShift: number) =>
  440 * Math.pow(2, (NOTE_SEMITONES[note] + octaveShift * 12) / 12);

// A rolling acid groove so it's musical immediately — root-heavy with a
// couple of slides and accents for movement.
const DEFAULT_PATTERN: BassStep[] = [
  { note: "C", accent: true, slide: false },
  { note: null, accent: false, slide: false },
  { note: "C", accent: false, slide: true },
  { note: "D#", accent: false, slide: false },
  { note: null, accent: false, slide: false },
  { note: "C", accent: false, slide: false },
  { note: null, accent: false, slide: false },
  { note: "G", accent: true, slide: false },
  { note: "C", accent: true, slide: false },
  { note: null, accent: false, slide: false },
  { note: "C", accent: false, slide: true },
  { note: "D#", accent: false, slide: false },
  { note: null, accent: false, slide: false },
  { note: "C", accent: false, slide: false },
  { note: null, accent: false, slide: false },
  { note: "A#", accent: false, slide: false },
];

function rampPitch(param: AudioParam, time: number, freq: number, slideIn: boolean, stepSeconds: number) {
  param.cancelScheduledValues(time);
  if (slideIn) {
    param.setValueAtTime(param.value, time);
    param.exponentialRampToValueAtTime(freq, time + Math.min(stepSeconds * 0.85, 0.12));
  } else {
    param.setValueAtTime(freq, time);
  }
}

function triggerNote(
  osc: OscillatorNode,
  subOsc: OscillatorNode,
  filter: BiquadFilterNode,
  ampGain: GainNode,
  time: number,
  freq: number,
  accented: boolean,
  slideIn: boolean,
  stepSeconds: number,
  params: { cutoff: number; envMod: number; decay: number; accentAmount: number; volume: number },
) {
  const { cutoff, envMod, decay, accentAmount, volume } = params;

  // Pitch — slide glides smoothly from wherever the oscillator currently
  // sits; a fresh note jumps immediately (no portamento). The sub
  // oscillator tracks exactly one octave below the main one.
  rampPitch(osc.frequency, time, freq, slideIn, stepSeconds);
  rampPitch(subOsc.frequency, time, freq / 2, slideIn, stepSeconds);

  // Amplitude — accent boosts peak level. A slide-in note skips the hard
  // attack click and eases to peak instead of re-triggering.
  const peak = Math.min(1, volume * (accented ? 1 + accentAmount * 0.6 : 1));
  ampGain.gain.cancelScheduledValues(time);
  if (slideIn) {
    ampGain.gain.setTargetAtTime(peak, time, 0.01);
  } else {
    ampGain.gain.setValueAtTime(0.0001, time);
    ampGain.gain.exponentialRampToValueAtTime(peak, time + 0.004);
  }
  ampGain.gain.exponentialRampToValueAtTime(0.0001, time + decay + (accented ? 0.04 : 0));

  // Filter envelope — fast sweep up, decaying back to the Cutoff knob's
  // resting value. This sweep is the "squelch."
  const sweepPeak = Math.min(9000, cutoff + envMod * 5000 * (accented ? 1 + accentAmount : 1));
  filter.frequency.cancelScheduledValues(time);
  filter.frequency.setValueAtTime(sweepPeak, time);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, cutoff), time + decay);
}

// --- Compact rotary knob (self-contained copy — see Synth.tsx for the
// annotated original if you're wiring multiple instruments into one project) --
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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`bl-knob-svg${disabled ? " disabled" : ""}`} tabIndex={disabled ? -1 : 0} role="slider"
      aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-label={ariaLabel}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={endDrag}
      onPointerCancel={endDrag} onWheel={handleWheel} onKeyDown={handleKeyDown}>
      <path d={describeArc(cx, cy, r, KNOB_MIN_ANGLE, KNOB_MAX_ANGLE)} className="bl-knob-track" fill="none" />
      {describeArc(cx, cy, r, KNOB_MIN_ANGLE, angle) && (
        <path d={describeArc(cx, cy, r, KNOB_MIN_ANGLE, angle)} className="bl-knob-fill" fill="none" />
      )}
      <circle cx={cx} cy={cy} r={r - 10} className="bl-knob-cap" />
      <line x1={cx} y1={cy} x2={pointer.x} y2={pointer.y} className="bl-knob-pointer" />
    </svg>
  );
}

const clampNum = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

function sanitizeBassPattern(raw: unknown): BassStep[] {
  if (!Array.isArray(raw) || raw.length !== STEP_COUNT) {
    return Array.from({ length: STEP_COUNT }, () => ({ note: null, accent: false, slide: false }));
  }
  return raw.map((s) => {
    const step = s as Partial<BassStep> | null;
    const note = typeof step?.note === "string" && NOTE_NAMES.includes(step.note) ? step.note : null;
    return { note, accent: step?.accent === true, slide: step?.slide === true };
  });
}

/** Full state snapshot — pattern plus every knob — for a shareable jam link (see StudioExample.tsx). */
export interface BasslineState {
  pattern: BassStep[];
  waveform: OscillatorType;
  octaveShift: number;
  volume: number;
  cutoff: number;
  resonance: number;
  envMod: number;
  decay: number;
  accentAmount: number;
  subLevel: number;
  bpm: number;
}

/** Imperative handle exposed via `ref` — lets a parent (StudioExample.tsx) pull this instrument's live output into its own combined recording, or trigger a hands-free demo. */
export interface BasslineHandle {
  /** Returns the bassline's permanently-tapped output stream, creating its AudioContext first if needed. */
  getOutputStream: () => MediaStream;
  /** Loads the starter groove and starts the sequencer — no step programming required. */
  playDemo: () => void;
  /** Stops the sequencer (used to stop the demo). */
  stop: () => void;
  /** Snapshots pattern and every knob for a shareable jam link. */
  getState: () => BasslineState;
  /** Restores a snapshot from getState(). Doesn't start the sequencer itself — see `play`. */
  loadState: (state: BasslineState) => void;
  /** Starts the sequencer on whatever pattern is currently loaded, without resetting it — used to start a loaded jam link from a real click. */
  play: () => void;
}

interface BasslineProps {
  /** If provided, the bassline's tempo tracks this value instead of managing its own — for syncing with another instrument (see StudioExample.tsx). */
  bpm?: number;
  /** Fires when the user adjusts the local Tempo knob — only meaningful when `bpm` is not also locked via `bpmLocked`. */
  onBpmChange?: (bpm: number) => void;
  /** When true, disables the local Tempo knob (it's being driven externally, so local editing would just fight the shared value). */
  bpmLocked?: boolean;
  /** Which shared skin palette (see ./skins.ts) to render with. Defaults to "basic" when omitted, so the bassline still looks right standalone. */
  skin?: SkinName;
  ref?: Ref<BasslineHandle>;
}

export default function Bassline({
  bpm: externalBpm,
  onBpmChange,
  bpmLocked = false,
  skin = "basic",
  ref,
}: BasslineProps = {}) {
  const [pattern, setPattern] = useState<BassStep[]>(DEFAULT_PATTERN);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [internalBpm, setInternalBpm] = useState(120);
  const bpm = externalBpm ?? internalBpm;
  const handleBpmChange = (v: number) => {
    if (externalBpm === undefined) setInternalBpm(v);
    onBpmChange?.(v);
  };

  const [waveform, setWaveform] = useState<OscillatorType>("sawtooth");
  const [octaveShift, setOctaveShift] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [cutoff, setCutoff] = useState(500);
  const [resonance, setResonance] = useState(14);
  const [envMod, setEnvMod] = useState(0.6);
  const [decay, setDecay] = useState(0.16);
  const [accentAmount, setAccentAmount] = useState(0.6);
  const [subLevel, setSubLevel] = useState(0.3);

  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const subOscRef = useRef<OscillatorNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const ampGainRef = useRef<GainNode | null>(null);
  const subGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const recordStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Ref-mirrored performance params — read fresh inside each scheduled
  // trigger rather than closed over, so turning a knob mid-groove doesn't
  // restart the scheduler the way changing `bpm` does.
  const patternRef = useRef(pattern);
  const octaveShiftRef = useRef(octaveShift);
  const cutoffRef = useRef(cutoff);
  const envModRef = useRef(envMod);
  const decayRef = useRef(decay);
  const accentAmountRef = useRef(accentAmount);
  const volumeRef = useRef(volume);
  // Only needed at audio-graph creation time (see ensureAudioGraph) — kept
  // as refs so turning these knobs mid-groove doesn't change
  // ensureAudioGraph's identity and restart the scheduler effect below,
  // snapping the pattern back to step 0.
  const waveformRef = useRef(waveform);
  const resonanceRef = useRef(resonance);
  const subLevelRef = useRef(subLevel);
  // Not read by any audio-graph code — only needed so getState() (see
  // BasslineHandle) can report the current tempo without adding `bpm` to
  // the useImperativeHandle dependency array.
  const bpmRef = useRef(bpm);
  patternRef.current = pattern;
  octaveShiftRef.current = octaveShift;
  cutoffRef.current = cutoff;
  envModRef.current = envMod;
  decayRef.current = decay;
  accentAmountRef.current = accentAmount;
  volumeRef.current = volume;
  waveformRef.current = waveform;
  resonanceRef.current = resonance;
  subLevelRef.current = subLevel;
  bpmRef.current = bpm;

  const ensureAudioGraph = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();

    const osc = ctx.createOscillator();
    osc.type = waveformRef.current;
    osc.frequency.value = noteToFreq("C", octaveShiftRef.current);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoffRef.current;
    filter.Q.value = resonanceRef.current;
    const ampGain = ctx.createGain();
    ampGain.gain.value = 0.0001;
    const masterGain = ctx.createGain();
    masterGain.gain.value = volumeRef.current;

    osc.connect(filter);
    filter.connect(ampGain);

    // Sub oscillator — a plain sine one octave below the main osc, mixed
    // in *after* the filter (so it stays clean instead of getting cut by
    // Cutoff/Resonance) but still through the shared `ampGain`, so it
    // rides the exact same per-note envelope as the filtered voice with
    // no separate envelope code needed. `subGain` is just its level knob.
    const subOsc = ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.value = noteToFreq("C", octaveShiftRef.current) / 2;
    const subGain = ctx.createGain();
    subGain.gain.value = subLevelRef.current;
    subOsc.connect(subGain);
    subGain.connect(ampGain);
    subOsc.start();

    ampGain.connect(masterGain);
    masterGain.connect(ctx.destination);
    osc.start();

    // Permanent recording tap (see DrumMachine.tsx for the fuller
    // rationale) — connected once, never torn down.
    const recordDest = ctx.createMediaStreamDestination();
    masterGain.connect(recordDest);

    ctxRef.current = ctx;
    oscRef.current = osc;
    subOscRef.current = subOsc;
    filterRef.current = filter;
    ampGainRef.current = ampGain;
    subGainRef.current = subGain;
    masterGainRef.current = masterGain;
    recordStreamDestRef.current = recordDest;
    return ctx;
    // Every knob this reads comes from a ref (see above), so this callback's
    // identity never changes after mount — it flows into the scheduler
    // effect below, and depending on knob state directly here used to mean
    // turning almost any knob mid-groove would restart the scheduler and
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
        waveform: waveformRef.current,
        octaveShift: octaveShiftRef.current,
        volume: volumeRef.current,
        cutoff: cutoffRef.current,
        resonance: resonanceRef.current,
        envMod: envModRef.current,
        decay: decayRef.current,
        accentAmount: accentAmountRef.current,
        subLevel: subLevelRef.current,
        bpm: bpmRef.current,
      }),
      loadState: (state) => {
        setPattern(sanitizeBassPattern(state?.pattern));
        setWaveform(state?.waveform === "square" ? "square" : "sawtooth");
        setOctaveShift(Math.round(clampNum(state?.octaveShift, -2, 1, 0)));
        setVolume(clampNum(state?.volume, 0, 1, 0.7));
        setCutoff(clampNum(state?.cutoff, 100, 4000, 500));
        setResonance(clampNum(state?.resonance, 1, 24, 14));
        setEnvMod(clampNum(state?.envMod, 0, 1, 0.6));
        setDecay(clampNum(state?.decay, 0.05, 0.6, 0.16));
        setAccentAmount(clampNum(state?.accentAmount, 0, 1, 0.6));
        setSubLevel(clampNum(state?.subLevel, 0, 1, 0.3));
        if (externalBpm === undefined) setInternalBpm(Math.round(clampNum(state?.bpm, 60, 200, 120)));
      },
      play: () => {
        const ctx = ensureAudioGraph();
        if (ctx.state === "suspended") ctx.resume();
        setIsPlaying(true);
      },
    }),
    [ensureAudioGraph, externalBpm],
  );

  // Live-updatable params that aren't already re-read per note trigger —
  // waveform is a plain property (no click risk), resonance is a gentle
  // enough change not to click either. Cutoff/envMod/decay/accentAmount/
  // octaveShift are intentionally NOT here: they're read fresh via refs
  // at the next trigger instead, which is both simpler and avoids fighting
  // the per-note envelope automation already scheduled on the same params.
  useEffect(() => {
    if (oscRef.current) oscRef.current.type = waveform;
  }, [waveform]);
  useEffect(() => {
    if (filterRef.current) filterRef.current.Q.value = resonance;
  }, [resonance]);
  useEffect(() => {
    masterGainRef.current?.gain.setTargetAtTime(volume, ctxRef.current?.currentTime ?? 0, 0.02);
  }, [volume]);
  useEffect(() => {
    subGainRef.current?.gain.setTargetAtTime(subLevel, ctxRef.current?.currentTime ?? 0, 0.02);
  }, [subLevel]);

  const updateStepNote = (i: number, note: string) => {
    setPattern((prev) => prev.map((s, idx) => (idx === i ? { ...s, note: note === "" ? null : note } : s)));
  };
  const toggleAccent = (i: number) => {
    setPattern((prev) => prev.map((s, idx) => (idx === i ? { ...s, accent: !s.accent } : s)));
  };
  const toggleSlide = (i: number) => {
    setPattern((prev) => prev.map((s, idx) => (idx === i ? { ...s, slide: !s.slide } : s)));
  };
  const clearPattern = () => {
    setPattern(Array.from({ length: STEP_COUNT }, () => ({ note: null, accent: false, slide: false })));
  };

  // Scheduler — same plain-setInterval approach as DrumMachine's: musically
  // close enough for a groove, not sample-accurate. A tiny lookahead (20ms)
  // on each trigger avoids scheduling right at "now", which can clip on
  // some browsers.
  useEffect(() => {
    if (!isPlaying) return;
    const ctx = ensureAudioGraph();
    if (ctx.state === "suspended") ctx.resume();
    const stepMs = 60000 / bpm / 4; // 16th notes
    let step = 0;

    const tick = () => {
      const osc = oscRef.current!;
      const subOsc = subOscRef.current!;
      const filter = filterRef.current!;
      const ampGain = ampGainRef.current!;
      const time = ctx.currentTime + 0.02;
      const steps = patternRef.current;
      setCurrentStep(step);
      const current = steps[step];
      if (current.note) {
        const prevIdx = (step - 1 + STEP_COUNT) % STEP_COUNT;
        const prevStep = steps[prevIdx];
        const slideIn = prevStep.note !== null && prevStep.slide;
        const freq = noteToFreq(current.note, octaveShiftRef.current);
        triggerNote(osc, subOsc, filter, ampGain, time, freq, current.accent, slideIn, stepMs / 1000, {
          cutoff: cutoffRef.current,
          envMod: envModRef.current,
          decay: decayRef.current,
          accentAmount: accentAmountRef.current,
          volume: volumeRef.current,
        });
      }
      step = (step + 1) % STEP_COUNT;
    };

    tick();
    const id = setInterval(tick, stepMs);
    return () => {
      clearInterval(id);
      setCurrentStep(-1);
      // Silence any ringing note immediately rather than letting its decay
      // finish after the sequencer has already stopped.
      const ctxNow = ctxRef.current;
      if (ctxNow && ampGainRef.current) {
        ampGainRef.current.gain.cancelScheduledValues(ctxNow.currentTime);
        ampGainRef.current.gain.setTargetAtTime(0.0001, ctxNow.currentTime, 0.02);
      }
    };
  }, [isPlaying, bpm, ensureAudioGraph]);

  return (
    <div className="bl-root" style={skinToCssVars(SKIN_PALETTES[skin])}>
      <style>{`
        .bl-root {
          font-family: 'JetBrains Mono', 'Space Mono', monospace;
          color: var(--text); background: var(--panel); border-radius: 14px;
          padding: 20px 22px 24px; max-width: 720px;
          box-shadow: inset 0 0 0 1px var(--border), 0 12px 30px rgba(0,0,0,0.35);
        }
        .bl-header { display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 14px; letter-spacing: 0.06em; }
        .bl-title { font-size: 13px; font-weight: 700; color: var(--accent1); }
        .bl-sub { font-size: 10px; color: var(--label); }
        .bl-transport { display: flex; align-items: center; gap: 14px; background: var(--panel-2);
          border-radius: 10px; padding: 12px 16px; margin-bottom: 12px; box-shadow: inset 0 0 0 1px var(--border);
          flex-wrap: wrap; }
        .bl-play-btn { font-family: inherit; font-size: 11px; font-weight: 700; padding: 8px 18px;
          background: var(--control-bg); color: var(--control-text); border: 1px solid var(--border);
          border-radius: 6px; cursor: pointer; letter-spacing: 0.05em; }
        .bl-play-btn.active { background: var(--accent1); color: var(--control-bg); border-color: var(--accent1);
          box-shadow: 0 0 8px var(--accent1-glow); }
        .bl-clear-btn { font-family: inherit; font-size: 9px; padding: 7px 12px; background: var(--control-bg);
          color: var(--control-text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer;
          margin-left: auto; }
        .bl-field { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .bl-field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--label); white-space: nowrap; }
        .bl-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
          gap: 12px; background: var(--panel-2); border-radius: 10px; padding: 12px 16px;
          margin-bottom: 14px; box-shadow: inset 0 0 0 1px var(--border); align-items: end; }
        .bl-wave-row { display: flex; gap: 4px; }
        .bl-wave-btn { flex: 1; font-family: inherit; font-size: 9px; padding: 6px 4px;
          background: var(--control-bg); color: var(--control-text); border: 1px solid var(--border);
          border-radius: 4px; cursor: pointer; min-width: 34px; }
        .bl-wave-btn.active { color: var(--control-bg); background: var(--accent1); border-color: var(--accent1);
          box-shadow: 0 0 8px var(--accent1-glow); }
        .bl-octave-row { display: flex; align-items: center; gap: 6px; }
        .bl-octave-btn { font-family: inherit; font-size: 12px; width: 26px; padding: 5px 0;
          background: var(--control-bg); color: var(--control-text); border: 1px solid var(--border);
          border-radius: 4px; cursor: pointer; }
        .bl-octave-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .bl-octave-value { font-size: 11px; color: var(--accent2); min-width: 20px; text-align: center; }
        .bl-knob-svg { cursor: ns-resize; touch-action: none; outline: none; }
        .bl-knob-svg.disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
        .bl-knob-track { stroke: var(--border); stroke-width: 4; stroke-linecap: round; }
        .bl-knob-fill { stroke: var(--accent1); stroke-width: 4; stroke-linecap: round;
          filter: drop-shadow(0 0 2px var(--accent1-glow)); }
        .bl-knob-cap { fill: var(--control-bg); stroke: var(--border); stroke-width: 1; }
        .bl-knob-pointer { stroke: var(--accent2); stroke-width: 2; stroke-linecap: round; }
        .bl-steps { display: flex; gap: 4px; }
        .bl-step-col { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 34px;
          padding: 4px; border-radius: 6px; background: var(--panel-2); box-shadow: inset 0 0 0 1px var(--border); }
        .bl-step-col.beat-start { box-shadow: inset 0 0 0 1px var(--label); }
        .bl-step-col.playhead { box-shadow: inset 0 0 0 2px var(--accent2); }
        .bl-step-col.has-note { background: color-mix(in srgb, var(--accent1) 14%, var(--panel-2)); }
        .bl-note-select { width: 100%; font-family: inherit; font-size: 9px; background: var(--control-bg);
          color: var(--control-text); border: 1px solid var(--border); border-radius: 3px; padding: 3px 1px;
          text-align: center; }
        .bl-step-toggles { display: flex; gap: 2px; }
        .bl-mini-btn { flex: 1; font-family: inherit; font-size: 8px; font-weight: 700; padding: 3px 0;
          background: var(--control-bg); color: var(--label); border: 1px solid var(--border);
          border-radius: 3px; cursor: pointer; }
        .bl-mini-btn:disabled { cursor: not-allowed; opacity: 0.4; }
        .bl-mini-btn.on { background: var(--accent2); color: var(--control-bg); border-color: var(--accent2);
          box-shadow: 0 0 6px var(--accent2-glow); }
        .bl-hint { margin-top: 12px; font-size: 9px; color: var(--hint); text-align: center; letter-spacing: 0.04em; }
      `}</style>

      <div className="bl-header">
        <span className="bl-title">SIGNAL — bassline</span>
        <span className="bl-sub">{isPlaying ? `step ${currentStep + 1}/${STEP_COUNT}` : "stopped"}</span>
      </div>

      <div className="bl-transport">
        <button type="button" className={`bl-play-btn${isPlaying ? " active" : ""}`}
          onClick={() => setIsPlaying((v) => !v)}>{isPlaying ? "stop" : "play"}</button>

        <div className="bl-field">
          <span className="bl-field-label">Tempo · {bpm} bpm{bpmLocked ? " (synced)" : ""}</span>
          <Knob value={bpm} min={60} max={200} step={1} onChange={handleBpmChange} ariaLabel="Tempo" disabled={bpmLocked} />
        </div>

        <div className="bl-field">
          <span className="bl-field-label">Volume · {Math.round(volume * 100)}%</span>
          <Knob value={volume} min={0} max={1} step={0.01} onChange={setVolume} ariaLabel="Volume" />
        </div>

        <button type="button" className="bl-clear-btn" onClick={clearPattern}>clear</button>
      </div>

      <div className="bl-controls">
        <div className="bl-field">
          <span className="bl-field-label">Waveform</span>
          <div className="bl-wave-row">
            <button type="button" className={`bl-wave-btn${waveform === "sawtooth" ? " active" : ""}`}
              onClick={() => setWaveform("sawtooth")}>saw</button>
            <button type="button" className={`bl-wave-btn${waveform === "square" ? " active" : ""}`}
              onClick={() => setWaveform("square")}>sqr</button>
          </div>
        </div>

        <div className="bl-field">
          <span className="bl-field-label">Octave</span>
          <div className="bl-octave-row">
            <button type="button" className="bl-octave-btn" onClick={() => setOctaveShift((v) => Math.max(-2, v - 1))} disabled={octaveShift <= -2}>−</button>
            <span className="bl-octave-value">{octaveShift}</span>
            <button type="button" className="bl-octave-btn" onClick={() => setOctaveShift((v) => Math.min(1, v + 1))} disabled={octaveShift >= 1}>+</button>
          </div>
        </div>

        <div className="bl-field">
          <span className="bl-field-label">Cutoff · {Math.round(cutoff)}Hz</span>
          <Knob value={cutoff} min={100} max={4000} step={10} onChange={setCutoff} ariaLabel="Cutoff" />
        </div>

        <div className="bl-field">
          <span className="bl-field-label">Resonance · {resonance.toFixed(1)}</span>
          <Knob value={resonance} min={1} max={24} step={0.1} onChange={setResonance} ariaLabel="Resonance" />
        </div>

        <div className="bl-field">
          <span className="bl-field-label">Env Mod · {Math.round(envMod * 100)}%</span>
          <Knob value={envMod} min={0} max={1} step={0.01} onChange={setEnvMod} ariaLabel="Envelope modulation" />
        </div>

        <div className="bl-field">
          <span className="bl-field-label">Decay · {decay.toFixed(2)}s</span>
          <Knob value={decay} min={0.05} max={0.6} step={0.01} onChange={setDecay} ariaLabel="Decay" />
        </div>

        <div className="bl-field">
          <span className="bl-field-label">Accent Amt · {Math.round(accentAmount * 100)}%</span>
          <Knob value={accentAmount} min={0} max={1} step={0.01} onChange={setAccentAmount} ariaLabel="Accent amount" />
        </div>

        <div className="bl-field">
          <span className="bl-field-label">Sub Level · {Math.round(subLevel * 100)}%</span>
          <Knob value={subLevel} min={0} max={1} step={0.01} onChange={setSubLevel} ariaLabel="Sub oscillator level" />
        </div>
      </div>

      <div className="bl-steps">
        {pattern.map((step, i) => (
          <div
            key={i}
            className={`bl-step-col${i % 4 === 0 ? " beat-start" : ""}${currentStep === i ? " playhead" : ""}${step.note ? " has-note" : ""}`}
          >
            <select
              className="bl-note-select"
              value={step.note ?? ""}
              onChange={(e) => updateStepNote(i, e.target.value)}
              title={`step ${i + 1}`}
            >
              <option value="">--</option>
              {NOTE_NAMES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <div className="bl-step-toggles">
              <button type="button" className={`bl-mini-btn${step.accent ? " on" : ""}`}
                onClick={() => toggleAccent(i)} disabled={!step.note} title="Accent">A</button>
              <button type="button" className={`bl-mini-btn${step.slide ? " on" : ""}`}
                onClick={() => toggleSlide(i)} disabled={!step.note} title="Slide into next note">S</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bl-hint">
        pick a note per step · A = accent (louder + brighter) · S = slide (glides into the next note) · Octave
        shifts the whole pattern
      </div>
    </div>
  );
}
