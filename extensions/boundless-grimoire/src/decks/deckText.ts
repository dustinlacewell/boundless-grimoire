/**
 * Convert a deck to plain-text decklist format.
 *
 * Format: standard `<count> <name>` lines, grouped into category sections
 * with blank-line separators. Compatible with most deckbuilders' import
 * textareas (Archidekt, Untap, Moxfield, Scryfall, etc.).
 *
 *   Creatures (4)
 *   2 Llanowar Elves
 *   2 Birds of Paradise
 *
 *   Lands (24)
 *   24 Forest
 */
import { categorizeDeck, type DeckCategoryGroup } from "../cards/categorize";
import type { Deck } from "../storage/types";

interface TextOpts {
  includeHeaders?: boolean;
  includeSets?: boolean;
}

function groupsToText(groups: DeckCategoryGroup[], opts: TextOpts): string {
  const { includeHeaders = false, includeSets = true } = opts;
  const sections = groups.map((g) => {
    const total = g.cards.reduce((s, c) => s + c.count, 0);
    const lines = g.cards.map((c) => {
      const { name, set } = c.snapshot;
      const suffix = includeSets && set ? ` (${set.toUpperCase()})` : "";
      return `${c.count} ${name}${suffix}`;
    });
    if (includeHeaders) {
      return [`${g.name} (${total})`, ...lines].join("\n");
    }
    return lines.join("\n");
  });
  // Single newline between sections — no blank lines. Many importers
  // (XMage in particular) treat the first blank line as the
  // mainboard/sideboard divider and reject subsequent ones.
  return sections.join("\n");
}

/** Convert only the main-deck cards to text. */
export function deckToText(deck: Deck, opts: TextOpts = {}): string {
  return groupsToText(categorizeDeck(deck.cards), opts);
}

/** Convert only the sideboard cards to text. */
export function sideboardToText(deck: Deck, opts: TextOpts = {}): string {
  return groupsToText(categorizeDeck(deck.sideboard), opts);
}

/**
 * Full decklist export with sideboard. Uses a blank line as the
 * mainboard/sideboard divider — the standard convention that XMage,
 * Archidekt, Moxfield, and MTGO all recognize.
 */
export function fullDeckToText(deck: Deck, opts: TextOpts = {}): string {
  const main = deckToText(deck, opts);
  const side = sideboardToText(deck, opts);
  if (!side) return main;
  const parts = [main, ""];
  if (opts.includeHeaders) parts.push("Sideboard");
  parts.push(side);
  return parts.join("\n");
}
