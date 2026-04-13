/**
 * Pin indicator for cards that are currently pinned in the search results.
 *
 * A big 📌 centered over the card art (roughly halfway between the title
 * bar and the type line — i.e. on the artwork itself) so it reads
 * unambiguously at a glance even when the grid is dense. Drop shadow keeps
 * it legible against any card background.
 *
 * Search-grid only — deck view never displays this. Pinning is a
 * search-results affordance.
 */

interface Props {
  /** Parent card width in px. Used to scale the badge proportionally. */
  cardWidth: number;
}

export function PinBadge({ cardWidth }: Props) {
  // ~35% of card width — big enough to dominate the art region without
  // covering the title or type line. Floor at 32px so it stays readable
  // at the smallest grid sizes.
  const size = Math.max(32, cardWidth * 0.35);

  return (
    <div
      aria-label="Pinned"
      title="Pinned (shift-click to unpin)"
      style={{
        position: "absolute",
        // Center horizontally; ~38% from the top puts the icon over the
        // card art, slightly above the geometric center of the card to
        // account for the title bar at the top.
        left: "50%",
        top: "30%",
        transform: "translate(-50%, -50%)",
        fontSize: size,
        lineHeight: 1,
        fontFamily: "system-ui, sans-serif",
        // Layered drop-shadows give a soft halo so the emoji reads against
        // bright card art (lava, white borders) and dark art alike.
        filter:
          "drop-shadow(0 0 6px rgba(0,0,0,0.85)) drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      📌
    </div>
  );
}
