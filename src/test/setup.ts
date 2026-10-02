// Minimal in-memory localStorage polyfill for the test environment.
// Node has no global `localStorage`, but *Storage.ts wrappers (see
// getTheBuggy/leaderboardStorage.ts) call it directly at module scope,
// exactly like they would in a browser. Reaching for jsdom just for this
// one API felt heavier than the tests warrant, so this stands in with only
// the subset those wrappers use.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

globalThis.localStorage = new MemoryStorage();
