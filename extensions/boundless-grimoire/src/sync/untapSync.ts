/**
 * Sync our local decks with untap.in.
 *
 * Two paths with very different mechanics:
 *
 *   PULL (untap → us, one-time import on hydrate)  →  pullDecks.ts
 *     Reads directly from untap.in's IndexedDB. Same origin → the isolated
 *     content script can open it without going through the bridge. Decoupled
 *     from the WS bridge entirely so the user never waits on untap's
 *     handshake just to see their existing decks.
 *
 *   PUSH (us → untap, on every local edit)        →  pushDeck.ts
 *     Goes through the MAIN-world bridge to `apiStore.send` and then
 *     `update-deck`. The bridge handles WS warm-up on the first push.
 *     Pushes are debounced and lifecycled by pushSchedule.ts.
 *
 * This file is the public surface: a barrel of re-exports so callers
 * (deckStore subscriber, content/index.tsx) only need one import path.
 */
export { bootSync } from "./bootSync";
export { isUntapAvailable } from "./untapApi";
export { pullUntapDecks } from "./pullDecks";
export { deleteUntapDeck } from "./pushDeck";
export { cancelPendingPush, schedulePush } from "./pushSchedule";
