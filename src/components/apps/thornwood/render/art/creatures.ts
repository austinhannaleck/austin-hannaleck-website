// Enemies and villagers, hand-drawn. Same conventions as hero.ts: no
// outlines (added when compiled), one pixel of empty margin all round.

// ---------------------------------------------------------------------------
// Jellop: a wobbly green jelly. Two frames, squashed and stretched.
// ---------------------------------------------------------------------------
export const JELLOP_A = [
  "................",
  "................",
  "................",
  "................",
  "......gggg......",
  "....ggllgggg....",
  "...glwwlggggG...",
  "..gglllggggggG..",
  "..ggggggggggGG..",
  "..gggeggggeggG..",
  "..gggeggggeggG..",
  "..ggfggggggfgG..",
  "..GggggggggggG..",
  "...GGggggggGG...",
  "....GGGGGGGG....",
  "................",
];

export const JELLOP_B = [
  "................",
  "................",
  "......gggg......",
  ".....gllggg.....",
  "....glwwlggG....",
  "....gllggggG....",
  "...gggggggggG...",
  "...ggeggggegG...",
  "...ggeggggegG...",
  "...gfggggggfG...",
  "...gggggggggG...",
  "...GggggggggG...",
  "...GGggggggGG...",
  "....GGGGGGGG....",
  "................",
  "................",
];

// ---------------------------------------------------------------------------
// Flitter: a round purple bat with googly eyes. Wings up, wings down.
// ---------------------------------------------------------------------------
export const FLITTER_A = [
  "................",
  "................",
  "..P..........P..",
  "..pP........Pp..",
  "..ppP.p..p.Ppp..",
  "...pppppppppp...",
  "..pPpweppewpPp..",
  "...PpwwppwwpP...",
  "....PppppppP....",
  ".....PwPPwP.....",
  "......PPPP......",
  "................",
];

export const FLITTER_B = [
  "................",
  "................",
  "................",
  "......p..p......",
  ".....pppppp.....",
  ".....pppppp.....",
  "..ppPweppewPpp..",
  ".ppPPwwppwwPPpp.",
  ".pP..PppppP..Pp.",
  ".P....PwwP....P.",
  "......PPPP......",
  "................",
];

// ---------------------------------------------------------------------------
// Bramble Knight: a chubby armored goon with a spear and glowing eyes.
// ---------------------------------------------------------------------------
const KNIGHT_LEGS = ["....AA....AA..n.", "....aA....aA..n.", "...iAA....AAi.n.", "................", "................"];
const KNIGHT_LEGS_STEP = ["....AA....aA..n.", "....aA...iAA..n.", "...iAA........n.", "................", "................"];

const KNIGHT_DOWN_TOP = [
  "................",
  ".......rr.....a.",
  "......rRRr....a.",
  ".....aaaaAA...A.",
  "....awaaaAAi..n.",
  "...aaaaaaAAAi.n.",
  "...eeeeeeeeee.n.",
  "...eeyeeeeyee.n.",
  "...AaaaaaAAAi.n.",
  "....iAAAAAAi..n.",
  "..aA.RrrrrR.Aan.",
  "..AAaRrrrrRaAAn.",
  "..iArrrrrrrrAin.",
  "...ArrryyrrrAan.",
  "...ArryzzyrrA.n.",
  "...ArrryyrrrA.n.",
  "...yyyyyyyyyy.n.",
  "...RrrrrrrrrR.n.",
  "...RRrrrrrrRR.n.",
];

export const KNIGHT_DOWN = [...KNIGHT_DOWN_TOP, ...KNIGHT_LEGS];
export const KNIGHT_DOWN_STEP = [...KNIGHT_DOWN_TOP, ...KNIGHT_LEGS_STEP];

const KNIGHT_UP_TOP = [
  "................",
  ".......rr.....a.",
  "......rRRr....a.",
  ".....aaaaAA...A.",
  "....aaaaaAAi..n.",
  "...aaaaaaAAAi.n.",
  "...aaaaaaAAAi.n.",
  "...AaaaaaAAAi.n.",
  "...AAAAAAAAAi.n.",
  "....iAAAAAAi..n.",
  "..aA.RrrrrR.Aan.",
  "..AAaRrrrrRaAAn.",
  "..iArrrrrrrrAin.",
  "...ArrrrrrrrAan.",
  "...ArrrrrrrrA.n.",
  "...ArrrrrrrrA.n.",
  "...yyyyyyyyyy.n.",
  "...RrrrrrrrrR.n.",
  "...RRrrrrrrRR.n.",
];

export const KNIGHT_UP = [...KNIGHT_UP_TOP, ...KNIGHT_LEGS];
export const KNIGHT_UP_STEP = [...KNIGHT_UP_TOP, ...KNIGHT_LEGS_STEP];

const KNIGHT_RIGHT_TOP = [
  "................",
  ".....rr......a..",
  "....rRRr.....a..",
  ".....aaaaAA..A..",
  "....aaaawaAi.n..",
  "...aaaaaaaAA.n..",
  "...aaaaaeeee.n..",
  "...AaaaaeyeeAn..",
  "...AAaaaaaAAin..",
  "....iAAAAAAi.n..",
  "....aARrrrRAan..",
  "....AArrrrrAAn..",
  "....iArrrrrrAn..",
  "....ArryyrrA.n..",
  "....ArrzzrrA.n..",
  "....ArryyrrA.n..",
  "....yyyyyyyy.n..",
  "....RrrrrrrR.n..",
  "....RRrrrrRR.n..",
];

export const KNIGHT_RIGHT = [
  ...KNIGHT_RIGHT_TOP,
  ".....AA..AA..n..",
  ".....aA..aA..n..",
  "....iAA..AAi.n..",
  "................",
  "................",
];

export const KNIGHT_RIGHT_STEP = [
  ...KNIGHT_RIGHT_TOP,
  "....AA....AA.n..",
  "...aA......aAn..",
  "..iAA......AAin.",
  "................",
  "................",
];

// ---------------------------------------------------------------------------
// Spitbug: a round orange bug with eyes on stalks and a spitting snout.
// ---------------------------------------------------------------------------
export const SPITBUG_DOWN = [
  "................",
  "...ww......ww...",
  "...ew......we...",
  "....O......O....",
  "....OooooooO....",
  "...oozzooooOO...",
  "..ooozooooooOO..",
  "..oOoooooooOoO..",
  "..ooooOoooooOO..",
  "..OooooooooOOO..",
  "...OOOnnnnOOO...",
  "......nNNn......",
  "......NeeN......",
  "...OO......OO...",
  "................",
  "................",
];

export const SPITBUG_UP = [
  "................",
  "...ww......ww...",
  "...ww......ww...",
  "....O..nn..O....",
  "....OoonnooO....",
  "...ooooooooOO...",
  "..oooooooooOOO..",
  "..oOoooooooOoO..",
  "..ooooOoooooOO..",
  "..OooooooooOOO..",
  "...OOOOOOOOOO...",
  "....OO....OO....",
  "................",
  "................",
  "................",
  "................",
];

export const SPITBUG_RIGHT = [
  "................",
  "......ww........",
  "......we........",
  ".......O........",
  "....oooooo......",
  "...oozzooooO....",
  "..ooozoooooOO...",
  "..oOoooooooOnnn.",
  "..ooooOooooONeN.",
  "..OooooooooOnnn.",
  "...OOOOOOOOO....",
  "....OO...OO.....",
  "................",
  "................",
  "................",
  "................",
];

// ---------------------------------------------------------------------------
// Nana Shellby: a retired-adventurer tortoise in big round glasses.
// ---------------------------------------------------------------------------
export const NANA = [
  "................",
  ".......ww.......",
  "......wwEw......",
  ".....llllll.....",
  "....llllllll....",
  "...lYYYllYYYl...",
  "...lYweYYewYl...",
  "...lYYYllYYYl...",
  "....llllllll....",
  "....lllGGlll....",
  ".....gllllg.....",
  "..nNppppppppNn..",
  "..nNpvppppvpNn..",
  "..nNmmmmmmmmNn..",
  "..nlmmmmmmmmln..",
  "..nlmmmmmmmmlnN.",
  "..NnmmmmmmmmnNN.",
  "...NnmmmmmmnN.N.",
  "....NNnnnnNN..N.",
  ".....ll..ll...N.",
  ".....GG..GG...N.",
  "................",
  "................",
  "................",
];

// ---------------------------------------------------------------------------
// Banjo: Austin's dog (also the star of Get the Buggy), in his own colors.
// ---------------------------------------------------------------------------
export const BANJO_DOWN = [
  "................",
  "................",
  "................",
  ".....nnnnnn.....",
  "...NNnnnnnnNN...",
  "..NNnennnnenNN..",
  "..NNnnnmmnnnNN..",
  "..NN.nmeemn.NN..",
  "...N.nmmmmn.N...",
  "......rryr......",
  ".....nnnnnn.....",
  "....nnnmmnnn....",
  "....nnmmmmnn....",
  ".....nn..nn.....",
  ".....mm..mm.....",
  "................",
];

export const BANJO_UP = [
  "................",
  "................",
  "................",
  ".....nnnnnn.....",
  "...NNnnnnnnNN...",
  "..NNnnnnnnnnNN..",
  "..NNnnnnnnnnNN..",
  "..NN.nnnnnn.NN..",
  "...N.nnnnnn.N...",
  "......rrrr......",
  ".....nnnnnn.....",
  "....nnnnnnnn....",
  "....nnnnnnnn....",
  ".....nn..nn.....",
  ".....mm..mm.....",
  "................",
];

export const BANJO_RIGHT = [
  "................",
  "................",
  "................",
  "................",
  "..........nnn...",
  ".........nnnnn..",
  "..n.....NNnnenm.",
  "..n.....NNnnmme.",
  "...n.....Nnnmm..",
  "...nnnnnnnrrr...",
  "...nnnnnnnnnn...",
  "...nmmmmmmmnn...",
  "...nn....nn.....",
  "...mm....mm.....",
  "................",
  "................",
];

export const BANJO_RIGHT_STEP = [
  ...BANJO_RIGHT.slice(0, 12),
  "....nn..nn......",
  "....mm..mm......",
  "................",
  "................",
];

// ---------------------------------------------------------------------------
// Ribbit: a frog shopkeeper in a fez.
// ---------------------------------------------------------------------------
export const RIBBIT = [
  "................",
  "................",
  "..gg..rrrry.gg..",
  ".gwwg.rRRr.gwwg.",
  ".gweggggggggewg.",
  "..gggggggggggg..",
  ".gggggggggggggg.",
  ".gGeeeeeeeeeeGg.",
  ".ggllllllllllgg.",
  "..gllllllllllg..",
  "..ggllllllllgg..",
  ".ggggllllllgggg.",
  "..gggggggggggg..",
  "...gg......gg...",
  "..GGG......GGG..",
  "................",
];

// ---------------------------------------------------------------------------
// Moanica: a melodramatic little ghost with a pink bow.
// ---------------------------------------------------------------------------
const GHOST_TOP = [
  "................",
  ".....ffFff......",
  "......wwww......",
  "....wwwwwwww....",
  "...wwwwwwwwwE...",
  "...wwwewwewwE...",
  "...wweewweewE...",
  "...wfwwEEwwfE...",
  "..wwwwwwwwwwEE..",
  ".wwwwwwwwwwwEEw.",
  "..wwwwwwwwwwEE..",
  "..wwwwwwwwwEEE..",
  "..wwwwwwwwwEEE..",
];

export const GHOST_A = [...GHOST_TOP, "..wwE.wwE.wwE...", "..wE...wE...wE..", "................"];
export const GHOST_B = [...GHOST_TOP, "...wwE.wwE.wwE..", "...wE...wE...wE.", "................"];
