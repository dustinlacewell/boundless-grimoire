import type { CSSProperties } from "react";
import { colors, IconButton } from "@boundless-grimoire/ui";
import type { Deck } from "../storage/types";
import { DeckColumnSortPicker } from "./DeckColumnSortPicker";
import { DeckFormatPicker } from "./DeckFormatPicker";
import { DeckGroupByPicker } from "./DeckGroupByPicker";
import { DeckLayoutToggle } from "./DeckLayoutToggle";
import { LegalityBadge } from "./LegalityBadge";
import { openTestDraw } from "./testDrawStore";

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
      {!deck.isCube && (
        <IconButton title="Test Draw" onClick={() => openTestDraw(deck)} size={26}>
          <HandIcon size={14} />
        </IconButton>
      )}
    </>
  );
}

/** Simple playing-card hand icon (SVG). */
function HandIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Two fanned cards */}
      <rect x="4" y="3" width="10" height="14" rx="1.5" transform="rotate(-8 9 10)" />
      <rect x="10" y="3" width="10" height="14" rx="1.5" transform="rotate(8 15 10)" />
    </svg>
  );
}
