import type { MouseEvent, ReactNode } from "react";
import { colors } from "./colors";

interface Props {
  children: ReactNode;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  size?: number;
  /** Stop event propagation so parent click handlers don't fire. */
  stopPropagation?: boolean;
}

/**
 * Compact circular icon button. Used for inline actions like the
 * delete/duplicate/copy buttons on deck ribbon tiles.
 */
export function IconButton({
  children,
  onClick,
  title,
  size = 26,
  stopPropagation = true,
}: Props) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onClick(e);
      }}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(15,15,18,0.8)",
        color: colors.text,
        border: `1px solid ${colors.borderStrong}`,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      {children}
    </button>
  );
}
