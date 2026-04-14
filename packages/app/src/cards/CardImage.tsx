import type { CSSProperties } from "react";
import type { CardSnapshot } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { imageUrl } from "./imageUrl";

interface Props {
  snapshot: CardSnapshot;
  /** Visual width in px. Height is derived from MTG card aspect ratio. */
  width: number;
  size?: "small" | "normal" | "large";
  style?: CSSProperties;
}

/** Standard MTG card aspect ratio (width / height). */
export const CARD_ASPECT = 488 / 680;

export function cardHeightFor(width: number): number {
  return Math.round(width / CARD_ASPECT);
}

/**
 * Pure card image. No interaction, no badges. Composes into CardWithCount
 * for the actual deck-view tile.
 */
export function CardImage({ snapshot, width, size = "normal", style }: Props) {
  const url = imageUrl(snapshot, size);
  const height = cardHeightFor(width);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: width * 0.06, // clip the card frame's own white corners
        background: colors.bg0,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      {url ? (
        <img
          src={url}
          alt={snapshot.name}
          loading="lazy"
          draggable={false}
          style={{ width: "100%", height: "100%", display: "block", userSelect: "none", objectFit: "cover", scale: "1.02" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.textMuted,
            fontSize: 12,
            padding: 8,
            textAlign: "center",
          }}
        >
          {snapshot.name}
        </div>
      )}
    </div>
  );
}
