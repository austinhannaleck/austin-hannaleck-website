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

// ---------------------------------------------------------------------------
// Mossbeard: Bramblekeep's retired gatekeeper, a mole in a miner's helmet
// with a beard so old it's gone mossy.
// ---------------------------------------------------------------------------
export const MOSSBEARD = [
  "................",
  "................",
  ".....yyzzyy.....",
  "....yyyzzyyy....",
  "....yyyyyyyy....",
  "...YYYYYYYYYY...",
  "...NnnnnnnnnN...",
  "...NnennnnenN...",
  "...NnnnffnnnN...",
  "...NnnnFFnnnN...",
  "..fgglgggglggf..",
  "...gGggggggGg...",
  "...ggggGgggGg...",
  "....gGgggGgg....",
  "....NgGggGgN....",
  "....NNgGggNN....",
  "....NNNggNNN....",
  "....NNNNNNNN....",
  ".....NN..NN.....",
  ".....ff..ff.....",
  "................",
  "................",
  "................",
  "................",
];

// ---------------------------------------------------------------------------
// Cap'n Pinch: a retired pirate crab, hat and all.
// ---------------------------------------------------------------------------
export const PINCH = [
  "..................",
  ".......eeee.......",
  "......eeweee......",
  ".....eeeeeeee.....",
  "......w....w......",
  "..qq..R....R..qq..",
  ".qrrq.rrrrrr.qrrq.",
  "..rRrrrqqrrrrrRr..",
  "...R.rrrrrrrrr.R..",
  ".....RrrrrrrR.....",
  "....r.R.RR.R.r....",
  "...r..........r...",
  "..................",
  "..................",
  "..................",
  "..................",
];

// ===========================================================================
// Fernwhistle
// ===========================================================================

// ---------------------------------------------------------------------------
// Mama Mallard: a plump white duck in a blue bonnet and a pink apron.
// ---------------------------------------------------------------------------
export const MALLARD = [
  "................",
  "......bbbb......",
  "....bbccccbb....",
  "...bBwwwwwwBb...",
  "...bwwewwewwb...",
  "...Bwwwoowwwb...",
  "...rBwOooOwBr...",
  "....rwwOOwwr....",
  ".....wwwwww.....",
  "...EwwwwwwwwE...",
  "..EwwwffffwwwE..",
  "..EwwffffffwwE..",
  "..DEwffffffwED..",
  "...DwwffffwwD...",
  "....wwwwwwww....",
  ".....DwwwwD.....",
  ".....oo..oo.....",
  "....ooo..ooo....",
  "................",
];

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
// Postmaster Pidge: a pigeon in a postman's cap, with a mail satchel.
// ---------------------------------------------------------------------------
export const PIDGE = [
  "................",
  ".....TTTTTT.....",
  "....TTtyytTT....",
  "...TTTTTTTTTT...",
  ".....DEEEED.....",
  "....DEeEEeED....",
  "....DEECCEED....",
  ".....DgEEgD.....",
  "....pgpgpgpp....",
  "...DEnEEEEEED...",
  "..DEEEnEEEEEED..",
  "..DDEEEnEEnnND..",
  "..CDEEEEnnNNNC..",
  "...CDEEEnNNNN...",
  "....CDDDDDDC....",
  ".....ff..ff.....",
  "................",
];

// ---------------------------------------------------------------------------
// Marigold: Mossbeard's little sister, a mole in a lilac headscarf and a
// green dress with an apron.
// ---------------------------------------------------------------------------
export const MARIGOLD = [
  "................",
  "................",
  ".....pppppp.....",
  "....pvvvvvvp....",
  "...pvvvpvvvvp...",
  "...pNnnnnnnNp...",
  "...NnennnnenN...",
  "...NnnnffnnnN...",
  "...NnnnFFnnnN...",
  "....NnnnnnnN.p..",
  "....ggwwwwgg.p..",
  "...gggwwwwggg...",
  "..fgggwwwwgggf..",
  "...gggwwwwggg...",
  "...gGgwwwwgGg...",
  "....GggggggG....",
  "....NNNNNNNN....",
  ".....NN..NN.....",
  ".....ff..ff.....",
  "................",
];

// ---------------------------------------------------------------------------
// Mayor Bellwether: a woolly sheep in a top hat, wearing the gold chain
// of office.
// ---------------------------------------------------------------------------
export const BELLWETHER = [
  "................",
  "......eeee......",
  "......eeee......",
  "......rrrr......",
  "....eeeeeeee....",
  "...wwwEwwEwww...",
  "..CwwCCCCCCwwC..",
  "...wCwCCCCwCw...",
  "....wCCCCCCw....",
  ".....CCDDCC.....",
  "....wwyyyyww....",
  "..wwwwwyywwwww..",
  ".wwEwwwyzwwwEww.",
  ".wwEwwwwwwwwEww.",
  "..wwwwwwwwwwww..",
  "..EwwwwwwwwwwE..",
  "...EEwwwwwwEE...",
  "....CC....CC....",
  "....CC....CC....",
  "................",
];

// ---------------------------------------------------------------------------
// A bunny kid: Tilly and her hide-and-seek gang are all this one, recolored.
// ---------------------------------------------------------------------------
export const BUNNY = [
  "................",
  ".....mf..fm.....",
  ".....mf..fm.....",
  ".....mf..fm.....",
  ".....mm..mm.....",
  "....mmmmmmmm....",
  "...mmmmmmmmmm...",
  "...mmemmmmemm...",
  "...mmmmffmmmm...",
  "....wmmmmmmw....",
  ".....mmmmmm.....",
  "....rrrrrrrr....",
  "...mrrrrrrrrm...",
  "...mrRrrrrRrm...",
  "....rrrrrrrr....",
  "....RRRRRRRR....",
  ".....mm..mm.....",
  ".....ww..ww.....",
  "................",
];

// ---------------------------------------------------------------------------
// Bun: Fernwhistle's baker, a bear in a tall white hat and a floury apron.
// ---------------------------------------------------------------------------
export const BUN = [
  "................",
  ".....wwwwww.....",
  "....wwwwwwww....",
  "....wwwwwwww....",
  "....Ewwwwwww....",
  "...nnEEEEEEnn...",
  "...nNnnnnnnNn...",
  "...nnennnnenn...",
  "...nnnmmmmnnn...",
  "....nnmeemnn....",
  ".....nmmmmn.....",
  "...nnwwwwwwnn...",
  "..nnnwwwwwwnnn..",
  "..mnnwwEEwwnnm..",
  "...nnwwwwwwnn...",
  "...nnwwwwwwnn...",
  "....nnnnnnnn....",
  "....NN....NN....",
  "................",
];

// ---------------------------------------------------------------------------
// Ott: the miller, who went fishing four months ago and never stopped. An
// otter in a yellow rain hat and coat, rod in hand.
// ---------------------------------------------------------------------------
export const OTT = [
  ".................",
  "...............N.",
  "....yyyyyyy....N.",
  "...yyzzzzzyy..N..",
  "..YYYYYYYYYYY.N..",
  "....nnnnnnn...N..",
  "...nnmmmmmnn..N..",
  "...nemmmmmen.N...",
  "...nmmmeemmn.N...",
  "....nmmwwmmn.N...",
  ".....nnnnnn..N...",
  "....yyyyyyyy.N...",
  "...yyyyyyyyyyN...",
  "..nyyyyyyyyyyN...",
  "...yyyyyyyyyN....",
  "...YyyyyyyyY.....",
  "....YYYYYYYY.....",
  ".....nn..nn......",
  ".....NN..NN......",
  ".................",
];
