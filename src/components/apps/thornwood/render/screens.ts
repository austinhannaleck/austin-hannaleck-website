import { BOSS_NAMES, ENEMY_STATS } from "../engine/actors";
import { carrying } from "../engine/quests";
import type { BossId, Enemy, GameState, ToolId } from "../engine/types";
import { dungeonOf } from "../engine/world";
import { formatTime } from "../ui/format";
import {
  ITEMS_PANEL,
  GEAR_PANEL,
  ITEM_SLOT_COUNT,
  MENU_PANEL,
  TOOL_INFO,
  itemSlotRect,
  slotOfTool,
  toolInSlot,
  type PauseFocus,
} from "../ui/inventory";
import { menuLayout, type MenuItem, type Rect } from "../ui/menu";
import { LINE_HEIGHT, drawText, measureText, wrapText } from "./font";
import type { Sprite } from "./pixelart";
import type { Sprites } from "./sprites";

// The 2D interface, drawn straight into the game screen in the same pixel
// font and palette as the world: HUD (with the boss bar), dialog box, title
// cards, and the full-screen menus.

export const SCREEN_W = 256;
export const HUD_H = 32;

export const INK = "#fffaf0";
export const GOLD = "#ffd040";
export const SHADOW = "#1c1230";
const PANEL = "#1e2a78";
export const PANEL_EDGE = "#8898e0";

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function blit(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number): void {
  ctx.drawImage(s.img, Math.round(x), Math.round(y));
}

// The classic RPG window: navy fill, a white frame inside a dark one, and
// clipped corners.
export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = PANEL): void {
  rect(ctx, x, y, w, h, SHADOW);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, INK);
  rect(ctx, x + 2, y + 2, w - 4, h - 4, SHADOW);
  rect(ctx, x + 3, y + 3, w - 6, h - 6, fill);
  rect(ctx, x + 3, y + 3, w - 6, 1, PANEL_EDGE);
  ctx.clearRect(x, y, 1, 1);
  ctx.clearRect(x + w - 1, y, 1, 1);
  ctx.clearRect(x, y + h - 1, 1, 1);
  ctx.clearRect(x + w - 1, y + h - 1, 1, 1);
}

export function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, color = INK, align: "left" | "center" | "right" = "left", scale = 1): void {
  drawText(ctx, value, x, y, color, { shadow: SHADOW, align, scale });
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
// The item button's name, as printed on the player's keyboard.
const ITEM_KEY = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "OPT" : "ALT";

// An item box with the key that uses it printed underneath.
function itemSlot(ctx: CanvasRenderingContext2D, x: number, label: string, icon: Sprite | null): void {
  rect(ctx, x, 1, 22, 22, SHADOW);
  rect(ctx, x + 1, 2, 20, 20, INK);
  rect(ctx, x + 2, 3, 18, 18, "#262064");
  if (icon) blit(ctx, icon, x + 11 - icon.w / 2, 12 - icon.h / 2);
  text(ctx, label, x + 11, 22, GOLD, "center");
}

// `boss` is the boss you're fighting, if any. Its name and health take over
// the middle of the HUD (gems and keys can wait) so nothing covers the fight.
export function drawHud(ctx: CanvasRenderingContext2D, state: GameState, sprites: Sprites, boss: Enemy | undefined): void {
  rect(ctx, 0, 0, SCREEN_W, HUD_H, "#141028");
  rect(ctx, 0, HUD_H - 2, SCREEN_W, 1, "#2e2458");
  rect(ctx, 0, HUD_H - 1, SCREEN_W, 1, SHADOW);
  const inv = state.inventory;

  itemSlot(ctx, 8, "SPACE", inv.owned.has("sword") ? sprites.sword.downRight : null);
  itemSlot(ctx, 40, ITEM_KEY, inv.equipped ? toolIcon(sprites, inv.equipped) : null);

  if (boss) {
    bossBar(ctx, BOSS_NAMES[ENEMY_STATS[boss.kind].boss!].name, boss.hp, boss.maxHp);
  } else {
    blit(ctx, sprites.items.gem, 72, 9);
    text(ctx, String(inv.gems).padStart(3, "0"), 83, 11);
    const dungeon = dungeonOf(state.roomId);
    if (dungeon) {
      const keys = inv.keys[dungeon];
      blit(ctx, sprites.items.smallKey, 106, 8);
      text(ctx, String(keys.small), 116, 11);
      if (keys.big) blit(ctx, sprites.items.bigKey, 126, 6);
    } else if (inv.gateKey) {
      blit(ctx, sprites.items.gateKey, 108, 6);
    }
  }

  text(ctx, "- LIFE -", 210, 2, "#ff8c8c", "center");
  const hearts = state.hero.maxHp / 2;
  const startX = 210 - Math.min(hearts, 10) * 4.5;
  for (let i = 0; i < hearts; i++) {
    const fill = Math.max(0, Math.min(2, state.hero.hp - i * 2));
    const icon = fill === 2 ? sprites.hud.heart.full : fill === 1 ? sprites.hud.heart.half : sprites.hud.heart.empty;
    blit(ctx, icon, startX + (i % 10) * 9, 13 + Math.floor(i / 10) * 8);
  }
}

// ---------------------------------------------------------------------------
// Dialog box
// ---------------------------------------------------------------------------
const DIALOG = { x: 8, y: 118, w: 240, h: 54 };
const DIALOG_TEXT_W = 222;

export function dialogChoiceRects(): Rect[] {
  const y = HUD_H + DIALOG.y + DIALOG.h - 16;
  return [
    { x: 30, y, w: 90, h: 12 },
    { x: 136, y, w: 90, h: 12 },
  ];
}

// `oy` is where the playfield starts on screen.
export function drawDialog(ctx: CanvasRenderingContext2D, state: GameState, oy: number, time: number): void {
  const dialog = state.dialog;
  if (!dialog) return;
  const { x, w, h } = DIALOG;
  const y = oy + DIALOG.y;
  panel(ctx, x, y, w, h);

  if (dialog.speaker) {
    const tagW = measureText(dialog.speaker) + 12;
    panel(ctx, x + 6, y - 10, tagW, 15, "#7a2c5c");
    text(ctx, dialog.speaker, x + 12, y - 6, GOLD);
  }

  // Wrap the whole page first so words don't jump lines as they type out.
  const page = dialog.pages[dialog.page];
  const lines = wrapText(page, DIALOG_TEXT_W);
  let remaining = Math.floor(dialog.shown);
  lines.forEach((line, i) => {
    const visible = line.slice(0, Math.max(0, remaining));
    remaining -= line.length + 1;
    text(ctx, visible, x + 9, y + 7 + i * LINE_HEIGHT);
  });

  const complete = dialog.shown >= page.length;
  const lastPage = dialog.page === dialog.pages.length - 1;
  if (complete && lastPage && dialog.choice) {
    const rects = dialogChoiceRects();
    dialog.choice.options.forEach((option, i) => {
      const r = rects[i];
      const selected = dialog.choice!.selected === i;
      if (selected && Math.floor(time * 4) % 2 === 0) text(ctx, ">", r.x - 8, r.y + 1, GOLD);
      text(ctx, option, r.x, r.y + 1, selected ? GOLD : INK);
    });
  } else if (complete && Math.floor(time * 3) % 2 === 0) {
    // The blinking "more" arrow.
    const ax = x + w - 14;
    const ay = y + h - 10;
    rect(ctx, ax, ay, 7, 1, GOLD);
    rect(ctx, ax + 1, ay + 1, 5, 1, GOLD);
    rect(ctx, ax + 2, ay + 2, 3, 1, GOLD);
    rect(ctx, ax + 3, ay + 3, 1, 1, GOLD);
  }
}

// The boss's half of the HUD, laid out like the LIFE half: name on top,
// a framed bar level with the hearts. It fits between the item boxes and
// a full row of ten hearts.
function bossBar(ctx: CanvasRenderingContext2D, name: string, hp: number, maxHp: number): void {
  const x = 69;
  const w = 88;
  const y = 14;
  text(ctx, name.toUpperCase(), x + w / 2, 2, "#ffb0c8", "center");
  rect(ctx, x, y, w, 7, SHADOW);
  rect(ctx, x + 1, y + 1, w - 2, 5, INK);
  rect(ctx, x + 2, y + 2, w - 4, 3, "#3a1430");
  const filled = Math.round(((w - 4) * Math.max(0, hp)) / maxHp);
  rect(ctx, x + 2, y + 2, filled, 3, "#ff4060");
  rect(ctx, x + 2, y + 2, filled, 1, "#ff9cb0");
}

// ---------------------------------------------------------------------------
// Boss title card, area banner
// ---------------------------------------------------------------------------

export function drawBossIntro(ctx: CanvasRenderingContext2D, boss: BossId, age: number, oy: number): void {
  if (age > 3) return;
  const { name, title } = BOSS_NAMES[boss];
  const slide = Math.min(1, age / 0.35);
  const fade = age > 2.4 ? 1 - (age - 2.4) / 0.6 : 1;
  if (fade <= 0) return;
  ctx.save();
  ctx.globalAlpha = fade;
  const y = oy + 58;
  rect(ctx, 0, y - 6, SCREEN_W, 44, "rgba(20, 10, 40, 0.65)");
  rect(ctx, 0, y - 6, SCREEN_W, 1, GOLD);
  rect(ctx, 0, y + 37, SCREEN_W, 1, GOLD);
  const dx = Math.round((1 - slide) * 120);
  text(ctx, title.toUpperCase(), SCREEN_W / 2 - dx, y, GOLD, "center");
  text(ctx, name.toUpperCase(), SCREEN_W / 2 + dx, y + 12, INK, "center", 2);
  ctx.restore();
}

export function drawBanner(ctx: CanvasRenderingContext2D, name: string, age: number, oy: number): void {
  if (age > 2.2) return;
  const drop = Math.min(1, age / 0.25);
  const lift = age > 1.8 ? (age - 1.8) / 0.4 : 0;
  const w = measureText(name) + 20;
  const y = oy + Math.round(-14 + drop * 18 - lift * 18);
  panel(ctx, (SCREEN_W - w) / 2, y, w, 15, "#2a5a38");
  text(ctx, name, SCREEN_W / 2, y + 4, INK, "center");
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------
export function drawMenu(ctx: CanvasRenderingContext2D, status: GameState["status"], items: MenuItem[], cursor: number, sprites: Sprites, time: number): void {
  const rects = menuLayout(status, items.length);
  items.forEach((item, i) => {
    const r = rects[i];
    const selected = i === cursor;
    text(ctx, item.label.toUpperCase(), r.x + r.w / 2, r.y + 3, selected ? GOLD : INK, "center");
    if (selected) {
      const bob = Math.floor(time * 4) % 2;
      const labelW = measureText(item.label.toUpperCase());
      ctx.drawImage(sprites.sword.right.img, r.x + r.w / 2 - labelW / 2 - 20 + bob, r.y);
    }
  });
}

function dim(ctx: CanvasRenderingContext2D, color: string): void {
  rect(ctx, 0, 0, SCREEN_W, 208, color);
}

// A logo in the title-screen style: thick outline, gold-to-orange fill.
function logo(ctx: CanvasRenderingContext2D, value: string, cx: number, y: number, scale: number): void {
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
  ]) {
    drawText(ctx, value, cx + dx, y + dy, SHADOW, { align: "center", scale });
  }
  drawText(ctx, value, cx + 2, y + 3, SHADOW, { align: "center", scale });
  drawText(ctx, value, cx, y, "#ff9a38", { align: "center", scale });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, SCREEN_W, Math.ceil(4 * scale));
  ctx.clip();
  drawText(ctx, value, cx, y, GOLD, { align: "center", scale });
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, SCREEN_W, scale);
  ctx.clip();
  drawText(ctx, value, cx, y, "#fff4a0", { align: "center", scale });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The title screen: a sunset over layered, scrolling hills (a nod to the
// parallax intros of 16-bit consoles), with the hero and Banjo walking.
// ---------------------------------------------------------------------------
const SKY = ["#2c1e66", "#4a2c86", "#7a3c9a", "#b54e98", "#e8708a", "#ff9c78", "#ffc47c"];

function ridge(seed: number, x: number, amplitude: number, period: number): number {
  return (
    Math.sin((x + seed * 31) / period) * amplitude +
    Math.sin((x * 2.3 + seed * 17) / period) * amplitude * 0.45 +
    Math.sin((x * 5.1 + seed * 7) / period) * amplitude * 0.15
  );
}

export function drawTitle(
  ctx: CanvasRenderingContext2D,
  sprites: Sprites,
  items: MenuItem[],
  cursor: number,
  bestFrames: number | null,
  time: number,
): void {
  // Sky bands, dithered where they meet.
  const band = 15;
  rect(ctx, 0, 0, SCREEN_W, 208, SKY[SKY.length - 1]);
  SKY.forEach((color, i) => rect(ctx, 0, i * band, SCREEN_W, band, color));
  for (let i = 1; i < SKY.length; i++) {
    ctx.fillStyle = SKY[i];
    for (let x = 0; x < SCREEN_W; x += 2) ctx.fillRect(x + (i % 2), i * band - 1, 1, 1);
    ctx.fillStyle = SKY[i - 1];
    for (let x = 1; x < SCREEN_W; x += 2) ctx.fillRect(x, i * band, 1, 1);
  }
  // The setting sun
  ctx.fillStyle = "#fff0a0";
  for (let y = -16; y <= 16; y++) {
    const half = Math.floor(Math.sqrt(256 - y * y));
    if (y % 4 === 2 && y > 0) continue;
    ctx.fillRect(196 - half, 96 + y, half * 2, 1);
  }
  // Drifting clouds
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 83 + time * (4 + i * 2)) % (SCREEN_W + 60)) - 30;
    const cy = 22 + i * 13;
    rect(ctx, cx, cy, 26, 3, "#f8b8c8");
    rect(ctx, cx + 4, cy - 2, 14, 2, "#ffd8e0");
    rect(ctx, cx + 2, cy + 3, 22, 1, "#d88aa8");
  }

  const layer = (base: number, amplitude: number, period: number, speed: number, color: string, highlight: string | null, seed: number) => {
    const scroll = time * speed;
    for (let x = 0; x < SCREEN_W; x++) {
      const top = Math.round(base + ridge(seed, x + scroll, amplitude, period));
      rect(ctx, x, top, 1, 208 - top, color);
      if (highlight) rect(ctx, x, top, 1, 1, highlight);
    }
  };
  layer(118, 10, 22, 3, "#5a3c8c", "#7a5cac", 1);
  layer(140, 7, 14, 8, "#2e5a6c", "#4a7c86", 2);
  layer(156, 5, 9, 16, "#1c4436", "#2e6a4a", 3);

  // A row of trees, then the meadow in front
  const trees = sprites.props.trees;
  const treeScroll = (time * 26) % 22;
  for (let i = -1; i < 13; i++) {
    const t = trees[(i + 30) % trees.length];
    ctx.drawImage(t.img, i * 22 - treeScroll, 150);
  }
  rect(ctx, 0, 176, SCREEN_W, 32, "#58b848");
  rect(ctx, 0, 176, SCREEN_W, 1, "#84d860");
  const grassScroll = (time * 40) % 8;
  for (let x = -8; x < SCREEN_W; x += 8) {
    rect(ctx, x - grassScroll, 182, 1, 2, "#3c9040");
    rect(ctx, x - grassScroll + 4, 194, 1, 2, "#3c9040");
  }
  rect(ctx, 0, 186, SCREEN_W, 8, "#e4c084");
  rect(ctx, 0, 186, SCREEN_W, 1, "#c49a5c");

  // Our heroes, off on an adventure
  const walk = Math.floor(time * 7) % 2;
  const heroFrame = sprites.hero.walk.right[walk ? 1 : 0];
  ctx.drawImage(heroFrame.img, 64, 192 - heroFrame.baseline);
  const banjo = sprites.npcs.banjo.right[walk];
  ctx.drawImage(banjo.img, 38, 192 - banjo.baseline);

  logo(ctx, "THORNWOOD", SCREEN_W / 2, 20, 3);
  text(ctx, "A TALE OF THORNS AND SWAPS", SCREEN_W / 2, 52, INK, "center");

  panel(ctx, 64, 126, 128, items.length * 15 + 12, "rgba(30, 42, 120, 0.85)");
  drawMenu(ctx, "title", items, cursor, sprites, time);
  if (bestFrames !== null) text(ctx, `BEST ${formatTime(bestFrames)}`, SCREEN_W - 6, 166, GOLD, "right");
}

export function drawPause(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  items: MenuItem[],
  cursor: number,
  focus: PauseFocus,
  sprites: Sprites,
  time: number,
): void {
  dim(ctx, "rgba(12, 8, 28, 0.7)");
  const inv = state.inventory;

  // ITEMS: the tools. The one with the cursor on it is on the item button.
  const ip = ITEMS_PANEL;
  panel(ctx, ip.x, ip.y, ip.w, ip.h);
  text(ctx, "ITEMS", ip.x + ip.w / 2, ip.y + 6, GOLD, "center");
  for (let i = 0; i < ITEM_SLOT_COUNT; i++) {
    const r = itemSlotRect(i);
    rect(ctx, r.x, r.y, r.w, r.h, SHADOW);
    rect(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, "#262064");
    const tool = toolInSlot(i);
    if (tool && inv.owned.has(tool)) {
      const icon = toolIcon(sprites, tool);
      blit(ctx, icon, r.x + r.w / 2 - icon.w / 2, r.y + r.h / 2 - icon.h / 2);
    }
  }
  if (inv.equipped) {
    const r = itemSlotRect(slotOfTool(inv.equipped));
    const active = focus === "items";
    selectionCorners(ctx, r, active ? Math.floor(time * 4) % 2 : 0, active ? GOLD : PANEL_EDGE);
    const info = TOOL_INFO[inv.equipped];
    text(ctx, info.name, ip.x + ip.w / 2, ip.y + 80, INK, "center");
    wrapText(info.blurb, ip.w - 16).slice(0, 2).forEach((line, i) => {
      text(ctx, line, ip.x + ip.w / 2, ip.y + 92 + i * 9, PANEL_EDGE, "center");
    });
  } else {
    text(ctx, "No tools yet.", ip.x + ip.w / 2, ip.y + 80, PANEL_EDGE, "center");
  }

  // GEAR: things that just work once you have them.
  const gp = GEAR_PANEL;
  panel(ctx, gp.x, gp.y, gp.w, gp.h);
  text(ctx, "GEAR", gp.x + gp.w / 2, gp.y + 6, GOLD, "center");
  gearRow(ctx, gp.x + 8, gp.y + 18, "Sword", inv.owned.has("sword") ? sprites.sword.downRight : null);
  gearRow(ctx, gp.x + 8, gp.y + 44, "Flippers", inv.owned.has("flippers") ? sprites.items.flippers : null);
  // Keys: this dungeon's, if you're in one, then the Gate Key if you're
  // carrying it.
  const keysY = gp.y + 76;
  let keyX = gp.x + 12;
  const dungeon = dungeonOf(state.roomId);
  if (dungeon) {
    const keys = inv.keys[dungeon];
    blit(ctx, sprites.items.smallKey, keyX, keysY);
    text(ctx, `x${keys.small}`, keyX + 10, keysY + 4);
    keyX += 32;
    if (keys.big) {
      blit(ctx, sprites.items.bigKey, keyX, keysY - 4);
      keyX += 18;
    }
  }
  if (inv.gateKey) blit(ctx, sprites.items.gateKey, keyX, keysY - 4);
  // Whatever you're carrying for somebody in Fernwhistle.
  const errand = carrying(state);
  if (errand) {
    const icon = sprites.items[errand];
    blit(ctx, icon, gp.x + 19 - icon.w / 2, gp.y + 100 - icon.h / 2);
    text(ctx, ERRAND_NAMES[errand], gp.x + 35, gp.y + 96);
  }

  // The menu, along the bottom.
  const mp = MENU_PANEL;
  panel(ctx, mp.x, mp.y, mp.w, mp.h);
  drawMenu(ctx, "paused", items, focus === "menu" ? cursor : -1, sprites, time);
  text(ctx, "Progress saves in every new room.", SCREEN_W / 2, mp.y + 27, PANEL_EDGE, "center");
}

const ERRAND_NAMES = { letter: "Letter", reply: "Reply", ring: "Ring" };

// A piece of gear: its icon in a box and its name, or an empty box and
// "???" until it's found.
function gearRow(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, icon: Sprite | null): void {
  rect(ctx, x, y, 22, 22, SHADOW);
  rect(ctx, x + 1, y + 1, 20, 20, "#262064");
  if (icon) blit(ctx, icon, x + 11 - icon.w / 2, y + 11 - icon.h / 2);
  text(ctx, icon ? label : "???", x + 27, y + 8, icon ? INK : PANEL_EDGE);
}

// The classic item cursor: four corner brackets, pulsing outward.
function selectionCorners(ctx: CanvasRenderingContext2D, r: Rect, out: number, color: string): void {
  const x0 = r.x - 2 - out;
  const y0 = r.y - 2 - out;
  const x1 = r.x + r.w + 1 + out;
  const y1 = r.y + r.h + 1 + out;
  for (const [x, y, dx, dy] of [
    [x0, y0, 1, 1],
    [x1, y0, -1, 1],
    [x0, y1, 1, -1],
    [x1, y1, -1, -1],
  ]) {
    rect(ctx, Math.min(x, x + dx * 4), y, 5, 1, color);
    rect(ctx, x, Math.min(y, y + dy * 4), 1, 5, color);
  }
}

export function toolIcon(sprites: Sprites, tool: ToolId): Sprite {
  switch (tool) {
    case "switcheroo":
      return sprites.wand.right;
  }
}

export function drawGameOver(ctx: CanvasRenderingContext2D, items: MenuItem[], cursor: number, sprites: Sprites, time: number): void {
  dim(ctx, "rgba(60, 4, 24, 0.78)");
  text(ctx, "GAME OVER", SCREEN_W / 2, 52, "#ff6070", "center", 3);
  const hero = sprites.hero.collapsed;
  ctx.drawImage(hero.img, SCREEN_W / 2 - hero.w / 2, 98);
  text(ctx, "Nana says: get back up, dear.", SCREEN_W / 2, 122, INK, "center");
  drawMenu(ctx, "gameover", items, cursor, sprites, time);
}

export function drawVictory(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  items: MenuItem[],
  cursor: number,
  bestFrames: number | null,
  sprites: Sprites,
  time: number,
): void {
  dim(ctx, "rgba(16, 10, 40, 0.72)");
  // Fireworks
  for (let i = 0; i < 5; i++) {
    const cycle = (time * 0.7 + i * 0.37) % 1;
    const cx = 30 + ((i * 53) % 200);
    const cy = 40 + ((i * 29) % 50);
    const colors = ["#ffd040", "#ff9cc8", "#8cc4ff", "#b4f478", "#ff9a38"];
    for (let p = 0; p < 10; p++) {
      const a = (p / 10) * Math.PI * 2;
      const r = cycle * 22;
      rect(ctx, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r + cycle * cycle * 8), 1, 1, colors[i]);
    }
  }
  const sun = sprites.items.sunstone[Math.floor(time * 4) % 2];
  ctx.drawImage(sun.img, SCREEN_W / 2 - sun.w / 2, 20);
  text(ctx, "PUDDLEBROOK", SCREEN_W / 2, 42, GOLD, "center", 2);
  text(ctx, "IS SAVED!", SCREEN_W / 2, 64, GOLD, "center", 2);
  text(ctx, "Banjo is beside himself with joy.", SCREEN_W / 2, 90, INK, "center");

  panel(ctx, 40, 106, 176, 56);
  const stats: [string, string][] = [
    ["Time", formatTime(state.frame)],
    ["Gems", String(state.inventory.gems)],
    ["Tumbles", String(state.deaths)],
  ];
  stats.forEach(([label, value], i) => {
    text(ctx, label, 52, 116 + i * 12, "#8898e0");
    text(ctx, value, 204, 116 + i * 12, INK, "right");
  });
  if (bestFrames !== null && bestFrames === state.frame && Math.floor(time * 3) % 2 === 0) {
    text(ctx, "NEW BEST TIME!", SCREEN_W / 2, 164, "#ff9cc8", "center");
  }
  drawMenu(ctx, "won", items, cursor, sprites, time);
}
