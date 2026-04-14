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
 *
 * That conditional render is the entire UX contract — when this service
 * isn't provided, every untap-flavored UI element (linked-deck badges,
 * import-from-untap tile, manual sync controls) just doesn't show up.
 */
import type { Deck } from "../storage/types";

export interface UntapSync {
  /**
   * Resolves once the underlying transport is reachable. Returns false
   * if it's not coming up (e.g. the page isn't actually untap.in). Used
   * by the deck-store sync subscriber to defer the very first push until
   * the bridge is up.
   */
  whenReady(): Promise<boolean>;

  /**
   * One-time pull-then-push at app boot. Pulls untap decks not yet
   * mirrored locally, then pushes every local deck back so untap reflects
   * our state. Idempotent — safe to call once per app start.
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
