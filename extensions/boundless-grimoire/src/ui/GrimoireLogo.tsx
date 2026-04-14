import type { CSSProperties } from "react";

interface Props {
  /** Square size in px. Defaults to filling the parent when undefined. */
  size?: number;
  /** When true, shows the open-book variant regardless of hover. */
  open?: boolean;
  /** Cross-fade to the open-book variant on hover. Ignored when `open` is set. */
  hoverSwap?: boolean;
  /** Speed up the swirl animation (used by the trigger button on hover). */
  fast?: boolean;
  /** Zoom + shift the icon to fill a small frame tightly (trigger button). */
  framed?: boolean;
  style?: CSSProperties;
  title?: string;
}

/**
 * The Boundless Grimoire mark — animated gradient clipped to the book
 * silhouette. Two stacked layers (closed + open) cross-fade on hover or
 * when `open` is forced.
 */
export function GrimoireLogo({ size, open, hoverSwap, fast, framed, style, title }: Props) {
  return (
    <div
      className="bg-grimoire-logo"
      data-open={open ? "true" : "false"}
      data-hover-swap={hoverSwap ? "true" : "false"}
      data-fast={fast ? "true" : "false"}
      data-framed={framed ? "true" : "false"}
      role="img"
      aria-label="Boundless Grimoire"
      title={title}
      style={size ? { width: size, height: size, ...style } : style}
    >
      <div className="bg-grimoire-logo__layer bg-grimoire-logo__layer--closed" />
      <div className="bg-grimoire-logo__layer bg-grimoire-logo__layer--open" />
    </div>
  );
}
