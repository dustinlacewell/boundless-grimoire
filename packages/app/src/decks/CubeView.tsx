import { groupDeck } from "../cards/categorize";
import { openPrintPicker } from "../cards/printPickerStore";
import { decrementCard, incrementCard } from "../commands/cardActions";
import { setDeckCover } from "../storage/deckStore";
import type { CardSnapshot, Deck } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { CardColumnGrid } from "./CardColumnGrid";

interface Props {
  cube: Deck;
}

const emptyStyle: React.CSSProperties = {
  fontSize: 13,
  color: colors.textMuted,
  padding: "16px 4px",
};

/**
 * Detail view for a draft cube.
 *
 * Differences from `DeckView`:
 *   - No commander slot, no sideboard, no format/legality
 *   - Default grouping is "by zone" (cubes organize into basics +
 *     group-1…group-10). If the user picks a different grouping
 *     (category / cmc / set), that wins — we respect the setting.
 *   - Card-row rendering + ctrl-wheel resize delegated to
 *     `CardColumnGrid`, same as decks.
 *
 * Meta grouping isn't offered for cubes (the custom-query pipeline is
 * deck-oriented) — if selected, we silently fall back to zone.
 */
export function CubeView({ cube }: Props) {
  // Meta grouping isn't meaningful for cubes — the custom-query
  // pipeline is deck-oriented — so if the user picks "meta" for a
  // cube we silently fall back to its zone layout.
  const mode = cube.groupBy === "meta" ? "zone" : cube.groupBy;
  const groups = groupDeck(cube.cards, mode, { sort: cube.columnSort });

  if (groups.length === 0) {
    return <div style={emptyStyle}>This cube is empty. Add a card to get started.</div>;
  }

  const onIncrement = (snapshot: CardSnapshot) => incrementCard(cube.id, snapshot);
  const onDecrement = (cardId: string) => decrementCard(cube.id, cardId);
  const onPickPrint = (snapshot: CardSnapshot) => openPrintPicker(cube.id, snapshot);
  const onSetCover = (snapshot: CardSnapshot) => setDeckCover(cube.id, snapshot.id);

  return (
    <CardColumnGrid
      groups={groups}
      layout={cube.layout}
      onIncrement={onIncrement}
      onDecrement={onDecrement}
      onPickPrint={onPickPrint}
      onSetCover={onSetCover}
    />
  );
}
