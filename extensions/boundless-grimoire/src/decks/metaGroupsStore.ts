/**
 * Meta-groups orchestrator.
 *
 * Turns the user's custom queries (from `customQueryStore`) into a
 * first-match-wins `oracle_id → queryId` mapping for the Meta deck
 * layout. The heavy lifting is in `./meta/`:
 *
 *   - matchCache.ts  — the per-fragment {positives, negatives} store.
 *   - classify.ts    — pure function turning (cache, queries, oracle_ids)
 *                      into assignments + blocking-fragment lists.
 *   - fetchMatches.ts — Scryfall batch query helper.
 *
 * Everything in this file is side-effect glue: it reads live state,
 * decides which gaps need filling, kicks off parallel fetches, and
 * bumps a version counter so React memos can depend on "cache state."
 *
 * Invalidation strategy:
 *   - Caching by fragment text means renaming/reordering queries is
 *     free (no network, no recompute).
 *   - Editing a fragment makes a new cache entry; the old one becomes
 *     unreferenced and gets pruned on the next ensureMetaGroups call.
 *   - Adding a card: only newly-seen oracle_ids are fetched.
 *   - Removing a card: nothing — stale entries are harmless and the
 *     card may come back.
 */
import { create } from "zustand";
import { useCustomQueryStore, type CustomQuery } from "../filters/customQueryStore";
import { getItem, setItem } from "../storage/chromeStorage";
import { useDeckStore } from "../storage/deckStore";
import type { DeckCard, DeckLibrary } from "../storage/types";
import { classify, type MetaQuery } from "./meta/classify";
import { fetchMatches } from "./meta/fetchMatches";
import {
  createCache,
  pruneToFragments,
  pruneToOracleIds,
  recordMatches,
  type MatchCache,
} from "./meta/matchCache";

export { META_OTHER } from "./meta/classify";
export type { MetaQuery } from "./meta/classify";

interface State {
  cache: MatchCache;
  /**
   * Monotonically increments on every cache mutation so React
   * consumers can use it as a useMemo dep without having to diff
   * the Map itself.
   */
  version: number;
  /** Decks currently being (re)populated, so we don't double-fetch. */
  loadingByDeck: Record<string, boolean>;
}

export const useMetaGroupsStore = create<State>(() => ({
  cache: createCache(),
  version: 0,
  loadingByDeck: {},
}));

// ---------- Persistence ----------
//
// The cache is MatchCache = Map<fragment, { positives: Set, negatives: Set }>,
// which doesn't serialize directly. We convert to/from a plain object of
// arrays for chrome.storage.local round-trips. Writes are debounced so a
// burst of fetches during a single ensureMetaGroups run makes one write.

const STORAGE_KEY = "boundless-grimoire:meta-match-cache";
const PERSIST_DEBOUNCE_MS = 600;

type SerializedCache = Record<string, { positives: string[]; negatives: string[] }>;

function serializeCache(cache: MatchCache): SerializedCache {
  const out: SerializedCache = {};
  for (const [fragment, { positives, negatives }] of cache) {
    out[fragment] = { positives: [...positives], negatives: [...negatives] };
  }
  return out;
}

function deserializeCache(raw: SerializedCache): MatchCache {
  const cache = createCache();
  for (const [fragment, { positives, negatives }] of Object.entries(raw)) {
    cache.set(fragment, {
      positives: new Set(positives),
      negatives: new Set(negatives),
    });
  }
  return cache;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let writeChain: Promise<void> = Promise.resolve();

function schedulePersist(): void {
  if (persistTimer !== null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const snapshot = serializeCache(useMetaGroupsStore.getState().cache);
    writeChain = writeChain
      .catch(() => {})
      .then(() => setItem(STORAGE_KEY, snapshot))
      .catch((e) => console.error("[metaGroupsStore] persist failed", e));
  }, PERSIST_DEBOUNCE_MS);
}

export async function hydrateMetaGroupsStore(): Promise<void> {
  const stored = await getItem<SerializedCache>(STORAGE_KEY);
  if (!stored) return;
  const cache = deserializeCache(stored);
  useMetaGroupsStore.setState((s) => ({ cache, version: s.version + 1 }));
}

/** Flatten the custom query list into priority-ordered meta queries. */
export function metaQueriesFromCustomQueries(queries: readonly CustomQuery[]): MetaQuery[] {
  return queries
    .map((q, i): MetaQuery | null =>
      q.fragment ? { id: String(i), name: q.name, fragment: q.fragment } : null,
    )
    .filter((q): q is MetaQuery => q !== null);
}

function addOracleIds(
  set: Set<string>,
  cards: Record<string, DeckCard>,
): void {
  for (const entry of Object.values(cards)) {
    if (entry.snapshot.oracle_id) set.add(entry.snapshot.oracle_id);
  }
}

/** Unique oracle ids across a single deck's main + sideboard card maps. */
function collectOracleIds(
  cards: Record<string, DeckCard>,
  sideboard: Record<string, DeckCard>,
): string[] {
  const set = new Set<string>();
  addOracleIds(set, cards);
  addOracleIds(set, sideboard);
  return [...set];
}

/** Union of every oracle_id referenced by every deck in the library. */
function collectLibraryOracleIds(library: DeckLibrary): Set<string> {
  const set = new Set<string>();
  for (const deck of Object.values(library.decks)) {
    addOracleIds(set, deck.cards);
    addOracleIds(set, deck.sideboard);
  }
  return set;
}

function bumpVersion(): void {
  useMetaGroupsStore.setState((s) => ({ version: s.version + 1 }));
}

/**
 * Pure selector — compute each oracle_id's meta-group assignment from
 * the current cache + queries. Stable given the same inputs so it
 * plays nicely with useMemo. Unresolved oracle_ids are omitted from
 * the result; the caller falls back to category grouping for them.
 */
export function selectAssignments(
  cache: MatchCache,
  queries: readonly MetaQuery[],
  oracleIds: readonly string[],
): Record<string, string> {
  return classify(cache, queries, oracleIds).assignments;
}

/**
 * Drive the cache to "complete enough" for this deck: fetch only the
 * (query, oracle_id) pairs that are genuinely unknown. Re-runs classify
 * after each fetch to exploit first-match-wins — when an earlier query
 * comes back positive for a card, later queries are skipped entirely.
 */
export async function ensureMetaGroups(
  deckId: string,
  cards: Record<string, DeckCard>,
  sideboard: Record<string, DeckCard>,
): Promise<void> {
  const queries = metaQueriesFromCustomQueries(useCustomQueryStore.getState().queries);
  const oracleIds = collectOracleIds(cards, sideboard);
  if (oracleIds.length === 0 || queries.length === 0) return;

  const { cache, loadingByDeck } = useMetaGroupsStore.getState();
  if (loadingByDeck[deckId]) return;

  // Eviction pass — run before every fetch so the cache tracks reality:
  //   * Drop fragments no longer referenced by any custom query.
  //   * Drop oracle_ids no longer referenced by any deck in the library.
  // Individual Scryfall queries are cheap, so we'd rather re-ask than
  // let the cache grow forever.
  const sizeBefore = cache.size;
  const countBefore = [...cache.values()].reduce(
    (n, e) => n + e.positives.size + e.negatives.size,
    0,
  );
  pruneToFragments(cache, queries.map((q) => q.fragment));
  pruneToOracleIds(cache, collectLibraryOracleIds(useDeckStore.getState().library));
  const sizeAfter = cache.size;
  const countAfter = [...cache.values()].reduce(
    (n, e) => n + e.positives.size + e.negatives.size,
    0,
  );
  if (sizeBefore !== sizeAfter || countBefore !== countAfter) {
    bumpVersion();
    schedulePersist();
  }

  // Nothing to do if everything is already classified.
  const initial = classify(cache, queries, oracleIds);
  if (initial.blockedByFragment.size === 0) return;

  useMetaGroupsStore.setState((s) => ({
    loadingByDeck: { ...s.loadingByDeck, [deckId]: true },
  }));

  try {
    // Loop until the classifier reports no more blockers. Each pass
    // fetches every blocking fragment in parallel — Scryfall rate
    // limiting is handled in the background worker, so we just fan out.
    let pass = classify(cache, queries, oracleIds);
    while (pass.blockedByFragment.size > 0) {
      const fetches = [...pass.blockedByFragment.entries()].map(
        async ([fragment, oids]) => {
          const matches = await fetchMatches(fragment, oids);
          recordMatches(cache, fragment, oids, matches);
        },
      );
      await Promise.all(fetches);
      bumpVersion();
      schedulePersist();
      pass = classify(cache, queries, oracleIds);
    }
  } finally {
    useMetaGroupsStore.setState((s) => ({
      loadingByDeck: { ...s.loadingByDeck, [deckId]: false },
    }));
  }
}
