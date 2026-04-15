/**
 * Ephemeral legality store.
 *
 * Tracks which cards in a deck are NOT legal in the deck's assigned format.
 * Not persisted — recomputed on demand when the format or cards change.
 *
 * Strategy: given a format query fragment and a set of oracle IDs, batch
 * them into Scryfall searches like `{format} (oracleid:a OR oracleid:b ...)`
 * to find which cards ARE legal. Everything else is illegal.
 */
import { create } from "zustand";
import { searchCards, ScryfallError } from "../services/scryfall";
import { storage } from "../services/storage";
import type { DeckCard } from "../storage/types";
import { preserveOnHmr } from "../storage/preserveOnHmr";

interface LegalityState {
  hydrated: boolean;
  /** deck id → set of illegal Scryfall card IDs */
  illegalByDeck: Record<string, Set<string>>;
  /** deck id → true while checking */
  checking: Record<string, boolean>;
  /**
   * deck id → the (format + card-set) hash we last checked for. Used to
   * short-circuit repeat checks when nothing has changed since the last
   * run — e.g. on every page load of a stable deck.
   */
  checkedKeyByDeck: Record<string, string>;
}

export const useLegalityStore = create<LegalityState>(() => ({
  hydrated: false,
  illegalByDeck: {},
  checking: {},
  checkedKeyByDeck: {},
}));

// ---------- Persistence ----------
//
// The legality cache survives reloads so that re-opening the app doesn't
// re-check decks whose cards + format haven't changed since last run.
// `checking` is intentionally excluded — an in-progress flag from a
// previous session is meaningless.

const STORAGE_KEY = "boundless-grimoire:legality";

interface PersistedShape {
  illegalByDeck: Record<string, string[]>;
  checkedKeyByDeck: Record<string, string>;
}

export async function hydrateLegalityStore(): Promise<void> {
  const stored = await storage.get<PersistedShape>(STORAGE_KEY);
  const illegalByDeck: Record<string, Set<string>> = {};
  if (stored?.illegalByDeck) {
    for (const [id, arr] of Object.entries(stored.illegalByDeck)) {
      illegalByDeck[id] = new Set(arr);
    }
  }
  useLegalityStore.setState({
    hydrated: true,
    illegalByDeck,
    checking: {},
    checkedKeyByDeck: stored?.checkedKeyByDeck ?? {},
  });
}

let writeChain: Promise<void> = Promise.resolve();

function persist(state: LegalityState): void {
  const shape: PersistedShape = {
    illegalByDeck: Object.fromEntries(
      Object.entries(state.illegalByDeck).map(([id, set]) => [id, [...set]]),
    ),
    checkedKeyByDeck: state.checkedKeyByDeck,
  };
  writeChain = writeChain
    .catch(() => {})
    .then(() => storage.set(STORAGE_KEY, shape))
    .catch((e) => console.error("[legalityStore] persist failed", e));
}

useLegalityStore.subscribe((state, prev) => {
  if (!state.hydrated) return;
  if (
    state.illegalByDeck === prev.illegalByDeck &&
    state.checkedKeyByDeck === prev.checkedKeyByDeck
  ) {
    return;
  }
  persist(state);
});

/** Stable signature: if this matches a prior run for the same deck, skip. */
function legalityKey(
  formatFragment: string,
  cards: Record<string, DeckCard>,
  sideboard: Record<string, DeckCard>,
): string {
  const ids = [...Object.keys(cards), ...Object.keys(sideboard)].sort().join(",");
  return `${formatFragment}|${ids}`;
}

/** Max oracle IDs per query to stay under Scryfall URL limits. */
const BATCH_SIZE = 15;

/**
 * Check which cards in a deck are legal under a format query.
 * Updates the store with the set of illegal card IDs.
 */
export async function checkLegality(
  deckId: string,
  formatFragment: string,
  cards: Record<string, DeckCard>,
  sideboard: Record<string, DeckCard>,
): Promise<void> {
  // Cache short-circuit: same format + same card set as last time → skip.
  const key = legalityKey(formatFragment, cards, sideboard);
  const { checkedKeyByDeck, checking } = useLegalityStore.getState();
  if (checkedKeyByDeck[deckId] === key) return;
  // Also avoid duplicate concurrent checks for the same deck.
  if (checking[deckId]) return;

  // Collect unique oracle IDs → card IDs mapping
  const oracleToCards = new Map<string, string[]>();
  for (const [cardId, entry] of Object.entries({ ...cards, ...sideboard })) {
    const oracleId = entry.snapshot.oracle_id;
    if (!oracleId) continue;
    const arr = oracleToCards.get(oracleId) ?? [];
    arr.push(cardId);
    oracleToCards.set(oracleId, arr);
  }

  if (oracleToCards.size === 0) {
    useLegalityStore.setState((s) => ({
      illegalByDeck: { ...s.illegalByDeck, [deckId]: new Set() },
      checking: { ...s.checking, [deckId]: false },
      checkedKeyByDeck: { ...s.checkedKeyByDeck, [deckId]: key },
    }));
    return;
  }

  useLegalityStore.setState((s) => ({
    illegalByDeck: { ...s.illegalByDeck, [deckId]: new Set() },
    checking: { ...s.checking, [deckId]: true },
  }));

  const allOracleIds = [...oracleToCards.keys()];
  const legalOracleIds = new Set<string>();

  // Batch search: find which oracle IDs match the format
  for (let i = 0; i < allOracleIds.length; i += BATCH_SIZE) {
    const batch = allOracleIds.slice(i, i + BATCH_SIZE);
    const oracleClause = batch.map((id) => `oracleid:${id}`).join(" OR ");
    const query = `(${formatFragment}) (${oracleClause})`;

    try {
      // Paginate through all results for this batch
      let page = 1;
      while (true) {
        const res = await searchCards(query, { page, unique: "cards" });
        for (const card of res.data) {
          if (card.oracle_id) legalOracleIds.add(card.oracle_id);
        }
        if (!res.has_more) break;
        page++;
      }
    } catch (e) {
      // 404 = none of this batch matched — they're all illegal
      if (e instanceof ScryfallError && e.status === 404) continue;
      console.warn("[legality] batch check failed", e);
    }
  }

  // Any oracle ID not found in legal results → its card IDs are illegal
  const illegal = new Set<string>();
  for (const [oracleId, cardIds] of oracleToCards) {
    if (!legalOracleIds.has(oracleId)) {
      for (const id of cardIds) illegal.add(id);
    }
  }

  useLegalityStore.setState((s) => ({
    illegalByDeck: { ...s.illegalByDeck, [deckId]: illegal },
    checking: { ...s.checking, [deckId]: false },
    checkedKeyByDeck: { ...s.checkedKeyByDeck, [deckId]: key },
  }));
}

/** Clear legality data for a deck (e.g. when format is removed). */
export function clearLegality(deckId: string): void {
  useLegalityStore.setState((s) => {
    const { [deckId]: _, ...rest } = s.illegalByDeck;
    const { [deckId]: __, ...checkRest } = s.checking;
    const { [deckId]: ___, ...keyRest } = s.checkedKeyByDeck;
    return { illegalByDeck: rest, checking: checkRest, checkedKeyByDeck: keyRest };
  });
}

preserveOnHmr(useLegalityStore, import.meta.hot);
