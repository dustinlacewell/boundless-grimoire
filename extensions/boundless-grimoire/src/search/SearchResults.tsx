import { useMemo } from "react";
import { buildScryfallQuery } from "../filters/buildQuery";
import { useCustomFormatStore } from "../filters/customFormatStore";
import { useFilterStore } from "../filters/store";
import type { ScryfallCard } from "../scryfall/types";
import { selectedDeck, useDeckStore } from "../storage/deckStore";
import { DEFAULT_SORT_DIR, DEFAULT_SORT_FIELD } from "../storage/types";
import { colors } from "../ui/colors";
import { CardGrid } from "./CardGrid";
import { selectFavoritesById, useFavoritesStore } from "./favoritesStore";
import { InfiniteScrollSentinel } from "./InfiniteScrollSentinel";
import { selectPinnedById, usePinnedCardsStore } from "./pinnedCardsStore";
import { SearchResultsHeader } from "./SearchResultsHeader";
import { useCardSearch } from "./useCardSearch";

const placeholderStyle: React.CSSProperties = {
  padding: "32px 4px",
  fontSize: 13,
  color: colors.textMuted,
  textAlign: "center",
};

// Error states get a tinted card with a left border instead of bare red
// text on the dark surface — that combination had poor contrast and read
// as muted decoration rather than an actionable failure.
const errorStyle: React.CSSProperties = {
  margin: "12px 4px",
  padding: "12px 16px",
  fontSize: 13,
  color: "#ffd6d6",
  background: "rgba(255, 90, 90, 0.12)",
  border: `1px solid ${colors.danger}`,
  borderLeft: `4px solid ${colors.danger}`,
  borderRadius: 6,
  textAlign: "left",
};

const loadingMoreStyle: React.CSSProperties = {
  padding: "16px 4px",
  fontSize: 12,
  color: colors.textMuted,
  textAlign: "center",
};

const endOfResultsStyle: React.CSSProperties = {
  padding: "20px 4px 8px",
  fontSize: 12,
  color: colors.textFaint,
  textAlign: "center",
  fontStyle: "italic",
};

/**
 * Search results section. Reads filter state, compiles the query,
 * runs useCardSearch, and renders the resulting grid + states.
 *
 * - Empty filter state → friendly "use the filters above" placeholder
 * - First-page loading → "loading…" placeholder
 * - Error → red message
 * - Results → grid with infinite-scroll sentinel
 */
/**
 * Compose the final card list shown in the grid, in order:
 *
 *   1. Pinned cards     — always shown, even if they don't match the
 *                         current filters. Insertion-ordered.
 *   2. Favorited results — cards from the current result set that the
 *                         user has favorited, hoisted to the top in their
 *                         original result-order. Hidden if the current
 *                         filters wouldn't have matched them.
 *   3. Everything else  — the remaining results in Scryfall order.
 *
 * Each card appears exactly once: pins win over favorites win over plain
 * results.
 */
function composeGrid(
  pinned: ScryfallCard[],
  favoritedById: Record<string, true>,
  results: ScryfallCard[],
): ScryfallCard[] {
  const pinnedIds = new Set(pinned.map((c) => c.id));
  const favoritedFromResults: ScryfallCard[] = [];
  const tail: ScryfallCard[] = [];
  for (const c of results) {
    if (pinnedIds.has(c.id)) continue;
    if (c.id in favoritedById) favoritedFromResults.push(c);
    else tail.push(c);
  }
  return [...pinned, ...favoritedFromResults, ...tail];
}

export function SearchResults() {
  const filterState = useFilterStore((s) => s.state);
  const deck = useDeckStore(selectedDeck);
  const sortField = deck?.sortField ?? DEFAULT_SORT_FIELD;
  const sortDir = deck?.sortDir ?? DEFAULT_SORT_DIR;
  const formats = useCustomFormatStore((s) => s.formats);
  const formatFragment = deck?.formatIndex != null ? formats[deck.formatIndex]?.fragment : null;
  const query = useMemo(() => {
    const base = buildScryfallQuery(filterState);
    return formatFragment ? `(${formatFragment}) ${base}`.trim() : base;
  }, [filterState, formatFragment]);
  const { state, loadMore } = useCardSearch(query, sortField, sortDir);
  const pinnedById = usePinnedCardsStore(selectPinnedById);
  const favoritedById = useFavoritesStore(selectFavoritesById);

  const pinned = useMemo(() => Object.values(pinnedById), [pinnedById]);
  const merged = useMemo(
    () => composeGrid(pinned, favoritedById, state.cards),
    [pinned, favoritedById, state.cards],
  );
  const hasPinned = pinned.length > 0;
  const hasQuery = query.trim().length > 0;

  // Header is always rendered (sort + reset must stay reachable even
  // when the grid is empty/loading/erroring).
  return (
    <div>
      <SearchResultsHeader totalCards={state.totalCards} loading={state.loading} />
      {!hasQuery && !hasPinned ? (
        <div style={placeholderStyle}>
          Pick some filters or type a search above to browse cards.
        </div>
      ) : hasQuery && state.initialLoading && !hasPinned ? (
        <div style={placeholderStyle}>Loading…</div>
      ) : hasQuery && state.error && !hasPinned ? (
        <div style={errorStyle}>Error: {state.error}</div>
      ) : merged.length === 0 ? (
        <div style={placeholderStyle}>No cards match these filters.</div>
      ) : (
        <>
          <CardGrid cards={merged} />
          {hasQuery && state.error && (
            <div style={errorStyle}>Error: {state.error}</div>
          )}
          {hasQuery && state.hasMore && (
            <InfiniteScrollSentinel onVisible={loadMore} />
          )}
          {hasQuery && state.loading && state.cards.length > 0 && (
            <div style={loadingMoreStyle}>Loading more…</div>
          )}
          {hasQuery && !state.hasMore && !state.loading && state.cards.length > 0 && (
            <div style={endOfResultsStyle}>
              That's all {state.totalCards ?? state.cards.length} cards.
            </div>
          )}
        </>
      )}
    </div>
  );
}
