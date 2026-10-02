// Pickups, props, and the dungeon's moving parts.
//
// Anything that fills its whole tile edge to edge (doors, bars) is drawn
// with its own dark border and compiled without the automatic outline, so
// it lines up with the walls around it. Everything else gets outlined.

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------
export const GEM = [
  ".........",
  "....l....",
  "...llg...",
  "..lwggG..",
  "..lggGG..",
  "..lggGG..",
  "..lggGG..",
  "...gGG...",
  "....G....",
  ".........",
];

// The Flippers: a pair of webbed green fins with brown heel straps.
export const FLIPPERS = [
  "..................",
  ".l.l.l.l..l.l.l.l.",
  ".lglglgl..lglglgl.",
  ".lgggggl..lgggggl.",
  ".gggggGG..GGggggg.",
  "..gggGG....GGggg..",
  "..ggGGG....GGGgg..",
  "...gGG......GGg...",
  "...nnn......nnn...",
  "...GGd......dGG...",
  "..................",
];

export const SMALL_KEY = [
  "........",
  "..aaa...",
  ".a...a..",
  ".a...a..",
  "..aAa...",
  "...A....",
  "...A....",
  "...AA...",
  "...A....",
  "...AAA..",
  "...A....",
  "........",
];

export const BIG_KEY = [
  "..........",
  "...yyyy...",
  "..yz..yY..",
  "..y.rr.Y..",
  "..y.rr.Y..",
  "..yy..YY..",
  "...yYYY...",
  "....yY....",
  "....yY....",
  "....yYYY..",
  "....yY....",
  "....yYY...",
  "....yYYY..",
  "....yY....",
  "..........",
];

export const SEED = [
  "........",
  "...nn...",
  "..nmnN..",
  "..nnNN..",
  "...NN...",
  "........",
];

export const THORN = [
  ".........",
  "....w....",
  "..wpppw..",
  "..pvPPp..",
  ".wpPPPpw.",
  "..pPPPp..",
  "..wpppw..",
  "....w....",
  ".........",
];

// Unoutlined: bolts and sparkles glow.
export const BOLT_A = [
  ".........",
  "....v....",
  "...vpv...",
  "..vpwpv..",
  ".vpwwwpv.",
  "..vpwpv..",
  "...vpv...",
  "....v....",
  ".........",
];

export const BOLT_B = [
  ".........",
  ".v.....v.",
  "..p...p..",
  "...vwv...",
  "...www...",
  "...vwv...",
  "..p...p..",
  ".v.....v.",
  ".........",
];

export const STAR = ["..z..", ".yzy.", "zzwzz", ".yzy.", "..z.."];
export const SPARKLE = ["..w..", "..w..", "wwwww", "..w..", "..w.."];

// ---------------------------------------------------------------------------
// Overworld props
// ---------------------------------------------------------------------------
export const BUSH = [
  "................",
  "................",
  "....llg.gll.....",
  "...lllgglllg....",
  "..llgllllgllgG..",
  "..lglllgllllgG..",
  "..gllglllgllGG..",
  "..ggllgglggGGG..",
  "..gGggGgggGgGG..",
  "..GgGGggGGgGGd..",
  "...GGdGGGdGGd...",
  "....dddddddd....",
  "................",
  "................",
  "................",
  "................",
];

// A clay pot with a gold band. Smash it for a heart.
export const POT = [
  "................",
  "................",
  "................",
  ".....NmmmmN.....",
  "....NeeeeeeN....",
  ".....NmmmnN.....",
  "....nmmnnnnN....",
  "...nmmnnnnnnN...",
  "...nmnnnnnnnN...",
  "...yzyyyyyyyY...",
  "...nnnnnnnnNN...",
  "...nnnnnnnNNN...",
  "....nnnnnNNN....",
  ".....NNNNNN.....",
  "................",
  "................",
];

export const ROCK = [
  "................",
  "................",
  "................",
  "................",
  ".....EEEEE......",
  "...EEwwEEEDD....",
  "..EEwwEEEEDDD...",
  "..EEEEEEEDDDDC..",
  "..DEEEEEDDDDCC..",
  "..DDEEDDDDDCCC..",
  "..CDDDDDDDCCCC..",
  "...CCCDDCCCCC...",
  "....CCCCCCCC....",
  "................",
  "................",
  "................",
];

export const SIGN = [
  "................",
  "................",
  "..NNNNNNNNNNNN..",
  "..nmmmmmmmmmmn..",
  "..nmNNNmNNNmmn..",
  "..nmmmmmmmmmmn..",
  "..nmNNmNNNNmmn..",
  "..nmmmmmmmmmmn..",
  "..NNNNNNNNNNNN..",
  ".......nN.......",
  ".......nN.......",
  ".......nN.......",
  "......NnNN......",
  "................",
  "................",
  "................",
];

export const CHEST_CLOSED = [
  "................",
  "................",
  "................",
  "..nmmmmmmmmmmn..",
  "..nmnnnnnnnnmn..",
  "..nnnnnnnnnnnn..",
  "..yyyyyzzyyyyy..",
  "..NNNNNyYNNNNN..",
  "..ynnnnyYnnnny..",
  "..ynnnnnnnnnny..",
  "..ynnnnnnnnnny..",
  "..yNNNNNNNNNNy..",
  "..yyyyyyyyyyyy..",
  "................",
  "................",
  "................",
];

export const CHEST_OPEN = [
  "................",
  "..nmmmmmmmmmmn..",
  "..nnnnnnnnnnnn..",
  "..yyyyyyyyyyyy..",
  "..eeeeeeeeeeee..",
  "..eNeeeeeeeeNe..",
  "..yyyyyyyyyyyy..",
  "..NNNNNNNNNNNN..",
  "..ynnnnnnnnnny..",
  "..ynnnnnnnnnny..",
  "..ynnnnnnnnnny..",
  "..yNNNNNNNNNNy..",
  "..yyyyyyyyyyyy..",
  "................",
  "................",
  "................",
];

// ---------------------------------------------------------------------------
// Dungeon fixtures
// ---------------------------------------------------------------------------
export const BRAZIER = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "..CDDDDDDDDDDC..",
  "..DyyyyyyyyyyD..",
  "...DDDDDDDDDD...",
  "....CDDDDDDC....",
  ".....DEEEED.....",
  ".....DEEEED.....",
  ".....DEEEED.....",
  "....CDDDDDDC....",
  "...CCCCCCCCCC...",
  "................",
  "................",
];

// Unoutlined: fire glows.
export const FLAME = [
  "....z.....",
  "...zy.....",
  "...yyz....",
  "..yyoy....",
  "..yoooy...",
  ".yoorooy..",
  ".yoorroy..",
  ".yorRroy..",
  "..yorroy..",
  "...yooy...",
];

export const FLAME_TALL = [
  ".....z....",
  "....zy....",
  "...zyy....",
  "...yyoy...",
  "..yyooy...",
  "..yoroyy..",
  ".yoorrooy.",
  ".yorRRroy.",
  ".yorRrroy.",
  "..yorroy..",
];

export const PEG_UP = [
  "................",
  "................",
  "................",
  ".....qqqqqq.....",
  "....qwwqqqqq....",
  "....rqqqqqqR....",
  "....rrrrrrRR....",
  "....rrrrrrRR....",
  "....rrrrrrRR....",
  "....rrrrrrRR....",
  "....RrrrrRRR....",
  ".....RRRRRR.....",
  "................",
  "................",
  "................",
  "................",
];

export const PEG_DOWN = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".....RRRRRR.....",
  "....RqqqqqqR....",
  "....RrrrrrRR....",
  ".....RRRRRR.....",
  "................",
  "................",
  "................",
  "................",
];

export const SWITCH = [
  "................",
  "................",
  "......rrrr......",
  ".....rwqrrr.....",
  "....rwqrrrrR....",
  "....rqrrrrRR....",
  "....rrrrrrRR....",
  ".....rrrrRR.....",
  "......RRRR......",
  ".....yyyyyy.....",
  "....DEEEEEED....",
  ".....DEEEED.....",
  ".....DEEEED.....",
  "....CDDDDDDC....",
  "................",
  "................",
];

export const PLATE_UP = [
  "................",
  "................",
  "................",
  "..DDDDDDDDDDDD..",
  "..DEEEEEEEEEED..",
  "..DEEEppppEEED..",
  "..DEEpEEEEpEED..",
  "..DEEpEEEEpEED..",
  "..DEEEppppEEED..",
  "..DEEEEEEEEEED..",
  "..CCCCCCCCCCCC..",
  "..CCCCCCCCCCCC..",
  "................",
  "................",
  "................",
  "................",
];

export const PLATE_DOWN = [
  "................",
  "................",
  "................",
  "................",
  "..DDDDDDDDDDDD..",
  "..DEEEEEEEEEED..",
  "..DEEEvvvvEEED..",
  "..DEEvEEEEvEED..",
  "..DEEvEEEEvEED..",
  "..DEEEvvvvEEED..",
  "..DEEEEEEEEEED..",
  "..CCCCCCCCCCCC..",
  "................",
  "................",
  "................",
  "................",
];

// The overgrown iron gate in front of Bramblekeep, with a leaf-shaped
// lock. Full-tile, unoutlined.
export const GATE = [
  "kkkkkkkkkkkkkkkk",
  "kAAAAAAAAAAAAAAk",
  "kaAeaAeaAeaAeaAk",
  "kaAegGeaAeaAeaAk",
  "kaAeaGgaAeaAegGk",
  "kaAeaAeyyyaAeGAk",
  "kgGeaAyzzzYAeaAk",
  "kaGgaAyzeeYAeaAk",
  "kaAGgAyzeYYAgGAk",
  "kaAeaAeYYYaAGaAk",
  "kaAeaAeaAeaGgaAk",
  "kaAegGeaAegGeaAk",
  "kaAeaGgaAGgAeaAk",
  "kaAeaAeaAeaAeaAk",
  "kAAAAAAAAAAAAAAk",
  "kkkkkkkkkkkkkkkk",
];

// Full-tile, unoutlined.
export const DOOR = [
  "kkkkkkkkkkkkkkkk",
  "kNnnnnnNNnnnnnNk",
  "kNnmnnnNNnmnnnNk",
  "kNnnnnnNNnnnnnNk",
  "kAAAAAAAAAAAAAAk",
  "kNnnnnnNNnnnnnNk",
  "kNnnnnyyyynnnnNk",
  "kNnnnyzzzYynnnNk",
  "kNnnnyYeeYynnnNk",
  "kNnnnyYeYYynnnNk",
  "kNnnnnyyyynnnnNk",
  "kAAAAAAAAAAAAAAk",
  "kNnnnnnNNnnnnnNk",
  "kNnmnnnNNnmnnnNk",
  "kNnnnnnNNnnnnnNk",
  "kkkkkkkkkkkkkkkk",
];

export const BARS = [
  "kiiiiiiiiiiiiiik",
  "kAAAAAAAAAAAAAAk",
  ".aA..aA..aA..aA.",
  ".aA..aA..aA..aA.",
  ".aA..aA..aA..aA.",
  ".aA..aA..aA..aA.",
  ".aA..aA..aA..aA.",
  ".aA..aA..aA..aA.",
  ".aA..aA..aA..aA.",
  ".aA..aA..aA..aA.",
  ".aA..aA..aA..aA.",
  ".aA..aA..aA..aA.",
  ".aA..aA..aA..aA.",
  ".wA..wA..wA..wA.",
  "kAAAAAAAAAAAAAAk",
  "kiiiiiiiiiiiiiik",
];

// ---------------------------------------------------------------------------
// Fernwhistle's quest items: a letter (and Mossbeard's muddy reply), and
// the Mayor's ring.
// ---------------------------------------------------------------------------
export const LETTER = [
  "..............",
  ".wwwwwwwwwwww.",
  ".wEwwwwwwwwEw.",
  ".wwEwwwwwwEww.",
  ".wwwEwwwwEwww.",
  ".wwwwErrEwwww.",
  ".wwwwwrrwwwww.",
  ".wwwwwwwwwwww.",
  ".EEEEEEEEEEEE.",
  "..............",
];

export const RING = [
  "..........",
  "....tu....",
  "...tTTu...",
  "...yzzy...",
  "..yY..zy..",
  "..y....y..",
  "..Y....y..",
  "..YY..yY..",
  "...YYYY...",
  "..........",
];
