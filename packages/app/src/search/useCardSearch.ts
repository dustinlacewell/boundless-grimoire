/**
 * useCardSearch — debounced, abortable, paginated Scryfall search.
 *
 * Behavior:
 *   - Watches a (query, sortField, sortDir) input. After a 250ms debounce,
 *     "commits" the new params and resets the result list.
 *   - Issues page 1 of /cards/search via the throttled client. Aborts any
 *     in-flight previous request.
 *   - Exposes loadMore() to fetch the next page and append the results.
 *   - Treats Scryfall 404 (no cards matched) as an empty result, not an
 *     error — Scryfall returns 404 for empty searches by design.
 *   - Empty/whitespace queries short-circuit to an empty state with no
 *     network call. The caller decides whether the active filters
 *     constitute "browseable" input.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ScryfallError, searchCards } from "../services/scryfall";
import type { ScryfallCard } from "../scryfall/types";
import type { SortDir, SortField } from "../filters/types";

export interface CardSearchState {
  cards: ScryfallCard[];
  totalCards: number | null;
  hasMore: boolean;
  loading: boolean;
  /** True only on the very first page after a (re)commit. */
  initialLoading: boolean;
  error: string | null;
}

const EMPTY: CardSearchState = {
  cards: [],
  totalCards: null,
  hasMore: false,
  loading: false,
  initialLoading: false,
  error: null,
};

const DEBOUNCE_MS = 250;

interface Committed {
  query: string;
  sortField: SortField;
  sortDir: SortDir;
}

export interface UseCardSearchResult {
  state: CardSearchState;
  loadMore: () => void;
}

export function useCardSearch(
  query: string,
  sortField: SortField,
  sortDir: SortDir,
): UseCardSearchResult {
  // Debounced "committed" search params.
  const [committed, setCommitted] = useState<Committed>({ query, sortField, sortDir });
  useEffect(() => {
    const id = window.setTimeout(
      () => setCommitted({ query, sortField, sortDir }),
      DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [query, sortField, sortDir]);

  // Result state.
  const [state, setState] = useState<CardSearchState>(EMPTY);

  // Refs to fresh values for use inside imperative loadMore.
  const stateRef = useRef(state);
  stateRef.current = state;
  const committedRef = useRef(committed);
  committedRef.current = committed;
  const pageRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);

  // Reset & fetch page 1 whenever committed search params change.
  useEffect(() => {
    abortRef.current?.abort();

    const trimmed = committed.query.trim();
    if (!trimmed) {
      setState(EMPTY);
      pageRef.current = 1;
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    pageRef.current = 1;
    loadingRef.current = false;

    // Don't clear cards when params change — keep the previous results
    // visible while the new query is in flight, then swap on success.
    // Cards present in both old and new sets keep the same React key
    // (Scryfall id) so their DOM nodes are preserved. `initialLoading`
    // is only true when there is genuinely nothing to display yet.
    setState((s) => ({
      ...s,
      loading: true,
      initialLoading: s.cards.length === 0,
      error: null,
    }));

    searchCards(trimmed, {
      page: 1,
      order: committed.sortField,
      dir: committed.sortDir,
      signal: ac.signal,
    })
      .then((res) => {
        if (ac.signal.aborted) return;
        setState({
          cards: res.data,
          totalCards: res.total_cards,
          hasMore: res.has_more,
          loading: false,
          initialLoading: false,
          error: null,
        });
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        if ((e as Error)?.name === "AbortError") return;
        // Scryfall returns 404 when nothing matches — that's empty, not error.
        if (e instanceof ScryfallError && e.status === 404) {
          setState({
            cards: [],
            totalCards: 0,
            hasMore: false,
            loading: false,
            initialLoading: false,
            error: null,
          });
          return;
        }
        // Real error: keep stale cards if we have any so the user can
        // still interact with the previous results, just stop loading.
        setState((s) => ({
          ...s,
          loading: false,
          initialLoading: false,
          error: String(e),
        }));
      });

    return () => ac.abort();
  }, [committed.query, committed.sortField, committed.sortDir]);

  // Ref-based lock: prevents the observer callback from queueing
  // a second loadMore before the first setState({ loading: true })
  // has flushed — stateRef.current.loading lags by one tick.
  const loadingRef = useRef(false);

  const loadMore = useCallback(() => {
    const cur = stateRef.current;
    if (loadingRef.current || cur.loading || !cur.hasMore) return;
    loadingRef.current = true;

    const params = committedRef.current;
    pageRef.current += 1;
    const page = pageRef.current;

    // Abort any in-flight request before swapping in a new controller —
    // otherwise a fast user (or a stuck network) leaks AbortControllers
    // and a previous response could resolve into the new state.
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setState((s) => ({ ...s, loading: true, error: null }));

    searchCards(params.query.trim(), {
      page,
      order: params.sortField,
      dir: params.sortDir,
      signal: ac.signal,
    })
      .then((res) => {
        if (ac.signal.aborted) return;
        loadingRef.current = false;
        setState((s) => ({
          ...s,
          cards: [...s.cards, ...res.data],
          hasMore: res.has_more,
          loading: false,
        }));
      })
      .catch((e: unknown) => {
        loadingRef.current = false;
        if (ac.signal.aborted) return;
        if ((e as Error)?.name === "AbortError") return;
        // Roll back the page bump so the next loadMore retries this page.
        pageRef.current -= 1;
        setState((s) => ({ ...s, loading: false, error: String(e) }));
      });
  }, []);

  return { state, loadMore };
}
