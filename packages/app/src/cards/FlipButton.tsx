import type { MouseEvent } from "react";
import { FloatingCardButton } from "@boundless-grimoire/ui";

interface Props {
  flipped: boolean;
  onClick: (e: MouseEvent) => void;
}

/**
 * Hover-revealed transform button, centered on the card. Mirrors
 * Scryfall's flip affordance: SVG transform glyph, mirrored horizontally
 * once the back face is showing.
 */
export function FlipButton({ flipped, onClick }: Props) {
  const label = flipped ? "Show front face" : "Show back face";
  return (
    <FloatingCardButton
      placement="center"
      title={label}
      ariaLabel={label}
      onClick={onClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: flipped ? "scaleX(-1)" : "none" }}
      >
        <path d="M1 4v6h6" />
        <path d="M23 20v-6h-6" />
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10" />
        <path d="M3.51 15a9 9 0 0 0 14.85 3.36L23 14" />
      </svg>
    </FloatingCardButton>
  );
}
