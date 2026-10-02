import { flags } from "./room";
import { randomPick } from "./rng";
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
    case "smallKey":
      return ["You found a Small Key! It opens one locked door in Bramblekeep."];
    case "bigKey":
      return ["You found the Bramble Key! That big, scary door is no match for you now."];
    case "heartContainer":
      return ["You got a Heart Container! Your life grows by one whole heart."];
    case "sunstone":
      return [
        "You recovered the SUNSTONE!",
        "Its warm light floods Bramblekeep. Somewhere far below, Puddlebrook's shrine starts glowing again.",
      ];
    case "gems":
      return [`You found ${amount} gems! Ka-ching.`];
  }
}

export const DOOR_LOCKED_PAGES = ["It's locked. A Small Key would do the trick."];
export const BIG_DOOR_LOCKED_PAGES = ["A huge, thorny lock. You'll need the Bramble Key for this one."];

export function npcDialog(state: GameState, npc: Npc): Dialog {
  switch (npc.kind) {
    case "nana":
      return nanaDialog(state);
    case "banjo":
      return banjoDialog(state);
    case "ribbit":
      return ribbitDialog(state);
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
      return makeDialog(
        [
          "AH! Oh. Oh, it's only you. I am Sir Fumbleton, Knight of... hiding behind this bush, currently.",
          "Those red knights out there are Thornback's goons. I'd fight them, but I've just polished my armor.",
          "Here's free advice: if a monster's too tough, hit it somewhere else. That's basically all of strategy.",
        ],
        { speaker: "Sir Fumbleton" },
      );
  }
}

function nanaDialog(state: GameState): Dialog {
  if (state.flags.has(flags.sunstone)) {
    return makeDialog(
      [
        "You brought the Sunstone home! The whole village is glowing. Even Banjo, a little.",
        "Go on, enjoy yourself. Explore. Smash a pot or two. You've earned it, dear.",
      ],
      { speaker: "Nana Shellby" },
    );
  }
  if (!state.flags.has(flags.nanaSword)) {
    return makeDialog(
      [
        "Oh! You're finally up. Took you long enough. I've been awake since dawn. Well, since the dawn before last. I'm a tortoise.",
        "The Sunstone's gone missing from the village shrine! Last night I saw a big spiky something scuttle off toward Bramblekeep with it.",
        "I'd go get it back myself, but at my speed I'd arrive sometime next spring. Take Grandpa Shellby's old sword. Cut through those bushes and head north.",
      ],
      { speaker: "Nana Shellby", then: "giveSword" },
    );
  }
  if (!state.inventory.hasSwitcheroo) {
    return makeDialog(
      ["Bramblekeep is north of here, through the bushes. Mind the bats. And the knights. And... just mind everything, dear."],
      { speaker: "Nana Shellby" },
    );
  }
  return makeDialog(
    ["Is that a Switcheroo? Goodness. In my day we walked everywhere. Uphill. Both ways. Inside a shell."],
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

function ribbitDialog(state: GameState): Dialog {
  if (state.flags.has(flags.shopHeart)) {
    return makeDialog(["Sold out! Ribbit. I really need to order more inventory."], { speaker: "Ribbit" });
  }
  return makeDialog(
    [
      "Ribbit! Welcome to Ribbit's Wares, the finest shop in Puddlebrook. Also the only shop in Puddlebrook.",
      `Today's special: one Heart Container, barely used! Yours for ${SHOP_HEART_PRICE} gems. Deal?`,
    ],
    {
      speaker: "Ribbit",
      choice: {
        options: ["Buy it", "No thanks"],
        onYes: "buyHeart",
        noPages: ["Ribbit. Your loss, friend. Probably."],
      },
    },
  );
}

export const SHOP_TOO_POOR_PAGES = ["You're a little short, friend. Come back when your pockets jingle. Ribbit."];
