/**
 * Favorite indicator for cards that are currently favorited in the search
 * results. A big ⭐ centered over the card art, mirroring PinBadge's
 * placement and halo treatment so the two badges read as a matched pair.
 *
 * Search-grid only — deck view never displays this. Favoriting is a
 * search-results affordance.
 */

interface Props {
  /** Parent card width in px. Used to scale the badge proportionally. */
  cardWidth: number;
}

export function FavoriteBadge({ cardWidth }: Props) {
  // Same scaling rule as PinBadge.
  const size = Math.max(32, cardWidth * 0.35);

  return (
    <div
      aria-label="Favorited"
      title="Favorited (shift-right-click to unfavorite)"
      style={{
        position: "absolute",
        left: "50%",
        top: "30%",
        transform: "translate(-50%, -50%)",
        fontSize: size,
        lineHeight: 1,
        fontFamily: "system-ui, sans-serif",
        filter:
          "drop-shadow(0 0 6px rgba(0,0,0,0.85)) drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      ❤️
    </div>
  );
}
