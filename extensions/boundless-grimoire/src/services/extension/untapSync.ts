/**
 * UntapSync impl that wraps the existing `sync/*` modules into the
 * service interface. The transport (postMessage to the MAIN-world
 * `untapBridge` script) is unchanged — this file is just an adapter.
 */
import { bootSync } from "../../sync/bootSync";
import { pullUntapDecks } from "../../sync/pullDecks";
import { deleteUntapDeck } from "../../sync/pushDeck";
import { cancelPendingPush, schedulePush } from "../../sync/pushSchedule";
import { reEnrichThinDecks } from "../../sync/reEnrich";
import type { Deck, UntapSync } from "@boundless-grimoire/app";
import { waitForBridge } from "../../sync/untapApi";

export const extensionUntapSync: UntapSync = {
  whenReady(): Promise<boolean> {
    return waitForBridge();
  },

  boot(): Promise<void> {
    return bootSync();
  },

  pull(): Promise<void> {
    return pullUntapDecks();
  },

  schedulePush(deck: Deck): void {
    schedulePush(deck);
  },

  cancelPush(localDeckId: string): void {
    cancelPendingPush(localDeckId);
  },

  deleteRemote(untapDeckUid: string): Promise<boolean> {
    return deleteUntapDeck(untapDeckUid);
  },

  reEnrichThin(): void {
    reEnrichThinDecks();
  },
};
