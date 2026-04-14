import { ButtonGroup } from "../../ui/ButtonGroup";
import { SUPERTYPES } from "../constants";
import { useFilterStore, toggleIn } from "../store";

const labelOf = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function SupertypeFilter() {
  const supertypes = useFilterStore((s) => s.state.supertypes);
  const patch = useFilterStore((s) => s.patch);
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <ButtonGroup
        options={SUPERTYPES.map((t) => ({ value: t, label: labelOf(t) }))}
        isSelected={(v) => supertypes.includes(v)}
        onToggle={(v) => patch({ supertypes: toggleIn(supertypes, v) })}
        size="sm"
      />
    </div>
  );
}
