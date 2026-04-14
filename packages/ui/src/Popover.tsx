import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { colors } from "./colors";

interface Props {
  /** Element rendered inline; clicking is the parent's responsibility. */
  trigger: ReactNode;
  /** Floating panel content. Only mounted when `open`. */
  children: ReactNode;
  open: boolean;
  /** Called when the popover should close (click outside, Esc). */
  onClose: () => void;
  /** Min width of the popover panel. Default: unset (sized to content). */
  minWidth?: number;
  /** Cap on the panel's height before its content scrolls. */
  maxHeight?: number;
  /** Anchor edge of the trigger to align the panel to. */
  align?: "left" | "right";
  /**
   * If true, the trigger wrapper spans its container (display: block).
   * Default false keeps the legacy inline-block behavior.
   */
  triggerFullWidth?: boolean;
}

interface Position {
  /** Vertical placement chosen by collision check. */
  placement: "below" | "above";
  /** CSS `top` for "below", or undefined for "above". */
  top?: number;
  /** CSS `bottom` for "above", or undefined for "below". */
  bottom?: number;
  /** CSS `left` for align=left, or undefined for align=right. */
  left?: number;
  /** CSS `right` for align=right, or undefined for align=left. */
  right?: number;
  /** Available height after the chosen placement, capped to maxHeight. */
  maxH: number;
  /** Available width from the chosen left edge to the viewport edge. */
  maxW: number;
}

const GAP = 4;
const VIEWPORT_MARGIN = 8;

/**
 * Generic anchored popover.
 *
 * - Trigger is rendered inline as the parent's child; the parent owns the
 *   open state and is responsible for calling onClose.
 * - The panel is rendered into `document.body` via createPortal so it
 *   escapes any overflow:hidden / scrollable ancestors.
 * - Position is computed from the trigger's bounding rect every time the
 *   popover opens, and re-computed on scroll/resize while open.
 * - Vertical collision: if there isn't enough room below the trigger,
 *   the panel flips above. The chosen side gets a maxHeight cap so the
 *   panel never overflows the viewport.
 * - Horizontal: maxWidth is clamped to fit between the chosen left edge
 *   and the right viewport margin.
 */
export function Popover({
  trigger,
  children,
  open,
  onClose,
  minWidth,
  maxHeight = 320,
  align = "left",
  triggerFullWidth = false,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Position | null>(null);

  // ---- click outside / Esc -------------------------------------------------
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose]);

  // ---- positioning ---------------------------------------------------------
  const reposition = useCallback(() => {
    const trig = wrapperRef.current;
    if (!trig) return;
    const rect = trig.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - rect.bottom - GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;

    // Pick "above" only when "below" is meaningfully cramped AND there's
    // more room above. Otherwise prefer "below" so most popovers feel
    // consistent.
    const placement: Position["placement"] =
      spaceBelow < Math.min(maxHeight, 200) && spaceAbove > spaceBelow
        ? "above"
        : "below";

    const maxH = Math.max(
      120,
      Math.min(maxHeight, placement === "below" ? spaceBelow : spaceAbove),
    );

    // Horizontal anchor
    const horizontal: Pick<Position, "left" | "right" | "maxW"> =
      align === "left"
        ? {
            left: Math.max(VIEWPORT_MARGIN, rect.left),
            maxW: vw - Math.max(VIEWPORT_MARGIN, rect.left) - VIEWPORT_MARGIN,
          }
        : {
            right: Math.max(VIEWPORT_MARGIN, vw - rect.right),
            maxW:
              rect.right -
              VIEWPORT_MARGIN -
              Math.max(VIEWPORT_MARGIN, vw - rect.right - VIEWPORT_MARGIN),
          };

    setPos({
      placement,
      top: placement === "below" ? rect.bottom + GAP : undefined,
      bottom: placement === "above" ? vh - rect.top + GAP : undefined,
      ...horizontal,
      maxH,
    });
  }, [align, maxHeight]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    reposition();
    // Capture phase so we hear scrolls of any ancestor scroll container
    // (the overlay body in particular).
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  return (
    <>
      <div
        ref={wrapperRef}
        style={{
          position: "relative",
          display: triggerFullWidth ? "block" : "inline-block",
          width: triggerFullWidth ? "100%" : undefined,
        }}
      >
        {trigger}
      </div>
      {open && pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            style={{
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              right: pos.right,
              minWidth,
              width: "max-content",
              maxWidth: pos.maxW,
              maxHeight: pos.maxH,
              zIndex: 2147483647,
              background: colors.bg1,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              fontFamily: "system-ui, sans-serif",
              color: colors.text,
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
