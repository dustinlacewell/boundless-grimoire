import { useEffect, useRef, useState } from "react";
import { DeckAnalytics } from "../analytics/DeckAnalytics";
import { DeckFormatPicker } from "../decks/DeckFormatPicker";
import { DeckRibbon } from "../decks/DeckRibbon";
import { DeckView } from "../decks/DeckView";
import { EditableDeckTitle } from "../decks/EditableDeckTitle";
import { LegalityBadge } from "../decks/LegalityBadge";
import { LegalityToast } from "../decks/LegalityToast";
import { MetaGroupingToast } from "../decks/MetaGroupingToast";
import { FilterBar } from "../filters/FilterBar";
import { SearchResults } from "../search/SearchResults";
import { HelpModal } from "../help/HelpModal";
import { SettingsModal } from "../settings/SettingsModal";
import { redo, undo } from "../commands/historyStore";
import { useDeckStore, selectedDeck } from "../storage/deckStore";
import { colors } from "@boundless-grimoire/ui";
import { IconButton } from "@boundless-grimoire/ui";
import { GearIcon, HelpIcon } from "@boundless-grimoire/ui";
import { TRIGGER_H, TRIGGER_W } from "./TriggerButton";

type Props = Record<string, never>;

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483647,
  background: "rgba(10, 10, 12, 0.96)",
  color: colors.text,
  fontFamily: "system-ui, sans-serif",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  height: TRIGGER_H,
  paddingLeft: TRIGGER_W + 16,
  paddingRight: 16,
  borderBottom: `1px solid ${colors.border}`,
  background: colors.bg1,
  boxSizing: "border-box",
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  flex: 1,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  overflowX: "hidden",
  padding: 16,
  gap: 16,
  // Disable browser scroll anchoring on the overlay body. When infinite
  // scroll appends more results the browser was picking the sentinel or a
  // near-bottom card as the anchor and adjusting scrollTop to keep it in
  // view — which effectively kicked the user to the newly-added content
  // instead of letting the new cards quietly fill in below.
  overflowAnchor: "none",
};

// Level-1 section heading used by the top-level panes (Decks, Analytics,
// Browse · Filters, Results). Larger, bolder, in full-strength text with
// a subtle bottom rule so these read clearly as the spine of the layout.
const sectionLabelStyle: React.CSSProperties = {
  fontSize: 13,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: colors.text,
  fontWeight: 800,
  paddingBottom: 4,
  marginBottom: 8,
  borderBottom: `2px solid ${colors.bg3}`,
};

/** True when focus is inside an input/textarea/contenteditable field. */
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function Overlay(_props: Props) {
  const selected = useDeckStore(selectedDeck);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLElement>(null);
  const analyticsRef = useRef<HTMLElement>(null);
  const filtersRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Toggle-navigation: first press of a jump key saves where you were
    // and scrolls to the target. Pressing the same key again restores
    // the saved scroll position. Pressing a different jump key overwrites
    // the saved position with "where you are now" before jumping.
    let lastKey: string | null = null;
    let savedScrollTop = 0;

    const targets: Record<string, React.RefObject<HTMLElement | null> | "top"> = {
      d: deckRef,
      a: analyticsRef,
      f: filtersRef,
      r: resultsRef,
      t: "top",
    };

    const onKey = (e: KeyboardEvent) => {
      // Undo / redo for the selected deck. Don't hijack while typing —
      // native text undo in inputs / textareas must still work.
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (isTypingTarget(e.target)) return;
        const key = e.key.toLowerCase();
        const isUndo = key === "z" && !e.shiftKey;
        const isRedo = key === "y" || (key === "z" && e.shiftKey);
        if (isUndo || isRedo) {
          const deckId = useDeckStore.getState().library.selectedId;
          if (!deckId) return;
          e.preventDefault();
          if (isUndo) undo(deckId);
          else redo(deckId);
          return;
        }
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (!(key in targets)) return;
      const body = bodyRef.current;
      if (!body) return;
      e.preventDefault();

      if (lastKey === key) {
        // Same key again — snap back to where the user was.
        body.scrollTo({ top: savedScrollTop, behavior: "smooth" });
        lastKey = null;
        return;
      }

      const target = targets[key];
      savedScrollTop = body.scrollTop;
      lastKey = key;
      if (target === "top") {
        body.scrollTo({ top: 0, behavior: "smooth" });
      } else if (target.current) {
        target.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Boundless Grimoire">
      <div style={headerStyle}>
        <div style={titleStyle}>Boundless Grimoire</div>
        <IconButton title="Help" onClick={() => setHelpOpen(true)} stopPropagation={false}>
          <HelpIcon size={14} />
        </IconButton>
        <IconButton title="Settings" onClick={() => setSettingsOpen(true)} stopPropagation={false}>
          <GearIcon size={14} />
        </IconButton>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      <LegalityToast />
      <MetaGroupingToast />
      <div ref={bodyRef} style={bodyStyle}>
        <section>
          <div style={sectionLabelStyle}>Decks</div>
          <DeckRibbon />
        </section>

        <section ref={deckRef} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <EditableDeckTitle deckId={selected.id} name={selected.name} />
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: colors.textMuted,
                    fontWeight: 700,
                  }}
                >
                  Format
                </span>
                <LegalityBadge deckId={selected.id} hasFormat={selected.formatIndex != null} />
                <DeckFormatPicker deckId={selected.id} formatIndex={selected.formatIndex} />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: colors.textMuted, fontStyle: "italic" }}>
              No deck selected
            </div>
          )}
          {selected ? (
            <DeckView deck={selected} />
          ) : (
            <div style={{ opacity: 0.4, fontSize: 13 }}>
              Select a deck above, or create one with the “+” tile — or just
              click a card below to start a new one.
            </div>
          )}
        </section>

        {selected && (
          <section ref={analyticsRef}>
            <div style={sectionLabelStyle}>Analytics</div>
            <DeckAnalytics deck={selected} />
          </section>
        )}

        <section ref={filtersRef} style={{ display: "flex", flexDirection: "column" }}>
          <div style={sectionLabelStyle}>Browse · Filters</div>
          <FilterBar />
        </section>

        <section ref={resultsRef} style={{ display: "flex", flexDirection: "column" }}>
          <div style={sectionLabelStyle}>Results</div>
          <SearchResults />
        </section>
      </div>
    </div>
  );
}
