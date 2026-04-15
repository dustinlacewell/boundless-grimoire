import { TYPES } from "../constants";
import { colors } from "@boundless-grimoire/ui";
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

type State = "neutral" | "included" | "excluded";

const baseButtonClass =
  "inline-flex items-center justify-center box-border rounded-[6px] font-sans font-semibold cursor-pointer ui-interactive ui-interactive-border h-[26px] px-2.5 text-[12px]";

function styleFor(state: State): React.CSSProperties {
  if (state === "excluded") {
    return {
      background: colors.bg2,
      color: colors.danger,
      borderColor: colors.danger,
      textDecoration: "line-through",
    };
  }
  return {};
}

/**
 * Tri-state type filter. Left click cycles include ↔ neutral; right click
 * cycles exclude ↔ neutral. A type can be only in one state at a time:
 * moving to included clears it from excluded and vice versa.
 */
export function TypeFilter() {
  const types = useFilterStore((s) => s.state.types);
  const excluded = useFilterStore((s) => s.state.excludedTypes ?? []);
  const patch = useFilterStore((s) => s.patch);

  const stateOf = (t: string): State => {
    if (types.includes(t)) return "included";
    if (excluded.includes(t)) return "excluded";
    return "neutral";
  };

  const leftClick = (t: string) => {
    if (excluded.includes(t)) {
      patch({
        excludedTypes: excluded.filter((x) => x !== t),
        types: [...types, t],
      });
    } else {
      patch({ types: toggleIn(types, t) });
    }
  };

  const rightClick = (t: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (types.includes(t)) {
      patch({
        types: types.filter((x) => x !== t),
        excludedTypes: [...excluded, t],
      });
    } else {
      patch({ excludedTypes: toggleIn(excluded, t) });
    }
  };

  return (
    <div style={wrapperStyle}>
      <div style={gridStyle}>
        {TYPES.map((t) => {
          const s = stateOf(t);
          const selectedClass = s === "included" ? "ui-interactive-selected" : "bg-bg-2 text-text";
          return (
            <button
              key={t}
              type="button"
              className={`${baseButtonClass} ${selectedClass}`.trim()}
              style={{ width: "100%", ...styleFor(s) }}
              onClick={() => leftClick(t)}
              onContextMenu={(e) => rightClick(t, e)}
              title={`${labelOf(t)} — left click to include, right click to exclude`}
            >
              {labelOf(t)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
