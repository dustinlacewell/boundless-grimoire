/**
 * The two Scryfall rate-limit buckets, plus the path classifier that picks
 * which one a request belongs in.
 *
 * Scryfall's documented limits:
 *   - /cards/{search,named,random,collection}  →  2/sec  (500ms gap)
 *   - everything else under api.scryfall.com   → 10/sec  (100ms gap)
 *
 * The two buckets run independently — a request waiting on the search
 * bucket never blocks one going through the default bucket. Worst-case
 * sustained load is 12 req/sec total, which is exactly Scryfall's ceiling.
 *
 * These instances are module-level singletons. Because they live in the
 * one service worker for the extension, every Scryfall call from every
 * surface (content scripts, popup, future MAIN-world bridges) shares the
 * same throttle — there is no way to accidentally double the rate by
 * opening a second tab.
 */
import { RateLimitedBucket } from "./queue";

const SEARCH_PATHS = [
  "/cards/search",
  "/cards/named",
  "/cards/random",
  "/cards/collection",
];

export const searchBucket = new RateLimitedBucket(500, "search");
export const defaultBucket = new RateLimitedBucket(100, "default");

export function bucketFor(path: string): RateLimitedBucket {
  if (SEARCH_PATHS.some((p) => path.startsWith(p))) return searchBucket;
  return defaultBucket;
}
