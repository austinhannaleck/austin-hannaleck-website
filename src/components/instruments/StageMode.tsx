import { useEffect, useRef, useState, type RefObject } from "react";
import type { SynthHandle } from "./Synth";
import type { DrumMachineHandle } from "./DrumMachine";
import type { BasslineHandle } from "./Bassline";
import { SKIN_PALETTES, type SkinName } from "./skins";

type VisualMode = "bars" | "waveform" | "radial" | "kaleidoscope";
type ColorSource = "skin" | "custom" | "cycle";

const VISUAL_MODES: { id: VisualMode; label: string }[] = [
  { id: "bars", label: "Bars" },
  { id: "waveform", label: "Waveform" },
  { id: "radial", label: "Radial" },
  { id: "kaleidoscope", label: "Kaleidoscope" },
];

interface StageModeProps {
  synthRef: RefObject<SynthHandle | null>;
  drumRef: RefObject<DrumMachineHandle | null>;
  basslineRef: RefObject<BasslineHandle | null>;
  skin: SkinName;
  onClose: () => void;
}

/**
 * Full-screen visualizer for Signal — a canvas that reacts to whatever
 * Synth/DrumMachine/Bassline are actually playing, entered/exited without
 * touching App.tsx's signalView. All three instruments stay mounted (and
 * playing) underneath this overlay the whole time; this component only
 * draws on top of them, exactly like the existing beat-pulse flash in
 * StudioExample.tsx does at a lower z-index.
 *
 * Audio tap mirrors StudioExample's session-recording mixer: each
 * instrument's permanently-tapped getOutputStream() feeds a
 * MediaStreamAudioSourceNode, summed into one gain, into an AnalyserNode.
 * Unlike the recording mixer, nothing here connects to the mix context's
 * own .destination — this context exists purely to analyze, not to play
 * anything (each instrument already plays through its own independent
 * AudioContext, untouched by this component).
 */
export default function StageMode({ synthRef, drumRef, basslineRef, skin, onClose }: StageModeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mixCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  // Trippy-mode state, all mutated in place inside the draw loop rather
  // than through React state — none of this needs to trigger a re-render,
  // it just needs to persist across animation frames.
  const hslHueRef = useRef(0);
  const bassBaselineRef = useRef(0);
  const pulseRef = useRef(0);
  const rotationRef = useRef(0);
  const segmentPhaseRef = useRef(0);
  const breathePhaseRef = useRef(0);

  const [mode, setMode] = useState<VisualMode>("bars");
  const [sensitivity, setSensitivity] = useState(1.4);
  const [colorSource, setColorSource] = useState<ColorSource>("skin");
  const [customColor1, setCustomColor1] = useState("#ff7a1a");
  const [customColor2, setCustomColor2] = useState("#3ed6c4");
  const [isIdle, setIsIdle] = useState(false);

  // Audio tap + draw loop. Set up once on mount, torn down on unmount —
  // stage mode is a single short-lived session per open/close, not
  // something that needs to react to the refs changing mid-session.
  useEffect(() => {
    const synthStream = synthRef.current?.getOutputStream();
    const drumStream = drumRef.current?.getOutputStream();
    const bassStream = basslineRef.current?.getOutputStream();
    if (!synthStream || !drumStream || !bassStream) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const mixCtx = new AudioContextCtor();
    if (mixCtx.state === "suspended") mixCtx.resume();
    mixCtxRef.current = mixCtx;

    const mixGain = mixCtx.createGain();
    mixCtx.createMediaStreamSource(synthStream).connect(mixGain);
    mixCtx.createMediaStreamSource(drumStream).connect(mixGain);
    mixCtx.createMediaStreamSource(bassStream).connect(mixGain);

    const analyser = mixCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    mixGain.connect(analyser);
    analyserRef.current = analyser;

    return () => {
      analyserRef.current = null;
      mixCtxRef.current = null;
      mixCtx.close();
    };
  }, [synthRef, drumRef, basslineRef]);

  // Canvas sizing, kept in its own effect so resize handling doesn't need
  // to know anything about the audio graph above.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Draw loop — reads live state (mode/sensitivity/colors) via a ref
  // mirror each render rather than restarting the rAF loop on every knob
  // change, matching the ref-mirroring convention documented in
  // .cursor/rules/synth-project.mdc for audio-adjacent callbacks.
  const drawStateRef = useRef({ mode, sensitivity, colorSource, customColor1, customColor2, skin });
  drawStateRef.current = { mode, sensitivity, colorSource, customColor1, customColor2, skin };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const freqData = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 1024);
    const timeData = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 1024);

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const analyser = analyserRef.current;
      const { mode, sensitivity, colorSource, customColor1, customColor2, skin } = drawStateRef.current;
      const palette = SKIN_PALETTES[skin];

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Motion trail: a low-alpha fill instead of a hard clear, so the
      // previous frame's content fades out over several frames rather than
      // vanishing instantly — the single biggest lever for the classic
      // "media player visualizer" smear look.
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, w, h);

      if (!analyser) return;

      analyser.getByteFrequencyData(freqData);
      if (mode === "waveform") analyser.getByteTimeDomainData(timeData);

      // Rough bass energy from the lowest handful of frequency bins, used
      // to detect kick-drum-style transients: track a slow-moving EMA
      // baseline, and treat a sample that spikes well above it as a hit,
      // kicking off a pulse that decays back down over the next frames.
      let bassSum = 0;
      const bassBins = 12;
      for (let i = 0; i < bassBins; i++) bassSum += freqData[i];
      const bassEnergy = bassSum / (bassBins * 255);
      const baseline = bassBaselineRef.current;
      const isHit = bassEnergy > 0.15 && bassEnergy > baseline * 1.35;
      if (isHit) {
        pulseRef.current = Math.min(1, pulseRef.current + (bassEnergy - baseline));
      }
      pulseRef.current *= 0.85;
      bassBaselineRef.current = baseline * 0.92 + bassEnergy * 0.08;

      // Overall energy (average across the whole spectrum) drives how fast
      // the "cycle" color source spins and how fast the kaleidoscope turns
      // — louder passages feel more frantic, quiet ones drift.
      let totalSum = 0;
      for (let i = 0; i < freqData.length; i++) totalSum += freqData[i];
      const overallEnergy = totalSum / (freqData.length * 255);
      hslHueRef.current = (hslHueRef.current + 0.3 + overallEnergy * 3) % 360;
      rotationRef.current += 0.002 + overallEnergy * 0.01;

      // Living kaleidoscope: segment count and overall scale both drift
      // slowly over time (speed itself nudged by how energetic the music
      // is) rather than the mandala being a fixed 10-wedge shape that only
      // spins.
      segmentPhaseRef.current += 0.003 + overallEnergy * 0.004;
      let kaleidoscopeSegments = 8 + Math.round(Math.sin(segmentPhaseRef.current) * 4);
      kaleidoscopeSegments -= kaleidoscopeSegments % 2; // stay even so the mirrored wedges wrap seamlessly
      breathePhaseRef.current += 0.01 + overallEnergy * 0.02;
      const breathe = 1 + Math.sin(breathePhaseRef.current) * 0.15;

      let color1: string;
      let color2: string;
      if (colorSource === "cycle") {
        const hue = hslHueRef.current;
        color1 = `hsl(${hue}, 90%, 60%)`;
        color2 = `hsl(${(hue + 120) % 360}, 90%, 60%)`;
      } else if (colorSource === "skin") {
        color1 = palette.accent1;
        color2 = palette.accent2;
      } else {
        color1 = customColor1;
        color2 = customColor2;
      }

      // Bass pulse: briefly scale the whole scene outward from center on a
      // kick hit, easing back as pulseRef decays — applied uniformly so
      // every mode visibly "pumps" to the beat without mode-specific code.
      const pulse = pulseRef.current;
      const cx = w / 2;
      const cy = h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + pulse * 0.08, 1 + pulse * 0.08);
      ctx.translate(-cx, -cy);

      if (mode === "waveform") {
        drawWaveform(ctx, timeData, w, h, color1, sensitivity);
      } else if (mode === "radial") {
        drawRadial(ctx, freqData, w, h, color1, color2, sensitivity);
      } else if (mode === "kaleidoscope") {
        drawKaleidoscope(
          ctx,
          freqData,
          w,
          h,
          color1,
          color2,
          sensitivity,
          rotationRef.current,
          kaleidoscopeSegments,
          breathe,
        );
      } else {
        drawBars(ctx, freqData, w, h, color1, color2, sensitivity);
      }

      ctx.restore();
    };
    tick();

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Auto-hide controls after a few seconds of no pointer/touch activity —
  // reappear immediately on movement. Mirrors the lightweight setInterval
  // timer StudioExample already uses for its own recording clock.
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdle = () => {
      setIsIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsIdle(true), 3000);
    };
    resetIdle();
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("touchstart", resetIdle);
    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("touchstart", resetIdle);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#000",
        fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: isIdle ? 0 : 1,
          transition: "opacity 0.6s ease",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            pointerEvents: "auto",
            position: "absolute",
            top: "20px",
            left: "20px",
            fontFamily: "inherit",
            fontSize: "11px",
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            letterSpacing: "0.05em",
            background: "rgba(20,19,16,0.75)",
            color: "#e8e4dc",
            border: "1px solid #3a372f",
            backdropFilter: "blur(4px)",
          }}
        >
          ← exit stage
        </button>

        <div
          style={{
            pointerEvents: "auto",
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: "calc(100vw - 40px)",
            background: "rgba(20,19,16,0.75)",
            border: "1px solid #3a372f",
            borderRadius: "10px",
            padding: "10px 18px",
            backdropFilter: "blur(4px)",
          }}
        >
          <div style={{ display: "flex", gap: "6px" }}>
            {VISUAL_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                style={{
                  fontFamily: "inherit",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "7px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  background: mode === m.id ? "#ff7a1a" : "transparent",
                  color: mode === m.id ? "#141310" : "#e8e4dc",
                  border: `1px solid ${mode === m.id ? "#ff7a1a" : "#3a372f"}`,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "10px", color: "#a8a299", letterSpacing: "0.04em" }}>sensitivity</span>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              style={{ accentColor: "#ff7a1a" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() =>
                setColorSource((c) => (c === "skin" ? "custom" : c === "custom" ? "cycle" : "skin"))
              }
              style={{
                fontFamily: "inherit",
                fontSize: "11px",
                fontWeight: 700,
                padding: "7px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                letterSpacing: "0.04em",
                background: "transparent",
                color: "#e8e4dc",
                border: "1px solid #3a372f",
              }}
            >
              color: {colorSource}
            </button>
            {colorSource === "custom" && (
              <>
                <input
                  type="color"
                  value={customColor1}
                  onChange={(e) => setCustomColor1(e.target.value)}
                  style={{ width: "28px", height: "28px", padding: 0, border: "1px solid #3a372f", borderRadius: "4px" }}
                />
                <input
                  type="color"
                  value={customColor2}
                  onChange={(e) => setCustomColor2(e.target.value)}
                  style={{ width: "28px", height: "28px", padding: 0, border: "1px solid #3a372f", borderRadius: "4px" }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  freqData: Uint8Array,
  w: number,
  h: number,
  color1: string,
  color2: string,
  sensitivity: number,
) {
  const barCount = 96;
  const step = Math.floor(freqData.length / barCount);
  const barWidth = w / barCount;
  const gradient = ctx.createLinearGradient(0, h, 0, 0);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;

  for (let i = 0; i < barCount; i++) {
    const value = freqData[i * step] / 255;
    const barHeight = Math.min(h, value * h * sensitivity);
    ctx.fillRect(i * barWidth, h - barHeight, barWidth * 0.8, barHeight);
  }
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  timeData: Uint8Array,
  w: number,
  h: number,
  color: string,
  sensitivity: number,
) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();

  const sliceWidth = w / timeData.length;
  let x = 0;
  for (let i = 0; i < timeData.length; i++) {
    const centered = (timeData[i] - 128) / 128;
    const y = h / 2 + centered * (h / 2) * sensitivity;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawRadial(
  ctx: CanvasRenderingContext2D,
  freqData: Uint8Array,
  w: number,
  h: number,
  color1: string,
  color2: string,
  sensitivity: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const baseRadius = Math.min(w, h) * 0.18;
  const maxExtra = Math.min(w, h) * 0.28;
  const spokeCount = 120;
  const step = Math.floor(freqData.length / spokeCount);

  ctx.strokeStyle = color1;
  ctx.shadowColor = color2;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;

  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const value = freqData[i * step] / 255;
    const r1 = baseRadius;
    const r2 = baseRadius + Math.min(maxExtra, value * maxExtra * sensitivity);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawKaleidoscope(
  ctx: CanvasRenderingContext2D,
  freqData: Uint8Array,
  w: number,
  h: number,
  color1: string,
  color2: string,
  sensitivity: number,
  rotation: number,
  segments: number,
  breathe: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const wedgeAngle = (Math.PI * 2) / segments;
  const baseRadius = Math.min(w, h) * 0.05 * breathe;
  const maxExtra = Math.min(w, h) * 0.5 * breathe;
  const spokesPerWedge = 24;
  const step = Math.floor(freqData.length / spokesPerWedge);

  ctx.lineWidth = 2;

  for (let s = 0; s < segments; s++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation + s * wedgeAngle);
    // Mirror every other wedge so adjacent wedges reflect each other,
    // rather than just repeating — the actual "kaleidoscope" part.
    if (s % 2 === 1) ctx.scale(1, -1);

    const wedgeColor = s % 2 === 0 ? color1 : color2;
    ctx.strokeStyle = wedgeColor;
    ctx.shadowColor = wedgeColor;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i < spokesPerWedge; i++) {
      const angle = (i / spokesPerWedge) * wedgeAngle;
      const value = freqData[i * step] / 255;
      const r = baseRadius + Math.min(maxExtra, value * maxExtra * sensitivity);
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = wedgeColor;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}
