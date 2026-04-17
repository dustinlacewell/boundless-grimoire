import { useEffect, useRef, useState } from "react";
import { DeckAnalytics } from "../analytics/DeckAnalytics";
import { CubeView } from "../decks/CubeView";
import { DeckRibbon } from "../decks/DeckRibbon";
import { DeckView } from "../decks/DeckView";
import { EditableDeckTitle } from "../decks/EditableDeckTitle";
import { EnrichmentToast } from "../decks/EnrichmentToast";
import { EntityHeaderControls } from "../decks/EntityHeaderControls";
import { LegalityToast } from "../decks/LegalityToast";
import { LibraryViewTabs } from "../decks/LibraryViewTabs";
import { MetaGroupingToast } from "../decks/MetaGroupingToast";
import { ToastStack } from "../notifications";
import { FilterBar } from "../filters/FilterBar";
import { FilterPresets } from "../filters/components/FilterPresets";
import { SortFilter } from "../filters/components/SortFilter";
import { SearchResults } from "../search/SearchResults";
import { HelpModal } from "../help/HelpModal";
import { SettingsModal } from "../settings/SettingsModal";
import { redo, undo } from "../commands/historyStore";
import { setLibraryView, useDeckStore, selectedDeck } from "../storage/deckStore";
import { colors } from "@boundless-grimoire/ui";
import { IconButton } from "@boundless-grimoire/ui";
import { GearIcon, HelpIcon } from "@boundless-grimoire/ui";
import { Section } from "./Section";
import { TRIGGER_H, TRIGGER_W } from "./TriggerButton";

interface Props {
  initialHelpOpen?: boolean;
}

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


/** True when focus is inside an input/textarea/contenteditable field. */
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function Overlay({ initialHelpOpen = false }: Props) {
  const selected = useDeckStore(selectedDeck);
  const library = useDeckStore((s) => s.library);
  let deckCount = 0;
  let cubeCount = 0;
  for (const d of Object.values(library.decks)) (d.isCube ? cubeCount++ : deckCount++);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(initialHelpOpen);
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
          // Route by the active tab — cubes live under selectedCubeId,
          // decks under selectedId. Using selectedId alone blanks undo
          // whenever the Cubes tab is active.
          const lib = useDeckStore.getState().library;
          const deckId = lib.libraryView === "cubes" ? lib.selectedCubeId : lib.selectedId;
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
      {/*
        Two controllers (push/dismiss into the toast store) plus the
        single ToastStack that actually renders. Anywhere else in the
        app can call pushToast directly without needing its own renderer.
      */}
      <LegalityToast />
      <MetaGroupingToast />
      <EnrichmentToast />
      <ToastStack />
      <div ref={bodyRef} style={bodyStyle}>
        <Section
          label="Library"
          controls={
            <LibraryViewTabs
              view={library.libraryView}
              deckCount={deckCount}
              cubeCount={cubeCount}
              onChange={setLibraryView}
            />
          }
        >
          <DeckRibbon />
        </Section>

        <Section
          ref={deckRef}
          label={
            selected ? (
              <EditableDeckTitle deckId={selected.id} name={selected.name} />
            ) : (
              <div style={{ fontSize: 12, color: colors.textMuted, fontStyle: "italic" }}>
                {library.libraryView === "cubes" ? "No cube selected" : "No deck selected"}
              </div>
            )
          }
          controls={selected ? <EntityHeaderControls deck={selected} /> : undefined}
        >
          {selected ? (
            selected.isCube ? <CubeView cube={selected} /> : <DeckView deck={selected} />
          ) : (
            <div style={{ opacity: 0.4, fontSize: 13 }}>
              {library.libraryView === "cubes"
                ? "Select a cube above, or create one with the “+” tile."
                : "Select a deck above, or create one with the “+” tile — or just click a card below to start a new one."}
            </div>
          )}
        </Section>

        {selected && (
          <Section ref={analyticsRef} label="Analytics">
            <DeckAnalytics deck={selected} />
          </Section>
        )}

        <Section
          ref={filtersRef}
          label="Search"
          controls={<FilterPresets />}
        >
          <FilterBar />
        </Section>

        <Section ref={resultsRef} label="Results" controls={<SortFilter />}>
          <SearchResults />
        </Section>
      </div>
    </div>
  );
}

