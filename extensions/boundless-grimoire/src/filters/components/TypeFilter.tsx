import { ButtonGroup } from "../../ui/ButtonGroup";
import { TYPES } from "../constants";
import { useFilterStore, toggleIn } from "../store";

const labelOf = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function TypeFilter() {
  const types = useFilterStore((s) => s.state.types);
  const patch = useFilterStore((s) => s.patch);
  return (
    <ButtonGroup
      options={TYPES.map((t) => ({ value: t, label: labelOf(t) }))}
      isSelected={(v) => types.includes(v)}
      onToggle={(v) => patch({ types: toggleIn(types, v) })}
      size="sm"
    />
  );
}
