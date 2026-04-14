/**
 * Scryfall network access used by the search, deck, and card-detail flows.
 *
 * The interface mirrors what the app actually calls. It deliberately
 * stops short of being a "complete Scryfall SDK" — methods only get
 * added when there's a real consumer.
 *
 * Two impls ship:
 *
 *   - extension: forwards to a background service worker that owns rate
 *     limiting and the actual `fetch`. Keeps Scryfall traffic centralized
 *     across browser tabs.
 *   - browser (site demo): fetches Scryfall directly from the page. Same
 *     token-bucket rate limiter as the worker, just running in-process
 *     since there's nothing else competing for the budget.
 */
import type { ScryfallCard, ScryfallSearchResponse } from "../scryfall/types";

export interface FetchOpts {
  signal?: AbortSignal;
}

export interface SearchOpts extends FetchOpts {
  /** Scryfall page number, 1-indexed. Default 1. */
  page?: number;
  /** order=… (name, cmc, power, toughness, released, etc.) */
  order?: string;
  /** dir=asc|desc|auto. */
  dir?: "asc" | "desc" | "auto";
  /** include_extras */
  includeExtras?: boolean;
  /** unique=cards|art|prints */
  unique?: "cards" | "art" | "prints";
}

export interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  digital?: boolean;
}

export type ScryfallIdentifier = { id: string } | { name: string; set?: string };

export interface ScryfallClient {
  searchCards(query: string, opts?: SearchOpts): Promise<ScryfallSearchResponse>;
  getCardByName(name: string, opts?: FetchOpts): Promise<ScryfallCard>;
  getCardsByIds(identifiers: ScryfallIdentifier[], opts?: FetchOpts): Promise<ScryfallCard[]>;
  getPrintsByOracleId(oracleId: string, opts?: FetchOpts): Promise<ScryfallCard[]>;
  getSets(opts?: FetchOpts): Promise<ScryfallSet[]>;
  getCatalog(name: string, opts?: FetchOpts): Promise<string[]>;
}

import { getServices } from "./index";

/**
 * Free-function shorthand for non-React modules — see `storage.ts` for the
 * rationale. Each function delegates to the currently-provided services.
 */
export function searchCards(query: string, opts?: SearchOpts) {
  return getServices().scryfall.searchCards(query, opts);
}

export function getCardByName(name: string, opts?: FetchOpts) {
  return getServices().scryfall.getCardByName(name, opts);
}

export function getCardsByIds(identifiers: ScryfallIdentifier[], opts?: FetchOpts) {
  return getServices().scryfall.getCardsByIds(identifiers, opts);
}

export function getPrintsByOracleId(oracleId: string, opts?: FetchOpts) {
  return getServices().scryfall.getPrintsByOracleId(oracleId, opts);
}

export function getSets(opts?: FetchOpts) {
  return getServices().scryfall.getSets(opts);
}

export function getCatalog(name: string, opts?: FetchOpts) {
  return getServices().scryfall.getCatalog(name, opts);
}

// Re-export error types so callers can `import { ScryfallError } from "@/services/scryfall"`
// without having to know the underlying transport.
export { ScryfallError, ScryfallRateLimitError } from "../scryfall/errors";
