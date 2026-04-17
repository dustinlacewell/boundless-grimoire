/**
 * Ephemeral per-deck sync status. Not persisted — it's purely a UI
 * projection of whatever the push scheduler is doing right now.
 *
 *   pending → debounce timer is set, push will run shortly
 *   pushing → network call in flight
 *   synced  → last push succeeded
 *   error   → last push failed after retries exhausted
 */
import { create } from "zustand";

export type SyncStatus = "pending" | "pushing" | "synced" | "error";

export interface SyncStatusInfo {
  status: SyncStatus;
  lastError?: string;
  /** ms timestamp of the most recent successful push. */
  lastSuccessAt?: number;
}

interface State {
  byDeck: Record<string, SyncStatusInfo>;
}

export const useSyncStatusStore = create<State>(() => ({ byDeck: {} }));

export function setSyncStatus(
  deckId: string,
  status: SyncStatus,
  extra?: { lastError?: string; lastSuccessAt?: number },
): void {
  useSyncStatusStore.setState((s) => ({
    byDeck: {
      ...s.byDeck,
      [deckId]: { status, ...extra },
    },
  }));
}

export function clearSyncStatus(deckId: string): void {
  useSyncStatusStore.setState((s) => {
    if (!(deckId in s.byDeck)) return s;
    const { [deckId]: _, ...rest } = s.byDeck;
    return { byDeck: rest };
  });
}
