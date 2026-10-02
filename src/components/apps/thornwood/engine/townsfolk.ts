import { makeDialog } from "./dialogue";
import { DUCKLINGS, HIDERS, foundCount } from "./quests";
import { flags } from "./room";
import { randomPick } from "./rng";
import type { Dialog, GameState, Npc } from "./types";

// Everything Fernwhistle's folk say, at every stage of its side quests
// (quests.ts). Puddlebrook's cast is in dialogue.ts.

export function townsfolkDialog(state: GameState, npc: Npc): Dialog {
  switch (npc.kind) {
    case "stout":
      return stoutDialog(state);
    case "mallard":
      return mallardDialog(state);
    case "duckling":
      return makeDialog([randomPick(state, DUCKLING_LINES)], { speaker: "Duckling" });
    case "pidge":
      return pidgeDialog(state);
    case "marigold":
      return marigoldDialog(state);
    case "bellwether":
      return mayorDialog(state);
    case "tilly":
      return tillyDialog(state);
    case "bo":
    case "pip":
    case "fern":
      return hiderDialog(state, npc);
    case "bun":
      return bunDialog(state);
    case "hopsworth":
      return makeDialog(
        [
          "Welcome to the Snoozing Snail, Fernwhistle's finest inn! Also its only inn.",
          "Beds are free while we celebrate the bridge. Pick any one you like and have a nap. Croak.",
        ],
        { speaker: "Hopsworth" },
      );
    case "ott":
      return ottDialog(state);
    default:
      return makeDialog(["..."]);
  }
}

export function questsDone(state: GameState): boolean {
  return [flags.ducklingsThanked, flags.mailDelivered, flags.seekPrize, flags.ringReturned].every((f) => state.flags.has(f));
}

function stoutDialog(state: GameState): Dialog {
  if (questsDone(state)) {
    return makeDialog(
      ["Fernwhistle's never been happier, thanks to you. I've had nothing to guard for weeks. It's wonderful. I'm so bored."],
      { speaker: "Constable Stout" },
    );
  }
  return makeDialog(
    [
      "Halt! Who goes... oh! A visitor! Our first in months! Welcome to Fernwhistle!",
      "Thornback's goons jammed our drawbridge up tight, and nobody could get in or out. Then the whole forest shook, and down it came. KA-THOOM!",
      "Wait. Was that you? That was YOU, wasn't it? Folks around here could use a hand after all these months. Have a wander. Talk to everybody.",
    ],
    { speaker: "Constable Stout" },
  );
}

// ---------------------------------------------------------------------------
// Mama Mallard's ducklings
// ---------------------------------------------------------------------------
const DUCKLING_LINES = ["Peep!", "Peep peep!", "The duckling is trying very hard to look brave. Peep."];

export function DUCKLING_CAUGHT_PAGES(caught: number, total: number): string[] {
  if (caught >= total) return [`You caught a duckling! That's all ${total} of them. Better go tell Mama Mallard!`];
  return [`You caught a duckling! It peeps happily and waddles off home to the pond. (${caught} of ${total})`];
}

function mallardDialog(state: GameState): Dialog {
  const speaker = "Mama Mallard";
  const total = DUCKLINGS.length;
  const home = foundCount(state, DUCKLINGS);
  if (state.flags.has(flags.ducklingsThanked)) {
    return makeDialog(["Swim safe, dear! And remember: paddle, paddle, paddle."], { speaker });
  }
  if (home >= total) {
    return makeDialog(
      [
        "All my babies, home safe and sound! Oh, you dear, dear thing.",
        "I knitted these for the little ones before they hatched. Turns out they were born with their own. Silly me! You have them.",
      ],
      { speaker, then: "duckReward" },
    );
  }
  if (home > 0) {
    return makeDialog(
      [
        `That's ${home} of my babies home! Still ${total - home} out there somewhere.`,
        "They're quick little things. Don't chase them out in the open: steer them into a corner, then scoop!",
      ],
      { speaker },
    );
  }
  return makeDialog(
    [
      "Oh, thank goodness, a helpful face! When that drawbridge came down, the CRASH sent my ducklings scattering all over Fernwhistle!",
      `${total} of them, out there all on their own! They'll run from you, mind. Steer them into a corner, then walk right up and scoop them up.`,
    ],
    { speaker },
  );
}

// ---------------------------------------------------------------------------
// Special delivery
// ---------------------------------------------------------------------------
function pidgeDialog(state: GameState): Dialog {
  const speaker = "Postmaster Pidge";
  if (state.flags.has(flags.mailDelivered)) {
    return makeDialog(["Coo! The mail's moving again, and it's all thanks to you. Business is booming. Well. Business is cooing."], { speaker });
  }
  if (state.flags.has(flags.reply)) {
    return makeDialog(
      ["A reply from Mossbeard? Coo! Don't give it to me, dear. Take it to Marigold! She lives up on the hill, east of the Mayor's Hall."],
      { speaker },
    );
  }
  if (state.flags.has(flags.letter)) {
    return makeDialog(["Willow Crossing is out past the gorge, south of Puddlebrook. Coo. Mind you don't get that letter wet."], { speaker });
  }
  return makeDialog(
    [
      "Coo! Welcome to the Fernwhistle Post Office! With the bridge stuck up for months, the mail's been stuck right here with it.",
      "Look at this one: 'Mossbeard, Willow Crossing.' That's way out past the gorge! Coo... I don't suppose you're headed that way?",
    ],
    { speaker, then: "takeLetter" },
  );
}

function marigoldDialog(state: GameState): Dialog {
  const speaker = "Marigold";
  if (state.flags.has(flags.mailDelivered)) {
    return makeDialog(
      ["My big brother and I are pen pals again! At our age! Isn't that something.", "Next time you see him, tell him to eat his worms."],
      { speaker },
    );
  }
  if (state.flags.has(flags.reply)) {
    return makeDialog(
      [
        "Is that... a letter from my brother? Oh, it's ever so muddy. That's definitely him.",
        "He says he's fine, and retired, and I'm not to worry. He's been retired for twenty years! I always worry.",
        "Thank you, dear. Here, I've been saving this for a special occasion, and a letter from Mossbeard is as special as they come.",
      ],
      { speaker, then: "deliverReply" },
    );
  }
  if (state.flags.has(flags.letter)) {
    return makeDialog(
      ["Is that letter for Mossbeard? He's my big brother! Take it to him, quick, before he digs himself off somewhere new."],
      { speaker },
    );
  }
  return makeDialog(
    [
      "Oh! A visitor! I'm Marigold. Tea? It's dandelion. It's always dandelion.",
      "My big brother Mossbeard lives way out past the gorge. With the bridge stuck, the post's been stuck too. Pidge must have a mountain of mail by now.",
    ],
    { speaker },
  );
}

// ---------------------------------------------------------------------------
// Hide and seek
// ---------------------------------------------------------------------------
const HIDE_HINTS: Record<string, string> = {
  bo: "Bo likes to hide behind tall things. He says the best spot in town is wherever it's breezy.",
  pip: "Pip always hides behind something BIG. His ears always stick out, though.",
  fern: "Fern goes wherever it smells like icing.",
};

function tillyDialog(state: GameState): Dialog {
  const speaker = "Tilly";
  const total = HIDERS.length;
  const found = foundCount(state, HIDERS);
  if (state.flags.has(flags.seekPrize)) {
    return makeDialog(["Want to play again? ...Actually, I'm pooped. Maybe tomorrow."], { speaker });
  }
  if (found >= total) {
    return makeDialog(
      [
        "You found EVERYBODY! You're the best seeker in the whole wide world!",
        "Here, you win our whole piggy bank. Don't spend it all on buns. Okay, spend some of it on buns.",
      ],
      { speaker, then: "seekPrize" },
    );
  }
  const hints = HIDERS.filter((tag) => !state.flags.has(flags.found(tag))).map((tag) => HIDE_HINTS[tag]);
  if (found > 0) {
    return makeDialog([`You found ${found}! Only ${total - found} to go.`, ...hints], { speaker });
  }
  return makeDialog(
    [
      "We're playing hide and seek, but I've looked EVERYWHERE and I can't find ANYBODY. Bo, Pip and Fern are the best hiders in Fernwhistle.",
      "Will you help me find them? Here's what I know.",
      ...hints,
    ],
    { speaker },
  );
}

const SPOTTED: Record<string, string[]> = {
  bo: ["Aww, you found me! Nobody ever looks behind the windmill.", "Okay, okay. I'm going back to the square."],
  pip: ["How did you know I was back here? ...Was it the ears? It's always the ears.", "Fine. I'm going back to the square."],
  fern: ["Mmmf! You found me. I was hiding. Also eating. Mostly eating.", "Don't tell Bun! I'm going back to the square."],
};

const HOME_AGAIN: Record<string, string> = {
  bo: "Next time I'm hiding INSIDE the windmill.",
  pip: "I'm getting a hat. A big one. For the ears.",
  fern: "Do I have icing on my face? ...Where?",
};

const NAMES: Record<string, string> = { bo: "Bo", pip: "Pip", fern: "Fern" };

// Talking to one is finding them (see talkTo), and once the dialog
// closes they head back to the square (see sendFoundHome).
function hiderDialog(state: GameState, npc: Npc): Dialog {
  const speaker = NAMES[npc.kind];
  if (npc.tag && !state.flags.has(flags.found(npc.tag))) return makeDialog(SPOTTED[npc.kind], { speaker });
  return makeDialog([HOME_AGAIN[npc.kind]], { speaker });
}

// ---------------------------------------------------------------------------
// The Mayor's ring
// ---------------------------------------------------------------------------
function mayorDialog(state: GameState): Dialog {
  const speaker = "Mayor Bellwether";
  if (state.flags.has(flags.ringReturned)) {
    return makeDialog(["Fernwhistle is open for business! Bridge down, ring on. What a baaa-utiful day."], { speaker });
  }
  if (state.flags.has(flags.ring)) {
    return makeDialog(
      [
        "My ring! You found my ring! Baaa-rilliant!",
        "As mayor of Fernwhistle, I hereby award you... um... this! The town keeps a Heart Container for emergencies, and this was definitely an emergency.",
      ],
      { speaker, then: "returnRing" },
    );
  }
  if (state.inventory.owned.has("flippers")) {
    return makeDialog(
      ["Are those Flippers? Then could you... would you... dive for my ring? It went in just off the end of this pier. A little to the left, I think."],
      { speaker },
    );
  }
  return makeDialog(
    [
      "Baaa-d news, I'm afraid. When that drawbridge came crashing down, I jumped so high my ring flew clean off! Plop! Right off the end of this pier.",
      "It's the official ring of the Mayor of Fernwhistle. I can't very well be mayor without it. If only somebody around here could swim!",
    ],
    { speaker },
  );
}

// ---------------------------------------------------------------------------
// Everybody else
// ---------------------------------------------------------------------------
function bunDialog(state: GameState): Dialog {
  const pages = [
    "Fresh bread! Fresh buns! Fresh... well, everything was fresh when the bridge went up. Nobody's been in for months!",
    "Have a bun! It's on the house. Please. I have SO many buns.",
  ];
  if (HIDERS.includes("fern") && !state.flags.has(flags.found("fern"))) {
    pages.push("Oh, and if you're looking for a little bunny who smells of icing, I haven't seen her. Definitely not behind the flour sacks.");
  }
  return makeDialog(pages, { speaker: "Bun", then: "snack" });
}

function ottDialog(state: GameState): Dialog {
  const pages = [
    "Ahoy. Name's Ott. I'm the miller. I'm meant to be running the windmill, but the fish were biting.",
    "That was four months ago. They're still biting. Mostly me.",
  ];
  pages.push(
    state.inventory.owned.has("flippers")
      ? "Nice flippers. I've got a pair myself. I call them feet."
      : "Fancy a swim? Ask a duck. Ducks know everything there is to know about swimming. And bread.",
  );
  return makeDialog(pages, { speaker: "Ott" });
}
