import type { ColorLetter } from "../types";

interface Props {
  color: ColorLetter | "C";
  size?: number;
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
 * Official Scryfall color symbol SVG. The svgs.scryfall.io files are
 * already round, shaded, and self-contained — we just size them.
 */
export function ColorIcon({ color, size = 24 }: Props) {
  return (
    <img
      src={`https://svgs.scryfall.io/card-symbols/${color}.svg`}
      alt={NAME[color]}
      title={NAME[color]}
      draggable={false}
      style={{
        width: size,
        height: size,
        display: "inline-block",
        userSelect: "none",
      }}
    />
  );
}
