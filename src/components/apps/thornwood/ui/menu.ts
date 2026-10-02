import type { GameStatus } from "../engine/types";

// The menus drawn inside the game screen (title, pause, game over,
// ending). Pure data and layout, shared by the renderer (to draw them) and
// the input hook (to move the cursor and hit-test clicks and taps), so the
// two can never disagree about where a button is.

export type MenuAction = "continue" | "newGame" | "resume" | "quit" | "retry" | "keepPlaying";
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

// Positions on the 256x208 native screen.
const MENU_TOP: Record<Exclude<GameStatus, "playing">, number> = {
  title: 134,
  paused: 156,
  gameover: 140,
  won: 176,
};

export function menuLayout(status: GameStatus, count: number): Rect[] {
  if (status === "playing") return [];
  const top = MENU_TOP[status];
  return Array.from({ length: count }, (_, i) => ({ x: 76, y: top + i * 15, w: 104, h: 13 }));
}

export function hitTest(rects: Rect[], x: number, y: number): number {
  return rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

export function wrapCursor(cursor: number, delta: number, count: number): number {
  return (cursor + delta + count) % count;
}
