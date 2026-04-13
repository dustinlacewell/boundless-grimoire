import { useFilterStore } from "../store";
import { SearchInput } from "../../ui/SearchInput";

/** Card name search — maps to Scryfall `name:`. */
export function CardNameFilter() {
  const cardName = useFilterStore((s) => s.state.cardName);
  const patch = useFilterStore((s) => s.patch);
  return (
    <SearchInput
      value={cardName ?? ""}
      onChange={(e) => patch({ cardName: e.target.value })}
      placeholder="Card Name…"
    />
  );
}
