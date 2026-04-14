import { ButtonGroup } from "@boundless-grimoire/ui";
import {
  ensureActiveDeck,
  selectedDeck,
  setDeckSort,
  useDeckStore,
} from "../../storage/deckStore";
import { DEFAULT_SORT_DIR, DEFAULT_SORT_FIELD } from "../../storage/types";
import { SORT_DIRS, SORT_FIELDS } from "../constants";
import type { SortDir, SortField } from "../types";

/**
 * Sort field + direction.
 *
 * Source of truth is the active deck (per-deck persistence). When no
 * deck exists yet, falls back to the global defaults; first toggle
 * triggers ensureActiveDeck() to persist the change.
 */
export function SortFilter() {
  const deck = useDeckStore(selectedDeck);
  const sortField = deck?.sortField ?? DEFAULT_SORT_FIELD;
  const sortDir = deck?.sortDir ?? DEFAULT_SORT_DIR;

  const updateField = (field: SortField) => {
    const id = ensureActiveDeck();
    setDeckSort(id, field, sortDir);
  };
  const updateDir = (dir: SortDir) => {
    const id = ensureActiveDeck();
    setDeckSort(id, sortField, dir);
  };

  return (
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <ButtonGroup
        options={SORT_FIELDS.map((f) => ({ value: f.value, label: f.label }))}
        isSelected={(v) => v === sortField}
        onToggle={updateField}
        size="sm"
      />
      <ButtonGroup
        options={SORT_DIRS.map((d) => ({ value: d.value, label: d.label }))}
        isSelected={(v) => v === sortDir}
        onToggle={updateDir}
        size="sm"
      />
    </div>
  );
}
