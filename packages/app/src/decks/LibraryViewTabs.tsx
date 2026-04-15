import { ButtonGroup } from "@boundless-grimoire/ui";

interface Props {
  view: "decks" | "cubes";
  deckCount: number;
  cubeCount: number;
  onChange: (view: "decks" | "cubes") => void;
}

/**
 * Segmented control above the ribbon that switches the library between
 * Decks and Cubes. Renders through the design-system `ButtonGroup` so
 * the buttons get the same fixed-height / padding / font sizing as
 * every other segmented control (DeckLayoutToggle, etc.). Rolling a
 * custom `<button>` here rendered fine on the homepage but squished
 * under untap.in, because the button inherited untap's tighter
 * line-height.
 */
export function LibraryViewTabs({ view, deckCount, cubeCount, onChange }: Props) {
  const options = [
    {
      value: "decks" as const,
      label: `Decks${deckCount > 0 ? ` (${deckCount})` : ""}`,
    },
    {
      value: "cubes" as const,
      label: `Cubes${cubeCount > 0 ? ` (${cubeCount})` : ""}`,
    },
  ];
  return (
    <ButtonGroup
      options={options}
      isSelected={(v) => v === view}
      onToggle={(v) => onChange(v)}
      size="sm"
    />
  );
}
