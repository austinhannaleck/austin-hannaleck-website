import { useCallback, useRef, useState, useEffect } from "react";
import Synth, { type SynthHandle, type SynthState } from "./Synth";
import DrumMachine, { type DrumMachineHandle, type DrumMachineState } from "./DrumMachine";
import Bassline, { type BasslineHandle, type BasslineState } from "./Bassline";
import { SKIN_NAMES, SKIN_PALETTES, type SkinName } from "./skins";

/**
 * Shareable jam links: the entire state of a session (skin, shared tempo,
 * and each instrument's pattern + every knob, via each ref's getState())
 * serialized as base64 JSON in a `?jam=` URL query param — no backend, no
 * database, just an encode function and its inverse. Loading a link calls
 * each instrument's loadState() during this component's own mount effect,
 * which — thanks to React's child-before-parent effect ordering — always
 * runs after every child ref is already attached.
 *
 * Deliberately NOT auto-played on load: mount effects don't carry a user
 * gesture, so any AudioContext.resume() there would likely be silently
 * ignored by the browser anyway. Instead a loaded link shows a small
 * banner with its own "play it" button — a real click, which is what
 * actually satisfies the autoplay policy (see each handle's `play`).
 */
interface JamState {
  skin: SkinName;
  bpm: number;
  synth: SynthState;
  drum: DrumMachineState;
  bassline: BasslineState;
}

function encodeJam(state: JamState): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function decodeJam(encoded: string): JamState | null {
  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as JamState;
  } catch {
    return null;
  }
}

/**
 * StudioExample — running the synth, drum machine, and bassline "in
 * tandem," with an optional BPM lock, a shared skin, and a combined
 * session recording.
 *
 * BPM — unlocked (default): each instrument manages its own tempo
 * completely independently, exactly like using any of them standalone.
 *
 * Locked: this component becomes the single source of truth for tempo.
 * All three children receive the same `bpm` prop and `bpmLocked` (which
 * disables their own Tempo knobs, so there's no ambiguity about which
 * control is "real"), and changing the shared slider updates all of them.
 *
 * Note on precision: locking doesn't just set the same BPM number — every
 * instrument's internal scheduler restarts cleanly from step 0 whenever
 * its `bpm` prop changes, so engaging the lock (or nudging the shared
 * tempo) re-aligns their downbeats at that moment. They still run on
 * separate setInterval loops though, so they can drift apart by a few
 * milliseconds over long stretches — genuine sample-accurate lockstep
 * would need a shared audio clock, which is a bigger follow-up than a
 * BPM lock.
 *
 * Skin — always shared: `skin` state lives here, chosen from the single
 * selector in this component's own top bar, and flows one-way down to all
 * three children as a plain prop — none of them has a selector of its
 * own. Unlike BPM there's no "unlocked" mode — three instruments each in
 * a different skin reads as a bug, not a feature, so they always match
 * here.
 *
 * Recording — combined: Synth, DrumMachine, and Bassline each keep their
 * own AudioContext (see their file headers) and each exposes its
 * permanently-tapped output via `getOutputStream()` on its ref. "record
 * session" pulls all three streams into a *fourth*, separate AudioContext
 * used purely as a mixer: each stream becomes a MediaStreamAudioSourceNode
 * there, summed into one gain, fed to one MediaStreamAudioDestinationNode,
 * and *that* combined stream is what the MediaRecorder captures. This
 * bridges three independent instrument contexts without unifying their
 * clocks — it's just audio routing, so BPM lock stays a separate,
 * orthogonal feature.
 *
 * Demo: a first-time visitor lands on a silent panel of knobs with no clue
 * what to press. "hear a demo" is one click that satisfies the browser's
 * user-gesture requirement for audio *and* gives every instrument a
 * reason to make sound on its own — it locks BPM to a steady tempo, loads
 * a melodic factory patch into Synth's self-playing Seq mode (see
 * SynthHandle.playDemo), and starts DrumMachine's and Bassline's starter
 * grooves (see each handle's playDemo). No keys held, no steps
 * programmed. It's a toggle — `isDemoPlaying` tracks whether *this
 * button* started something, and clicking again calls each instrument's
 * `stop()` rather than trying to infer "is anything currently making
 * sound" from their independent states.
 *
 * Beat-synced page accent: DrumMachine's `onStep` fires from inside its
 * real scheduler tick, so the pulse is driven by the actual audio clock,
 * not a second timer guessing at it. Only quarter-note steps (0, 4, 8, 12
 * — the ones the step grid already marks as `beat-start`) trigger a pulse;
 * every 16th would just be visual noise. Re-mounting the pulse element via
 * `key={beatTick}` is what restarts its CSS animation cleanly each beat,
 * without needing a JS-driven reflow hack.
 *
 * Tap tempo: always targets the shared bpm (and auto-engages the lock),
 * since a tap gesture only makes sense against one tempo shared by all
 * three instruments — see handleTapTempo.
 *
 * Shareable jam links: see the encodeJam/decodeJam comment above those
 * functions for the full rationale. Short version: "share this jam" reads
 * every instrument's current pattern/knobs via getState(), packs it with
 * skin+bpm into a `?jam=` URL, and copies it to the clipboard; opening
 * that URL calls loadState() on each instrument during this component's
 * mount effect and shows a "play it" banner rather than autoplaying.
 */
export default function StudioExample() {
  const [bpm, setBpm] = useState(120);
  const [locked, setLocked] = useState(false);
  const [skin, setSkin] = useState<SkinName>("basic");

  const synthRef = useRef<SynthHandle>(null);
  const drumRef = useRef<DrumMachineHandle>(null);
  const basslineRef = useRef<BasslineHandle>(null);

  // Shareable jam links — see the file-header comment above encodeJam/decodeJam.
  const [loadedJam, setLoadedJam] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const jamParam = new URLSearchParams(window.location.search).get("jam");
    if (!jamParam) return;
    const state = decodeJam(jamParam);
    if (!state) return;
    setSkin(SKIN_NAMES.includes(state.skin) ? state.skin : "basic");
    setBpm(Math.min(200, Math.max(40, Math.round(state.bpm) || 120)));
    setLocked(true);
    synthRef.current?.loadState(state.synth);
    drumRef.current?.loadState(state.drum);
    basslineRef.current?.loadState(state.bassline);
    setLoadedJam(true);
  }, []);

  const playLoadedJam = () => {
    synthRef.current?.play();
    drumRef.current?.play();
    basslineRef.current?.play();
    setLoadedJam(false);
  };

  const shareJam = async () => {
    const synthState = synthRef.current?.getState();
    const drumState = drumRef.current?.getState();
    const bassState = basslineRef.current?.getState();
    if (!synthState || !drumState || !bassState) return;
    const encoded = encodeJam({ skin, bpm, synth: synthState, drum: drumState, bassline: bassState });
    const url = `${window.location.origin}${window.location.pathname}?jam=${encoded}`;
    setShareUrl(url);
    setShareCopied(false);
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
    } catch {
      /* clipboard unavailable — the URL is still shown in the field below for manual copy */
    }
  };

  // Tap tempo — averages the last few tap intervals (resetting the run if
  // a tap comes in more than 2s after the last one, i.e. the user paused
  // and is starting a fresh tempo) and always sets the *shared* bpm, since
  // that's the only tempo a tap gesture can meaningfully target across all
  // three instruments at once.
  const tapTimesRef = useRef<number[]>([]);
  const handleTapTempo = () => {
    const now = performance.now();
    const times = tapTimesRef.current;
    const last = times[times.length - 1];
    if (last !== undefined && now - last > 2000) times.length = 0;
    times.push(now);
    if (times.length > 5) times.shift();
    if (times.length >= 2) {
      let sum = 0;
      for (let i = 1; i < times.length; i++) sum += times[i] - times[i - 1];
      const avgMs = sum / (times.length - 1);
      setBpm(Math.round(Math.min(200, Math.max(40, 60000 / avgMs))));
      setLocked(true);
    }
  };

  const [isSessionRecording, setIsSessionRecording] = useState(false);
  const [sessionRecordingSeconds, setSessionRecordingSeconds] = useState(0);
  const [sessionRecordingUrl, setSessionRecordingUrl] = useState<string | null>(null);
  const sessionRecordingUrlRef = useRef<string | null>(null);
  sessionRecordingUrlRef.current = sessionRecordingUrl;

  const mixCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickMimeType = () => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    return candidates.find((c) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) ?? "";
  };

  const startSessionRecording = () => {
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
    const mixDest = mixCtx.createMediaStreamDestination();
    mixGain.connect(mixDest);

    const mimeType = pickMimeType();
    const recorder = mimeType ? new MediaRecorder(mixDest.stream, { mimeType }) : new MediaRecorder(mixDest.stream);
    recordedChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setSessionRecordingUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      mixCtxRef.current?.close();
      mixCtxRef.current = null;
    };
    recorder.start();
    mediaRecorderRef.current = recorder;

    setIsSessionRecording(true);
    setSessionRecordingSeconds(0);
    recordTimerRef.current = setInterval(() => setSessionRecordingSeconds((s) => s + 1), 1000);
  };

  const stopSessionRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsSessionRecording(false);
  };

  // Unmount cleanup only — sessionRecordingUrlRef holds the latest value so
  // this doesn't revoke a still-in-use URL from a stale closure.
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      mediaRecorderRef.current?.stop();
      mixCtxRef.current?.close();
      if (sessionRecordingUrlRef.current) URL.revokeObjectURL(sessionRecordingUrlRef.current);
    };
  }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const [isDemoPlaying, setIsDemoPlaying] = useState(false);

  const toggleDemo = () => {
    if (isDemoPlaying) {
      synthRef.current?.stop();
      drumRef.current?.stop();
      basslineRef.current?.stop();
      setIsDemoPlaying(false);
      return;
    }
    setLocked(true);
    setBpm(104);
    synthRef.current?.playDemo();
    drumRef.current?.playDemo();
    basslineRef.current?.playDemo();
    setIsDemoPlaying(true);
  };

  // Beat-synced page accent — see file header. Only quarter notes (every
  // 4th 16th-note step) trigger a pulse.
  const [beatTick, setBeatTick] = useState(0);
  const handleStep = useCallback((step: number) => {
    if (step % 4 === 0) setBeatTick((t) => t + 1);
  }, []);
  const accent = SKIN_PALETTES[skin];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "24px",
        background: "#0f0e0c",
        minHeight: "100vh",
        alignItems: "center",
        fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          maxWidth: "780px",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={toggleDemo}
          style={{
            fontFamily: "inherit",
            fontSize: "14px",
            fontWeight: 700,
            padding: "14px 32px",
            borderRadius: "8px",
            cursor: "pointer",
            letterSpacing: "0.05em",
            background: "#ff7a1a",
            color: "#141310",
            border: "1px solid #ff7a1a",
            boxShadow: "0 0 18px rgba(255,122,26,0.45)",
          }}
        >
          {isDemoPlaying ? "■ stop demo" : "▶ hear a demo"}
        </button>
        <p style={{ fontSize: "10px", color: "#a8a299", letterSpacing: "0.03em", margin: 0, maxWidth: "560px" }}>
          Built from scratch on the raw Web Audio API — every sound below is synthesized live in your browser, right
          now. No samples, no audio libraries.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          background: "#1c1b19",
          border: "1px solid #3a372f",
          borderRadius: "10px",
          padding: "12px 18px",
          width: "100%",
          maxWidth: "780px",
          boxSizing: "border-box",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setLocked((v) => !v)}
          style={{
            fontFamily: "inherit",
            fontSize: "11px",
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            letterSpacing: "0.05em",
            background: locked ? "#ff7a1a" : "#141310",
            color: locked ? "#141310" : "#e8e4dc",
            border: `1px solid ${locked ? "#ff7a1a" : "#3a372f"}`,
          }}
        >
          {locked ? "bpm locked" : "lock bpm"}
        </button>

        <button
          type="button"
          onClick={handleTapTempo}
          title="Tap a few times at your tempo — locks the shared bpm to the average"
          style={{
            fontFamily: "inherit",
            fontSize: "11px",
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            letterSpacing: "0.05em",
            background: "#141310",
            color: "#e8e4dc",
            border: "1px solid #3a372f",
          }}
        >
          tap tempo
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10px", color: "#a8a299", letterSpacing: "0.04em" }}>skin</span>
          <select
            value={skin}
            onChange={(e) => setSkin(e.target.value as SkinName)}
            style={{
              fontFamily: "inherit",
              fontSize: "11px",
              padding: "7px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              background: "#141310",
              color: "#e8e4dc",
              border: "1px solid #3a372f",
            }}
          >
            {SKIN_NAMES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {locked && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "160px" }}>
            <span style={{ fontSize: "10px", color: "#a8a299", letterSpacing: "0.04em" }}>
              shared tempo · {bpm} bpm
            </span>
            <input
              type="range"
              min={40}
              max={200}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              style={{ flex: 1, accentColor: "#ff7a1a" }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={shareJam}
          style={{
            fontFamily: "inherit",
            fontSize: "11px",
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            letterSpacing: "0.05em",
            marginLeft: "auto",
            background: "#141310",
            color: "#3ed6c4",
            border: "1px solid #3ed6c4",
          }}
        >
          share this jam
        </button>

        <button
          type="button"
          onClick={isSessionRecording ? stopSessionRecording : startSessionRecording}
          style={{
            fontFamily: "inherit",
            fontSize: "11px",
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            letterSpacing: "0.05em",
            background: isSessionRecording ? "#ff7a1a" : "#141310",
            color: isSessionRecording ? "#141310" : "#e8e4dc",
            border: `1px solid ${isSessionRecording ? "#ff7a1a" : "#3a372f"}`,
          }}
        >
          {isSessionRecording ? `● recording session ${formatTime(sessionRecordingSeconds)}` : "record session"}
        </button>

        {shareUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                fontFamily: "inherit",
                fontSize: "10px",
                padding: "7px 10px",
                borderRadius: "6px",
                background: "#141310",
                color: "#e8e4dc",
                border: "1px solid #3a372f",
              }}
            />
            <span style={{ fontSize: "10px", color: shareCopied ? "#3ed6c4" : "#a8a299", whiteSpace: "nowrap" }}>
              {shareCopied ? "copied!" : "select & copy"}
            </span>
          </div>
        )}

        {sessionRecordingUrl && !isSessionRecording && (
          <audio
            controls
            src={sessionRecordingUrl}
            controlsList="nodownload noplaybackrate noremoteplayback"
            style={{ height: "32px", maxWidth: "240px", colorScheme: "dark" }}
          />
        )}

        {sessionRecordingUrl && !isSessionRecording && (
          <a
            href={sessionRecordingUrl}
            download="studio-session.webm"
            style={{
              fontFamily: "inherit",
              fontSize: "11px",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              letterSpacing: "0.05em",
              textDecoration: "none",
              background: "#141310",
              color: "#3ed6c4",
              border: "1px solid #3ed6c4",
            }}
          >
            download session
          </a>
        )}
      </div>

      {loadedJam && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            background: "#1c1b19",
            border: "1px solid #3ed6c4",
            borderRadius: "10px",
            padding: "10px 18px",
            width: "100%",
            maxWidth: "780px",
            boxSizing: "border-box",
          }}
        >
          <span style={{ fontSize: "11px", color: "#3ed6c4", letterSpacing: "0.03em" }}>
            🎧 loaded a shared jam
          </span>
          <button
            type="button"
            onClick={playLoadedJam}
            style={{
              fontFamily: "inherit",
              fontSize: "11px",
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              letterSpacing: "0.05em",
              background: "#3ed6c4",
              color: "#141310",
              border: "1px solid #3ed6c4",
            }}
          >
            ▶ play it
          </button>
          <button
            type="button"
            onClick={() => setLoadedJam(false)}
            style={{
              fontFamily: "inherit",
              fontSize: "11px",
              padding: "8px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              marginLeft: "auto",
              background: "transparent",
              color: "#a8a299",
              border: "1px solid #3a372f",
            }}
          >
            dismiss
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "20px",
          width: "100%",
        }}
      >
        <Synth ref={synthRef} bpm={locked ? bpm : undefined} bpmLocked={locked} skin={skin} />
        <DrumMachine
          ref={drumRef}
          bpm={locked ? bpm : undefined}
          bpmLocked={locked}
          skin={skin}
          onStep={handleStep}
        />
        <Bassline ref={basslineRef} bpm={locked ? bpm : undefined} bpmLocked={locked} skin={skin} />
      </div>

      {beatTick > 0 && (
        <div
          key={beatTick}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 50,
            background: `radial-gradient(ellipse at center, transparent 55%, ${accent.accent1Glow} 100%)`,
            opacity: 0,
            animation: "studio-beat-pulse 0.5s ease-out forwards",
          }}
        />
      )}
      <style>{`
        @keyframes studio-beat-pulse {
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
