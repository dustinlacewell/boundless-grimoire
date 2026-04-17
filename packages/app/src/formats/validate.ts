/**
 * Validate a deck against a FormatDefinition.
 *
 * Returns a list of issues (empty = valid). Each issue has a `kind` for
 * programmatic handling and a human-readable `message` for display.
 *
 * This is a structural check only — it validates deck size, copy counts,
 * commander presence, and set restrictions from the format definition.
 * Card-level legality (banned list, format legality) is still handled
 * by the Scryfall-based legalityStore.
 */
import type { FormatDefinition } from "./types";
import type { Deck, DeckCard } from "../storage/types";

export type IssueKind =
  | "deck-too-small"
  | "deck-too-large"
  | "sideboard-too-large"
  | "no-sideboard-allowed"
  | "copy-limit"
  | "commander-required"
  | "set-restriction";

export interface ValidationIssue {
  kind: IssueKind;
  message: string;
  /** Card IDs involved, if applicable. */
  cardIds?: string[];
}

function isBasicLand(card: DeckCard): boolean {
  const t = (card.snapshot.type_line ?? "").toLowerCase();
  return t.includes("basic") && t.includes("land");
}

function mainboardCount(deck: Deck): number {
  let total = 0;
  for (const c of Object.values(deck.cards)) total += c.count;
  return total;
}

function sideboardCount(deck: Deck): number {
  let total = 0;
  for (const c of Object.values(deck.sideboard)) total += c.count;
  return total;
}

export function validateDeck(deck: Deck, format: FormatDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Deck size
  const mainCount = mainboardCount(deck) + (deck.commander ? 1 : 0);
  if (mainCount < format.minDeckSize) {
    issues.push({
      kind: "deck-too-small",
      message: `Deck has ${mainCount} cards (minimum ${format.minDeckSize})`,
    });
  }
  if (format.maxDeckSize != null && mainCount > format.maxDeckSize) {
    issues.push({
      kind: "deck-too-large",
      message: `Deck has ${mainCount} cards (maximum ${format.maxDeckSize})`,
    });
  }

  // Sideboard
  const sideCount = sideboardCount(deck);
  if (format.sideboardSize === 0 && sideCount > 0) {
    issues.push({
      kind: "no-sideboard-allowed",
      message: `Sideboard has ${sideCount} cards but this format doesn't allow a sideboard`,
    });
  } else if (sideCount > format.sideboardSize) {
    issues.push({
      kind: "sideboard-too-large",
      message: `Sideboard has ${sideCount} cards (maximum ${format.sideboardSize})`,
    });
  }

  // Copy limits (skip basic lands)
  const copyViolations: string[] = [];
  for (const [id, card] of Object.entries(deck.cards)) {
    if (isBasicLand(card)) continue;
    if (card.count > format.maxCopies) {
      copyViolations.push(id);
    }
  }
  for (const [id, card] of Object.entries(deck.sideboard)) {
    if (isBasicLand(card)) continue;
    const mainCopies = deck.cards[id]?.count ?? 0;
    if (mainCopies + card.count > format.maxCopies) {
      copyViolations.push(id);
    }
  }
  if (copyViolations.length > 0) {
    const names = copyViolations
      .slice(0, 5)
      .map((id) => (deck.cards[id] ?? deck.sideboard[id])?.snapshot.name ?? id);
    const suffix = copyViolations.length > 5 ? ` and ${copyViolations.length - 5} more` : "";
    issues.push({
      kind: "copy-limit",
      message: `${copyViolations.length} card(s) exceed the ${format.maxCopies}-copy limit: ${names.join(", ")}${suffix}`,
      cardIds: copyViolations,
    });
  }

  // Commander
  if (format.commanderRequired && !deck.commander) {
    issues.push({
      kind: "commander-required",
      message: "This format requires a commander",
    });
  }

  // Set restriction
  if (format.sets.length > 0) {
    const allowed = new Set(format.sets.map((s) => s.toLowerCase()));
    const violations: string[] = [];
    for (const [id, card] of Object.entries(deck.cards)) {
      if (!card.snapshot.set) continue;
      if (!allowed.has(card.snapshot.set.toLowerCase())) violations.push(id);
    }
    for (const [id, card] of Object.entries(deck.sideboard)) {
      if (!card.snapshot.set) continue;
      if (!allowed.has(card.snapshot.set.toLowerCase())) violations.push(id);
    }
    if (violations.length > 0) {
      const names = violations
        .slice(0, 5)
        .map((id) => (deck.cards[id] ?? deck.sideboard[id])?.snapshot.name ?? id);
      const suffix = violations.length > 5 ? ` and ${violations.length - 5} more` : "";
      issues.push({
        kind: "set-restriction",
        message: `${violations.length} card(s) from sets not in this format: ${names.join(", ")}${suffix}`,
        cardIds: violations,
      });
    }
  }

  return issues;
}
