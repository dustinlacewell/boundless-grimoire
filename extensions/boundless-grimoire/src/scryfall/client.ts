/**
 * Back-compat shim. The Scryfall API surface and its impls now live
 * in `services/scryfall` and `services/extension/scryfall`. Existing
 * call sites continue to work because we re-export the same function
 * names they always saw.
 *
 * New code should import from `services/scryfall`.
 */
export {
  searchCards,
  getCardByName,
  getCardsByIds,
  getPrintsByOracleId,
  getSets,
  getCatalog,
  ScryfallError,
  ScryfallRateLimitError,
  type FetchOpts,
  type SearchOpts,
  type ScryfallSet,
  type ScryfallIdentifier,
} from "../services/scryfall";
