/**
 * Bridges the legality-store state machine into the global toast system.
 * Renders nothing itself — the actual toast UI lives in <ToastStack/>.
 *
 * Single dedup key (`legality`) means the "checking" toast and the
 * subsequent "legal"/"illegal" verdict naturally replace each other in
 * the stack instead of doubling up.
 */
import { useEffect, useRef } from "react";
import { Spinner, colors } from "@boundless-grimoire/ui";
import { dismissByKey, pushToast, ToastFrame } from "../notifications";
import { useLegalityStore } from "./legalityStore";

const LEGALITY_KEY = "legality";
const VERDICT_LINGER_MS = 5000;

export function LegalityToast() {
  const isChecking = useLegalityStore((s) => Object.values(s.checking).some(Boolean));
  // Track the previous value of isChecking so we can detect the
  // checking → not-checking transition that should fire the verdict.
  const prevChecking = useRef(false);

  useEffect(() => {
    if (isChecking) {
      pushToast({
        key: LEGALITY_KEY,
        render: () => (
          <ToastFrame variant="info" icon={<Spinner size={20} />}>
            Checking deck legality…
          </ToastFrame>
        ),
      });
    } else if (prevChecking.current) {
      // Just finished a check — push the verdict.
      const { illegalByDeck } = useLegalityStore.getState();
      const hasIllegal = Object.values(illegalByDeck).some((s) => s.size > 0);
      pushToast({
        key: LEGALITY_KEY,
        durationMs: VERDICT_LINGER_MS,
        render: () =>
          hasIllegal ? (
            <ToastFrame
              variant="error"
              icon={<span style={{ fontSize: 18, lineHeight: 1, color: colors.danger }}>✗</span>}
            >
              Deck contains illegal cards.
            </ToastFrame>
          ) : (
            <ToastFrame
              variant="success"
              icon={<span style={{ fontSize: 18, lineHeight: 1, color: colors.success }}>✓</span>}
            >
              Deck is legal.
            </ToastFrame>
          ),
      });
    }
    prevChecking.current = isChecking;
  }, [isChecking]);

  // Tear down on unmount so a remount doesn't leave a stale toast hanging.
  useEffect(() => {
    return () => dismissByKey(LEGALITY_KEY);
  }, []);

  return null;
}
