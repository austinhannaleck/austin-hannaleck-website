import { BOSS_NAMES, ENEMY_STATS } from "../engine/actors";
import { vectorOf } from "../engine/directions";
import { swordAim } from "../engine/hero";
import { flags as flagNames, initialTiles, pegRaised } from "../engine/room";
import {
  DROP_BLINK_FRAMES,
  DYING_FRAMES,
  FADE_FRAMES,
  FALL_FRAMES,
  HURT_INVULN_FRAMES,
  ROOM_COLS,
  ROOM_H,
  ROOM_ROWS,
  ROOM_W,
  SCROLL_FRAMES,
  SPIN_FRAMES,
  TILE,
  type BossId,
  type Direction,
  type Drop,
  type Enemy,
  type GameState,
  type Npc,
  type Point,
  type Prop,
} from "../engine/types";
import { ROOMS, areaOf, tileKey } from "../engine/world";
import type { MenuItem } from "../ui/menu";
import type { Sprite } from "./pixelart";
import {
  HUD_H,
  SCREEN_W,
  drawBanner,
  drawBossBar,
  drawBossIntro,
  drawDialog,
  drawGameOver,
  drawHud,
  drawPause,
  drawTitle,
  drawVictory,
} from "./screens";
import { getSprites, type Sprites } from "./sprites";
import { buildRoomArt, drawGroundAnimation, type RoomArt } from "./tiles";

// Draws a GameState as a 16-bit-style screen: 256 pixels wide (the SNES's
// native width), a 32px HUD over a 256x176 view of the current room. The
// canvas is drawn at that native size and the page scales it up by whole
// pixels, so every pixel stays a crisp square.
//
// Like the engine, this owns no game rules; it reads state and draws it.

export const SCREEN_H = HUD_H + ROOM_H;

export type RenderUi = {
  menu: { items: MenuItem[]; cursor: number } | null;
  bestFrames: number | null;
  bossIntro: { boss: BossId; startedAt: number } | null;
};

type Sorted = { sortY: number; draw: () => void };

const DYNAMIC = new Set(["b", "p", "C", "L", "B", "S", "D", "r", "u", "P", "Q"]);
const SPIN_ORDER: Direction[] = ["down", "left", "up", "right"];

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export class PixelRenderer {
  private ctx: CanvasRenderingContext2D;
  private field = canvas(ROOM_W, ROOM_H);
  private fctx: CanvasRenderingContext2D;
  private mosaic = canvas(ROOM_W, ROOM_H);
  private sprites: Sprites;
  private rooms = new Map<string, RoomArt>();
  private tileAnim = new Map<string, number>();
  private banner: { name: string; startedAt: number } | null = null;
  private lastRoomName: string | null = null;
  private lastState: GameState | null = null;
  private reducedMotion: boolean;

  constructor(target: HTMLCanvasElement) {
    target.width = SCREEN_W;
    target.height = SCREEN_H;
    this.ctx = target.getContext("2d")!;
    this.fctx = this.field.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    this.fctx.imageSmoothingEnabled = false;
    this.sprites = getSprites();
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  private room(roomId: string): RoomArt {
    let art = this.rooms.get(roomId);
    if (!art) {
      art = buildRoomArt(roomId);
      this.rooms.set(roomId, art);
    }
    return art;
  }

  render(state: GameState, ui: RenderUi, time: number): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    if (state !== this.lastState) {
      this.lastState = state;
      this.lastRoomName = ROOMS[state.roomId].name;
      this.banner = null;
      this.tileAnim.clear();
    }

    if (state.status === "title") {
      drawTitle(ctx, this.sprites, ui.menu?.items ?? [], ui.menu?.cursor ?? 0, ui.bestFrames, time);
      return;
    }

    this.trackBanner(state, time);
    this.drawField(state, time);

    // Compose the playfield onto the screen, with shake and, for stairs and
    // cave mouths, the SNES-style mosaic dissolve.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, HUD_H, SCREEN_W, ROOM_H);
    let sx = 0;
    let sy = 0;
    if (state.shake > 0 && !this.reducedMotion && state.status === "playing") {
      const k = Math.min(3, Math.ceil(state.shake / 6));
      sx = Math.round((Math.random() * 2 - 1) * k);
      sy = Math.round((Math.random() * 2 - 1) * k);
    }
    const fade = this.fadeAmount(state);
    if (fade > 0) {
      const block = 1 + Math.floor(fade * 10);
      const w = Math.ceil(ROOM_W / block);
      const h = Math.ceil(ROOM_H / block);
      const mctx = this.mosaic.getContext("2d")!;
      mctx.imageSmoothingEnabled = false;
      mctx.clearRect(0, 0, ROOM_W, ROOM_H);
      mctx.drawImage(this.field, 0, 0, w, h);
      ctx.drawImage(this.mosaic, 0, 0, w, h, sx, HUD_H + sy, w * block, h * block);
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, fade * 1.1)})`;
      ctx.fillRect(0, HUD_H, SCREEN_W, ROOM_H);
    } else {
      ctx.drawImage(this.field, sx, HUD_H + sy);
    }

    drawHud(ctx, state, this.sprites);

    const boss = state.enemies.find((e) => ENEMY_STATS[e.kind].boss && e.mode !== "dying");
    if (boss && state.status === "playing") drawBossBar(ctx, BOSS_NAMES[ENEMY_STATS[boss.kind].boss!].name, boss.hp, boss.maxHp, HUD_H);
    if (this.banner && !boss) drawBanner(ctx, this.banner.name, time - this.banner.startedAt, HUD_H);
    if (ui.bossIntro && state.status === "playing") drawBossIntro(ctx, ui.bossIntro.boss, time - ui.bossIntro.startedAt, HUD_H);
    if (state.status === "playing") drawDialog(ctx, state, HUD_H, time);

    const items = ui.menu?.items ?? [];
    const cursor = ui.menu?.cursor ?? 0;
    if (state.status === "paused") drawPause(ctx, state, items, cursor, this.sprites, time);
    if (state.status === "gameover") drawGameOver(ctx, items, cursor, this.sprites, time);
    if (state.status === "won") drawVictory(ctx, state, items, cursor, ui.bestFrames, this.sprites, time);
  }

  private fadeAmount(state: GameState): number {
    const t = state.transition;
    if (t?.kind === "fadeOut") return Math.min(1, t.frame / FADE_FRAMES);
    if (t?.kind === "fadeIn") return 1 - Math.min(1, t.frame / FADE_FRAMES);
    return 0;
  }

  // A banner with the area's name drops in when you walk somewhere new.
  private trackBanner(state: GameState, time: number): void {
    const name = ROOMS[state.roomId].name;
    if (name !== this.lastRoomName) {
      this.lastRoomName = name;
      this.banner = { name, startedAt: time };
    }
    if (this.banner && time - this.banner.startedAt > 2.4) this.banner = null;
  }

  // -------------------------------------------------------------------------
  // The playfield
  // -------------------------------------------------------------------------
  private drawField(state: GameState, time: number): void {
    const f = this.fctx;
    f.fillStyle = "#000";
    f.fillRect(0, 0, ROOM_W, ROOM_H);

    let offset: Point = { x: 0, y: 0 };
    const t = state.transition;
    if (t?.kind === "scroll") {
      const p = smooth(Math.min(1, t.frame / SCROLL_FRAMES));
      const v = vectorOf(t.dir);
      offset = { x: Math.round(v.x * ROOM_W * (1 - p)), y: Math.round(v.y * ROOM_H * (1 - p)) };
      const from = { x: offset.x - v.x * ROOM_W, y: offset.y - v.y * ROOM_H };
      const fromTiles = initialTiles(t.fromRoomId, state.flags);
      this.drawGround(state, t.fromRoomId, fromTiles, from, time, false);
      for (const prop of this.room(t.fromRoomId).props) prop.draw(f, from.x, from.y, time);
    }

    this.drawGround(state, state.roomId, state.tiles, offset, time, true);
    this.drawShadows(state, offset, time);
    this.drawSorted(state, offset, time);
    this.drawOverhead(state, offset, time);
    if (areaOf(state.roomId) === "bramblekeep") this.drawLighting(state, offset, time);
  }

  private drawGround(state: GameState, roomId: string, tiles: string[][], o: Point, time: number, current: boolean): void {
    const f = this.fctx;
    const art = this.room(roomId);
    f.drawImage(art.ground, o.x, o.y);
    drawGroundAnimation(f, art, o.x, o.y, time);

    const map = ROOMS[roomId].map;
    const p = this.sprites.props;
    for (let row = 0; row < ROOM_ROWS; row++) {
      for (let col = 0; col < ROOM_COLS; col++) {
        const authored = map[row][col];
        if (!DYNAMIC.has(authored)) continue;
        const ch = tiles[row][col];
        const x = o.x + col * TILE;
        const y = o.y + row * TILE;
        const key = `${roomId}:${tileKey(col, row)}`;
        const across = map[row][col - 1] === authored || map[row][col + 1] === authored || map[row][col - 1] === "#" || map[row][col + 1] === "#";
        switch (authored) {
          case "b":
            if (ch === "b") f.drawImage(p.bush.img, x, y);
            break;
          case "p":
            if (ch === "p") f.drawImage(p.pot.img, x, y);
            break;
          case "C": {
            if (ch !== "C" && ch !== "c") break;
            const big = ROOMS[roomId].chests?.[tileKey(col, row)]?.big;
            const s = ch === "c" ? (big ? p.chest.bigOpen : p.chest.open) : big ? p.chest.bigClosed : p.chest.closed;
            f.drawImage(s.img, x, y);
            break;
          }
          case "L":
          case "B": {
            const shut = this.animate(key, ch === authored ? 1 : 0, current);
            const door = authored === "L" ? p.door : p.bigDoor;
            this.drawSliding(across ? door.across : door.along, x, y, shut);
            break;
          }
          case "S":
          case "D": {
            const closed = authored === "S" ? current && state.shuttersClosed : !(current && state.barsOpen);
            const v = this.animate(key, closed ? 1 : 0, current);
            const bars = authored === "S" ? p.bars : p.goldBars;
            this.drawSliding(across ? bars.across : bars.along, x, y, v);
            break;
          }
          case "r":
          case "u": {
            const v = this.animate(key, pegRaised(state, authored) ? 1 : 0, current);
            const peg = p.peg[authored];
            f.drawImage((v > 0.5 ? peg.up : peg.down).img, x, y);
            break;
          }
          case "P":
            f.drawImage((current && state.barsOpen ? p.plate.down : p.plate.up).img, x, y);
            break;
          case "Q": {
            const blue = state.flags.has(flagNames.bluePegs);
            const orb = blue ? p.switchOrb.blue : p.switchOrb.red;
            f.drawImage(orb.img, x, y - (Math.floor(time * 2) % 2));
            break;
          }
        }
      }
    }
  }

  // Doors, shutters, and bars retract into the floor rather than vanish.
  private drawSliding(s: Sprite, x: number, y: number, amount: number): void {
    if (amount <= 0.02) return;
    const h = Math.round(s.h * amount);
    this.fctx.drawImage(s.img, 0, 0, s.w, h, x, y + s.h - h, s.w, h);
  }

  private animate(key: string, target: number, current: boolean): number {
    const prev = this.tileAnim.get(key);
    const next = prev === undefined || !current ? target : prev + Math.sign(target - prev) * Math.min(Math.abs(target - prev), 0.08);
    this.tileAnim.set(key, next);
    return next;
  }

  private shadow(cx: number, cy: number, w: number): void {
    const f = this.fctx;
    f.fillStyle = "rgba(20, 10, 40, 0.38)";
    const half = Math.max(2, Math.round(w / 2));
    f.fillRect(Math.round(cx - half + 1), Math.round(cy - 1), half * 2 - 2, 1);
    f.fillRect(Math.round(cx - half), Math.round(cy), half * 2, 2);
    f.fillRect(Math.round(cx - half + 1), Math.round(cy + 2), half * 2 - 2, 1);
  }

  private drawShadows(state: GameState, o: Point, time: number): void {
    const hero = state.hero;
    if (hero.action !== "fall" && hero.action !== "dying") this.shadow(o.x + hero.x + hero.w / 2, o.y + hero.y + hero.h - 2, 12);
    for (const e of state.enemies) {
      const w = e.kind === "thornback" ? 30 : e.kind === "clank" ? 18 : 12;
      this.shadow(o.x + e.x + e.w / 2, o.y + e.y + e.h - 2, w);
    }
    for (const npc of state.npcs) this.shadow(o.x + npc.x + npc.w / 2, o.y + npc.y + npc.h - 2, npc.kind === "moanica" ? 8 + Math.sin(time * 1.8) : 12);
    for (const d of state.drops) this.shadow(o.x + d.x + d.w / 2, o.y + d.y + d.h, d.w);
    for (const p of state.props) if (p.kind === "crystal") this.shadow(o.x + p.x + p.w / 2, o.y + p.y + p.h - 1, 10);
  }

  private drawSorted(state: GameState, o: Point, time: number): void {
    const list: Sorted[] = [];
    const f = this.fctx;
    for (const prop of this.room(state.roomId).props) {
      list.push({ sortY: prop.sortY + o.y, draw: () => prop.draw(f, o.x, o.y, time) });
    }
    const hero = state.hero;
    list.push({ sortY: o.y + hero.y + hero.h, draw: () => this.drawHero(state, o, time) });
    for (const e of state.enemies) list.push({ sortY: o.y + e.y + e.h, draw: () => this.drawEnemy(e, o, time) });
    for (const npc of state.npcs) list.push({ sortY: o.y + npc.y + npc.h, draw: () => this.drawNpc(npc, o, time) });
    for (const prop of state.props) list.push({ sortY: o.y + prop.y + prop.h, draw: () => this.drawProp(prop, o, time) });
    for (const d of state.drops) list.push({ sortY: o.y + d.y + d.h, draw: () => this.drawDrop(d, o, time) });
    list.sort((a, b) => a.sortY - b.sortY);
    for (const item of list) item.draw();
  }

  private blit(s: Sprite, x: number, y: number, flash = false): void {
    this.fctx.drawImage(flash ? s.flash() : s.img, Math.round(x), Math.round(y));
  }

  // Draws a sprite standing with its feet at (cx, footY).
  private stand(s: Sprite, cx: number, footY: number, flash = false): void {
    this.blit(s, cx - s.w / 2, footY - s.baseline + 1, flash);
  }

  // -------------------------------------------------------------------------
  // The hero
  // -------------------------------------------------------------------------
  private drawHero(state: GameState, o: Point, time: number): void {
    const hero = state.hero;
    const sp = this.sprites;
    const cx = o.x + hero.x + hero.w / 2;
    const footY = o.y + hero.y + hero.h;
    // Getting hurt flashes white, then flickers. (The brief grace period
    // after a Switcheroo swap is too short to count, so swaps don't blink.)
    const sinceHurt = HURT_INVULN_FRAMES - hero.invulnFrames;
    const hurt = hero.invulnFrames > 12;
    if (hurt && hero.action !== "dying" && sinceHurt > 10 && Math.floor(hero.invulnFrames / 3) % 2 === 0) return;
    const flash = hurt && sinceHurt <= 10 && sinceHurt % 4 < 2;

    let body: Sprite;
    let facing = hero.facing;
    switch (hero.action) {
      case "dying":
        if (hero.actionFrame < DYING_FRAMES * 0.45) body = sp.hero.walk[SPIN_ORDER[Math.floor(hero.actionFrame / 4) % 4]][0];
        else body = sp.hero.collapsed;
        break;
      case "fall": {
        const s = Math.max(0, 1 - hero.actionFrame / FALL_FRAMES);
        const frame = sp.hero.walk[SPIN_ORDER[Math.floor(hero.actionFrame / 4) % 4]][0];
        const w = Math.max(1, Math.round(frame.w * s));
        const h = Math.max(1, Math.round(frame.h * s));
        this.fctx.drawImage(frame.img, Math.round(cx - w / 2), Math.round(footY - 4 - h * 0.8), w, h);
        return;
      }
      case "spin":
        facing = SPIN_ORDER[Math.floor((hero.actionFrame / SPIN_FRAMES) * 8) % 4];
        body = sp.hero.attack[facing][0];
        break;
      case "swing":
      case "charge":
      case "cast":
        body = sp.hero.attack[facing][0];
        break;
      default:
        if (hero.holding) body = sp.hero.hold;
        else body = sp.hero.walk[facing][hero.moving ? Math.floor(hero.walkFrames / 7) % 4 : 0];
    }

    const blade = this.bladeFor(state, cx, footY - 6);
    if (blade && blade.behind) this.blit(blade.sprite, blade.x, blade.y);
    this.stand(body, cx, footY, flash);
    if (blade && !blade.behind) this.blit(blade.sprite, blade.x, blade.y);

    if (hero.action === "cast") {
      const wand = sp.wand[facing];
      const v = vectorOf(facing);
      this.blit(wand, cx + v.x * 10 - wand.w / 2, footY - 8 + v.y * 8 - wand.h / 2);
    }
    if (hero.action === "charge" && hero.actionFrame >= 40 && Math.floor(time * 12) % 2 === 0) {
      const aim = swordAim(hero);
      if (aim) this.blit(sp.items.sparkle, o.x + aim.box.x + aim.box.w / 2 + aim.dir.x * 6 - 2, o.y + aim.box.y + aim.box.h / 2 + aim.dir.y * 6 - 2);
    }
    if (hero.holding) this.drawHeld(hero.holding, cx, footY - 23, time);
  }

  // Picks the sword sprite for where the blade is pointing this frame.
  private bladeFor(state: GameState, cx: number, cy: number): { sprite: Sprite; x: number; y: number; behind: boolean } | null {
    const hero = state.hero;
    const sw = this.sprites.sword;
    let dir: Point;
    let center: Point;
    if (hero.action === "spin") {
      const a = (hero.actionFrame / SPIN_FRAMES) * Math.PI * 2;
      dir = { x: Math.sin(a), y: Math.cos(a) };
      center = { x: cx + dir.x * 13, y: cy + dir.y * 11 };
    } else {
      const aim = swordAim(hero);
      if (!aim) return null;
      dir = aim.dir;
      center = { x: cx + dir.x * 12, y: cy + dir.y * 11 + 2 };
    }
    let sprite: Sprite;
    if (Math.abs(dir.x) > Math.abs(dir.y) * 2) sprite = dir.x > 0 ? sw.right : sw.left;
    else if (Math.abs(dir.y) > Math.abs(dir.x) * 2) sprite = dir.y > 0 ? sw.down : sw.up;
    else if (dir.y > 0) sprite = dir.x > 0 ? sw.downRight : sw.downLeft;
    else sprite = dir.x > 0 ? sw.upRight : sw.upLeft;
    return { sprite, x: center.x - sprite.w / 2, y: center.y - sprite.h / 2, behind: dir.y < -0.3 };
  }

  private drawHeld(item: NonNullable<GameState["hero"]["holding"]>, cx: number, bottom: number, time: number): void {
    const sp = this.sprites;
    const s =
      item === "sword"
        ? sp.sword.up
        : item === "switcheroo"
          ? sp.wand.up
          : item === "smallKey"
            ? sp.items.smallKey
            : item === "bigKey"
              ? sp.items.bigKey
              : item === "heartContainer"
                ? sp.items.heartContainer
                : item === "sunstone"
                  ? sp.items.sunstone[Math.floor(time * 4) % 2]
                  : sp.items.bigGem;
    this.blit(s, cx - s.w / 2, bottom - s.h);
  }

  // -------------------------------------------------------------------------
  // Enemies, villagers, props, loot
  // -------------------------------------------------------------------------
  private drawEnemy(e: Enemy, o: Point, time: number): void {
    const sp = this.sprites.enemies;
    const cx = o.x + e.x + e.w / 2;
    const footY = o.y + e.y + e.h;
    const dying = e.mode === "dying";
    const flash = (e.hurtFrames > 0 && Math.floor(e.hurtFrames / 2) % 2 === 0) || (dying && Math.floor(e.timer / 3) % 2 === 0);
    const moving = e.mode === "move" || e.mode === "chase" || e.mode === "charge";
    const shake = e.mode === "windup" || dying ? (Math.floor(time * 30) % 2) * 2 - 1 : 0;
    let s: Sprite;
    let lift = 0;
    switch (e.kind) {
      case "jellop":
        s = sp.jellop[Math.floor(e.anim / (moving ? 6 : 14)) % 2];
        break;
      case "flitter":
        s = sp.flitter[Math.floor(e.anim / (moving ? 4 : 9)) % 2];
        lift = 7 + Math.round(Math.sin(e.anim * 0.1) * 2);
        break;
      case "knight":
        s = sp.knight[e.facing][moving ? Math.floor(e.anim / 8) % 2 : 0];
        break;
      case "spitbug":
        s = sp.spitbug[e.facing][0];
        break;
      case "clank":
        s = sp.clank[e.facing][moving ? Math.floor(e.anim / 6) % 2 : 0];
        break;
      case "thornback": {
        const body = sp.thornback[moving ? Math.floor(e.anim / 5) % 2 : 0];
        // Rotated to its heading, snapped to 16 steps for crunchy,
        // hardware-style rotation.
        const step = Math.PI / 8;
        const angle = Math.round(e.angle / step) * step;
        const f = this.fctx;
        f.save();
        f.translate(Math.round(cx + shake), Math.round(o.y + e.y + e.h / 2));
        f.rotate(-angle);
        f.drawImage(flash ? body.flash() : body.img, -Math.round(body.w / 2), -Math.round(body.h / 2) - 2);
        f.restore();
        this.drawStars(e, cx, o.y + e.y - 10, time);
        return;
      }
    }
    this.stand(s, cx + shake, footY - lift, flash);
    this.drawStars(e, cx, footY - lift - s.baseline + 2, time);
  }

  private drawStars(e: Enemy, cx: number, top: number, time: number): void {
    const dizzy = e.stunFrames > 0 || ((e.kind === "clank" || e.kind === "thornback") && e.mode === "stunned");
    if (!dizzy) return;
    for (let i = 0; i < 3; i++) {
      const a = time * 5 + (i / 3) * Math.PI * 2;
      this.blit(this.sprites.items.star, cx + Math.cos(a) * 8 - 2, top + Math.sin(a) * 3 - 2);
    }
  }

  private drawNpc(npc: Npc, o: Point, time: number): void {
    const sp = this.sprites.npcs;
    const cx = o.x + npc.x + npc.w / 2;
    const footY = o.y + npc.y + npc.h;
    switch (npc.kind) {
      case "nana":
        this.stand(sp.nana, cx, footY - (Math.floor(time * 1.5) % 2));
        break;
      case "ribbit": {
        const hop = npc.talkFrames > 0 ? Math.round(Math.abs(Math.sin(npc.talkFrames * 0.35)) * 4) : 0;
        this.stand(sp.ribbit, cx, footY - hop);
        break;
      }
      case "moanica":
        this.stand(sp.ghost[Math.floor(time * 3) % 2], cx, footY - 5 - Math.round(Math.sin(time * 1.8) * 2));
        break;
      case "banjo": {
        const walking = npc.vx !== 0 || npc.vy !== 0;
        const frames = sp.banjo[npc.facing];
        const hop = npc.talkFrames > 0 ? Math.round(Math.abs(Math.sin(time * 14)) * 2) : 0;
        this.stand(frames[walking ? Math.floor(npc.anim / 6) % frames.length : 0], cx, footY - hop);
        break;
      }
      case "fumbleton":
        this.stand(sp.fumbleton[npc.facing][0], cx + (Math.floor(time * 20) % 2), footY);
        break;
    }
  }

  private drawProp(prop: Prop, o: Point, time: number): void {
    const p = this.sprites.props;
    const cx = o.x + prop.x + prop.w / 2;
    const footY = o.y + prop.y + prop.h;
    const flash = prop.swapFlash > 0 && Math.floor(prop.swapFlash / 2) % 2 === 0;
    if (prop.kind === "statue") {
      this.stand(p.statue.swappable, cx, footY + 2, flash);
      return;
    }
    this.stand(p.pedestal, cx, footY + 1);
    const bob = Math.round(Math.sin(time * 2.4 + prop.id) * 2);
    this.stand(p.crystal, cx, footY - 6 + bob, flash);
    if (Math.floor(time * 2 + prop.id) % 3 === 0) this.blit(this.sprites.items.sparkle, cx + 3, footY - 20 + bob);
  }

  private drawDrop(d: Drop, o: Point, time: number): void {
    if (d.life !== null && d.life < DROP_BLINK_FRAMES && Math.floor(d.life / 4) % 2 === 0) return;
    const it = this.sprites.items;
    const s =
      d.kind === "gem"
        ? it.gem
        : d.kind === "bigGem"
          ? it.bigGem
          : d.kind === "heart"
            ? it.heart
            : d.kind === "heartContainer"
              ? it.heartContainer
              : it.sunstone[Math.floor(time * 4) % 2];
    const float = d.life === null ? 4 + Math.round(Math.sin(time * 2.5) * 2) : 0;
    this.stand(s, o.x + d.x + d.w / 2, o.y + d.y + d.h - Math.round(d.z) - float);
    if ((d.kind === "gem" || d.kind === "bigGem") && Math.floor(time * 3 + d.id) % 5 === 0) {
      this.blit(it.sparkle, o.x + d.x + d.w - 2, o.y + d.y - 6 - d.z);
    }
  }

  // Things in the air: shots, falling boulders, sparks.
  private drawOverhead(state: GameState, o: Point, time: number): void {
    const f = this.fctx;
    const it = this.sprites.items;
    for (const p of state.projectiles) {
      const s = p.kind === "seed" ? it.seed : p.kind === "thorn" ? it.thorn : it.bolt[Math.floor(time * 12) % 2];
      this.blit(s, o.x + p.x + p.w / 2 - s.w / 2, o.y + p.y + p.h / 2 - s.h / 2 - 4);
    }
    for (const h of state.hazards) {
      const progress = 1 - h.timer / h.maxTimer;
      this.shadow(o.x + h.x, o.y + h.y + 4, 6 + Math.round(progress * 14));
      if (h.timer < 22) {
        const rock = this.sprites.props.rock;
        this.blit(rock, o.x + h.x - rock.w / 2, o.y + h.y - rock.h + 6 - (h.timer / 22) * 90);
      }
    }
    for (const p of state.particles) {
      const size = p.size >= 2.2 ? 2 : 1;
      f.fillStyle = hex(p.color);
      f.fillRect(Math.round(o.x + p.x), Math.round(o.y + p.y - p.z), size, size);
    }
  }

  // Dungeons get a touch of gloom, warm pools of torchlight, and a vignette.
  private drawLighting(state: GameState, o: Point, time: number): void {
    const f = this.fctx;
    f.fillStyle = "rgba(24, 12, 52, 0.22)";
    f.fillRect(0, 0, ROOM_W, ROOM_H);
    f.save();
    f.globalCompositeOperation = "lighter";
    this.room(state.roomId).torches.forEach((torch, i) => {
      const r = 44 + Math.sin(time * 9 + i * 2) * 3 + Math.sin(time * 5.3 + i) * 2;
      const g = f.createRadialGradient(o.x + torch.x, o.y + torch.y, 2, o.x + torch.x, o.y + torch.y, r);
      g.addColorStop(0, "rgba(255, 170, 90, 0.32)");
      g.addColorStop(1, "rgba(255, 120, 60, 0)");
      f.fillStyle = g;
      f.fillRect(o.x + torch.x - r, o.y + torch.y - r, r * 2, r * 2);
    });
    f.restore();
    const v = f.createRadialGradient(ROOM_W / 2, ROOM_H / 2, ROOM_H * 0.45, ROOM_W / 2, ROOM_H / 2, ROOM_W * 0.72);
    v.addColorStop(0, "rgba(10, 4, 24, 0)");
    v.addColorStop(1, "rgba(10, 4, 24, 0.55)");
    f.fillStyle = v;
    f.fillRect(0, 0, ROOM_W, ROOM_H);
  }
}
