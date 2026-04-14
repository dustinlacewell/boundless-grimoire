import type { MouseEvent } from "react";
import { toSnapshot } from "../scryfall/snapshot";
import type { ScryfallCard } from "../scryfall/types";
import { colors } from "@boundless-grimoire/ui";
import { CardImage } from "./CardImage";
import { useCardHoverPreview } from "./useCardHoverPreview";

interface Props {
  card: ScryfallCard;
  width: number;
  selected: boolean;
  onSelect: (card: ScryfallCard) => void;
}

const labelStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: colors.textMuted,
  textAlign: "center",
  lineHeight: 1.3,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

const setBadgeStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  color: colors.text,
};

/**
 * One printing tile in the print picker grid.
 *
 * - Click → onSelect (parent applies the swap and closes the modal)
 * - Ctrl-hover → triggers the global card preview overlay (same as
 *   regular cards in the deck/grid)
 * - Selected printing gets an accent border so the user can see what
 *   they currently have
 */
export function PrintTile({ card, width, selected, onSelect }: Props) {
  const snapshot = toSnapshot(card);
  const { handlers: hoverHandlers } = useCardHoverPreview(snapshot, "print");

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    onSelect(card);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        width,
      }}
      onClick={handleClick}
      {...hoverHandlers}
      title={`${card.set_name} (${card.set.toUpperCase()}) #${card.collector_number}`}
    >
      <div
        style={{
          padding: 2,
          borderRadius: width * 0.045 + 4,
          background: selected ? colors.accent : "transparent",
          transition: "background 80ms linear",
        }}
      >
        <CardImage snapshot={snapshot} width={width - 4} />
      </div>
      <div style={labelStyle}>
        <span style={setBadgeStyle}>{card.set.toUpperCase()}</span>
        #{card.collector_number}
      </div>
    </div>
  );
}
