import type { CSSProperties } from "react";

/**
 * Shared visual skins for the Synth and DrumMachine panels, so the two
 * can be palette-synced (see StudioExample.tsx) without either depending
 * on the other. Every panel color is a CSS custom property; a skin is
 * just a palette object swapped onto the root element's inline style via
 * `skinToCssVars`. Synth also uses the keyboard-specific fields;
 * DrumMachine ignores those and only reads the shared subset.
 */

export type SkinName = "basic" | "synthwave" | "vintage";

export const SKIN_NAMES: SkinName[] = ["basic", "synthwave", "vintage"];

export interface SkinPalette {
  panel: string;
  panel2: string;
  text: string;
  label: string;
  /** Footer/hint text color — separate from `label` because it needs to hold
   * its own contrast against wherever the hint happens to sit (e.g. the
   * brighter tail of synthwave's gradient panel), not just the flat panel
   * color `label` is tuned for. */
  hint: string;
  /** Foreground color for text drawn on `controlBg` surfaces (buttons,
   * selects, text inputs) — separate from `text` because `text` is tuned
   * for readability against `panel`, and on vintage those two backgrounds
   * have opposite contrast needs (light panel, dark controls). */
  controlText: string;
  accent1: string;
  accent1Glow: string;
  accent2: string;
  accent2Glow: string;
  border: string;
  controlBg: string;
  keyWhite: string;
  keyBlack: string;
  keyWhiteLabel: string;
  keyBlackLabel: string;
  scopeBg: string;
}

export const SKIN_PALETTES: Record<SkinName, SkinPalette> = {
  basic: {
    panel: "#1c1b19",
    panel2: "#26241f",
    text: "#e8e4dc",
    label: "#a8a299",
    hint: "#a8a299",
    controlText: "#e8e4dc",
    accent1: "#ff7a1a",
    accent1Glow: "rgba(255,122,26,0.6)",
    accent2: "#3ed6c4",
    accent2Glow: "rgba(62,214,196,0.7)",
    border: "#3a372f",
    controlBg: "#141310",
    keyWhite: "#efece4",
    keyBlack: "#141310",
    keyWhiteLabel: "#66625a",
    keyBlackLabel: "#a8a299",
    scopeBg: "#141310",
  },
  synthwave: {
    panel:
      "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 7px), " +
      "linear-gradient(180deg, #2a1b40 0%, #4a2361 45%, #a52d6e 72%, #ff7a3d 100%)",
    panel2: "#2a1b40",
    text: "#f3e6ff",
    label: "#a68fc9",
    hint: "#ffffff",
    controlText: "#f3e6ff",
    accent1: "#ff3aa0",
    accent1Glow: "rgba(255,58,160,0.65)",
    accent2: "#20f0ff",
    accent2Glow: "rgba(32,240,255,0.7)",
    border: "#5a3d7a",
    controlBg: "#1a1226",
    keyWhite: "#e7d9ff",
    keyBlack: "#1a1226",
    keyWhiteLabel: "#5b4a7a",
    keyBlackLabel: "#c9b8ff",
    scopeBg: "#180f26",
  },
  vintage: {
    panel: "radial-gradient(ellipse at 50% -20%, #f2e9d3 0%, #e7d9b8 60%, #ddcda0 100%)",
    panel2: "#ddcda0",
    text: "#2b2013",
    label: "#7a6a4a",
    hint: "#7a6a4a",
    controlText: "#f2e9d3",
    accent1: "#e0632a",
    accent1Glow: "rgba(224,98,42,0.55)",
    accent2: "#5c6b3f",
    accent2Glow: "rgba(92,107,63,0.55)",
    border: "#b8a37a",
    controlBg: "#3a2f20",
    keyWhite: "#f2e9d3",
    keyBlack: "#3a2f20",
    keyWhiteLabel: "#8a7350",
    keyBlackLabel: "#d9c9a3",
    scopeBg: "#2b2013",
  },
};

export const skinToCssVars = (p: SkinPalette): CSSProperties => {
  const vars: Record<string, string> = {
    "--panel": p.panel,
    "--panel-2": p.panel2,
    "--text": p.text,
    "--label": p.label,
    "--hint": p.hint,
    "--control-text": p.controlText,
    "--accent1": p.accent1,
    "--accent1-glow": p.accent1Glow,
    "--accent2": p.accent2,
    "--accent2-glow": p.accent2Glow,
    "--border": p.border,
    "--control-bg": p.controlBg,
    "--key-white": p.keyWhite,
    "--key-black": p.keyBlack,
    "--key-white-label": p.keyWhiteLabel,
    "--key-black-label": p.keyBlackLabel,
    "--scope-bg": p.scopeBg,
  };
  return vars as CSSProperties;
};
