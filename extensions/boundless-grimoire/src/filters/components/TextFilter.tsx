import { useFilterStore } from "../store";
import { SearchInput } from "../../ui/SearchInput";

/** Free-text search box bound to FilterState.text. */
export function TextFilter() {
  const text = useFilterStore((s) => s.state.text);
  const patch = useFilterStore((s) => s.patch);
  return (
    <SearchInput
      value={text}
      onChange={(e) => patch({ text: e.target.value })}
      placeholder="Search text (Scryfall syntax allowed)…"
      style={{ height: 36, fontSize: 14 }}
    />
  );
}
