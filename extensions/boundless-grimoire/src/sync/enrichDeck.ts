/**
 * Take a deck's card map (which may be holding thin snapshots from the
 * untap.in pull) and return a new map with Scryfall-enriched snapshots.
 *
 * The new map is rekeyed by Scryfall id so any downstream code that joins
 * on `card.id` works without a translation step. For cards Scryfall can't
 * resolve we keep the original thin snapshot under its original key — the
 * deck won't lose cards just because Scryfall doesn't recognize a print.
 *
 * Failures (network error, Scryfall 5xx, abort) are caught and logged;
 * the function resolves with the original map unchanged. The deck stays
 * usable; the user just sees thin tiles until the next retry.
 */
import { getCardsByIds } from "../scryfall/client";
import { toSnapshot } from "../scryfall/snapshot";
import type { DeckCard } from "../storage/types";

export async function enrichDeckCards(
  thin: Record<string, DeckCard>,
): Promise<Record<string, DeckCard>> {
  const entries = Object.values(thin);
  if (entries.length === 0) return thin;

  // Single pass: dedupe identifiers AND record which entries we'll need to
  // re-key later. Multiple deck entries with the same (name, set) collapse
  // into one identifier; the seen-set prevents Scryfall from receiving
  // duplicates.
  const identifiers: Array<{ name: string; set: string }> = [];
  const seen = new Set<string>();
  for (const c of entries) {
    if (!c.snapshot.name || !c.snapshot.set) continue;
    const k = key(c.snapshot.name, c.snapshot.set);
    if (seen.has(k)) continue;
    seen.add(k);
    identifiers.push({ name: c.snapshot.name, set: c.snapshot.set });
  }
  if (identifiers.length === 0) return thin;

  let resolved;
  try {
    resolved = await getCardsByIds(identifiers);
  } catch (e) {
    console.warn("[untap-sync] enrichment failed; keeping thin snapshots", e);
    return thin;
  }

  // Build the (name|set) → snapshot lookup in one pass over Scryfall's
  // response, then walk the original entries in order so we preserve
  // addedAt + count.
  const lookup = new Map<string, ReturnType<typeof toSnapshot>>();
  for (const sc of resolved) lookup.set(key(sc.name, sc.set), toSnapshot(sc));

  const next: Record<string, DeckCard> = {};
  for (const card of entries) {
    const enriched = lookup.get(key(card.snapshot.name, card.snapshot.set ?? ""));
    if (enriched) {
      next[enriched.id] = { ...card, snapshot: enriched };
    } else {
      // Scryfall didn't know this card — keep what untap gave us.
      next[card.snapshot.id] = card;
    }
  }
  return next;
}

const key = (name: string, set: string): string => `${name.toLowerCase()}|${set}`;
