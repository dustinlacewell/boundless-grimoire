/**
 * Take a deck's card map (which may be holding thin snapshots from the
 * untap.in pull) and return a new map with Scryfall-enriched snapshots.
 *
 * The new map is rekeyed by Scryfall id so any downstream code that joins
 * on `card.id` works without a translation step. For cards Scryfall can't
 * resolve we keep the original thin snapshot under its original key — the
 * deck won't lose cards just because Scryfall doesn't recognize a print.
 *
 * Enrichment runs in two passes:
 *   1. Try { name, set } — exact set match, fast.
 *   2. For any cards that didn't resolve, retry with { name } only so
 *      Scryfall's fuzzy matching can recover mismatched set codes or
 *      name normalization differences (split cards, promos, etc.).
 *
 * Failures (network error, Scryfall 5xx, abort) are caught and logged;
 * the function resolves with the original map unchanged. The deck stays
 * usable; the user just sees thin tiles until the next retry.
 */
import { getCardsByIds } from "../scryfall/client";
import { toSnapshot } from "../scryfall/snapshot";
import type { CardSnapshot, DeckCard } from "../storage/types";

export async function enrichDeckCards(
  thin: Record<string, DeckCard>,
): Promise<Record<string, DeckCard>> {
  const entries = Object.values(thin);
  if (entries.length === 0) return thin;

  // Pass 1: resolve by { name, set } — deduped.
  const identifiers: Array<{ name: string; set: string }> = [];
  const seen = new Set<string>();
  for (const c of entries) {
    if (!c.snapshot.name || !c.snapshot.set) continue;
    const k = nameSetKey(c.snapshot.name, c.snapshot.set);
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

  // Build two lookup maps:
  //   nameSetKey → snapshot  (exact match on name+set)
  //   nameKey    → snapshot  (fallback: first result for that name)
  const byNameSet = new Map<string, CardSnapshot>();
  const byName = new Map<string, CardSnapshot>();
  for (const sc of resolved) {
    const snap = toSnapshot(sc);
    byNameSet.set(nameSetKey(sc.name, sc.set), snap);
    const nk = nameKey(sc.name);
    if (!byName.has(nk)) byName.set(nk, snap);
  }

  // Walk entries, try exact match first, then name-only fallback.
  const next: Record<string, DeckCard> = {};
  const missed: DeckCard[] = [];
  for (const card of entries) {
    const exact = byNameSet.get(nameSetKey(card.snapshot.name, card.snapshot.set ?? ""));
    const fuzzy = exact ?? byName.get(nameKey(card.snapshot.name));
    if (fuzzy) {
      next[fuzzy.id] = { ...card, snapshot: fuzzy };
    } else {
      missed.push(card);
    }
  }

  // Pass 2: retry missed cards with { name } only (no set constraint).
  // Scryfall's /cards/collection does fuzzy name matching when set is
  // omitted, which recovers mismatched set codes and name differences.
  // We also query each variant (full "A // B" AND the front half alone)
  // because untap and Scryfall sometimes disagree on canonical naming
  // for flip / double-faced / split cards.
  if (missed.length > 0) {
    const retryIds: Array<{ name: string }> = [];
    const retrySeen = new Set<string>();
    for (const c of missed) {
      if (!c.snapshot.name) continue;
      for (const variant of nameVariants(c.snapshot.name)) {
        const nk = nameKey(variant);
        if (retrySeen.has(nk)) continue;
        retrySeen.add(nk);
        retryIds.push({ name: variant });
      }
    }

    let retryResolved;
    try {
      retryResolved = retryIds.length > 0 ? await getCardsByIds(retryIds) : [];
    } catch (e) {
      console.warn("[untap-sync] enrichment pass-2 failed", e);
      retryResolved = [];
    }

    // Index Scryfall results by every name variant so a match query of
    // either "A" or "A // B" both find the same card.
    const retryByName = new Map<string, CardSnapshot>();
    for (const sc of retryResolved) {
      const snap = toSnapshot(sc);
      for (const variant of nameVariants(sc.name)) {
        const nk = nameKey(variant);
        if (!retryByName.has(nk)) retryByName.set(nk, snap);
      }
    }

    for (const card of missed) {
      let enriched: CardSnapshot | undefined;
      for (const variant of nameVariants(card.snapshot.name)) {
        enriched = retryByName.get(nameKey(variant));
        if (enriched) break;
      }
      if (enriched) {
        next[enriched.id] = { ...card, snapshot: enriched };
      } else {
        // Genuinely unresolvable — keep the thin snapshot.
        next[card.snapshot.id] = card;
      }
    }
  }

  return next;
}

const nameSetKey = (name: string, set: string): string =>
  `${name.toLowerCase()}|${set}`;

const nameKey = (name: string): string => name.toLowerCase();

/**
 * Return every reasonable lookup name for a card. Double-faced /
 * flip / split cards are sometimes stored with the full "A // B" form
 * and sometimes with just the front half, depending on the source — so
 * we try both and index both for matching.
 */
function nameVariants(name: string): string[] {
  const variants: string[] = [name];
  const splitIdx = name.indexOf(" // ");
  if (splitIdx > 0) {
    const front = name.slice(0, splitIdx).trim();
    if (front && front !== name) variants.push(front);
  }
  return variants;
}
