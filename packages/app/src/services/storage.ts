/**
 * Key-value persistence used by every store in the app.
 *
 * Both backends we ship (chrome.storage.local in the extension,
 * window.localStorage in the site demo) are key/value with similar
 * semantics. The interface is intentionally narrow — adding methods
 * here means every impl has to grow.
 *
 * Async on every method so the same call sites work for chrome.storage
 * (truly async) and localStorage (wrapped in `Promise.resolve`).
 */
export interface Storage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

import { getServices } from "./index";

/**
 * Free-function shorthand for non-React modules. React components should
 * prefer `useServices().storage` so the dependency is visible in the JSX
 * tree, but utility code that runs outside a component (store hydrators,
 * persistence subscribers) goes through these.
 */
export const storage = {
  get<T>(key: string): Promise<T | undefined> {
    return getServices().storage.get<T>(key);
  },
  set<T>(key: string, value: T): Promise<void> {
    return getServices().storage.set<T>(key, value);
  },
  remove(key: string): Promise<void> {
    return getServices().storage.remove(key);
  },
};
