import { useMemo } from "react";
import { useCustomFormatStore } from "../filters/customFormatStore";
import { setDeckFormat } from "../storage/deckStore";
import { Dropdown } from "@boundless-grimoire/ui";

interface Props {
  deckId: string;
  formatIndex: number | null;
}

export function DeckFormatPicker({ deckId, formatIndex }: Props) {
  const formats = useCustomFormatStore((s) => s.formats);

  const options = useMemo(
    () => formats.map((f, i) => ({ value: String(i), label: f.name })),
    [formats],
  );

  return (
    <Dropdown
      options={options}
      value={formatIndex != null ? String(formatIndex) : null}
      onChange={(v) => setDeckFormat(deckId, v != null ? Number(v) : null)}
      placeholder="No format"
      clearable
      compact
    />
  );
}
