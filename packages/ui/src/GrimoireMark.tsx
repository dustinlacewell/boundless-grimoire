import type { CSSProperties } from "react";
import "./grimoire-logo.css";

// Resolve the icon URLs via `new URL(..., import.meta.url)` so each
// consumer's bundler emits them as proper assets and produces URLs that
// resolve against the runtime origin of this module — not against the
// host page. This is what makes the mark render correctly inside a
// Chrome content script (where `chrome-extension://` is the real origin)
// without baking that URL at build time.
const ICON_CLOSED = new URL("./icon.png", import.meta.url).href;
const ICON_OPEN = new URL("./icon-open.png", import.meta.url).href;

interface Props {
  /** Which book art to render. Defaults to the closed book. */
  variant?: "closed" | "open";
  /** Square size in px. Omit to fill the parent. */
  size?: number;
  /** Crop + shift the icon to fill a small frame tightly (trigger button). */
  framed?: boolean;
  /** Speed up the swirl animation. */
  fast?: boolean;
  style?: CSSProperties;
  title?: string;
}

/**
 * A single Boundless Grimoire mark — the gradient + mask for one book
 * variant. Static; no transitions, no hover behavior. Use `GrimoireLogo`
 * when you want the cross-fade between closed and open.
 */
export function GrimoireMark({ variant = "closed", size, framed, fast, style, title }: Props) {
  const iconUrl = variant === "open" ? ICON_OPEN : ICON_CLOSED;
  const cssVars = {
    "--bg-grimoire-icon": `url("${iconUrl}")`,
  } as CSSProperties;

  return (
    <div
      className="bg-grimoire-mark"
      data-variant={variant}
      data-framed={framed ? "true" : "false"}
      data-fast={fast ? "true" : "false"}
      role="img"
      aria-label="Boundless Grimoire"
      title={title}
      style={size ? { width: size, height: size, ...cssVars, ...style } : { ...cssVars, ...style }}
    />
  );
}
