import type { ColumnSort } from "../cards/categorize";
import { setDeckColumnSort } from "../storage/deckStore";
import { Dropdown } from "@boundless-grimoire/ui";

interface Props {
  deckId: string;
  columnSort: ColumnSort;
}

const options = [
  { value: "cmc" as const, label: "CMC" },
  { value: "name" as const, label: "Name" },
  { value: "color" as const, label: "Color" },
];

/**
 * Per-deck sort picker for the order of cards *within* each column.
 * Distinct from the search results grid sort (`deck.sortField`).
 */
export function DeckColumnSortPicker({ deckId, columnSort }: Props) {
  return (
    <Dropdown
      options={options}
      value={columnSort}
      onChange={(v) => v && setDeckColumnSort(deckId, v)}
      compact
    />
  );
}
