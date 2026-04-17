/**
 * Service wiring for the in-browser demo. No untap integration — the
 * site can't reach the user's untap.in account, and even if it could,
 * we don't want the demo writing to it.
 *
 *   storage   → window.localStorage
 *   scryfall  → direct fetch to api.scryfall.com (shared impl from app)
 *   untap     → not provided
 */
import type { Services } from "@boundless-grimoire/app";
import { directScryfall } from "@boundless-grimoire/app";
import { localStorageStorage } from "./storage";

export function createBrowserServices(): Services {
  return {
    storage: localStorageStorage,
    scryfall: directScryfall,
  };
}
