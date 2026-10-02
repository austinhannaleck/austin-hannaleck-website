// The hero: a chibi kid in a blue tunic and a red scarf, with a cowlick
// that will not lie flat. 16x24 frames, authored without outlines (they're
// added when compiled), feet on row 21. Left-facing frames are mirrors of
// the right-facing ones.

const HEAD_TOP = [
  "................",
  ".......jh.......",
  "....hhjjhhhh....",
  "...hhjjjhhhhh...",
  "..hhhjjhhhhhhh..",
  "..hhhhhhhhhhhH..",
];

const FACE_DOWN = [
  "..hhssshhsssHH..",
  "..hsewssssewsH..",
  "..hseesssseesH..",
  "...SfssxxssfS...",
  "....SSssssSS....",
  "...qrrrrrrrrR...",
];

const BACK_OF_HEAD = [
  "..hhhhhhhhhhhH..",
  "..hhhhjhhhhhhH..",
  "..hhhhhhhhhhhH..",
  "...HhhhhhhhhH...",
  "....SSSSSSSS....",
  "...qrrrrrrrrR...",
];

const LEGS_STAND = [
  ".....mm..mm.....",
  ".....mm..mm.....",
  "....nnn..nnn....",
  "....NNN..NNN....",
  "................",
  "................",
];

const LEGS_STEP = [
  ".....mm..mm.....",
  ".....mm..nnn....",
  "....nnn..NNN....",
  "....NNN.........",
  "................",
  "................",
];

const LEGS_WIDE = [
  "....mm....mm....",
  "....mm....mm....",
  "...nnn....nnn...",
  "...NNN....NNN...",
  "................",
  "................",
];

export const HERO_DOWN = [
  ...HEAD_TOP,
  ...FACE_DOWN,
  "..bcbbrrrrbbBB..",
  "..bcbbbrRbbbBB..",
  "..bcbbbbbbbbBB..",
  "..sbyyyzzyyyBS..",
  "...cbbbbbbbbB...",
  "...BBbbbbbbBB...",
  ...LEGS_STAND,
];

export const HERO_DOWN_STEP = [...HERO_DOWN.slice(0, 18), ...LEGS_STEP];

export const HERO_DOWN_ATTACK = [
  ...HEAD_TOP,
  ...FACE_DOWN,
  "...cbbrrrrbbB...",
  "...cbbbrRbbbB...",
  "...cbbbbbbbbB...",
  "...byyyzzyyyB...",
  "...cbbbssbbbB...",
  "...BBbbbbbbBB...",
  ...LEGS_WIDE,
];

export const HERO_UP = [
  ...HEAD_TOP,
  ...BACK_OF_HEAD,
  "..bcbbbrRbbbBB..",
  "..bcbbbrRbbbBB..",
  "..bcbbbqRbbbBB..",
  "..sbyyyyyyyyBS..",
  "...cbbbbbbbbB...",
  "...BBbbbbbbBB...",
  ...LEGS_STAND,
];

export const HERO_UP_STEP = [...HERO_UP.slice(0, 18), ...LEGS_STEP];

export const HERO_UP_ATTACK = [
  ...HEAD_TOP,
  ...BACK_OF_HEAD.slice(0, 4),
  ".s..SSSSSSSS..s.",
  ".bbqrrrrrrrrRBB.",
  "..bcbbbrRbbbBB..",
  "...cbbbrRbbbB...",
  "...cbbbqRbbbB...",
  "...byyyyyyyyB...",
  "...cbbbbbbbbB...",
  "...BBbbbbbbBB...",
  ...LEGS_WIDE,
];

const SIDE_HEAD = [
  "................",
  "......jh........",
  "....hhjjhhh.....",
  "...hhjjjhhhh....",
  "..hhhjjhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..Hhhhhhhsssss..",
  "..Hhhhhhsssews..",
  "..HHhhhhssseess.",
  "...HHhhhsfssx...",
  "....HHSSsssS....",
  "..rRrrrrrrrq....",
];

export const HERO_RIGHT = [
  ...SIDE_HEAD,
  ".rr.Bbbbbbbc....",
  ".r..Bbbbsbbc....",
  "....Bbbbsbbc....",
  "....Byyyzyyy....",
  "....Bbbbbbbc....",
  "....BBbbbbBB....",
  ".....mm.mm......",
  ".....mm.mm......",
  ".....nnn.nnn....",
  ".....NNN.NNN....",
  "................",
  "................",
];

export const HERO_RIGHT_STEP = [
  ...SIDE_HEAD,
  ".rr.Bbbbbbbc....",
  ".r..Bbbbsbbc....",
  "....Bbbbsbbc....",
  "....Byyyzyyy....",
  "....Bbbbbbbc....",
  "....BBbbbbBB....",
  "....mm...mm.....",
  "...mm.....mm....",
  "..nnn......nnn..",
  "..NNN......NNN..",
  "................",
  "................",
];

export const HERO_RIGHT_ATTACK = [
  ...SIDE_HEAD,
  ".rr.Bbbbbbbcbs..",
  ".r..Bbbbbbbcss..",
  "....Bbbbbbbc....",
  "....Byyyzyyy....",
  "....Bbbbbbbc....",
  "....BBbbbbBB....",
  "....mm...mm.....",
  "...mm.....mm....",
  "..nnn......nnn..",
  "..NNN......NNN..",
  "................",
  "................",
];

// Both arms up, holding something over your head.
export const HERO_HOLD = [
  ...HEAD_TOP.slice(0, 5),
  ".shhhhhhhhhhhHs.",
  ".bhhssshhsssHHb.",
  ".bhsewssssewsHB.",
  ".bhseesssseesHB.",
  ".b.SfssRRssfS.B.",
  ".b..SSssssSS..B.",
  "..bqrrrrrrrrRB..",
  "...cbbrrrrbbB...",
  "...cbbbrRbbbB...",
  "...cbbbbbbbbB...",
  "...byyyzzyyyB...",
  "...cbbbbbbbbB...",
  "...BBbbbbbbBB...",
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
