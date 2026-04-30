import type { CSSProperties, MouseEvent, ReactNode } from "react";

type Placement = "center" | "bottom";

interface Props {
  placement: Placement;
  title: string;
  ariaLabel: string;
  onClick: (e: MouseEvent) => void;
  children: ReactNode;
  /** Override the default shape for this placement (e.g. circle vs pill). */
  shape?: "circle" | "pill";
  /** Inline style overrides — keep narrow; layout/visual defaults live here. */
  style?: CSSProperties;
}

const SHELL_BG = "rgba(21,21,26,0.92)";
const SHELL_FG = "#ffffff";
// Triple shadow: thin white halo, dark outer ring, soft drop. Matches
// Scryfall's hover-button language so flip / print-picker stay coherent.
const SHELL_SHADOW =
  "0 0 0 1.5px white, 0 0 0 3px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.55)";

const placementStyles: Record<Placement, CSSProperties> = {
  center: {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  },
  bottom: {
    bottom: 6,
    left: "50%",
    transform: "translateX(-50%)",
  },
};

const shapeStyles: Record<NonNullable<Props["shape"]>, CSSProperties> = {
  circle: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    padding: 0,
  },
  pill: {
    borderRadius: 999,
    padding: "2px 10px",
  },
};

const defaultShape: Record<Placement, NonNullable<Props["shape"]>> = {
  center: "circle",
  bottom: "pill",
};

/**
 * Floating button overlaid on a card thumbnail. The shell — dark fill,
 * white halo + outer-ring + drop shadow, click-stop behaviour — is the
 * shared language across hover affordances (flip, print picker). Callers
 * supply their own glyph as `children` and pick a placement.
 */
export function FloatingCardButton({
  placement,
  title,
  ariaLabel,
  onClick,
  children,
  shape,
  style,
}: Props) {
  const resolvedShape = shape ?? defaultShape[placement];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onContextMenu={(e) => e.stopPropagation()}
      title={title}
      aria-label={ariaLabel}
      style={{
        position: "absolute",
        background: SHELL_BG,
        color: SHELL_FG,
        border: "none",
        boxShadow: SHELL_SHADOW,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3,
        ...placementStyles[placement],
        ...shapeStyles[resolvedShape],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
