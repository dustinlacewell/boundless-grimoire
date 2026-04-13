/**
 * Debounced push scheduler.
 *
 * Owns two pieces of state and exposes the operations that touch them:
 *
 *   pendingPush — local deck id → debounce timer. A second edit within
 *     the debounce window cancels the previous timer and starts a new
 *     one, so we collapse rapid edits into one push.
 *
 *   suppressedFromPush — local deck ids that just landed via a pull and
 *     should NOT be pushed back the next time the deckStore subscriber
 *     sees them. This breaks the import → setState → subscriber → push
 *     cycle.
 *
 * The actual network call is delegated to `pushDeck` so this file stays
 * focused on scheduling and lifecycle. After a successful push, if untap
 * minted a new deck_uid, we backfill it into the local deck record.
 */
import { useDeckStore } from "../storage/deckStore";
import type { Deck } from "../storage/types";
import { pushDeck } from "./pushDeck";

const DEBOUNCE_MS = 1500;

const pendingPush = new Map<string, ReturnType<typeof setTimeout>>();
const suppressedFromPush = new Set<string>();

/** Mark a deck as just-imported so the next subscriber fire skips its push. */
export function suppressFromNextPush(deckId: string): void {
  suppressedFromPush.add(deckId);
}

function consumeSuppression(deckId: string): boolean {
  if (!suppressedFromPush.has(deckId)) return false;
  suppressedFromPush.delete(deckId);
  return true;
}

/** Cancel any debounced push for a local deck id (e.g. before deletion). */
export function cancelPendingPush(localDeckId: string): void {
  const existing = pendingPush.get(localDeckId);
  if (existing) {
    clearTimeout(existing);
    pendingPush.delete(localDeckId);
  }
}

export function schedulePush(deck: Deck): void {
  if (consumeSuppression(deck.id)) return;

  const existing = pendingPush.get(deck.id);
  if (existing) clearTimeout(existing);

  pendingPush.set(
    deck.id,
    setTimeout(() => void runPush(deck), DEBOUNCE_MS),
  );
}

async function runPush(deck: Deck): Promise<void> {
  pendingPush.delete(deck.id);
  const uid = await pushDeck(deck);
  if (uid && uid !== deck.untapDeckUid) backfillUntapDeckUid(deck.id, uid);
}

export function backfillUntapDeckUid(localDeckId: string, untapDeckUid: string): void {
  useDeckStore.setState((s) => {
    const d = s.library.decks[localDeckId];
    if (!d) return s;
    return {
      library: {
        ...s.library,
        decks: { ...s.library.decks, [localDeckId]: { ...d, untapDeckUid } },
      },
    };
  });
}
