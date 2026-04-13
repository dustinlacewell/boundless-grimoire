/**
 * Persisted deck library types.
 *
 * Each deck owns a snapshot of every card it contains so that the deck
 * UI can render without re-fetching from Scryfall. The snapshot is the
 * subset of fields the UI actually needs.
 */
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
  /** Sort field used by the search grid while this deck is active. */
  sortField: SortField;
  /** Sort direction used by the search grid while this deck is active. */
  sortDir: SortDir;
  /** Persisted filter bar state — every control the user picks. */
  filters: FilterState;
  /** Index into the custom formats list, or null for no format. */
  formatIndex: number | null;
  /** Scryfall card id chosen as the deck's cover art for the ribbon tile. */
  coverCardId?: string;
  /** Linked untap.in deck UUID, set after first sync. */
  untapDeckUid?: string;
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
  /** All decks keyed by id. */
  decks: Record<string, Deck>;
  /** Display order for the deck ribbon. */
  order: string[];
  /** Currently selected deck id, or null. */
  selectedId: string | null;
}

/** Bump when DeckLibrary's on-disk shape changes. See migrateLibrary. */
export const LIBRARY_VERSION = 3;

export const EMPTY_LIBRARY: DeckLibrary = {
  version: LIBRARY_VERSION,
  decks: {},
  order: [],
  selectedId: null,
};
