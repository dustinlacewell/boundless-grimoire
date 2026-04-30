/**
 * Resolve the right Scryfall image URL for a card snapshot.
 * Handles double-faced cards by falling back to the first face.
 */
import type { CardSnapshot } from "../storage/types";
import type { ScryfallImageUris } from "../scryfall/types";

type Size = keyof ScryfallImageUris;

export function imageUrl(snapshot: CardSnapshot, size: Size = "normal", faceIndex: number = 0): string | null {
  const direct = snapshot.image_uris?.[size];
  if (direct) return direct;
  const face = snapshot.card_faces?.[faceIndex]?.image_uris?.[size];
  return face ?? null;
}
