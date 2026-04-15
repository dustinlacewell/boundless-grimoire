/**
 * Bridges the `deck.enriching` flag into the toast system.
 *
 *   true  → sticky spinner toast
 *   false → replaced in place by a ✓ "Imported" linger toast
 *
 * The linger is important for the visuals: during import the card
 * snapshots are thin (name + set only), so the deck's hero image has
 * no `image_uris` yet and the toast background renders flat. Only on
 * the false→true transition are cards fully enriched — keeping the
 * toast on screen briefly at that point is the user's payoff: they
 * see the finished deck's art filling the toast background.
 *
 * Renders nothing — toasts surface in `<ToastStack/>`.
 */
import { useEffect, useRef } from "react";
import { Spinner, colors } from "@boundless-grimoire/ui";
import { dismissByKey, pushToast, DeckToastFrame } from "../notifications";
import { useDeckStore } from "../storage/deckStore";

const DONE_LINGER_MS = 2500;

const keyFor = (deckId: string) => `enrich-${deckId}`;

export function EnrichmentToast() {
  const decks = useDeckStore((s) => s.library.decks);
  // Which deck ids were enriching on the last tick, so we fire exactly
  // once on the false→true transition (spinner) and once on true→false
  // (done linger).
  const prevEnriching = useRef(new Set<string>());

  useEffect(() => {
    const nowEnriching = new Set<string>();
    for (const deck of Object.values(decks)) {
      if (deck.enriching) nowEnriching.add(deck.id);
    }

    // Newly enriching: push a sticky working toast.
    for (const id of nowEnriching) {
      if (prevEnriching.current.has(id)) continue;
      const deck = decks[id]!;
      const kind = deck.isCube ? "cube" : "deck";
      pushToast({
        key: keyFor(id),
        // No durationMs = sticky until the done-linger replaces it.
        render: () => (
          <DeckToastFrame deckId={id} icon={<Spinner size={18} />}>
            Importing {kind} “{deck.name}”…
          </DeckToastFrame>
        ),
      });
    }

    // Just finished enriching (or the entity was deleted): replace with
    // a ✓ linger toast that auto-dismisses. For deletions we just
    // dismiss directly — no toast to linger over.
    for (const id of prevEnriching.current) {
      if (nowEnriching.has(id)) continue;
      if (!decks[id]) {
        dismissByKey(keyFor(id));
        continue;
      }
      const deck = decks[id]!;
      const kind = deck.isCube ? "cube" : "deck";
      pushToast({
        key: keyFor(id),
        durationMs: DONE_LINGER_MS,
        render: () => (
          <DeckToastFrame
            deckId={id}
            icon={<span style={{ fontSize: 16, lineHeight: 1, color: colors.success }}>✓</span>}
          >
            Imported {kind} “{deck.name}”.
          </DeckToastFrame>
        ),
      });
    }

    prevEnriching.current = nowEnriching;
  }, [decks]);

  // Tear down any lingering toasts on unmount (e.g. overlay close).
  useEffect(() => {
    return () => {
      for (const id of prevEnriching.current) dismissByKey(keyFor(id));
      prevEnriching.current = new Set();
    };
  }, []);

  return null;
}
