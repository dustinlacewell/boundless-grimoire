/**
 * Per-deck undo/redo history.
 *
 * Each deck gets its own pair of stacks. `dispatch(cmd)` applies the
 * command to the deck library (through deckStore), then pushes the
 * command's inverse onto the deck's undo stack and clears its redo
 * stack.
 *
 * `undo(deckId)` pops from the undo stack, applies it, and pushes the
 * now-reconstructed forward command onto the redo stack. `redo(deckId)`
 * is the mirror.
 *
 * Stacks are in-memory only. Deck deletion wipes the deleted deck's
 * stack so stale inverses can never reference a gone-forever id.
 *
 * Every mutation still flows through `useDeckStore.setState`, which
 * means the existing persistence + untap-sync subscribers fire for
 * undo/redo exactly as they do for the original action.
 */
import { create } from "zustand";
import { useSettingsStore } from "../settings/settingsStore";
import { useDeckStore } from "../storage/deckStore";
import type { Command } from "./types";

interface DeckHistory {
  undo: Command[];
  redo: Command[];
}

interface State {
  stacks: Record<string, DeckHistory>;
}

export const useHistoryStore = create<State>(() => ({ stacks: {} }));

function getOrInit(deckId: string): DeckHistory {
  const existing = useHistoryStore.getState().stacks[deckId];
  if (existing) return existing;
  const fresh: DeckHistory = { undo: [], redo: [] };
  useHistoryStore.setState((s) => ({
    stacks: { ...s.stacks, [deckId]: fresh },
  }));
  return fresh;
}

function setStack(deckId: string, next: DeckHistory): void {
  useHistoryStore.setState((s) => ({
    stacks: { ...s.stacks, [deckId]: next },
  }));
}

/** Cap the undo stack per the `undoHistoryLimit` setting (null = unbounded). */
function trim(stack: Command[]): Command[] {
  const limit = useSettingsStore.getState().settings.undoHistoryLimit;
  if (limit == null || stack.length <= limit) return stack;
  return stack.slice(stack.length - limit);
}

function applyToLibrary(cmd: Command): void {
  useDeckStore.setState((s) => ({ library: cmd.apply(s.library) }));
}

/**
 * Apply a command, record its inverse for undo, and discard any
 * previously-accumulated redo history.
 */
export function dispatch(cmd: Command): void {
  const history = getOrInit(cmd.deckId);
  applyToLibrary(cmd);
  setStack(cmd.deckId, {
    undo: trim([...history.undo, cmd.invert()]),
    redo: [],
  });
}

/** Undo the most recent command on `deckId`'s stack. No-op if empty. */
export function undo(deckId: string): void {
  const history = useHistoryStore.getState().stacks[deckId];
  if (!history || history.undo.length === 0) return;
  const inv = history.undo[history.undo.length - 1];
  applyToLibrary(inv);
  setStack(deckId, {
    undo: history.undo.slice(0, -1),
    redo: trim([...history.redo, inv.invert()]),
  });
}

/** Redo the most recently undone command on `deckId`'s stack. */
export function redo(deckId: string): void {
  const history = useHistoryStore.getState().stacks[deckId];
  if (!history || history.redo.length === 0) return;
  const fwd = history.redo[history.redo.length - 1];
  applyToLibrary(fwd);
  setStack(deckId, {
    undo: trim([...history.undo, fwd.invert()]),
    redo: history.redo.slice(0, -1),
  });
}

export function clearHistory(deckId: string): void {
  useHistoryStore.setState((s) => {
    if (!(deckId in s.stacks)) return s;
    const { [deckId]: _gone, ...rest } = s.stacks;
    return { stacks: rest };
  });
}

// Wipe a deck's stack as soon as it leaves the library. Prevents stale
// inverses that reference an id which no longer exists (deck deletion is
// not itself undoable, so this is a clean terminal state).
useDeckStore.subscribe((state, prev) => {
  for (const id of Object.keys(prev.library.decks)) {
    if (!(id in state.library.decks)) clearHistory(id);
  }
});
