import { useState } from "react";
import { DeckAnalytics } from "../analytics/DeckAnalytics";
import { DeckFormatPicker } from "../decks/DeckFormatPicker";
import { DeckRibbon } from "../decks/DeckRibbon";
import { DeckView } from "../decks/DeckView";
import { EditableDeckTitle } from "../decks/EditableDeckTitle";
import { LegalityToast } from "../decks/LegalityToast";
import { FilterBar } from "../filters/FilterBar";
import { SearchResults } from "../search/SearchResults";
import { SettingsModal } from "../settings/SettingsModal";
import { useDeckStore, selectedDeck } from "../storage/deckStore";
import { colors } from "../ui/colors";
import { IconButton } from "../ui/IconButton";
import { GearIcon } from "../ui/icons/Icons";
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

export function Overlay(_props: Props) {
  const selected = useDeckStore(selectedDeck);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Boundless Grimoire">
      <div style={headerStyle}>
        <div style={titleStyle}>Boundless Grimoire</div>
        <IconButton title="Settings" onClick={() => setSettingsOpen(true)} stopPropagation={false}>
          <GearIcon size={14} />
        </IconButton>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <LegalityToast />
      <div style={bodyStyle}>
        <section>
          <div style={sectionLabelStyle}>Decks</div>
          <DeckRibbon />
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <EditableDeckTitle deckId={selected.id} name={selected.name} />
              <DeckFormatPicker deckId={selected.id} formatIndex={selected.formatIndex} />
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
          <section>
            <div style={sectionLabelStyle}>Analytics</div>
            <DeckAnalytics deck={selected} />
          </section>
        )}

        <section style={{ display: "flex", flexDirection: "column" }}>
          <div style={sectionLabelStyle}>Browse · Filters</div>
          <FilterBar />
        </section>

        <section style={{ display: "flex", flexDirection: "column" }}>
          <div style={sectionLabelStyle}>Results</div>
          <SearchResults />
        </section>
      </div>
    </div>
  );
}
