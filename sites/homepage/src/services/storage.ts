import type { Storage } from "@boundless-grimoire/app";

/**
 * `localStorage`-backed Storage. Wrapped in `Promise.resolve` so callers
 * get the same async signature they'd get against `chrome.storage` in
 * the extension.
 *
 * Quota is per-origin, ~5 MB in most browsers — comfortably enough for
 * the demo's deck library. Writes that would exceed the quota throw
 * QuotaExceededError, which we let bubble up so the deck-store's existing
 * "persist failed" handler can log it.
 */
export const localStorageStorage: Storage = {
  get<T>(key: string): Promise<T | undefined> {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return Promise.resolve(undefined);
    try {
      return Promise.resolve(JSON.parse(raw) as T);
    } catch {
      // Corrupt entry — treat as missing so a fresh write can replace it.
      return Promise.resolve(undefined);
    }
  },

  set<T>(key: string, value: T): Promise<void> {
    window.localStorage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  },

  remove(key: string): Promise<void> {
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};
