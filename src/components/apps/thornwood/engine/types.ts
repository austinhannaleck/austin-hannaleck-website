// Shared domain types and tunable constants for Thornwood's simulation.
//
// Everything under engine/ is plain TypeScript: no DOM, no canvas, no
// audio. The simulation advances in fixed 60Hz steps over a 2D, tile-based
// model of each room (the same shape as a classic top-down Zelda), and the
// renderer in render/ just draws whatever state it finds each frame. That
// split is what lets the whole game's rules run headless under Vitest.

export type Direction = "up" | "down" | "left" | "right";
export const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

export type Box = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };

export type Area = "overworld" | "bramblekeep" | "hollow" | "interior";

// ---------------------------------------------------------------------------
// World geometry. Positions are in "pixels" of a 16px tile grid, room-local
// (0,0 is a room's top-left). The renderer maps one tile to one world unit.
// ---------------------------------------------------------------------------
export const TILE = 16;
export const ROOM_COLS = 16;
export const ROOM_ROWS = 11;
export const ROOM_W = TILE * ROOM_COLS;
export const ROOM_H = TILE * ROOM_ROWS;

export const STEPS_PER_SECOND = 60;
export const STEP_MS = 1000 / STEPS_PER_SECOND;

// ---------------------------------------------------------------------------
// Hero tuning. Health is counted in half-hearts, like the classics.
// ---------------------------------------------------------------------------
export const HERO_SIZE = 12;
export const HERO_SPEED = 1.35;
export const HERO_CHARGE_SPEED = 0.7;
export const HERO_START_HP = 6;
export const HP_CAP = 20;
export const SWING_FRAMES = 14;
export const SPIN_CHARGE_FRAMES = 40;
export const SPIN_FRAMES = 20;
export const SPIN_RADIUS = 26;
export const SWORD_DAMAGE = 1;
export const SPIN_DAMAGE = 2;
export const CAST_FRAMES = 12;
export const HURT_INVULN_FRAMES = 60;
export const HERO_KNOCKBACK_SPEED = 2.6;
export const HERO_KNOCKBACK_FRAMES = 9;
export const FALL_FRAMES = 40;
export const DYING_FRAMES = 80;

// The Flippers: swimming is slower than walking, and a dive lasts a
// little over a second, with a short breather before the next one.
// Sunken treasure is only within reach once you've been under a moment.
export const SWIM_SPEED = 0.95;
export const DIVE_FRAMES = 75;
export const DIVE_COOLDOWN_FRAMES = 18;
export const DIVE_REACH_FRAMES = 20;
// Coming back up, you're still out of reach for a moment, so a bat that
// happens to be hovering right there can't catch you the instant you
// break the surface.
export const SURFACE_GRACE_FRAMES = 30;

// The Switcheroo: fires a bolt that trades places with whatever it hits.
export const BOLT_SPEED = 4.5;
export const BOLT_RANGE = 11 * TILE;
export const BOLT_SIZE = 6;

// ---------------------------------------------------------------------------
// Enemies, drops, and presentation timing.
// ---------------------------------------------------------------------------
export const ENEMY_HURT_FRAMES = 18;
export const ENEMY_KNOCKBACK_SPEED = 3;
export const ENEMY_KNOCKBACK_FRAMES = 8;
export const SWAP_STUN_FRAMES = 50;
export const DROP_LIFETIME = 9 * 60;
export const DROP_BLINK_FRAMES = 2 * 60;

export const SCROLL_FRAMES = 44;
export const FADE_FRAMES = 22;
export const DIALOG_CHARS_PER_STEP = 0.9;
export const LOW_HEALTH_BEEP_FRAMES = 80;
export const SHOP_HEART_PRICE = 40;

// ---------------------------------------------------------------------------
// Items and inventory.
// ---------------------------------------------------------------------------
export type ItemId =
  | "sword"
  | "switcheroo"
  | "flippers"
  | "smallKey"
  | "bigKey"
  | "gateKey"
  | "heartContainer"
  | "sunstone"
  | "gems"
  // Things carried for Fernwhistle's side quests (see quests.ts).
  | "letter"
  | "reply"
  | "ring";

// Tools go on the item button, one at a time, picked on the pause screen.
// Everything else (the sword, the Flippers, keys) just works when you have
// it. TOOLS is the order they sit in the pause screen's item grid.
export type ToolId = "switcheroo";
export const TOOLS: ToolId[] = ["switcheroo"];

// The items you keep for good once found (unlike keys, which get used up,
// or gems). Inventory.owned says which of these you have, and the save
// stores that list as is, so a new one only needs adding here. The type
// comes from the list so the two can't drift apart.
export const KEPT_ITEMS = [
  "sword",
  // Let you swim, and dive, in deep water.
  "flippers",
  ...TOOLS,
] as const satisfies readonly ItemId[];
export type KeptItem = (typeof KEPT_ITEMS)[number];

// The areas with locked doors and keys of their own. A key found in one
// only opens that dungeon's doors.
export const DUNGEONS = ["bramblekeep"] as const satisfies readonly Area[];
export type Dungeon = (typeof DUNGEONS)[number];

// One dungeon's keys. Any small key opens any locked door ("L") in its
// dungeon; the boss key ("big", the item "bigKey") opens only the boss door
// ("B"). A dungeon has one boss door, so its boss key is a yes or no. See
// the dungeon-design skill (.claude/skills/) for the full rules.
export type DungeonKeys = { small: number; big: boolean };

export type Inventory = {
  owned: Set<KeptItem>;
  // The tool on the item button.
  equipped: ToolId | null;
  gems: number;
  // Every key, these and the Gate Key, is used up by the door it opens.
  keys: Record<Dungeon, DungeonKeys>;
  // Opens the overgrown gate in front of Bramblekeep. It's found in the
  // Hollow and used out in the overworld, so it isn't any dungeon's key.
  gateKey: boolean;
};

// ---------------------------------------------------------------------------
// Actors.
// ---------------------------------------------------------------------------
export type Knockback = { vx: number; vy: number; frames: number };

export type HeroAction = "none" | "swing" | "charge" | "spin" | "cast" | "fall" | "dying";

export type Hero = Box & {
  facing: Direction;
  moving: boolean;
  walkFrames: number;
  hp: number;
  maxHp: number;
  invulnFrames: number;
  knockback: Knockback | null;
  action: HeroAction;
  actionFrame: number;
  // Bumped on every swing/spin, so a single attack can never land on the
  // same enemy twice no matter how long its hitbox overlaps them.
  attackId: number;
  // Shown held overhead (the classic "item get" pose) while an item's
  // dialog is open.
  holding: ItemId | null;
  // In deep water (which takes the Flippers).
  swimming: boolean;
  // Steps left underwater, or 0 when at the surface.
  dive: number;
  diveCooldown: number;
  // Steps left of the grace period after coming up (SURFACE_GRACE_FRAMES).
  surfacing: number;
};

export type EnemyKind = "jellop" | "flitter" | "knight" | "spitbug" | "clank" | "thornback";
export type BossId = "clank" | "thornback";
export type EnemyMode = "idle" | "move" | "chase" | "windup" | "charge" | "volley" | "stunned" | "dying";

export type Enemy = Box & {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  facing: Direction;
  // Continuous heading in radians, where 0 faces "down" (+y) and PI/2
  // faces "right" (+x). Most enemies just snap it to `facing`; Thornback
  // turns smoothly, and which way it's pointing is the whole fight.
  angle: number;
  vx: number;
  vy: number;
  mode: EnemyMode;
  timer: number;
  counter: number;
  hurtFrames: number;
  knockback: Knockback | null;
  anim: number;
  lastHitBy: number;
  // Dizzy after being swapped by the Switcheroo: harmless and can't act.
  stunFrames: number;
  // Which of the room's authored spawns this is (its index in the room's
  // enemy list), or -1 for one created some other way. Dungeon enemies
  // use it to stay defeated.
  spawn: number;
};

export type PropKind = "statue" | "crystal";

// Swappable objects. Statues are heavy (they hold pressure plates down);
// crystals just float there waiting to be swapped with.
export type Prop = Box & { id: number; kind: PropKind; swapFlash: number };

export type NpcKind =
  | "nana"
  | "banjo"
  | "ribbit"
  | "moanica"
  | "fumbleton"
  | "mossbeard"
  | "pinch"
  // Fernwhistle
  | "stout"
  | "mallard"
  | "duckling"
  | "pidge"
  | "marigold"
  | "bellwether"
  | "tilly"
  | "bo"
  | "pip"
  | "fern"
  | "bun"
  | "hopsworth"
  | "ott";

export type Npc = Box & {
  id: number;
  kind: NpcKind;
  facing: Direction;
  wanders: boolean;
  vx: number;
  vy: number;
  timer: number;
  anim: number;
  // Counts down after a conversation; the renderer uses it for a little
  // "excited" bounce.
  talkFrames: number;
  // Quest villagers (a runaway duckling, a hiding child) are tagged, and
  // have a home they go back to once you've found them.
  tag: string | null;
  home: Point | null;
  // A duckling that's spotted you and is running for it.
  fleeing: boolean;
};

export type DropKind = "gem" | "bigGem" | "heart" | "heartContainer" | "sunstone";

export type Drop = Box & {
  id: number;
  kind: DropKind;
  // Frames until it vanishes, or null for permanent drops (heart
  // containers, the Sunstone).
  life: number | null;
  // Permanent drops set a flag on pickup, so they never respawn.
  flag: string | null;
  // A little hop when spawned: height above the floor and its velocity.
  z: number;
  vz: number;
};

export type ProjectileKind = "seed" | "thorn" | "bolt";

export type Projectile = Box & {
  id: number;
  kind: ProjectileKind;
  vx: number;
  vy: number;
  traveled: number;
};

// A falling boulder shaken loose when Thornback rams a wall: a shadow
// telegraphs where it lands, then it hits.
export type Hazard = { id: number; x: number; y: number; timer: number; maxTimer: number; radius: number };

export type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
};

// ---------------------------------------------------------------------------
// Dialog, transitions, events, input.
// ---------------------------------------------------------------------------
export type DialogAction =
  | "none"
  | "giveSword"
  | "banjoGift"
  | "buyHeart"
  | "rest"
  | "snack"
  | "win"
  // Fernwhistle's side quests (see quests.ts).
  | "takeLetter"
  | "takeReply"
  | "deliverReply"
  | "duckReward"
  | "seekPrize"
  | "returnRing";

export type DialogChoice = {
  options: [string, string];
  selected: 0 | 1;
  onYes: DialogAction;
  // What the speaker says back if you pick the second option.
  noPages: string[];
};

export type Dialog = {
  speaker: string | null;
  pages: string[];
  page: number;
  // How many characters of the current page have been revealed. Fractional
  // so the typewriter speed isn't tied to whole characters per step.
  shown: number;
  // Offered on the last page, once its text has fully revealed.
  choice: DialogChoice | null;
  then: DialogAction;
};

export type Spawn = { roomId: string; x: number; y: number; facing: Direction };

export type Transition =
  | {
      kind: "scroll";
      dir: Direction;
      frame: number;
      fromRoomId: string;
      // The room being left, exactly as it was (cut bushes and all), so it
      // can be drawn sliding away.
      fromTiles: string[][];
      // Where the view slides from and to, in area pixels (see camera.ts).
      fromCamera: Point;
      toCamera: Point;
      start: Point;
    }
  // `hold` keeps the screen black a little longer (a nap, say).
  | { kind: "fadeOut"; frame: number; to: Spawn; hold?: number }
  | { kind: "fadeIn"; frame: number };

export type SoundName =
  | "swing"
  | "spin"
  | "chargeReady"
  | "hit"
  | "clink"
  | "enemyDie"
  | "heroHurt"
  | "fall"
  | "bushCut"
  | "potBreak"
  | "gem"
  | "heart"
  | "itemGet"
  | "fanfare"
  | "doorUnlock"
  | "shutterOpen"
  | "shutterClose"
  | "chestOpen"
  | "chestAppear"
  | "stairs"
  | "lowHealth"
  | "text"
  | "cast"
  | "swap"
  | "fizzle"
  | "switchToggle"
  | "bars"
  | "spit"
  | "bossRoar"
  | "thud"
  | "rockFall"
  | "bossDie"
  | "dying"
  | "menu"
  | "mapOpen"
  | "splash"
  | "dive"
  | "surface"
  | "bell"
  | "lullaby"
  | "quake"
  | "peep"
  | "bark";

export type GameEvent =
  | { type: "sound"; name: SoundName }
  | { type: "checkpoint" }
  | { type: "won" }
  | { type: "bossIntro"; boss: BossId };

export type Buttons = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sword: boolean;
  tool: boolean;
};

// `held` is what's down right now; `pressed` is what went down since the
// previous step (edges), so a tap is never missed or double-counted.
export type Input = { held: Buttons; pressed: Buttons };

export function noButtons(): Buttons {
  return { up: false, down: false, left: false, right: false, sword: false, tool: false };
}

export type GameStatus = "title" | "playing" | "paused" | "gameover" | "won";

export type GameState = {
  status: GameStatus;
  // Steps simulated while playing. Doubles as the clear-time clock.
  frame: number;
  rng: number;

  roomId: string;
  tiles: string[][];
  // Where the hero entered the current room; falling in a pit puts them
  // back here.
  roomEntry: Point;

  hero: Hero;
  inventory: Inventory;
  flags: Set<string>;

  enemies: Enemy[];
  npcs: Npc[];
  props: Prop[];
  drops: Drop[];
  projectiles: Projectile[];
  hazards: Hazard[];
  particles: Particle[];

  dialog: Dialog | null;
  transition: Transition | null;
  respawn: Spawn;
  deaths: number;
  nextId: number;

  // Game-feel timers: a few frozen frames on big hits, and camera shake.
  hitStop: number;
  shake: number;
  lowHealthTimer: number;

  // Room mechanism state, recomputed every step (see room.ts) and kept
  // here so a change can be detected and announced with a sound.
  shutterArmed: boolean;
  shuttersClosed: boolean;
  barsOpen: boolean;
  roomCleared: boolean;
  // Brief lockout after a crystal switch flips, so one swing can't flip
  // it back and forth on consecutive frames.
  switchCooldown: number;

  events: GameEvent[];
};
