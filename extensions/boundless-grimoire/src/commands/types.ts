import type { DeckLibrary } from "../storage/types";

/**
 * A reversible mutation on the deck library, scoped to one deck.
 *
 * `apply(lib)` returns the post-mutation library. `invert()` returns
 * the command that, when applied, restores the pre-apply state. Inverses
 * are themselves Commands — `invert` on the inverse produces the
 * original, which is how redo works.
 */
export interface Command {
  /** Which deck's undo stack this command belongs to. */
  deckId: string;
  /** Human-readable label for toasts / UI tooltips. */
  label: string;
  apply: (lib: DeckLibrary) => DeckLibrary;
  invert: () => Command;
}
