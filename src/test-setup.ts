import '@testing-library/jest-dom/vitest';

// Node's built-in (experimental) `localStorage` global shadows jsdom's real
// Storage implementation and throws on every call without a --localstorage-file
// flag. Replace it with a working in-memory Storage so tests can use
// window.localStorage directly.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

if (typeof window.localStorage.clear !== 'function') {
  Object.defineProperty(window, 'localStorage', { value: new MemoryStorage(), configurable: true });
}
