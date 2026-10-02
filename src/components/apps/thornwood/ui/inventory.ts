import { TOOLS, type ToolId } from "../engine/types";
import type { Rect } from "./menu";

// The pause screen, laid out like the classics' subscreen: an ITEMS grid
// of tools (whichever one is selected rides on the item button), a GEAR
// panel of things that just work once you have them, and the menu along
// the bottom. Pure layout, shared by the renderer and the input hook.

export const ITEMS_PANEL: Rect = { x: 6, y: 36, w: 150, h: 116 };
export const GEAR_PANEL: Rect = { x: 160, y: 36, w: 90, h: 116 };
export const MENU_PANEL: Rect = { x: 6, y: 156, w: 244, h: 48 };

// Room to grow: eight slots, most of them waiting for tools that don't
// exist yet.
const GRID_COLS = 4;
const GRID_ROWS = 2;
const SLOT = 24;
const GAP = 8;
export const ITEM_SLOT_COUNT = GRID_COLS * GRID_ROWS;

export function itemSlotRect(index: number): Rect {
  const gridW = GRID_COLS * SLOT + (GRID_COLS - 1) * GAP;
  const x0 = ITEMS_PANEL.x + Math.floor((ITEMS_PANEL.w - gridW) / 2);
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  return { x: x0 + col * (SLOT + GAP), y: ITEMS_PANEL.y + 18 + row * (SLOT + GAP), w: SLOT, h: SLOT };
}

// Every tool has a fixed home in the grid (its place in TOOLS), so the
// grid never reshuffles as you find things.
export function toolInSlot(index: number): ToolId | null {
  return TOOLS[index] ?? null;
}

export function slotOfTool(tool: ToolId): number {
  return TOOLS.indexOf(tool);
}

// Which part of the pause screen the cursor is in.
export type PauseFocus = "items" | "menu";

export const TOOL_INFO: Record<ToolId, { name: string; blurb: string }> = {
  switcheroo: { name: "Switcheroo", blurb: "Its bolt swaps you with whatever it hits." },
};
