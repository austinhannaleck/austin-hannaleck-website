import { flags, drawbridgeDown } from "./room";
import { randomPick } from "./rng";
import { townsfolkDialog } from "./townsfolk";
import { SHOP_HEART_PRICE, type Dialog, type DialogAction, type DialogChoice, type GameState, type ItemId, type Npc } from "./types";

// Everything anyone in Thornwood says. Dialog is plain data the HUD
// renders; the engine only tracks which page is showing and how much of
// it has typed out.

export function makeDialog(
  pages: string[],
  options: { speaker?: string | null; then?: DialogAction; choice?: Omit<DialogChoice, "selected"> } = {},
): Dialog {
  return {
    speaker: options.speaker ?? null,
    pages,
    page: 0,
    shown: 0,
    choice: options.choice ? { ...options.choice, selected: 0 } : null,
    then: options.then ?? "none",
  };
}

export function itemGetPages(item: ItemId, amount = 0): string[] {
  switch (item) {
    case "sword":
      return [
        "You got Grandpa Shellby's Sword! Press Space to swing it.",
        "Hold the button down to charge up, then let go for a spin attack.",
      ];
    case "switcheroo":
      return [
        "You got the SWITCHEROO! Press Option (Alt on Windows) or Shift to fire a bolt.",
        "Whatever the bolt hits, you trade places with. Crystals, statues, even monsters. Try not to think about the physics.",
      ];
    case "flippers":
      return [
        "You got the FLIPPERS! Green, webbed, and they smell faintly of pond.",
        "Now you can swim! Wade into deep water, then press Space to dive. Divers are safe from everything up top.",
      ];
    case "smallKey":
      return ["You found a Small Key! It opens one locked door in Bramblekeep."];
    case "bigKey":
      return ["You found the Bramble Key! That big, scary door is no match for you now."];
    case "gateKey":
      return [
        "You found the Gate Key! It's carved like a big bramble leaf, and it's a little bit sticky.",
        "Bramblekeep's gate is north of Puddlebrook, between the two owl statues.",
      ];
    case "heartContainer":
      return ["You got a Heart Container! Your life grows by one whole heart."];
    case "sunstone":
      return [
        "You recovered the SUNSTONE!",
        "Its warm light floods Bramblekeep. Somewhere far below, Puddlebrook's shrine starts glowing again.",
      ];
    case "gems":
      return [`You found ${amount} gems! Ka-ching.`];
    case "letter":
      return [
        "You got a Letter for Mossbeard! It's addressed in very small, very neat handwriting.",
        "Mossbeard lives down at Willow Crossing, out past the gorge.",
      ];
    case "reply":
      return ["You got Mossbeard's Reply! It's a little bit muddy. Take it to Marigold, in Fernwhistle."];
    case "ring":
      return [
        "You found the Mayor's Ring! It's gold, and a little bit soggy.",
        "Better take it back to Mayor Bellwether, out on the pier.",
      ];
  }
}

export const BED_NO_PAGES = ["Adventure waits for no one. Well, except Nana. Adventure waits for Nana."];
export const WARES_PAGES = [`HEART CONTAINER. Barely used. ${SHOP_HEART_PRICE} gems.`];
export const WARES_NO_PAGES = ["You set it back down, carefully. Haggleby looks a little sad about it."];
export const WARES_SOLD_PAGES = ["Just a dusty, heart-shaped outline on the counter."];
export const BELL_LINES = [
  ["I'm RIGHT here. I'm always right here."],
  ["You only have to ring it once, friend."],
  ["...Hm? Oh! A customer! A real live customer!"],
];

export const BUN_PAGES = ["You eat the bun. It's still warm, somehow. You feel much better!"];
export const INN_BED_PAGES = ["A big, soft bed with a patchwork quilt. It's free, the innkeeper said so."];

export const QUAKE_PAGES = [
  "Thornback hits the floor so hard the whole keep shakes!",
  "Far away to the east, something enormous comes down with a tremendous CRASH.",
];

export const DOOR_LOCKED_PAGES = ["It's locked. A Small Key would do the trick."];
export const BIG_DOOR_LOCKED_PAGES = ["A huge, thorny lock. You'll need the Bramble Key for this one."];
export const GATE_LOCKED_PAGES = [
  "The gate is locked tight and tangled in thorns. The keyhole is shaped like a leaf.",
  "Someone must have the key. Somebody who keeps gates, maybe.",
];

export function npcDialog(state: GameState, npc: Npc): Dialog {
  switch (npc.kind) {
    case "nana":
      return nanaDialog(state);
    case "banjo":
      return banjoDialog(state);
    case "haggleby":
      return hagglebyDialog(state);
    case "moanica":
      return makeDialog(
        [
          "Ooooooh... a visitor! Nobody visits Bramblekeep anymore. Except Thornback, and Thornback is SO rude.",
          "If you find a Switcheroo, zap those floaty crystals with it. You swap places! Very undignified. I love it.",
          "Oh, and a ghostly secret: Thornback's armor is all in the front. That big bully never, ever watches its back.",
        ],
        { speaker: "Moanica" },
      );
    case "fumbleton":
      return fumbletonDialog(state);
    case "mossbeard":
      return mossbeardDialog(state);
    case "pinch":
      return pinchDialog(state);
    default:
      return townsfolkDialog(state, npc);
  }
}

// Sir Fumbleton: a knight who'd rather not, hiding out by the gorge.
function fumbletonDialog(state: GameState): Dialog {
  const speaker = "Sir Fumbleton";
  if (drawbridgeDown(state.flags)) {
    return makeDialog(
      [
        "Did you hear that almighty CRASH? The Fernwhistle drawbridge finally came down!",
        "The village is just over the gorge. I'd pop over myself, but... crowds. And bridges. And heights.",
      ],
      { speaker },
    );
  }
  return makeDialog(
    [
      "AH! Oh. Oh, it's only you. I am Sir Fumbleton, Knight of... hiding behind this bush, currently.",
      "Those red knights out there are Thornback's goons. I'd fight them, but I've just polished my armor.",
      "And that drawbridge over the gorge? They jammed it up. The village of Fernwhistle has been cut off for months. Poor souls.",
      "Here's free advice: if a monster's too tough, hit it somewhere else. That's basically all of strategy.",
    ],
    { speaker },
  );
}

// Mossbeard: the retired keeper of Bramblekeep's gate.
// The Gate Key is used up at the gate, so holding it and having found it
// aren't the same thing. Mossbeard and Nana care about the second.
function foundGateKey(state: GameState): boolean {
  return state.flags.has(flags.chest("hollow:0,0", 7, 5));
}

function mossbeardDialog(state: GameState): Dialog {
  if (state.flags.has(flags.letter)) {
    return makeDialog(
      [
        "A letter? For ME? Nobody writes to me. I'm very hard to find. That's the whole point of retiring.",
        "...It's from my little sister, Marigold! She lives in Fernwhistle. Not a peep from her since they jammed that bridge.",
        "She says she misses me, and I'm to eat more greens. Hmph. Typical. Here, take her my reply. I'd go myself, but I'm retired. From walking.",
      ],
      { speaker: "Mossbeard", then: "takeReply" },
    );
  }
  if (state.flags.has(flags.reply)) {
    return makeDialog(
      ["Go on, take that to Marigold, over in Fernwhistle. Tell her I'm eating plenty of greens. Don't tell her I'm not."],
      { speaker: "Mossbeard" },
    );
  }
  if (state.flags.has(flags.mailDelivered)) {
    return makeDialog(
      ["Marigold got my letter? Good. Now she'll write back, and I'll have to write back, and... oh, this is how it starts."],
      { speaker: "Mossbeard" },
    );
  }
  if (state.flags.has(flags.sunstone)) {
    return makeDialog(
      ["The Sunstone's back? Then I can finally retire. Again. Properly, this time. With a hammock."],
      { speaker: "Mossbeard" },
    );
  }
  if (foundGateKey(state)) {
    return makeDialog(
      [
        "My key! You found it! I'd hug you, but I'm retired. From hugging.",
        "The gate is north of Puddlebrook, between the owl statues. Give it a good shove. It sticks.",
      ],
      { speaker: "Mossbeard" },
    );
  }
  return makeDialog(
    [
      "Eh? Who's there? Speak up, my ears aren't what they were. Name's Mossbeard, keeper of the Bramblekeep gate. Retired keeper. Very retired.",
      "When Thornback's goons came marching through, I ran. Dropped the gate key somewhere down in the Hollow.",
      "That's the old cave in Thornthicket, west of here. Bats in there. I hate bats. They hate me. It's mutual.",
      "Find the key and the gate's all yours. Bring it back if you like. Or don't. I'm retired.",
    ],
    { speaker: "Mossbeard" },
  );
}

// Cap'n Pinch: a retired pirate with a treasure he won't swim for.
function pinchDialog(state: GameState): Dialog {
  if (state.inventory.owned.has("flippers") && !state.flags.has(flags.sunken("overworld:2,2", 4, 9))) {
    return makeDialog(
      ["Flippers! Now yer talkin'. Somethin' shiny went down off the point to the southwest. Go on, have a dive. Arr."],
      { speaker: "Cap'n Pinch" },
    );
  }
  if (state.flags.has(flags.chest("overworld:2,2", 10, 9))) {
    return makeDialog(
      ["Ye found the treasure! Spend it wisely, matey. Or on snacks. Snacks are wise."],
      { speaker: "Cap'n Pinch" },
    );
  }
  if (state.inventory.owned.has("switcheroo")) {
    return makeDialog(
      ["That gizmo of yours... it swaps things, does it? Then ye know what to do with that shiny crystal out there. Arr."],
      { speaker: "Cap'n Pinch" },
    );
  }
  return makeDialog(
    [
      "Arr! Cap'n Pinch, retired. Retired from what, ye ask? Pinching, mostly.",
      "See that wee island? There's treasure on it. I'd fetch it meself, but I'm a pirate of principle: no swimming on weekdays.",
      "If only ye had some way to trade places with that shiny crystal out there. Arr. Come back if ye find one.",
    ],
    { speaker: "Cap'n Pinch" },
  );
}

function nanaDialog(state: GameState): Dialog {
  if (state.flags.has(flags.sunstone)) {
    return makeDialog(
      [
        "You brought the Sunstone home! The whole village is glowing. Even Banjo, a little.",
        "And did you feel that rumble? Haggleby says the old Fernwhistle drawbridge finally came down, out east past Eastfield.",
        "Those poor folks have been cut off for months. Go on, pop over and say hello. You've earned an adventure that isn't dangerous, dear.",
      ],
      { speaker: "Nana Shellby" },
    );
  }
  if (!state.flags.has(flags.nanaSword)) {
    return makeDialog(
      [
        "Oh! You're finally up. Took you long enough. I've been up since dawn. Well, since the dawn before last. Sleep is for the young, dear.",
        "The Sunstone's gone missing from the village shrine! Last night I saw a big spiky something scuttle off toward Bramblekeep with it.",
        "I'd go get it back myself, but at my speed I'd arrive sometime next spring. Take Grandpa Shellby's old sword. Cut through those bushes and head north.",
      ],
      { speaker: "Nana Shellby", then: "giveSword" },
    );
  }
  if (!foundGateKey(state) && !state.inventory.owned.has("switcheroo")) {
    return makeDialog(
      [
        "Bramblekeep is north of here, but its gate has been locked tight for years.",
        "Old Mossbeard was the gatekeeper. He lives south, down at Willow Crossing. He'll know where the key went. Probably.",
      ],
      { speaker: "Nana Shellby" },
    );
  }
  if (!state.inventory.owned.has("switcheroo")) {
    return makeDialog(
      ["You found the gate key? Then off to Bramblekeep with you, north of the village. Mind the bats. And the knights. And... just mind everything, dear."],
      { speaker: "Nana Shellby" },
    );
  }
  return makeDialog(
    ["Is that a Switcheroo? Goodness. In my day we walked everywhere. Uphill. Both ways. In the snow."],
    { speaker: "Nana Shellby" },
  );
}

const BANJO_IDLE = [
  "Banjo is extremely busy sniffing a bug.",
  "Banjo would like you to know that he is a good boy.",
  "Banjo sneezes. It's devastatingly cute.",
  "Banjo rolls over for belly rubs. You oblige. You're not a monster.",
];

function banjoDialog(state: GameState): Dialog {
  if (!state.flags.has(flags.banjoGift)) {
    return makeDialog(
      ["Banjo wags his entire body.", "He drops something shiny at your feet... 10 gems! Where does he keep finding these?"],
      { speaker: "Banjo", then: "banjoGift" },
    );
  }
  return makeDialog([randomPick(state, BANJO_IDLE)], { speaker: "Banjo" });
}

function hagglebyDialog(state: GameState): Dialog {
  if (state.flags.has(flags.shopHeart)) {
    return makeDialog(["Sold out! I really must order more stock. I say that every week."], { speaker: "Haggleby" });
  }
  return makeDialog(
    [
      "Welcome, welcome! Haggleby's Wares, the finest shop in Puddlebrook. Also the only shop in Puddlebrook.",
      `Today's special: one Heart Container, barely used! Yours for ${SHOP_HEART_PRICE} gems. Deal?`,
    ],
    {
      speaker: "Haggleby",
      choice: {
        options: ["Buy it", "No thanks"],
        onYes: "buyHeart",
        noPages: ["Your loss, friend. Probably."],
      },
    },
  );
}

export const SHOP_TOO_POOR_PAGES = ["You're a little short, friend. Come back when your pockets jingle."];
