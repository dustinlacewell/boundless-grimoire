/**
 * Public API of @boundless-grimoire/app.
 *
 * Both the Chrome extension and the marketing site's /demo route consume
 * this package. The extension wires services for that environment
 * (chrome.storage, background-worker RPC, untap.in bridge); the site
 * wires browser-native impls (localStorage, direct Scryfall fetch, no
 * untap). The app code in between is identical.
 *
 * If a symbol isn't re-exported here, it's intentionally private to
 * the package.
 */

// --- Versioning -----------------------------------------------------------

export { APP_VERSION } from "./version";

// --- Mounted root ---------------------------------------------------------
//
// `App` is the whole experience: a fixed-positioned trigger button in the
// top-left, a toggleable full-screen overlay with the deck-builder, and
// the global modals that portal into `#boundless-grimoire-root`. Both
// hosts (extension and homepage island) mount this same component — the
// overlay always sits over whatever the host page is showing underneath.

export { App } from "./content/App";

// --- Services ------------------------------------------------------------

export {
  ServicesProvider,
  provideServices,
  getServices,
  useServices,
  useUntapSync,
} from "./services";
export type { Services } from "./services";
export type { Storage } from "./services/storage";
export type {
  ScryfallClient,
  FetchOpts,
  SearchOpts,
  ScryfallSet,
  ScryfallIdentifier,
} from "./services/scryfall";
export type { UntapSync } from "./services/untapSync";

// Scryfall free-function helpers + error types. Use these in non-React
// code (utility helpers, store hydrators) — they delegate to the bound
// services. React components should prefer `useServices().scryfall`.
export {
  searchCards,
  getCardByName,
  getCardsByIds,
  getPrintsByOracleId,
  getSets,
  getCatalog,
  ScryfallError,
  ScryfallRateLimitError,
} from "./services/scryfall";

// Storage shorthand for non-React code, same rationale as above.
export { storage } from "./services/storage";

// --- Store hydrators (called once at boot) -------------------------------

export {
  hydrateDeckStore,
  importDecklist,
  selectDeck,
  setDeckCommander,
  setDeckFormat,
  setLibraryView,
  useDeckStore,
} from "./storage/deckStore";
export { hydrateMetaGroupsStore } from "./decks/metaGroupsStore";
export { hydrateFavoritesStore } from "./search/favoritesStore";
export { hydrateGridSizeStore } from "./search/gridSizeStore";
export { hydrateDeckGridSizeStore } from "./decks/deckGridSizeStore";
export { hydratePinnedCardsStore } from "./search/pinnedCardsStore";
export { hydratePrintSizeStore } from "./cards/printSizeStore";
export { hydrateCustomFormatStore } from "./filters/customFormatStore";
export { hydrateCustomQueryStore } from "./filters/customQueryStore";
export { hydratePresetStore } from "./filters/presetStore";
export { hydrateSettingsStore } from "./settings/settingsStore";
export { hydrateLegalityStore } from "./decks/legalityStore";
export {
  useSyncStatusStore,
  setSyncStatus,
  clearSyncStatus,
} from "./sync/syncStatusStore";
export type { SyncStatus, SyncStatusInfo } from "./sync/syncStatusStore";
export { pushToast, dismissToast, dismissByKey, ToastFrame } from "./notifications";

// --- Domain types --------------------------------------------------------

export type {
  Deck,
  DeckLibrary,
  DeckCard,
  CardSnapshot,
} from "./storage/types";
export {
  DEFAULT_FILTER_STATE,
  DEFAULT_SORT_DIR,
  DEFAULT_SORT_FIELD,
} from "./storage/types";

// Decklist text serialization (used by the manual export flow + untap push).
export { deckToText, sideboardToText } from "./decks/deckText";

// Decklist parsing — accepts the common "4 Lightning Bolt" / "4x Card Name"
// formats used by Archidekt, Moxfield, MTGO, etc.
export { parseDecklist, type DecklistEntry } from "./decks/parseDecklist";

export type {
  ScryfallCard,
  ScryfallSearchResponse,
  ScryfallErrorResponse,
} from "./scryfall/types";

export { toSnapshot } from "./scryfall/snapshot";

// Rate-limit primitives. Both the extension's background worker and the
// site demo's direct-fetch ScryfallClient share these — a single source
// of truth for the Scryfall throttle policy.
export { RateLimitedBucket } from "./scryfall/rateLimiter";
export { bucketFor, searchBucket, defaultBucket } from "./scryfall/buckets";
