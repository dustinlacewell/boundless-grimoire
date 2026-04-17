/**
 * Test-draw modal state. Expands a deck's card list (respecting counts),
 * shuffles, and draws a 7-card opening hand. The user can re-draw at will.
 */
import { create } from "zustand";
import type { CardSnapshot, Deck } from "../storage/types";

interface TestDrawState {
  /** The deck being drawn from, or null when the modal is closed. */
  deck: Deck | null;
  /** The current hand of drawn cards. */
  hand: CardSnapshot[];
}

export const useTestDrawStore = create<TestDrawState>(() => ({
  deck: null,
  hand: [],
}));

/** Fisher–Yates shuffle (in-place, returns the same array). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Expand a deck's card map into a flat list respecting counts. */
function expandDeck(deck: Deck): CardSnapshot[] {
  const pool: CardSnapshot[] = [];
  for (const entry of Object.values(deck.cards)) {
    for (let i = 0; i < entry.count; i++) pool.push(entry.snapshot);
  }
  return pool;
}

/** Draw a new 7-card hand from the deck. */
function drawHand(deck: Deck): CardSnapshot[] {
  const pool = shuffle(expandDeck(deck));
  return pool.slice(0, 7);
}

export function openTestDraw(deck: Deck): void {
  useTestDrawStore.setState({ deck, hand: drawHand(deck) });
}

export function redraw(): void {
  const { deck } = useTestDrawStore.getState();
  if (!deck) return;
  useTestDrawStore.setState({ hand: drawHand(deck) });
}

export function closeTestDraw(): void {
  useTestDrawStore.setState({ deck: null, hand: [] });
}
