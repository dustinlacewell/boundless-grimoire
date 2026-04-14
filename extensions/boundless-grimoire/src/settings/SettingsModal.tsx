import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatsToText,
  textToFormats,
  setCustomFormats,
  resetCustomFormats,
  useCustomFormatStore,
} from "../filters/customFormatStore";
import {
  queriesToText,
  textToQueries,
  setCustomQueries,
  resetCustomQueries,
  useCustomQueryStore,
} from "../filters/customQueryStore";
import { colors } from "../ui/colors";
import {
  setAnalyticsLayout,
  setDeckGroupBy,
  setDeckLayout,
  setDevMode,
  setPreviewMode,
  useSettingsStore,
  type AnalyticsLayout,
  type DeckGroupBy,
  type DeckLayout,
  type PreviewMode,
} from "./settingsStore";

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
  width: "min(700px, 92vw)",
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

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 0,
  borderBottom: `1px solid ${colors.border}`,
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: active ? colors.accent : colors.textMuted,
  background: "transparent",
  border: "none",
  borderBottomStyle: "solid",
  borderBottomWidth: 2,
  borderBottomColor: active ? colors.accent : "transparent",
});

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: colors.textMuted,
  lineHeight: 1.5,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 300,
  background: colors.bg2,
  color: colors.text,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 8,
  padding: 12,
  fontSize: 13,
  fontFamily: "monospace",
  lineHeight: 1.6,
  resize: "vertical",
  boxSizing: "border-box",
  outline: "none",
};

const saveBtnStyle: React.CSSProperties = {
  background: colors.accent,
  color: "#0a0a0c",
  border: "none",
  borderRadius: 6,
  padding: "8px 20px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

type Tab = "general" | "filters" | "formats";

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const queries = useCustomQueryStore((s) => s.queries);
  const formats = useCustomFormatStore((s) => s.formats);
  const devMode = useSettingsStore((s) => s.settings.devMode);
  const analyticsLayout = useSettingsStore((s) => s.settings.analyticsLayout);
  const deckLayout = useSettingsStore((s) => s.settings.deckLayout);
  const deckGroupBy = useSettingsStore((s) => s.settings.deckGroupBy);
  const previewMode = useSettingsStore((s) => s.settings.previewMode);
  const [filterText, setFilterText] = useState(() => queriesToText(queries));
  const [formatText, setFormatText] = useState(() => formatsToText(formats));
  const [tab, setTab] = useState<Tab>("general");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSaveFilters = () => {
    setCustomQueries(textToQueries(filterText));
    onClose();
  };

  const handleResetFilters = () => {
    const defaults = resetCustomQueries();
    setFilterText(queriesToText(defaults));
  };

  const handleSaveFormats = () => {
    setCustomFormats(textToFormats(formatText));
    onClose();
  };

  const handleResetFormats = () => {
    const defaults = resetCustomFormats();
    setFormatText(formatsToText(defaults));
  };

  const host = document.getElementById("boundless-grimoire-root");
  if (!host) return null;

  return createPortal(
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>Settings</div>
          <button type="button" style={closeBtnStyle} onClick={onClose}>
            Close
          </button>
        </div>

        <div style={tabBarStyle}>
          <button type="button" style={tabStyle(tab === "general")} onClick={() => setTab("general")}>
            General
          </button>
          <button type="button" style={tabStyle(tab === "filters")} onClick={() => setTab("filters")}>
            Filters
          </button>
          <button type="button" style={tabStyle(tab === "formats")} onClick={() => setTab("formats")}>
            Formats
          </button>
        </div>

        <div style={bodyStyle}>
          {tab === "general" && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={devMode}
                  onChange={(e) => setDevMode(e.target.checked)}
                  style={{ accentColor: colors.accent, width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Developer Mode</span>
              </label>
              <div style={hintStyle}>
                Shows the compiled Scryfall query below the filter bar.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Analytics Layout</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["scroll", "wrap"] as AnalyticsLayout[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnalyticsLayout(opt)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        cursor: "pointer",
                        background: analyticsLayout === opt ? colors.accent : colors.bg2,
                        color: analyticsLayout === opt ? "#0a0a0c" : colors.text,
                        border: `1px solid ${analyticsLayout === opt ? colors.accent : colors.borderStrong}`,
                        textTransform: "capitalize",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div style={hintStyle}>
                  <strong>Scroll:</strong> horizontal strip, wheel scrolls sideways.{" "}
                  <strong>Wrap:</strong> charts wrap onto multiple rows like a grid.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Deck Layout</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["scroll", "wrap"] as DeckLayout[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDeckLayout(opt)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        cursor: "pointer",
                        background: deckLayout === opt ? colors.accent : colors.bg2,
                        color: deckLayout === opt ? "#0a0a0c" : colors.text,
                        border: `1px solid ${deckLayout === opt ? colors.accent : colors.borderStrong}`,
                        textTransform: "capitalize",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div style={hintStyle}>
                  <strong>Scroll:</strong> category columns sit in one row, horizontal scroll.{" "}
                  <strong>Wrap:</strong> columns wrap to multiple rows when they don't all fit.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Deck Grouping</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["category", "cmc", "meta"] as DeckGroupBy[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDeckGroupBy(opt)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        cursor: "pointer",
                        background: deckGroupBy === opt ? colors.accent : colors.bg2,
                        color: deckGroupBy === opt ? "#0a0a0c" : colors.text,
                        border: `1px solid ${deckGroupBy === opt ? colors.accent : colors.borderStrong}`,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {opt === "cmc" ? "CMC" : opt === "meta" ? "Meta" : "Category"}
                    </button>
                  ))}
                </div>
                <div style={hintStyle}>
                  <strong>Category:</strong> columns are Creatures, Instants, Lands, etc.{" "}
                  <strong>CMC:</strong> columns are 0-mana, 1-mana, …, 7+ mana, plus Lands.{" "}
                  <strong>Meta:</strong> columns are roles (Removal, Ramp, Card Draw, …)
                  inferred from Scryfall oracle tags; unmatched cards fall back to
                  category columns.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Ctrl-Hover Preview</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["image", "text", "both"] as PreviewMode[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPreviewMode(opt)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        cursor: "pointer",
                        background: previewMode === opt ? colors.accent : colors.bg2,
                        color: previewMode === opt ? "#0a0a0c" : colors.text,
                        border: `1px solid ${previewMode === opt ? colors.accent : colors.borderStrong}`,
                        textTransform: "capitalize",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div style={hintStyle}>
                  What to show when hovering a card with Ctrl held —{" "}
                  <strong>Image:</strong> just the zoomed card.{" "}
                  <strong>Text:</strong> just the info panel.{" "}
                  <strong>Both:</strong> image + info side-by-side.
                </div>
              </div>
            </>
          )}
          {tab === "filters" && (
            <>
              <div style={hintStyle}>
                Define custom filter toggles. One per line, format:{" "}
                <strong>Name=scryfall query</strong>
                <br />
                A line without <code>=</code> becomes a section header.
                <br />
                Example: <code style={{ color: colors.text }}>Removal=otag:spot-removal or otag:sweeper</code>
              </div>
              <textarea
                style={textareaStyle}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                spellCheck={false}
              />
              <div style={footerStyle}>
                <button type="button" style={closeBtnStyle} onClick={handleResetFilters}>
                  Reset to Defaults
                </button>
                <button type="button" style={saveBtnStyle} onClick={handleSaveFilters}>
                  Save
                </button>
              </div>
            </>
          )}
          {tab === "formats" && (
            <>
              <div style={hintStyle}>
                Define formats that can be assigned to decks. One per line, format:{" "}
                <strong>Name=scryfall query</strong>
                <br />
                When a deck has a format, it applies to all searches and flags illegal cards.
                <br />
                Example: <code style={{ color: colors.text }}>Standard=f:standard</code>
                {" "}or{" "}
                <code style={{ color: colors.text }}>My Cube=s:mkm or s:dsk or s:blb</code>
              </div>
              <textarea
                style={{ ...textareaStyle, minHeight: 180 }}
                value={formatText}
                onChange={(e) => setFormatText(e.target.value)}
                spellCheck={false}
              />
              <div style={footerStyle}>
                <button type="button" style={closeBtnStyle} onClick={handleResetFormats}>
                  Reset to Defaults
                </button>
                <button type="button" style={saveBtnStyle} onClick={handleSaveFormats}>
                  Save
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    host,
  );
}
