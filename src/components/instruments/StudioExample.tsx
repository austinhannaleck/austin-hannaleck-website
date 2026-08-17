import { useState } from "react";
import Synth from "./Synth";
import DrumMachine from "./DrumMachine";

/**
 * StudioExample — running the synth and drum machine "in tandem," with
 * an optional BPM lock.
 *
 * Unlocked (default): each instrument manages its own tempo completely
 * independently, exactly like using either one standalone.
 *
 * Locked: this component becomes the single source of truth for tempo.
 * Both children receive the same `bpm` prop and `bpmLocked` (which
 * disables their own Tempo knobs, so there's no ambiguity about which
 * control is "real"), and changing the shared slider updates both.
 *
 * Note on precision: locking doesn't just set the same BPM number — both
 * instruments' internal schedulers restart cleanly from step 0 whenever
 * their `bpm` prop changes, so engaging the lock (or nudging the shared
 * tempo) re-aligns their downbeats at that moment. They still run on two
 * separate setInterval loops though, so they can drift apart by a few
 * milliseconds over long stretches — genuine sample-accurate lockstep
 * would need a shared audio clock, which is a bigger follow-up than a
 * BPM lock.
 */
export default function StudioExample() {
  const [bpm, setBpm] = useState(120);
  const [locked, setLocked] = useState(false);

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
          alignItems: "center",
          gap: "16px",
          background: "#1c1b19",
          border: "1px solid #3a372f",
          borderRadius: "10px",
          padding: "12px 18px",
          width: "100%",
          maxWidth: "780px",
          boxSizing: "border-box",
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

        {locked && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
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
      </div>

      <Synth bpm={locked ? bpm : undefined} bpmLocked={locked} />
      <DrumMachine bpm={locked ? bpm : undefined} bpmLocked={locked} />
    </div>
  );
}
