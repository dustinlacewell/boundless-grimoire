/**
 * Service wiring for the Chrome extension environment.
 *
 *   storage   → chrome.storage.local
 *   scryfall  → direct fetch to api.scryfall.com (CORS-permissive, no
 *               service worker needed)
 *   untap     → adapter over the postMessage bridge to untap.in's apiStore
 */
import type { Services } from "@boundless-grimoire/app";
import { directScryfall } from "@boundless-grimoire/app";
import { chromeStorage } from "./storage";
import { extensionUntapSync } from "./untapSync";

export function createExtensionServices(): Services {
  return {
    storage: chromeStorage,
    scryfall: directScryfall,
    untap: extensionUntapSync,
  };
}
