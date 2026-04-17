/**
 * Detect decks with thin (un-enriched) card snapshots and re-enrich them.
 *
 * A card is "thin" if:
 *   - it has no image_uris AND no card_faces (never successfully enriched), OR
 *   - it's a land missing `produced_mana` (snapshot predates that field).
 *
 * Runs at boot (after hydrate) so cards that failed enrichment on a
 * prior session or predate newer fields get another chance automatically.
 *
 * Concurrency safety — the big fix:
 *
 *   Enrichment reads the deck, awaits Scryfall (seconds), then writes
 *   back. A user can edit during that window. The old implementation
 *   simply overwrote the deck's card map with the enriched one, which
 *   silently dropped edits made during the await. The new implementation
 *   is a *merge*, not a replace:
 *
 *     - For each card present in the CURRENT store state (not the
 *       captured snapshot), if we have an enriched snapshot keyed by
 *       its oracle_id / name, swap in the richer snapshot while
 *       preserving count / addedAt / zone.
 *     - Cards added by the user during the await remain as-is.
 *     - Cards removed by the user during the await are not re-added.
 *     - The deck's updatedAt is left alone (enrichment doesn't touch
 *       user-facing state) — except the `enriching` flag flip.
 */
import { useDeckStore } from "@boundless-grimoire/app";
import type { CardSnapshot, DeckCard } from "@boundless-grimoire/app";
import { enrichDeckCards } from "./enrichDeck";

function isLand(snapshot: CardSnapshot): boolean {
  return (snapshot.type_line ?? "").toLowerCase().includes("land");
}

function isThin(snapshot: CardSnapshot): boolean {
  if (!snapshot.image_uris && !snapshot.card_faces) return true;
  if (isLand(snapshot) && !snapshot.produced_mana) return true;
  return false;
}

function hasThinCards(cards: Record<string, DeckCard>): boolean {
  return Object.values(cards).some((c) => isThin(c.snapshot));
}

/**
 * Build the lookup tables the merge uses. We need every resolvable key
 * so we can match cards that changed id between the captured snapshot
 * and the current store state (user swaps prints, etc).
 */
interface EnrichLookup {
  byId: Map<string, CardSnapshot>;
  byOracleId: Map<string, CardSnapshot>;
  byNameLower: Map<string, CardSnapshot>;
}

function buildLookup(enriched: Record<string, DeckCard>): EnrichLookup {
  const byId = new Map<string, CardSnapshot>();
  const byOracleId = new Map<string, CardSnapshot>();
  const byNameLower = new Map<string, CardSnapshot>();
  for (const c of Object.values(enriched)) {
    const s = c.snapshot;
    byId.set(s.id, s);
    if (s.oracle_id) byOracleId.set(s.oracle_id, s);
    if (s.name) byNameLower.set(s.name.toLowerCase(), s);
  }
  return { byId, byOracleId, byNameLower };
}

function lookupFor(card: DeckCard, L: EnrichLookup): CardSnapshot | null {
  const s = card.snapshot;
  const byId = L.byId.get(s.id);
  if (byId) return byId;
  if (s.oracle_id) {
    const byOracle = L.byOracleId.get(s.oracle_id);
    if (byOracle) return byOracle;
  }
  if (s.name) {
    const byName = L.byNameLower.get(s.name.toLowerCase());
    if (byName) return byName;
  }
  return null;
}

/**
 * Non-destructive merge of enrichment results onto the current deck.
 * Operates on the CURRENT store state inside setState so any edits
 * made during the Scryfall await are preserved.
 */
function mergeInto(
  current: Record<string, DeckCard>,
  enriched: Record<string, DeckCard>,
): Record<string, DeckCard> {
  if (Object.keys(enriched).length === 0) return current;
  const L = buildLookup(enriched);
  const out: Record<string, DeckCard> = {};
  let changed = false;
  for (const [key, card] of Object.entries(current)) {
    const richer = lookupFor(card, L);
    if (richer && richer.id !== card.snapshot.id) {
      out[richer.id] = { ...card, snapshot: richer };
      changed = true;
    } else if (richer) {
      out[key] = { ...card, snapshot: richer };
      changed = true;
    } else {
      out[key] = card;
    }
  }
  return changed ? out : current;
}

/** Re-enrich a single deck's thin cards and commit the result to the store. */
export async function enrichDeckInPlace(localDeckId: string): Promise<void> {
  const deck = useDeckStore.getState().library.decks[localDeckId];
  if (!deck) return;

  const [enrichedCards, enrichedSideboard] = await Promise.all([
    enrichDeckCards(deck.cards),
    enrichDeckCards(deck.sideboard),
  ]);

  useDeckStore.setState((s) => {
    const current = s.library.decks[localDeckId];
    if (!current) return s;
    const nextCards = mergeInto(current.cards, enrichedCards);
    const nextSide = mergeInto(current.sideboard, enrichedSideboard);
    const contentChanged = nextCards !== current.cards || nextSide !== current.sideboard;
    // Bail cleanly if nothing at all changed (no thin cards resolved
    // and we weren't mid-enrichment).
    if (!contentChanged && !current.enriching) return s;
    return {
      library: {
        ...s.library,
        decks: {
          ...s.library.decks,
          [localDeckId]: {
            ...current,
            cards: nextCards,
            sideboard: nextSide,
            enriching: false,
            // Bumping `updatedAt` when card content changed is what lets
            // the outbox observe "this deck was modified" and schedule
            // a push — without it, a pulled thin deck would be
            // permanently stuck in a dirty-but-un-pushed state because
            // the enrichment commit and the initial pull would share
            // the same timestamp. Without a content change, leave the
            // stamp alone so boot-time re-enrich doesn't spuriously
            // re-push every deck in the library.
            updatedAt: contentChanged ? Date.now() : current.updatedAt,
          },
        },
      },
    };
  });
}

/** Scan all decks and re-enrich any that contain thin snapshots. */
export function reEnrichThinDecks(): void {
  const { decks } = useDeckStore.getState().library;
  for (const deck of Object.values(decks)) {
    if (hasThinCards(deck.cards) || hasThinCards(deck.sideboard)) {
      console.log(`[re-enrich] deck "${deck.name}" has thin cards, re-enriching`);
      void enrichDeckInPlace(deck.id);
    }
  }
}
