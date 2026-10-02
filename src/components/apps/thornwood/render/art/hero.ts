// The hero: a young wanderer in a red hood and a short red mantle, pinned
// with a gold clasp, over a blue tunic. 16x24 frames, authored without
// outlines (they're added when compiled), feet on row 21. Left-facing
// frames are mirrors of the right-facing ones.

const HOOD_TOP = [
  "................",
  "................",
  "......rrrR......",
  ".....qrrrrR.....",
  "....qrrrrrrR....",
];

const FACE_DOWN = [
  "....qRRRRRRR....",
  "....rhhjhhhR....",
  "....rsessesR....",
  "....RsessesR....",
  "...qrRsssSRrR...",
];

// The mantle falls to the elbows and parts below the clasp, so the tunic
// shows down the front. The hands hang just below its hem.
const MANTLE_DOWN = [
  "..qrrrRSSRrrrR..",
  "..qrrrrzyrrrrR..",
  "..qrrrRbbRrrrR..",
  "..rRRRcbbbBRRR..",
];

const TUNIC_DOWN = [
  "...syyyzzyyys...",
  "....cbbbbbbB....",
  "...cbbbbbbbbB...",
];

// From behind, the hood's point hangs down over the mantle.
const HOOD_BACK = [
  "....qrrrrrrR....",
  "....qrrrrrrR....",
  "....qrrrrrRR....",
  "....rrrrrRRR....",
  "...qRrrrrrrRR...",
  "..qrrRrrrrRrrR..",
  "..qrrrRrrRrrrR..",
  "..qrrrrRRrrrRR..",
  "..rRRRRRRRRRRR..",
];

const LEGS_STAND = [
  ".....mm..mm.....",
  ".....mm..mm.....",
  ".....nn..nn.....",
  "....nnn..nnN....",
  "....NNN..NNN....",
  "................",
  "................",
];

const LEGS_STEP = [
  ".....mm..mm.....",
  ".....mm..mm.....",
  ".....nn..nnN....",
  "....nnn..NNN....",
  "....NNN.........",
  "................",
  "................",
];

const LEGS_WIDE = [
  "....mm....mm....",
  "....mm....mm....",
  "....nn....nn....",
  "...nnn....nnN...",
  "...NNN....NNN...",
  "................",
  "................",
];

export const HERO_DOWN = [...HOOD_TOP, ...FACE_DOWN, ...MANTLE_DOWN, ...TUNIC_DOWN, ...LEGS_STAND];

export const HERO_DOWN_STEP = [...HERO_DOWN.slice(0, 17), ...LEGS_STEP];

// Blinking, now and then, while standing around: the eyes close to a line.
export const HERO_DOWN_BLINK = [...HERO_DOWN.slice(0, 7), "....rssssssR....", "....RsxssxsR....", ...HERO_DOWN.slice(9)];

export const HERO_UP = [
  ...HOOD_TOP,
  ...HOOD_BACK,
  "...syyyyyyyys...",
  "....cbbbbbbB....",
  "...cbbbbbbbbB...",
  ...LEGS_STAND,
];

export const HERO_UP_STEP = [...HERO_UP.slice(0, 17), ...LEGS_STEP];

const SIDE_HOOD = [
  "................",
  "................",
  "......rrr.......",
  ".....qrrrrR.....",
  "....qrrrrrrr....",
  "...qrrrrrRRRr...",
  "..qrrrrrRhhhR...",
  "..rrrrrrRsses...",
  "..rRrrrrRssess..",
  "...RRrrrRSsss...",
];

const SIDE_LEGS = [
  ".....mm.mm......",
  ".....mm.mm......",
  ".....nn.nn......",
  ".....nnnnnn.....",
  ".....NNNNNN.....",
  "................",
  "................",
];

const SIDE_LEGS_STRIDE = [
  ".....mm..mm.....",
  "....mm....mm....",
  "....nn....nn....",
  "...nnn....nnn...",
  "...NNN....NNN...",
  "................",
  "................",
];

export const HERO_RIGHT = [
  ...SIDE_HOOD,
  "...RrrrrrrrzR...",
  "...RrrrrrrrrR...",
  "...RRrrrrrrrR...",
  "....RRRRRRRRR...",
  "....Byyysyy.....",
  "....Bbbbbbc.....",
  "...BBbbbbbbc....",
  ...SIDE_LEGS,
];

// Mid-stride, the mantle swings out behind.
export const HERO_RIGHT_STEP = [
  ...SIDE_HOOD,
  "...RrrrrrrrzR...",
  "..RrrrrrrrrrR...",
  "..RRrrrrrrrrR...",
  "...RRRRRRRRRR...",
  ...HERO_RIGHT.slice(14, 17),
  ...SIDE_LEGS_STRIDE,
];

export const HERO_RIGHT_BLINK = [...HERO_RIGHT.slice(0, 7), "..rrrrrrRssss...", "..rRrrrrRssxss..", ...HERO_RIGHT.slice(9)];

// ---------------------------------------------------------------------------
// The sword swing: three poses for each direction, one per stretch of the
// blade's arc (out to the side, the diagonal, then straight ahead; see
// SWING_ARC in engine/hero.ts), so the arm follows the sword around. The
// last pose doubles for holding a charge and for casting.
// ---------------------------------------------------------------------------

// Facing down, the blade sweeps in from your right (screen right)...
export const HERO_DOWN_SWING_A = [
  ...HOOD_TOP,
  ...FACE_DOWN,
  "..qrrrRSSRrrrR..",
  "..qrrrrzyrrrrR..",
  "..qrrrRbbRrrrRR.",
  "..rRRRcbbbBRRbb.",
  "...syyyzzyyyB.s.",
  ...TUNIC_DOWN.slice(1),
  ...LEGS_WIDE,
];

export const HERO_DOWN_SWING_B = [
  ...HOOD_TOP,
  ...FACE_DOWN,
  ...MANTLE_DOWN,
  "...syyyzzyyyBb..",
  "....cbbbbbbBbb..",
  "...cbbbbbbbbBs..",
  ...LEGS_WIDE,
];

// ...and ends in a two-handed thrust at your feet.
export const HERO_DOWN_SWING_C = [
  ...HOOD_TOP,
  ...FACE_DOWN,
  ...MANTLE_DOWN,
  "...byyyzzyyyB...",
  "....cbcbbcbB....",
  "...cbbbccbbbB...",
  "....mm.ss.mm....",
  ...LEGS_WIDE.slice(1),
];

// Facing up, it comes from the left, rises over your shoulder, and ends
// held out ahead (hidden behind you).
export const HERO_UP_SWING_A = [
  ...HOOD_TOP,
  ...HOOD_BACK.slice(0, 7),
  "..qrrrrRRrrrRR..",
  ".bbRRRRRRRRRRR..",
  ".s..yyyyyyyys...",
  "....cbbbbbbB....",
  "...cbbbbbbbbB...",
  ...LEGS_WIDE,
];

export const HERO_UP_SWING_B = [
  ...HOOD_TOP,
  ...HOOD_BACK.slice(0, 4),
  ".s.qRrrrrrrRR...",
  ".bqrrRrrrrRrrR..",
  ".bqrrrRrrRrrrR..",
  "..qrrrrRRrrrRR..",
  "..rRRRRRRRRRRR..",
  "....yyyyyyyys...",
  "....cbbbbbbB....",
  "...cbbbbbbbbB...",
  ...LEGS_WIDE,
];

export const HERO_UP_SWING_C = [
  ...HOOD_TOP,
  ...HOOD_BACK.slice(0, 2),
  "...sqrrrrrRRs...",
  "...brrrrrRRRb...",
  "...bRrrrrrrRb...",
  ...HOOD_BACK.slice(5),
  "....yyyyyyyy....",
  "....cbbbbbbB....",
  "...cbbbbbbbbB...",
  ...LEGS_STEP,
];

// Facing right, it's an overhead chop: wound up behind your head, over
// the top, and out in front.
export const HERO_RIGHT_SWING_A = [
  ...SIDE_HOOD.slice(0, 7),
  ".BrrrrrrRsses...",
  ".BrRrrrrRssess..",
  "..BRRrrrRSsss...",
  "..RRrrrrrrrzR...",
  "..RrrrrrrrrrR...",
  "..RRrrrrrrrrR...",
  "...RRRRRRRRRR...",
  ...HERO_RIGHT.slice(14, 17),
  ...SIDE_LEGS_STRIDE,
];

export const HERO_RIGHT_SWING_B = [
  ...SIDE_HOOD,
  "...RrrrrrrrzR...",
  "...RrrrrrrrrRb..",
  "...RRrrrrrrrRs..",
  "....RRRRRRRRR...",
  "....Byyyyyy.....",
  ...HERO_RIGHT.slice(15, 17),
  ...SIDE_LEGS_STRIDE,
];

export const HERO_RIGHT_SWING_C = [
  ...SIDE_HOOD,
  "...RrrrrrrrzR...",
  "...RrrrrrrrrR...",
  "...RRrrrrrrrRb..",
  "....RRRRRRRRRbb.",
  "....Byyyyyy..bs.",
  ...HERO_RIGHT.slice(15, 17),
  ...SIDE_LEGS_STRIDE,
];

// Facing left, the arc is the same turn rotated, so it sweeps up from
// below instead. These are drawn facing right like everything else and
// mirrored when compiled; the last pose is HERO_RIGHT_SWING_C's.
export const HERO_LEFT_SWING_A = [
  ...HERO_RIGHT.slice(0, 13),
  "....RRRRRRRRR...",
  "....Byyyyyyb....",
  "....Bbbbbbcb....",
  "...BBbbbbbbcb...",
  ".....mm.mm.b....",
  ".....mm.ms......",
  ".....nn.snn.....",
  ".....nnnnnn.....",
  ".....NNNNNN.....",
  "................",
  "................",
];

export const HERO_LEFT_SWING_B = [
  ...HERO_RIGHT.slice(0, 13),
  "....RRRRRRRRR...",
  "....Byyyyyyb....",
  "....Bbbbbbcb....",
  "...BBbbbbbbcb...",
  ".....mm..mm..s..",
  ...SIDE_LEGS_STRIDE.slice(1),
];

// Both arms up, holding something over your head.
export const HERO_HOLD = [
  "................",
  "................",
  "......rrrR......",
  "...s.qrrrrR.s...",
  "...bqrrrrrrRb...",
  "...bqRRRRRRRb...",
  "...brhhjhhhRb...",
  "...brsessesRb...",
  "...bRsessesRb...",
  "...qrRsxxSRrR...",
  ...MANTLE_DOWN,
  "....yyyzzyyy....",
  ...TUNIC_DOWN.slice(1),
  ...LEGS_STAND,
];

// The blade points down; other directions are rotations of this.
export const SWORD = [
  ".......",
  "...y...",
  "..yzy..",
  "...n...",
  "...N...",
  ".yyzyy.",
  "..awA..",
  "..awA..",
  "..awA..",
  "..awA..",
  "..awA..",
  "..awA..",
  "..awA..",
  "...w...",
  ".......",
];

// Pointing down and to the right, hilt up top.
export const SWORD_DIAGONAL = [
  "..............",
  ".y............",
  "..n...........",
  "...N.y........",
  "....zy........",
  "...yyaw.......",
  ".....waA......",
  "......waA.....",
  ".......waA....",
  "........waA...",
  ".........waA..",
  "..........wa..",
  "..............",
  "..............",
];

// The Switcheroo wand, pointing right.
export const WAND = [
  "..............",
  "..........v...",
  ".........vpv..",
  "...nnnmmvpwpv.",
  "...NNNNN.vpv..",
  "..........v...",
  "..............",
];

// The hero's hood, blinking on the map to say "you are here".
export const MAP_ICON = [
  "..........",
  "....rR....",
  "..qrrrrR..",
  ".qrRRRRrR.",
  ".qrhhhhrR.",
  ".qresserR.",
  ".rRSssSRR.",
  "..RRRRRR..",
  "..........",
];
