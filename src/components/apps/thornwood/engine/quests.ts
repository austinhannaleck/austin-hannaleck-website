import { centerOf } from "./collision";
import { makeDialog } from "./dialogue";
import { playSound, spawnBurst } from "./effects";
import { grantChest } from "./interact";
import { flags } from "./room";
import { DUCKLING_CAUGHT_PAGES } from "./townsfolk";
import { ROOMS } from "./world";
import type { DialogAction, GameState, Npc } from "./types";

// Fernwhistle's side quests. Progress is nothing but flags (see `flags`
// in room.ts), so it saves along with everything else.
//
//   Mama Mallard's ducklings: four of them scattered when the drawbridge
//     came crashing down. Catch them all (they run!) for her spare
//     Flippers.
//   Special delivery: Postmaster Pidge has a letter for Mossbeard, out
//     past the gorge. His reply goes to his sister Marigold, up the hill.
//   Hide and seek: Tilly can't find Bo, Pip, or Fern. You can.
//   The Mayor's ring: it went off the end of the pier when the bridge
//     came down. It'll take the Flippers to dive for it.

function tagsOf(kinds: string[]): string[] {
  return Object.values(ROOMS).flatMap((def) =>
    (def.npcs ?? []).filter((n) => kinds.includes(n.kind) && n.tag).map((n) => n.tag!),
  );
}

export const DUCKLINGS = tagsOf(["duckling"]);
export const HIDERS = tagsOf(["bo", "pip", "fern"]);

export function foundCount(state: GameState, tags: string[]): number {
  return tags.filter((tag) => state.flags.has(flags.found(tag))).length;
}

const FEATHERS = [0xfff3a0, 0xffd040, 0xffffff];

// Walk right up to a runaway duckling and you've got it. It waits in your
// arms while it says its piece, then it's off home to the pond.
export function catchDuckling(state: GameState, npc: Npc): void {
  if (!npc.tag) return;
  state.flags.add(flags.found(npc.tag));
  npc.wanders = false;
  npc.fleeing = false;
  npc.vx = 0;
  npc.vy = 0;
  npc.talkFrames = 40;
  playSound(state, "peep");
  const c = centerOf(npc);
  spawnBurst(state, c.x, c.y, { count: 10, colors: FEATHERS, speed: 1, life: 30, size: 1.4, lift: 2, gravity: 0.05 });
  state.dialog = makeDialog(DUCKLING_CAUGHT_PAGES(foundCount(state, DUCKLINGS), DUCKLINGS.length));
}

// Once a dialog closes, anybody you've just found heads home: straight
// there if it's in this room, or out the door if it isn't.
export function sendFoundHome(state: GameState): void {
  for (const npc of [...state.npcs]) {
    if (!npc.tag || !state.flags.has(flags.found(npc.tag))) continue;
    if (npc.home && npc.x === npc.home.x && npc.y === npc.home.y) continue;
    const c = centerOf(npc);
    spawnBurst(state, c.x, c.y, { count: 12, colors: [0xffffff, 0xe8e0f0], speed: 0.9, life: 24, size: 2, lift: 1, gravity: -0.02 });
    if (npc.home) {
      npc.x = npc.home.x;
      npc.y = npc.home.y;
      npc.wanders = false;
      npc.fleeing = false;
      npc.vx = 0;
      npc.vy = 0;
    } else {
      state.npcs = state.npcs.filter((other) => other !== npc);
    }
  }
}

// What happens when a quest conversation ends: the handover.
export function runQuestAction(state: GameState, action: DialogAction): void {
  switch (action) {
    case "takeLetter":
      playSound(state, "itemGet");
      grantChest(state, { item: "letter" });
      return;
    case "takeReply":
      state.flags.delete(flags.letter);
      playSound(state, "itemGet");
      grantChest(state, { item: "reply" });
      return;
    case "deliverReply":
      state.flags.delete(flags.reply);
      state.flags.add(flags.mailDelivered);
      playSound(state, "itemGet");
      grantChest(state, { item: "heartContainer" });
      return;
    case "duckReward":
      state.flags.add(flags.ducklingsThanked);
      playSound(state, "fanfare");
      grantChest(state, { item: "flippers" });
      return;
    case "seekPrize":
      state.flags.add(flags.seekPrize);
      playSound(state, "gem");
      grantChest(state, { item: "gems", amount: 50 });
      return;
    case "returnRing":
      state.flags.delete(flags.ring);
      state.flags.add(flags.ringReturned);
      playSound(state, "itemGet");
      grantChest(state, { item: "heartContainer" });
      return;
    default:
      return;
  }
}

// The quest item you're carrying, if any, for the pause screen.
export function carrying(state: GameState): "letter" | "reply" | "ring" | null {
  if (state.flags.has(flags.letter)) return "letter";
  if (state.flags.has(flags.reply)) return "reply";
  if (state.flags.has(flags.ring)) return "ring";
  return null;
}
