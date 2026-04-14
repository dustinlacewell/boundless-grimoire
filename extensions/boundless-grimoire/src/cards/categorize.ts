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
  /** Human-readable group header (category name or CMC label). */
  name: string;
  cards: DeckCard[];
}

export type DeckGroupBy = "category" | "cmc" | "meta";

/** Sort cards within a group: by CMC ascending, then alphabetically. */
function sortWithinGroup(a: DeckCard, b: DeckCard): number {
  const ca = a.snapshot.cmc ?? 0;
  const cb = b.snapshot.cmc ?? 0;
  if (ca !== cb) return ca - cb;
  return a.snapshot.name.localeCompare(b.snapshot.name);
}

function cardMapOf(input: Deck | Record<string, DeckCard>): Record<string, DeckCard> {
  return "cards" in input && "id" in input
    ? (input as Deck).cards
    : (input as Record<string, DeckCard>);
}

/** Bucket cards into ordered category groups. Empty groups omitted. */
export function categorizeDeck(input: Deck | Record<string, DeckCard>): DeckCategoryGroup[] {
  const cardMap = cardMapOf(input);
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
    return [{ name, cards: cards.sort(sortWithinGroup) }];
  });
}

/**
 * Bucket cards into columns by converted mana cost. Lands group under
 * "Lands" (they're all CMC 0 but splitting them out keeps the columns
 * useful). Everything else groups by its CMC, ascending. 7+ are folded
 * together so the columns don't explode for big-mana decks.
 */
export function groupByCmc(input: Deck | Record<string, DeckCard>): DeckCategoryGroup[] {
  const cardMap = cardMapOf(input);
  const LAND_KEY = -1;
  const HIGH = 7;
  const buckets = new Map<number, DeckCard[]>();

  for (const card of Object.values(cardMap)) {
    const isLand = (card.snapshot.type_line ?? "").toLowerCase().includes("land");
    const key = isLand ? LAND_KEY : Math.min(HIGH, card.snapshot.cmc ?? 0);
    const arr = buckets.get(key) ?? [];
    arr.push(card);
    buckets.set(key, arr);
  }

  const keys = [...buckets.keys()].sort((a, b) => a - b);
  return keys.map((k) => {
    const cards = (buckets.get(k) ?? []).sort(sortWithinGroup);
    let name: string;
    if (k === LAND_KEY) name = "Lands";
    else if (k === HIGH) name = `${HIGH}+ mana`;
    else name = `${k} mana`;
    return { name, cards };
  });
}

/**
 * Bucket cards into meta-tag columns (Removal, Ramp, Card Draw, …). The
 * caller supplies an oracle_id → meta-tag-id mapping (usually from
 * metaGroupsStore). Cards with no oracle id or no mapping yet fall
 * back to their normal type-line category.
 *
 * META_TAGS order drives column order so the most important roles
 * (removal, card draw) appear first.
 */
export function groupByMeta(
  input: Deck | Record<string, DeckCard>,
  oracleToMeta: Record<string, string>,
  metaTagLabels: Array<{ id: string; label: string }>,
): DeckCategoryGroup[] {
  const cardMap = cardMapOf(input);
  const metaBuckets = new Map<string, DeckCard[]>();
  const fallbackCards: DeckCard[] = [];

  for (const card of Object.values(cardMap)) {
    const oid = card.snapshot.oracle_id;
    const metaId = oid ? oracleToMeta[oid] : undefined;
    if (!metaId) {
      fallbackCards.push(card);
      continue;
    }
    const arr = metaBuckets.get(metaId) ?? [];
    arr.push(card);
    metaBuckets.set(metaId, arr);
  }

  const groups: DeckCategoryGroup[] = [];
  // Meta-tag columns in priority order.
  for (const { id, label } of metaTagLabels) {
    const cards = metaBuckets.get(id);
    if (!cards || cards.length === 0) continue;
    groups.push({ name: label, cards: cards.sort(sortWithinGroup) });
  }

  // Cards not in any meta-tag → fall through to the normal category
  // grouping so the user still sees them organized rather than lumped.
  if (fallbackCards.length > 0) {
    const fallbackMap: Record<string, DeckCard> = {};
    for (const c of fallbackCards) fallbackMap[c.snapshot.id] = c;
    groups.push(...categorizeDeck(fallbackMap));
  }

  return groups;
}

/** Dispatcher: pick a grouping function by mode. */
export function groupDeck(
  input: Deck | Record<string, DeckCard>,
  mode: DeckGroupBy,
  ctx?: {
    oracleToMeta?: Record<string, string>;
    metaTagLabels?: Array<{ id: string; label: string }>;
  },
): DeckCategoryGroup[] {
  if (mode === "cmc") return groupByCmc(input);
  if (mode === "meta" && ctx?.oracleToMeta && ctx.metaTagLabels) {
    return groupByMeta(input, ctx.oracleToMeta, ctx.metaTagLabels);
  }
  return categorizeDeck(input);
}
