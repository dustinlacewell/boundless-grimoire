/**
 * Bridges the legality-store state machine into the global toast system.
 * One toast per deck being checked:
 *
 *   checking        → sticky spinner deck-themed toast
 *   done (legal)    → ✓ linger toast (auto-dismiss)
 *   done (illegal)  → ✗ linger toast (auto-dismiss)
 *
 * Renders nothing itself — the actual toast UI lives in <ToastStack/>.
 */
import { useEffect, useRef } from "react";
import { Spinner, colors } from "@boundless-grimoire/ui";
import { dismissByKey, pushToast, DeckToastFrame } from "../notifications";
import { useDeckStore } from "../storage/deckStore";
import { useLegalityStore } from "./legalityStore";

const VERDICT_LINGER_MS = 3500;

const keyFor = (deckId: string) => `legality:${deckId}`;

export function LegalityToast() {
  const checking = useLegalityStore((s) => s.checking);
  const illegalByDeck = useLegalityStore((s) => s.illegalByDeck);
  const decks = useDeckStore((s) => s.library.decks);

  // Track which decks were "checking" last tick so we fire once per
  // checking→idle transition (verdict), not every render.
  const prevChecking = useRef<Set<string>>(new Set());

  useEffect(() => {
    const nowChecking = new Set<string>();
    for (const [id, v] of Object.entries(checking)) if (v) nowChecking.add(id);

    // Newly checking: sticky spinner toast.
    for (const id of nowChecking) {
      if (prevChecking.current.has(id)) continue;
      const deckLabel = decks[id]?.name ?? id;
      pushToast({
        key: keyFor(id),
        render: () => (
          <DeckToastFrame deckId={id} icon={<Spinner size={20} />}>
            Checking legality of “{deckLabel}”…
          </DeckToastFrame>
        ),
      });
    }

    // Just finished checking: swap to verdict toast.
    for (const id of prevChecking.current) {
      if (nowChecking.has(id)) continue;
      if (!decks[id]) {
        dismissByKey(keyFor(id));
        continue;
      }
      const deckLabel = decks[id].name;
      const hasIllegal = (illegalByDeck[id]?.size ?? 0) > 0;
      pushToast({
        key: keyFor(id),
        durationMs: VERDICT_LINGER_MS,
        render: () =>
          hasIllegal ? (
            <DeckToastFrame
              deckId={id}
              icon={<span style={{ fontSize: 18, lineHeight: 1, color: colors.danger }}>✗</span>}
            >
              “{deckLabel}” contains illegal cards.
            </DeckToastFrame>
          ) : (
            <DeckToastFrame
              deckId={id}
              icon={<span style={{ fontSize: 18, lineHeight: 1, color: colors.success }}>✓</span>}
            >
              “{deckLabel}” is legal.
            </DeckToastFrame>
          ),
      });
    }

    prevChecking.current = nowChecking;
  }, [checking, illegalByDeck, decks]);

  // Tear down any lingering toasts on unmount.
  useEffect(() => {
    return () => {
      for (const id of prevChecking.current) dismissByKey(keyFor(id));
      prevChecking.current = new Set();
    };
  }, []);

  return null;
}
