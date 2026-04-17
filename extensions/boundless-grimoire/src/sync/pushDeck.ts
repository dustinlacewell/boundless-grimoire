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

  // For cubes we skip the paste-deck/update-deck pipeline entirely — that
  // path is designed around deck-1/sideboard-1 zones and would flatten
  // the user's group-1…group-10 organization. Cubes round-trip their
  // cards+zones directly via update-deck using the stored `zone` tag on
  // each DeckCard.
  if (deck.isCube) {
    const untapDeck = await getOrCreateUntapDeck(deck);
    if (!untapDeck) return null;
    const ok = await updateUntapDeckDirect(untapDeck, deck);
    return ok ? untapDeck.deck_uid : null;
  }

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

/**
 * Read the deck back from untap and verify its actual card list matches
 * what we just pushed. Catches:
 *   - Silent-drop: untap couldn't resolve a name and dropped the entry.
 *   - Silent-substitution: untap resolved to a different card.
 *   - Name typo / split-card mismatch surviving paste-deck.
 *   - Title mismatch.
 *
 * Comparison is per-(card, zone): we build a multiset keyed by
 * `name|zone` for both sides and diff. Card name is the only stable
 * cross-system identifier — untap's `card_uid` is its own internal id
 * and isn't comparable to our Scryfall ids. Names are normalized
 * (lowercase + collapse "A // B" to "a") to dodge split-card noise.
 *
 * On mismatch the reason names the first divergent entry so the user
 * (and logs) know exactly what went wrong.
 */
function normalizeCardName(name: string): string {
  const lower = name.toLowerCase().trim();
  const splitIdx = lower.indexOf(" // ");
  return splitIdx > 0 ? lower.slice(0, splitIdx) : lower;
}

function entryKey(name: string, zone: string): string {
  return `${normalizeCardName(name)}|${zone}`;
}

export async function verifyDeckSync(
  deck: Deck,
  untapDeckUid: string,
): Promise<{ matches: true } | { matches: false; reason: string }> {
  if (!isUntapAvailable()) return { matches: false, reason: "bridge unavailable" };
  let remote: UntapDeck;
  try {
    remote = (await untapSend("get-deck", untapDeckUid)) as UntapDeck;
  } catch (e) {
    return { matches: false, reason: `verify get-deck failed: ${(e as Error).message ?? e}` };
  }

  if ((remote.title ?? "") !== deck.name) {
    return { matches: false, reason: `name mismatch: local "${deck.name}", untap "${remote.title ?? ""}"` };
  }

  const local = new Map<string, number>();
  for (const c of Object.values(deck.cards)) {
    if (!c.snapshot.name) continue;
    const k = entryKey(c.snapshot.name, c.zone);
    local.set(k, (local.get(k) ?? 0) + c.count);
  }
  for (const c of Object.values(deck.sideboard)) {
    if (!c.snapshot.name) continue;
    const k = entryKey(c.snapshot.name, c.zone);
    local.set(k, (local.get(k) ?? 0) + c.count);
  }

  const remoteCounts = new Map<string, number>();
  for (const c of (remote.cards ?? []) as Array<{ title?: string; zone?: string; qty?: number }>) {
    if (!c.title || !c.zone) continue;
    const k = entryKey(c.title, c.zone);
    remoteCounts.set(k, (remoteCounts.get(k) ?? 0) + (c.qty ?? 0));
  }

  // Diff both directions so missing AND extra entries surface.
  const allKeys = new Set([...local.keys(), ...remoteCounts.keys()]);
  for (const k of allKeys) {
    const l = local.get(k) ?? 0;
    const r = remoteCounts.get(k) ?? 0;
    if (l !== r) {
      const [name, zone] = k.split("|");
      if (l === 0) return { matches: false, reason: `extra in untap "${name}" in ${zone}: untap has ${r}, local has 0` };
      if (r === 0) return { matches: false, reason: `missing on untap "${name}" in ${zone}: local has ${l}, untap has 0` };
      return { matches: false, reason: `count mismatch "${name}" in ${zone}: local ${l}, untap ${r}` };
    }
  }
  return { matches: true };
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
  const newUid = await createUntapDeck(deck.name, !!deck.isCube);
  if (!newUid) return null;
  return (await untapSend("get-deck", newUid)) as UntapDeck;
}

async function createUntapDeck(name: string, isCube: boolean): Promise<string | null> {
  try {
    const result = (await untapSend("create-deck", {
      title: name,
      type: "mtg",
      is_cube: isCube,
    })) as [string | null, string, string | null];
    return result[2] ?? null;
  } catch (e) {
    console.error("[untap-sync] create-deck failed", e);
    return null;
  }
}

/**
 * Cube push path. Cubes organize cards into user-defined zones
 * (`basics`, `group-1`…`group-10`) that paste-deck would flatten. We
 * already have each card's zone tagged locally, and Scryfall-enriched
 * cards carry their `set` and `name` fields, so we reconstruct untap's
 * `cards` payload directly from our stored snapshots — no resolution
 * round trip. untap's `card_uid` field isn't something we can synthesize
 * from Scryfall, but it's not actually required for an update: the
 * server re-resolves cards by (set, title, zone) if card_uid is missing.
 */
async function updateUntapDeckDirect(untapDeck: UntapDeck, deck: Deck): Promise<boolean> {
  // Flatten mainboard + sideboard (cubes won't have sideboard entries
  // but we include it for safety) into untap's card shape, preserving
  // each card's original zone.
  const entries = [...Object.values(deck.cards), ...Object.values(deck.sideboard)];
  let i = 0;
  const cards = entries.map((c) => ({
    // Prefer the untap card_uid we may have preserved (pull sets the
    // DeckCard id to untap's uid until enrichment replaces it), else
    // fall back to the Scryfall id.
    card_uid: c.snapshot.id,
    set: c.snapshot.set ?? "",
    zone: c.zone || "group-1",
    qty: c.count,
    order: i++,
    title: c.snapshot.name,
  }));
  try {
    const result = (await untapSend("update-deck", {
      ...untapDeck,
      title: deck.name,
      is_cube: true,
      cards,
    })) as [string | null, string | null];
    if (result[0]) {
      console.error("[untap-sync] update-cube failed:", result[0]);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[untap-sync] update-cube error", e);
    return false;
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

