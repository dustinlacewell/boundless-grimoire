/**
 * Card-preview state.
 *
 * Only the snapshot lives in React state — the mouse position is
 * tracked separately via a module-level ref so that the high-frequency
 * mousemove updates don't re-render the React tree. CardPreview reads
 * the position imperatively in a global mousemove listener and writes
 * it to the panel via DOM transform.
 */
import { create } from "zustand";
import type { CardSnapshot } from "../storage/types";
import { preserveOnHmr } from "../storage/preserveOnHmr";

interface PreviewState {
  snapshot: CardSnapshot | null;
  /** When true, renders the simplified print-picker preview (image + set label only). */
  printMode: boolean;
}

export const useCardPreviewStore = create<PreviewState>(() => ({
  snapshot: null,
  printMode: false,
}));

export function showCardPreview(snapshot: CardSnapshot): void {
  const s = useCardPreviewStore.getState();
  if (s.snapshot?.id === snapshot.id && !s.printMode) return;
  useCardPreviewStore.setState({ snapshot, printMode: false });
}

export function showPrintPreview(snapshot: CardSnapshot): void {
  const s = useCardPreviewStore.getState();
  if (s.snapshot?.id === snapshot.id && s.printMode) return;
  useCardPreviewStore.setState({ snapshot, printMode: true });
}

export function hideCardPreview(): void {
  if (useCardPreviewStore.getState().snapshot === null) return;
  useCardPreviewStore.setState({ snapshot: null, printMode: false });
}

/** Mouse position in viewport coordinates, updated by the global listener. */
export const mousePos = { x: 0, y: 0 };

preserveOnHmr(useCardPreviewStore, import.meta.hot);
