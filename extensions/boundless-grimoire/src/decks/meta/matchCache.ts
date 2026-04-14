/**
 * Per-fragment match cache — the atom of meta-grouping knowledge.
 *
 * For each Scryfall query fragment string, remembers which oracle_ids
 * we've confirmed match and which we've confirmed don't. An oracle_id
 * missing from both sets means we haven't asked yet.
 *
 * Cache is keyed by fragment text (not query name or list index) so
 * reordering or renaming the user's custom queries doesn't invalidate
 * anything — only edits to a fragment trigger new network work, and
 * even then the old fragment's data stays around in case they edit
 * back. Unreferenced fragments are pruned by `pruneToFragments`.
 */

export interface FragmentKnowledge {
  positives: Set<string>;
  negatives: Set<string>;
}

/** fragment text → what we know about it. */
export type MatchCache = Map<string, FragmentKnowledge>;

export function createCache(): MatchCache {
  return new Map();
}

function getOrInit(cache: MatchCache, fragment: string): FragmentKnowledge {
  let entry = cache.get(fragment);
  if (!entry) {
    entry = { positives: new Set(), negatives: new Set() };
    cache.set(fragment, entry);
  }
  return entry;
}

/** Read-only probe: what do we know about this (fragment, oracle_id)? */
export type Verdict = "positive" | "negative" | "unknown";

export function verdict(
  cache: MatchCache,
  fragment: string,
  oracleId: string,
): Verdict {
  const entry = cache.get(fragment);
  if (!entry) return "unknown";
  if (entry.positives.has(oracleId)) return "positive";
  if (entry.negatives.has(oracleId)) return "negative";
  return "unknown";
}

/**
 * Record a fetch result. Everything in `queried` that wasn't in
 * `matches` is confirmed negative for this fragment.
 */
export function recordMatches(
  cache: MatchCache,
  fragment: string,
  queried: readonly string[],
  matches: readonly string[],
): void {
  const entry = getOrInit(cache, fragment);
  const matchSet = new Set(matches);
  for (const oid of queried) {
    if (matchSet.has(oid)) entry.positives.add(oid);
    else entry.negatives.add(oid);
  }
}

/** Drop fragments no longer referenced by any active query. */
export function pruneToFragments(
  cache: MatchCache,
  liveFragments: readonly string[],
): void {
  const live = new Set(liveFragments);
  for (const fragment of [...cache.keys()]) {
    if (!live.has(fragment)) cache.delete(fragment);
  }
}

/**
 * Evict oracle_ids that no deck references anymore. Keeps the cache
 * from growing unboundedly as the user plays with decks. Cache entries
 * are cheap to re-fetch — a single small Scryfall query — so dropping
 * them when the card leaves every deck is a sound memory trade-off.
 */
export function pruneToOracleIds(
  cache: MatchCache,
  liveOracleIds: ReadonlySet<string>,
): void {
  for (const entry of cache.values()) {
    for (const oid of [...entry.positives]) {
      if (!liveOracleIds.has(oid)) entry.positives.delete(oid);
    }
    for (const oid of [...entry.negatives]) {
      if (!liveOracleIds.has(oid)) entry.negatives.delete(oid);
    }
  }
}
