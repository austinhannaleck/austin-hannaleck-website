// One shared AudioContext for Thornwood's sound effects and music, routed
// through separate buses so music can sit quietly under the effects, and a
// master gain for the mute button. Same raw Web Audio, no-libraries
// approach as Signal and Get the Buggy.

type Graph = { ctx: AudioContext; master: GainNode; sfx: GainNode; music: GainNode };

let graph: Graph | null = null;

// The music bus's resting volume; fanfares duck below it and come back.
export const MUSIC_LEVEL = 0.32;
let muted = false;

export function audioGraph(): Graph | null {
  if (graph) return graph;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  const sfx = ctx.createGain();
  sfx.gain.value = 0.8;
  sfx.connect(master);
  const music = ctx.createGain();
  music.gain.value = MUSIC_LEVEL;
  music.connect(master);
  graph = { ctx, master, sfx, music };
  return graph;
}

// Browsers only let audio start from a user gesture, so the UI calls this
// from its button handlers (New Game, Continue, and so on).
export function unlockAudio(): void {
  const g = audioGraph();
  if (g && g.ctx.state === "suspended") void g.ctx.resume();
}

export function setMuted(value: boolean): void {
  muted = value;
  if (graph) graph.master.gain.setTargetAtTime(value ? 0 : 1, graph.ctx.currentTime, 0.02);
}

let noiseBuffer: AudioBuffer | null = null;

export function whiteNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}
