import type { ColorLetter } from "../types";
import { ColorIcon } from "./ColorIcon";

interface Props {
  color: ColorLetter | "C";
  on: boolean;
  onClick: () => void;
  size?: number;
  title?: string;
}

const NAME: Record<ColorLetter | "C", string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
};

/**
 * Toggleable mana-symbol button. Off-state is dimmed + desaturated so
 * selected colors stand out; hover restores full brightness regardless
 * of state so the icon always reads as interactive.
 */
export function ColorToggle({ color, on, onClick, size = 26, title }: Props) {
  const stateClass = on
    ? "opacity-100 saturate-100 scale-105"
    : "opacity-40 saturate-50 scale-100";
  return (
    <button
      type="button"
      title={title ?? NAME[color]}
      onClick={onClick}
      className={`bg-transparent border-0 p-0 cursor-pointer transition-[opacity,filter,transform] duration-100 hover:opacity-100 hover:saturate-100 ${stateClass}`}
    >
      <ColorIcon color={color} size={size} />
    </button>
  );
}
