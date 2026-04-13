/**
 * Shared persistence harness for the small zustand stores that mirror a
 * single value (or single map) into chrome.storage.local.
 *
 * Replaces the four near-identical hand-rolled write-chain blocks that
 * lived in gridSizeStore, printSizeStore, pinnedCardsStore, favoritesStore.
 *
 * What it gives you:
 *
 *   - A serialized write chain so concurrent setStates can't interleave
 *     and clobber each other in chrome.storage.
 *   - A `hydrated` guard that prevents the very first hydration setState
 *     from immediately triggering a write back of the same data.
 *   - Centralized error logging — write failures (quota exceeded, etc.)
 *     are reported to the console with a tag, instead of being eaten by
 *     a silent `.catch(() => {})`. The chain is reset on error so the
 *     next write isn't permanently chained to a rejected promise.
 *
 * Usage: see `gridSizeStore.ts` for the canonical example.
 */
import type { StoreApi, UseBoundStore } from "zustand";
import { getItem, setItem } from "./chromeStorage";

interface AttachOptions<S, V> {
  /** A label used in error messages. Usually the storage key. */
  label: string;
  /** Where this slice lives in chrome.storage.local. */
  storageKey: string;
  /** Pull the persisted value out of the full store state. */
  select: (state: S) => V;
  /** Mark a freshly-loaded state as hydrated. */
  setHydrated: (loaded: V | undefined) => Partial<S>;
  /** Read the hydrated flag off the state. */
  isHydrated: (state: S) => boolean;
}

export function attachPersistence<S, V>(
  store: UseBoundStore<StoreApi<S>>,
  opts: AttachOptions<S, V>,
): { hydrate: () => Promise<void> } {
  let writeChain: Promise<void> = Promise.resolve();

  store.subscribe((state, prev) => {
    if (!opts.isHydrated(state)) return;
    const next = opts.select(state);
    if (next === opts.select(prev)) return;
    writeChain = writeChain
      .catch(() => {
        /* swallowed below — kept here so a previous failure doesn't poison
         * the chain forever */
      })
      .then(() => setItem(opts.storageKey, next))
      .catch((e) => {
        console.error(`[${opts.label}] persist failed`, e);
      });
  });

  return {
    hydrate: async () => {
      const loaded = await getItem<V>(opts.storageKey);
      store.setState(opts.setHydrated(loaded) as Partial<S>);
    },
  };
}
