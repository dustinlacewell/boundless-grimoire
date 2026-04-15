import { setDeckLayout } from "../storage/deckStore";
import { ButtonGroup } from "@boundless-grimoire/ui";

interface Props {
  deckId: string;
  layout: "scroll" | "wrap";
}

const options = [
  { value: "scroll" as const, label: "Scroll", title: "Columns sit in one row, scrolls horizontally" },
  { value: "wrap" as const, label: "Wrap", title: "Columns wrap to multiple rows" },
];

/**
 * Per-deck layout toggle (scroll / wrap). Writes to `Deck.layout` via
 * the store so each deck / cube remembers its own layout. Sits next to
 * the format + grouping pickers in the entity header.
 */
export function DeckLayoutToggle({ deckId, layout }: Props) {
  return (
    <ButtonGroup
      options={options}
      isSelected={(v) => v === layout}
      onToggle={(v) => setDeckLayout(deckId, v)}
      size="sm"
    />
  );
}
