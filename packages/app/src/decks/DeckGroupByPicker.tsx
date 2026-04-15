import type { DeckGroupBy } from "../cards/categorize";
import { setDeckGroupBy } from "../storage/deckStore";
import { Dropdown } from "@boundless-grimoire/ui";

interface Props {
  deckId: string;
  groupBy: DeckGroupBy;
  /**
   * Hide the "Meta" option. Meta grouping classifies cards via the
   * custom-query oracle tag pipeline, which isn't meaningful for cubes.
   */
  hideMeta?: boolean;
}

const labelFor: Record<DeckGroupBy, string> = {
  category: "Category",
  cmc: "CMC",
  meta: "Meta",
  zone: "Zone",
  set: "Set",
};

/**
 * Per-deck grouping picker. Writes to `Deck.groupBy` via the store so
 * each deck/cube remembers its own layout. Lives alongside the format
 * picker in the entity header.
 */
export function DeckGroupByPicker({ deckId, groupBy, hideMeta }: Props) {
  const modes: DeckGroupBy[] = hideMeta
    ? ["category", "cmc", "zone", "set"]
    : ["category", "cmc", "meta", "zone", "set"];
  const options = modes.map((m) => ({ value: m, label: labelFor[m] }));
  return (
    <Dropdown
      options={options}
      value={groupBy}
      onChange={(v) => v && setDeckGroupBy(deckId, v)}
      compact
    />
  );
}
