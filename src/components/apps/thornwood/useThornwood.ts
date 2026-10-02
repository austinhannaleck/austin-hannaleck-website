import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { setMuted, unlockAudio } from "./audio/context";
import { playMusic } from "./audio/music";
import { playSfx, playVictory } from "./audio/sfx";
import { continueAfterDeath, createGame, keepPlaying, togglePause, update } from "./engine/engine";
import { cycleTool, equipTool, ownedTools, settleEquipped } from "./engine/inventory";
import { musicFor } from "./engine/soundtrack";
import { snapshotSave } from "./engine/save";
import { KEPT_ITEMS, STEP_MS, noButtons, type Buttons, type GameState, type GameStatus } from "./engine/types";
import { PixelRenderer, SCREEN_H, type RenderUi } from "./render/PixelRenderer";
import { SCREEN_W, dialogChoiceRects } from "./render/screens";
import { loadBestFrames, loadMuted, loadSave, recordClearTime, saveMuted, writeSave } from "./saveStorage";
import { ITEM_SLOT_COUNT, itemSlotRect, toolInSlot, type PauseFocus } from "./ui/inventory";
import { AREA_TITLES, MAP_ARROWS, openMap, pageMap, type MapView } from "./ui/map";
import { MAP_MENU, hitTest, menuFor, menuLayout, wrapCursor, type MenuAction, type MenuItem } from "./ui/menu";

// The glue between the pure engine, the pixel renderer, the browser's
// input devices, audio, and React. The game lives in a ref and advances in
// fixed 1/60s steps from a requestAnimationFrame loop. React only hears
// about the little it needs (which menu is up, for the touch controls and
// screen readers), and only when that changes.

// Keys are matched by physical position (KeyboardEvent.code), so WASD
// stays put on non-QWERTY layouts and holding Option doesn't turn a letter
// into a symbol.
//
// The item button sits by the thumb, next to Space: Option (Mac) or Alt.
// Command would be closer still, but it isn't safe in a browser: with a
// movement key held it fires real shortcuts (Command+W closes the tab,
// Command+Left goes Back), and macOS stops reporting other keys being
// released while it's down, which leaves movement stuck. So the game
// leaves Command entirely to the browser.
const KEYS: Record<string, keyof Buttons> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  Space: "sword",
  KeyJ: "sword",
  KeyZ: "sword",
  Enter: "sword",
  NumpadEnter: "sword",
  AltLeft: "tool",
  AltRight: "tool",
  ShiftLeft: "tool",
  ShiftRight: "tool",
  KeyK: "tool",
  KeyX: "tool",
};

function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

// Dev builds only: ?items=flippers,switcheroo,sword hands you those (any of
// KEPT_ITEMS) on New Game or Continue, for trying out an item before it has
// a home in the world.
function giveDevItems(game: GameState): GameState {
  if (!import.meta.env.DEV) return game;
  const wanted = new URLSearchParams(window.location.search).get("items")?.split(",") ?? [];
  const inv = game.inventory;
  for (const item of KEPT_ITEMS) if (wanted.includes(item)) inv.owned.add(item);
  settleEquipped(inv);
  return game;
}

function anyHeld(...sources: Buttons[]): Buttons {
  const held = noButtons();
  for (const source of sources) {
    for (const key of Object.keys(held) as (keyof Buttons)[]) held[key] ||= source[key];
  }
  return held;
}

// Reads the first connected gamepad: D-pad or left stick to move, A (or
// Cross) for the sword, X/B for the Switcheroo, Start to pause, Select (or
// Back) for the map.
function readGamepad(): { buttons: Buttons; start: boolean; select: boolean } | null {
  const pad = navigator.getGamepads?.().find((p) => p?.connected);
  if (!pad) return null;
  const pressed = (i: number) => pad.buttons[i]?.pressed ?? false;
  const [ax = 0, ay = 0] = pad.axes;
  return {
    buttons: {
      up: pressed(12) || ay < -0.45,
      down: pressed(13) || ay > 0.45,
      left: pressed(14) || ax < -0.45,
      right: pressed(15) || ax > 0.45,
      sword: pressed(0),
      tool: pressed(2) || pressed(1),
    },
    start: pressed(9),
    select: pressed(8),
  };
}

export type ThornwoodView = {
  status: GameStatus;
  hasSwitcheroo: boolean;
  menu: MenuItem[] | null;
  // The title of the map on screen, if it's open.
  map: string | null;
};

export function useThornwood(canvasRef: RefObject<HTMLCanvasElement | null>, frameRef: RefObject<HTMLDivElement | null>) {
  const gameRef = useRef<GameState | null>(null);
  const keysRef = useRef<Buttons>(noButtons());
  const touchRef = useRef<Buttons>(noButtons());
  const padRef = useRef<Buttons>(noButtons());
  const padStartRef = useRef(false);
  const padSelectRef = useRef(false);
  // Presses since the last simulation step, so a quick tap between frames
  // is never lost.
  const pressedRef = useRef<Buttons>(noButtons());
  const cursorRef = useRef(0);
  // The map is a screen over the pause state, so it lives out here with
  // the menu cursor rather than in the engine.
  const mapRef = useRef<MapView | null>(null);
  // On the pause screen, whether the cursor is in the item grid or on the
  // menu along the bottom.
  const pauseFocusRef = useRef<PauseFocus>("menu");
  // Filled in from storage when the loop starts.
  const hasSaveRef = useRef(false);
  const bestRef = useRef<number | null>(null);
  const introRef = useRef<RenderUi["bossIntro"]>(null);
  const audioStartedRef = useRef(false);

  const [view, setView] = useState<ThornwoodView>({ status: "title", hasSwitcheroo: false, menu: null, map: null });
  const [muted, setMutedState] = useState(loadMuted);
  const mutedRef = useRef(muted);

  const releaseAll = useCallback(() => {
    keysRef.current = noButtons();
    touchRef.current = noButtons();
    pressedRef.current = noButtons();
  }, []);

  // Browsers only allow audio after a user gesture, so the first click or
  // keypress anywhere on the page wakes it up (and starts the title theme).
  const startAudio = useCallback(() => {
    if (audioStartedRef.current) return;
    audioStartedRef.current = true;
    unlockAudio();
    setMuted(mutedRef.current);
  }, []);

  const focusPauseScreen = useCallback((game: GameState) => {
    cursorRef.current = 0;
    pauseFocusRef.current = ownedTools(game.inventory).length > 0 ? "items" : "menu";
  }, []);

  // The map opens from play (M, Select) or from the pause menu, and closing
  // it goes back to whichever it came from.
  const showMap = useCallback(() => {
    const game = gameRef.current;
    if (!game || mapRef.current) return;
    if (game.status === "playing") {
      togglePause(game);
      mapRef.current = openMap(game, "playing");
    } else if (game.status === "paused") {
      mapRef.current = openMap(game, "paused");
    } else return;
    releaseAll();
    playSfx("mapOpen");
  }, [releaseAll]);

  const closeMap = useCallback(() => {
    const game = gameRef.current;
    const map = mapRef.current;
    if (!game || !map) return;
    mapRef.current = null;
    if (map.from === "playing" && game.status === "paused") togglePause(game);
    // Back on the pause menu, the cursor stays on "Map".
    cursorRef.current = Math.max(0, menuFor("paused", false)!.findIndex((item) => item.action === "map"));
    pauseFocusRef.current = "menu";
    releaseAll();
    playSfx("menu");
  }, [releaseAll]);

  const toggleMap = useCallback(() => {
    if (mapRef.current) closeMap();
    else showMap();
  }, [closeMap, showMap]);

  const turnMapPage = useCallback((delta: number) => {
    const game = gameRef.current;
    const map = mapRef.current;
    if (!game || !map) return;
    const next = pageMap(map, game, delta);
    if (next.area === map.area) return;
    mapRef.current = next;
    playSfx("menu");
  }, []);

  const runMenuAction = useCallback(
    (action: MenuAction) => {
      startAudio();
      playSfx("menu");
      const game = gameRef.current;
      cursorRef.current = 0;
      switch (action) {
        case "newGame":
        case "continue":
          gameRef.current = giveDevItems(createGame(newSeed(), action === "continue" ? loadSave() : null, "playing"));
          break;
        case "resume":
          if (game?.status === "paused") togglePause(game);
          break;
        case "map":
          showMap();
          return;
        case "closeMap":
          closeMap();
          return;
        case "retry":
          if (game) continueAfterDeath(game);
          break;
        case "keepPlaying":
          if (game) keepPlaying(game);
          break;
        case "quit":
          gameRef.current = createGame(newSeed(), null, "title");
          hasSaveRef.current = loadSave() !== null;
          break;
      }
      releaseAll();
    },
    [closeMap, releaseAll, showMap, startAudio],
  );

  const currentMenu = useCallback((): MenuItem[] | null => {
    const game = gameRef.current;
    if (!game) return null;
    return mapRef.current ? MAP_MENU : menuFor(game.status, hasSaveRef.current);
  }, []);

  // The pause screen: left and right pick a tool in the item grid (it's
  // equipped as soon as the cursor lands on it, like the classics), down
  // and up hop between the grid and the menu.
  const handlePauseInput = useCallback(
    (game: GameState, items: MenuItem[], pressed: Buttons) => {
      if (pauseFocusRef.current === "items") {
        if ((pressed.left || pressed.right) && cycleTool(game, pressed.left ? -1 : 1)) playSfx("menu");
        if (pressed.down) {
          pauseFocusRef.current = "menu";
          playSfx("menu");
        } else if (pressed.sword || pressed.tool) {
          runMenuAction("resume");
        }
        return;
      }
      if (pressed.up && ownedTools(game.inventory).length > 0) {
        pauseFocusRef.current = "items";
        playSfx("menu");
        return;
      }
      if (pressed.left || pressed.right) {
        cursorRef.current = wrapCursor(cursorRef.current, pressed.left ? -1 : 1, items.length);
        playSfx("menu");
      }
      if (pressed.sword || pressed.tool) runMenuAction(items[Math.min(cursorRef.current, items.length - 1)].action);
    },
    [runMenuAction],
  );

  // While a menu is up, the same buttons that play the game drive it.
  const handleMenuInput = useCallback(
    (pressed: Buttons) => {
      if (mapRef.current) {
        if (pressed.left) turnMapPage(-1);
        if (pressed.right) turnMapPage(1);
        if (pressed.sword || pressed.tool) closeMap();
        return;
      }
      const game = gameRef.current;
      const items = currentMenu();
      if (!game || !items) return;
      if (game.status === "paused") {
        handlePauseInput(game, items, pressed);
        return;
      }
      if (pressed.up || pressed.left) {
        cursorRef.current = wrapCursor(cursorRef.current, -1, items.length);
        playSfx("menu");
      }
      if (pressed.down || pressed.right) {
        cursorRef.current = wrapCursor(cursorRef.current, 1, items.length);
        playSfx("menu");
      }
      if (pressed.sword || pressed.tool) runMenuAction(items[Math.min(cursorRef.current, items.length - 1)].action);
    },
    [closeMap, currentMenu, handlePauseInput, runMenuAction, turnMapPage],
  );



  const togglePaused = useCallback(() => {
    // Pause (Esc, Start) on the map means "close it".
    if (mapRef.current) {
      closeMap();
      return;
    }
    const game = gameRef.current;
    if (!game || (game.status !== "playing" && game.status !== "paused")) return;
    togglePause(game);
    if (game.status === "paused") focusPauseScreen(game);
    playSfx("menu");
  }, [closeMap, focusPauseScreen]);

  const toggleMute = useCallback(() => {
    setMutedState((was) => {
      const next = !was;
      mutedRef.current = next;
      setMuted(next);
      saveMuted(next);
      return next;
    });
  }, []);

  const setTouchButton = useCallback((button: keyof Buttons, down: boolean) => {
    startAudio();
    if (down && !touchRef.current[button]) pressedRef.current[button] = true;
    touchRef.current = { ...touchRef.current, [button]: down };
  }, [startAudio]);

  const setTouchDirections = useCallback((dirs: Pick<Buttons, "up" | "down" | "left" | "right">) => {
    const was = touchRef.current;
    for (const dir of ["up", "down", "left", "right"] as const) {
      if (dirs[dir] && !was[dir]) pressedRef.current[dir] = true;
    }
    touchRef.current = { ...was, ...dirs };
  }, []);

  // Clicks and taps on the screen itself: menu items, dialog choices, and
  // advancing dialog.
  const pointAt = useCallback(
    (clientX: number, clientY: number) => {
      startAudio();
      const canvas = canvasRef.current;
      const game = gameRef.current;
      if (!canvas || !game) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * SCREEN_W;
      const y = ((clientY - rect.top) / rect.height) * SCREEN_H;
      if (mapRef.current) {
        const arrow = hitTest([MAP_ARROWS.prev, MAP_ARROWS.next], x, y);
        if (arrow >= 0) turnMapPage(arrow === 0 ? -1 : 1);
        else closeMap();
        return;
      }
      const items = currentMenu();
      if (game.status === "paused") {
        const rects = Array.from({ length: ITEM_SLOT_COUNT }, (_, i) => itemSlotRect(i));
        const tool = toolInSlot(hitTest(rects, x, y));
        if (tool && game.inventory.owned.has(tool)) {
          equipTool(game, tool);
          pauseFocusRef.current = "items";
          playSfx("menu");
          return;
        }
      }
      if (items) {
        const index = hitTest(menuLayout(game.status, items.length), x, y);
        if (index >= 0) runMenuAction(items[index].action);
        return;
      }
      const dialog = game.dialog;
      if (!dialog) return;
      const choiceShowing = dialog.choice && dialog.page === dialog.pages.length - 1 && dialog.shown >= dialog.pages[dialog.page].length;
      if (choiceShowing) {
        const index = hitTest(dialogChoiceRects(), x, y);
        if (index < 0) return;
        if (index !== dialog.choice!.selected) pressedRef.current.right = true;
      }
      pressedRef.current.sword = true;
    },
    [canvasRef, closeMap, currentMenu, runMenuAction, startAudio, turnMapPage],
  );

  // Sizes the canvas to the largest whole-number multiple of 256x208 that
  // fits, so every pixel stays a crisp square. On small screens, where
  // rounding down would waste a lot of space, it fills the space instead;
  // at phone pixel densities the slightly uneven pixels don't show.
  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;
    const dpr = window.devicePixelRatio || 1;
    const fullscreen = document.fullscreenElement === frame;
    const maxW = frame.clientWidth;
    const maxH = fullscreen ? window.innerHeight : Math.max(240, window.innerHeight * 0.78);
    const fit = Math.min((maxW * dpr) / SCREEN_W, (maxH * dpr) / SCREEN_H);
    const whole = Math.floor(fit);
    const scale = whole >= 3 || fit - whole < 0.2 ? Math.max(1, whole) : fit;
    canvas.style.width = `${(SCREEN_W * scale) / dpr}px`;
    canvas.style.height = `${(SCREEN_H * scale) / dpr}px`;
  }, [canvasRef, frameRef]);

  // The main loop: simulate, render, play sounds, keep React in the loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;

    gameRef.current ??= createGame(newSeed(), null, "title");
    hasSaveRef.current = loadSave() !== null;
    bestRef.current = loadBestFrames();
    const renderer = new PixelRenderer(canvas);
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(frame);
    window.addEventListener("resize", fitCanvas);
    fitCanvas();

    const handleEvents = (game: GameState, now: number) => {
      for (const event of game.events) {
        switch (event.type) {
          case "sound":
            playSfx(event.name);
            break;
          case "checkpoint":
            if (game.status === "playing") {
              writeSave(snapshotSave(game));
              hasSaveRef.current = true;
            }
            break;
          case "won":
            // The run isn't over, so the save stays (with the Sunstone in
            // it); the clear time is recorded the one time it's earned.
            writeSave(snapshotSave(game));
            hasSaveRef.current = true;
            bestRef.current = recordClearTime(game.frame);
            playVictory();
            break;
          case "bossIntro":
            introRef.current = { boss: event.boss, startedAt: now };
            break;
        }
      }
      game.events.length = 0;
    };

    const pollGamepad = () => {
      const pad = readGamepad();
      const next = pad?.buttons ?? noButtons();
      for (const key of Object.keys(next) as (keyof Buttons)[]) {
        if (next[key] && !padRef.current[key]) pressedRef.current[key] = true;
      }
      padRef.current = next;
      const start = pad?.start ?? false;
      if (start && !padStartRef.current) togglePaused();
      padStartRef.current = start;
      const select = pad?.select ?? false;
      if (select && !padSelectRef.current) toggleMap();
      padSelectRef.current = select;
    };

    let raf = 0;
    let last = performance.now();
    let pending = 0;
    let lastView = "";
    const loop = (nowMs: number) => {
      raf = requestAnimationFrame(loop);
      const now = nowMs / 1000;
      pollGamepad();
      // Clamped so a long stall (a background tab) can't trigger a flood
      // of catch-up steps.
      pending += Math.min(250, nowMs - last);
      last = nowMs;
      while (pending >= STEP_MS) {
        const game = gameRef.current!;
        const pressed = pressedRef.current;
        pressedRef.current = noButtons();
        if (game.status === "playing") update(game, { held: anyHeld(keysRef.current, touchRef.current, padRef.current), pressed });
        else handleMenuInput(pressed);
        pending -= STEP_MS;
      }

      const game = gameRef.current!;
      handleEvents(game, now);
      if (mapRef.current && game.status !== "paused") mapRef.current = null;
      const map = mapRef.current;
      const items = map ? null : menuFor(game.status, hasSaveRef.current);
      if (items) cursorRef.current = Math.min(cursorRef.current, items.length - 1);
      const intro = introRef.current && now - introRef.current.startedAt < 3.2 ? introRef.current : null;
      renderer.render(game, { menu: items ? { items, cursor: cursorRef.current } : null, bestFrames: bestRef.current, bossIntro: intro, map, pauseFocus: pauseFocusRef.current }, now);

      const track = musicFor(game) ?? (game.status === "title" ? "title" : null);
      playMusic(audioStartedRef.current ? track : null);

      const nextView: ThornwoodView = {
        status: game.status,
        hasSwitcheroo: game.inventory.owned.has("switcheroo"),
        menu: map ? MAP_MENU : items,
        map: map ? AREA_TITLES[map.area] : null,
      };
      const key = JSON.stringify(nextView);
      if (key !== lastView) {
        lastView = key;
        setView(nextView);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", fitCanvas);
      playMusic(null);
    };
  }, [canvasRef, frameRef, fitCanvas, handleMenuInput, toggleMap, togglePaused]);

  // Keyboard, plus auto-pause when the tab or window loses focus.
  useEffect(() => {
    const tagOf = (target: EventTarget | null) => (target as HTMLElement | null)?.tagName;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = tagOf(e.target);
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey) return;
      const code = e.code;
      // Space and Enter on a focused page button should press that button.
      if (tag === "BUTTON" && (code === "Space" || code === "Enter")) return;
      startAudio();
      if (code === "Escape" || code === "KeyP") {
        e.preventDefault();
        togglePaused();
        return;
      }
      if (code === "KeyM") {
        e.preventDefault();
        if (!e.repeat) toggleMap();
        return;
      }
      const button = KEYS[code];
      if (!button) return;
      e.preventDefault();
      if (!e.repeat) pressedRef.current[button] = true;
      keysRef.current[button] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const button = KEYS[e.code];
      if (!button) return;
      keysRef.current[button] = false;
      // Releasing Alt on its own would otherwise focus the browser's menu
      // bar on some platforms.
      if (e.code.startsWith("Alt")) e.preventDefault();
    };
    const pauseIfPlaying = () => {
      releaseAll();
      const game = gameRef.current;
      if (game?.status !== "playing") return;
      togglePause(game);
      focusPauseScreen(game);
    };
    const onVisibility = () => {
      if (document.hidden) pauseIfPlaying();
    };
    const onFullscreen = () => fitCanvas();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", pauseIfPlaying);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", pauseIfPlaying);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [togglePaused, toggleMap, releaseAll, startAudio, fitCanvas, focusPauseScreen]);

  return {
    view,
    muted,
    toggleMute,
    togglePaused,
    toggleMap,
    runMenuAction,
    pointAt,
    setTouchButton,
    setTouchDirections,
  };
}
