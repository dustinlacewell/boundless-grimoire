/**
 * ScryfallClient impl that fetches Scryfall directly from the page.
 *
 * Uses the same RateLimitedBucket + bucket-classifier as the extension's
 * background worker — the throttle policy is one source of truth in
 * @boundless-grimoire/app. Only the transport differs (page-context
 * `fetch` here, instead of chrome.runtime messaging).
 *
 * Scryfall serves CORS-permissive responses, so direct fetch from the
 * site origin works without a proxy. 429 responses pause the relevant
 * bucket; the existing app code handles ScryfallRateLimitError throws.
 */
import {
  ScryfallError,
  ScryfallRateLimitError,
  bucketFor,
  type FetchOpts,
  type ScryfallCard,
  type ScryfallClient,
  type ScryfallErrorResponse,
  type ScryfallIdentifier,
  type ScryfallSearchResponse,
  type ScryfallSet,
} from "@boundless-grimoire/app";

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
      // `fetch()` rejects with TypeError when Scryfall returns 429 without
      // the `Access-Control-Allow-Origin` header (their throttling edge
      // sometimes strips it). We can't read the status, but the safe
      // assumption is rate-limit — pause the bucket long enough for the
      // throttle window to pass and surface a rate-limit error so callers
      // can back off too. Abort errors pass through unchanged.
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
      throw new ScryfallError(res.status, errorBodyDetail(res.status, body));
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

function errorBodyDetail(status: number, body: unknown): ScryfallErrorResponse | string {
  if (
    body &&
    typeof body === "object" &&
    typeof (body as ScryfallErrorResponse).details === "string"
  ) {
    return body as ScryfallErrorResponse;
  }
  if (typeof body === "string" && body.length > 0) {
    return body.replace(/\s+/g, " ").trim().slice(0, 200);
  }
  return `HTTP ${status}`;
}

const get = <T>(path: string, opts: FetchOpts = {}) => call<T>({ method: "GET", path }, opts);
const post = <T>(path: string, body: unknown, opts: FetchOpts = {}) =>
  call<T>({ method: "POST", path, body }, opts);

export const browserScryfall: ScryfallClient = {
  searchCards(query, opts = {}) {
    const params = new URLSearchParams({ q: query });
    if (opts.page) params.set("page", String(opts.page));
    if (opts.order) params.set("order", opts.order);
    if (opts.dir) params.set("dir", opts.dir);
    if (opts.includeExtras) params.set("include_extras", "true");
    if (opts.unique) params.set("unique", opts.unique);
    return get<ScryfallSearchResponse>(`/cards/search?${params}`, opts);
  },

  getCardByName(name, opts = {}) {
    const params = new URLSearchParams({ fuzzy: name });
    return get<ScryfallCard>(`/cards/named?${params}`, opts);
  },

  async getCardsByIds(identifiers: ScryfallIdentifier[], opts: FetchOpts = {}) {
    const results: ScryfallCard[] = [];
    for (let i = 0; i < identifiers.length; i += 75) {
      const chunk = identifiers.slice(i, i + 75);
      const res = await post<ScryfallSearchResponse>("/cards/collection", { identifiers: chunk }, opts);
      results.push(...res.data);
    }
    return results;
  },

  async getPrintsByOracleId(oracleId, opts = {}) {
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

  async getSets(opts = {}) {
    const list = await get<ScryfallSetList>("/sets", opts);
    return list.data;
  },

  async getCatalog(name, opts = {}) {
    const cat = await get<ScryfallCatalog>(`/catalog/${name}`, opts);
    return cat.data;
  },
};
