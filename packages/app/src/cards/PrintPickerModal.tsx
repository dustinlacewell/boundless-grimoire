import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getPrintsByOracleId } from "../services/scryfall";
import { toSnapshot } from "../scryfall/snapshot";
import type { ScryfallCard } from "../scryfall/types";
import { swapCardPrint } from "../storage/deckStore";
import { colors } from "@boundless-grimoire/ui";
import { closePrintPicker, usePrintPickerStore } from "./printPickerStore";
import { adjustPrintWidth, usePrintSizeStore } from "./printSizeStore";
import { PrintTile } from "./PrintTile";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483647,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
};

const dialogStyle: React.CSSProperties = {
  width: "min(1100px, 92vw)",
  maxHeight: "88vh",
  background: colors.bg1,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 12,
  boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  color: colors.text,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  borderBottom: `1px solid ${colors.border}`,
};

const titleStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 15,
  flex: 1,
};

const closeBtnStyle: React.CSSProperties = {
  background: colors.bg2,
  color: colors.text,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 16,
};


const placeholderStyle: React.CSSProperties = {
  padding: "32px 4px",
  fontSize: 13,
  color: colors.textMuted,
  textAlign: "center",
};

/**
 * Modal that lists every printing of the currently-targeted card and
 * lets the user pick one to use in the active deck. Lazy-fetches the
 * prints list when opened; closes on background click, Esc, or after a
 * tile is clicked.
 */
export function PrintPickerModal() {
  const target = usePrintPickerStore((s) => s.target);
  const tileWidth = usePrintSizeStore((s) => s.tileWidth);
  const [prints, setPrints] = useState<ScryfallCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target) {
      setPrints(null);
      setError(null);
      return;
    }
    const oracleId = target.snapshot.oracle_id;
    if (!oracleId) {
      setError("Card has no oracle id; can't look up other printings.");
      return;
    }
    const ac = new AbortController();
    setPrints(null);
    setError(null);
    getPrintsByOracleId(oracleId, { signal: ac.signal })
      .then(setPrints)
      .catch((e: unknown) => {
        if ((e as Error)?.name === "AbortError") return;
        setError(String(e));
      });
    return () => ac.abort();
  }, [target]);

  // Close on Esc
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closePrintPicker();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [target]);

  // Ctrl-scroll to resize tiles
  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      adjustPrintWidth(e.deltaY);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  });

  if (!target) return null;

  const handleSelect = (card: ScryfallCard) => {
    swapCardPrint(target.deckId, target.snapshot.id, toSnapshot(card));
    closePrintPicker();
  };

  return createPortal(
    <div style={overlayStyle} onClick={closePrintPicker}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            Choose printing · {target.snapshot.name}
          </div>
          <button type="button" style={closeBtnStyle} onClick={closePrintPicker}>
            Close (Esc)
          </button>
        </div>
        <div ref={bodyRef} style={bodyStyle}>
          {error && <div style={{ ...placeholderStyle, color: "#f88" }}>{error}</div>}
          {!error && !prints && <div style={placeholderStyle}>Loading printings…</div>}
          {prints && prints.length === 0 && (
            <div style={placeholderStyle}>Only one printing exists for this card.</div>
          )}
          {prints && prints.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${tileWidth}px, 1fr))`,
                gap: 16,
                alignItems: "start",
                justifyItems: "center",
              }}
            >
              {prints.map((card) => (
                <PrintTile
                  key={card.id}
                  card={card}
                  width={tileWidth}
                  selected={card.id === target.snapshot.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.getElementById("boundless-grimoire-root") ?? document.body,
  );
}
