import type { MouseEvent } from "react";
import { FloatingCardButton } from "@boundless-grimoire/ui";

interface Props {
  onClick: (e: MouseEvent) => void;
}

/**
 * Hover-revealed "..." button at the bottom-center of a card. Click
 * opens the print picker for the parent card. Visibility is controlled
 * by the parent (CardWithCount) so the button only appears while the
 * card is hovered.
 */
export function PrintPickerButton({ onClick }: Props) {
  return (
    <FloatingCardButton
      placement="bottom"
      title="Choose printing"
      ariaLabel="Choose printing"
      onClick={onClick}
      style={{ fontSize: 14, lineHeight: 1, fontWeight: 800, letterSpacing: 1 }}
    >
      …
    </FloatingCardButton>
  );
}
