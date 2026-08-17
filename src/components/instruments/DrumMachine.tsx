import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

/**
 * DrumMachine — a small hardware-styled 16-step drum machine.
 *
 * Standalone by design (no imports from Synth.tsx) so it can be dropped
 * into a project on its own and run independently. Every sound is
 * synthesized live via the Web Audio API — no samples, no audio files.
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

function triggerKick(ctx: AudioContext, dest: AudioNode, time: number, vol: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.15);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.35);
}

function triggerSnare(ctx: AudioContext, dest: AudioNode, time: number, vol: number, noiseBuffer: AudioBuffer) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 1000;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(vol * 0.7, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(dest);
  noise.start(time);
  noise.stop(time + 0.18);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = 190;
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(vol * 0.5, time);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
  osc.connect(oscGain);
  oscGain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.12);
}

function triggerHat(ctx: AudioContext, dest: AudioNode, time: number, vol: number, noiseBuffer: AudioBuffer, open: boolean) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const gain = ctx.createGain();
  const decay = open ? 0.28 : 0.045;
  gain.gain.setValueAtTime(vol * 0.45, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  noise.connect(hp);
  hp.connect(gain);
  gain.connect(dest);
  noise.start(time);
  noise.stop(time + decay + 0.02);
}

function triggerClap(ctx: AudioContext, dest: AudioNode, time: number, vol: number, noiseBuffer: AudioBuffer) {
  // A few quick offset noise bursts through a bandpass filter — the
  // slight flutter is what reads as a "clap" rather than a plain hit.
  for (let i = 0; i < 3; i++) {
    const offset = i * 0.011;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1200;
    bp.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.45, time + offset);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + offset + 0.08);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(dest);
    noise.start(time + offset);
    noise.stop(time + offset + 0.1);
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

interface DrumMachineProps {
  /** If provided, the drum machine's tempo tracks this value instead of managing its own — for syncing with another instrument (see StudioExample.tsx). */
  bpm?: number;
  /** Fires when the user adjusts the local Tempo knob — only meaningful when `bpm` is not also locked via `bpmLocked`. */
  onBpmChange?: (bpm: number) => void;
  /** When true, disables the local Tempo knob (it's being driven externally, so local editing would just fight the shared value). */
  bpmLocked?: boolean;
}

export default function DrumMachine({ bpm: externalBpm, onBpmChange, bpmLocked = false }: DrumMachineProps = {}) {
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

  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const patternRef = useRef(pattern);
  const volumeRef = useRef(volume);
  patternRef.current = pattern;
  volumeRef.current = volume;

  const ensureAudioGraph = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    ctxRef.current = ctx;
    masterGainRef.current = masterGain;
    noiseBufferRef.current = makeNoiseBuffer(ctx);
    return ctx;
  }, [volume]);

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

  // Scheduler — same plain-setInterval approach as the synth's arp/seq:
  // musically close enough for a groove, not sample-accurate. A tiny
  // lookahead (20ms) on each trigger avoids scheduling right at "now",
  // which can clip on some browsers.
  useEffect(() => {
    if (!isPlaying) return;
    const ctx = ensureAudioGraph();
    if (ctx.state === "suspended") ctx.resume();
    const stepMs = 60000 / bpm / 4; // 16th notes
    let step = 0;

    const tick = () => {
      const dest = masterGainRef.current!;
      const noiseBuffer = noiseBufferRef.current!;
      const time = ctx.currentTime + 0.02;
      const vol = volumeRef.current;
      const steps = patternRef.current;
      setCurrentStep(step);
      if (steps.kick[step]) triggerKick(ctx, dest, time, vol);
      if (steps.snare[step]) triggerSnare(ctx, dest, time, vol, noiseBuffer);
      if (steps.closedHat[step]) triggerHat(ctx, dest, time, vol, noiseBuffer, false);
      if (steps.openHat[step]) triggerHat(ctx, dest, time, vol, noiseBuffer, true);
      if (steps.clap[step]) triggerClap(ctx, dest, time, vol, noiseBuffer);
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
    <div className="dm-root">
      <style>{`
        .dm-root {
          --panel: #1c1b19; --panel-2: #26241f; --text: #e8e4dc; --label: #a8a299;
          --accent1: #ff7a1a; --accent1-glow: rgba(255,122,26,0.6);
          --accent2: #3ed6c4; --accent2-glow: rgba(62,214,196,0.7);
          --border: #3a372f; --control-bg: #141310;
          font-family: 'JetBrains Mono', 'Space Mono', monospace;
          color: var(--text); background: var(--panel); border-radius: 14px;
          padding: 20px 22px 24px; max-width: 720px;
          box-shadow: inset 0 0 0 1px var(--border), 0 12px 30px rgba(0,0,0,0.35);
        }
        .dm-header { display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 14px; letter-spacing: 0.06em; }
        .dm-title { font-size: 13px; font-weight: 700; color: var(--accent1); }
        .dm-sub { font-size: 10px; color: var(--label); }
        .dm-transport { display: flex; align-items: center; gap: 14px; background: var(--panel-2);
          border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; box-shadow: inset 0 0 0 1px var(--border);
          flex-wrap: wrap; }
        .dm-play-btn { font-family: inherit; font-size: 11px; font-weight: 700; padding: 8px 18px;
          background: var(--control-bg); color: var(--text); border: 1px solid var(--border);
          border-radius: 6px; cursor: pointer; letter-spacing: 0.05em; }
        .dm-play-btn.active { background: var(--accent1); color: var(--control-bg); border-color: var(--accent1);
          box-shadow: 0 0 8px var(--accent1-glow); }
        .dm-clear-btn { font-family: inherit; font-size: 9px; padding: 7px 12px; background: var(--control-bg);
          color: var(--label); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
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
          text-transform: uppercase; letter-spacing: 0.04em; }
        .dm-steps { display: flex; gap: 4px; flex: 1; }
        .dm-step { flex: 1; aspect-ratio: 1; min-width: 16px; border-radius: 3px;
          background: var(--control-bg); border: 1px solid var(--border); cursor: pointer; padding: 0; }
        .dm-step.beat-start { border-left-color: var(--label); }
        .dm-step.on { background: var(--accent1); border-color: var(--accent1); box-shadow: 0 0 6px var(--accent1-glow); }
        .dm-step.playhead { outline: 2px solid var(--accent2); outline-offset: 1px; }
        .dm-hint { margin-top: 12px; font-size: 9px; color: var(--label); text-align: center; letter-spacing: 0.04em; }
      `}</style>

      <div className="dm-header">
        <span className="dm-title">SIGNAL — drum machine</span>
        <span className="dm-sub">{isPlaying ? `step ${currentStep + 1}/${STEP_COUNT}` : "stopped"}</span>
      </div>

      <div className="dm-transport">
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

        <button type="button" className="dm-clear-btn" onClick={clearPattern}>clear</button>
      </div>

      <div className="dm-grid">
        {TRACKS.map((track) => (
          <div key={track.id} className="dm-row">
            <span className="dm-row-label">{track.label}</span>
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

      <div className="dm-hint">click a step to toggle it · groups of 4 mark the beat</div>
    </div>
  );
}
