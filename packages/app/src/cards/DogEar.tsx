import { colors } from "@boundless-grimoire/ui";

interface Props {
  count: number;
  /** Parent card width in px. Used to scale the badge proportionally. */
  cardWidth: number;
}

/**
 * Top-left "dog-ear" count badge — folded-corner sticky note in the
 * upper-left corner of a card. Sized small enough to minimally overlap
 * the title bar text, and folded toward the bottom-right so the visual
 * peel reads as paper coming off the top-left corner.
 *
 * In the deck view's category stacks the only visible portion of a
 * stacked card is the top sliver, so this *must* live in the top edge
 * — top-right would cover the mana cost, top-left covers a few title
 * characters but lets you still read most of the name and the cost.
 */
export function DogEar({ count, cardWidth }: Props) {
  // Badge dimensions: wider than tall so the triangle's right vertex
  // extends further across the top of the card while the left vertex
  // stays shallow. Scales with card width, with floors so two-digit
  // counts stay readable at the smallest zoom.
  const width = Math.max(34, cardWidth * 0.28);
  const height = Math.max(18, cardWidth * 0.12);

  return (
    <div
      aria-label={`${count} copies`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        background: colors.accent,
        color: "#0a0a0c",
        fontWeight: 800,
        fontSize: height * 0.62,
        lineHeight: 1,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        paddingTop: height * 0.06,
        paddingLeft: width * 0.08,
        boxSizing: "border-box",
        // Right triangle filling the top-left half of the box. Hypotenuse
        // runs from the top-right corner down to the bottom-left corner.
        clipPath: "polygon(0 0, 100% 0, 0 100%)",
        pointerEvents: "none",
      }}
    >
      {count}
    </div>
  );
}
