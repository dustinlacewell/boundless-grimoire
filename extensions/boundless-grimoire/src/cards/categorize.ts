/**
 * Bucket a deck's cards into category columns by primary type line.
 *
 * Order matters: Battle is checked early, Land last (because some lands
 * are also creatures). Creatures take precedence over Artifacts so an
 * "Artifact Creature" lands in Creatures.
 */
import type { Deck, DeckCard } from "../storage/types";

export type CategoryName =
  | "Creatures"
  | "Planeswalkers"
  | "Battles"
  | "Instants"
  | "Sorceries"
  | "Enchantments"
  | "Artifacts"
  | "Lands"
  | "Other";

export const CATEGORY_ORDER: CategoryName[] = [
  "Creatures",
  "Planeswalkers",
  "Battles",
  "Instants",
  "Sorceries",
  "Enchantments",
  "Artifacts",
  "Lands",
  "Other",
];

export function categoryFor(typeLine: string | undefined): CategoryName {
  const t = (typeLine ?? "").toLowerCase();
  if (t.includes("creature")) return "Creatures";
  if (t.includes("planeswalker")) return "Planeswalkers";
  if (t.includes("battle")) return "Battles";
  if (t.includes("instant")) return "Instants";
  if (t.includes("sorcery")) return "Sorceries";
  if (t.includes("enchantment")) return "Enchantments";
  if (t.includes("artifact")) return "Artifacts";
  if (t.includes("land")) return "Lands";
  return "Other";
}

export interface DeckCategoryGroup {
  name: CategoryName;
  cards: DeckCard[];
}

/** Sort cards within a category: by CMC ascending, then alphabetically. */
function sortWithinCategory(a: DeckCard, b: DeckCard): number {
  const ca = a.snapshot.cmc ?? 0;
  const cb = b.snapshot.cmc ?? 0;
  if (ca !== cb) return ca - cb;
  return a.snapshot.name.localeCompare(b.snapshot.name);
}

/** Bucket cards into ordered category groups. Empty groups omitted.
 *  Accepts either a Deck (uses main cards) or a raw card map. */
export function categorizeDeck(input: Deck | Record<string, DeckCard>): DeckCategoryGroup[] {
  const cardMap = "cards" in input && "id" in input
    ? (input as Deck).cards
    : input as Record<string, DeckCard>;
  const buckets = new Map<CategoryName, DeckCard[]>();
  for (const card of Object.values(cardMap)) {
    const cat = categoryFor(card.snapshot.type_line);
    const arr = buckets.get(cat) ?? [];
    arr.push(card);
    buckets.set(cat, arr);
  }
  return CATEGORY_ORDER.flatMap((name) => {
    const cards = buckets.get(name);
    if (!cards || cards.length === 0) return [];
    return [{ name, cards: cards.sort(sortWithinCategory) }];
  });
}
