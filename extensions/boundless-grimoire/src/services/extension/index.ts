/**
 * Service wiring for the Chrome extension environment.
 *
 *   storage   → chrome.storage.local
 *   scryfall  → background-worker RPC (rate-limited, shared across tabs)
 *   untap     → adapter over the postMessage bridge to untap.in's apiStore
 */
import type { Services } from "@boundless-grimoire/app";
import { chromeStorage } from "./storage";
import { backgroundScryfall } from "./scryfall";
import { extensionUntapSync } from "./untapSync";

export function createExtensionServices(): Services {
  return {
    storage: chromeStorage,
    scryfall: backgroundScryfall,
    untap: extensionUntapSync,
  };
}
