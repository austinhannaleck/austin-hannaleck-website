// Enemies and villagers, hand-drawn. Same conventions as hero.ts: no
// outlines (added when compiled), one pixel of empty margin all round.
// A _BLINK frame is the same drawing with its eyes shut, for blinking now
// and then.

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

// Standing around, a knight looks this way and that: the visor slides over
// to one side, and the plume leans with it.
export const KNIGHT_DOWN_LOOK_LEFT = [
  ...KNIGHT_DOWN.slice(0, 1),
  "......rr......a.",
  ".....rRRr.....a.",
  ...KNIGHT_DOWN.slice(3, 6),
  "...eeeeeeeAAi.n.",
  "...eyeeyeeAAi.n.",
  ...KNIGHT_DOWN.slice(8),
];

export const KNIGHT_DOWN_LOOK_RIGHT = [
  ...KNIGHT_DOWN.slice(0, 1),
  "........rr....a.",
  ".......rRRr...a.",
  ...KNIGHT_DOWN.slice(3, 6),
  "...aaaeeeeeee.n.",
  "...aaaeeyeeye.n.",
  ...KNIGHT_DOWN.slice(8),
];

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
// Nana Shellby: your grandmother, a retired adventurer in big round
// glasses, her old red shawl, and a walking stick.
// ---------------------------------------------------------------------------
export const NANA = [
  "................",
  "......EwwE......",
  ".....EwwwwD.....",
  "......DEED......",
  "....EwwwwwwE....",
  "...EwwwwwwwwD...",
  "...DYYYssYYYD...",
  "...sYweYYewYS...",
  "...sYYYssYYYS...",
  "....ssssssSS....",
  ".....SsxxsS.....",
  "....qrSSSSrR....",
  "...qrrrrrrrrR.N.",
  "..qrrrrrrrrrrRN.",
  "..sRrrrrrrrrRsN.",
  "...vppppppppP.N.",
  "...vppppppppP.N.",
  "...vpppppppPP.N.",
  "....PPPPPPPP..N.",
  ".....NN..NN...N.",
  "................",
];

// The glint off her glasses, sweeping across one lens and then the other.
export const NANA_GLINT_A = [...NANA.slice(0, 6), "...DYzwssYYYD...", "...sYwwYYewYS...", ...NANA.slice(8)];
export const NANA_GLINT_B = [...NANA.slice(0, 6), "...DYYYssYzwD...", "...sYweYYwwYS...", ...NANA.slice(8)];

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

export const BANJO_DOWN_BLINK = [...BANJO_DOWN.slice(0, 5), "..NNnnnnnnnnNN..", ...BANJO_DOWN.slice(6)];

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

export const BANJO_RIGHT_BLINK = [...BANJO_RIGHT.slice(0, 6), "..n.....NNnnnnm.", ...BANJO_RIGHT.slice(7)];

export const BANJO_RIGHT_STEP = [
  ...BANJO_RIGHT.slice(0, 12),
  "....nn..nn......",
  "....mm..mm......",
  "................",
  "................",
];

// ---------------------------------------------------------------------------
// Haggleby: Puddlebrook's shopkeeper, in a fez and a green waistcoat,
// with a mustache he's very proud of.
// ---------------------------------------------------------------------------
export const HAGGLEBY = [
  "................",
  "......qrrR......",
  "......rrrRy.....",
  ".....RRRRRRY....",
  "....hhhhhhhH....",
  "....hsessesH....",
  "....ssssssSS....",
  "...HhHHHHHHhH...",
  ".....SsssSS.....",
  "...wwgwwwwgww...",
  "..wEggwwwwgGEw..",
  "..wEggwwwygGEw..",
  "..sSggwwwwgGSs..",
  "....NNNyNNNN....",
  "....nnnnnnnN....",
  "....nnN..nnN....",
  "....nnN..nnN....",
  "....eee..eee....",
  "................",
];

export const HAGGLEBY_BLINK = [...HAGGLEBY.slice(0, 5), "....hsxssxsH....", ...HAGGLEBY.slice(6)];

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

// ---------------------------------------------------------------------------
// Mossbeard: Bramblekeep's retired gatekeeper, still in his old miner's
// helmet, with a beard so old it's gone mossy.
// ---------------------------------------------------------------------------
export const MOSSBEARD = [
  "................",
  "................",
  ".....yyzzyy.....",
  "....yyyzzyyy....",
  "....yyyyyyyy....",
  "...YYYYYYYYYY...",
  "....EsssssSE....",
  "....sesssesS....",
  "....ssssssSS....",
  "...lgsssssSgl...",
  "...gglgggglgg...",
  "..ngGggggggGgn..",
  "..nngglgglggnn..",
  "..sNgGggggGgNs..",
  "...NNgGggGgNN...",
  "...NNNgGgNNNN...",
  "...NNNNgNNNNN...",
  "....NNNNNNNN....",
  ".....NN..NN.....",
  ".....ee..ee.....",
  "................",
];

export const MOSSBEARD_BLINK = [...MOSSBEARD.slice(0, 7), "....sxsssxsS....", ...MOSSBEARD.slice(8)];

// ---------------------------------------------------------------------------
// Cap'n Pinch: a retired pirate. Tricorn, eyepatch, peg leg, the lot.
// ---------------------------------------------------------------------------
export const PINCH = [
  "................",
  "................",
  ".......w........",
  "...eeeeweeee....",
  "..eeeeeeeeeee...",
  "...ewwwwwwwe....",
  "....sssssSSS....",
  "....seseeeeS....",
  "....sssseeSS....",
  "....ADaaaaDA....",
  ".....ADaaDA.....",
  "...rrryRRyrrr...",
  "..rrRryrryrRrr..",
  "..rrRrryyrrRrr..",
  "..sRRrrrrrrRRs..",
  "...rrrrrrrrrr...",
  "....nnnnnnnN....",
  "....nnN...m.....",
  "....NNN...m.....",
  "................",
];

// ===========================================================================
// Fernwhistle
// ===========================================================================

// ---------------------------------------------------------------------------
// Mama Mallard: Fernwhistle's duck keeper, in a blue bonnet and a pink
// apron.
// ---------------------------------------------------------------------------
export const MALLARD = [
  "................",
  "......bbbb......",
  "....bbccccbb....",
  "...bBhhhhhhBb...",
  "...bhsssssShb...",
  "...bsesssesSb...",
  "...BsfsssfSSb...",
  "....rSsxxsSr....",
  ".....rSSSSr.....",
  "...wwwffffwww...",
  "..wwEwffffwEww..",
  "..wEwFFFFFFwEw..",
  "..sSffffffffSs..",
  "...wffffffffw...",
  "...wfffffffFw...",
  "...wwFFFFFFww...",
  "....EEEEEEEE....",
  ".....NN..NN.....",
  "................",
];

export const MALLARD_BLINK = [...MALLARD.slice(0, 5), "...bsxsssxsSb...", ...MALLARD.slice(6)];

// ---------------------------------------------------------------------------
// A duckling: a tiny yellow fluffball. Two waddling frames.
// ---------------------------------------------------------------------------
export const DUCKLING_A = [
  "..........",
  "...yzzy...",
  "..yyyyyy..",
  "..yeyyey..",
  "..yyooyy..",
  "...yyyy...",
  "..yyyyyyY.",
  "..YyyyyyY.",
  "...YyyyY..",
  "...o..o...",
  "..........",
];

export const DUCKLING_B = [
  "..........",
  "..........",
  "...yzzy...",
  "..yyyyyy..",
  "..yeyyey..",
  "..yyooyy..",
  "..yyyyyyY.",
  "..YyyyyyY.",
  "...YyyyY..",
  "..o....o..",
  "..........",
];

// ---------------------------------------------------------------------------
// Postmaster Pidge, in a postman's cap, with a mail satchel.
// ---------------------------------------------------------------------------
export const PIDGE = [
  "................",
  ".....TTTTTT.....",
  "....TTtyytTT....",
  "...TTTTTTTTTT...",
  "....nnnnnnnN....",
  "....nennnenN....",
  "....nnnnnnNN....",
  ".....NnmmnN.....",
  "...TTbNNNNbTT...",
  "..TbbnbbbbbBbT..",
  "..TbbbnbbbbBbT..",
  "..TbbbbnbbnnNT..",
  "..nNbbbbnnNNNn..",
  "....bbbbnNNNN...",
  "....BBBBBBBB....",
  "....BBB..BBB....",
  "....eee..eee....",
  "................",
];

export const PIDGE_BLINK = [...PIDGE.slice(0, 5), "....nNnnnNnN....", ...PIDGE.slice(6)];

// ---------------------------------------------------------------------------
// Marigold: Mossbeard's little sister, in a lilac headscarf and a green
// dress with an apron.
// ---------------------------------------------------------------------------
export const MARIGOLD = [
  "................",
  "......pppp......",
  "....ppvvvvpp....",
  "...pvvvpvvvvp...",
  "...pvvvvvvvvp...",
  "...pjsssssSjp...",
  "....sesssesS....",
  "....sfsssfSS.p..",
  ".....SsxxsS..p..",
  "....ggSSSSgg....",
  "...gggwwwwggg...",
  "..sgggwwwwgggs..",
  "...gggwwwwggg...",
  "...gGgwwwwgGg...",
  "...gGgwwwwgGg...",
  "...GGggggggGG...",
  "....GGGGGGGG....",
  ".....nn..nn.....",
  ".....NN..NN.....",
  "................",
];

export const MARIGOLD_BLINK = [...MARIGOLD.slice(0, 6), "....sxsssxsS....", ...MARIGOLD.slice(7)];

// ---------------------------------------------------------------------------
// Mayor Bellwether, in a top hat and the gold chain of office, with
// great woolly white whiskers.
// ---------------------------------------------------------------------------
export const BELLWETHER = [
  "................",
  "......eeee......",
  "......eeee......",
  "......eeee......",
  "......rrrr......",
  "....eeeeeeee....",
  "...wwwsssswww...",
  "..wwEsesseswEw..",
  "..wEwssssssEww..",
  "..wwwSsxxsSwww..",
  "...wE.SSSS.Ew...",
  "...PPpyppyPPP...",
  "..PPpppyypppPP..",
  "..PppppzyppppP..",
  "..sPpppyypppPs..",
  "...PppppppppP...",
  "...PPPPPPPPPP...",
  "....eeeeeeee....",
  ".....ee..ee.....",
  "................",
];

// ---------------------------------------------------------------------------
// A kid: Tilly and her hide-and-seek gang are all this one, recolored
// (hair, skin, clothes). Nobody's cowlick will lie flat.
// ---------------------------------------------------------------------------
export const KID = [
  "................",
  "........h.......",
  ".......hj.......",
  ".....hhjhhh.....",
  "....hhhhhhhH....",
  "....hsessesH....",
  "....hsessesH....",
  ".....sSxxSS.....",
  "......SSSS......",
  "....rrrrrrrR....",
  "...srrrrrrrRs...",
  "....rrrrrrRR....",
  "....RRRRRRRR....",
  ".....ss..sS.....",
  ".....nn..nn.....",
  "................",
];

export const KID_BLINK = [...KID.slice(0, 5), "....hssssssH....", "....hsxssxsH....", ...KID.slice(7)];

// ---------------------------------------------------------------------------
// Bun: Fernwhistle's baker, in a tall white hat and a floury apron.
// ---------------------------------------------------------------------------
export const BUN = [
  "................",
  ".....wwwwww.....",
  "....wwwwwwwE....",
  "....wwwwwwwE....",
  "....wwwwwwwE....",
  "....EEEEEEEE....",
  "....HnnnnnnH....",
  "....nennnenN....",
  "....nfnnnfNN....",
  ".....NnmmnN.....",
  "...wwwNNNNwww...",
  "..wwEwwwwwwEww..",
  "..wEwwwwwwwwEw..",
  "..nNwwwwwwwwNn..",
  "...wwwwEEwwww...",
  "...wwwwwwwwww...",
  "....EEEEEEEE....",
  "....NNN..NNN....",
  "................",
];

export const BUN_BLINK = [...BUN.slice(0, 7), "....nNnnnNnN....", ...BUN.slice(8)];

// ---------------------------------------------------------------------------
// Hopsworth: the innkeeper of the Snoozing Snail, who never quite gets
// around to taking his nightcap off.
// ---------------------------------------------------------------------------
export const HOPSWORTH = [
  "................",
  "..........cw....",
  ".........cbbw...",
  ".......ccbbBw...",
  "......cbbbBB....",
  "....cbbbbbBB....",
  "....BBBBBBBBB...",
  "....jsssssSj....",
  "....sesssesS....",
  "....ssssssSS....",
  ".....SsxxsS.....",
  "...gggSSSSggg...",
  "..ggGwwwwwwGgG..",
  "..gGwwwwwwwwGG..",
  "..gGwEwwwwEwGG..",
  "..sSwwwwwwwwSs..",
  "....EwwwwwwE....",
  "....NNNNNNNN....",
  "....NNN..NNN....",
  "....eee..eee....",
  "................",
];

export const HOPSWORTH_BLINK = [...HOPSWORTH.slice(0, 8), "....sxsssxsS....", ...HOPSWORTH.slice(9)];

// ---------------------------------------------------------------------------
// Ott: the miller, who went fishing four months ago and never stopped. In
// a yellow rain hat and coat, rod in hand.
// ---------------------------------------------------------------------------
export const OTT = [
  ".................",
  "...............N.",
  "....yyyyyyy....N.",
  "...yyzzzzzyy..N..",
  "..YYYYYYYYYYY.N..",
  "....SsssssSS..N..",
  "....SesssesS..N..",
  "....SssssSSS.N...",
  "....xSxSxSxS.N...",
  ".....xSxSxS..N...",
  "....yyyyyyyy.N...",
  "...yyyyyyyyyySN..",
  "...yyyyyyyyyyN...",
  "...yyyyyyyyyY....",
  "...YyyyyyyyY.....",
  "....YYYYYYYY.....",
  ".....nn..nn......",
  ".....NN..NN......",
  ".................",
];

export const OTT_BLINK = [...OTT.slice(0, 6), "....SxsssxsS..N..", ...OTT.slice(7)];
