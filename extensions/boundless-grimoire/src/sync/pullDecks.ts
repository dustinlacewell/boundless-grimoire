/**
 * Two-phase import of every untap.in deck into our local store.
 *
 * Phase 1 — INSTANT (synchronous after one IndexedDB read):
 *   1. Read all decks from untap.in's IndexedDB.
 *   2. Filter out anything we've already linked.
 *   3. Build local Deck records with THIN snapshots — just the id/name/set
 *      we already have from untap, no Scryfall data yet.
 *   4. Mark each as `enriching: true` so the deck ribbon can spin.
 *   5. Commit them to the store. Decks appear in the UI immediately.
 *
 * Phase 2 — BACKGROUND (per deck, in parallel-but-rate-limited):
 *   For each deck, fire off a Scryfall enrichment task. When it returns
 *   (or fails), swap in the rich snapshots and clear `enriching`. Decks
 *   light up one at a time as their data arrives — with `/cards/collection`
 *   throttled to 500ms in the search bucket, the visual stagger is itself
 *   a useful indicator that progress is happening.
 *
 * Why two phases:
 *   The user opens untap.in and wants to see their decks NOW. Scryfall
 *   may be slow (or down — see the 503 path in `unwrapEnvelope`), and
 *   the search bucket adds at minimum 500ms × ⌈cards/75⌉ per deck even
 *   on the happy path. Blocking the entire UI on enrichment was making
 *   "open the page" feel like 5–30 seconds. Now it's instant.
 *
 * Why pull lives outside the bridge:
 *   untap.in serves the same IndexedDB its own UI reads, so the isolated
 *   content script can open it directly without going through the WebSocket
 *   bridge. The user never waits on untap's WS handshake just to see their
 *   existing decks.
 */
import { useDeckStore } from "@boundless-grimoire/app";
import {
  DEFAULT_FILTER_STATE,
  DEFAULT_SORT_DIR,
  DEFAULT_SORT_FIELD,
  type Deck,
  type DeckCard,
  type DeckLibrary,
} from "@boundless-grimoire/app";
import { enrichDeckInPlace } from "./reEnrich";
import { suppressFromNextPush } from "./pushSchedule";

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

  const untapDecks = selectUnlinked(allDecks, useDeckStore.getState().library);
  console.log(
    `[untap-sync] ${allDecks.length} decks in untap IDB, ${untapDecks.length} to import`,
  );
  if (untapDecks.length === 0) return;

  // Phase 1 — commit thin records so decks appear in the UI immediately.
  const newDecks = untapDecks.map(buildThinDeck);
  commitImported(newDecks);

  // Phase 2 — fire off enrichment per deck. We don't await; each deck
  // updates itself when its Scryfall data arrives.
  for (const deck of newDecks) void enrichDeckInPlace(deck.id);
}

// ── Phase 1: thin commit ──────────────────────────────────────────────────────

/**
 * Read every deck from untap.in's IndexedDB. Same origin, so the isolated
 * world can open it directly. We don't specify a version on open() so we
 * pick up whatever schema untap is currently using.
 */
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
      // We never want to create or upgrade untap's database. If this fires
      // it means the db doesn't exist on this origin yet — abort cleanly.
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
    Object.values(lib.decks).map((d) => d.untapDeckUid).filter(Boolean),
  );
  return allDecks.filter((d) => {
    if (d.deleted) return false;
    if (linked.has(d.deck_uid)) return false;
    // Untap auto-creates an empty "Untitled" deck as a session workspace on
    // page load. Skip those specifically so they don't keep reappearing
    // locally — but don't drop intentionally-empty cubes / decks the user
    // actually made (named, or is_cube-flagged), since the user did ask
    // for those.
    if (d.cards.length === 0 && !d.is_cube && d.title.trim().toLowerCase() === "untitled") {
      return false;
    }
    return true;
  });
}

/**
 * Build a Deck with bare-minimum snapshots — just what untap already gave
 * us in IndexedDB. The deck ribbon can render the title and card count
 * immediately; CardImage will fall back to a placeholder until enrichment
 * fills in the image URIs.
 */
function buildThinDeck(untapDeck: UntapDeck): Deck {
  const now = Date.now();
  const isCube = !!untapDeck.is_cube;
  // Cubes have no sideboard concept — every zone (basics, group-1…)
  // lives in the mainboard card map, tagged by its zone string.
  // Decks split into the fixed `deck-1` / `sideboard-1` pair.
  const deckCards = isCube
    ? untapDeck.cards
    : untapDeck.cards.filter((c) => c.zone === DECK_ZONE);
  const sideCards = isCube
    ? []
    : untapDeck.cards.filter((c) => c.zone === SIDEBOARD_ZONE);
  const cards: Record<string, DeckCard> = {};
  for (const [i, c] of deckCards.entries()) {
    // No Scryfall id yet — use untap's card_uid as a placeholder key.
    // enrichDeckInPlace will rebuild the map keyed by Scryfall id.
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
  // Mark BEFORE the setState so the deckStore subscriber that fires
  // synchronously inside setState sees the suppression and doesn't
  // immediately try to push these decks back to untap.
  for (const d of newDecks) suppressFromNextPush(d.id);

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

// ── Phase 2: per-deck background enrichment ───────────────────────────────────
// enrichDeckInPlace is imported from ./reEnrich so it can also be called
// at boot time to recover cards that failed enrichment on a prior session.
