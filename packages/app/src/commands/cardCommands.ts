/**
 * Undoable card-level commands.
 *
 * Four commands, each paired with its structural inverse:
 *
 *   AddCards              ↔  RemoveCards
 *   MoveCardsToSideboard  ↔  MoveCardsFromSideboard
 *
 * Each command carries the full `CardDelta[]` payload it acts on, which
 * means the inverse is constructed purely from the command's own state —
 * no diffing of library snapshots required. The tradeoff is that the
 * caller must build an accurate delta list (for remove/move: resolve
 * cardId → snapshot before dispatching, since the post-apply library
 * won't have the snapshot anymore).
 */
import type { CardSnapshot } from "../storage/types";
import {
  addCards as libAddCards,
  moveCards as libMoveCards,
  removeCards as libRemoveCards,
  type CardDelta,
  type DeckZone,
} from "./libTransforms";
import type { Command } from "./types";

// ---------- AddCards / RemoveCards ----------

export function addCardsCommand(deckId: string, deltas: CardDelta[]): Command {
  return {
    deckId,
    label: describe("Add", deltas),
    apply: (lib) => libAddCards(lib, deckId, deltas),
    invert: () => removeCardsCommand(deckId, deltas),
  };
}

export function removeCardsCommand(deckId: string, deltas: CardDelta[]): Command {
  return {
    deckId,
    label: describe("Remove", deltas),
    apply: (lib) => libRemoveCards(lib, deckId, deltas),
    invert: () => addCardsCommand(deckId, deltas),
  };
}

// ---------- MoveCardsToSideboard / MoveCardsFromSideboard ----------

export function moveCardsToSideboardCommand(deckId: string, deltas: CardDelta[]): Command {
  const sideboarded = deltas.map(zoneAs("sideboard"));
  return {
    deckId,
    label: describe("Move to sideboard", deltas),
    apply: (lib) => libMoveCards(lib, deckId, deltas, "main"),
    invert: () => moveCardsFromSideboardCommand(deckId, sideboarded),
  };
}

export function moveCardsFromSideboardCommand(deckId: string, deltas: CardDelta[]): Command {
  const mained = deltas.map(zoneAs("main"));
  return {
    deckId,
    label: describe("Move from sideboard", deltas),
    apply: (lib) => libMoveCards(lib, deckId, deltas, "sideboard"),
    invert: () => moveCardsToSideboardCommand(deckId, mained),
  };
}

// ---------- Helpers ----------

const zoneAs = (zone: DeckZone) => (d: CardDelta): CardDelta => ({ ...d, zone });

function describe(verb: string, deltas: readonly CardDelta[]): string {
  if (deltas.length === 1) {
    const d = deltas[0];
    return `${verb} ${nameOf(d.snapshot)}${d.count > 1 ? ` ×${d.count}` : ""}`;
  }
  const total = deltas.reduce((n, d) => n + d.count, 0);
  return `${verb} ${total} card${total === 1 ? "" : "s"}`;
}

function nameOf(s: CardSnapshot): string {
  return s.name || "card";
}
