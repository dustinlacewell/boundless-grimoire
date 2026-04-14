import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { imageUrl } from "../cards/imageUrl";
import { firstCardSnapshot, useDeckStore } from "../storage/deckStore";
import type { Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { Spinner } from "../ui/Spinner";
import { useMetaGroupsStore } from "./metaGroupsStore";

const DONE_LINGER_MS = 1500;
const TOAST_H = 52;
const TOAST_GAP = 10;
const BOTTOM_OFFSET = 24;

type Phase = "working" | "done";

const toastBase: React.CSSProperties = {
  position: "fixed",
  right: 24,
  zIndex: 2147483647,
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "14px 20px",
  minWidth: 260,
  height: TOAST_H,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 10,
  boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
  fontSize: 14,
  color: colors.text,
  fontFamily: "system-ui, sans-serif",
  pointerEvents: "none",
  overflow: "hidden",
  isolation: "isolate",
  background: colors.bg2,
  boxSizing: "border-box",
  transition: "bottom 180ms ease-out",
};

interface ToastItemProps {
  deck: Deck | null;
  deckId: string;
  phase: Phase;
  bottom: number;
}

function ToastItem({ deck, deckId, phase, bottom }: ToastItemProps) {
  const hero = deck
    ? deck.coverCardId
      ? deck.cards[deck.coverCardId]?.snapshot ??
        deck.sideboard[deck.coverCardId]?.snapshot ??
        firstCardSnapshot(deck)
      : firstCardSnapshot(deck)
    : null;
  const bg = hero ? imageUrl(hero, "art_crop") ?? imageUrl(hero, "normal") : null;

  const deckLabel = deck?.name ?? deckId;
  const message = phase === "working" ? `Grouping “${deckLabel}”…` : `Grouped “${deckLabel}”.`;

  return (
    <div style={{ ...toastBase, bottom }}>
      {bg && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: -1,
            backgroundImage: `url(${bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.55,
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          background:
            "linear-gradient(90deg, rgba(21,21,26,0.9) 0%, rgba(21,21,26,0.55) 100%)",
        }}
      />
      <span
        style={{
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {phase === "working" ? (
          <Spinner size={20} />
        ) : (
          <span style={{ fontSize: 16, lineHeight: 1, color: colors.success }}>✓</span>
        )}
      </span>
      <span style={{ fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>
        {message}
      </span>
    </div>
  );
}

/**
 * Stack of toasts — one per deck that's currently being classified
 * into meta-groups, plus the last few that just finished (they linger
 * briefly with a ✓ before disappearing). Newer toasts appear at the
 * bottom-right; older ones slide up.
 */
export function MetaGroupingToast() {
  const loadingByDeck = useMetaGroupsStore((s) => s.loadingByDeck);
  const decks = useDeckStore((s) => s.library.decks);

  // Per-deck phase. Working decks are added immediately; when a deck
  // flips from loading → not loading, we mark it "done" and schedule
  // removal. Using a ref to persist across renders without flicker.
  const [phaseByDeck, setPhaseByDeck] = useState<Record<string, Phase>>({});
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const working = new Set(
      Object.entries(loadingByDeck)
        .filter(([, v]) => v)
        .map(([id]) => id),
    );

    setPhaseByDeck((prev) => {
      const next: Record<string, Phase> = { ...prev };
      // Add/refresh working entries.
      for (const id of working) {
        next[id] = "working";
        // If there's a pending "done" removal timer, cancel it — the
        // deck is back to working.
        const t = timersRef.current.get(id);
        if (t) {
          clearTimeout(t);
          timersRef.current.delete(id);
        }
      }
      // Anything previously working that's no longer working → done.
      for (const id of Object.keys(prev)) {
        if (prev[id] === "working" && !working.has(id)) {
          next[id] = "done";
          const existing = timersRef.current.get(id);
          if (existing) clearTimeout(existing);
          timersRef.current.set(
            id,
            setTimeout(() => {
              setPhaseByDeck((p) => {
                if (p[id] !== "done") return p;
                const { [id]: _gone, ...rest } = p;
                return rest;
              });
              timersRef.current.delete(id);
            }, DONE_LINGER_MS),
          );
        }
      }
      return next;
    });
  }, [loadingByDeck]);

  useEffect(() => {
    // Capture the ref so React hooks lint is happy about cleanup.
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const ids = Object.keys(phaseByDeck);
  if (ids.length === 0) return null;

  const host = document.getElementById("boundless-grimoire-root");
  if (!host) return null;

  // Newest on top visually → reverse order when stacking from bottom.
  return createPortal(
    <>
      {ids.map((id, i) => (
        <ToastItem
          key={id}
          deckId={id}
          deck={decks[id] ?? null}
          phase={phaseByDeck[id]}
          bottom={BOTTOM_OFFSET + i * (TOAST_H + TOAST_GAP)}
        />
      ))}
    </>,
    host,
  );
}
