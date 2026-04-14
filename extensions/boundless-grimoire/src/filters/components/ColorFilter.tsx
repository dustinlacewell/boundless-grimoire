import { COLORS } from "../constants";
import { ColorIcon } from "../icons/ColorIcon";
import { useFilterStore, toggleIn } from "../store";
import type { ColorLetter } from "../types";

/**
 * Color filter: 5 round color icons + a colorless toggle.
 * The match mode (Identity ⊆ / Colors ⊆ / Colors =) lives in the
 * ColorModeDot that's placed in the Color FilterField's action slot.
 */
export function ColorFilter() {
  const { colors: selected, colorless } = useFilterStore((s) => s.state);
  const patch = useFilterStore((s) => s.patch);

  const toggleColor = (c: ColorLetter) =>
    patch({ colors: toggleIn(selected, c) });

  return (
    <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {COLORS.map((c) => {
        const isOn = selected.includes(c.value);
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => toggleColor(c.value)}
            title={c.name}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              opacity: isOn ? 1 : 0.4,
              filter: isOn ? "none" : "saturate(0.5)",
              transform: isOn ? "scale(1.05)" : "scale(1)",
              transition: "opacity 0.1s, transform 0.1s, filter 0.1s",
            }}
          >
            <ColorIcon color={c.value} size={26} />
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => patch({ colorless: !colorless })}
        title="Colorless"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          marginLeft: 4,
          cursor: "pointer",
          opacity: colorless ? 1 : 0.4,
          filter: colorless ? "none" : "saturate(0.5)",
          transform: colorless ? "scale(1.05)" : "scale(1)",
          transition: "opacity 0.1s, transform 0.1s, filter 0.1s",
        }}
      >
        <ColorIcon color="C" size={26} />
      </button>
    </div>
  );
}
