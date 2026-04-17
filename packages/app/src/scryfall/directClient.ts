/**
 * ScryfallClient that fetches api.scryfall.com directly from the page.
 *
 * Scryfall serves CORS-permissive responses (`Access-Control-Allow-Origin: *`),
 * so direct fetch works from any origin — no proxy, no service worker, no
 * host_permissions needed.
 *
 * Rate limiting uses the shared `bucketFor` classifier and the same
 * `RateLimitedBucket` instances that the extension's background worker
 * previously used. The throttle policy is unchanged; only the transport
 * moved from worker-context fetch to page-context fetch.
 *
 * Both the Chrome extension and the site demo consume this. There is no
 * longer a separate impl per host.
 */
import type { FetchOpts, SearchOpts, ScryfallClient, ScryfallIdentifier, ScryfallSet } from "../services/scryfall";
import type { ScryfallCard, ScryfallSearchResponse } from "./types";
import { ScryfallError, ScryfallRateLimitError } from "./errors";
import { bucketFor } from "./buckets";

const API_BASE = "https://api.scryfall.com";

interface ScryfallSetList {
  object: "list";
  data: ScryfallSet[];
}

interface ScryfallCatalog {
  object: "catalog";
  total_values: number;
  data: string[];
}

interface RawRequest {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}

async function call<T>(req: RawRequest, opts: FetchOpts): Promise<T> {
  const bucket = bucketFor(req.path);
  return bucket.enqueue(async () => {
    const init: RequestInit = {
      method: req.method,
      signal: opts.signal,
      headers:
        req.method === "POST"
          ? { "Content-Type": "application/json", Accept: "application/json" }
          : { Accept: "application/json" },
    };
    if (req.method === "POST") init.body = JSON.stringify(req.body);

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${req.path}`, init);
    } catch (err) {
      // Scryfall's throttling edge sometimes strips CORS headers on 429,
      // causing fetch to reject with TypeError. Assume rate-limit, pause
      // the bucket, and surface a rate-limit error. Abort errors pass through.
      if ((err as Error)?.name === "AbortError") throw err;
      bucket.pauseFor(30_000);
      throw new ScryfallRateLimitError(30);
    }

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "30", 10);
      bucket.pauseFor(Math.max(retryAfter * 1000, 30_000));
      throw new ScryfallRateLimitError(retryAfter);
    }

    const body = await parseBody(res);
    if (!res.ok) {
      throw new ScryfallError(res.status, errorDetail(res.status, body));
    }
    return body as T;
  });
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorDetail(
  status: number,
  body: unknown,
): import("./types").ScryfallErrorResponse | string {
  if (
    body &&
    typeof body === "object" &&
    typeof (body as { details?: unknown }).details === "string"
  ) {
    return body as import("./types").ScryfallErrorResponse;
  }
  if (typeof body === "string" && body.length > 0) {
    return body.replace(/\s+/g, " ").trim().slice(0, 200);
  }
  return `HTTP ${status}`;
}

const get = <T>(path: string, opts: FetchOpts = {}) =>
  call<T>({ method: "GET", path }, opts);
const post = <T>(path: string, body: unknown, opts: FetchOpts = {}) =>
  call<T>({ method: "POST", path, body }, opts);

export const directScryfall: ScryfallClient = {
  searchCards(query: string, opts: SearchOpts = {}) {
    const params = new URLSearchParams({ q: query });
    if (opts.page) params.set("page", String(opts.page));
    if (opts.order) params.set("order", opts.order);
    if (opts.dir) params.set("dir", opts.dir);
    if (opts.includeExtras) params.set("include_extras", "true");
    if (opts.unique) params.set("unique", opts.unique);
    return get<ScryfallSearchResponse>(`/cards/search?${params}`, opts);
  },

  getCardByName(name: string, opts: FetchOpts = {}) {
    const params = new URLSearchParams({ fuzzy: name });
    return get<ScryfallCard>(`/cards/named?${params}`, opts);
  },

  async getCardsByIds(identifiers: ScryfallIdentifier[], opts: FetchOpts = {}) {
    const results: ScryfallCard[] = [];
    for (let i = 0; i < identifiers.length; i += 75) {
      const chunk = identifiers.slice(i, i + 75);
      const res = await post<ScryfallSearchResponse>(
        "/cards/collection",
        { identifiers: chunk },
        opts,
      );
      results.push(...res.data);
      if (res.not_found?.length) {
        console.warn("[scryfall] cards/collection not_found:", res.not_found);
      }
    }
    return results;
  },

  async getPrintsByOracleId(oracleId: string, opts: FetchOpts = {}) {
    const all: ScryfallCard[] = [];
    let page = 1;
    while (true) {
      const res = await this.searchCards(`oracleid:${oracleId}`, {
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
  },

  async getSets(opts: FetchOpts = {}) {
    const list = await get<ScryfallSetList>("/sets", opts);
    return list.data;
  },

  async getCatalog(name: string, opts: FetchOpts = {}) {
    const cat = await get<ScryfallCatalog>(`/catalog/${name}`, opts);
    return cat.data;
  },
};
