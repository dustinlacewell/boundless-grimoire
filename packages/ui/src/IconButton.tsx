import type { CSSProperties, MouseEvent, ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  /** Diameter in px. Defaults to 26. */
  size?: number;
  /** Stop event propagation so parent click handlers don't fire. */
  stopPropagation?: boolean;
  style?: CSSProperties;
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
  style,
}: Props) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onClick(e);
      }}
      className="inline-flex items-center justify-center rounded-full p-0 box-border cursor-pointer text-text border border-border-strong bg-[rgba(15,15,18,0.8)]"
      style={{ width: size, height: size, ...style }}
    >
      {children}
    </button>
  );
}
