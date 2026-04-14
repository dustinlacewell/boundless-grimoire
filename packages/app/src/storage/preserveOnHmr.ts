/**
 * Preserve a Zustand store's state across Vite HMR module replacements.
 *
 * Without this, every code edit to a module that imports a store causes
 * the new module instance to start with the store's initial state
 * (`hydrated: false`, empty data). Hydration only fires once at boot,
 * so the user's data appears blank until the page is hard-reloaded.
 *
 * `import.meta.hot.data` is per-module, so each store stashes its own
 * state in its own module's hot-data bucket — no key collisions.
 *
 * No-op outside dev.
 *
 * Usage (in the store module, after `useFooStore` is created):
 *
 *   preserveOnHmr(useFooStore, import.meta.hot);
 */
import type { StoreApi } from "zustand";

interface ViteHot {
  data: Record<string, unknown>;
  dispose: (cb: (data: Record<string, unknown>) => void) => void;
}

const STATE_KEY = "preservedState";

export function preserveOnHmr<T>(store: StoreApi<T>, hot: ViteHot | undefined): void {
  if (!hot) return;
  const stashed = hot.data[STATE_KEY] as T | undefined;
  if (stashed) store.setState(stashed);
  hot.dispose((data) => {
    data[STATE_KEY] = store.getState();
  });
}
