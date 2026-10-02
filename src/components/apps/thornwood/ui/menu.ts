import type { GameStatus } from "../engine/types";

// The menus drawn inside the game screen (title, pause, game over,
// ending). Pure data and layout, shared by the renderer (to draw them) and
// the input hook (to move the cursor and hit-test clicks and taps), so the
// two can never disagree about where a button is.

export type MenuAction = "continue" | "newGame" | "resume" | "map" | "closeMap" | "quit" | "retry" | "keepPlaying";
export type MenuItem = { label: string; action: MenuAction };
export type Rect = { x: number; y: number; w: number; h: number };

export function menuFor(status: GameStatus, hasSave: boolean): MenuItem[] | null {
  switch (status) {
    case "title":
      return hasSave
        ? [
            { label: "Continue", action: "continue" },
            { label: "New Game", action: "newGame" },
          ]
        : [{ label: "New Game", action: "newGame" }];
    case "paused":
      return [
        { label: "Resume", action: "resume" },
        { label: "Map", action: "map" },
        { label: "Quit to Title", action: "quit" },
      ];
    case "gameover":
      return [
        { label: "Get Back Up", action: "retry" },
        { label: "Quit to Title", action: "quit" },
      ];
    case "won":
      return [
        { label: "Keep Exploring", action: "keepPlaying" },
        { label: "Title Screen", action: "quit" },
      ];
    case "playing":
      return null;
  }
}

// While the map is up it's the whole screen; this only exists so screen
// readers (and anything else that lists the menu) can close it.
export const MAP_MENU: MenuItem[] = [{ label: "Close Map", action: "closeMap" }];

// Positions on the 256x208 native screen.
const MENU_TOP: Record<Exclude<GameStatus, "playing" | "paused">, number> = {
  title: 134,
  gameover: 140,
  won: 176,
};

export function menuLayout(status: GameStatus, count: number): Rect[] {
  if (status === "playing") return [];
  // The pause screen's menu runs across the bottom, under the inventory.
  if (status === "paused") return Array.from({ length: count }, (_, i) => ({ x: 10 + i * 80, y: 163, w: 76, h: 13 }));
  const top = MENU_TOP[status];
  return Array.from({ length: count }, (_, i) => ({ x: 76, y: top + i * 15, w: 104, h: 13 }));
}

export function hitTest(rects: Rect[], x: number, y: number): number {
  return rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

export function wrapCursor(cursor: number, delta: number, count: number): number {
  return (cursor + delta + count) % count;
}
