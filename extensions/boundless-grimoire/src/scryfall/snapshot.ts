/**
 * Convert a full Scryfall card to the slimmer CardSnapshot we persist
 * inside decks. Drops everything we don't render. The set of fields
 * captured here is also what the hover preview can show — so when you
 * add new things to the preview, capture them here too.
 */
import type { CardSnapshot } from "../storage/types";
import type { ScryfallCard } from "./types";

export function toSnapshot(card: ScryfallCard): CardSnapshot {
  return {
    id: card.id,
    oracle_id: card.oracle_id,
    name: card.name,
    type_line: card.type_line,
    cmc: card.cmc,
    mana_cost: card.mana_cost,
    oracle_text: card.oracle_text,
    power: card.power,
    toughness: card.toughness,
    loyalty: card.loyalty,
    rarity: card.rarity,
    colors: card.colors,
    color_identity: card.color_identity,
    image_uris: card.image_uris,
    card_faces: card.card_faces,
    set: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
  };
}
