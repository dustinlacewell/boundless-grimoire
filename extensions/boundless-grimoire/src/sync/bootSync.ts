/**
 * Extension-authoritative boot sync.
 *
 * Runs once after deck hydration. Two phases:
 *
 *   Phase 1 — PULL: import any untap decks we don't have locally, then
 *     re-enrich any cards that are still thin from a prior failed enrichment.
 *     Works without the bridge (reads untap's IndexedDB directly).
 *
 *   Phase 2 — PUSH: walk every local deck and push it to untap. The
 *     extension is the authority — untap always receives our current state.
 *     Requires the MAIN-world bridge, so we wait for it first and skip
 *     gracefully if it never comes up.
 *
 * Why pull-then-push: pulling first links any untap decks we haven't seen
 * yet, preventing the push phase from creating duplicates on untap.
 */
import { useDeckStore } from "../storage/deckStore";
import { pullUntapDecks } from "./pullDecks";
import { pushDeck } from "./pushDeck";
import { backfillUntapDeckUid, suppressFromNextPush } from "./pushSchedule";
import { reEnrichThinDecks } from "./reEnrich";
import { waitForBridge } from "./untapApi";

export async function bootSync(): Promise<void> {
  // Phase 1: Pull (IDB — no bridge needed)
  await pullUntapDecks();
  reEnrichThinDecks();

  // Phase 2: Push (needs bridge)
  const bridgeUp = await waitForBridge();
  if (!bridgeUp) {
    console.warn("[boot-sync] bridge unavailable, skipping push phase");
    return;
  }

  const decks = Object.values(useDeckStore.getState().library.decks);
  console.log(`[boot-sync] pushing ${decks.filter((d) => !d.enriching).length} local decks`);

  for (const deck of decks) {
    // Freshly pulled decks are still enriching — pushing them back
    // immediately would be a no-op at best, a stale overwrite at worst.
    if (deck.enriching) continue;

    suppressFromNextPush(deck.id);
    const uid = await pushDeck(deck);
    if (uid && uid !== deck.untapDeckUid) {
      backfillUntapDeckUid(deck.id, uid);
    }
  }

  console.log("[boot-sync] complete");
}
