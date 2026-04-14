/**
 * ScryfallClient impl that forwards each call to the extension's
 * background service worker via chrome.runtime messaging.
 *
 * The worker owns rate limiting (token-bucket queue) and the actual
 * fetch — see `src/background/`. This file is the content-script-side
 * facade that satisfies the `ScryfallClient` interface.
 */
import { sendScryfallRpc, unwrapEnvelope, type ScryfallRpcRequest } from "../../scryfall/rpc";
import type {
  FetchOpts,
  ScryfallCard,
  ScryfallClient,
  ScryfallIdentifier,
  ScryfallSearchResponse,
  ScryfallSet,
} from "@boundless-grimoire/app";

interface ScryfallSetList {
  object: "list";
  data: ScryfallSet[];
}

interface ScryfallCatalog {
  object: "catalog";
  total_values: number;
  data: string[];
}

async function call<T>(req: ScryfallRpcRequest, opts: FetchOpts): Promise<T> {
  const env = await sendScryfallRpc(req, opts.signal);
  return unwrapEnvelope<T>(env);
}

const get = <T>(path: string, opts: FetchOpts = {}) => call<T>({ method: "GET", path }, opts);
const post = <T>(path: string, body: unknown, opts: FetchOpts = {}) =>
  call<T>({ method: "POST", path, body }, opts);

export const backgroundScryfall: ScryfallClient = {
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
