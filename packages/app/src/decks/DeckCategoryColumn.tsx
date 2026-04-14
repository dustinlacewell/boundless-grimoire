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
  whiteSpace: "nowrap",
};

/**
 * Minimum column width so the category heading never wraps, regardless
 * of how far the user zooms out. Sized for the longest category
 * ("Planeswalkers") + " · NN" at the label font. The card art inside
 * still renders at `cardWidth`; any extra width shows as empty space
 * to the right of the stack.
 */
const MIN_COLUMN_WIDTH = 150;

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
        width: Math.max(cardWidth, MIN_COLUMN_WIDTH),
      }}
    >
      <div style={labelStyle}>
        {group.name} · {total}
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
