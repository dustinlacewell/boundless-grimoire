/**
 * Pool fetching from Scryfall. Aggregates a small number of pages into
 * a deduplicated array of CardSnapshots. Cancellable via AbortSignal.
 */
import type { ScryfallClient } from "../services/scryfall";
import { toSnapshot } from "../scryfall/snapshot";
import type { CardSnapshot } from "../storage/types";

export interface FetchPoolOpts {
  query: string;
  signal: AbortSignal;
  /** Hard cap on pages to fetch. */
  maxPages: number;
  /** Stop once we have this many cards (after dedupe). */
  enoughCards?: number;
  onPage?: (fetched: number) => void;
}

export async function fetchPool(
  scryfall: ScryfallClient,
  opts: FetchPoolOpts,
): Promise<CardSnapshot[]> {
  const seen = new Set<string>();
  const out: CardSnapshot[] = [];
  for (let page = 1; page <= opts.maxPages; page++) {
    if (opts.signal.aborted) throw new DOMException("Aborted", "AbortError");
    let res;
    try {
      res = await scryfall.searchCards(opts.query, {
        page,
        order: "random",
        unique: "cards",
        signal: opts.signal,
      });
    } catch (e) {
      // 404 = no cards match. Treat as empty pool.
      const msg = (e as Error)?.message ?? "";
      if (/not[- ]?found/i.test(msg) || /404/.test(msg)) break;
      throw e;
    }
    for (const card of res.data) {
      const key = card.oracle_id ?? card.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(toSnapshot(card));
    }
    opts.onPage?.(out.length);
    if (opts.enoughCards && out.length >= opts.enoughCards) break;
    if (!res.has_more) break;
  }
  return out;
}
