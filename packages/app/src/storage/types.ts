/**
 * Persisted deck library types.
 *
 * Each deck owns a snapshot of every card it contains so that the deck
 * UI can render without re-fetching from Scryfall. The snapshot is the
 * subset of fields the UI actually needs.
 */
import type { DeckGroupBy } from "../cards/categorize";
import type { ScryfallCard } from "../scryfall/types";
import { INITIAL_FILTER_STATE, type FilterState, type SortDir, type SortField } from "../filters/types";

export const DEFAULT_SORT_FIELD: SortField = "name";
export const DEFAULT_SORT_DIR: SortDir = "asc";
export const DEFAULT_FILTER_STATE: FilterState = INITIAL_FILTER_STATE;

/** Minimal card payload stored alongside a deck entry. */
export interface CardSnapshot {
  id: string;
  oracle_id?: string;
  name: string;
  type_line?: string;
  cmc?: number;
  mana_cost?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  rarity?: ScryfallCard["rarity"];
  colors?: ScryfallCard["colors"];
  color_identity?: ScryfallCard["color_identity"];
  produced_mana?: ScryfallCard["produced_mana"];
  image_uris?: ScryfallCard["image_uris"];
  card_faces?: ScryfallCard["card_faces"];
  set?: string;
  set_name?: string;
  collector_number?: string;
}

export interface DeckCard {
  snapshot: CardSnapshot;
  count: number;
  /** Insertion timestamp; used for "first card" thumbnail selection. */
  addedAt: number;
  /**
   * Untap's zone name for this card.
   *
   * Decks: `"deck-1"` (mainboard) or `"sideboard-1"` (stored separately
   * in `Deck.sideboard` but still tagged so round-trip is lossless).
   *
   * Cubes: free-form organizational bucket — `"basics"`, `"group-1"` …
   * `"group-10"`. We don't interpret these; we just preserve whatever
   * untap sent so "by zone" grouping and push can round-trip cleanly.
   */
  zone: string;
}

export interface Deck {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Card map keyed by Scryfall card id. */
  cards: Record<string, DeckCard>;
  /** Sideboard card map keyed by Scryfall card id. */
  sideboard: Record<string, DeckCard>;
  /**
   * The deck's commander, if any. Stored as a single snapshot (no
   * count — commanders are singleton by definition). Rendered as the
   * first column in the deck view when set. Setting a new commander
   * returns the previous one to the mainboard.
   */
  commander?: CardSnapshot;
  /** Sort field used by the search grid while this deck is active. */
  sortField: SortField;
  /** Sort direction used by the search grid while this deck is active. */
  sortDir: SortDir;
  /** Persisted filter bar state — every control the user picks. */
  filters: FilterState;
  /** Index into the custom formats list, or null for no format. */
  formatIndex: number | null;
  /**
   * Grouping mode for the card-column grid. Persisted per deck/cube so
   * each entity remembers its own preferred layout. Decks default to
   * "category"; cubes default to "zone".
   */
  groupBy: DeckGroupBy;
  /**
   * Card-column layout: `"scroll"` keeps columns in a single row that
   * scrolls horizontally, `"wrap"` wraps columns onto multiple rows.
   * Persisted per entity (small decks often look better wrapped while
   * large decks want to scroll).
   */
  layout: "scroll" | "wrap";
  /**
   * Sort order applied within each column in the card grid. Distinct
   * from `sortField` which controls the search results grid.
   *   - "cmc"   → cmc asc, then name (the long-standing default)
   *   - "name"  → alphabetical
   *   - "color" → WUBRG ordering (colorless first, multicolor last),
   *               cmc then name as tiebreaker
   */
  columnSort: "cmc" | "name" | "color";
  /** Scryfall card id chosen as the deck's cover art for the ribbon tile. */
  coverCardId?: string;
  /** Linked untap.in deck UUID, set after first sync. */
  untapDeckUid?: string;
  /**
   * True if this entity is a draft cube rather than a constructed deck.
   * Cubes hide the sideboard / commander / format picker / legality
   * affordances and render via `CubeView`. Persisted + round-tripped to
   * untap.in's `is_cube` flag.
   */
  isCube?: boolean;
  /**
   * True while a background task is fetching full Scryfall data for this
   * deck's cards. Set during the initial pull from untap.in (we commit
   * immediately with thin snapshots so the deck appears in the UI, then
   * enrich in the background). The deck ribbon shows a spinner overlay
   * when this is set.
   */
  enriching?: boolean;
}

export interface DeckLibrary {
  /**
   * Schema version. Bump this in `LIBRARY_VERSION` whenever the on-disk
   * shape changes in a way that needs a runtime migration step.
   * Optional in the type because v0 records (predating versioning)
   * have no field at all — `migrateLibrary` treats `undefined` as 0.
   */
  version?: number;
  /** All decks and cubes keyed by id. Type is disambiguated by `isCube`. */
  decks: Record<string, Deck>;
  /** Display order for the ribbon (covers both decks and cubes). */
  order: string[];
  /** Currently selected deck id, or null. */
  selectedId: string | null;
  /** Currently selected cube id, or null. Tracked separately so switching
   *  between Decks / Cubes tabs preserves each side's selection. */
  selectedCubeId: string | null;
  /** Which library tab is active in the ribbon. */
  libraryView: "decks" | "cubes";
}

/** Bump when DeckLibrary's on-disk shape changes. See migrateLibrary. */
export const LIBRARY_VERSION = 10;

export const EMPTY_LIBRARY: DeckLibrary = {
  version: LIBRARY_VERSION,
  decks: {},
  order: [],
  selectedId: null,
  selectedCubeId: null,
  libraryView: "decks",
};
