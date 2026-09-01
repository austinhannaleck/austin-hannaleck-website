// Raw Web Audio sound effects — same no-libraries approach as Get the
// Buggy's sounds.ts, just short envelope-shaped blips.

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

export function playCatchSound() {
  playTone(320, 520, 0.09, "sine", 0.18);
}

export function playGameOverSound() {
  playTone(260, 80, 0.4, "sawtooth", 0.15);
}

// Two-note up-chime — plays once when the player actually starts moving,
// distinct from the catch blip so "go" reads differently from "scored."
export function playStartSound() {
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  const time = ctx.currentTime;
  [440, 660].forEach((freq, i) => {
    const noteTime = time + i * 0.09;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, noteTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, noteTime);
    gain.gain.exponentialRampToValueAtTime(0.2, noteTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(noteTime);
    osc.stop(noteTime + 0.17);
  });
}
