import type { MouseEvent } from "react";
import { colors } from "../ui/colors";

interface Props {
  onClick: (e: MouseEvent) => void;
}

/**
 * Hover-revealed "..." button at the bottom-center of a card.
 * Click opens the print picker for the parent card. The button stops
 * propagation so the underlying card click (left=+1 / right=-1)
 * doesn't fire.
 *
 * Visibility is controlled by the parent (CardWithCount) so the button
 * only appears while the card is hovered.
 */
export function PrintPickerButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onContextMenu={(e) => e.stopPropagation()}
      title="Choose printing"
      aria-label="Choose printing"
      style={{
        position: "absolute",
        bottom: 6,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(15,15,18,0.85)",
        color: colors.text,
        border: `1px solid ${colors.borderStrong}`,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 14,
        lineHeight: 1,
        fontWeight: 800,
        cursor: "pointer",
        letterSpacing: 1,
        zIndex: 3,
      }}
    >
      …
    </button>
  );
}
