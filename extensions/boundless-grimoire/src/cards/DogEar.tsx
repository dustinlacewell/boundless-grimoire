import { colors } from "../ui/colors";

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
  // 17% of card width, with a 20px floor so two-digit counts fit
  // comfortably even at the smallest grid sizes. Card height is
  // irrelevant — the badge is anchored to the top edge regardless of
  // aspect.
  const size = Math.max(20, cardWidth * 0.17);

  return (
    <div
      aria-label={`${count} copies`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: size,
        height: size,
        background: colors.accent,
        color: "#0a0a0c",
        fontWeight: 800,
        fontSize: size * 0.5,
        lineHeight: 1,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        paddingTop: size * 0.08,
        paddingLeft: size * 0.18,
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
