/**
 * Filter state shape — owned by useFilterStore, consumed by buildScryfallQuery.
 *
 * Lives in memory only (not persisted). Reset on extension reload.
 */
export type ColorLetter = "W" | "U" | "B" | "R" | "G";

/** How a chosen color set is matched against cards. */
export type ColorMode =
  | "identity-subset" // id<=  (Commander color identity, subset)
  | "colors-subset"   // c<=
  | "colors-exact";   // c=

export type Rarity = "common" | "uncommon" | "rare" | "mythic";

export type SortField = "name" | "cmc" | "power" | "toughness";
export type SortDir = "asc" | "desc";

export interface FilterState {
  text: string;
  /** Card name search (Scryfall `name:` field). */
  cardName: string;
  /** Oracle text search (Scryfall `oracle:` field). */
  cardText: string;
  colors: ColorLetter[];
  colorless: boolean;
  colorMode: ColorMode;
  rarities: Rarity[];
  /** Card types: creature, instant, sorcery, etc. */
  types: string[];
  /** Negated card types — emitted as `-t:X` clauses (always AND-combined). */
  excludedTypes: string[];
  /** How multiple positive types combine: OR (any) or AND (all). */
  typeMode: "or" | "and";
  /** Supertypes: legendary, basic, snow, world. */
  supertypes: string[];
  /** Subtypes: dragon, wizard, elf, etc. */
  subtypes: string[];
  /** Set codes (lowercase). */
  sets: string[];
  /** Oracle tags from tagger.scryfall.com (otag: syntax). */
  oracleTags: string[];
  /** Negated custom queries — always AND-combined as `-(<fragment>)`. */
  excludedOracleTags: string[];
  /** How multiple custom query toggles combine: OR (any) or AND (all). */
  customQueryMode: "or" | "and";
  /** Which set_type values to show in the set dropdown. All on by default. */
  enabledSetTypes: string[];
}

/**
 * The product-default subset of set types a new deck starts with. The
 * right-click "Reset to defaults" menu in the set filter restores this
 * set, and it's what `INITIAL_FILTER_STATE` uses for fresh decks.
 * Intentionally narrower than `ALL_SET_TYPES` — most players don't want
 * Archenemy / Vanguard / Planechase / etc. in their search results by
 * default, but they can opt in via the right-click menu.
 */
export const DEFAULT_ENABLED_SET_TYPES = [
  "expansion",
  "core",
  "masters",
  "draft_innovation",
  "commander",
  "eternal",
];

export const ALL_SET_TYPES = [
  "expansion",
  "core",
  "masters",
  "draft_innovation",
  "commander",
  "eternal",
  "masterpiece",
  "duel_deck",
  "funny",
  "promo",
  "token",
  "memorabilia",
  "starter",
  "from_the_vault",
  "planechase",
  "archenemy",
  "arsenal",
  "spellbook",
  "premium_deck",
  "box",
  "minigame",
  "treasure_chest",
  "vanguard",
  "alchemy",
];

export const INITIAL_FILTER_STATE: FilterState = {
  text: "",
  cardName: "",
  cardText: "",
  colors: [],
  colorless: false,
  colorMode: "identity-subset",
  rarities: [],
  types: [],
  excludedTypes: [],
  typeMode: "or",
  supertypes: [],
  subtypes: [],
  sets: [],
  oracleTags: [],
  excludedOracleTags: [],
  customQueryMode: "or",
  enabledSetTypes: [...DEFAULT_ENABLED_SET_TYPES],
};
