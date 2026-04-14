import { TYPES } from "../constants";
import { ToggleButton } from "../../ui/ToggleButton";
import { useFilterStore, toggleIn } from "../store";

/**
 * Shared width for the Type keypad and its siblings (Subtype pillbar).
 * Keeping them the same width is a deliberate visual alignment choice.
 */
export const TYPE_BLOCK_WIDTH = 320;

const labelOf = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 4,
  width: TYPE_BLOCK_WIDTH,
};

const cellStyle: React.CSSProperties = {
  width: "100%",
};

export function TypeFilter() {
  const types = useFilterStore((s) => s.state.types);
  const patch = useFilterStore((s) => s.patch);
  return (
    <div style={wrapperStyle}>
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
    </div>
  );
}
