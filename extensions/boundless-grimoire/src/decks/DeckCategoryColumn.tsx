import { CategoryStack } from "../cards/CategoryStack";
import type { DeckCategoryGroup } from "../cards/categorize";
import type { CardSnapshot } from "../storage/types";
import { colors } from "../ui/colors";

interface Props {
  group: DeckCategoryGroup;
  cardWidth: number;
  onIncrement: (snapshot: CardSnapshot) => void;
  onDecrement: (cardId: string) => void;
  onPickPrint?: (snapshot: CardSnapshot) => void;
  onAltClick?: (snapshot: CardSnapshot) => void;
  illegalCards?: Set<string>;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: colors.textMuted,
  marginBottom: 6,
  fontWeight: 700,
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
        {group.name} · {total}
      </div>
      <CategoryStack
        cards={group.cards}
        cardWidth={cardWidth}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onPickPrint={onPickPrint}
        onAltClick={onAltClick}
        illegalCards={illegalCards}
      />
    </div>
  );
}
