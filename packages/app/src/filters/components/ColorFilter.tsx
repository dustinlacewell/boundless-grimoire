import { COLORS } from "../constants";
import { ColorToggle } from "../icons/ColorToggle";
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
    <div className="inline-flex gap-1 items-center">
      {COLORS.map((c) => (
        <ColorToggle
          key={c.value}
          color={c.value}
          on={selected.includes(c.value)}
          title={c.name}
          onClick={() => toggleColor(c.value)}
        />
      ))}
      <div className="ml-1">
        <ColorToggle
          color="C"
          on={colorless}
          title="Colorless"
          onClick={() => patch({ colorless: !colorless })}
        />
      </div>
    </div>
  );
}
