import { DUNGEONS, TOOLS, type Dungeon, type DungeonKeys, type GameState, type Inventory, type ToolId } from "./types";

// No keys for any dungeon, as at the start of a game.
export function noKeys(): Record<Dungeon, DungeonKeys> {
  const keys = {} as Record<Dungeon, DungeonKeys>;
  for (const dungeon of DUNGEONS) keys[dungeon] = { small: 0, big: false };
  return keys;
}

// Which tools you own, and which one is on the item button. The pause
// screen's item grid is built on these.

export function ownedTools(inv: Inventory): ToolId[] {
  return TOOLS.filter((tool) => inv.owned.has(tool));
}

export function equipTool(state: GameState, tool: ToolId): boolean {
  if (!state.inventory.owned.has(tool)) return false;
  state.inventory.equipped = tool;
  return true;
}

// Steps through owned tools in item-grid order, wrapping around. Returns
// whether the equipped tool changed.
export function cycleTool(state: GameState, delta: number): boolean {
  const owned = ownedTools(state.inventory);
  if (owned.length === 0) return false;
  const current = state.inventory.equipped;
  const i = current ? owned.indexOf(current) : -1;
  const next = owned[(i + delta + owned.length) % owned.length];
  if (next === current) return false;
  state.inventory.equipped = next;
  return true;
}

// A tool you just picked up goes straight on the button if it's empty.
// Also tidies an equipped tool you don't actually own (an old save).
export function settleEquipped(inv: Inventory): void {
  if (inv.equipped && !inv.owned.has(inv.equipped)) inv.equipped = null;
  inv.equipped ??= ownedTools(inv)[0] ?? null;
}
