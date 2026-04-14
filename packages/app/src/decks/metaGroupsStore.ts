/**
 * Meta-groups orchestrator.
 *
 * Owns only what needs to survive a render:
 *
 *   - `cache`      : per-fragment {positives, negatives} — expensive
 *                    Scryfall data, persisted to chrome.storage.local.
 *   - `version`    : bump-counter consumers watch as a useMemo dep.
 *   - `loadingByDeck`: drives the grouping toast.
 *
 * The `oracle_id → queryId` grouping itself is NOT cached here.
 * `DeckView` derives it synchronously each render by calling `classify`
 * over the current custom queries and this store's cache. That way a
 * reorder of the custom query list is just a new array ref feeding into
 * the render; there is no identity-keyed intermediate to go stale.
 *
 * `ensureMetaGroups` exists only to fill gaps in the cache for a given
 * deck: run classify, fetch the fragments it's blocked on, bump version,
 * repeat. When all blockers clear, the async task exits. React picks up
 * the new cache contents through the version bump.
 */
import { create } from "zustand";
import { useCustomQueryStore, type CustomQuery } from "../filters/customQueryStore";
import { storage } from "../services/storage";
import { useDeckStore } from "../storage/deckStore";
import type { DeckCard, DeckLibrary } from "../storage/types";
import { classify, type MetaQuery } from "./meta/classify";
import { fetchMatches } from "./meta/fetchMatches";
import { preserveOnHmr } from "../storage/preserveOnHmr";
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
  version: number;
  loadingByDeck: Record<string, boolean>;
}

export const useMetaGroupsStore = create<State>(() => ({
  cache: createCache(),
  version: 0,
  loadingByDeck: {},
}));

// ---------- Persistence ----------

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
      .then(() => storage.set(STORAGE_KEY, snapshot))
      .catch((e) => console.error("[metaGroupsStore] persist failed", e));
  }, PERSIST_DEBOUNCE_MS);
}

export async function hydrateMetaGroupsStore(): Promise<void> {
  const stored = await storage.get<SerializedCache>(STORAGE_KEY);
  if (!stored) return;
  const cache = deserializeCache(stored);
  useMetaGroupsStore.setState((s) => ({ cache, version: s.version + 1 }));
}

// ---------- Helpers ----------

/**
 * Flatten the custom query list into priority-ordered meta queries.
 * The `id` is a hash of (name + fragment) so it's stable across reorders
 * and only changes when the user actually renames or edits a query.
 */
export function metaQueriesFromCustomQueries(queries: readonly CustomQuery[]): MetaQuery[] {
  return queries
    .filter((q): q is CustomQuery => !!q.fragment)
    .map((q) => ({ id: stableId(q), name: q.name, fragment: q.fragment }));
}

function stableId(q: CustomQuery): string {
  // djb2 — short, dependency-free, collision risk is negligible for the
  // handful of custom queries a user maintains.
  let h = 5381;
  const s = `${q.name}\u0000${q.fragment}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function addOracleIds(set: Set<string>, cards: Record<string, DeckCard>): void {
  for (const entry of Object.values(cards)) {
    if (entry.snapshot.oracle_id) set.add(entry.snapshot.oracle_id);
  }
}

function collectOracleIds(
  cards: Record<string, DeckCard>,
  sideboard: Record<string, DeckCard>,
): string[] {
  const set = new Set<string>();
  addOracleIds(set, cards);
  addOracleIds(set, sideboard);
  return [...set];
}

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

// ---------- Fetch dedup ----------

const inFlightFetches = new Map<string, Promise<void>>();

function fetchKey(fragment: string, oracleIds: readonly string[]): string {
  return `${fragment}|${[...oracleIds].sort().join(",")}`;
}

async function dedupedFetch(
  cache: MatchCache,
  fragment: string,
  oracleIds: string[],
): Promise<void> {
  const key = fetchKey(fragment, oracleIds);
  const existing = inFlightFetches.get(key);
  if (existing) return existing;
  const task = (async () => {
    try {
      const matches = await fetchMatches(fragment, oracleIds);
      recordMatches(cache, fragment, oracleIds, matches);
    } finally {
      inFlightFetches.delete(key);
    }
  })();
  inFlightFetches.set(key, task);
  return task;
}

// ---------- Orchestrator ----------

/**
 * Fill any gaps in the match cache for the given deck. Runs classify,
 * fetches fragments it's blocked on, bumps version, repeats. Exits once
 * there are no more blockers — the caller (DeckView) re-derives the
 * grouping synchronously from the cache each render.
 */
export async function ensureMetaGroups(
  deckId: string,
  cards: Record<string, DeckCard>,
  sideboard: Record<string, DeckCard>,
): Promise<void> {
  const queries = metaQueriesFromCustomQueries(useCustomQueryStore.getState().queries);
  if (queries.length === 0) return;
  const oracleIds = collectOracleIds(cards, sideboard);

  const { cache } = useMetaGroupsStore.getState();

  // Eviction pass — drop fragments no longer referenced by any custom
  // query, and oracle_ids no longer referenced by any deck.
  const { changed } = prune(cache, queries, useDeckStore.getState().library);
  if (changed) {
    bumpVersion();
    schedulePersist();
  }

  let pass = classify(cache, queries, oracleIds);
  if (pass.blockedByFragment.size === 0) return;

  useMetaGroupsStore.setState((s) => ({
    loadingByDeck: { ...s.loadingByDeck, [deckId]: true },
  }));

  try {
    while (pass.blockedByFragment.size > 0) {
      const fetches = [...pass.blockedByFragment.entries()].map(
        ([fragment, oids]) => dedupedFetch(cache, fragment, oids),
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

function prune(
  cache: MatchCache,
  queries: readonly MetaQuery[],
  library: DeckLibrary,
): { changed: boolean } {
  const sizeBefore = cache.size;
  const countBefore = [...cache.values()].reduce(
    (n, e) => n + e.positives.size + e.negatives.size,
    0,
  );
  pruneToFragments(cache, queries.map((q) => q.fragment));
  pruneToOracleIds(cache, collectLibraryOracleIds(library));
  const sizeAfter = cache.size;
  const countAfter = [...cache.values()].reduce(
    (n, e) => n + e.positives.size + e.negatives.size,
    0,
  );
  return { changed: sizeBefore !== sizeAfter || countBefore !== countAfter };
}

preserveOnHmr(useMetaGroupsStore, import.meta.hot);
