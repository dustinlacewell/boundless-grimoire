import type { CSSProperties } from "react";
import { colors } from "@boundless-grimoire/ui";
import type { Deck } from "../storage/types";
import { DeckColumnSortPicker } from "./DeckColumnSortPicker";
import { DeckFormatPicker } from "./DeckFormatPicker";
import { DeckGroupByPicker } from "./DeckGroupByPicker";
import { DeckLayoutToggle } from "./DeckLayoutToggle";
import { LegalityBadge } from "./LegalityBadge";

interface Props {
  deck: Deck;
}

const labelStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: colors.textMuted,
  fontWeight: 700,
};

const clusterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

/**
 * Right-aligned cluster of per-entity pickers (Layout, Group, Sort,
 * Format/Legality) that sits in the entity section's controls slot.
 * Format + legality only render for constructed decks — cubes hide
 * them since format / legality don't apply.
 */
export function EntityHeaderControls({ deck }: Props) {
  return (
    <>
      <div style={clusterStyle}>
        <span style={labelStyle}>Layout</span>
        <DeckLayoutToggle deckId={deck.id} layout={deck.layout} />
      </div>
      <div style={clusterStyle}>
        <span style={labelStyle}>Group</span>
        <DeckGroupByPicker
          deckId={deck.id}
          groupBy={deck.groupBy}
          hideMeta={deck.isCube}
        />
      </div>
      <div style={clusterStyle}>
        <span style={labelStyle}>Sort</span>
        <DeckColumnSortPicker deckId={deck.id} columnSort={deck.columnSort} />
      </div>
      {!deck.isCube && (
        <div style={clusterStyle}>
          <span style={labelStyle}>Format</span>
          <LegalityBadge deckId={deck.id} hasFormat={deck.formatIndex != null} />
          <DeckFormatPicker deckId={deck.id} formatIndex={deck.formatIndex} />
        </div>
      )}
    </>
  );
}
