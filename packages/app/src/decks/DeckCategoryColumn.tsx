import { CategoryStack } from "../cards/CategoryStack";
import type { DeckCategoryGroup } from "../cards/categorize";
import type { CardSnapshot } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";

interface Props {
  group: DeckCategoryGroup;
  cardWidth: number;
  onIncrement: (snapshot: CardSnapshot) => void;
  onDecrement: (cardId: string) => void;
  onPickPrint?: (snapshot: CardSnapshot) => void;
  onAltClick?: (snapshot: CardSnapshot) => void;
  onSetCover?: (snapshot: CardSnapshot) => void;
  onSetCommander?: (snapshot: CardSnapshot) => void;
  illegalCards?: Set<string>;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: colors.textMuted,
  marginBottom: 6,
  fontWeight: 700,
  // Wrap long titles (e.g. "The Lost Caverns of Ixalan") instead of
  // bleeding into the next column. `break-word` handles set names that
  // contain a single unusually long word. Line-height tightens the
  // two-line case so it doesn't push the cards too far down.
  whiteSpace: "normal",
  overflowWrap: "break-word",
  lineHeight: 1.2,
};

/**
 * One column in the deck view: a category title above its CategoryStack.
 */
export function DeckCategoryColumn({
  group,
  cardWidth,
  onIncrement,
  onDecrement,
  onPickPrint,
  onAltClick,
  onSetCover,
  onSetCommander,
  illegalCards,
}: Props) {
  const total = group.cards.reduce((sum, c) => sum + c.count, 0);
  return (
    <div
      style={{
        flex: "0 0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: cardWidth,
      }}
    >
      <div style={labelStyle}>
        {group.name} · <span style={{ color: colors.accent }}>{total}</span>
      </div>
      <CategoryStack
        cards={group.cards}
        cardWidth={cardWidth}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onPickPrint={onPickPrint}
        onAltClick={onAltClick}
        onSetCover={onSetCover}
        onSetCommander={onSetCommander}
        illegalCards={illegalCards}
      />
    </div>
  );
}
