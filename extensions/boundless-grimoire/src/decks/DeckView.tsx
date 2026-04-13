import { useEffect } from "react";
import { categorizeDeck } from "../cards/categorize";
import { openPrintPicker } from "../cards/printPickerStore";
import { useCustomFormatStore } from "../filters/customFormatStore";
import { decrementCard, incrementCard, moveCardToZone } from "../storage/deckStore";
import type { CardSnapshot, Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { DeckCategoryColumn } from "./DeckCategoryColumn";
import { checkLegality, clearLegality, useLegalityStore } from "./legalityStore";

interface Props {
  deck: Deck;
  cardWidth?: number;
}

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  gap: 24,
  alignItems: "flex-start",
  overflowX: "auto",
  overflowY: "visible",
  padding: "4px 4px 16px",
};

const emptyStyle: React.CSSProperties = {
  fontSize: 13,
  color: colors.textMuted,
  padding: "16px 4px",
};

const sideboardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: colors.textMuted,
  fontWeight: 700,
  padding: "8px 4px 4px",
  borderTop: `1px solid ${colors.textMuted}40`,
  marginTop: 8,
};

export function DeckView({ deck, cardWidth = 180 }: Props) {
  const formats = useCustomFormatStore((s) => s.formats);
  const formatFragment = deck.formatIndex != null ? formats[deck.formatIndex]?.fragment : null;
  const illegalSet = useLegalityStore((s) => s.illegalByDeck[deck.id]);

  // Run legality check when format or cards change.
  useEffect(() => {
    if (!formatFragment) {
      clearLegality(deck.id);
      return;
    }
    void checkLegality(deck.id, formatFragment, deck.cards, deck.sideboard);
  }, [deck.id, formatFragment, deck.cards, deck.sideboard]);

  const mainGroups = categorizeDeck(deck.cards);
  const sideGroups = categorizeDeck(deck.sideboard);

  if (mainGroups.length === 0 && sideGroups.length === 0) {
    return <div style={emptyStyle}>This deck is empty. Add a card to get started.</div>;
  }

  const onIncrement = (snapshot: CardSnapshot) => incrementCard(deck.id, snapshot);
  const onDecrement = (cardId: string) => decrementCard(deck.id, cardId);
  const onPickPrint = (snapshot: CardSnapshot) => openPrintPicker(deck.id, snapshot);
  const onAltClickMain = (snapshot: CardSnapshot) => moveCardToZone(deck.id, snapshot.id, "main");

  const onSideIncrement = (snapshot: CardSnapshot) => incrementCard(deck.id, snapshot, "sideboard");
  const onSideDecrement = (cardId: string) => decrementCard(deck.id, cardId, "sideboard");
  const onAltClickSide = (snapshot: CardSnapshot) => moveCardToZone(deck.id, snapshot.id, "sideboard");

  return (
    <div>
      {mainGroups.length > 0 && (
        <div style={wrapperStyle}>
          {mainGroups.map((group) => (
            <DeckCategoryColumn
              key={group.name}
              group={group}
              cardWidth={cardWidth}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onPickPrint={onPickPrint}
              onAltClick={onAltClickMain}
              illegalCards={illegalSet}
            />
          ))}
        </div>
      )}
      {sideGroups.length > 0 && (
        <>
          <div style={sideboardLabelStyle}>
            Sideboard · {Object.values(deck.sideboard).reduce((s, c) => s + c.count, 0)}
          </div>
          <div style={wrapperStyle}>
            {sideGroups.map((group) => (
              <DeckCategoryColumn
                key={`sb-${group.name}`}
                group={group}
                cardWidth={cardWidth}
                onIncrement={onSideIncrement}
                onDecrement={onSideDecrement}
                onPickPrint={onPickPrint}
                onAltClick={onAltClickSide}
                illegalCards={illegalSet}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
