/**
 * Tiny inline SVG icon set. Each icon is a stroke-only path on a 24px
 * viewBox so they look consistent at any size and respect currentColor.
 */
import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  style?: CSSProperties;
  title?: string;
}

const baseProps = (size: number, title: string | undefined) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-label": title,
  role: title ? "img" : undefined,
});

export function TrashIcon({ size = 16, style, title = "Delete" }: IconProps) {
  return (
    <svg {...baseProps(size, title)} style={style}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function DuplicateIcon({ size = 16, style, title = "Duplicate" }: IconProps) {
  return (
    <svg {...baseProps(size, title)} style={style}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 012-2h9" />
    </svg>
  );
}

export function GearIcon({ size = 16, style, title = "Settings" }: IconProps) {
  return (
    <svg {...baseProps(size, title)} style={style}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export function ClipboardIcon({ size = 16, style, title = "Copy" }: IconProps) {
  return (
    <svg {...baseProps(size, title)} style={style}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4" />
    </svg>
  );
}
