import { useEffect, useState, type MouseEvent } from "react";
import type { CardSnapshot } from "../storage/types";
import { hideCardPreview, mousePos, showCardPreview, showPrintPreview } from "./cardPreviewStore";

type Mode = "card" | "print";

interface Result {
  hovered: boolean;
  handlers: {
    onMouseEnter: () => void;
    onMouseMove: (e: MouseEvent) => void;
    onMouseLeave: () => void;
  };
}

/**
 * Shared Ctrl+hover preview trigger. Spread the returned handlers on any
 * element that wraps a card image to make the large preview pop open while
 * Ctrl is held.
 *
 * Mode "card" shows the full preview; "print" is the simpler variant used
 * by the print picker.
 */
export function useCardHoverPreview(snapshot: CardSnapshot | null | undefined, mode: Mode = "card"): Result {
  const [hovered, setHovered] = useState(false);
  const show = mode === "print" ? showPrintPreview : showCardPreview;

  useEffect(() => {
    if (!hovered || !snapshot) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") show(snapshot);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hovered, snapshot, show]);

  return {
    hovered,
    handlers: {
      onMouseEnter: () => setHovered(true),
      onMouseMove: (e) => {
        mousePos.x = e.clientX;
        mousePos.y = e.clientY;
        if (!snapshot) return;
        if (e.ctrlKey) show(snapshot);
        else hideCardPreview();
      },
      onMouseLeave: () => {
        setHovered(false);
        hideCardPreview();
      },
    },
  };
}
