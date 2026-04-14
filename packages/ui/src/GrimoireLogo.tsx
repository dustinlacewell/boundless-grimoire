import type { CSSProperties } from "react";
import { GrimoireMark } from "./GrimoireMark";
import "./grimoire-logo.css";

interface Props {
  /** Square size in px. Omit to fill the parent. */
  size?: number;
  /** Force the open-book variant regardless of hover. */
  open?: boolean;
  /** Cross-fade to the open variant on hover. Ignored when `open` is set. */
  hoverSwap?: boolean;
  /** Speed up the swirl animation (used by the trigger button on hover). */
  fast?: boolean;
  /** Crop + shift the icons to fill a small frame tightly (trigger button). */
  framed?: boolean;
  style?: CSSProperties;
  title?: string;
}

/**
 * Two `GrimoireMark`s stacked — closed on top of open — that cross-fade
 * between each other on hover or when `open` is set. For a static logo
 * with no animation behavior, use `GrimoireMark` directly.
 */
export function GrimoireLogo({ size, open, hoverSwap, fast, framed, style, title }: Props) {
  return (
    <div
      className="bg-grimoire-logo"
      data-open={open ? "true" : "false"}
      data-hover-swap={hoverSwap ? "true" : "false"}
      title={title}
      style={size ? { width: size, height: size, ...style } : style}
    >
      <GrimoireMark variant="closed" framed={framed} fast={fast} />
      <GrimoireMark variant="open" framed={framed} fast={fast} />
    </div>
  );
}
