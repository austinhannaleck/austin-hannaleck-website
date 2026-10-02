// The master palette. Pixel art in art/ is written as rows of these
// single-character color codes ("." is transparent), which keeps every
// sprite readable, and diffable, as plain text.
//
// Colors lean saturated and warm, the way 16-bit hardware palettes were
// tuned for CRTs, with three or four shades per material so sprites can be
// properly lit (highlight, base, shadow) instead of flat-filled.
export const PALETTE: Record<string, string> = {
  // Outlines and the darkest darks: a deep purple-black reads softer than
  // pure black.
  k: "#1c1230",
  e: "#2a1c3c",
  w: "#fffaf0",

  // Skin
  s: "#ffd4ac",
  S: "#eda070",
  x: "#c06a4c",

  // Hair (chestnut)
  j: "#e08e50",
  h: "#ac5a2c",
  H: "#6c3418",

  // Tunic blue
  c: "#8cc4ff",
  b: "#3a7cf0",
  B: "#2450b8",

  // Scarf red
  q: "#ff8c8c",
  r: "#f04050",
  R: "#b02838",

  // Gold
  z: "#fff4a0",
  y: "#ffd040",
  Y: "#c89020",

  // Wood and leather
  m: "#e8b070",
  n: "#b8743c",
  N: "#7a4422",

  // Leaf green
  l: "#b4f478",
  g: "#5cc848",
  G: "#2e8a3a",
  d: "#1a5a2a",

  // Steel
  a: "#dce4f0",
  A: "#8a94b0",
  i: "#586078",

  // Purple
  v: "#dcb4ff",
  p: "#a868f0",
  P: "#6a3cb0",

  // Orange
  o: "#ff9a38",
  O: "#c85a18",

  // Pink
  f: "#ff9cc8",
  F: "#d05890",

  // Water and sky blue
  u: "#b8ecff",
  t: "#48b0f0",
  T: "#2870c8",

  // Stone
  E: "#c4bcd4",
  D: "#9a90b0",
  C: "#6c6288",
};

export const OUTLINE = "k";
