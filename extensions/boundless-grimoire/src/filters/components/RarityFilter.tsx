import { ButtonGroup } from "../../ui/ButtonGroup";
import { RARITIES } from "../constants";
import { RarityIcon } from "../icons/RarityIcon";
import { useFilterStore, toggleIn } from "../store";
import type { Rarity } from "../types";

export function RarityFilter() {
  const rarities = useFilterStore((s) => s.state.rarities);
  const patch = useFilterStore((s) => s.patch);
  return (
    <ButtonGroup
      options={RARITIES.map((r) => ({
        value: r.value,
        label: <RarityIcon rarity={r.value} size={20} />,
        title: r.value[0]!.toUpperCase() + r.value.slice(1),
      }))}
      isSelected={(v) => rarities.includes(v)}
      onToggle={(v: Rarity) => patch({ rarities: toggleIn(rarities, v) })}
      size="sm"
    />
  );
}
