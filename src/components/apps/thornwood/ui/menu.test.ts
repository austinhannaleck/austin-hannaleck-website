import { describe, expect, it } from "vitest";
import { hitTest, menuFor, menuLayout, wrapCursor } from "./menu";

describe("in-game menus", () => {
  it("only offers Continue on the title screen when there's a save", () => {
    expect(menuFor("title", false)?.map((i) => i.action)).toEqual(["newGame"]);
    expect(menuFor("title", true)?.map((i) => i.action)).toEqual(["continue", "newGame"]);
    expect(menuFor("playing", true)).toBeNull();
  });

  it("lets you keep exploring after the Sunstone is home", () => {
    expect(menuFor("won", true)?.map((i) => i.action)).toEqual(["keepPlaying", "quit"]);
  });

  it("offers the map from the pause menu", () => {
    expect(menuFor("paused", true)?.map((i) => i.action)).toEqual(["resume", "map", "quit"]);
  });

  it("runs the pause menu in a row along the bottom of the screen", () => {
    const rects = menuLayout("paused", 3);
    expect(rects).toHaveLength(3);
    expect(new Set(rects.map((r) => r.y)).size).toBe(1);
    for (let i = 1; i < rects.length; i++) expect(rects[i].x).toBeGreaterThanOrEqual(rects[i - 1].x + rects[i - 1].w);
    expect(rects[2].x + rects[2].w).toBeLessThanOrEqual(256);
  });

  it("lays items out in a column that clicks and taps can hit", () => {
    const rects = menuLayout("gameover", 2);
    expect(rects).toHaveLength(2);
    expect(rects[1].y).toBeGreaterThanOrEqual(rects[0].y + rects[0].h);
    expect(hitTest(rects, rects[1].x + 2, rects[1].y + 2)).toBe(1);
    expect(hitTest(rects, 0, 0)).toBe(-1);
  });

  it("wraps the cursor around both ends", () => {
    expect(wrapCursor(0, -1, 2)).toBe(1);
    expect(wrapCursor(1, 1, 2)).toBe(0);
  });
});
