/**
 * Bridges the meta-groups loading state into the global toast system.
 * One toast per actively-classifying deck; the toast flips from a
 * working spinner to a ✓ and auto-dismisses when classification ends.
 *
 * Renders nothing itself — toasts surface in <ToastStack/>.
 */
import { useEffect, useRef } from "react";
import { Spinner, colors } from "@boundless-grimoire/ui";
import { dismissByKey, pushToast, DeckToastFrame } from "../notifications";
import { useDeckStore } from "../storage/deckStore";
import { useMetaGroupsStore } from "./metaGroupsStore";

const DONE_LINGER_MS = 1500;

const keyFor = (deckId: string) => `meta-grouping:${deckId}`;

export function MetaGroupingToast() {
  const loadingByDeck = useMetaGroupsStore((s) => s.loadingByDeck);
  const decks = useDeckStore((s) => s.library.decks);

  // Track which decks were "loading" on the last tick so we can detect
  // the loading → idle transition that should swap working → done.
  const prevLoading = useRef<Set<string>>(new Set());

  useEffect(() => {
    const nowLoading = new Set(
      Object.entries(loadingByDeck)
        .filter(([, v]) => v)
        .map(([id]) => id),
    );

    // Newly working decks (or decks that re-entered loading): push a
    // sticky working toast keyed on the deck.
    for (const id of nowLoading) {
      const deckLabel = decks[id]?.name ?? id;
      pushToast({
        key: keyFor(id),
        render: () => (
          <DeckToastFrame deckId={id} icon={<Spinner size={20} />}>
            Grouping “{deckLabel}”…
          </DeckToastFrame>
        ),
      });
    }

    // Decks that just stopped loading: swap to a done toast that
    // auto-dismisses. Pushing with the same key replaces the working
    // toast in place, so the user sees a clean working → done flip.
    for (const id of prevLoading.current) {
      if (nowLoading.has(id)) continue;
      const deckLabel = decks[id]?.name ?? id;
      pushToast({
        key: keyFor(id),
        durationMs: DONE_LINGER_MS,
        render: () => (
          <DeckToastFrame
            deckId={id}
            icon={
              <span style={{ fontSize: 16, lineHeight: 1, color: colors.success }}>✓</span>
            }
          >
            Grouped “{deckLabel}”.
          </DeckToastFrame>
        ),
      });
    }

    prevLoading.current = nowLoading;
  }, [loadingByDeck, decks]);

  // On unmount, clear any stragglers.
  useEffect(() => {
    return () => {
      for (const id of prevLoading.current) dismissByKey(keyFor(id));
    };
  }, []);

  return null;
}
