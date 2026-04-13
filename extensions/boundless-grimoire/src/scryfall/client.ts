/**
 * Scryfall public API.
 *
 * Each function here is a thin recipe: build a path/body, send via the
 * background-worker RPC, unwrap the envelope, return the typed result.
 *
 * The mechanics live elsewhere:
 *   - `wire.ts`     — message protocol
 *   - `rpc.ts`      — send + unwrap (cross-boundary + envelope decoding)
 *   - `errors.ts`   — exception types
 *   - the service worker (`src/background/`) — actual fetch + rate limiting
 *
 * AbortSignal is honored end-to-end: aborting the signal sends an abort
 * message to the worker, which cancels the in-flight fetch.
 */
import { sendScryfallRpc, unwrapEnvelope, type ScryfallRpcRequest } from "./rpc";
import type { ScryfallCard, ScryfallSearchResponse } from "./types";

export { ScryfallError, ScryfallRateLimitError } from "./errors";

interface FetchOpts {
  signal?: AbortSignal;
}

async function call<T>(req: ScryfallRpcRequest, opts: FetchOpts): Promise<T> {
  const env = await sendScryfallRpc(req, opts.signal);
  return unwrapEnvelope<T>(env);
}

const get = <T>(path: string, opts: FetchOpts = {}) =>
  call<T>({ method: "GET", path }, opts);

const post = <T>(path: string, body: unknown, opts: FetchOpts = {}) =>
  call<T>({ method: "POST", path, body }, opts);

// ---------- Search ----------

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

/** /cards/search — Scryfall full-text query. */
export function searchCards(
  query: string,
  opts: SearchOpts = {},
): Promise<ScryfallSearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (opts.page) params.set("page", String(opts.page));
  if (opts.order) params.set("order", opts.order);
  if (opts.dir) params.set("dir", opts.dir);
  if (opts.includeExtras) params.set("include_extras", "true");
  if (opts.unique) params.set("unique", opts.unique);
  return get<ScryfallSearchResponse>(`/cards/search?${params}`, opts);
}

/**
 * Fetch every printing of a given oracle card. Walks pagination so the
 * caller gets a single flat list back. Used by the print picker modal.
 */
export async function getPrintsByOracleId(
  oracleId: string,
  opts: FetchOpts = {},
): Promise<ScryfallCard[]> {
  const all: ScryfallCard[] = [];
  let page = 1;
  while (true) {
    const res = await searchCards(`oracleid:${oracleId}`, {
      page,
      unique: "prints",
      includeExtras: true,
      order: "released",
      dir: "desc",
      signal: opts.signal,
    });
    all.push(...res.data);
    if (!res.has_more) break;
    page += 1;
  }
  return all;
}

/** /cards/named — fuzzy lookup by card name. */
export function getCardByName(name: string, opts: FetchOpts = {}): Promise<ScryfallCard> {
  const params = new URLSearchParams({ fuzzy: name });
  return get<ScryfallCard>(`/cards/named?${params}`, opts);
}

type ScryfallIdentifier = { id: string } | { name: string; set: string };

/**
 * /cards/collection — fetch up to 75 cards by Scryfall ID or name+set.
 * Returns only the found cards; missing identifiers are silently dropped.
 */
export async function getCardsByIds(
  identifiers: ScryfallIdentifier[],
  opts: FetchOpts = {},
): Promise<ScryfallCard[]> {
  const results: ScryfallCard[] = [];
  for (let i = 0; i < identifiers.length; i += 75) {
    const chunk = identifiers.slice(i, i + 75);
    const res = await post<ScryfallSearchResponse>(
      "/cards/collection",
      { identifiers: chunk },
      opts,
    );
    results.push(...res.data);
  }
  return results;
}

// ---------- Catalogs ----------

export interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  digital?: boolean;
}

interface ScryfallSetList {
  object: "list";
  data: ScryfallSet[];
}

interface ScryfallCatalog {
  object: "catalog";
  total_values: number;
  data: string[];
}

/** /sets — every Magic set ever, ~700 entries. */
export async function getSets(opts: FetchOpts = {}): Promise<ScryfallSet[]> {
  const list = await get<ScryfallSetList>("/sets", opts);
  return list.data;
}

/** /catalog/<name> — string list catalogs (creature types, supertypes, etc.). */
export async function getCatalog(name: string, opts: FetchOpts = {}): Promise<string[]> {
  const cat = await get<ScryfallCatalog>(`/catalog/${name}`, opts);
  return cat.data;
}
