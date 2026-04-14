import { useFilterStore } from "../store";
import { SearchInput } from "@boundless-grimoire/ui";

/** Oracle text search — maps to Scryfall `oracle:`. */
export function CardTextFilter() {
  const cardText = useFilterStore((s) => s.state.cardText);
  const patch = useFilterStore((s) => s.patch);
  return (
    <SearchInput
      value={cardText ?? ""}
      onChange={(e) => patch({ cardText: e.target.value })}
      placeholder="Card Text…"
    />
  );
}
