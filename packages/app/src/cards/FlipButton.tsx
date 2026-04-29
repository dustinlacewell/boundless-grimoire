import type { MouseEvent } from "react";

interface Props {
  flipped: boolean;
  onClick: (e: MouseEvent) => void;
}

/**
 * Hover-revealed transform button, styled after Scryfall's flip affordance:
 * white circular button, centered on the card, SVG transform icon.
 */
export function FlipButton({ flipped, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onContextMenu={(e) => e.stopPropagation()}
      title={flipped ? "Show front face" : "Show back face"}
      aria-label={flipped ? "Show front face" : "Show back face"}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(21,21,26,0.92)",
        color: "#ffffff",
        border: "none",
        borderRadius: "50%",
        width: 40,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 0 0 1.5px white, 0 0 0 3px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.55)",
        zIndex: 3,
        padding: 0,
      }}
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
        {/* Two circular arrows indicating transform */}
        <path d="M1 4v6h6" />
        <path d="M23 20v-6h-6" />
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10" />
        <path d="M3.51 15a9 9 0 0 0 14.85 3.36L23 14" />
      </svg>
    </button>
  );
}
