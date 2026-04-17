/**
 * UntapSync impl that wraps the `sync/*` modules into the service interface.
 */
import { bootSync } from "../../sync/bootSync";
import { pullUntapDecks } from "../../sync/pullDecks";
import { deleteUntapDeck } from "../../sync/pushDeck";
import { cancelPendingPush, retryPush, schedulePush } from "../../sync/pushSchedule";
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

  retryPush(deckId: string): void {
    retryPush(deckId);
  },

  deleteRemote(untapDeckUid: string): Promise<boolean> {
    return deleteUntapDeck(untapDeckUid);
  },

  reEnrichThin(): void {
    reEnrichThinDecks();
  },
};
