import { useMemo } from "react";
import { MultiSelect, type MultiSelectOption } from "../../ui/MultiSelect";
import { useCatalogs } from "../catalogs";
import { useFilterStore } from "../store";
import { TYPE_BLOCK_WIDTH } from "./TypeFilter";

const labelOf = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Subtype multi-select (creature/planeswalker/land/artifact/enchantment/spell).
 * Width matches the Type keypad so they visually align in the panel.
 */
export function SubtypeFilter() {
  const catalogs = useCatalogs();
  const subtypes = useFilterStore((s) => s.state.subtypes);
  const patch = useFilterStore((s) => s.patch);

  const options: MultiSelectOption<string>[] = useMemo(() => {
    if (!catalogs) return [];
    return catalogs.subtypes.map((s) => ({
      value: s,
      label: labelOf(s),
      searchText: s,
    }));
  }, [catalogs]);

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <MultiSelect
        options={options}
        values={subtypes}
        onChange={(v) => patch({ subtypes: v })}
        placeholder={catalogs ? "Any subtype" : "Loading subtypes…"}
        searchPlaceholder="Search subtypes…"
        width={TYPE_BLOCK_WIDTH}
      />
    </div>
  );
}
