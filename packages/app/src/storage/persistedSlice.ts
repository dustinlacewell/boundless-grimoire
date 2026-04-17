/**
 * Shared persistence harness for zustand stores that mirror a single
 * value (or single map) into chrome.storage.local.
 *
 * Serializes writes so concurrent setStates can't clobber. A failed
 * write logs and resets the chain so one bad write doesn't poison
 * persistence for the session.
 */
import type { StoreApi, UseBoundStore } from "zustand";
import { storage } from "../services/storage";

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

  const doWrite = (value: V): Promise<void> =>
    storage.set(opts.storageKey, value).catch((e) => {
      console.error(`[${opts.label}] persist failed`, e);
    });

  store.subscribe((state, prev) => {
    if (!opts.isHydrated(state)) return;
    const next = opts.select(state);
    if (next === opts.select(prev)) return;
    // Chain through both fulfilled AND rejected so a failure never
    // kills the chain — the store keeps writing for the rest of the
    // session.
    writeChain = writeChain.then(
      () => doWrite(next),
      () => doWrite(next),
    );
  });

  return {
    hydrate: async () => {
      const loaded = await storage.get<V>(opts.storageKey);
      store.setState(opts.setHydrated(loaded) as Partial<S>);
    },
  };
}
