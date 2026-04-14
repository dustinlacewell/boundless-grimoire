/**
 * Push one local deck to untap.in.
 *
 * Two-step protocol over the MAIN-world bridge to untap's `apiStore.send`:
 *
 *   1. paste-deck   — resolve our card name+set strings to untap card_uids
 *   2. update-deck  — save the resolved card list against the server deck
 *
 * The bridge handles WebSocket warm-up cost on the first push of a session.
 *
 * If the local deck has no `untapDeckUid` yet (or the one we have was
 * deleted server-side), we mint a new deck via `create-deck` and use that.
 *
 * Returns the deck's `untapDeckUid` on success — caller is responsible for
 * persisting it back into the local record. Returns null on any failure;
 * errors are logged but not thrown so the debounced caller stays simple.
 */
import { deckToText, sideboardToText } from "@boundless-grimoire/app";
import type { Deck } from "@boundless-grimoire/app";
import { isUntapAvailable, untapSend } from "./untapApi";

interface UntapDeck {
  deck_uid: string;
  title: string;
  cards: UntapCard[];
  [key: string]: unknown;
}

interface UntapCard {
  card_uid: string;
  set: string;
  zone: string;
  qty: number;
  order: number;
}

interface PasteDeckZone {
  type: string;
  title: string;
  cards: string;
}

interface PasteResult {
  clear: boolean;
  deck: Array<{
    zone: string;
    qty: number;
    card_uid: string;
    slug: string;
    title: string;
    set: string;
    order: number;
  }>;
}

export async function pushDeck(deck: Deck): Promise<string | null> {
  if (!isUntapAvailable()) return null;

  const cardText = deckToText(deck, { includeHeaders: false });
  const sideText = sideboardToText(deck, { includeHeaders: false });

  // Resolve the card list. For an empty deck we skip the paste-deck round
  // trip entirely (Scryfall has nothing to look up) but we still want to
  // run through update-deck so a rename or other metadata change reaches
  // untap. The previous shortcut returned the uid early and silently
  // dropped pending renames on empty decks.
  const hasCards = cardText.trim() || sideText.trim();
  const resolvedCards = hasCards ? await pasteDeck(cardText, sideText) : [];
  if (resolvedCards === null) return null;

  const untapDeck = await getOrCreateUntapDeck(deck);
  if (!untapDeck) return null;

  const ok = await updateUntapDeck(untapDeck, deck.name, resolvedCards);
  return ok ? untapDeck.deck_uid : null;
}

export async function deleteUntapDeck(untapDeckUid: string): Promise<boolean> {
  if (!isUntapAvailable()) return false;
  try {
    // Goes through untap's own Pinia `deckStore.deleteDeck` action rather
    // than the raw `delete-deck` apiStore command, so untap's reactive
    // sidebar updates without a page reload.
    await untapSend("pinia:deckStore:deleteDeck", untapDeckUid);
    return true;
  } catch (e) {
    console.error("[untap-sync] deleteDeck failed", e);
    return false;
  }
}

// ── steps ─────────────────────────────────────────────────────────────────────

async function pasteDeck(cardText: string, sideText: string): Promise<PasteResult["deck"] | null> {
  const zones: PasteDeckZone[] = [
    { type: "deck-1", title: "Deck", cards: cardText },
    { type: "sideboard-1", title: "Sideboard", cards: sideText },
    { type: "hand-1", title: "Hand", cards: "" },
    { type: "token-1", title: "Tokens", cards: "" },
    { type: "maybe-1", title: "Maybe Board", cards: "" },
    { type: "pile-discard", title: "Graveyard", cards: "" },
    { type: "pile-expel", title: "Exile", cards: "" },
    { type: "pile-facedown", title: "Facedown Pile", cards: "" },
  ];
  try {
    const result = (await untapSend("paste-deck", {
      type: "mtg",
      data: zones,
      ofpOnly: false,
      clear: true,
    })) as [PasteResult, unknown[]];
    return result[0]?.deck ?? [];
  } catch (e) {
    console.error("[untap-sync] paste-deck failed", e);
    return null;
  }
}

async function getOrCreateUntapDeck(deck: Deck): Promise<UntapDeck | null> {
  if (deck.untapDeckUid) {
    try {
      return (await untapSend("get-deck", deck.untapDeckUid)) as UntapDeck;
    } catch {
      // Fall through to create — the saved uid is stale.
    }
  }
  const newUid = await createUntapDeck(deck.name);
  if (!newUid) return null;
  return (await untapSend("get-deck", newUid)) as UntapDeck;
}

async function createUntapDeck(name: string): Promise<string | null> {
  try {
    const result = (await untapSend("create-deck", { title: name, type: "mtg" })) as [
      string | null,
      string,
      string | null,
    ];
    return result[2] ?? null;
  } catch (e) {
    console.error("[untap-sync] create-deck failed", e);
    return null;
  }
}

async function updateUntapDeck(
  untapDeck: UntapDeck,
  title: string,
  resolvedCards: PasteResult["deck"],
): Promise<boolean> {
  const cards = resolvedCards.map((c, i) => ({
    card_uid: c.card_uid,
    set: c.set,
    zone: c.zone,
    qty: c.qty,
    order: i,
  }));
  try {
    const result = (await untapSend("update-deck", {
      ...untapDeck,
      title,
      cards,
    })) as [string | null, string | null];
    if (result[0]) {
      console.error("[untap-sync] update-deck failed:", result[0]);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[untap-sync] update-deck error", e);
    return false;
  }
}

