/**
 * Service wiring for the in-browser demo. No untap integration — the
 * site can't reach the user's untap.in account, and even if it could,
 * we don't want the demo writing to it.
 *
 *   storage   → window.localStorage
 *   scryfall  → direct fetch to api.scryfall.com (CORS-permissive)
 *   untap     → not provided. Components that depend on it
 *               (`useUntapSync()` returning undefined) just don't render.
 */
import type { Services } from "@boundless-grimoire/app";
import { localStorageStorage } from "./storage";
import { browserScryfall } from "./scryfall";

export function createBrowserServices(): Services {
  return {
    storage: localStorageStorage,
    scryfall: browserScryfall,
    // No `untap` — see the UntapSync interface docs for the contract.
  };
}
