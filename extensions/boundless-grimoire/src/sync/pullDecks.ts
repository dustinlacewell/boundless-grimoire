/**
 * One-time import of untap.in decks we don't already have linked.
 *
 * Simple rule: a deck we've already linked (our local record has
 * `untapDeckUid`) is OURS — we never pull into it. From that point on
 * the only flow is push. Decks we've never seen get imported thin so
 * they appear immediately, then enrich in the background.
 */
import {
  DEFAULT_FILTER_STATE,
  DEFAULT_SORT_DIR,
  DEFAULT_SORT_FIELD,
  setSyncStatus,
  useDeckStore,
  type Deck,
  type DeckCard,
  type DeckLibrary,
} from "@boundless-grimoire/app";
import { enrichDeckInPlace } from "./reEnrich";

const UNTAP_DB_NAME = "untap";
const UNTAP_DECKS_STORE = "decks";
const DECK_ZONE = "deck-1";
const SIDEBOARD_ZONE = "sideboard-1";

interface UntapCard {
  card_uid: string;
  qty: number;
  set: string;
  title: string;
  zone: string;
}

interface UntapDeck {
  deck_uid: string;
  title: string;
  cards: UntapCard[];
  deleted: boolean;
  created_date: number;
  updated_date: number;
  is_cube: boolean | null;
}

export async function pullUntapDecks(): Promise<void> {
  const allDecks = await readUntapDecksFromIDB().catch((e) => {
    console.warn("[untap-sync] could not read untap IndexedDB:", e);
    return [] as UntapDeck[];
  });

  const lib = useDeckStore.getState().library;
  const unlinked = selectUnlinked(allDecks, lib);
  console.log(
    `[untap-sync] ${allDecks.length} decks in untap IDB, ${unlinked.length} to import`,
  );
  if (unlinked.length === 0) return;

  const newDecks = unlinked.map(buildThinDeck);
  commitImported(newDecks);
  for (const deck of newDecks) {
    setSyncStatus(deck.id, "synced", { lastSuccessAt: Date.now() });
    void enrichDeckInPlace(deck.id);
  }
}

function readUntapDecksFromIDB(): Promise<UntapDeck[]> {
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(UNTAP_DB_NAME);
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    req.onerror = () => reject(req.error ?? new Error("indexedDB.open failed"));
    req.onupgradeneeded = () => {
      req.transaction?.abort();
      reject(new Error("untap IndexedDB not present"));
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(UNTAP_DECKS_STORE)) {
        db.close();
        resolve([]);
        return;
      }
      const tx = db.transaction([UNTAP_DECKS_STORE], "readonly");
      const store = tx.objectStore(UNTAP_DECKS_STORE);
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        db.close();
        resolve((getAll.result as UntapDeck[]) ?? []);
      };
      getAll.onerror = () => {
        db.close();
        reject(getAll.error ?? new Error("getAll failed"));
      };
    };
  });
}

function selectUnlinked(allDecks: UntapDeck[], lib: DeckLibrary): UntapDeck[] {
  const linked = new Set(
    Object.values(lib.decks).map((d) => d.untapDeckUid).filter(Boolean) as string[],
  );
  return allDecks.filter((d) => {
    if (d.deleted) return false;
    if (linked.has(d.deck_uid)) return false;
    // Skip untap's auto-created empty "Untitled" workspace decks. Keep
    // intentionally-empty user decks/cubes (anything named or flagged).
    if (d.cards.length === 0 && !d.is_cube && d.title.trim().toLowerCase() === "untitled") {
      return false;
    }
    return true;
  });
}

function buildThinDeck(untapDeck: UntapDeck): Deck {
  const now = Date.now();
  const isCube = !!untapDeck.is_cube;
  const deckCards = isCube
    ? untapDeck.cards
    : untapDeck.cards.filter((c) => c.zone === DECK_ZONE);
  const sideCards = isCube
    ? []
    : untapDeck.cards.filter((c) => c.zone === SIDEBOARD_ZONE);
  const cards: Record<string, DeckCard> = {};
  for (const [i, c] of deckCards.entries()) {
    cards[c.card_uid] = {
      snapshot: { id: c.card_uid, name: c.title, set: c.set },
      count: c.qty,
      addedAt: now - deckCards.length + i,
      zone: c.zone,
    };
  }
  const sideboard: Record<string, DeckCard> = {};
  for (const [i, c] of sideCards.entries()) {
    sideboard[c.card_uid] = {
      snapshot: { id: c.card_uid, name: c.title, set: c.set },
      count: c.qty,
      addedAt: now - sideCards.length + i,
      zone: c.zone,
    };
  }
  return {
    id: crypto.randomUUID(),
    name: untapDeck.title,
    createdAt: untapDeck.created_date,
    updatedAt: untapDeck.updated_date,
    cards,
    sideboard,
    formatIndex: null,
    sortField: DEFAULT_SORT_FIELD,
    sortDir: DEFAULT_SORT_DIR,
    filters: DEFAULT_FILTER_STATE,
    untapDeckUid: untapDeck.deck_uid,
    enriching: true,
    isCube,
    groupBy: isCube ? "zone" : "category",
    layout: "scroll",
    columnSort: "cmc",
  };
}

function commitImported(newDecks: Deck[]): void {
  // New decks land with `enriching: true`, which the push runner's
  // runPush respects — it refuses to push an enriching deck. So the
  // subscriber-triggered schedulePush is harmless: its timer fires,
  // sees the enriching flag, bails out. When enrichment completes,
  // the subscriber fires again and pushes the real card data.
  const byId: Record<string, Deck> = {};
  const order: string[] = [];
  for (const d of newDecks) {
    byId[d.id] = d;
    order.push(d.id);
  }
  useDeckStore.setState((s) => ({
    library: {
      ...s.library,
      decks: { ...s.library.decks, ...byId },
      order: [...s.library.order, ...order],
    },
  }));
}
