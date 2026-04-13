/**
 * Print picker modal state. The "..." button on a deck card writes
 * here; the modal mounted at the App root reads from it.
 */
import { create } from "zustand";
import type { CardSnapshot } from "../storage/types";

interface PickerTarget {
  deckId: string;
  /** The current snapshot — needed for oracle_id lookup and the modal title. */
  snapshot: CardSnapshot;
}

interface PrintPickerState {
  target: PickerTarget | null;
}

export const usePrintPickerStore = create<PrintPickerState>(() => ({
  target: null,
}));

export function openPrintPicker(deckId: string, snapshot: CardSnapshot): void {
  usePrintPickerStore.setState({ target: { deckId, snapshot } });
}

export function closePrintPicker(): void {
  usePrintPickerStore.setState({ target: null });
}
