/**
 * Format definitions.
 *
 * A format describes a set of rules for deck construction: which cards
 * are legal, how many copies you can play, deck size constraints, and
 * whether a commander is required. The Scryfall-native `format` field
 * (e.g. "modern") drives legality queries; the optional `sets` list
 * restricts further within that format; the `fragment` field is an
 * escape hatch for arbitrary extra Scryfall syntax.
 */

export interface FormatDefinition {
  /** Display name — "Standard", "Modern", "My Cube", etc. */
  name: string;
  /**
   * Scryfall format identifier (e.g. "standard", "modern", "commander").
   * Used for both legality queries (`f:modern`) and as the format tag
   * stored on the linked untap.in deck. Empty string for custom formats
   * that don't map to a Scryfall-recognized format.
   */
  format: string;
  /**
   * Restrict to these set codes. When non-empty, only cards from these
   * sets are considered legal (AND-combined with the format filter).
   * Empty array = all sets legal in the base format.
   */
  sets: string[];
  /**
   * Additional Scryfall query fragment AND-combined with the compiled
   * format + set clauses. Free-form escape hatch for rules that don't
   * fit into the structured fields (e.g. "r:common" for Pauper variants).
   */
  fragment: string;
  /** Max copies of any non-basic card. 4 for normal, 1 for singleton. */
  maxCopies: number;
  /** Minimum total cards in the mainboard. 60 for constructed, 100 for commander. */
  minDeckSize: number;
  /** Maximum total cards in the mainboard. null = no upper limit. */
  maxDeckSize: number | null;
  /** Maximum sideboard cards. 0 = no sideboard allowed. */
  sideboardSize: number;
  /** When true, the deck must have a commander assigned. */
  commanderRequired: boolean;
}

/** Scryfall format values used by the built-in presets. */
export const SCRYFALL_FORMATS = [
  "standard",
  "modern",
  "pioneer",
  "legacy",
  "vintage",
  "pauper",
  "commander",
] as const;

export type ScryfallFormat = (typeof SCRYFALL_FORMATS)[number];
