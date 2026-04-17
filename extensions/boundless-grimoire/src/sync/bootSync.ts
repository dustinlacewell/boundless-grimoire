/**
 * Boot sync (extension-authoritative, push-first).
 *
 *   1. Wait for bridge (best-effort; skip push phase if absent).
 *   2. PUSH every local deck to untap. Extension is the authority —
 *      untap always reflects our current state. Push-first (instead of
 *      the older pull-first) keeps a dirty local edit from being
 *      silently overwritten by stale remote state.
 *   3. PULL unseen decks from untap's IndexedDB (doesn't need bridge).
 *   4. Re-enrich any thin cards left over from prior sessions.
 */
import { useDeckStore } from "@boundless-grimoire/app";
import { pullUntapDecks } from "./pullDecks";
import { pushDeck } from "./pushDeck";
import { backfillUntapDeckUid } from "./pushSchedule";
import { setSyncStatus } from "@boundless-grimoire/app";
import { reEnrichThinDecks } from "./reEnrich";
import { waitForBridge } from "./untapApi";

export async function bootSync(): Promise<void> {
  const bridgeUp = await waitForBridge();
  if (!bridgeUp) {
    console.warn("[boot-sync] bridge unavailable; skipping push phase");
    // Pull still works — it reads untap's IDB directly (no bridge needed).
    await pullUntapDecks();
    reEnrichThinDecks();
    return;
  }

  // Phase 1: push every local deck FIRST so pending edits can't be
  // overwritten by the pull that follows.
  const decks = Object.values(useDeckStore.getState().library.decks).filter(
    (d) => !d.enriching,
  );
  console.log(`[boot-sync] pushing ${decks.length} local decks`);
  for (const deck of decks) {
    setSyncStatus(deck.id, "pushing");
    try {
      const uid = await pushDeck(deck);
      if (uid && uid !== deck.untapDeckUid) backfillUntapDeckUid(deck.id, uid);
      setSyncStatus(deck.id, "synced", { lastSuccessAt: Date.now() });
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      console.error(`[boot-sync] push "${deck.name}" failed`, e);
      setSyncStatus(deck.id, "error", { lastError: msg });
    }
  }

  // Phase 2: pull any untap decks we've never seen.
  await pullUntapDecks();

  // Phase 3: re-enrich any thin snapshots left from prior sessions.
  reEnrichThinDecks();

  console.log("[boot-sync] complete");
}
