import { TYPES } from "../constants";
import { ToggleButton } from "../../ui/ToggleButton";
import { useFilterStore, toggleIn } from "../store";

const labelOf = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 4,
  width: "fit-content",
};

const cellStyle: React.CSSProperties = {
  width: "100%",
};

export function TypeFilter() {
  const types = useFilterStore((s) => s.state.types);
  const patch = useFilterStore((s) => s.patch);
  return (
    <div style={gridStyle}>
      {TYPES.map((t) => (
        <ToggleButton
          key={t}
          selected={types.includes(t)}
          onClick={() => patch({ types: toggleIn(types, t) })}
          size="sm"
          style={cellStyle}
        >
          {labelOf(t)}
        </ToggleButton>
      ))}
    </div>
  );
}
