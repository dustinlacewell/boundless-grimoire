/**
 * untap.in deck synchronization. Optional integration — present in the
 * Chrome extension (which runs as a content script on untap.in), absent
 * everywhere else.
 *
 * Consumers must treat this as `UntapSync | undefined`:
 *
 *   const untap = useUntapSync();
 *   if (!untap) return null;            // demo: render nothing
 *   untap.schedulePush(deck);
 */
import type { Deck } from "../storage/types";

export interface UntapSync {
  /**
   * Resolves once the underlying transport is reachable. Returns false
   * if it's not coming up (e.g. the page isn't actually untap.in). Used
   * by the deck-store sync subscriber to defer the first push until
   * the bridge is up.
   */
  whenReady(): Promise<boolean>;

  /**
   * One-time push-then-pull at app boot. Pushes every local deck first
   * (extension is authoritative), then imports any untap decks we've
   * never seen. Idempotent — safe to call once per app start.
   */
  boot(): Promise<void>;

  /**
   * Force a fresh pull from untap. Used by the manual "Re-sync" action.
   */
  pull(): Promise<void>;

  /**
   * Schedule a debounced push for a single deck. Rapid edits within the
   * debounce window collapse into one network call.
   */
  schedulePush(deck: Deck): void;

  /**
   * Cancel any pending push for a deck. Called when the deck is deleted
   * locally before the debounce timer fires.
   */
  cancelPush(localDeckId: string): void;

  /** Kick an immediate retry for a specific deck's push. */
  retryPush(deckId: string): void;

  /**
   * Delete the corresponding deck on untap. Resolves true on success.
   */
  deleteRemote(untapDeckUid: string): Promise<boolean>;

  /**
   * Best-effort backfill of card snapshots that were imported thin (name
   * only) on a previous boot. Runs in the background; no result.
   */
  reEnrichThin(): void;
}
