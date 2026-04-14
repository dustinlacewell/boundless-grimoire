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
    <div className="inline-flex gap-1 items-center">
      {COLORS.map((c) => (
        <ColorToggle
          key={c.value}
          on={selected.includes(c.value)}
          title={c.name}
          onClick={() => toggleColor(c.value)}
        >
          <ColorIcon color={c.value} size={26} />
        </ColorToggle>
      ))}
      <div className="ml-1">
        <ColorToggle
          on={colorless}
          title="Colorless"
          onClick={() => patch({ colorless: !colorless })}
        >
          <ColorIcon color="C" size={26} />
        </ColorToggle>
      </div>
    </div>
  );
}

interface ColorToggleProps {
  on: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}

/**
 * One color icon button. Off-state is dimmed + desaturated so the
 * selected colors stand out; hover restores full brightness regardless
 * of state so the user gets clear feedback that the icon is interactive.
 */
function ColorToggle({ on, title, onClick, children }: ColorToggleProps) {
  const stateClass = on
    ? "opacity-100 saturate-100 scale-105"
    : "opacity-40 saturate-50 scale-100";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`bg-transparent border-0 p-0 cursor-pointer transition-[opacity,filter,transform] duration-100 hover:opacity-100 hover:saturate-100 ${stateClass}`}
    >
      {children}
    </button>
  );
}
