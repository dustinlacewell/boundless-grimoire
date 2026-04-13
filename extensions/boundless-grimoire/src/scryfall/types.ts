/**
 * Scryfall API response types.
 *
 * Only the fields we use are typed. The full schema is at:
 *   https://scryfall.com/docs/api/cards
 *
 * `unknown` is used liberally rather than `any` so unknown fields force
 * an explicit cast at the use site.
 */

export type ScryfallColor = "W" | "U" | "B" | "R" | "G";
export type ScryfallRarity = "common" | "uncommon" | "rare" | "mythic" | "special" | "bonus";

export interface ScryfallImageUris {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
  art_crop?: string;
  border_crop?: string;
}

export interface ScryfallCardFace {
  name: string;
  type_line?: string;
  oracle_text?: string;
  mana_cost?: string;
  image_uris?: ScryfallImageUris;
  power?: string;
  toughness?: string;
  loyalty?: string;
}

export interface ScryfallCard {
  id: string;
  oracle_id?: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: ScryfallRarity;
  released_at: string;
  type_line?: string;
  oracle_text?: string;
  mana_cost?: string;
  cmc?: number;
  colors?: ScryfallColor[];
  color_identity?: ScryfallColor[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  scryfall_uri?: string;
}

export interface ScryfallSearchResponse {
  object: "list";
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
  warnings?: string[];
}

export interface ScryfallErrorResponse {
  object: "error";
  code: string;
  status: number;
  details: string;
  warnings?: string[];
}
