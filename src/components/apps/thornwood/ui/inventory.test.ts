import { describe, expect, it } from "vitest";
import { TOOLS } from "../engine/types";
import { wrapText } from "../render/font";
import { menuLayout } from "./menu";
import { GEAR_PANEL, ITEMS_PANEL, ITEM_SLOT_COUNT, MENU_PANEL, TOOL_INFO, itemSlotRect, slotOfTool, toolInSlot } from "./inventory";
import type { Rect } from "./menu";

function inside(inner: Rect, outer: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

describe("the pause screen", () => {
  it("fits its three panels on screen without overlapping", () => {
    const screen = { x: 0, y: 0, w: 256, h: 208 };
    for (const p of [ITEMS_PANEL, GEAR_PANEL, MENU_PANEL]) expect(inside(p, screen)).toBe(true);
    expect(overlap(ITEMS_PANEL, GEAR_PANEL)).toBe(false);
    expect(overlap(ITEMS_PANEL, MENU_PANEL)).toBe(false);
    expect(overlap(GEAR_PANEL, MENU_PANEL)).toBe(false);
    for (const r of menuLayout("paused", 3)) expect(inside(r, MENU_PANEL)).toBe(true);
  });

  it("has a grid slot for every tool, with room to spare", () => {
    expect(ITEM_SLOT_COUNT).toBeGreaterThan(TOOLS.length);
    const slots = Array.from({ length: ITEM_SLOT_COUNT }, (_, i) => itemSlotRect(i));
    for (const [i, r] of slots.entries()) {
      expect(inside(r, ITEMS_PANEL)).toBe(true);
      for (const other of slots.slice(i + 1)) expect(overlap(r, other)).toBe(false);
    }
    for (const tool of TOOLS) {
      expect(toolInSlot(slotOfTool(tool))).toBe(tool);
      expect(TOOL_INFO[tool].name).not.toBe("");
    }
    expect(toolInSlot(ITEM_SLOT_COUNT - 1)).toBeNull();
  });
});

describe("tool descriptions", () => {
  it.each(TOOLS)("%s's blurb fits in two lines of the items panel", (tool) => {
    expect(wrapText(TOOL_INFO[tool].blurb, ITEMS_PANEL.w - 16).length).toBeLessThanOrEqual(2);
  });
});
