/**
 * Debounced push scheduler.
 *
 * Simple model (by design — we tried more elaborate ones):
 *
 *   deck changed      → schedulePush(deck) with 1.5s debounce
 *   timer fires       → pushDeck(deck)
 *   on success        → mark "synced", backfill uid if needed
 *   on failure        → retry with exponential backoff, up to 3 attempts
 *   on terminal fail  → mark "error", show a toast the user can retry
 *
 * No persistent outbox, no tombstone ledger, no bridge-ready
 * subscriptions. If a push never lands in a session, the next session's
 * boot push-phase walks every local deck and tries again. If a deck is
 * deleted locally with a bridge-down, we best-effort push the delete;
 * the rare failure case is noisy rather than silent (toast).
 */
import { useDeckStore } from "@boundless-grimoire/app";
import type { Deck } from "@boundless-grimoire/app";
import { clearSyncStatus, setSyncStatus } from "@boundless-grimoire/app";
import { pushToast, ToastFrame, dismissByKey } from "@boundless-grimoire/app";
import { colors } from "@boundless-grimoire/ui";
import { pushDeck, verifyDeckSync } from "./pushDeck";
import { isUntapAvailable } from "./untapApi";

const DEBOUNCE_MS = 1500;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 2000;

const pendingPush = new Map<string, ReturnType<typeof setTimeout>>();

export function cancelPendingPush(localDeckId: string): void {
  const existing = pendingPush.get(localDeckId);
  if (existing) {
    clearTimeout(existing);
    pendingPush.delete(localDeckId);
  }
  clearSyncStatus(localDeckId);
}

export function schedulePush(deck: Deck): void {
  const existing = pendingPush.get(deck.id);
  if (existing) clearTimeout(existing);

  setSyncStatus(deck.id, "pending");
  pendingPush.set(
    deck.id,
    setTimeout(() => {
      pendingPush.delete(deck.id);
      void runPush(deck.id, 1);
    }, DEBOUNCE_MS),
  );
}

/**
 * Push a deck and verify the remote actually matches afterward. If the
 * read-back diverges from local state (untap silently dropped a card,
 * couldn't resolve a name, etc.) we re-push once, then verify again.
 * Throws on terminal failure so the caller's normal retry/error path
 * takes over.
 *
 * Why one verify-retry: in practice, transient resolution failures
 * succeed on a second try. A persistent mismatch is structural and
 * deserves to surface as an error.
 */
async function pushAndVerify(deck: Deck): Promise<string> {
  const firstUid = await pushDeck(deck);
  if (!firstUid) throw new Error("untap returned no deck uid");

  const firstCheck = await verifyDeckSync(deck, firstUid);
  if (firstCheck.matches) return firstUid;

  console.warn(
    `[untap-sync] verify mismatch on "${deck.name}" — ${firstCheck.reason}; retrying push`,
  );
  const secondUid = await pushDeck(deck);
  if (!secondUid) throw new Error("untap returned no deck uid on verify-retry");

  const secondCheck = await verifyDeckSync(deck, secondUid);
  if (secondCheck.matches) return secondUid;

  throw new Error(`untap state diverged after retry: ${secondCheck.reason}`);
}

async function runPush(deckId: string, attempt: number): Promise<void> {
  const deck = useDeckStore.getState().library.decks[deckId];
  if (!deck) {
    clearSyncStatus(deckId);
    return;
  }
  if (deck.enriching) {
    // Re-check once enrichment finishes; the deckStore subscriber
    // will fire on the enriching:false transition and re-schedule.
    return;
  }

  setSyncStatus(deckId, "pushing");
  if (!isUntapAvailable()) {
    handleFailure(deckId, attempt, "Untap bridge is not available");
    return;
  }

  try {
    const uid = await pushAndVerify(deck);
    if (uid !== deck.untapDeckUid) backfillUntapDeckUid(deck.id, uid);
    setSyncStatus(deckId, "synced", { lastSuccessAt: Date.now() });
    dismissByKey(errorToastKey(deckId));
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(`[untap-sync] push "${deck.name}" failed (attempt ${attempt}):`, e);
    handleFailure(deckId, attempt, msg);
  }
}

function handleFailure(deckId: string, attempt: number, msg: string): void {
  if (attempt >= MAX_ATTEMPTS) {
    setSyncStatus(deckId, "error", { lastError: msg });
    showErrorToast(deckId, msg);
    return;
  }
  // Keep the badge on "pending" while we back off so the user sees the
  // retry is still happening rather than a sudden "error" that recovers.
  setSyncStatus(deckId, "pending", { lastError: msg });
  const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
  setTimeout(() => void runPush(deckId, attempt + 1), delay);
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

/** Retry a deck's push immediately. Used by the sync-error toast. */
export function retryPush(deckId: string): void {
  void runPush(deckId, 1);
}

// --- Error toast ----------------------------------------------------------

const errorToastKey = (deckId: string) => `sync-error:${deckId}`;

function showErrorToast(deckId: string, error: string): void {
  const deck = useDeckStore.getState().library.decks[deckId];
  if (!deck) return;
  pushToast({
    key: errorToastKey(deckId),
    render: ({ dismiss }) => (
      <ToastFrame
        variant="error"
        icon={<span style={{ fontSize: 16, color: colors.danger, fontWeight: 700 }}>!</span>}
        onDismiss={dismiss}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            Couldn't sync "{deck.name}" to untap.in
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.4 }}>
            {error}
          </div>
          <button
            type="button"
            onClick={() => {
              dismiss();
              retryPush(deckId);
            }}
            style={{
              alignSelf: "flex-start",
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              background: colors.bg3,
              color: colors.text,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </ToastFrame>
    ),
  });
}
