import type { ScryfallCardFace } from "../scryfall/types";
import type { CardSnapshot } from "../storage/types";

/**
 * Classifies a card snapshot by how its faces should be presented.
 *
 *   single — one face, render the root image and oracle text.
 *   dfc    — multi-face with per-face images (transform, MDFC, modal DFC).
 *            Switching faces means swapping the image.
 *   flip   — single root image, multiple faces share it (Kamigawa flip).
 *            Switching faces means rotating 180°.
 */
export type FaceKind = "single" | "dfc" | "flip";

export function faceKind(snapshot: CardSnapshot): FaceKind {
  const faces = snapshot.card_faces;
  if (!faces || faces.length < 2) return "single";
  if (faces[1]?.image_uris) return "dfc";
  if (snapshot.image_uris) return "flip";
  return "single";
}

/**
 * Returns the face array when the snapshot has 2+ faces, else null.
 * Use this instead of `snapshot.card_faces!` — narrowing is explicit and
 * the return type carries the non-null guarantee.
 */
export function multiFaces(
  snapshot: CardSnapshot,
): readonly ScryfallCardFace[] | null {
  const faces = snapshot.card_faces;
  if (!faces || faces.length < 2) return null;
  return faces;
}
