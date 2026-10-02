import { centerOf, distance, overlaps } from "./collision";
import { collectDrop, hurtHero } from "./combat";
import { BUN_PAGES, SHOP_TOO_POOR_PAGES, makeDialog } from "./dialogue";
import { addShake, playSound, spawnBurst, updateParticles } from "./effects";
import { updateEnemies } from "./enemies";
import { updateHero } from "./hero";
import { grantChest } from "./interact";
import { noKeys, settleEquipped } from "./inventory";
import { updateProjectiles } from "./projectiles";
import { runQuestAction, sendFoundHome } from "./quests";
import { flags, loadRoom, noteSeen, updateMechanisms } from "./room";
import type { SaveData } from "./save";
import { arriveInRoom, placeHero, updateTransition } from "./transitions";
import { updateNpcs } from "./villagers";
import { START_SPAWN } from "./world";
import {
  DIALOG_CHARS_PER_STEP,
  HERO_SIZE,
  HERO_START_HP,
  HURT_INVULN_FRAMES,
  LOW_HEALTH_BEEP_FRAMES,
  SHOP_HEART_PRICE,
  type DialogAction,
  type GameState,
  type GameStatus,
  type Input,
} from "./types";

// The engine's public surface: create a game, advance it one fixed step,
// and the handful of things the UI can ask it to do between steps.

export function createGame(seed: number, save: SaveData | null = null, status: GameStatus = "playing"): GameState {
  const spawn = save?.respawn ?? START_SPAWN;
  const maxHp = save?.maxHp ?? HERO_START_HP;
  const state: GameState = {
    status,
    frame: save?.frames ?? 0,
    rng: seed | 0 || 1,
    roomId: spawn.roomId,
    tiles: [],
    roomEntry: { x: spawn.x, y: spawn.y },
    hero: {
      x: spawn.x,
      y: spawn.y,
      w: HERO_SIZE,
      h: HERO_SIZE,
      facing: spawn.facing,
      moving: false,
      walkFrames: 0,
      hp: maxHp,
      maxHp,
      invulnFrames: 0,
      knockback: null,
      action: "none",
      actionFrame: 0,
      attackId: 0,
      holding: null,
      swimming: false,
      dive: 0,
      diveCooldown: 0,
      surfacing: 0,
    },
    inventory: {
      owned: new Set(save?.owned ?? []),
      gems: save?.gems ?? 0,
      keys: structuredClone(save?.keys ?? noKeys()),
      gateKey: save?.gateKey ?? false,
      equipped: save?.equipped ?? null,
    },
    flags: new Set(save?.flags ?? []),
    defeated: new Map(Object.entries(save?.defeated ?? {})),
    enemies: [],
    npcs: [],
    props: [],
    drops: [],
    projectiles: [],
    hazards: [],
    particles: [],
    dialog: null,
    transition: null,
    respawn: spawn,
    deaths: save?.deaths ?? 0,
    nextId: 1,
    hitStop: 0,
    shake: 0,
    lowHealthTimer: 0,
    shutterArmed: false,
    shuttersClosed: false,
    barsOpen: false,
    plateHeld: false,
    roomCleared: false,
    switchCooldown: 0,
    events: [],
  };
  settleEquipped(state.inventory);
  loadRoom(state, spawn.roomId);
  placeHero(state, spawn);
  arriveInRoom(state);
  // A game sitting behind the title screen shouldn't autosave or roar.
  if (status !== "playing") state.events = [];
  return state;
}

// Advances the world by one fixed 1/60s step.
export function update(state: GameState, input: Input): void {
  if (state.status !== "playing") return;
  state.frame++;
  if (state.shake > 0) state.shake--;
  if (state.switchCooldown > 0) state.switchCooldown--;

  // Room transitions and open dialogs pause the world, like the classics.
  if (state.transition) {
    updateTransition(state);
    return;
  }
  if (state.dialog) {
    updateDialog(state, input);
    return;
  }
  // A few frozen frames on big hits sell the impact.
  if (state.hitStop > 0) {
    state.hitStop--;
    return;
  }

  updateHero(state, input);
  noteSeen(state);
  if (state.transition || state.dialog || state.status !== "playing") return;

  if (state.hero.action !== "dying") {
    updateEnemies(state);
    updateNpcs(state);
    updateProjectiles(state);
    updateHazards(state);
    updateDrops(state);
    for (const prop of state.props) if (prop.swapFlash > 0) prop.swapFlash--;
  }
  updateMechanisms(state);
  updateParticles(state);
  updateLowHealth(state);
}

export function togglePause(state: GameState): void {
  if (state.status === "playing") state.status = "paused";
  else if (state.status === "paused") state.status = "playing";
}

// Back into the world after the Sunstone is home: the adventure is won,
// but there's still a whole map to wander.
export function keepPlaying(state: GameState): void {
  if (state.status === "won") state.status = "playing";
}

// After a game over: back to the last area entrance with three hearts,
// everything you've collected intact.
export function continueAfterDeath(state: GameState): void {
  if (state.status !== "gameover") return;
  const hero = state.hero;
  hero.hp = Math.min(hero.maxHp, HERO_START_HP);
  hero.invulnFrames = HURT_INVULN_FRAMES;
  hero.holding = null;
  hero.swimming = false;
  hero.dive = 0;
  hero.surfacing = 0;
  state.dialog = null;
  loadRoom(state, state.respawn.roomId);
  placeHero(state, state.respawn);
  state.transition = { kind: "fadeIn", frame: 0 };
  state.status = "playing";
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------
function updateDialog(state: GameState, input: Input): void {
  const dialog = state.dialog!;
  const text = dialog.pages[dialog.page];
  const advance = input.pressed.sword || input.pressed.tool;

  if (dialog.shown < text.length) {
    const before = Math.floor(dialog.shown);
    dialog.shown = Math.min(text.length, dialog.shown + DIALOG_CHARS_PER_STEP);
    const now = Math.floor(dialog.shown);
    if (now !== before && now % 3 === 0) playSound(state, "text");
    // The first press just finishes typing the page out.
    if (advance) dialog.shown = text.length;
    return;
  }

  const lastPage = dialog.page === dialog.pages.length - 1;
  if (lastPage && dialog.choice) {
    const choice = dialog.choice;
    if (input.pressed.left || input.pressed.right || input.pressed.up || input.pressed.down) {
      choice.selected = choice.selected === 0 ? 1 : 0;
      playSound(state, "menu");
    }
    if (input.pressed.sword) {
      closeDialog(state);
      if (choice.selected === 0) runDialogAction(state, choice.onYes);
      else state.dialog = makeDialog(choice.noPages, { speaker: dialog.speaker });
    }
    return;
  }

  if (!advance) return;
  if (!lastPage) {
    dialog.page++;
    dialog.shown = 0;
    return;
  }
  closeDialog(state);
  runDialogAction(state, dialog.then);
}

function closeDialog(state: GameState): void {
  state.dialog = null;
  state.hero.holding = null;
  sendFoundHome(state);
}

function runDialogAction(state: GameState, action: DialogAction): void {
  switch (action) {
    case "none":
      return;
    case "giveSword":
      state.flags.add(flags.nanaSword);
      playSound(state, "itemGet");
      grantChest(state, { item: "sword" });
      return;
    case "banjoGift":
      state.flags.add(flags.banjoGift);
      state.inventory.gems = Math.min(999, state.inventory.gems + 10);
      playSound(state, "gem");
      return;
    case "buyHeart":
      if (state.inventory.gems < SHOP_HEART_PRICE) {
        state.dialog = makeDialog(SHOP_TOO_POOR_PAGES, { speaker: "Haggleby" });
        return;
      }
      state.inventory.gems -= SHOP_HEART_PRICE;
      state.flags.add(flags.shopHeart);
      playSound(state, "itemGet");
      grantChest(state, { item: "heartContainer" });
      return;
    case "rest": {
      // A nap: the screen fades out to a lullaby, and you wake up right
      // where you lay down with every heart full.
      const hero = state.hero;
      hero.hp = hero.maxHp;
      playSound(state, "lullaby");
      state.transition = {
        kind: "fadeOut",
        frame: 0,
        to: { roomId: state.roomId, x: hero.x, y: hero.y, facing: "down" },
        hold: 70,
      };
      return;
    }
    case "snack":
      state.hero.hp = state.hero.maxHp;
      playSound(state, "heart");
      state.dialog = makeDialog(BUN_PAGES);
      return;
    case "win":
      state.status = "won";
      state.events.push({ type: "won" });
      return;
    default:
      runQuestAction(state, action);
  }
}

// ---------------------------------------------------------------------------
// Everything else that ticks: falling rocks, loot, low health.
// ---------------------------------------------------------------------------
function updateHazards(state: GameState): void {
  const hero = centerOf(state.hero);
  for (const h of [...state.hazards]) {
    if (--h.timer > 0) continue;
    state.hazards = state.hazards.filter((other) => other !== h);
    playSound(state, "rockFall");
    addShake(state, 5);
    spawnBurst(state, h.x, h.y, { count: 14, colors: [0x9b8c7a, 0x6e6255, 0xc9bba5], speed: 1.8, life: 28, size: 2.2 });
    if (distance(hero, h) < h.radius + 6) hurtHero(state, 2, { x: h.x, y: h.y - 1 });
  }
}

function updateDrops(state: GameState): void {
  const hero = state.hero;
  const canCollect = hero.action !== "dying" && hero.action !== "fall";
  for (const drop of [...state.drops]) {
    drop.z += drop.vz;
    drop.vz -= 0.25;
    if (drop.z <= 0) {
      drop.z = 0;
      drop.vz = Math.abs(drop.vz) > 0.8 ? -drop.vz * 0.4 : 0;
    }
    if (drop.life !== null && --drop.life <= 0) {
      state.drops = state.drops.filter((d) => d !== drop);
      continue;
    }
    if (canCollect && drop.z < 4 && overlaps(hero, drop) && !state.dialog) collectDrop(state, drop);
  }
}

function updateLowHealth(state: GameState): void {
  const hero = state.hero;
  if (hero.hp > 0 && hero.hp <= 2 && hero.action !== "dying") {
    if (--state.lowHealthTimer <= 0) {
      playSound(state, "lowHealth");
      state.lowHealthTimer = LOW_HEALTH_BEEP_FRAMES;
    }
  } else {
    state.lowHealthTimer = 0;
  }
}
